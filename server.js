/**
 * FC TNT - Backend Server & App Bootstrap
 * Node.js + Express + MongoDB + Socket.IO Real-time Sync
 */

require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { Server } = require('socket.io');

// Models
const Player = require('./models/Player');
const Match = require('./models/Match');
const Team = require('./models/Team');
const Moment = require('./models/Moment');
const LiveMatchDraft = require('./models/LiveMatchDraft');

// Modular Route Handlers
const { createAuthRouter, requireAdmin, getValidAdminPins } = require('./routes/auth');
const { createPlayersRouter } = require('./routes/players');
const { createMatchesRouter } = require('./routes/matches');
const { createAiRouter } = require('./routes/ai');
const { createLiveMatchRouter } = require('./routes/liveMatch');
const { createMomentsRouter } = require('./routes/moments');
const { createWeatherRouter } = require('./routes/weather');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fc_ntn';

let isMongoConnected = false;
const checkMongo = () => isMongoConnected;

// Broadcast helper cho đồng bộ thời gian thực
const broadcastDataUpdate = (type, message, extra = {}) => {
  try {
    io.emit('data_updated', {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...extra
    });
  } catch (err) {
    console.warn('Socket broadcast error:', err.message);
  }
};

io.on('connection', (socket) => {
  console.log(`⚡ Realtime Client kết nối: ${socket.id}`);
  socket.on('disconnect', () => {});
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 15 Cầu thủ chính thức của đội bóng (Shared SSOT)
const OFFICIAL_PLAYERS = require('./utils/officialPlayers');

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
    reactions: { heart: 8, football: 5, beer: 15, fire: 10, userReactions: [] },
    comments: [
      { id: 'c_1', authorName: 'Quân Kun', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', content: 'Hôm đấy vui quá anh em ơi, bia vào chân đá lại càng dẻo! 🍻🔥', createdAt: new Date('2026-09-08T22:30:00') },
      { id: 'c_2', authorName: 'Tài Thọ', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', content: 'Trận sau cứ thắng 3 bàn trở lên lại làm bữa nữa nhé đội trưởng! ⚽💪', createdAt: new Date('2026-09-08T23:15:00') }
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
    reactions: { heart: 12, football: 18, beer: 6, fire: 20, userReactions: [] },
    comments: [
      { id: 'c_3', authorName: 'Vinh Lê', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', content: 'Áo mặc vào tôn dáng cực kỳ, chất vải thoáng mát đá bao sướng! 👕⭐', createdAt: new Date('2026-09-01T18:00:00') }
    ]
  }
];

// Fallback in-memory storage if MongoDB is connecting or unavailable
const fallbackData = {
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

// Shared context truyền vào các router
const routeContext = {
  isMongoConnected: checkMongo,
  fallbackData,
  broadcastDataUpdate,
  requireAdmin,
  io
};

// =========================================================================
// SYSTEM & COMMON REST API ROUTES
// =========================================================================

// Health / Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: isMongoConnected ? 'MongoDB Connected' : 'Local Fallback Mode',
    timestamp: new Date().toISOString()
  });
});

// GET /api/data (Lấy toàn bộ dữ liệu khởi tạo đồng bộ cho Client SPA)
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
    console.error('Error in GET /api/data:', err);
    res.json(fallbackData);
  }
});

// PUT /api/team (Cập nhật thông tin đội bóng)
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
      broadcastDataUpdate('team', `🛡️ Thông tin đội bóng "${team.name}" vừa được cập nhật!`);
      return res.json(team);
    }

    if (name) fallbackData.teamInfo.name = name;
    if (slogan !== undefined) fallbackData.teamInfo.slogan = slogan;
    broadcastDataUpdate('team', `🛡️ Thông tin đội bóng vừa được cập nhật!`);
    res.json(fallbackData.teamInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/restore (Khôi phục toàn bộ từ file Backup JSON)
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

      broadcastDataUpdate('all', '💾 Toàn bộ cơ sở dữ liệu vừa được khôi phục từ bản sao lưu!');
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
// MOUNT MODULAR API ROUTERS
// =========================================================================
app.use('/api/auth', createAuthRouter(routeContext));
app.use('/api/players', createPlayersRouter(routeContext));
app.use('/api/matches', createMatchesRouter(routeContext));
app.use('/api/ai', createAiRouter());
app.use('/api/live-match', createLiveMatchRouter(routeContext));
app.use('/api/moments', createMomentsRouter(routeContext));
app.use('/api/weather', createWeatherRouter());

// =========================================================================
// STATIC ASSETS & COMPATIBILITY ROUTES
// =========================================================================

// Phục vụ thư mục assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Tương thích ngược cho các icon ở thư mục gốc (để browser & search bot không bị 404)
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'icons', 'favicon.ico')));
app.get('/favicon.png', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'icons', 'favicon.png')));
app.get('/favicon-48.png', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'icons', 'favicon-48.png')));
app.get('/favicon.svg', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'icons', 'favicon.svg')));
app.get('/apple-touch-icon.png', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'icons', 'apple-touch-icon.png')));

// Tương thích ngược cho các đường dẫn cũ dưới /assets/
app.get('/assets/favicon-192.png', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'icons', 'favicon-192.png')));
app.get('/assets/logo-512.png', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'images', 'logo-512.png')));
app.get('/assets/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'images', 'logo.png')));
app.get('/assets/logo.svg', (req, res) => res.sendFile(path.join(__dirname, 'assets', 'images', 'logo.svg')));

// Phục vụ frontend tĩnh
app.use(express.static(path.join(__dirname, '')));

// Route fallback cho Single Page App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server (Hỗ trợ WebSocket Real-time)
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 FC TNT Real-time Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🌿 Database: ${MONGODB_URI}`);
  console.log(`⚡ Real-time WebSocket: Active`);
  console.log(`=================================================`);
});
