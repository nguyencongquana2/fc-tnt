const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'FC ANH EM PHỦI'
  },
  slogan: {
    type: String,
    default: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống'
  },
  logo: {
    type: String,
    default: '⚽'
  },
  adminPin: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
