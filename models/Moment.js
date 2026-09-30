const mongoose = require('mongoose');

const commentSubSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  authorId: {
    type: String,
    default: ''
  },
  authorName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const momentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    enum: ['match', 'party', 'trip', 'jersey', 'birthday', 'other'],
    default: 'party'
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  images: [{
    type: String
  }],
  videoUrl: {
    type: String,
    default: '',
    trim: true
  },
  taggedPlayerIds: [{
    type: String
  }],
  reactions: {
    heart: { type: Number, default: 0 },
    football: { type: Number, default: 0 },
    beer: { type: Number, default: 0 },
    fire: { type: Number, default: 0 },
    userReactions: [{
      userKey: String,
      reactionType: String
    }]
  },
  comments: [commentSubSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Moment', momentSchema);
