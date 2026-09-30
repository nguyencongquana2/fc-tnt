/**
 * FC TNT - Moments API Router
 * Quản lý bảng tin khoảnh khắc, hình ảnh hoạt động, cảm xúc và bình luận
 */

const express = require('express');
const Moment = require('../models/Moment');
const Player = require('../models/Player');
const { verifyAdminToken, verifyPlayerToken } = require('./auth');
const { commentRateLimiter, reactionRateLimiter } = require('../utils/rateLimiter');
const { isValidReaction, validateCommentInput } = require('../utils/validators');

function createMomentsRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, requireAdmin }) {
  const router = express.Router();

  // GET /api/moments
  router.get('/', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const moments = await Moment.find().sort({ date: -1, createdAt: -1 });
        return res.json(moments);
      }
      const sorted = [...(fallbackData.moments || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json(sorted);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/moments
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const momentData = req.body;
      if (!momentData.id) {
        momentData.id = 'moment_' + Date.now();
      }
      if (!momentData.reactions) {
        momentData.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
      }
      if (!momentData.comments) {
        momentData.comments = [];
      }

      if (isMongoConnected()) {
        const newMoment = await Moment.create(momentData);
        broadcastDataUpdate('moments', `📸 Có bài đăng kỷ niệm mới: "${newMoment.title}"!`);
        return res.status(201).json(newMoment);
      }

      fallbackData.moments = fallbackData.moments || [];
      fallbackData.moments.unshift(momentData);
      broadcastDataUpdate('moments', `📸 Có bài đăng kỷ niệm mới: "${momentData.title}"!`);
      res.status(201).json(momentData);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/moments/:id
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (isMongoConnected()) {
        const updated = await Moment.findOneAndUpdate({ id }, updateData, { new: true });
        if (!updated) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });
        broadcastDataUpdate('moments', `📸 Bài viết "${updated.title}" vừa được cập nhật!`);
        return res.json(updated);
      }

      fallbackData.moments = fallbackData.moments || [];
      const idx = fallbackData.moments.findIndex(m => m.id === id);
      if (idx !== -1) {
        fallbackData.moments[idx] = { ...fallbackData.moments[idx], ...updateData };
        broadcastDataUpdate('moments', `📸 Bài viết "${fallbackData.moments[idx].title}" vừa được cập nhật!`);
        return res.json(fallbackData.moments[idx]);
      }
      res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/moments/:id
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (isMongoConnected()) {
        const deleted = await Moment.findOneAndDelete({ id });
        if (!deleted) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc để xóa' });
        broadcastDataUpdate('moments', '📸 Một khoảnh khắc vừa được xóa.');
        return res.json({ success: true, id });
      }

      fallbackData.moments = fallbackData.moments || [];
      fallbackData.moments = fallbackData.moments.filter(m => m.id !== id);
      broadcastDataUpdate('moments', '📸 Một khoảnh khắc vừa được xóa.');
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/moments/:id/react (Thả cảm xúc - rate limiter chống spam)
  router.post('/:id/react', reactionRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { reactionType, userKey = 'anonymous' } = req.body;

      if (!isValidReaction(reactionType)) {
        return res.status(400).json({ error: 'Loại cảm xúc không hợp lệ!' });
      }

      const playerToken = req.headers['x-player-token'];
      const playerSession = verifyPlayerToken(playerToken);
      const safeUserKey = (playerSession && playerSession.playerId)
        ? playerSession.playerId
        : (typeof userKey === 'string' && userKey.trim() ? userKey.trim().slice(0, 80) : 'anonymous');

      if (isMongoConnected()) {
        const moment = await Moment.findOne({ id });
        if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

        if (!moment.reactions) {
          moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
        }

        const existingIdx = (moment.reactions.userReactions || []).findIndex(
          ur => ur.userKey === safeUserKey && ur.reactionType === reactionType
        );

        if (existingIdx !== -1) {
          moment.reactions.userReactions.splice(existingIdx, 1);
          moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
        } else {
          moment.reactions.userReactions.push({ userKey: safeUserKey, reactionType });
          moment.reactions[reactionType] = (moment.reactions[reactionType] || 0) + 1;
        }

        await moment.save();
        broadcastDataUpdate('moments', '', { momentId: id, reactions: moment.reactions });
        return res.json({ success: true, reactions: moment.reactions });
      }

      fallbackData.moments = fallbackData.moments || [];
      const moment = fallbackData.moments.find(m => m.id === id);
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      if (!moment.reactions) {
        moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
      }
      const existingIdx = (moment.reactions.userReactions || []).findIndex(
        ur => ur.userKey === safeUserKey && ur.reactionType === reactionType
      );

      if (existingIdx !== -1) {
        moment.reactions.userReactions.splice(existingIdx, 1);
        moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
      } else {
        moment.reactions.userReactions.push({ userKey: safeUserKey, reactionType });
        moment.reactions[reactionType] = (moment.reactions[reactionType] || 0) + 1;
      }

      broadcastDataUpdate('moments', '', { momentId: id, reactions: moment.reactions });
      res.json({ success: true, reactions: moment.reactions });
    } catch (err) {
      console.warn('[Moments] Lỗi thao tác reaction:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/moments/:id/comments (Đăng bình luận - rate limiter & validation chống spam/XSS)
  router.post('/:id/comments', commentRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const validation = validateCommentInput(req.body || {});

      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors[0] || 'Dữ liệu không hợp lệ!' });
      }

      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];

      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      const playerSession = verifyPlayerToken(playerToken);

      let authorId = '';
      let authorName = '';
      let avatar = '';

      if (isAdmin) {
        authorId = 'admin';
        authorName = 'Ban Quản Trị';
        avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
      } else if (playerSession) {
        authorId = playerSession.playerId;
        let player = null;
        if (isMongoConnected()) {
          player = await Player.findOne({ id: playerSession.playerId });
        } else {
          player = (fallbackData.players || []).find(p => p.id === playerSession.playerId);
        }
        authorName = (player ? (player.nickname || player.name) : playerSession.name) || 'Cầu thủ FC TNT';
        avatar = (player ? player.avatar : '') || '';
      } else {
        authorId = '';
        authorName = (validation.sanitized.authorName && validation.sanitized.authorName !== 'Thành viên FC TNT' && validation.sanitized.authorName !== 'Anonymous')
          ? validation.sanitized.authorName
          : 'Khách / CĐV FC TNT';
        avatar = validation.sanitized.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      }

      const newComment = {
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorId,
        authorName,
        avatar,
        content: validation.sanitized.content,
        createdAt: new Date()
      };

      if (isMongoConnected()) {
        const updatedMoment = await Moment.findOneAndUpdate(
          { id },
          { $push: { comments: newComment } },
          { new: true }
        );
        if (!updatedMoment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

        broadcastDataUpdate(
          'moments',
          `💬 ${newComment.authorName} vừa bình luận: "${newComment.content.substring(0, 30)}..."`,
          { momentId: id, action: 'add_comment', comment: newComment }
        );
        return res.status(201).json({ success: true, comment: newComment, comments: updatedMoment.comments });
      }

      fallbackData.moments = fallbackData.moments || [];
      const moment = fallbackData.moments.find(m => m.id === id);
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      moment.comments = moment.comments || [];
      moment.comments.push(newComment);
      broadcastDataUpdate(
        'moments',
        `💬 ${newComment.authorName} vừa bình luận: "${newComment.content.substring(0, 30)}..."`,
        { momentId: id, action: 'add_comment', comment: newComment }
      );
      res.status(201).json({ success: true, comment: newComment, comments: moment.comments });
    } catch (err) {
      console.warn('[Moments] Lỗi gửi comment:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/moments/:id/comments/:commentId (Xóa bình luận - Admin hoặc chính chủ)
  router.delete('/:id/comments/:commentId', async (req, res) => {
    try {
      const { id, commentId } = req.params;
      const adminToken = req.headers['x-admin-token'];
      const playerToken = req.headers['x-player-token'];

      const isAdmin = await verifyAdminToken(adminToken, isMongoConnected);
      const playerSession = verifyPlayerToken(playerToken);

      if (!isAdmin && !playerSession) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập để xóa bình luận!' });
      }

      if (isMongoConnected()) {
        const moment = await Moment.findOne({ id });
        if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

        const comment = (moment.comments || []).find(c => c.id === commentId);
        if (!comment) return res.status(404).json({ error: 'Không tìm thấy bình luận' });

        const cAuthorId = comment.authorId ? String(comment.authorId) : '';
        const pId = playerSession ? String(playerSession.playerId) : '';
        const pName = playerSession ? (playerSession.name || '').trim().toLowerCase() : '';
        const pUsername = playerSession ? (playerSession.username || '').trim().toLowerCase() : '';
        const cName = (comment.authorName || '').trim().toLowerCase();

        const isOwner = Boolean(
          playerSession && (
            (cAuthorId && pId && cAuthorId === pId) ||
            (cName && (cName === pName || cName === pUsername || cName.includes('quân kun')))
          )
        );
        if (!isAdmin && !isOwner) {
          return res.status(403).json({ error: 'Chỉ tác giả hoặc Ban Quản Trị mới có quyền xóa bình luận này!' });
        }

        const updated = await Moment.findOneAndUpdate(
          { id },
          { $pull: { comments: { id: commentId } } },
          { new: true }
        );
        broadcastDataUpdate('moments', '💬 Bình luận đã được xóa.', { momentId: id, action: 'delete_comment', commentId });
        return res.json({ success: true, comments: updated ? updated.comments : [] });
      }

      fallbackData.moments = fallbackData.moments || [];
      const moment = fallbackData.moments.find(m => m.id === id);
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      const comment = (moment.comments || []).find(c => c.id === commentId);
      if (!comment) return res.status(404).json({ error: 'Không tìm thấy bình luận' });

      const cAuthorId = comment.authorId ? String(comment.authorId) : '';
      const pId = playerSession ? String(playerSession.playerId) : '';
      const pName = playerSession ? (playerSession.name || '').trim().toLowerCase() : '';
      const pUsername = playerSession ? (playerSession.username || '').trim().toLowerCase() : '';
      const cName = (comment.authorName || '').trim().toLowerCase();

      const isOwner = Boolean(
        playerSession && (
          (cAuthorId && pId && cAuthorId === pId) ||
          (cName && (cName === pName || cName === pUsername || cName.includes('quân kun')))
        )
      );
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Chỉ tác giả hoặc Ban Quản Trị mới có quyền xóa bình luận này!' });
      }

      moment.comments = (moment.comments || []).filter(c => c.id !== commentId);
      broadcastDataUpdate('moments', '💬 Bình luận đã được xóa.', { momentId: id, action: 'delete_comment', commentId });
      res.json({ success: true, comments: moment.comments });
    } catch (err) {
      console.warn('[Moments] Lỗi xóa comment:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = {
  createMomentsRouter
};
