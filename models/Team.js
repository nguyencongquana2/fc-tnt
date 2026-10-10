const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'FC TNT'
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
  },
  treasurerPin: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
