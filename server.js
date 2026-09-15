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

// =========================================================================
// WEATHER & PITCH AI API (SÂN AKKA CHU VĂN AN)
// =========================================================================

// Tọa độ Sân bóng đá AKKA - 68 Đại Lộ Chu Văn An, Thanh Liệt, Thanh Trì / Hoàng Mai, Hà Nội
const AKKA_VENUE = {
  name: 'Sân bóng đá AKKA',
  address: '68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội',
  latitude: 20.9752,
  longitude: 105.8175,
  turfType: 'Cỏ nhân tạo 5cm - Nền đá mi thoát nước tiêu chuẩn',
  slots: [
    { id: 'slot_1', name: 'Slot 1 (20h45)', time: '20:45 - 22:15', startHour: 20, endHour: 22 },
    { id: 'slot_2', name: 'Slot 2 (22h15)', time: '22:15 - 23:45', startHour: 22, endHour: 24 }
  ]
};

// Weather cache in memory (10 minutes TTL)
let weatherCache = {
  timestamp: 0,
  data: null
};

// Helper chuyển mã WMO weather code sang mô tả tiếng Việt và icon
function parseWmoWeather(code) {
  if (code === 0) return { label: 'Trời quang đãng, mát mẻ', icon: '☀️', condition: 'clear' };
  if (code === 1 || code === 2) return { label: 'Ít mây, trời thoáng', icon: '🌤️', condition: 'partly_cloudy' };
  if (code === 3) return { label: 'Nhiều mây, dịu mát', icon: '☁️', condition: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Sương mù nhẹ', icon: '🌫️', condition: 'fog' };
  if (code >= 51 && code <= 55) return { label: 'Mưa phùn lất phất', icon: '🌦️', condition: 'drizzle' };
  if (code >= 61 && code <= 65) return { label: 'Mưa rào', icon: '🌧️', condition: 'rain' };
  if (code >= 80 && code <= 82) return { label: 'Mưa rào nặng hạt', icon: '🌧️', condition: 'heavy_rain' };
  if (code >= 95 && code <= 99) return { label: 'Dông sét, mưa to nguy hiểm', icon: '⛈️', condition: 'thunderstorm' };
  return { label: 'Thời tiết bình thường', icon: '⛅', condition: 'unknown' };
}

// Tính chỉ số đá bóng (Match Playability Index 0 - 100%) và gợi ý giày chuẩn xác
function calculatePlayability(hourRainMm, hourRainProb, hourTemp, prevRainTotal = 0, weatherCode = 0, nextHourRain = 0) {
  let score = 100;
  let status = 'ideal'; // ideal | playable | caution | cancel
  let statusText = 'Thời tiết lý tưởng để đá';
  let badgeClass = 'badge-ideal';
  let pitchCondition = 'Mặt sân khô ráo, cỏ bám tốt';
  let bootAdvice = 'Giày đinh dăm TF thường, form tốc độ hoặc kiểm soát bóng';

  const maxSlotRain = Math.max(hourRainMm, nextHourRain);

  // 1. Dông sét nguy hiểm hoặc mưa rào to
  if (weatherCode >= 95 || maxSlotRain >= 3.0 || (maxSlotRain >= 1.5 && hourRainProb >= 80)) {
    score = Math.min(score, 35);
    status = 'cancel';
    statusText = 'Cảnh báo mưa to - Nguy cơ hủy trận';
    badgeClass = 'badge-cancel';
    pitchCondition = 'Mặt sân ướt sũng / đọng nước, bóng lăn nặng và rất trơn';
    bootAdvice = 'Khuyên nên hoãn trận hoặc đi giày đinh TF gai sâu bám cao su';
  } else if (maxSlotRain > 0.8 || hourRainProb >= 70) {
    score = Math.min(score, 55);
    status = 'caution';
    statusText = 'Có mưa - Sân trơn ướt';
    badgeClass = 'badge-caution';
    pitchCondition = 'Mặt cỏ ẩm ướt nhiều, dễ trượt trụ khi xoay người';
    bootAdvice = 'Giày đinh TF dăm cao su bám gót, cẩn thận tránh lật cổ chân';
  } else if (maxSlotRain > 0 || hourRainProb >= 35) {
    score = Math.min(score, 75);
    status = 'playable';
    statusText = 'Mưa lất phất - Đá được';
    badgeClass = 'badge-playable';
    pitchCondition = 'Mặt sân ẩm nhẹ, bóng đi đầm chân';
    bootAdvice = 'Giày đinh TF có độ bám gót tốt';
  }

  // 2. Xét lượng mưa tích lũy từ chiều (nếu mưa dầm nhiều giờ liên tiếp)
  if (prevRainTotal >= 3.0 && maxSlotRain > 0) {
    // Đã mưa dầm từ chiều và vẫn còn mưa trong slot -> Sân bão hòa nước
    score = Math.min(score, 38);
    status = 'cancel';
    statusText = 'Mưa dầm từ chiều - Sân ướt nặng';
    badgeClass = 'badge-cancel';
    pitchCondition = 'Mặt cỏ bão hòa nước sau nhiều giờ mưa dầm, sân rất trơn';
    bootAdvice = 'Sân rất trơn, hạn chế xoạc bóng và mang giày đinh TF chống trượt';
  } else if (prevRainTotal >= 2.0 && maxSlotRain === 0) {
    // Mưa từ chiều nhưng trong slot đã tạnh -> Đang róc nước
    score = Math.min(score, 80);
    status = 'playable';
    statusText = 'Tạnh mưa - Sân đang róc nước';
    badgeClass = 'badge-playable';
    pitchCondition = 'Sân vừa tạnh, đang thoát nước nhanh, mặt cỏ mềm';
    bootAdvice = 'Đá êm chân, giày đinh TF dăm tiêu chuẩn';
  }

  // 3. Nhiệt độ
  if (hourTemp > 35) {
    score -= 15;
    statusText += ' (Oi bức)';
  } else if (hourTemp < 15) {
    score -= 10;
    statusText += ' (Trời lạnh)';
  }

  score = Math.max(15, Math.min(100, Math.round(score)));

  return {
    score,
    status,
    statusText,
    badgeClass,
    pitchCondition,
    bootAdvice
  };
}

// Endpoint: Lấy dự báo thời tiết 7 ngày Sân AKKA Chu Văn An
app.get('/api/weather/forecast', async (req, res) => {
  try {
    const now = Date.now();
    // Cache 10 phút
    if (weatherCache.data && (now - weatherCache.timestamp < 10 * 60 * 1000)) {
      return res.json({
        success: true,
        cached: true,
        ...weatherCache.data
      });
    }

    const { latitude, longitude } = AKKA_VENUE;
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=7`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status: ${response.status}`);
    }

    const raw = await response.json();
    const hourly = raw.hourly;
    const daily = raw.daily;

    if (!hourly || !daily) {
      throw new Error('Dữ liệu thời tiết không hợp lệ!');
    }

    const days = [];
    const dayNamesVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    for (let i = 0; i < daily.time.length; i++) {
      const dateStr = daily.time[i]; // 'YYYY-MM-DD'
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getDay();
      const dayNameVi = dayNamesVi[dayOfWeek];
      
      const isToday = i === 0;
      const isTomorrow = i === 1;
      let displayLabel = dayNameVi;
      if (isToday) displayLabel = `Hôm nay (${dayNameVi})`;
      else if (isTomorrow) displayLabel = `Ngày mai (${dayNameVi})`;

      // Lọc các khung giờ buổi tối của ngày này (17h - 23h)
      const eveningHours = [];
      let afternoonRainSum = 0; // Lượng mưa từ 17h đến 20h

      for (let h = 17; h <= 23; h++) {
        const hourStr = `${dateStr}T${String(h).padStart(2, '0')}:00`;
        const idx = hourly.time.indexOf(hourStr);
        if (idx !== -1) {
          const temp = Math.round(hourly.temperature_2m[idx]);
          const appTemp = Math.round(hourly.apparent_temperature[idx]);
          const humidity = hourly.relative_humidity_2m[idx];
          const rainProb = hourly.precipitation_probability[idx] || 0;
          const rainMm = hourly.precipitation[idx] || 0;
          const code = hourly.weather_code[idx];
          const weatherInfo = parseWmoWeather(code);

          if (h < 20) {
            afternoonRainSum += rainMm;
          }

          let pitchState = 'Khô ráo';
          if (rainMm > 2) pitchState = 'Ướt đọng';
          else if (rainMm > 0) pitchState = 'Mưa nhẹ';
          else if (afternoonRainSum > 0 && h >= 20) pitchState = 'Đang róc nước';

          eveningHours.push({
            hour: `${h}:00`,
            timeStr: hourStr,
            temperature: temp,
            apparentTemperature: appTemp,
            humidity,
            rainProbability: rainProb,
            rainMm,
            weatherCode: code,
            weatherIcon: weatherInfo.icon,
            weatherLabel: weatherInfo.label,
            pitchState
          });
        }
      }

      // Đánh giá Slot 1 (20:45 - 22:15): lấy cả giờ 20:00 & 21:00
      const idx20 = hourly.time.indexOf(`${dateStr}T20:00`);
      const idx21 = hourly.time.indexOf(`${dateStr}T21:00`);
      const slot1Rain20 = idx20 !== -1 ? hourly.precipitation[idx20] : 0;
      const slot1Rain21 = idx21 !== -1 ? hourly.precipitation[idx21] : 0;
      const slot1Rain = Math.max(slot1Rain20, slot1Rain21);
      const slot1Prob = Math.max(idx20 !== -1 ? hourly.precipitation_probability[idx20] : 0, idx21 !== -1 ? hourly.precipitation_probability[idx21] : 0);
      const slot1Temp = idx21 !== -1 ? Math.round(hourly.temperature_2m[idx21]) : 26;
      const slot1AppTemp = idx21 !== -1 ? Math.round(hourly.apparent_temperature[idx21]) : 27;
      const slot1Code = Math.max(idx20 !== -1 ? hourly.weather_code[idx20] : 0, idx21 !== -1 ? hourly.weather_code[idx21] : 0);
      const slot1Weather = parseWmoWeather(slot1Code);
      const slot1Eval = calculatePlayability(slot1Rain20, slot1Prob, slot1Temp, afternoonRainSum, slot1Code, slot1Rain21);

      // Đánh giá Slot 2 (22:15 - 23:45): lấy cả giờ 22:00 & 23:00
      const idx22 = hourly.time.indexOf(`${dateStr}T22:00`);
      const idx23 = hourly.time.indexOf(`${dateStr}T23:00`);
      const slot2Rain22 = idx22 !== -1 ? hourly.precipitation[idx22] : 0;
      const slot2Rain23 = idx23 !== -1 ? hourly.precipitation[idx23] : 0;
      const slot2Rain = Math.max(slot2Rain22, slot2Rain23);
      const slot2Prob = Math.max(idx22 !== -1 ? hourly.precipitation_probability[idx22] : 0, idx23 !== -1 ? hourly.precipitation_probability[idx23] : 0);
      const slot2Temp = idx22 !== -1 ? Math.round(hourly.temperature_2m[idx22]) : 25;
      const slot2AppTemp = idx22 !== -1 ? Math.round(hourly.apparent_temperature[idx22]) : 26;
      const slot2Code = Math.max(idx22 !== -1 ? hourly.weather_code[idx22] : 0, idx23 !== -1 ? hourly.weather_code[idx23] : 0);
      const slot2Weather = parseWmoWeather(slot2Code);
      // Lượng mưa tích lũy trước 22h
      const pre22Rain = afternoonRainSum + slot1Rain20 + slot1Rain21;
      const slot2Eval = calculatePlayability(slot2Rain22, slot2Prob, slot2Temp, pre22Rain, slot2Code, slot2Rain23);

      days.push({
        date: dateStr,
        dayNameVi,
        displayLabel,
        isToday,
        isTomorrow,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        dailyRainSum: daily.precipitation_sum[i],
        dailyRainProbMax: daily.precipitation_probability_max[i],
        weatherCode: daily.weather_code[i],
        weatherIcon: parseWmoWeather(daily.weather_code[i]).icon,
        weatherLabel: parseWmoWeather(daily.weather_code[i]).label,
        slots: {
          slot_1: {
            id: 'slot_1',
            name: 'Slot 20h45 (20:45 - 22:15)',
            time: '20:45 - 22:15',
            temperature: slot1Temp,
            apparentTemperature: slot1AppTemp,
            rainProbability: slot1Prob,
            rainMm: slot1Rain,
            weatherCode: slot1Code,
            weatherIcon: slot1Weather.icon,
            weatherLabel: slot1Weather.label,
            ...slot1Eval
          },
          slot_2: {
            id: 'slot_2',
            name: 'Slot 22h15 (22:15 - 23:45)',
            time: '22:15 - 23:45',
            temperature: slot2Temp,
            apparentTemperature: slot2AppTemp,
            rainProbability: slot2Prob,
            rainMm: slot2Rain,
            weatherCode: slot2Code,
            weatherIcon: slot2Weather.icon,
            weatherLabel: slot2Weather.label,
            ...slot2Eval
          }
        },
        eveningTimeline: eveningHours
      });
    }

    const payload = {
      venue: AKKA_VENUE,
      days,
      updatedAt: new Date().toISOString()
    };

    // Cache kết quả
    weatherCache = {
      timestamp: now,
      data: payload
    };

    res.json({
      success: true,
      cached: false,
      ...payload
    });

  } catch (err) {
    console.error('Error in /api/weather/forecast:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper phân tích thông minh bằng NLP nếu không có Gemini key hoặc API lỗi
function analyzePitchWithFootballNLP(question, forecastData, selectedDate, selectedSlot) {
  const q = (question || '').toLowerCase();
  const venueName = 'Sân bóng đá AKKA (68 ĐL Chu Văn An, Thanh Liệt, Hà Nội)';
  
  const daysList = forecastData?.days || [];
  let dayData = daysList[0];
  if (selectedDate && daysList.length > 0) {
    const found = daysList.find(d => d.date === selectedDate);
    if (found) dayData = found;
  }

  const slot1 = dayData?.slots?.slot_1;
  const slot2 = dayData?.slots?.slot_2;

  // 1. Phân tích Slot được nhắc đến trong câu hỏi
  let targetSlotKey = 'slot_1';
  let targetSlotName = 'Slot 20h45';

  if (q.includes('22h15') || q.includes('10h15') || q.includes('slot 2') || q.includes('đá muộn') || q.includes('ca 2')) {
    targetSlotKey = 'slot_2';
    targetSlotName = 'Slot 22h15';
  } else if (q.includes('20h45') || q.includes('8h45') || q.includes('slot 1') || q.includes('đá sớm') || q.includes('ca 1')) {
    targetSlotKey = 'slot_1';
    targetSlotName = 'Slot 20h45';
  } else if (selectedSlot === 'slot_2') {
    targetSlotKey = 'slot_2';
    targetSlotName = 'Slot 22h15';
  }

  // 2. Nhận diện các thứ / ngày cụ thể được người dùng nhắc đến
  const daysMap = [
    { keys: ['thứ 2', 'thứ hai', 't2'], name: 'Thứ Hai', dayNum: 1 },
    { keys: ['thứ 3', 'thứ ba', 't3'], name: 'Thứ Ba', dayNum: 2 },
    { keys: ['thứ 4', 'thứ tư', 't4'], name: 'Thứ Tư', dayNum: 3 },
    { keys: ['thứ 5', 'thứ năm', 't5'], name: 'Thứ Năm', dayNum: 4 },
    { keys: ['thứ 6', 'thứ sáu', 't6'], name: 'Thứ Sáu', dayNum: 5 },
    { keys: ['thứ 7', 'thứ bảy', 't7'], name: 'Thứ Bảy', dayNum: 6 },
    { keys: ['chủ nhật', 'cn'], name: 'Chủ Nhật', dayNum: 0 }
  ];

  const queriedDays = [];
  daysMap.forEach(d => {
    if (d.keys.some(k => q.includes(k))) {
      const match = daysList.find(f => {
        const dt = new Date(f.date);
        return dt.getDay() === d.dayNum;
      });
      if (match) {
        queriedDays.push(match);
      }
    }
  });

  if (q.includes('hôm nay') && daysList[0] && !queriedDays.some(d => d.date === daysList[0].date)) {
    queriedDays.unshift(daysList[0]);
  }
  if (q.includes('ngày mai') && daysList[1] && !queriedDays.some(d => d.date === daysList[1].date)) {
    queriedDays.push(daysList[1]);
  }

  // === TÌNH HUỐNG A: NGƯỜI DÙNG HỎI CÁC THỨ / NGÀY CỤ THỂ (Ví dụ: Thứ 4 và Thứ 5) ===
  if (queriedDays.length > 0) {
    let evaluationLines = [];
    let canPlayAny = false;

    queriedDays.forEach(d => {
      const slot = d.slots[targetSlotKey];
      const dateShort = d.date.split('-').slice(1).reverse().join('/');
      let statusEmoji = '✅';
      let adviceText = '';

      if (slot.score <= 50 || slot.rainMm >= 1.5 || (slot.rainProbability >= 75 && slot.rainMm > 0)) {
        statusEmoji = '❌';
        adviceText = `**KHÔNG NÊN ĐÁ** (Mưa ${slot.rainMm}mm, xác suất mưa **${slot.rainProbability}%**, sân úng nước và rất trơn)`;
      } else if (slot.score <= 75 || slot.rainProbability >= 50) {
        statusEmoji = '⚠️';
        adviceText = `**CÂN NHẮC / SÂN ẨM** (Mưa nhỏ lất phất ${slot.rainMm}mm, xác suất ${slot.rainProbability}%, mặt sân hơi trơn)`;
      } else {
        statusEmoji = '✅';
        adviceText = `**ĐÁ RẤT TỐT** (Tạnh ráo, 0mm mưa, mát ${slot.temperature}°C, điểm đá **${slot.score}/100**)`;
        canPlayAny = true;
      }

      evaluationLines.push(`• ${statusEmoji} **${d.dayNameVi} (${dateShort}) - ${targetSlotName}:** ${adviceText}`);
    });

    const betterAlternatives = daysList.filter(d => {
      const s = d.slots[targetSlotKey];
      const isAlreadyQueried = queriedDays.some(qd => qd.date === d.date);
      return !isAlreadyQueried && s.score >= 80;
    }).sort((a, b) => b.slots[targetSlotKey].score - a.slots[targetSlotKey].score);

    let altSuggestion = '';
    if (betterAlternatives.length > 0) {
      const topAlts = betterAlternatives.slice(0, 2);
      const altText = topAlts.map(a => `**${a.dayNameVi} (${a.date.split('-').slice(1).reverse().join('/')})**`).join(' hoặc ');
      altSuggestion = `\n\n💡 **Phương án gợi ý tối ưu:** Nếu anh em muốn đá sân khô ráo, chạy bứt tốc êm chân và không lo trơn ngã, Trợ lý khuyên nên dời lịch sang ${altText} (Trời tạnh ráo hoàn toàn, không mưa, điểm đá **95 - 100/100**)!`;
    }

    let conclusionText = '';
    if (queriedDays.length === 1) {
      const singleSlot = queriedDays[0].slots[targetSlotKey];
      conclusionText = singleSlot.score <= 50 
        ? `👉 **Kết luận:** **${queriedDays[0].dayNameVi}** ${targetSlotName} thời tiết rất xấu, **không nên đá** để bảo vệ an toàn cho anh em!`
        : (singleSlot.score <= 75 ? `👉 **Kết luận:** **${queriedDays[0].dayNameVi}** ${targetSlotName} đá được nhưng sân còn ẩm ướt, cần đi giày đinh TF bám gót!` : `👉 **Kết luận:** **${queriedDays[0].dayNameVi}** ${targetSlotName} thời tiết lý tưởng, chốt kèo đi đá thôi!`);
    } else {
      if (!canPlayAny) {
        conclusionText = `👉 **Kết luận:** Cả ${queriedDays.map(d => d.dayNameVi).join(' & ')} ${targetSlotName} đều dính mưa và trơn ướt, **không nên đá** vào các ngày này!`;
      } else {
        const bestAmong = [...queriedDays].sort((a, b) => b.slots[targetSlotKey].score - a.slots[targetSlotKey].score)[0];
        conclusionText = `👉 **Kết luận:** Giữa các ngày bạn hỏi, **${bestAmong.dayNameVi}** là ngày đá ổn nhất!`;
      }
    }

    return `📋 **Thẩm định thời tiết tại Sân AKKA theo yêu cầu của bạn (${targetSlotName}):**\n\n${evaluationLines.join('\n')}\n\n${conclusionText}${altSuggestion}`;
  }

  // === TÌNH HUỐNG B: HỎI VỀ MƯA TRƯỚC TRẬN VÀ RÓC NƯỚC ===
  if (q.includes('mưa') && (q.includes('róc') || q.includes('khô') || q.includes('đá được không') || q.includes('ướt') || q.includes('trơn') || q.includes('19h') || q.includes('7h'))) {
    const isSlot2 = targetSlotKey === 'slot_2';
    const targetSlot = isSlot2 ? slot2 : slot1;
    const targetName = isSlot2 ? 'Slot 22h15' : 'Slot 20h45';

    if (targetSlot?.score <= 50 || targetSlot?.rainMm >= 1.5 || (targetSlot?.rainProbability >= 75 && targetSlot?.rainMm > 0)) {
      return `⚠️ **Cảnh báo ${targetName} tối nay tại Sân AKKA:**\n\n- **Dữ liệu thực tế:** Khung giờ này dự báo có mưa (${targetSlot.rainMm}mm, xác suất mưa **${targetSlot.rainProbability}%**) sau khi đã mưa dầm từ chiều.\n- **Tình trạng mặt cỏ:** Nền cỏ nhân tạo đã ngậm bão hòa nước nên **chưa thể róc nước kịp**, sân sẽ rất ướt sũng và trơn trượt (Điểm đá: **${targetSlot.score}/100**).\n- **Lời khuyên:** Đội trưởng nên cân nhắc hoãn trận tối nay để giữ chân cho anh em, tránh trượt xoạc lật cổ chân!`;
    } else if (targetSlot?.rainMm === 0 && targetSlot?.rainProbability < 40) {
      return `✅ **Đá cực nuột luôn anh em nhé!** ⚽\n\n- **Tình trạng mặt sân AKKA:** Hệ thống thoát nước đá mi của sân rất tốt. Nếu có mưa nhỏ từ 19h và dứt điểm sau đó, thì chỉ mất **30 - 45 phút** là mặt sân đã róc sạch nước.\n- **Đến khung ${targetName}:** Sân tạnh ráo, chỉ còn ẩm nhẹ giúp bóng đầm chân và êm ái.\n- **Lời khuyên chọn giày:** Mang giày đinh TF dăm cao su bám sân là chạy mượt mà!`;
    } else {
      return `🌦️ **Lưu ý ${targetName}:** Sân có thể còn ẩm ướt nhẹ (Điểm đá: **${targetSlot?.score || 70}/100**). Anh em nên mang giày đinh TF có gờ bám sâu để tránh trượt trụ khi xoay người!`;
    }
  }

  // === TÌNH HUỐNG C: HỎI XẾP HẠNG NGÀY ĐẸP NHẤT TRONG TUẦN ===
  if (q.includes('hôm nào') || q.includes('ngày nào') || q.includes('chọn ngày') || q.includes('tuần này') || q.includes('đẹp nhất')) {
    if (daysList.length > 0) {
      const sortedDays = [...daysList].sort((a, b) => {
        const scoreA = (a.slots.slot_1.score + a.slots.slot_2.score) / 2;
        const scoreB = (b.slots.slot_1.score + b.slots.slot_2.score) / 2;
        return scoreB - scoreA;
      });

      const top1 = sortedDays[0];
      const top2 = sortedDays[1] || sortedDays[0];

      const s1_desc = top1.slots.slot_1.rainMm === 0 ? 'Tạnh ráo, cỏ khô' : top1.slots.slot_1.weatherLabel;
      const s2_desc = top2.slots.slot_1.rainMm === 0 ? 'Tạnh ráo, cỏ khô' : top2.slots.slot_1.weatherLabel;

      return `🏆 **Bảng xếp hạng ngày đẹp nhất tuần này để FC TNT lên kèo (Sân AKKA):**\n\n1. 🥇 **${top1.displayLabel} (${top1.date}):** Điểm thi đấu **${Math.round((top1.slots.slot_1.score + top1.slots.slot_2.score)/2)}/100** • ${s1_desc}, mát ${top1.slots.slot_1.temperature}°C, xác suất mưa thấp (${top1.slots.slot_1.rainProbability}%).\n2. 🥈 **${top2.displayLabel} (${top2.date}):** Điểm thi đấu **${Math.round((top2.slots.slot_1.score + top2.slots.slot_2.score)/2)}/100** • ${s2_desc}, cả 2 slot 20h45 & 22h15 đều lý tưởng.\n\n💡 **Gợi ý của Trợ lý:** Anh em nên bắt đối giao hữu vào **${top1.dayNameVi}** hoặc **${top2.dayNameVi}** để có trải nghiệm sân mượt mà nhất!`;
    }
  }

  // === TÌNH HUỐNG D: HỎI VỀ CHỌN GIÀY ===
  if (q.includes('giày') || q.includes('đinh') || q.includes('tf') || q.includes('trơn') || q.includes('trượt')) {
    return `👟 **Tư vấn chọn giày đá bóng tại Sân AKKA Chu Văn An:**\n\n- **Trời khô ráo / Mát mẻ:** Đi giày đinh **TF dăm tròn hoặc dăm mỏng** (Nike Tiempo, Mercurial, Mizuno Neo...) để bứt tốc nhẹ nhàng, cảm giác bóng thật chân.\n- **Sân vừa mưa / Còn ẩm:** Khuyên dùng giày đinh **TF cao su đinh tam giác hoặc đinh sâu bám gót** (như Adidas Predator, X Speedportal, Puma Future). Tuyệt đối không mang giày đã mòn nhẵn đế vì cỏ nhân tạo ướt rất dễ bị trượt trụ gây lật sơ mi hoặc giãn dây chằng!`;
  }

  // === TÌNH HUỐNG E: DÔNG SÉT ===
  if (q.includes('dông') || q.includes('sét') || q.includes('sấm') || q.includes('nguy hiểm')) {
    const isThunder = (slot1?.weatherCode >= 95) || (slot2?.weatherCode >= 95);
    if (isThunder) {
      return `⛈️ **CẢNH BÁO NGUY HIỂM:** Dự báo tối nay có khả năng xuất hiện dông sét và gió giật tại khu vực Chu Văn An. Anh em tuyệt đối không nên đá bóng trên sân cỏ nhân tạo khi trời có sấm sét!`;
    }

    const isRainHeavy = (slot1?.score <= 50) || (slot2?.score <= 50) || (slot1?.rainProbability >= 70);
    if (isRainHeavy) {
      return `🛡️ **Về Dông Sét:** Tối nay tại Sân AKKA **không có tín hiệu sấm sét** hay gió lốc nguy hiểm (an toàn về điện sét).\n\n⚠️ **TUY NHIÊN CẢNH BÁO MƯA ƯỚT:** Radar dự báo có mưa dầm từ chiều và lượng mưa trong giờ đá khá lớn (xác suất mưa **${slot1?.rainProbability || 100}%**). Mặt sân sẽ rất ướt sũng và trơn trượt (Điểm đá chỉ **${slot1?.score || 35}/100**). Dù không có sét nhưng anh em nên cân nhắc hoãn trận để tránh chấn thương nhé!`;
    }

    return `🛡️ **Yên tâm anh em nhé!**\n\nTheo radar thời tiết, tại **${venueName}** tối nay không có tín hiệu dông sét hay gió giật nguy hiểm. Thời tiết rất tạnh ráo, an toàn tuyệt đối để tổ chức trận đấu!`;
  }

  // Phản hồi tổng quan
  return `🌤️ **Tư vấn Thời Tiết Sân AKKA Chu Văn An cho FC TNT:**\n\n- **Ngày đang xem:** ${dayData?.displayLabel || 'Hôm nay'}\n- **Slot 20h45:** ${slot1?.temperature || 26}°C • ${slot1?.weatherLabel || 'Tạnh ráo'} (${slot1?.statusText || 'Đá tốt'}) • Điểm đánh giá: **${slot1?.score || 90}/100**\n- **Slot 22h15:** ${slot2?.temperature || 25}°C • ${slot2?.weatherLabel || 'Mát mẻ'} (${slot2?.statusText || 'Lý tưởng'}) • Điểm đánh giá: **${slot2?.score || 95}/100**\n\n👉 Anh em có thể hỏi bất kỳ ngày nào (vd: *Thứ 4, Thứ 5 đá được không?*) hoặc bấm vào câu hỏi gợi ý bên trên nhé!`;
}

// Endpoint: AI Thẩm định thời tiết & Mặt sân AKKA
app.post('/api/weather/ai-consultant', async (req, res) => {
  try {
    const { question, forecastData, selectedDate, selectedSlot } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp câu hỏi!' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const systemInstruction = `Bạn là "Trợ Lý Trọng Tài & Cố Vấn Thời Tiết Sân Cỏ Nhân Tạo FC TNT", am hiểu sâu sắc về thời tiết Hà Nội và sân bóng đá cỏ nhân tạo AKKA (68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội).
Đặc tính sân AKKA: Mặt sân cỏ nhân tạo tiêu chuẩn, nền đá mi thoát nước tốt. Nếu mưa nhỏ hoặc vừa trước đó 1-2 tiếng (lúc 18h, 19h, 20h), sau khi tạnh mưa khoảng 30-45 phút thì mặt sân róc nước, chỉ còn ẩm nhẹ, đến 22h15 đá rất êm chân, không trơn trượt.
Phong cách trả lời: Thân thiện, hào sảng chuẩn dân đá bóng phủi, súc tích, có emoji bóng đá, phân tích logic theo giờ và đưa ra lời khuyên thực tế (đá được hay không, róc nước chưa, nên đi giày TF nào).`;

        const userPrompt = `DỮ LIỆU THỜI TIẾT DỰ BÁO 7 NGÀY TẠI SÂN AKKA CHU VĂN AN:
${JSON.stringify(forecastData?.days?.slice(0, 4) || {}, null, 2)}

NGÀY ĐANG CHỌN: ${selectedDate || 'Hôm nay'}
SLOT ĐANG CHỌN: ${selectedSlot || '20h45 / 22h15'}

CÂU HỎI CỦA ANH EM TRONG ĐỘI:
"${question}"

Hãy trả lời trực diện câu hỏi của anh em thật tự nhiên, chuẩn xác theo dữ liệu thời tiết và đặc tính sân AKKA.`;

        const modelName = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const answerText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answerText) {
            return res.json({
              success: true,
              answer: answerText,
              source: `Google Gemini AI (${modelName})`
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API weather consultant error, switching to football NLP:', geminiErr.message);
      }
    }

    // Fallback thông minh với Football Pitch NLP
    const answer = analyzePitchWithFootballNLP(question, forecastData, selectedDate, selectedSlot);
    return res.json({
      success: true,
      answer,
      source: 'FC TNT Pitch Intelligence Engine'
    });

  } catch (err) {
    console.error('Error in /api/weather/ai-consultant:', err);
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
