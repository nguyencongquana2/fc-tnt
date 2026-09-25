/**
 * FC TNT - Matches & Financial Payments Router
 * Quản lý lịch sử trận đấu, CRUD và thanh toán quỹ sân
 */

const express = require('express');
const Match = require('../models/Match');
const { createAiRouter, analyzeMatchWithNLP, getPlayerAliases } = require('./ai');
const { createLiveMatchRouter } = require('./liveMatch');

function createMatchesRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, requireAdmin }) {
  const router = express.Router();

  // GET /api/matches
  router.get('/', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const matches = await Match.find().sort({ createdAt: -1 });
        return res.json(matches);
      }
      res.json(fallbackData.matches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const matchData = req.body;
      if (!matchData.id) matchData.id = 'm_' + Date.now();

      if (isMongoConnected()) {
        const created = await Match.create(matchData);
        broadcastDataUpdate('matches', `⚽ Trận đấu mới gặp "${matchData.opponent || 'Đối thủ'}" vừa được thêm!`);
        return res.status(201).json(created);
      }

      fallbackData.matches.unshift(matchData);
      broadcastDataUpdate('matches', `⚽ Trận đấu mới gặp "${matchData.opponent || 'Đối thủ'}" vừa được thêm!`);
      res.status(201).json(matchData);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (isMongoConnected()) {
        const updated = await Match.findOneAndUpdate({ id }, updates, { new: true });
        broadcastDataUpdate('matches', `⭐ Điểm số trận gặp "${updated?.opponent || ''}" vừa được cập nhật!`);
        return res.json(updated);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === id);
      if (idx !== -1) {
        fallbackData.matches[idx] = { ...fallbackData.matches[idx], ...updates };
        broadcastDataUpdate('matches', `⭐ Điểm số trận gặp "${fallbackData.matches[idx].opponent || ''}" vừa được cập nhật!`);
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matches/:id
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (isMongoConnected()) {
        await Match.findOneAndDelete({ id });
        broadcastDataUpdate('matches', '🗑️ Một trận đấu vừa được xóa khỏi lịch sử.');
        return res.json({ success: true, message: 'Match deleted' });
      }

      fallbackData.matches = fallbackData.matches.filter(m => m.id !== id);
      broadcastDataUpdate('matches', '🗑️ Một trận đấu vừa được xóa khỏi lịch sử.');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id/finance
  router.put('/:id/finance', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const financeData = req.body;

      if (isMongoConnected()) {
        const updated = await Match.findOneAndUpdate(
          { id },
          { $set: { finance: financeData } },
          { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Match not found' });
        broadcastDataUpdate('matches', '💰 Tiền sân trận đấu vừa được cập nhật!');
        return res.json(updated);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === id);
      if (idx !== -1) {
        fallbackData.matches[idx].finance = financeData;
        broadcastDataUpdate('matches', '💰 Tiền sân trận đấu vừa được cập nhật!');
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/matches/:id/finance/toggle-payment
  router.patch('/:id/finance/toggle-payment', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId, isPaid } = req.body;

      if (isMongoConnected()) {
        const match = await Match.findOne({ id });
        if (!match) return res.status(404).json({ error: 'Match not found' });

        if (!match.finance) match.finance = { payments: [] };
        if (!match.finance.payments) match.finance.payments = [];

        const pIdx = match.finance.payments.findIndex(p => p.playerId === playerId);
        if (pIdx !== -1) {
          match.finance.payments[pIdx].isPaid = isPaid;
          match.finance.payments[pIdx].paidAt = isPaid ? new Date() : null;
        }
        await match.save();
        broadcastDataUpdate('matches', isPaid ? '💳 Đã ghi nhận nộp tiền sân thành công!' : '💳 Đã hủy trạng thái nộp tiền sân.');
        return res.json(match);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === id);
      if (idx !== -1) {
        if (!fallbackData.matches[idx].finance) fallbackData.matches[idx].finance = { payments: [] };
        const pIdx = fallbackData.matches[idx].finance.payments.findIndex(p => p.playerId === playerId);
        if (pIdx !== -1) {
          fallbackData.matches[idx].finance.payments[pIdx].isPaid = isPaid;
          fallbackData.matches[idx].finance.payments[pIdx].paidAt = isPaid ? new Date().toISOString() : null;
        }
        broadcastDataUpdate('matches', isPaid ? '💳 Đã ghi nhận nộp tiền sân thành công!' : '💳 Đã hủy trạng thái nộp tiền sân.');
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matches (Xóa tất cả trận)
  router.delete('/', requireAdmin, async (req, res) => {
    try {
      if (isMongoConnected()) {
        await Match.deleteMany({});
        broadcastDataUpdate('matches', '🗑️ Danh sách trận đấu đã được làm mới.');
        return res.json({ success: true, message: 'All matches deleted' });
      }

      fallbackData.matches = [];
      broadcastDataUpdate('matches', '🗑️ Danh sách trận đấu đã được làm mới.');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// Router cho AI Rate Match (/api/ai/rate-match)

module.exports = {
  createMatchesRouter,
  // Re-export for full backward compatibility
  createAiRouter,
  createLiveMatchRouter,
  analyzeMatchWithNLP,
  getPlayerAliases
};
