/**
 * FC TNT - Auth Submodule: Admin Permissions & HMAC-SHA256 (routes/auth/auth-admin.js)
 * Quản lý mã PIN quản trị viên, sinh token HMAC SHA-256 và middleware requireAdmin
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Team = require('../../models/Team');
const { loginRateLimiter } = require('../../utils/rateLimiter');
const { RUNTIME_FALLBACK_SECRET } = require('./auth-common');

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

// Lấy mã PIN Quản trị viên hiện tại (ưu tiên biến môi trường Render / .env)
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

function registerAdminRoutes(router, { isMongoConnected }) {
  // POST /api/auth/login (Đăng nhập Quản trị viên)
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

  // POST /api/auth/change-pin (Đổi mã PIN Quản trị viên)
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

  // GET /api/auth/check (Kiểm tra token Quản trị viên)
  router.get('/check', async (req, res) => {
    const token = req.headers['x-admin-token'];
    const isValid = await verifyAdminToken(token, isMongoConnected);
    res.json({ isAdmin: isValid });
  });
}

module.exports = {
  getHmacSecret,
  generateAdminToken,
  getValidAdminPins,
  verifyAdminToken,
  requireAdmin,
  registerAdminRoutes
};
