/**
 * FC TNT - Players API Router
 * Quản lý danh sách cầu thủ, thông tin cá nhân và cập nhật avatar
 */

const express = require('express');
const Player = require('../models/Player');

function createPlayersRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, requireAdmin }) {
  const router = express.Router();

  // GET /api/players
  router.get('/', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const players = await Player.find().sort({ number: 1 });
        return res.json(players);
      }
      res.json(fallbackData.players);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/players
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const data = req.body;
      if (!data.id) data.id = 'p_' + Date.now();

      if (isMongoConnected()) {
        const created = await Player.create(data);
        broadcastDataUpdate('players', `👥 Cầu thủ mới "${data.name}" vừa được thêm vào đội hình!`);
        return res.status(201).json(created);
      }

      fallbackData.players.push(data);
      broadcastDataUpdate('players', `👥 Cầu thủ mới "${data.name}" vừa được thêm vào đội hình!`);
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/players/:id/avatar (Cập nhật avatar - mở cho thành viên)
  router.put('/:id/avatar', async (req, res) => {
    try {
      const { id } = req.params;
      const { avatar } = req.body;

      if (!avatar) {
        return res.status(400).json({ error: 'Thiếu dữ liệu ảnh đại diện' });
      }

      if (isMongoConnected()) {
        const updated = await Player.findOneAndUpdate({ id }, { avatar }, { new: true });
        broadcastDataUpdate('players', `📸 Cầu thủ ${updated?.name || ''} vừa cập nhật avatar mới!`);
        return res.json(updated);
      }

      const idx = fallbackData.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        fallbackData.players[idx].avatar = avatar;
        broadcastDataUpdate('players', `📸 Cầu thủ ${fallbackData.players[idx].name} vừa cập nhật avatar mới!`);
        return res.json(fallbackData.players[idx]);
      }
      res.status(404).json({ error: 'Player not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/players/:id (Cập nhật thông tin cầu thủ)
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (isMongoConnected()) {
        const updated = await Player.findOneAndUpdate({ id }, updates, { new: true });
        broadcastDataUpdate('players', `👤 Thông tin cầu thủ ${updated?.name || ''} vừa được cập nhật!`);
        return res.json(updated);
      }

      const idx = fallbackData.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        fallbackData.players[idx] = { ...fallbackData.players[idx], ...updates };
        broadcastDataUpdate('players', `👤 Thông tin cầu thủ ${fallbackData.players[idx].name} vừa được cập nhật!`);
        return res.json(fallbackData.players[idx]);
      }
      res.status(404).json({ error: 'Player not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/players/:id
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (isMongoConnected()) {
        const p = await Player.findOne({ id });
        await Player.findOneAndDelete({ id });
        broadcastDataUpdate('players', `👥 Cầu thủ ${p?.name || ''} đã được xóa khỏi đội.`);
        return res.json({ success: true, message: 'Player deleted' });
      }

      const p = fallbackData.players.find(p => p.id === id);
      fallbackData.players = fallbackData.players.filter(p => p.id !== id);
      broadcastDataUpdate('players', `👥 Cầu thủ ${p?.name || ''} đã được xóa khỏi đội.`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = {
  createPlayersRouter
};
