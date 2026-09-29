/**
 * FC TNT - Tactics API Router
 * Quản lý kho kịch bản sa bàn chiến thuật, bài tập cố định và thảo luận đội bóng
 */

const express = require('express');
const Tactic = require('../models/Tactic');
const { verifyAdminToken, verifyPlayerToken } = require('./auth');
const { commentRateLimiter, tacticRateLimiter, reactionRateLimiter } = require('../utils/rateLimiter');
const { validateCommentInput } = require('../utils/validators');

const ALLOWED_CATEGORIES = ['corner', 'throw_in', 'pressing_escape', 'freekick', 'defense', 'attack', 'custom'];

function createTacticsRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, io }) {
  const router = express.Router();

  // GET /api/tactics (Lấy danh sách tất cả các bài chiến thuật)
  router.get('/', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const tactics = await Tactic.find().sort({ updatedAt: -1, createdAt: -1 });
        return res.json(tactics);
      }
      const list = [...(fallbackData.tactics || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      res.json(list);
    } catch (err) {
      console.warn('[Tactics] Get list error:', err.message);
      res.status(500).json({ error: 'Không thể tải danh sách chiến thuật!' });
    }
  });

  // GET /api/tactics/:id (Chi tiết một bài chiến thuật)
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (isMongoConnected()) {
        const tactic = await Tactic.findOne({ id });
        if (!tactic) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });
        return res.json(tactic);
      }
      const item = (fallbackData.tactics || []).find(t => t.id === id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tactics (Lưu bài chiến thuật mới - Thành viên hoặc Admin)
  router.post('/', tacticRateLimiter, async (req, res) => {
    try {
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];

      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      const playerSession = verifyPlayerToken(playerToken);

      if (!isAdmin && !playerSession) {
        return res.status(401).json({
          error: 'Vui lòng đăng nhập Thành viên hoặc Quản trị viên để lưu bài chiến thuật!'
        });
      }

      const { title, category, description, formationHome, formationAway, pieces, drawings } = req.body;
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên bài chiến thuật!' });
      }

      const cleanTitle = String(title).trim();
      const cleanDesc = description ? String(description).trim() : '';
      const cleanCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'custom';

      const author = isAdmin ? {
        id: 'admin',
        name: 'Đội Trưởng / BHL',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      } : {
        id: playerSession.playerId,
        name: playerSession.name || playerSession.username || 'Thành viên FC TNT',
        role: playerSession.role || 'player',
        avatar: ''
      };

      const newTactic = {
        id: 'tactic_' + Date.now(),
        title: cleanTitle,
        category: cleanCategory,
        description: cleanDesc,
        author,
        formationHome: formationHome || '3-1-2',
        formationAway: formationAway || '3-2-1',
        pieces: Array.isArray(pieces) ? pieces.slice(0, 30) : [],
        drawings: Array.isArray(drawings) ? drawings.slice(0, 150) : [],
        comments: [],
        likes: [],
        isPreset: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (isMongoConnected()) {
        const created = await Tactic.create(newTactic);
        broadcastDataUpdate('tactics', `📋 Chiến thuật mới "${created.title}" vừa được thêm bởi ${author.name}!`);
        return res.status(201).json(created);
      }

      fallbackData.tactics = fallbackData.tactics || [];
      fallbackData.tactics.unshift(newTactic);
      broadcastDataUpdate('tactics', `📋 Chiến thuật mới "${newTactic.title}" vừa được thêm bởi ${author.name}!`);
      res.status(201).json(newTactic);
    } catch (err) {
      console.warn('[Tactics] Save error:', err.message);
      res.status(500).json({ error: 'Lỗi khi lưu bài chiến thuật!' });
    }
  });

  // PUT /api/tactics/:id (Cập nhật kịch bản chiến thuật)
  router.put('/:id', tacticRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];

      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      const playerSession = verifyPlayerToken(playerToken);

      if (!isAdmin && !playerSession) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập để chỉnh sửa chiến thuật!' });
      }

      let existing = null;
      if (isMongoConnected()) {
        existing = await Tactic.findOne({ id });
      } else {
        existing = (fallbackData.tactics || []).find(t => t.id === id);
      }

      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });
      }

      // Chỉ Admin hoặc chính tác giả mới được quyền sửa
      const isAuthor = playerSession && existing.author && existing.author.id === playerSession.playerId;
      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: 'Bạn chỉ có thể chỉnh sửa bài chiến thuật do chính mình tạo ra!' });
      }

      const { title, category, description, formationHome, formationAway, pieces, drawings } = req.body;
      if (title !== undefined) existing.title = String(title).trim();
      if (category !== undefined) existing.category = ALLOWED_CATEGORIES.includes(category) ? category : 'custom';
      if (description !== undefined) existing.description = String(description).trim();
      if (formationHome !== undefined) existing.formationHome = formationHome;
      if (formationAway !== undefined) existing.formationAway = formationAway;
      if (Array.isArray(pieces)) existing.pieces = pieces.slice(0, 30);
      if (Array.isArray(drawings)) existing.drawings = drawings.slice(0, 150);
      existing.updatedAt = new Date();

      if (isMongoConnected() && typeof existing.save === 'function') {
        await existing.save();
        broadcastDataUpdate('tactics', `✏️ Chiến thuật "${existing.title}" vừa được cập nhật!`);
        return res.json(existing);
      }

      broadcastDataUpdate('tactics', `✏️ Chiến thuật "${existing.title}" vừa được cập nhật!`);
      res.json(existing);
    } catch (err) {
      console.warn('[Tactics] Update error:', err.message);
      res.status(500).json({ error: 'Lỗi khi cập nhật bài chiến thuật!' });
    }
  });

  // DELETE /api/tactics/:id (Xóa bài chiến thuật)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];

      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      const playerSession = verifyPlayerToken(playerToken);

      if (!isAdmin && !playerSession) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập để xóa chiến thuật!' });
      }

      let existing = null;
      if (isMongoConnected()) {
        existing = await Tactic.findOne({ id });
      } else {
        existing = (fallbackData.tactics || []).find(t => t.id === id);
      }

      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });
      }

      // Không cho phép xóa bài tập mẫu mặc định của hệ thống
      if (existing.isPreset && !isAdmin) {
        return res.status(403).json({ error: 'Chỉ Quản trị viên mới được phép xóa bài tập mẫu hệ thống!' });
      }

      const isAuthor = playerSession && existing.author && existing.author.id === playerSession.playerId;
      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: 'Bạn chỉ có quyền xóa bài chiến thuật do chính mình tạo!' });
      }

      if (isMongoConnected()) {
        await Tactic.findOneAndDelete({ id });
      } else {
        fallbackData.tactics = (fallbackData.tactics || []).filter(t => t.id !== id);
      }

      broadcastDataUpdate('tactics', `🗑️ Bài chiến thuật "${existing.title}" đã được xóa.`);
      res.json({ success: true, message: 'Đã xóa bài chiến thuật thành công!' });
    } catch (err) {
      console.warn('[Tactics] Delete error:', err.message);
      res.status(500).json({ error: 'Lỗi khi xóa bài chiến thuật!' });
    }
  });

  // POST /api/tactics/:id/comments (Thảo luận & Góp ý chiến thuật)
  router.post('/:id/comments', commentRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const playerToken = req.headers['x-player-token'];
      const session = verifyPlayerToken(playerToken);

      const validation = validateCommentInput(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors[0] || 'Nội dung bình luận không hợp lệ!' });
      }

      const { authorName, avatar, content } = validation.sanitized;

      const comment = {
        id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        playerId: session ? session.playerId : '',
        authorName: (session ? (session.name || session.username) : authorName).trim(),
        avatar: avatar || (session ? session.avatar : '') || '',
        content,
        createdAt: new Date()
      };

      if (isMongoConnected()) {
        const tactic = await Tactic.findOne({ id });
        if (!tactic) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });

        tactic.comments.push(comment);
        await tactic.save();
        if (io) io.to('tactics_room').emit('tactics_comment_added', { tacticId: id, comment });
        broadcastDataUpdate('tactics', `💬 Bình luận mới về chiến thuật "${tactic.title}"!`);
        return res.status(201).json(comment);
      }

      const item = (fallbackData.tactics || []).find(t => t.id === id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });

      item.comments = item.comments || [];
      item.comments.push(comment);
      if (io) io.to('tactics_room').emit('tactics_comment_added', { tacticId: id, comment });
      broadcastDataUpdate('tactics', `💬 Bình luận mới về chiến thuật "${item.title}"!`);
      res.status(201).json(comment);
    } catch (err) {
      console.warn('[Tactics] Comment error:', err.message);
      res.status(500).json({ error: 'Lỗi khi gửi bình luận góp ý!' });
    }
  });

  // DELETE /api/tactics/:id/comments/:commentId (Xóa bình luận)
  router.delete('/:id/comments/:commentId', async (req, res) => {
    try {
      const { id, commentId } = req.params;
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];

      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      const playerSession = verifyPlayerToken(playerToken);

      if (!isAdmin && !playerSession) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập để xóa bình luận!' });
      }

      if (isMongoConnected()) {
        const tactic = await Tactic.findOne({ id });
        if (!tactic) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });

        const comment = tactic.comments.find(c => c.id === commentId);
        if (!comment) return res.status(404).json({ error: 'Không tìm thấy bình luận!' });

        const isCommentAuthor = playerSession && comment.playerId === playerSession.playerId;
        if (!isAdmin && !isCommentAuthor) {
          return res.status(403).json({ error: 'Chỉ tác giả hoặc Quản trị viên mới được xóa bình luận này!' });
        }

        tactic.comments = tactic.comments.filter(c => c.id !== commentId);
        await tactic.save();
        if (io) io.to('tactics_room').emit('tactics_comment_deleted', { tacticId: id, commentId });
        broadcastDataUpdate('tactics', '🗑️ Một bình luận chiến thuật đã được xóa.');
        return res.json({ success: true, message: 'Đã xóa bình luận thành công!' });
      }

      const item = (fallbackData.tactics || []).find(t => t.id === id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });

      const comment = (item.comments || []).find(c => c.id === commentId);
      if (!comment) return res.status(404).json({ error: 'Không tìm thấy bình luận!' });

      const isCommentAuthor = playerSession && comment.playerId === playerSession.playerId;
      if (!isAdmin && !isCommentAuthor) {
        return res.status(403).json({ error: 'Chỉ tác giả hoặc Quản trị viên mới được xóa bình luận này!' });
      }

      item.comments = (item.comments || []).filter(c => c.id !== commentId);
      if (io) io.to('tactics_room').emit('tactics_comment_deleted', { tacticId: id, commentId });
      broadcastDataUpdate('tactics', '🗑️ Một bình luận chiến thuật đã được xóa.');
      res.json({ success: true, message: 'Đã xóa bình luận thành công!' });
    } catch (err) {
      console.warn('[Tactics] Delete comment error:', err.message);
      res.status(500).json({ error: 'Lỗi khi xóa bình luận!' });
    }
  });

  // POST /api/tactics/:id/like (Thả tim bài chiến thuật)
  router.post('/:id/like', reactionRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const userKey = userId || req.headers['x-player-token'] || req.ip;

      if (isMongoConnected()) {
        const tactic = await Tactic.findOne({ id });
        if (!tactic) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });

        const idx = tactic.likes.indexOf(userKey);
        if (idx === -1) {
          tactic.likes.push(userKey);
        } else {
          tactic.likes.splice(idx, 1);
        }
        await tactic.save();
        return res.json({ success: true, likesCount: tactic.likes.length, isLiked: idx === -1 });
      }

      const item = (fallbackData.tactics || []).find(t => t.id === id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy bài chiến thuật!' });

      item.likes = item.likes || [];
      const idx = item.likes.indexOf(userKey);
      if (idx === -1) {
        item.likes.push(userKey);
      } else {
        item.likes.splice(idx, 1);
      }
      res.json({ success: true, likesCount: item.likes.length, isLiked: idx === -1 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = {
  createTacticsRouter
};
