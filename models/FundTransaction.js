const mongoose = require('mongoose');

const fundTransactionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  playerId: {
    type: String,
    required: true,
    index: true
  },
  playerName: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true // Dương (+) là nạp/hoàn quỹ, Âm (-) là trừ tiền sân
  },
  balanceBefore: {
    type: Number,
    default: 0
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['TOPUP', 'MATCH_DEDUCT', 'ADJUSTMENT', 'REFUND'],
    required: true,
    index: true
  },
  matchId: {
    type: String,
    default: '',
    index: true
  },
  matchOpponent: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: String,
    default: 'Thủ quỹ'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FundTransaction', fundTransactionSchema);
