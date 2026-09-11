/**
 * FC TNT - Backend Server
 * Node.js + Express + MongoDB
 */

require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const Player = require('./models/Player');
const Match = require('./models/Match');
const Team = require('./models/Team');
const Moment = require('./models/Moment');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fc_ntn';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 15 Cầu thủ chính thức của đội bóng
const OFFICIAL_PLAYERS = [
  { id: 'p_1', name: 'Quân Kun', nickname: 'Quân Kun', number: 5, position: 'DF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Hậu vệ cánh trái' },
  { id: 'p_2', name: 'Vinh Lê', nickname: 'Vinh Lê', number: 6, position: 'MF', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tiền vệ trung tâm điều tiết' },
  { id: 'p_3', name: 'ToDiu', nickname: 'ToDiu', number: 24, position: 'GK', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Thủ môn bắt chính' },
  { id: 'p_4', name: 'Tài Thọ', nickname: 'Tài Thọ', number: 7, position: 'FW', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tiền đạo cánh phải bứt tốc' },
  { id: 'p_5', name: 'ct', nickname: 'ct', number: 11, position: 'MF', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Kỹ thuật lắt léo' },
  { id: 'p_6', name: 'Côn 35K1', nickname: 'Côn 35K1', number: 69, position: 'DF', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Trung vệ thòng không chiến' },
  { id: 'p_7', name: 'Trường Giang', nickname: 'Trường Giang', number: 8, position: 'MF', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tiền vệ năng động' },
  { id: 'p_8', name: 'BusCek.exe', nickname: 'BusCek.exe', number: 31, position: 'DF', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Hậu vệ bọc lót' },
  { id: 'p_9', name: 'Tiếnn', nickname: 'Tiếnn', number: 22, position: 'MF', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tiền vệ cánh tốc độ' },
  { id: 'p_10', name: 'Đức Bắc', nickname: 'Đức Bắc', number: 4, position: 'DF', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Hậu vệ cánh phải dập khỏe' },
  { id: 'p_11', name: 'Đình Chiến', nickname: 'Đình Chiến', number: 19, position: 'MF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tạt bóng chuẩn xác' },
  { id: 'p_12', name: 'Hùng Sứt', nickname: 'Hùng Sứt', number: 10, position: 'FW', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tiền đạo cánh trái sát thủ' },
  { id: 'p_13', name: 'Đình Anh', nickname: 'Đình Anh', number: 67, position: 'DF', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Hậu vệ tranh chấp tốt' },
  { id: 'p_14', name: 'Thành Nam', nickname: 'Thành Nam', number: 88, position: 'FW', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Tiền đạo đánh đầu' },
  { id: 'p_15', name: 'Sỹ Nam', nickname: 'Sỹ Nam', number: 12, position: 'GK', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '', note: 'Thủ môn phản xạ' }
];

const INITIAL_MOMENTS = [
  {
    id: 'moment_1',
    title: 'Liên hoan tất niên & Chúc mừng chuỗi trận bất bại',
    date: '2026-09-08',
    location: 'Nhà hàng Lẩu Nướng 79 - Cầu Giấy, Hà Nội',
    category: 'party',
    description: 'Bữa tiệc liên hoan ấm cúng cùng toàn thể anh em FC TNT sau chuỗi trận thi đấu cống hiến hết mình. Thắng cùng mừng, thua cùng uống, tinh thần anh em là số 1!',
    images: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80'
    ],
    videoUrl: '',
    taggedPlayerIds: ['p_1', 'p_2', 'p_3', 'p_4', 'p_6'],
    reactions: {
      heart: 8,
      football: 5,
      beer: 15,
      fire: 10,
      userReactions: []
    },
    comments: [
      {
        id: 'c_1',
        authorName: 'Quân Kun',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        content: 'Hôm đấy vui quá anh em ơi, bia vào chân đá lại càng dẻo! 🍻🔥',
        createdAt: new Date('2026-09-08T22:30:00')
      },
      {
        id: 'c_2',
        authorName: 'Tài Thọ',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        content: 'Trận sau cứ thắng 3 bàn trở lên lại làm bữa nữa nhé đội trưởng! ⚽💪',
        createdAt: new Date('2026-09-08T23:15:00')
      }
    ]
  },
  {
    id: 'moment_2',
    title: 'Ra mắt mẫu áo đấu sân nhà mùa giải mới',
    date: '2026-09-01',
    location: 'Sân bóng PVV - Trần Thái Tông',
    category: 'jersey',
    description: 'Chính thức trình làng bộ trang phục thi đấu mới cực chiến của FC TNT. Chúc toàn đội luôn giữ vững phong độ và tinh thần đoàn kết!',
    images: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80'
    ],
    videoUrl: '',
    taggedPlayerIds: ['p_1', 'p_2', 'p_4', 'p_5', 'p_7', 'p_12'],
    reactions: {
      heart: 12,
      football: 18,
      beer: 6,
      fire: 20,
      userReactions: []
    },
    comments: [
      {
        id: 'c_3',
        authorName: 'Vinh Lê',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        content: 'Áo mặc vào tôn dáng cực kỳ, chất vải thoáng mát đá bao sướng! 👕⭐',
        createdAt: new Date('2026-09-01T18:00:00')
      }
    ]
  }
];

let isMongoConnected = false;

// Fallback in-memory storage if MongoDB is connecting or unavailable
let fallbackData = {
  teamInfo: {
    name: 'FC TNT',
    slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống',
    badge: '⚽',
    formation: '3-1-2'
  },
  players: [...OFFICIAL_PLAYERS],
  matches: [],
  moments: [...INITIAL_MOMENTS]
};

// Seed initial database
async function seedInitialData() {
  try {
    const playerCount = await Player.countDocuments();
    if (playerCount === 0) {
      console.log('🌱 Seeding 15 official players to MongoDB...');
      await Player.insertMany(OFFICIAL_PLAYERS);
      console.log('✅ Seeded 15 players successfully!');
    }

    const teamCount = await Team.countDocuments();
    if (teamCount === 0) {
      await Team.create({
        name: 'FC TNT',
        slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống',
        logo: '⚽'
      });
      console.log('✅ Seeded default team info successfully!');
    }

    const momentCount = await Moment.countDocuments();
    if (momentCount === 0) {
      console.log('🌱 Seeding initial moments to MongoDB...');
      await Moment.insertMany(INITIAL_MOMENTS);
      console.log('✅ Seeded initial moments successfully!');
    }
  } catch (err) {
    console.error('Error during database seeding:', err);
  }
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
}).then(async () => {
  isMongoConnected = true;
  console.log('🌿 Connected to MongoDB Database successfully!');
  await seedInitialData();
}).catch((err) => {
  console.warn('⚠️ MongoDB connection warning (Using in-memory/JSON fallback):', err.message);
  isMongoConnected = false;
});

// Hàm lấy mã PIN Quản trị viên hiện tại (ưu tiên biến môi trường ADMIN_PIN trên Render / .env)
async function getValidAdminPins() {
  const pins = new Set();

  // 1. Mã từ biến môi trường Render / .env (Ưu tiên tuyệt đối)
  if (process.env.ADMIN_PIN && String(process.env.ADMIN_PIN).trim()) {
    pins.add(String(process.env.ADMIN_PIN).trim());
    return Array.from(pins);
  }

  // 2. Mã từ MongoDB Database (nếu có và khác 123456)
  if (isMongoConnected) {
    try {
      const team = await Team.findOne();
      if (team && team.adminPin && team.adminPin !== '123456') {
        pins.add(String(team.adminPin).trim());
      }
    } catch (e) { }
  }

  return Array.from(pins);
}

const ADMIN_STATIC_TOKEN = 'fc_tnt_admin_authenticated';

// Middleware xác thực quyền Admin cho các thao tác thêm / sửa / xóa dữ liệu
const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token && (token === ADMIN_STATIC_TOKEN || token.startsWith('fc_tnt_admin_'))) {
    return next();
  }
  return res.status(401).json({
    error: 'Yêu cầu quyền Quản trị viên! Vui lòng đăng nhập mã PIN để thực hiện thao tác này.',
    requireAuth: true
  });
};

// =========================================================================
// REST API ROUTES
// =========================================================================

// Health / Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: isMongoConnected ? 'MongoDB Connected' : 'Local Fallback Mode',
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập mã PIN!' });
  }

  const inputPin = String(pin).trim();
  const validPins = await getValidAdminPins();

  if (validPins.includes(inputPin)) {
    return res.json({
      success: true,
      token: 'fc_tnt_admin_' + Buffer.from(inputPin).toString('base64'),
      message: 'Đăng nhập Quản trị viên thành công!'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Mã PIN không chính xác! Vui lòng kiểm tra lại.'
  });
});

// Đổi mã PIN Quản trị viên (Chỉ Admin mới đổi được)
app.post('/api/auth/change-pin', requireAdmin, async (req, res) => {
  try {
    const { newPin } = req.body;
    if (!newPin || String(newPin).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Mã PIN mới phải có ít nhất 4 ký tự!' });
    }

    const cleanPin = String(newPin).trim();
    if (isMongoConnected) {
      let team = await Team.findOne();
      if (!team) {
        team = await Team.create({ adminPin: cleanPin });
      } else {
        team.adminPin = cleanPin;
        await team.save();
      }
    }

    process.env.ADMIN_PIN = cleanPin;

    return res.json({
      success: true,
      message: `Đã đổi mã PIN Quản trị thành công sang: ${cleanPin}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers['x-admin-token'];
  const isValid = token && (token === ADMIN_STATIC_TOKEN || token.startsWith('fc_tnt_admin_'));
  res.json({ isAdmin: isValid });
});

// GET /api/data (Lấy toàn bộ dữ liệu đồng bộ)
app.get('/api/data', async (req, res) => {
  try {
    if (isMongoConnected) {
      let team = await Team.findOne();
      if (!team) {
        team = { name: 'FC TNT', slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống', logo: '⚽' };
      }
      const players = await Player.find().sort({ number: 1 });
      const matches = await Match.find().sort({ createdAt: -1 });
      const moments = await Moment.find().sort({ date: -1, createdAt: -1 });

      return res.json({
        teamInfo: {
          name: team.name,
          slogan: team.slogan,
          badge: team.logo || '⚽',
          formation: '3-1-2'
        },
        players,
        matches,
        moments
      });
    }

    res.json(fallbackData);
  } catch (err) {
    console.error(err);
    res.json(fallbackData);
  }
});

// ================= PLAYERS API =================
app.get('/api/players', async (req, res) => {
  try {
    if (isMongoConnected) {
      const players = await Player.find().sort({ number: 1 });
      return res.json(players);
    }
    res.json(fallbackData.players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/players', requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = 'p_' + Date.now();

    if (isMongoConnected) {
      const created = await Player.create(data);
      return res.status(201).json(created);
    }

    fallbackData.players.push(data);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật ảnh đại diện avatar (Mở cho tất cả thành viên tự cập nhật từ điện thoại/máy tính)
app.put('/api/players/:id/avatar', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: 'Thiếu dữ liệu ảnh đại diện' });
    }

    if (isMongoConnected) {
      const updated = await Player.findOneAndUpdate({ id }, { avatar }, { new: true });
      return res.json(updated);
    }

    const idx = fallbackData.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      fallbackData.players[idx].avatar = avatar;
      return res.json(fallbackData.players[idx]);
    }
    res.status(404).json({ error: 'Player not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/players/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (isMongoConnected) {
      const updated = await Player.findOneAndUpdate({ id }, updates, { new: true });
      return res.json(updated);
    }

    const idx = fallbackData.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      fallbackData.players[idx] = { ...fallbackData.players[idx], ...updates };
      return res.json(fallbackData.players[idx]);
    }
    res.status(404).json({ error: 'Player not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/players/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      await Player.findOneAndDelete({ id });
      return res.json({ success: true, message: 'Player deleted' });
    }

    fallbackData.players = fallbackData.players.filter(p => p.id !== id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MATCHES API =================
app.get('/api/matches', async (req, res) => {
  try {
    if (isMongoConnected) {
      const matches = await Match.find().sort({ createdAt: -1 });
      return res.json(matches);
    }
    res.json(fallbackData.matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches', requireAdmin, async (req, res) => {
  try {
    const matchData = req.body;
    if (!matchData.id) matchData.id = 'm_' + Date.now();

    if (isMongoConnected) {
      const created = await Match.create(matchData);
      return res.status(201).json(created);
    }

    fallbackData.matches.unshift(matchData);
    res.status(201).json(matchData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/matches/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (isMongoConnected) {
      const updated = await Match.findOneAndUpdate({ id }, updates, { new: true });
      return res.json(updated);
    }

    const idx = fallbackData.matches.findIndex(m => m.id === id);
    if (idx !== -1) {
      fallbackData.matches[idx] = { ...fallbackData.matches[idx], ...updates };
      return res.json(fallbackData.matches[idx]);
    }
    res.status(404).json({ error: 'Match not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/matches/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      await Match.findOneAndDelete({ id });
      return res.json({ success: true, message: 'Match deleted' });
    }

    fallbackData.matches = fallbackData.matches.filter(m => m.id !== id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa tất cả các trận đấu
app.delete('/api/matches', requireAdmin, async (req, res) => {
  try {
    if (isMongoConnected) {
      await Match.deleteMany({});
      return res.json({ success: true, message: 'All matches deleted' });
    }

    fallbackData.matches = [];
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= TEAM & BACKUP API =================
app.put('/api/team', requireAdmin, async (req, res) => {
  try {
    const { name, slogan, logo } = req.body;

    if (isMongoConnected) {
      let team = await Team.findOne();
      if (!team) {
        team = await Team.create({ name, slogan, logo });
      } else {
        if (name) team.name = name;
        if (slogan !== undefined) team.slogan = slogan;
        if (logo) team.logo = logo;
        await team.save();
      }
      return res.json(team);
    }

    if (name) fallbackData.teamInfo.name = name;
    if (slogan !== undefined) fallbackData.teamInfo.slogan = slogan;
    res.json(fallbackData.teamInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MOMENTS (KHOẢNH KHẮC) API =================
app.get('/api/moments', async (req, res) => {
  try {
    if (isMongoConnected) {
      const moments = await Moment.find().sort({ date: -1, createdAt: -1 });
      return res.json(moments);
    }
    const sorted = [...(fallbackData.moments || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/moments', async (req, res) => {
  try {
    const momentData = req.body;
    if (!momentData.id) {
      momentData.id = 'moment_' + Date.now();
    }
    if (!momentData.reactions) {
      momentData.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
    }
    if (!momentData.comments) {
      momentData.comments = [];
    }

    if (isMongoConnected) {
      const newMoment = await Moment.create(momentData);
      return res.status(201).json(newMoment);
    }

    fallbackData.moments = fallbackData.moments || [];
    fallbackData.moments.unshift(momentData);
    res.status(201).json(momentData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/moments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (isMongoConnected) {
      const updated = await Moment.findOneAndUpdate({ id }, updateData, { new: true });
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });
      return res.json(updated);
    }

    fallbackData.moments = fallbackData.moments || [];
    const idx = fallbackData.moments.findIndex(m => m.id === id);
    if (idx !== -1) {
      fallbackData.moments[idx] = { ...fallbackData.moments[idx], ...updateData };
      return res.json(fallbackData.moments[idx]);
    }
    res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/moments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      const deleted = await Moment.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc để xóa' });
      return res.json({ success: true, id });
    }

    fallbackData.moments = fallbackData.moments || [];
    fallbackData.moments = fallbackData.moments.filter(m => m.id !== id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thả / Bỏ cảm xúc (Reactions: heart, football, beer, fire)
app.post('/api/moments/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType, userKey = 'anonymous' } = req.body; // 'heart' | 'football' | 'beer' | 'fire'

    const validTypes = ['heart', 'football', 'beer', 'fire'];
    if (!validTypes.includes(reactionType)) {
      return res.status(400).json({ error: 'Loại cảm xúc không hợp lệ!' });
    }

    if (isMongoConnected) {
      const moment = await Moment.findOne({ id });
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      if (!moment.reactions) {
        moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
      }

      // Check if user already reacted with this type
      const existingIdx = (moment.reactions.userReactions || []).findIndex(
        ur => ur.userKey === userKey && ur.reactionType === reactionType
      );

      if (existingIdx !== -1) {
        // Toggle OFF
        moment.reactions.userReactions.splice(existingIdx, 1);
        moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
      } else {
        // Toggle ON
        moment.reactions.userReactions.push({ userKey, reactionType });
        moment.reactions[reactionType] = (moment.reactions[reactionType] || 0) + 1;
      }

      await moment.save();
      return res.json({ success: true, reactions: moment.reactions });
    }

    fallbackData.moments = fallbackData.moments || [];
    const moment = fallbackData.moments.find(m => m.id === id);
    if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

    if (!moment.reactions) {
      moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
    }
    const existingIdx = (moment.reactions.userReactions || []).findIndex(
      ur => ur.userKey === userKey && ur.reactionType === reactionType
    );

    if (existingIdx !== -1) {
      moment.reactions.userReactions.splice(existingIdx, 1);
      moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
    } else {
      moment.reactions.userReactions.push({ userKey, reactionType });
      moment.reactions[reactionType] = (moment.reactions[reactionType] || 0) + 1;
    }

    res.json({ success: true, reactions: moment.reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm bình luận (Chém gió)
app.post('/api/moments/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorName, avatar = '', content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nội dung bình luận không được để trống!' });
    }

    const newComment = {
      id: 'c_' + Date.now(),
      authorName: authorName && authorName.trim() ? authorName.trim() : 'Anh Em Phủi',
      avatar,
      content: content.trim(),
      createdAt: new Date()
    };

    if (isMongoConnected) {
      const moment = await Moment.findOne({ id });
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      moment.comments.push(newComment);
      await moment.save();
      return res.status(201).json({ success: true, comment: newComment, comments: moment.comments });
    }

    fallbackData.moments = fallbackData.moments || [];
    const moment = fallbackData.moments.find(m => m.id === id);
    if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

    moment.comments = moment.comments || [];
    moment.comments.push(newComment);
    res.status(201).json({ success: true, comment: newComment, comments: moment.comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa bình luận
app.delete('/api/moments/:id/comments/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params;

    if (isMongoConnected) {
      const moment = await Moment.findOne({ id });
      if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

      moment.comments = moment.comments.filter(c => c.id !== commentId);
      await moment.save();
      return res.json({ success: true, comments: moment.comments });
    }

    fallbackData.moments = fallbackData.moments || [];
    const moment = fallbackData.moments.find(m => m.id === id);
    if (!moment) return res.status(404).json({ error: 'Không tìm thấy khoảnh khắc' });

    moment.comments = (moment.comments || []).filter(c => c.id !== commentId);
    res.json({ success: true, comments: moment.comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Khôi phục toàn bộ từ file Backup JSON
app.post('/api/backup/restore', requireAdmin, async (req, res) => {
  try {
    const { teamInfo, players, matches, moments } = req.body;

    if (isMongoConnected) {
      if (players && Array.isArray(players) && players.length > 0) {
        await Player.deleteMany({});
        await Player.insertMany(players);
      }

      if (matches && Array.isArray(matches)) {
        await Match.deleteMany({});
        if (matches.length > 0) {
          await Match.insertMany(matches);
        }
      }

      if (moments && Array.isArray(moments)) {
        await Moment.deleteMany({});
        if (moments.length > 0) {
          await Moment.insertMany(moments);
        }
      }

      if (teamInfo) {
        let team = await Team.findOne();
        if (team) {
          team.name = teamInfo.name || team.name;
          team.slogan = teamInfo.slogan || team.slogan;
          await team.save();
        } else {
          await Team.create(teamInfo);
        }
      }

      return res.json({ success: true, message: 'Database restored successfully' });
    }

    if (teamInfo) fallbackData.teamInfo = teamInfo;
    if (players) fallbackData.players = players;
    if (matches) fallbackData.matches = matches;
    if (moments) fallbackData.moments = moments;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phục vụ frontend tĩnh
app.use(express.static(path.join(__dirname, '')));

// Route fallback cho Single Page App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 FC TNT Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🌿 Database: ${MONGODB_URI}`);
  console.log(`=================================================`);
});
