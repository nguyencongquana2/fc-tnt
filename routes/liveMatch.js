/**
 * FC TNT - Live Match Real-time Sync Router
 * Quản lý bản nháp trận đấu Live và đồng bộ đa thiết bị qua Socket.IO
 */

const express = require('express');
const LiveMatchDraft = require('../models/LiveMatchDraft');

// Router cho Live Match (/api/live-match)
function createLiveMatchRouter({ isMongoConnected, io }) {
  const router = express.Router();
  let fallbackLiveMatchDraft = null;

  // GET /api/live-match/current
  router.get('/current', async (req, res) => {
    try {
      let draft = null;
      if (isMongoConnected()) {
        draft = await LiveMatchDraft.findOne({ id: 'current_live_match_draft' }).lean();
      } else {
        draft = fallbackLiveMatchDraft;
      }

      if (!draft || draft.status === 'idle' || draft.status === 'finished') {
        return res.json({ success: true, active: false, draft: null });
      }

      const updatedAt = new Date(draft.updatedAt || draft.savedAt || Date.now()).getTime();
      if (Date.now() - updatedAt > 12 * 3600 * 1000) {
        return res.json({ success: true, active: false, draft: null });
      }

      return res.json({
        success: true,
        active: true,
        draft
      });
    } catch (err) {
      console.error('Error in GET /api/live-match/current:', err);
      res.status(500).json({ success: false, error: err.message, draft: fallbackLiveMatchDraft });
    }
  });

  // POST /api/live-match/sync
  router.post('/sync', async (req, res) => {
    try {
      const payload = req.body || {};
      const draftData = {
        id: 'current_live_match_draft',
        status: 'active',
        opponent: payload.opponent || 'FC Đối Thủ',
        venue: payload.venue || 'Sân bóng',
        homeScore: Number(payload.homeScore) || 0,
        awayScore: Number(payload.awayScore) || 0,
        timerSeconds: Number(payload.timerSeconds) || 0,
        timerRunning: Boolean(payload.timerRunning),
        timerStartedAt: payload.timerStartedAt || null,
        period: Number(payload.period) || 1,
        events: Array.isArray(payload.events) ? payload.events : [],
        registeredPlayerIds: Array.isArray(payload.registeredPlayerIds) ? payload.registeredPlayerIds : [],
        matchId: payload.matchId || null,
        updatedAt: new Date()
      };

      fallbackLiveMatchDraft = draftData;

      if (isMongoConnected()) {
        await LiveMatchDraft.findOneAndUpdate(
          { id: 'current_live_match_draft' },
          draftData,
          { upsert: true, new: true }
        );
      }

      if (io) {
        io.emit('live_match_synced', draftData);
      }

      return res.json({ success: true, draft: draftData });
    } catch (err) {
      console.error('Error in POST /api/live-match/sync:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/live-match/clear
  router.post('/clear', async (req, res) => {
    try {
      fallbackLiveMatchDraft = null;
      if (isMongoConnected()) {
        await LiveMatchDraft.findOneAndUpdate(
          { id: 'current_live_match_draft' },
          { status: 'idle', events: [], homeScore: 0, awayScore: 0, timerSeconds: 0, updatedAt: new Date() }
        );
      }

      if (io) {
        io.emit('live_match_cleared');
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('Error in POST /api/live-match/clear:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = {
  createLiveMatchRouter
};
