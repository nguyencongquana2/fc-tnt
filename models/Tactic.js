const mongoose = require('mongoose');

const tacticCommentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  playerId: {
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

const tacticPieceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  team: {
    type: String,
    enum: ['home', 'away', 'ball'],
    required: true
  },
  number: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  name: {
    type: String,
    default: '',
    trim: true
  },
  role: {
    type: String,
    default: ''
  },
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, { _id: false });

const tacticDrawingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['arrow', 'curve', 'pass', 'pass_arrow', 'zone', 'text', 'freehand'],
    default: 'arrow'
  },
  points: [{
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  }],
  color: {
    type: String,
    default: '#10b981'
  },
  width: {
    type: Number,
    default: 3
  },
  text: {
    type: String,
    default: ''
  }
}, { _id: false });

const tacticSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ['corner', 'throw_in', 'pressing_escape', 'freekick', 'defense', 'attack', 'custom'],
    default: 'custom'
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  author: {
    id: { type: String, default: '' },
    name: { type: String, default: 'Ban Huấn Luyện FC TNT' },
    role: { type: String, default: 'member' },
    avatar: { type: String, default: '' }
  },
  formationHome: {
    type: String,
    default: '3-1-2'
  },
  formationAway: {
    type: String,
    default: '3-2-1'
  },
  pieces: [tacticPieceSchema],
  drawings: [tacticDrawingSchema],
  comments: [tacticCommentSchema],
  likes: [{
    type: String
  }],
  isPreset: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tactic', tacticSchema);
