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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);
