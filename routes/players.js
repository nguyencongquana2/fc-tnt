/**
 * FC TNT - Players API Router
 * Quản lý danh sách cầu thủ, thông tin cá nhân và cập nhật avatar
 */

const express = require('express');
const Player = require('../models/Player');
const { avatarRateLimiter } = require('../utils/rateLimiter');
const { isValidAvatar } = require('../utils/validators');
const { verifyAdminToken, verifyPlayerToken } = require('./auth');

const ALLOWED_PROFILE_FIELDS = [
  'name', 'nickname', 'number', 'position', 'avatar',
  'phone', 'bankCode', 'bankAccountNumber', 'bankAccountName',
  'note', 'preferredFoot', 'height', 'weight', 'bio'
];

function sanitizePlayer(player) {
  if (!player) return null;
  const obj = typeof player.toObject === 'function' ? player.toObject() : { ...player };
  delete obj.passwordHash;
  return obj;
}

function pickProfileFields(body) {
  const clean = {};
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      clean[field] = body[field];
    }
  }
  return clean;
}

function createPlayersRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, requireAdmin }) {
  const router = express.Router();

  // GET /api/players
  router.get('/', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const players = await Player.find().select('-passwordHash').sort({ number: 1 });
        return res.json(players);
      }
      const safePlayers = (fallbackData.players || []).map(p => {
        const copy = { ...p };
        delete copy.passwordHash;
        return copy;
      });
      res.json(safePlayers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/players
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const data = pickProfileFields(req.body);
      if (!data.name || data.number === undefined || data.number === null || data.number === '') {
        return res.status(400).json({ error: 'Tên và số áo cầu thủ là bắt buộc!' });
      }

      data.name = String(data.name).trim();
      data.number = Number(data.number);
      data.id = req.body.id || 'p_' + Date.now();
      data.fundBalance = 0;
      data.role = 'player';
      data.accountStatus = 'unprovisioned';

      if (isMongoConnected()) {
        const created = await Player.create(data);
        broadcastDataUpdate('players', `👥 Cầu thủ mới "${data.name}" vừa được thêm vào đội hình!`);
        return res.status(201).json(sanitizePlayer(created));
      }

      fallbackData.players.push(data);
      broadcastDataUpdate('players', `👥 Cầu thủ mới "${data.name}" vừa được thêm vào đội hình!`);
      res.status(201).json(sanitizePlayer(data));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/players/:id/avatar (Cập nhật avatar - Chỉ Admin hoặc Chính Chủ mới có quyền)
  router.put('/:id/avatar', avatarRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { avatar } = req.body;

      // Kiểm tra quyền: Phải là Admin HOẶC chính chủ cầu thủ đó
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];
      
      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      let isOwner = false;
      if (playerToken) {
        const session = verifyPlayerToken(playerToken);
        if (session && session.playerId === id) {
          isOwner = true;
        }
      }

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          error: 'Bạn chỉ có quyền đổi ảnh đại diện của chính mình hoặc cần quyền Quản trị viên!'
        });
      }

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
        return res.json(sanitizePlayer(player));
      }

      const idx = fallbackData.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        fallbackData.players[idx].avatar = cleanAvatar;
        broadcastDataUpdate('players', `📸 Cầu thủ ${fallbackData.players[idx].name} vừa cập nhật avatar mới!`);
        return res.json(sanitizePlayer(fallbackData.players[idx]));
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
      const updates = pickProfileFields(req.body);

      if (updates.name !== undefined) updates.name = String(updates.name).trim();
      if (updates.number !== undefined) updates.number = Number(updates.number);

      if (isMongoConnected()) {
        const updated = await Player.findOneAndUpdate({ id }, { $set: updates }, { new: true }).select('-passwordHash');
        if (!updated) {
          return res.status(404).json({ error: 'Không tìm thấy cầu thủ!' });
        }
        broadcastDataUpdate('players', `👤 Thông tin cầu thủ ${updated?.name || ''} vừa được cập nhật!`);
        return res.json(sanitizePlayer(updated));
      }

      const idx = fallbackData.players.findIndex(p => p.id === id);
      if (idx !== -1) {
        fallbackData.players[idx] = { ...fallbackData.players[idx], ...updates };
        delete fallbackData.players[idx].passwordHash;
        broadcastDataUpdate('players', `👤 Thông tin cầu thủ ${fallbackData.players[idx].name} vừa được cập nhật!`);
        return res.json(sanitizePlayer(fallbackData.players[idx]));
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
