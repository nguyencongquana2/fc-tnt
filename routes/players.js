/**
 * FC TNT - Players API Router
 * Quản lý danh sách cầu thủ, thông tin cá nhân và cập nhật avatar
 */

const express = require('express');
const Player = require('../models/Player');
const { avatarRateLimiter } = require('../utils/rateLimiter');
const { isValidAvatar } = require('../utils/validators');
const { verifyAdminToken, verifyPlayerToken } = require('./auth');
const { isGuestPlayer } = require('../utils/guestJersey');

const ALLOWED_PROFILE_FIELDS = [
  'name', 'nickname', 'number', 'position', 'avatar',
  'phone', 'bankCode', 'bankAccountNumber', 'bankAccountName',
  'note', 'preferredFoot', 'height', 'weight', 'bio',
  'isGuest', 'invitedBy', 'jerseyColor'
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
        const rawPlayers = await Player.find().select('-passwordHash').sort({ number: 1 });
        const players = rawPlayers.map(p => {
          const obj = sanitizePlayer(p);
          if (obj.isGuest === undefined || obj.isGuest === null) {
            obj.isGuest = isGuestPlayer(obj);
          }
          return obj;
        });
        return res.json(players);
      }
      const safePlayers = (fallbackData.players || []).map(p => {
        const copy = { ...p };
        delete copy.passwordHash;
        if (copy.isGuest === undefined || copy.isGuest === null) {
          copy.isGuest = isGuestPlayer(copy);
        }
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
      const isGuest = Boolean(req.body.isGuest || isGuestPlayer(data));
      data.isGuest = isGuest;
      data.invitedBy = req.body.invitedBy ? String(req.body.invitedBy).trim() : (data.invitedBy || '');
      data.jerseyColor = req.body.jerseyColor ? String(req.body.jerseyColor).trim() : (data.jerseyColor || '');

      if (!data.name || String(data.name).trim() === '') {
        return res.status(400).json({ error: 'Tên cầu thủ là bắt buộc!' });
      }

      data.name = String(data.name).trim();

      // Nếu là khách mà chưa có số áo, tự động cấp số áo phụ (91 - 99)
      if (data.number === undefined || data.number === null || data.number === '' || isNaN(Number(data.number))) {
        if (isGuest) {
          let maxGuestNum = 90;
          const currentList = isMongoConnected() ? await Player.find() : fallbackData.players;
          currentList.forEach(p => {
            const num = Number(p.number) || 0;
            if (num >= 90 && num > maxGuestNum) maxGuestNum = num;
          });
          data.number = Math.min(99, maxGuestNum + 1);
        } else {
          return res.status(400).json({ error: 'Tên và số áo cầu thủ là bắt buộc!' });
        }
      } else {
        data.number = Number(data.number);
      }

      data.id = req.body.id || 'p_' + Date.now();
      data.fundBalance = 0;
      data.role = 'player';
      data.accountStatus = 'unprovisioned';

      const logMsg = isGuest 
        ? `🤝 Viện binh/Khách mời "${data.name}" vừa được thêm vào trận!` 
        : `👥 Cầu thủ mới "${data.name}" vừa được thêm vào đội hình!`;

      if (isMongoConnected()) {
        const created = await Player.create(data);
        broadcastDataUpdate('players', logMsg);
        return res.status(201).json(sanitizePlayer(created));
      }

      fallbackData.players.push(data);
      broadcastDataUpdate('players', logMsg);
      res.status(201).json(sanitizePlayer(data));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/players/:id/promote (Thăng hạng khách mời thành thành viên chính thức)
  router.post('/:id/promote', requireAdmin, async (req, res) => {
    try {
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) return res.status(400).json({ error: 'ID cầu thủ không hợp lệ!' });
      const updates = { isGuest: false, invitedBy: '' };
      if (req.body.number !== undefined && !isNaN(Number(req.body.number))) {
        updates.number = Number(req.body.number);
      }
      if (req.body.position) {
        updates.position = req.body.position;
      }

      if (isMongoConnected()) {
        const updated = await Player.findOneAndUpdate({ id: cleanId }, { $set: updates }, { new: true }).select('-passwordHash');
        if (!updated) return res.status(404).json({ error: 'Không tìm thấy cầu thủ!' });
        broadcastDataUpdate('players', `⭐ Chúc mừng ${updated.name} đã trở thành thành viên chính thức của FC TNT!`);
        return res.json(sanitizePlayer(updated));
      }

      const idx = fallbackData.players.findIndex(p => p.id === cleanId);
      if (idx !== -1) {
        fallbackData.players[idx] = { ...fallbackData.players[idx], ...updates };
        broadcastDataUpdate('players', `⭐ Chúc mừng ${fallbackData.players[idx].name} đã trở thành thành viên chính thức của FC TNT!`);
        return res.json(sanitizePlayer(fallbackData.players[idx]));
      }
      res.status(404).json({ error: 'Không tìm thấy cầu thủ!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/players/:id/avatar (Cập nhật avatar - Chỉ Admin hoặc Chính Chủ mới có quyền)
  router.put('/:id/avatar', avatarRateLimiter, async (req, res) => {
    try {
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) return res.status(400).json({ error: 'ID cầu thủ không hợp lệ!' });
      const { avatar } = req.body;

      // Kiểm tra quyền: Phải là Admin HOẶC chính chủ cầu thủ đó
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];
      
      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      let isOwner = false;
      if (playerToken) {
        const session = verifyPlayerToken(playerToken);
        if (session && session.playerId === cleanId) {
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
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) return res.status(400).json({ error: 'ID cầu thủ không hợp lệ!' });
      const updates = pickProfileFields(req.body);

      if (updates.name !== undefined) updates.name = String(updates.name).trim();
      if (updates.number !== undefined) updates.number = Number(updates.number);

      if (isMongoConnected()) {
        const updated = await Player.findOneAndUpdate({ id: cleanId }, { $set: updates }, { new: true }).select('-passwordHash');
        if (!updated) {
          return res.status(404).json({ error: 'Không tìm thấy cầu thủ!' });
        }
        broadcastDataUpdate('players', `👤 Thông tin cầu thủ ${updated?.name || ''} vừa được cập nhật!`);
        return res.json(sanitizePlayer(updated));
      }

      const idx = fallbackData.players.findIndex(p => p.id === cleanId);
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
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) return res.status(400).json({ error: 'ID cầu thủ không hợp lệ!' });

      if (isMongoConnected()) {
        const p = await Player.findOne({ id: cleanId });
        await Player.findOneAndDelete({ id: cleanId });
        broadcastDataUpdate('players', `👥 Cầu thủ ${p?.name || ''} đã được xóa khỏi đội.`);
        return res.json({ success: true, message: 'Player deleted' });
      }

      const p = fallbackData.players.find(p => p.id === cleanId);
      fallbackData.players = fallbackData.players.filter(p => p.id !== cleanId);
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
