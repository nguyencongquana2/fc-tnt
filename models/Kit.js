const mongoose = require('mongoose');

const kitSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    default: 'Áo Sân Nhà'
  },
  type: {
    type: String,
    enum: ['home', 'away', 'third', 'gk'],
    default: 'home'
  },
  season: {
    type: String,
    default: '2025 - 2026'
  },
  primaryColor: {
    type: String,
    default: '#dc2626' // Red
  },
  secondaryColor: {
    type: String,
    default: '#ffffff' // White
  },
  textColor: {
    type: String,
    default: '#ffffff'
  },
  numberColor: {
    type: String,
    default: '#fbbf24' // Gold
  },
  frontImage: {
    type: String,
    default: ''
  },
  backImage: {
    type: String,
    default: ''
  },
  sponsor: {
    type: String,
    default: 'FC NTN'
  },
  description: {
    type: String,
    default: 'Bộ trang phục thi đấu chính thức mùa giải 2025/2026'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Kit', kitSchema);
