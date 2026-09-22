/**
 * FC TNT - Moments API Router
 * Quản lý bảng tin khoảnh khắc, hình ảnh hoạt động, cảm xúc và bình luận
 */

const express = require('express');
const Moment = require('../models/Moment');

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
  router.post('/', async (req, res) => {
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
  router.put('/:id', async (req, res) => {
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

  // POST /api/moments/:id/react
  router.post('/:id/react', async (req, res) => {
    try {
      const { id } = req.params;
      const { reactionType, userKey = 'anonymous' } = req.body;

      const validTypes = ['heart', 'football', 'beer', 'fire'];
      if (!validTypes.includes(reactionType)) {
        return res.status(400).json({ error: 'Loại cảm xúc không hợp lệ!' });
      }

      if (isMongoConnected()) {
        const moment = await Moment.findOne({ id });
        if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

        if (!moment.reactions) {
          moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
        }

        const existingIdx = (moment.reactions.userReactions || []).findIndex(
          ur => ur.userKey === userKey && ur.reactionType === reactionType
        );

        if (existingIdx !== -1) {
          moment.reactions.userReactions.splice(existingIdx, 1);
          moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
        } else {
          moment.reactions.userReactions.push({ userKey, reactionType });
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
        ur => ur.userKey === userKey && ur.reactionType === reactionType
      );

      if (existingIdx !== -1) {
        moment.reactions.userReactions.splice(existingIdx, 1);
        moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
      } else {
        moment.reactions.userReactions.push({ userKey, reactionType });
        moment.reactions[reactionType] = (moment.reactions[reactionType] || 0) + 1;
      }

      broadcastDataUpdate('moments', '', { momentId: id, reactions: moment.reactions });
      res.json({ success: true, reactions: moment.reactions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/moments/:id/comments
  router.post('/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      const { authorName, avatar = '', content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Nội dung bình luận không được để trống!' });
      }

      const newComment = {
        id: 'c_' + Date.now(),
        authorName: authorName && authorName.trim() ? authorName.trim() : 'Anh Em Phủi',
        avatar,
        content: content.trim(),
        createdAt: new Date()
      };

      if (isMongoConnected()) {
        const moment = await Moment.findOne({ id });
        if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

        moment.comments.push(newComment);
        await moment.save();
        broadcastDataUpdate('moments', `💬 ${newComment.authorName} vừa bình luận: "${newComment.content.substring(0, 30)}..."`, { momentId: id });
        return res.status(201).json({ success: true, comment: newComment, comments: moment.comments });
      }

      fallbackData.moments = fallbackData.moments || [];
      const moment = fallbackData.moments.find(m => m.id === id);
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      moment.comments = moment.comments || [];
      moment.comments.push(newComment);
      broadcastDataUpdate('moments', `💬 ${newComment.authorName} vừa bình luận: "${newComment.content.substring(0, 30)}..."`, { momentId: id });
      res.status(201).json({ success: true, comment: newComment, comments: moment.comments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/moments/:id/comments/:commentId
  router.delete('/:id/comments/:commentId', async (req, res) => {
    try {
      const { id, commentId } = req.params;

      if (isMongoConnected()) {
        const moment = await Moment.findOne({ id });
        if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

        moment.comments = moment.comments.filter(c => c.id !== commentId);
        await moment.save();
        broadcastDataUpdate('moments', '💬 Bình luận đã được xóa.', { momentId: id });
        return res.json({ success: true, comments: moment.comments });
      }

      fallbackData.moments = fallbackData.moments || [];
      const moment = fallbackData.moments.find(m => m.id === id);
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      moment.comments = (moment.comments || []).filter(c => c.id !== commentId);
      broadcastDataUpdate('moments', '💬 Bình luận đã được xóa.', { momentId: id });
      res.json({ success: true, comments: moment.comments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = {
  createMomentsRouter
};
