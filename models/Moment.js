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

const mediaItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail: {
    type: String,
    default: '',
    trim: true
  },
  duration: {
    type: String,
    default: '',
    trim: true
  },
  width: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  }
}, { _id: false });

const momentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  authorId: {
    type: String,
    default: '',
    trim: true
  },
  authorName: {
    type: String,
    default: '',
    trim: true
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
  // Unified Mixed Media Items (Photos + Videos)
  media: [mediaItemSchema],
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
