const mongoose = require('mongoose');

const playerStatSubSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true
  },
  isStarter: {
    type: Boolean,
    default: true
  },
  pitchSlot: {
    type: String,
    default: null // 'GK', 'DF_L', 'DF_C', 'DF_R', 'MF_C', 'FW_L', 'FW_R'
  },
  rating: {
    type: Number,
    default: 7.0,
    min: 0,
    max: 10
  },
  goals: {
    type: Number,
    default: 0,
    min: 0
  },
  assists: {
    type: Number,
    default: 0,
    min: 0
  },
  yellowCards: {
    type: Number,
    default: 0,
    min: 0
  },
  redCards: {
    type: Number,
    default: 0,
    min: 0
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    default: '19:30'
  },
  opponent: {
    type: String,
    required: true,
    trim: true
  },
  venue: {
    type: String,
    default: 'Sân bóng'
  },
  type: {
    type: String,
    default: '7' // 7-a-side
  },
  formation: {
    type: String,
    default: '3-1-2'
  },
  homeScore: {
    type: Number,
    default: 0
  },
  awayScore: {
    type: Number,
    default: 0
  },
  result: {
    type: String,
    enum: ['WIN', 'DRAW', 'LOSS'],
    default: 'DRAW'
  },
  note: {
    type: String,
    default: ''
  },
  playerStats: [playerStatSubSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);
