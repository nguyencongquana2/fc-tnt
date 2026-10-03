/**
 * FC TNT - Auth & Admin Permissions Router
 * Quản lý mã PIN quản trị viên, xác thực token HMAC SHA-256 và phân quyền thao tác
 */

const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { loginRateLimiter } = require('../utils/rateLimiter');
const { isValidAvatar } = require('../utils/validators');

// =========================================================================
// MẬT KHẨU & BẢO MẬT TÀI KHOẢN CẦU THỦ (PBKDF2 NATIVE CRYPTO)
// =========================================================================

// Băm mật khẩu bằng PBKDF2 chuẩn NIST kèm Salt ngẫu nhiên 16 bytes
function hashPassword(password) {
  if (!password || typeof password !== 'string') return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Kiểm tra mật khẩu (Sử dụng timingSafeEqual chống tấn công thời gian)
function verifyPassword(password, stored) {
  if (!password || !stored || typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }
  try {
    const [salt, expectedHash] = stored.split(':');
    if (!salt || !expectedHash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const hashBuf = Buffer.from(expectedHash, 'hex');
    const compBuf = Buffer.from(computedHash, 'hex');
    if (hashBuf.length !== compBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, compBuf);
  } catch (err) {
    console.warn('[Auth] Lỗi đối soát mật khẩu:', err.message);
    return false;
  }
}

// Làm sạch thông tin cầu thủ trước khi trả về client (Triệt tiêu rủi ro lộ passwordHash)
function sanitizePlayer(player) {
  if (!player) return null;
  const obj = typeof player.toObject === 'function' ? player.toObject() : { ...player };
  delete obj.passwordHash;
  return obj;
}

// Sinh ngẫu nhiên 32 bytes RAM nếu người dùng chưa kịp cấu hình .env (chống lộ bí mật khi public repo)
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');


// Secret ký Token cầu thủ
function getPlayerTokenSecret() {
  const envSecret = process.env.JWT_SECRET || process.env.ADMIN_SECRET || RUNTIME_FALLBACK_SECRET;
  return crypto.createHash('sha256').update(`${envSecret}::fc_tnt_player_token_salt`).digest('hex');
}

// Sinh token định danh cho Cầu thủ (Hạn dùng 30 ngày)
function generatePlayerToken(player) {
  const secret = getPlayerTokenSecret();
  const now = Date.now();
  const payload = {
    playerId: player.id,
    username: player.username || '',
    name: player.name || '',
    role: player.role || 'player',
    iat: now,
    exp: now + (30 * 24 * 60 * 60 * 1000)
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `fc_tnt_p1.${payloadB64}.${signature}`;
}

// Xác thực token Cầu thủ
function verifyPlayerToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('fc_tnt_p1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payloadB64, providedSig] = parts;

  try {
    const secret = getPlayerTokenSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    const expectedBuf = Buffer.from(expectedSig);
    const providedBuf = Buffer.from(providedSig);

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return null;
    }

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (!payload || !payload.playerId) return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;

    return payload;
  } catch (err) {
    console.warn('[Auth] Lỗi giải mã token cầu thủ:', err.message);
    return null;
  }
}

// Middleware xác thực quyền thành viên
const requirePlayerAuth = (req, res, next) => {
  const token = req.headers['x-player-token'];
  const session = verifyPlayerToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Phiên đăng nhập thành viên đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!',
      requirePlayerLogin: true
    });
  }
  req.playerSession = session;
  next();
};

// =========================================================================
// MẬT KHẨU & BẢO MẬT QUẢN TRỊ VIÊN (ADMIN HMAC-SHA256)
// =========================================================================

// Secret ký chữ ký số HMAC an toàn kết hợp salt máy chủ và mã PIN
function getHmacSecret(currentPin) {
  const envSecret = process.env.JWT_SECRET || process.env.ADMIN_SECRET || RUNTIME_FALLBACK_SECRET;
  const pinPart = currentPin || process.env.ADMIN_PIN || 'fc_tnt_default_salt';
  return crypto.createHash('sha256').update(`${envSecret}::fc_tnt_auth_salt_2026::${pinPart}`).digest('hex');
}

// Sinh token Admin có chữ ký số HMAC-SHA256, mốc thời gian và hạn sử dụng
function generateAdminToken(pin) {
  const secret = getHmacSecret(pin);
  const now = Date.now();
  const payload = {
    role: 'admin',
    iat: now,
    exp: now + (30 * 24 * 60 * 60 * 1000) // Hạn sử dụng 30 ngày
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `fc_tnt_v2.${payloadB64}.${signature}`;
}

// Lấy mã PIN Quản trị viên hiện tại (ưu tiên biến môi trường ADMIN_PIN trên Render / .env)
async function getValidAdminPins(isMongoConnected) {
  const pins = new Set();

  // 1. Mã từ biến môi trường Render / .env (Ưu tiên tuyệt đối)
  if (process.env.ADMIN_PIN && String(process.env.ADMIN_PIN).trim()) {
    pins.add(String(process.env.ADMIN_PIN).trim());
    return Array.from(pins);
  }

  // 2. Mã từ MongoDB Database
  const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));
  if (connected) {
    try {
      const team = await Team.findOne();
      if (team && team.adminPin) {
        pins.add(String(team.adminPin).trim());
      }
    } catch (e) {
      console.warn('[Auth] Không thể đọc Admin PIN từ MongoDB:', e.message);
    }
  }

  // 3. Fallback mặc định an toàn nếu chưa từng cấu hình PIN
  if (pins.size === 0) {
    pins.add('123456');
  }

  return Array.from(pins);
}

// Xác thực token Admin bằng HMAC SHA-256 (có timingSafeEqual chống tấn công thời gian)
async function verifyAdminToken(token, isMongoConnected) {
  if (!token || typeof token !== 'string') return false;

  // 1. Kiểm tra Token HMAC v2
  if (token.startsWith('fc_tnt_v2.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [, payloadB64, providedSig] = parts;

    try {
      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);

      if (!payload || payload.role !== 'admin') return false;
      if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
        console.warn('[Auth] Token HMAC đã hết hạn');
        return false;
      }

      const validPins = await getValidAdminPins(isMongoConnected);
      if (validPins.length === 0) return false;

      // Xác thực chữ ký đối soát với các PIN hợp lệ
      for (const pin of validPins) {
        const secret = getHmacSecret(pin);
        const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

        const expectedBuf = Buffer.from(expectedSig);
        const providedBuf = Buffer.from(providedSig);

        if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('[Auth] Lỗi xác thực token HMAC v2:', err.message);
      return false;
    }
  }

  // 2. Fallback tương thích ngược an toàn cho token v1 (trong giai đoạn chuyển đổi)
  if (token.startsWith('fc_tnt_admin_')) {
    try {
      const base64Part = token.slice('fc_tnt_admin_'.length);
      if (!base64Part) return false;
      const decodedPin = Buffer.from(base64Part, 'base64').toString('utf8').trim();
      if (!decodedPin) return false;

      const validPins = await getValidAdminPins(isMongoConnected);
      return validPins.includes(decodedPin);
    } catch (err) {
      console.warn('[Auth] Lỗi giải mã token v1:', err.message);
      return false;
    }
  }

  return false;
}

// Middleware xác thực quyền Admin cho các thao tác thêm / sửa / xóa dữ liệu
const requireAdmin = async (req, res, next) => {
  const token = req.headers['x-admin-token'];
  const isValid = await verifyAdminToken(token);
  if (isValid) {
    return next();
  }
  return res.status(401).json({
    error: 'Yêu cầu quyền Quản trị viên! Vui lòng đăng nhập mã PIN để thực hiện thao tác này.',
    requireAuth: true
  });
};

function createAuthRouter({ isMongoConnected, fallbackData, broadcastDataUpdate }) {
  const router = express.Router();

  // POST /api/auth/login (Có bảo vệ chống tấn công Brute-force mã PIN)
  router.post('/login', loginRateLimiter, async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mã PIN!' });
    }

    const inputPin = String(pin).trim();
    const validPins = await getValidAdminPins(isMongoConnected);

    if (validPins.includes(inputPin)) {
      const token = generateAdminToken(inputPin);
      return res.json({
        success: true,
        token,
        message: 'Đăng nhập Quản trị viên thành công!'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Mã PIN không chính xác! Vui lòng kiểm tra lại.'
    });
  });

  // POST /api/auth/change-pin
  router.post('/change-pin', requireAdmin, async (req, res) => {
    try {
      const { newPin } = req.body;
      if (!newPin || String(newPin).trim().length < 4) {
        return res.status(400).json({ success: false, error: 'Mã PIN mới phải có ít nhất 4 ký tự!' });
      }

      const cleanPin = String(newPin).trim();
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));
      if (connected) {
        let team = await Team.findOne();
        if (!team) {
          team = await Team.create({ adminPin: cleanPin });
        } else {
          team.adminPin = cleanPin;
          await team.save();
        }
      }

      process.env.ADMIN_PIN = cleanPin;
      const newToken = generateAdminToken(cleanPin);

      return res.json({
        success: true,
        token: newToken,
        message: `Đã đổi mã PIN Quản trị thành công sang: ${cleanPin}`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/auth/check
  router.get('/check', async (req, res) => {
    const token = req.headers['x-admin-token'];
    const isValid = await verifyAdminToken(token, isMongoConnected);
    res.json({ isAdmin: isValid });
  });

  // =========================================================================
  // ENDPOINTS TÀI KHOẢN THÀNH VIÊN (MEMBER AUTH & PROFILE APIS)
  // =========================================================================

  // POST /api/auth/player/login (Đăng nhập thành viên - có rate limit chống brute-force)
  router.post('/player/login', loginRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng nhập tên đăng nhập (hoặc số điện thoại) và mật khẩu!'
        });
      }

      const cleanUser = String(username).trim().toLowerCase();
      const cleanPass = String(password);
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));

      let player = null;
      if (connected) {
        player = await Player.findOne({
          $or: [
            { username: cleanUser },
            { phone: String(username).trim() }
          ]
        });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        player = fallbackData.players.find(p =>
          (p.username && p.username.toLowerCase() === cleanUser) ||
          (p.phone && p.phone === String(username).trim())
        );
      }

      if (!player) {
        return res.status(401).json({
          success: false,
          error: 'Tài khoản không tồn tại! Vui lòng kiểm tra lại tên đăng nhập hoặc liên hệ Đội trưởng.'
        });
      }

      // Kiểm tra xem tài khoản đã được cấp mật khẩu hay chưa
      if (player.accountStatus === 'unprovisioned' || !player.passwordHash) {
        return res.status(403).json({
          success: false,
          error: 'Tài khoản của bạn chưa được cấp mật khẩu khởi tạo! Vui lòng liên hệ Đội trưởng để nhận tài khoản.'
        });
      }

      if (player.accountStatus === 'locked') {
        return res.status(403).json({
          success: false,
          error: 'Tài khoản này đang tạm thời bị khóa. Vui lòng liên hệ Đội trưởng!'
        });
      }

      const isMatch = verifyPassword(cleanPass, player.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Mật khẩu không chính xác! Vui lòng kiểm tra lại.'
        });
      }

      // Cập nhật mốc đăng nhập gần nhất
      player.lastLogin = new Date();
      if (connected && typeof player.save === 'function') {
        await player.save();
      }

      const token = generatePlayerToken(player);
      const safePlayer = sanitizePlayer(player);

      return res.json({
        success: true,
        token,
        player: safePlayer,
        mustChangePassword: Boolean(player.mustChangePassword),
        message: `Chào mừng ${player.nickname || player.name} quay trở lại sân cỏ!`
      });
    } catch (err) {
      console.warn('[Auth] Player login error:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đăng nhập thành viên!' });
    }
  });

  // POST /api/auth/player/change-password (Đổi mật khẩu cho thành viên)
  router.post('/player/change-password', requirePlayerAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const { playerId } = req.playerSession;

      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự!'
        });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));
      let player = null;

      if (connected) {
        player = await Player.findOne({ id: playerId });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        player = fallbackData.players.find(p => p.id === playerId);
      }

      if (!player) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ cầu thủ!' });
      }

      // Nếu tài khoản đã có mật khẩu cũ thì bắt buộc đối soát mật khẩu hiện tại
      if (player.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu hiện tại của bạn!' });
        }
        const isMatch = verifyPassword(String(currentPassword), player.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không chính xác!' });
        }
      }

      // Băm mật khẩu mới bằng PBKDF2
      player.passwordHash = hashPassword(String(newPassword));
      player.mustChangePassword = false;
      player.accountStatus = 'active';

      if (connected && typeof player.save === 'function') {
        await player.save();
      }

      return res.json({
        success: true,
        message: 'Đổi mật khẩu thành công! Bạn hãy ghi nhớ mật khẩu mới để đăng nhập các lần sau.'
      });
    } catch (err) {
      console.warn('[Auth] Player change-password error:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đổi mật khẩu!' });
    }
  });

  // POST /api/auth/player/provision (Admin cấp tài khoản & mật khẩu ban đầu cho cầu thủ)
  router.post('/player/provision', requireAdmin, async (req, res) => {
    try {
      const { playerId, username, tempPassword } = req.body;
      if (!playerId || !username || !tempPassword) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp đầy đủ: ID cầu thủ, tên đăng nhập và mật khẩu khởi tạo!'
        });
      }

      const cleanUser = String(username).trim().toLowerCase();
      const cleanPass = String(tempPassword).trim();

      if (cleanUser.length < 3) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự!' });
      }
      if (cleanPass.length < 4) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 4 ký tự!' });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));

      // Kiểm tra xem username đã bị cầu thủ khác dùng chưa
      if (connected) {
        const existing = await Player.findOne({ username: cleanUser, id: { $ne: playerId } });
        if (existing) {
          return res.status(400).json({
            success: false,
            error: `Tên đăng nhập "${cleanUser}" đã được cấp cho cầu thủ "${existing.name}". Vui lòng chọn tên khác!`
          });
        }
      }

      let player = null;
      if (connected) {
        player = await Player.findOne({ id: playerId });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        player = fallbackData.players.find(p => p.id === playerId);
      }

      if (!player) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy cầu thủ cần cấp tài khoản!' });
      }

      const isReset = Boolean(player.username && player.passwordHash && player.accountStatus !== 'unprovisioned');

      // Cập nhật thông tin tài khoản
      player.username = cleanUser;
      player.passwordHash = hashPassword(cleanPass);
      player.mustChangePassword = true;
      player.accountStatus = 'active';

      if (connected && typeof player.save === 'function') {
        await player.save();
      }

      // Văn bản mẫu tiện gửi qua Zalo / Messenger theo ngữ cảnh
      const shareText = isReset ? `⚽ THÔNG BÁO ĐẶT LẠI MẬT KHẨU FC TNT:
👤 Cầu thủ: ${player.name} (#${player.number})
🔑 Tên đăng nhập: ${cleanUser}
🔒 Mật khẩu tạm mới: ${cleanPass}
👉 Mật khẩu của bạn vừa được Ban Quản Trị đặt lại tạm thời. Vui lòng đăng nhập website FC TNT và đổi mật khẩu mới nhé anh em!` : `⚽ TÀI KHOẢN FC TNT CỦA BẠN:
👤 Cầu thủ: ${player.name} (#${player.number})
🔑 Tên đăng nhập: ${cleanUser}
🔒 Mật khẩu khởi tạo: ${cleanPass}
👉 Truy cập website FC TNT để đăng nhập và đổi mật khẩu cá nhân nhé anh em!`;

      if (typeof broadcastDataUpdate === 'function') {
        const broadcastMsg = isReset
          ? `🔑 Mật khẩu tài khoản của cầu thủ "${player.name}" vừa được Ban Quản Trị đặt lại!`
          : `🔑 Cầu thủ "${player.name}" vừa được cấp tài khoản thành viên!`;
        broadcastDataUpdate('players', broadcastMsg);
      }

      return res.json({
        success: true,
        player: sanitizePlayer(player),
        shareText,
        isReset,
        message: isReset
          ? `Đã đặt lại mật khẩu tạm thời thành công cho cầu thủ "${player.name}"!`
          : `Đã cấp tài khoản thành công cho cầu thủ "${player.name}"!`
      });
    } catch (err) {
      console.warn('[Auth] Player provision error:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xử lý tài khoản!' });
    }
  });

  // GET /api/auth/player/me (Lấy thông tin tài khoản đang đăng nhập)
  router.get('/player/me', requirePlayerAuth, async (req, res) => {
    try {
      const { playerId } = req.playerSession;
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));

      let player = null;
      if (connected) {
        player = await Player.findOne({ id: playerId });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        player = fallbackData.players.find(p => p.id === playerId);
      }

      if (!player) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ cầu thủ!' });
      }

      return res.json({
        success: true,
        player: sanitizePlayer(player),
        mustChangePassword: Boolean(player.mustChangePassword)
      });
    } catch (err) {
      console.warn('[Auth] Player me error:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy thông tin!' });
    }
  });

  // PUT /api/auth/player/profile (Cầu thủ tự cập nhật thông tin cá nhân của chính mình)
  router.put('/player/profile', requirePlayerAuth, async (req, res) => {
    try {
      const { playerId } = req.playerSession;
      const {
        nickname,
        number,
        position,
        avatar,
        preferredFoot,
        height,
        weight,
        bio,
        bankCode,
        bankAccountNumber,
        bankAccountName,
        phone
      } = req.body;

      // Kiểm tra tính hợp lệ của avatar nếu có cập nhật
      if (avatar !== undefined && avatar !== null && !isValidAvatar(avatar)) {
        return res.status(400).json({
          success: false,
          error: 'Ảnh đại diện không hợp lệ! Vui lòng chọn ảnh định dạng hợp lệ (tối đa 2.5MB).'
        });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));
      let player = null;

      if (connected) {
        player = await Player.findOne({ id: playerId });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        player = fallbackData.players.find(p => p.id === playerId);
      }

      if (!player) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy cầu thủ!' });
      }

      // Cập nhật các trường được phép
      if (nickname !== undefined) player.nickname = String(nickname).trim();
      if (number !== undefined && !isNaN(parseInt(number))) player.number = parseInt(number);
      if (position && ['GK', 'DF', 'MF', 'FW'].includes(position)) player.position = position;
      if (avatar) player.avatar = String(avatar).trim();
      if (preferredFoot && ['L', 'R', 'both'].includes(preferredFoot)) player.preferredFoot = preferredFoot;
      if (height !== undefined) player.height = Number(height) || 0;
      if (weight !== undefined) player.weight = Number(weight) || 0;
      if (bio !== undefined) player.bio = String(bio).trim();
      if (phone !== undefined) player.phone = String(phone).trim();
      if (bankCode !== undefined) player.bankCode = String(bankCode).trim();
      if (bankAccountNumber !== undefined) player.bankAccountNumber = String(bankAccountNumber).trim();
      if (bankAccountName !== undefined) player.bankAccountName = String(bankAccountName).trim();

      if (connected && typeof player.save === 'function') {
        await player.save();
      }

      if (typeof broadcastDataUpdate === 'function') {
        broadcastDataUpdate('players', `👤 Cầu thủ "${player.name}" vừa cập nhật hồ sơ cá nhân!`);
      }

      return res.json({
        success: true,
        player: sanitizePlayer(player),
        message: 'Đã cập nhật hồ sơ cá nhân thành công!'
      });
    } catch (err) {
      console.warn('[Auth] Player update profile error:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật hồ sơ!' });
    }
  });

  return router;
}

module.exports = {
  createAuthRouter,
  requireAdmin,
  requirePlayerAuth,
  verifyAdminToken,
  verifyPlayerToken,
  getValidAdminPins,
  generateAdminToken,
  generatePlayerToken,
  hashPassword,
  verifyPassword,
  sanitizePlayer,
  getHmacSecret
};
