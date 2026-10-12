/**
 * FC TNT - Matches & Financial Payments Router
 * Quản lý lịch sử trận đấu, CRUD và thanh toán quỹ sân
 */

const express = require('express');
const Match = require('../models/Match');
const { createAiRouter, analyzeMatchWithNLP, getPlayerAliases } = require('./ai');
const { createLiveMatchRouter } = require('./liveMatch');

function createMatchesRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, requireAdmin, requireAdminOrTreasurer }) {
  const router = express.Router();
  const authFinance = requireAdminOrTreasurer || requireAdmin;

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

  // POST /api/matches (Chỉ Quản trị viên mới được tạo trận đấu)
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

  // PUT /api/matches/:id (Quản trị viên hoặc Thủ quỹ cập nhật cấu hình/tài chính)
  router.put('/:id', authFinance, async (req, res) => {
    try {
      const { id } = req.params;
      let updates = req.body;

      // Phân quyền chặt chẽ: Thủ quỹ chỉ được phép cập nhật dữ liệu tài chính của trận đấu
      if (!req.isAdmin && req.isTreasurer) {
        if (updates && updates.finance) {
          updates = { finance: updates.finance };
        } else {
          return res.status(403).json({ error: 'Thủ quỹ chỉ có quyền cập nhật dữ liệu tài chính của trận đấu!' });
        }
      }

      const cleanId = String(id).trim();

      if (isMongoConnected()) {
        const updated = await Match.findOneAndUpdate({ id: cleanId }, { $set: updates }, { new: true });
        broadcastDataUpdate('matches', `⭐ Thông tin trận gặp "${updated?.opponent || ''}" vừa được cập nhật!`);
        return res.json(updated);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === cleanId);
      if (idx !== -1) {
        fallbackData.matches[idx] = { ...fallbackData.matches[idx], ...updates };
        broadcastDataUpdate('matches', `⭐ Thông tin trận gặp "${fallbackData.matches[idx].opponent || ''}" vừa được cập nhật!`);
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matches/:id (Chỉ Quản trị viên mới được xóa trận)
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) return res.status(400).json({ error: 'ID trận đấu không hợp lệ!' });

      if (isMongoConnected()) {
        await Match.findOneAndDelete({ id: cleanId });
        broadcastDataUpdate('matches', '🗑️ Một trận đấu vừa được xóa khỏi lịch sử.');
        return res.json({ success: true, message: 'Match deleted' });
      }

      fallbackData.matches = fallbackData.matches.filter(m => m.id !== cleanId);
      broadcastDataUpdate('matches', '🗑️ Một trận đấu vừa được xóa khỏi lịch sử.');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id/finance (Quản trị viên HOẶC Thủ quỹ)
  router.put('/:id/finance', authFinance, async (req, res) => {
    try {
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) return res.status(400).json({ error: 'ID trận đấu không hợp lệ!' });
      const financeData = req.body;

      if (isMongoConnected()) {
        const updated = await Match.findOneAndUpdate(
          { id: cleanId },
          { $set: { finance: financeData } },
          { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Match not found' });
        broadcastDataUpdate('matches', '💰 Tiền sân trận đấu vừa được cập nhật!');
        return res.json(updated);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === cleanId);
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

  // PATCH /api/matches/:id/finance/toggle-payment (Quản trị viên HOẶC Thủ quỹ)
  router.patch('/:id/finance/toggle-payment', authFinance, async (req, res) => {
    try {
      const cleanId = String(req.params.id || '').trim();
      const cleanPlayerId = String(req.body.playerId || '').trim();
      const { isPaid } = req.body;
      if (!cleanId || !cleanPlayerId) return res.status(400).json({ error: 'ID trận đấu hoặc ID cầu thủ không hợp lệ!' });

      if (isMongoConnected()) {
        const match = await Match.findOne({ id: cleanId });
        if (!match) return res.status(404).json({ error: 'Match not found' });

        if (!match.finance) match.finance = { payments: [] };
        if (!match.finance.payments) match.finance.payments = [];

        const pIdx = match.finance.payments.findIndex(p => p.playerId === cleanPlayerId);
        if (pIdx !== -1) {
          match.finance.payments[pIdx].isPaid = Boolean(isPaid);
          match.finance.payments[pIdx].paidAt = isPaid ? new Date() : null;
        }
        await match.save();
        broadcastDataUpdate('matches', isPaid ? '💳 Đã ghi nhận nộp tiền sân thành công!' : '💳 Đã hủy trạng thái nộp tiền sân.');
        return res.json(match);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === cleanId);
      if (idx !== -1) {
        if (!fallbackData.matches[idx].finance) fallbackData.matches[idx].finance = { payments: [] };
        const pIdx = fallbackData.matches[idx].finance.payments.findIndex(p => p.playerId === cleanPlayerId);
        if (pIdx !== -1) {
          fallbackData.matches[idx].finance.payments[pIdx].isPaid = Boolean(isPaid);
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
