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
const compression = require('compression');
const mongoose = require('mongoose');
const path = require('path');
const { Server } = require('socket.io');

// Models
const Player = require('./models/Player');
const Match = require('./models/Match');
const Team = require('./models/Team');
const Moment = require('./models/Moment');
const LiveMatchDraft = require('./models/LiveMatchDraft');
const Tactic = require('./models/Tactic');

// Modular Route Handlers
const { createAuthRouter, requireAdmin, requireTreasurer, requireAdminOrTreasurer } = require('./routes/auth');
const { createPlayersRouter } = require('./routes/players');
const { createMatchesRouter } = require('./routes/matches');
const { createAiRouter } = require('./routes/ai');
const { createLiveMatchRouter } = require('./routes/liveMatch');
const { createMomentsRouter } = require('./routes/moments');
const { createWeatherRouter } = require('./routes/weather');
const { createTacticsRouter } = require('./routes/tactics');
const createUploadRouter = require('./routes/upload');
const { createPaymentsRouter } = require('./routes/payments');
const { createFundsRouter } = require('./routes/funds');
const { securityHeadersMiddleware } = require('./middlewares/securityHeaders');
const { globalRateLimiter } = require('./middlewares/rateLimiter');
const OFFICIAL_TACTICS = require('./utils/officialTactics');
const { initTacticsSocket } = require('./sockets/tacticsSocket');

// Cấu hình CORS Whitelist theo biến môi trường [MED-03]
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOriginCheck = (origin, callback) => {
  // Cho phép server-to-server, curl, Postman hoặc same-origin không có header Origin
  if (!origin || !isProd || allowedOrigins.length === 0) {
    return callback(null, true);
  }
  return callback(null, allowedOrigins.includes(origin));
};

const corsOptions = {
  origin: corsOriginCheck,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fc_ntn';

// Kiểm tra trạng thái kết nối MongoDB động trong thời gian thực
const checkMongo = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);

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

// Lắng nghe kết nối Socket.IO cơ sở & Khởi tạo module phòng sa bàn chiến thuật
io.on('connection', (socket) => {
  console.log(`⚡ Realtime Client kết nối: ${socket.id}`);
});
initTacticsSocket(io);

// Middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());
app.use(securityHeadersMiddleware);
app.use(cors(corsOptions));
app.use('/api', globalRateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware xử lý lỗi payload quá giới hạn an toàn hoặc JSON không hợp lệ
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'Dung lượng dữ liệu gửi lên quá lớn (tối đa 10MB)! Vui lòng nén bớt ảnh hoặc dán link video ngoài.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Dữ liệu JSON gửi lên máy chủ không đúng định dạng!',
      code: 'INVALID_JSON'
    });
  }
  next(err);
});

// Dữ liệu dùng chung Server và Client (Shared SSOT)
const OFFICIAL_PLAYERS = require('./utils/officialPlayers');
const INITIAL_MOMENTS = require('./utils/initialMoments');

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
  moments: [...INITIAL_MOMENTS],
  tactics: [...OFFICIAL_TACTICS],
  fundTransactions: []
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

    console.log('🌱 Synchronizing official tactical playbooks to MongoDB...');
    for (const preset of OFFICIAL_TACTICS) {
      await Tactic.findOneAndUpdate(
        { id: preset.id },
        { $setOnInsert: preset },
        { upsert: true }
      );
    }
    console.log('✅ Synchronized official tactics successfully!');
  } catch (err) {
    console.error('Error during database seeding:', err);
  }
}

// Lắng nghe sự kiện vòng đời kết nối MongoDB
mongoose.connection.on('connected', () => {
  console.log('🌿 MongoDB Connection: Established (readyState = 1)');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Connection: Disconnected! Tự động chuyển sang in-memory fallback.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB Connection: Reconnected successfully!');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

// Khởi tạo kết nối MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
}).then(async () => {
  console.log('🌿 Connected to MongoDB Database successfully!');
  await seedInitialData();
}).catch((err) => {
  console.warn('⚠️ MongoDB initial connection warning (Using in-memory fallback):', err.message);
});

// Shared context truyền vào các router
const routeContext = {
  isMongoConnected: checkMongo,
  fallbackData,
  broadcastDataUpdate,
  requireAdmin,
  requireTreasurer,
  requireAdminOrTreasurer,
  io
};

// =========================================================================
// SYSTEM & COMMON REST API ROUTES
// =========================================================================

// Health / Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: checkMongo() ? 'MongoDB Connected' : 'Local Fallback Mode',
    timestamp: new Date().toISOString()
  });
});

// GET /api/data (Lấy toàn bộ dữ liệu khởi tạo đồng bộ cho Client SPA)
app.get('/api/data', async (req, res) => {
  try {
    if (checkMongo()) {
      let team = await Team.findOne();
      if (!team) {
        team = { name: 'FC TNT', slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống', logo: '⚽' };
      }
      const players = await Player.find().select('-passwordHash').sort({ number: 1 });
      const matches = await Match.find().sort({ createdAt: -1 });
      const moments = await Moment.find().sort({ date: -1, createdAt: -1 });
      const tactics = await Tactic.find().sort({ updatedAt: -1, createdAt: -1 });

      return res.json({
        teamInfo: {
          name: team.name,
          slogan: team.slogan,
          badge: team.logo || '⚽',
          formation: '3-1-2'
        },
        players,
        matches,
        moments,
        tactics
      });
    }

    const safeFallbackPlayers = (fallbackData.players || []).map(p => {
      const copy = { ...p };
      delete copy.passwordHash;
      return copy;
    });

    res.json({
      ...fallbackData,
      players: safeFallbackPlayers
    });
  } catch (err) {
    console.error('Error in GET /api/data:', err);
    res.json(fallbackData);
  }
});

// PUT /api/team (Cập nhật thông tin đội bóng)
app.put('/api/team', requireAdmin, async (req, res) => {
  try {
    const { name, slogan, logo } = req.body;

    if (checkMongo()) {
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
      return res.json({
        name: team.name,
        slogan: team.slogan,
        logo: team.logo
      });
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

    if (checkMongo()) {
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
app.use('/api/ai', createAiRouter(routeContext));
app.use('/api/live-match', createLiveMatchRouter(routeContext));
app.use('/api/moments', createMomentsRouter(routeContext));
app.use('/api/weather', createWeatherRouter());
app.use('/api/tactics', createTacticsRouter(routeContext));
app.use('/api/upload', createUploadRouter(routeContext));
app.use('/api/payments', createPaymentsRouter(routeContext));
app.use('/api/funds', createFundsRouter(routeContext));

// =========================================================================
// STATIC ASSETS & CACHE-OPTIMIZED ROUTES
// =========================================================================

// Cấu hình HTTP Cache tối ưu băng thông (7 ngày trên production, hỗ trợ ETag 304)
const staticCacheOptions = {
  maxAge: isProd ? '7d' : 0,
  etag: true,
  lastModified: true
};

// Phục vụ các thư mục tài nguyên tĩnh công khai phía Client kèm Cache-Control
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticCacheOptions));
app.use('/css', express.static(path.join(__dirname, 'css'), staticCacheOptions));
app.use('/js', express.static(path.join(__dirname, 'js'), staticCacheOptions));
app.use('/utils', express.static(path.join(__dirname, 'utils'), staticCacheOptions));

// Helper gửi icon/ảnh kèm Cache-Control dài hạn
const sendCachedIcon = (filePath) => (req, res) => {
  if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 ngày
  res.sendFile(filePath);
};

// Tương thích ngược cho các icon & logo thư mục gốc/cũ
[
  ['/favicon.ico', 'icons/favicon.ico'],
  ['/favicon.png', 'icons/favicon.png'],
  ['/favicon-48.png', 'icons/favicon-48.png'],
  ['/favicon.svg', 'icons/favicon.svg'],
  ['/apple-touch-icon.png', 'icons/apple-touch-icon.png'],
  ['/assets/favicon-192.png', 'icons/favicon-192.png'],
  ['/assets/logo-512.png', 'images/logo-512.png'],
  ['/assets/logo.png', 'images/logo.png'],
  ['/assets/logo.svg', 'images/logo.svg']
].forEach(([route, rel]) => {
  app.get(route, sendCachedIcon(path.join(__dirname, 'assets', rel)));
});

// Endpoint kiểm tra sức khỏe siêu nhẹ (< 50 bytes) cho ping giữ thức / uptime monitor
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// Các tệp web công khai ở thư mục gốc
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(__dirname, 'sitemap.xml')));
app.get('/', (req, res) => {
  // index.html dùng no-cache, must-revalidate để trình duyệt kiểm tra ETag 304, tránh cache phiên bản cũ
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route fallback cho Single Page App (ngăn rò rỉ các file mã nguồn/cấu hình khi truy cập qua URL)
app.get('*', (req, res) => {
  // Trả về 404 JSON nếu là endpoint API không tồn tại
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint API không tồn tại' });
  }
  // Chặn tải về các file mã nguồn, file cấu hình hoặc script backend
  const sensitiveExtensions = ['.env', '.js', '.json', '.md', '.py', '.git', '.lock'];
  if (sensitiveExtensions.some(ext => req.path.toLowerCase().endsWith(ext))) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server (Hỗ trợ WebSocket Real-time)
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 FC TNT Real-time Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  const maskedUri = MONGODB_URI.includes('@')
    ? MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    : MONGODB_URI;
  console.log(`🌿 Database: ${maskedUri}`);
  console.log(`⚡ Real-time WebSocket: Active`);
  console.log(`=================================================`);
});
