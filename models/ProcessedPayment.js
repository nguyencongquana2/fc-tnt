const mongoose = require('mongoose');

const processedPaymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60 // TTL Index: Tự động xóa sau 30 ngày để tối ưu dung lượng DB
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProcessedPayment', processedPaymentSchema);
