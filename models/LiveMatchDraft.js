const mongoose = require('mongoose');

const liveMatchDraftSchema = new mongoose.Schema({
  id: {
    type: String,
    default: 'current_live_match_draft',
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'finished'],
    default: 'active'
  },
  opponent: {
    type: String,
    default: 'FC Đối Thủ'
  },
  venue: {
    type: String,
    default: 'Sân bóng'
  },
  homeScore: {
    type: Number,
    default: 0
  },
  awayScore: {
    type: Number,
    default: 0
  },
  timerSeconds: {
    type: Number,
    default: 0
  },
  timerRunning: {
    type: Boolean,
    default: false
  },
  timerStartedAt: {
    type: Number,
    default: null
  },
  period: {
    type: Number,
    default: 1
  },
  events: {
    type: Array,
    default: []
  },
  matchId: {
    type: String,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.models.LiveMatchDraft || mongoose.model('LiveMatchDraft', liveMatchDraftSchema);
