const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  nickname: {
    type: String,
    default: '',
    trim: true
  },
  number: {
    type: Number,
    required: true
  },
  position: {
    type: String,
    enum: ['GK', 'DF', 'MF', 'FW'],
    default: 'FW'
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  bankCode: {
    type: String,
    default: ''
  },
  bankAccountNumber: {
    type: String,
    default: ''
  },
  bankAccountName: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  // --- HỆ THỐNG TÀI KHOẢN THÀNH VIÊN (MEMBER AUTH & PROFILE) ---
  username: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    default: ''
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['player', 'admin', 'treasurer'],
    default: 'player'
  },
  fundBalance: {
    type: Number,
    default: 0
  },
  accountStatus: {
    type: String,
    enum: ['unprovisioned', 'active', 'locked'],
    default: 'unprovisioned'
  },
  preferredFoot: {
    type: String,
    enum: ['L', 'R', 'both'],
    default: 'R'
  },
  height: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  bio: {
    type: String,
    default: '',
    trim: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);
