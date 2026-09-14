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
  { id: 'p_1', name: 'Quân Kun', nickname: 'Quân Kun', number: 5, position: 'DF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '0987654321', bankCode: 'VCB', bankAccountNumber: '9392139587', bankAccountName: 'NGUYEN CONG QUAN', note: 'Hậu vệ cánh trái' },
  { id: 'p_2', name: 'Vinh Lê', nickname: 'Vinh Lê', number: 6, position: 'MF', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '0912345678', bankCode: 'VCB', bankAccountNumber: '1012345678', bankAccountName: 'LE QUANG VINH', note: 'Tiền vệ trung tâm điều tiết' },
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
    } else {
      // Cập nhật thông tin ngân hàng cho Quân Kun nếu chưa có
      await Player.findOneAndUpdate(
        { id: 'p_1' },
        { 
          $set: { 
            bankCode: 'VCB', 
            bankAccountNumber: '9392139587', 
            bankAccountName: 'NGUYEN CONG QUAN' 
          } 
        }
      );
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

// Cập nhật cấu hình thu tiền / chia tiền trận đấu
app.put('/api/matches/:id/finance', async (req, res) => {
  try {
    const { id } = req.params;
    const financeData = req.body;

    if (isMongoConnected) {
      const updated = await Match.findOneAndUpdate(
        { id },
        { $set: { finance: financeData } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Match not found' });
      return res.json(updated);
    }

    const idx = fallbackData.matches.findIndex(m => m.id === id);
    if (idx !== -1) {
      fallbackData.matches[idx].finance = financeData;
      return res.json(fallbackData.matches[idx]);
    }
    res.status(404).json({ error: 'Match not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle trạng thái nộp tiền của 1 cầu thủ trong trận
app.patch('/api/matches/:id/finance/toggle-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { playerId, isPaid } = req.body;

    if (isMongoConnected) {
      const match = await Match.findOne({ id });
      if (!match) return res.status(404).json({ error: 'Match not found' });
      
      if (!match.finance) match.finance = { payments: [] };
      if (!match.finance.payments) match.finance.payments = [];
      
      const pIdx = match.finance.payments.findIndex(p => p.playerId === playerId);
      if (pIdx !== -1) {
        match.finance.payments[pIdx].isPaid = isPaid;
        match.finance.payments[pIdx].paidAt = isPaid ? new Date() : null;
      }
      await match.save();
      return res.json(match);
    }

    const idx = fallbackData.matches.findIndex(m => m.id === id);
    if (idx !== -1) {
      if (!fallbackData.matches[idx].finance) fallbackData.matches[idx].finance = { payments: [] };
      const pIdx = fallbackData.matches[idx].finance.payments.findIndex(p => p.playerId === playerId);
      if (pIdx !== -1) {
        fallbackData.matches[idx].finance.payments[pIdx].isPaid = isPaid;
        fallbackData.matches[idx].finance.payments[pIdx].paidAt = isPaid ? new Date().toISOString() : null;
      }
      return res.json(fallbackData.matches[idx]);
    }
    res.status(404).json({ error: 'Match not found' });
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

// =========================================================================
// AI MATCH RATING & PERFORMANCE EVALUATION ENGINE (GEMINI + SMART NLP)
// Helper: Trích xuất các biến thể tên/biệt danh/số áo của toàn bộ 15+ cầu thủ FC TNT
function getPlayerAliases(p) {
  const aliases = new Set();
  const rawName = (p.name || '').toLowerCase().trim();
  const rawNick = (p.nickname || '').toLowerCase().trim();
  const numStr = String(p.number || '').trim();

  if (rawName) aliases.add(rawName);
  if (rawNick) aliases.add(rawNick);
  if (numStr) {
    aliases.add(`số ${numStr}`);
    aliases.add(`#${numStr}`);
  }

  const nameParts = rawName.split(/\s+/);
  if (nameParts.length > 1) {
    aliases.add(nameParts[nameParts.length - 1]); // Tên gọi riêng: hoàn, vinh, bắc, giang, nam, thọ, quân, dũng, anh, chiến, tiến
  }

  // Bảng ánh xạ biệt danh phủi đặc trưng của FC TNT
  if (rawName.includes('vinh') || rawNick.includes('vinh')) {
    aliases.add('duy vinh');
    aliases.add('vinh lê');
    aliases.add('vinh');
  }
  if (rawName.includes('todiu') || rawNick.includes('todiu') || rawName.includes('diu')) {
    aliases.add('tố địu');
    aliases.add('tô diệu');
    aliases.add('tố điệu');
    aliases.add('todiu');
    aliases.add('địu');
  }
  if (rawName.includes('côn') || rawNick.includes('côn') || rawName.includes('quang') || rawNick.includes('quang')) {
    aliases.add('quang');
    aliases.add('côn');
    aliases.add('côn 35k1');
    aliases.add('quang côn');
  }
  if (rawName.includes('bắc') || rawNick.includes('bắc')) {
    aliases.add('đức bắc');
    aliases.add('bắc');
  }
  if (rawName.includes('giang') || rawNick.includes('giang')) {
    aliases.add('trường giang');
    aliases.add('giang');
  }
  if (rawName.includes('dũng') || rawNick.includes('dũng')) {
    aliases.add('công dũng');
    aliases.add('dũng');
  }
  if (rawName.includes('hoàn') || rawNick.includes('hoàn')) {
    aliases.add('trí hoàn');
    aliases.add('hoàn');
  }
  if (rawName.includes('quân') || rawNick.includes('quân')) {
    aliases.add('quân kun');
    aliases.add('quân');
  }
  if (rawName.includes('thọ') || rawNick.includes('thọ')) {
    aliases.add('tài thọ');
    aliases.add('thọ');
  }
  if (rawName.includes('hùng') || rawNick.includes('hùng')) {
    aliases.add('hùng sứt');
    aliases.add('hùng');
  }
  if (rawName.includes('nam') || rawNick.includes('nam')) {
    if (rawName.includes('thành nam') || rawNick.includes('thành nam')) {
      aliases.add('thành nam');
      aliases.add('nam');
    }
    if (rawName.includes('sỹ nam') || rawNick.includes('sỹ nam')) {
      aliases.add('sỹ nam');
    }
  }
  if (rawName.includes('chiến') || rawNick.includes('chiến')) {
    aliases.add('đình chiến');
    aliases.add('chiến');
  }
  if (rawName.includes('anh') || rawNick.includes('anh')) {
    aliases.add('đình anh');
    aliases.add('anh');
  }
  if (rawName.includes('tiến') || rawNick.includes('tiến')) {
    aliases.add('tiếnn');
    aliases.add('tiến');
  }
  if (rawName.includes('buscek') || rawNick.includes('buscek')) {
    aliases.add('buscek.exe');
    aliases.add('buscek');
  }

  return Array.from(aliases).filter(a => a.length >= 2);
}

// BỘ GIẢI THUẬT PHÂN TÍCH & CHẤM ĐIỂM SÂN PHỦI CHUYÊN SÂU (FC TNT AI INTELLIGENCE)
function analyzeMatchWithNLP({ matchInfo, playerList, matchNarration }) {
  const rawText = (matchNarration || '').trim();
  const textLower = rawText.toLowerCase();
  const isWin = matchInfo?.result === 'WIN' || (Number(matchInfo?.homeScore) > Number(matchInfo?.awayScore));
  const isLoss = matchInfo?.result === 'LOSS' || (Number(matchInfo?.homeScore) < Number(matchInfo?.awayScore));

  const baseStarterRating = isWin ? 6.8 : isLoss ? 6.0 : 6.5;
  const baseSubRating = isWin ? 6.5 : isLoss ? 5.8 : 6.2;

  // Bước 1: Quét và lập bản đồ vị trí tên các cầu thủ trong bài mô tả
  const playerMentions = [];
  playerList.forEach(p => {
    const aliases = getPlayerAliases(p);
    aliases.forEach(alias => {
      let startIndex = 0;
      while ((startIndex = textLower.indexOf(alias, startIndex)) !== -1) {
        const prevChar = startIndex > 0 ? textLower[startIndex - 1] : ' ';
        const nextChar = startIndex + alias.length < textLower.length ? textLower[startIndex + alias.length] : ' ';
        const isWordBoundary = /[\s,.;!?:()\n\r\t]/.test(prevChar) && /[\s,.;!?:()\n\r\t]/.test(nextChar);

        if (isWordBoundary || startIndex === 0 || startIndex + alias.length === textLower.length) {
          playerMentions.push({
            playerId: p.id,
            playerName: p.name,
            alias,
            index: startIndex,
            endIndex: startIndex + alias.length
          });
        }
        startIndex += alias.length;
      }
    });
  });

  playerMentions.sort((a, b) => a.index - b.index);

  // Loại bỏ các mention trùng lặp
  const cleanMentions = [];
  playerMentions.forEach(m => {
    if (!cleanMentions.some(existing => 
      (m.index >= existing.index && m.index < existing.endIndex) ||
      (m.playerId === existing.playerId && Math.abs(m.index - existing.index) < 10)
    )) {
      cleanMentions.push(m);
    }
  });

  // Tách ngữ cảnh độc lập cho từng cầu thủ (xử lý chính xác dấu phẩy, câu ghép và từ nối)
  const playerContextMap = {};
  for (let i = 0; i < cleanMentions.length; i++) {
    const cur = cleanMentions[i];
    const nextMention = cleanMentions[i + 1];
    const chunkStart = cur.endIndex;
    const chunkEnd = nextMention ? nextMention.index : textLower.length;
    let chunk = textLower.substring(chunkStart, chunkEnd);

    // Cặp đồng chủ ngữ: "Quân Kun và Hùng Sứt [hành động chung]"
    const between = nextMention ? textLower.substring(cur.endIndex, nextMention.index).trim() : '';
    let inheritedChunk = '';
    if (nextMention && (between === 'và' || between === 'cùng' || between === 'với' || between === 'và cả' || between === ',')) {
      const nextNext = cleanMentions[i + 2];
      const afterNextEnd = nextNext ? nextNext.index : textLower.length;
      inheritedChunk = textLower.substring(nextMention.endIndex, afterNextEnd);
    }

    if (!playerContextMap[cur.playerId]) {
      playerContextMap[cur.playerId] = [];
    }
    playerContextMap[cur.playerId].push(chunk);
    if (inheritedChunk) {
      playerContextMap[cur.playerId].push(inheritedChunk);
    }
  }

  let highestScore = -1;
  let motmId = null;

  const ratings = playerList.map(p => {
    const isStarter = p.isStarter !== false;
    let score = isStarter ? baseStarterRating : baseSubRating;
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    const noteItems = [];
    let roleTag = '';

    const contextChunks = playerContextMap[p.id];
    const isMentioned = !!contextChunks && contextChunks.length > 0;
    const playerCtx = isMentioned ? contextChunks.join(' ') : '';

    if (isMentioned) {
      // 1. Phân tích Bàn thắng (Chỉ người có tên trong cụm từ mới được tính)
      if (playerCtx.includes('poker') || playerCtx.includes('4 bàn')) {
        goals = 4;
        score += 2.5;
        noteItems.push('⚽ Lập Poker 4 bàn thắng lịch sử');
        roleTag = '🔥 Poker Thần Sầu';
      } else if (playerCtx.includes('hattrick') || playerCtx.includes('3 bàn')) {
        goals = 3;
        score += 2.0;
        noteItems.push('⚽ Lập hat-trick bùng nổ');
        roleTag = '🎩 Hat-trick Anh Hùng';
      } else if (playerCtx.includes('cú đúp') || playerCtx.includes('2 bàn')) {
        goals = 2;
        score += 1.6;
        noteItems.push('⚽ Lập cú đúp bàn thắng');
        roleTag = '⚽ Cú Đúp Đẳng Cấp';
      } else if (playerCtx.includes('ghi được 1 bàn') || playerCtx.includes('ghi 1 bàn') || (playerCtx.includes('chớp cơ hội') && playerCtx.includes('ghi 1 bàn')) || playerCtx.includes('sút tung lưới') || playerCtx.includes('lập công') || playerCtx.includes('ghi bàn') || playerCtx.includes('nã đại bác') || playerCtx.includes('mở tỉ số') || playerCtx.includes('ấn định')) {
        goals = 1;
        score += 1.2;
        noteItems.push('⚽ Ghi 1 bàn thắng quan trọng');
        roleTag = '⚽ Ghi Bàn Quý Giá';
      }

      // 2. Phân tích Kiến tạo
      if (playerCtx.includes('2 kiến tạo') || playerCtx.includes('cú đúp kiến tạo')) {
        assists = 2;
        score += 1.4;
        noteItems.push('👟 2 kiến tạo dọn cỗ sắc bén');
        if (!roleTag) roleTag = '👟 Vua Kiến Tạo';
      } else if (playerCtx.includes('1 kiến tạo') || playerCtx.includes('kiến tạo') || playerCtx.includes('dọn cỗ') || playerCtx.includes('chọc khe') || playerCtx.includes('tạt bóng chuẩn')) {
        assists = 1;
        score += 0.8;
        noteItems.push('👟 1 kiến tạo chuẩn xác');
        if (!roleTag) roleTag = '👟 Kiến Tạo Chuẩn Xác';
      }

      // 3. Phân tích Màn trình diễn Đỉnh cao & Tích cực
      if (playerCtx.includes('cực kì tốt') || playerCtx.includes('cực kỳ tốt') || playerCtx.includes('xuất sắc') || playerCtx.includes('gánh đội') || playerCtx.includes('gánh còng lưng') || playerCtx.includes('cháy hết mình')) {
        score += 1.5;
        noteItems.push('⭐ Thi đấu cực kì xuất sắc');
        if (!roleTag) roleTag = '⭐ Điểm Sáng Trận Đấu';
      }
      if (playerCtx.includes('đá thòng cực kì tốt') || playerCtx.includes('đá thòng cực hay') || playerCtx.includes('bọc lót đỉnh cao') || playerCtx.includes('không chiến dũng mãnh') || playerCtx.includes('khóa chặt')) {
        score += 1.2;
        noteItems.push('🛡️ Đá thòng bọc lót đỉnh cao');
        if (!roleTag) roleTag = '🛡️ Lá Chắn Thép';
      }
      if (playerCtx.includes('cản phá nhiều cơ hội') || playerCtx.includes('cứu thua') || playerCtx.includes('bắt chắc tay') || playerCtx.includes('bắt dính') || playerCtx.includes('xuất thần')) {
        score += 0.9;
        noteItems.push('🧤 Cản phá nhiều cơ hội nguy hiểm');
        if (!roleTag) roleTag = '🧤 Người Nhện Khung Thành';
      }
      if (playerCtx.includes('tạo ra nhiều đường tấn công') || playerCtx.includes('phát động tấn công') || playerCtx.includes('cầm nhịp') || playerCtx.includes('chia bài') || playerCtx.includes('làm chủ tuyến giữa')) {
        score += 0.8;
        noteItems.push('Tạo nhiều đường phát động tấn công sắc nét');
        if (!roleTag) roleTag = '🎯 Nhạc Trưởng Tuyến Giữa';
      }
      if (playerCtx.includes('đúng chiến thuật') || playerCtx.includes('chớp cơ hội') || playerCtx.includes('chớp thời cơ')) {
        score += 0.5;
        noteItems.push('Đá đúng chiến thuật, chớp thời cơ tốt');
      }
      if (playerCtx.includes('sau dần đá tốt') || playerCtx.includes('càng đá càng tốt') || playerCtx.includes('bắt nhịp tốt')) {
        score += 0.4;
        noteItems.push('Về sau dần bắt nhịp và đá tốt');
      }

      // 4. Mức độ Tròn vai & Ổn định
      if (playerCtx.includes('tròn vai')) {
        score = Math.max(score, 6.4);
        if (goals === 0) noteItems.push('Thi đấu tròn vai');
        if (!roleTag) roleTag = '⚖️ Tròn Vai';
      }
      if (playerCtx.includes('đá ổn') || playerCtx.includes('không quá đột biến') || playerCtx.includes('tạm ổn')) {
        score = 6.4;
        noteItems.push('Đá ổn định, chưa có nhiều đột biến');
        if (!roleTag) roleTag = '⚖️ Ổn Định';
      }

      // 5. ĐIỂM TRỪ NGHIÊM KHẮC (KHÔNG NỊNH - CHUẨN XÁC)
      if (playerCtx.includes('triển khai bóng bằng chân yếu') || playerCtx.includes('ảnh hưởng lối chơi') || playerCtx.includes('chân yếu') || playerCtx.includes('bắt bóng lập bập') || playerCtx.includes('ói bóng')) {
        score -= 1.1;
        noteItems.push('⚠️ Triển khai bóng bằng chân yếu, ảnh hưởng lối chơi');
        roleTag = '⚠️ Xử Lý Chân Kém';
      }
      if (playerCtx.includes('đá dưới cơ') || playerCtx.includes('dưới sức') || playerCtx.includes('đuối sức') || playerCtx.includes('hết pin')) {
        score -= 0.8;
        noteItems.push('⚠️ Thi đấu dưới sức');
        if (!roleTag) roleTag = '⚠️ Dưới Sức';
      }
      if (playerCtx.includes('mắc sai lầm') || playerCtx.includes('mắc một vài sai lầm') || playerCtx.includes('lỗi khá nhiều') || playerCtx.includes('lỗi nhiều') || playerCtx.includes('lúc đầu lỗi') || playerCtx.includes('bóp team') || playerCtx.includes('bóp dái')) {
        score -= 0.8;
        noteItems.push('⚠️ Mắc sai lầm xử lý bóng');
        if (!roleTag) roleTag = '⚠️ Mắc Sai Lầm';
      }
      if (playerCtx.includes('bị kèm chặt') || playerCtx.includes('không có nhiều không gian') || playerCtx.includes('mắc võng')) {
        score -= 0.5;
        noteItems.push('⚠️ Bị đối phương kèm chặt, thiếu không gian');
        if (!roleTag) roleTag = '⚠️ Thiếu Không Gian';
      }
      if (playerCtx.includes('thiếu sức sống') || playerCtx.includes('không có cảm giác bóng') || playerCtx.includes('chân gỗ') || playerCtx.includes('bỏ lỡ mười mươi')) {
        score -= 1.1;
        noteItems.push('⚠️ Thiếu sức sống, không có cảm giác bóng');
        roleTag = '⚠️ Mất Cảm Giác Bóng';
      }

      // Thẻ phạt
      if (playerCtx.includes('thẻ đỏ')) {
        redCards = 1;
        score -= 2.0;
        noteItems.push('🟥 Nhận thẻ đỏ');
        roleTag = '🟥 Thẻ Đỏ Truất Quyền';
      } else if (playerCtx.includes('thẻ vàng')) {
        yellowCards = 1;
        score -= 0.4;
        noteItems.push('🟨 Nhận thẻ vàng');
      }
    } else {
      if (isStarter) {
        score = baseStarterRating;
        noteItems.push('Hoàn thành nhiệm vụ trên sân');
        roleTag = 'Hoàn thành nhiệm vụ';
      } else {
        score = baseSubRating;
        noteItems.push('Dự bị trận đấu');
        roleTag = 'Dự bị';
      }
    }

    // Giới hạn điểm: từ 4.0 đến 9.9
    score = Math.max(4.0, Math.min(9.9, Math.round(score * 10) / 10));

    let finalNote = noteItems.join(' • ');

    if (score > highestScore) {
      highestScore = score;
      motmId = p.id;
    }

    return {
      playerId: p.id,
      name: p.name,
      rating: score,
      goals,
      assists,
      yellowCards,
      redCards,
      tag: roleTag,
      note: finalNote
    };
  });

  const homeScore = matchInfo?.homeScore ?? 0;
  const awayScore = matchInfo?.awayScore ?? 0;
  const opponent = matchInfo?.opponent || 'Đối thủ';
  const matchHeadline = isWin 
    ? `🔥 Chiến Thắng Thuyết Phục ${homeScore} - ${awayScore} Trước ${opponent}!` 
    : isLoss 
    ? `⚡ Trận Cầu Đầy Nỗ Lực Nhưng Chưa May Mắn (${homeScore} - ${awayScore} vs ${opponent})`
    : `🤝 Màn Rượt Đuổi Tỉ Số Kịch Tính ${homeScore} - ${awayScore} vs ${opponent}`;

  const matchSummary = isLoss 
    ? `Trận đấu gặp ${opponent} kết thúc với tỉ số ${homeScore} - ${awayScore}. Đội bóng thi đấu chưa đúng với phong độ vốn có, còn bộc lộ một số sai lầm cá nhân nhưng cũng có những điểm sáng nỗ lực.`
    : `Trận đấu giữa FC TNT và ${opponent} diễn ra sôi nổi với tỉ số chung cuộc ${homeScore} - ${awayScore}. Toàn đội đã thể hiện tinh thần quyết tâm và cống hiến hết mình.`;

  return {
    matchHeadline,
    matchSummary,
    motmPlayerId: motmId,
    ratings,
    source: 'Smart Football Analysis Engine'
  };
}

// Route POST /api/ai/rate-match
app.post('/api/ai/rate-match', async (req, res) => {
  try {
    const { matchInfo, playerList, matchNarration, apiKey } = req.body;

    if (!playerList || !Array.isArray(playerList) || playerList.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách cầu thủ không hợp lệ!' });
    }

    const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // If Gemini key is available, call Google Gemini 1.5 / 2.0 Flash
    if (geminiKey) {
      try {
        const playerInfoText = playerList.map(p => 
          `- ID: "${p.id}", Tên: "${p.name}", Biệt danh: "${p.nickname || ''}", Số áo: #${p.number}, Vị trí: ${p.position}, Đá chính: ${p.isStarter !== false ? 'Có' : 'Dự bị'}`
        ).join('\n');

        const systemInstruction = `Bạn là Chuyên gia phân tích bóng đá và Bình luận viên giải bóng đá phủi Việt Nam (Sân 7 người) của FC TNT.

QUY TẮC CHẤM ĐIỂM BẮT BUỘC (TUÂN THỦ TUYỆT ĐỐI):
1. KHÔNG NỊNH NỌT, ĐÁNH GIÁ CÔNG TÂM, KHẮT KHE CHUẨN XÁC theo đúng mô tả của người dùng.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA BÀN THẮNG HOẶC KIẾN TẠO: Chỉ ghi nhận "goals": 1, 2... hoặc "assists": 1, 2... nếu trong văn bản người dùng NÓI RÕ người đó ghi bàn/kiến tạo! Những người khác BẮT BUỘC "goals": 0, "assists": 0!
3. THANG ĐIỂM SOFASCORE CHUẨN:
   - Thi đấu tệ / mắc sai lầm / chân yếu ảnh hưởng lối chơi / mất cảm giác bóng / thiếu sức sống: 4.0 - 5.4 điểm.
   - Thi đấu dưới sức / bị kèm chặt / chưa có đột biến: 5.5 - 6.2 điểm.
   - Thi đấu tròn vai / ổn định: 6.4 - 6.8 điểm.
   - Thi đấu tốt / ghi bàn / kiến tạo / cứu thua: 7.2 - 8.0 điểm.
   - Xuất sắc nhất trận (gánh đội, đá thòng cực tốt, cản phá nhiều): 8.5 - 9.5 điểm.
4. BẢNG BIỆT DANH FC TNT:
   - "Duy Vinh" / "Vinh" = Vinh Lê
   - "Tố Địu" / "Tô Diệu" = ToDiu
   - "Trí Hoàn" / "Hoàn" = Trí Hoàn
   - "Quang" / "Côn" = Côn 35K1 (Quang)
   - "Bắc" = Đức Bắc
   - "Giang" = Trường Giang
   - "Dũng" = Công Dũng
   - "Nam" = Thành Nam
   - "Thọ" = Tài Thọ
   - "Hùng" = Hùng Sứt
   - "Quân" = Quân Kun

Trả về đúng chuẩn JSON không có định dạng markdown hay văn bản thừa:
{
  "matchHeadline": "Tiêu đề trận đấu súc tích, thực tế",
  "matchSummary": "Đoạn tóm tắt nhận định tổng quan 2 câu về trận đấu",
  "motmPlayerId": "ID của cầu thủ xuất sắc nhất trận",
  "ratings": [
    {
      "playerId": "p_...",
      "rating": 7.5,
      "goals": 0,
      "assists": 0,
      "yellowCards": 0,
      "redCards": 0,
      "tag": "🛡️ Lá chắn thép",
      "note": "1 câu nhận xét chân thực, thẳng thắn, có emoji"
    }
  ]
}`;

        const userPrompt = `THÔNG TIN TRẬN ĐẤU:
- Đội bóng: FC TNT vs ${matchInfo?.opponent || 'Đối thủ'}
- Tỉ số: ${matchInfo?.homeScore ?? 0} - ${matchInfo?.awayScore ?? 0}
- Kết quả: ${matchInfo?.result || 'LOSS'}

DANH SÁCH CẦU THỦ THAM GIA:
${playerInfoText}

MÔ TẢ DIỄN BIẾN & PHONG ĐỘ CỦA QUẢN TRỊ VIÊN:
"""
${matchNarration || 'Đánh giá dựa trên tỉ số và số liệu thống kê thực tế.'}
"""

Hãy chấm điểm toàn bộ cầu thủ trong danh sách đúng theo mô tả và trả về JSON chuẩn xác.`;

        const modelName = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return res.json({
              success: true,
              ...parsed,
              source: `Google Gemini AI (${modelName})`
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API error, switching to NLP fallback:', geminiErr.message);
      }
    }

    // Fallback to Smart NLP Engine
    const fallbackResult = analyzeMatchWithNLP({ matchInfo, playerList, matchNarration });
    return res.json({
      success: true,
      ...fallbackResult
    });

  } catch (err) {
    console.error('Error in /api/ai/rate-match:', err);
    res.status(500).json({ success: false, error: err.message });
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
