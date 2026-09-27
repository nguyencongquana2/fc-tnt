/**
 * FC TNT - Players API Router
 * Quản lý danh sách cầu thủ, thông tin cá nhân và cập nhật avatar
 */

const express = require('express');
const Player = require('../models/Player');
const { avatarRateLimiter } = require('../utils/rateLimiter');
const { isValidAvatar } = require('../utils/validators');

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

  // PUT /api/players/:id/avatar (Cập nhật avatar - mở cho thành viên có rate limiter & validation an toàn)
  router.put('/:id/avatar', avatarRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { avatar } = req.body;

      if (!isValidAvatar(avatar)) {
        return res.status(400).json({ 
          error: 'Ảnh đại diện không hợp lệ! Vui lòng chọn ảnh định dạng JPEG, PNG, WEBP, GIF (tối đa 2.5MB) hoặc đường link ảnh web hợp lệ.' 
        });
      }

      const cleanAvatar = avatar.trim();

      if (isMongoConnected()) {
        const player = await Player.findOne({ id });
        if (!player) {
          return res.status(404).json({ error: 'Không tìm thấy cầu thủ!' });
        }
        player.avatar = cleanAvatar;
        await player.save();
        broadcastDataUpdate('players', `📸 Cầu thủ ${player.name || ''} vừa cập nhật avatar mới!`);
        return res.json(player);
      }

      const idx = fallbackData.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        fallbackData.players[idx].avatar = cleanAvatar;
        broadcastDataUpdate('players', `📸 Cầu thủ ${fallbackData.players[idx].name} vừa cập nhật avatar mới!`);
        return res.json(fallbackData.players[idx]);
      }
      res.status(404).json({ error: 'Không tìm thấy cầu thủ!' });
    } catch (err) {
      console.warn('[Players] Update avatar failed:', err.message);
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
