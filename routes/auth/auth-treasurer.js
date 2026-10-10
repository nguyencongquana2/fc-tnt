/**
 * FC TNT - Auth Submodule: Treasurer Permissions & HMAC-SHA256 (routes/auth/auth-treasurer.js)
 * Quản lý mã PIN Thủ Quỹ, sinh token HMAC SHA-256 và middleware requireTreasurer
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Team = require('../../models/Team');
const { loginRateLimiter } = require('../../utils/rateLimiter');
const { RUNTIME_FALLBACK_SECRET } = require('./auth-common');

function getTreasurerHmacSecret(currentPin) {
  const envSecret = process.env.JWT_SECRET || process.env.TREASURER_SECRET || process.env.ADMIN_SECRET || RUNTIME_FALLBACK_SECRET;
  const pinPart = currentPin || process.env.TREASURER_PIN || 'fc_tnt_treasurer_salt_2026';
  return crypto.createHash('sha256').update(`${envSecret}::fc_tnt_treasurer_salt_2026::${pinPart}`).digest('hex');
}

function generateTreasurerToken(pin) {
  const secret = getTreasurerHmacSecret(pin);
  const now = Date.now();
  const payload = {
    role: 'treasurer',
    iat: now,
    exp: now + (30 * 24 * 60 * 60 * 1000)
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `fc_tnt_treasurer_v1.${payloadB64}.${signature}`;
}

async function getValidTreasurerPins(isMongoConnected) {
  const pins = new Set();

  // 1. Ưu tiên biến môi trường .env (Bảo mật cao nhất)
  if (process.env.TREASURER_PIN && String(process.env.TREASURER_PIN).trim()) {
    pins.add(String(process.env.TREASURER_PIN).trim());
    return Array.from(pins);
  }

  // 2. Lấy từ Database
  const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));
  if (connected) {
    try {
      const team = await Team.findOne();
      if (team && team.treasurerPin) {
        pins.add(String(team.treasurerPin).trim());
      }
    } catch (e) {
      console.warn('[Auth] Không thể đọc Treasurer PIN từ MongoDB:', e.message);
    }
  }

  // 3. Cảnh báo bảo mật nếu chưa cấu hình PIN (Không hardcode PIN dự phòng trong code)
  if (pins.size === 0) {
    console.warn('[Security] CẢNH BÁO: Chưa cấu hình TREASURER_PIN trong .env hoặc Database!');
  }

  return Array.from(pins);
}

async function verifyTreasurerToken(token, isMongoConnected) {
  if (!token || typeof token !== 'string') return false;

  if (token.startsWith('fc_tnt_treasurer_v1.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [, payloadB64, providedSig] = parts;

    try {
      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);

      if (!payload || payload.role !== 'treasurer') return false;
      if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
        return false;
      }

      const validPins = await getValidTreasurerPins(isMongoConnected);
      for (const pin of validPins) {
        const secret = getTreasurerHmacSecret(pin);
        const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
        const expectedBuf = Buffer.from(expectedSig);
        const providedBuf = Buffer.from(providedSig);

        if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('[Auth] Lỗi đối soát Token Thủ Quỹ:', err.message);
      return false;
    }
  }

  return false;
}

// Middleware xác thực quyền Thủ Quỹ (Bắt buộc Token có chữ ký số HMAC-SHA256, triệt tiêu brute-force)
const requireTreasurer = async (req, res, next) => {
  const token = req.headers['x-treasurer-token'];

  if (token) {
    const isValid = await verifyTreasurerToken(token);
    if (isValid) {
      req.isTreasurer = true;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Yêu cầu quyền Thủ Quỹ! Vui lòng đăng nhập mã PIN Thủ Quỹ để thực hiện thao tác này.',
    requireTreasurerAuth: true
  });
};

function registerTreasurerRoutes(router, { isMongoConnected }, { getValidAdminPins, generateAdminToken }) {
  // POST /api/auth/treasurer/login
  router.post('/treasurer/login', loginRateLimiter, async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mã PIN Thủ Quỹ!' });
    }

    const inputPin = String(pin).trim();
    const validPins = await getValidTreasurerPins(isMongoConnected);

    if (validPins.includes(inputPin)) {
      const token = generateTreasurerToken(inputPin);
      return res.json({
        success: true,
        token,
        role: 'treasurer',
        message: 'Đăng thực quyền Thủ Quỹ thành công!'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Mã PIN Thủ Quỹ không chính xác! Vui lòng kiểm tra lại.'
    });
  });

  // GET /api/auth/treasurer/check
  router.get('/treasurer/check', async (req, res) => {
    const token = req.headers['x-treasurer-token'];
    const isValid = await verifyTreasurerToken(token, isMongoConnected);
    res.json({ isTreasurer: isValid });
  });

  // POST /api/auth/pin-login (Đăng nhập mã PIN hợp nhất - Tự động nhận diện Quản Trị hoặc Thủ Quỹ)
  router.post('/pin-login', loginRateLimiter, async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mã PIN Quản trị hoặc Quỹ đội!' });
    }

    const inputPin = String(pin).trim();
    const [validAdminPins, validTreasurerPins] = await Promise.all([
      getValidAdminPins(isMongoConnected),
      getValidTreasurerPins(isMongoConnected)
    ]);

    // 1. Kiểm tra mã PIN Quản trị viên
    if (validAdminPins.includes(inputPin)) {
      const token = generateAdminToken(inputPin);
      return res.json({
        success: true,
        role: 'admin',
        token,
        message: 'Đăng nhập Quản trị viên thành công! Bạn có toàn quyền quản lý đội bóng.'
      });
    }

    // 2. Kiểm tra mã PIN Quỹ đội (Thủ Quỹ)
    if (validTreasurerPins.includes(inputPin)) {
      const token = generateTreasurerToken(inputPin);
      return res.json({
        success: true,
        role: 'treasurer',
        token,
        message: 'Đăng nhập Thủ Quỹ thành công! Đã mở quyền quản lý sổ quỹ và số dư ví.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Mã PIN không chính xác! Vui lòng kiểm tra lại mã Quản trị hoặc mã Quỹ đội.'
    });
  });

  // POST /api/auth/treasurer/change-pin
  router.post('/treasurer/change-pin', requireTreasurer, async (req, res) => {
    try {
      const { newPin } = req.body;
      if (!newPin || String(newPin).trim().length < 4) {
        return res.status(400).json({ success: false, error: 'Mã PIN Thủ Quỹ mới phải có ít nhất 4 ký tự!' });
      }

      const cleanPin = String(newPin).trim();
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : (mongoose.connection && mongoose.connection.readyState === 1));
      if (connected) {
        let team = await Team.findOne();
        if (!team) {
          team = await Team.create({ treasurerPin: cleanPin });
        } else {
          team.treasurerPin = cleanPin;
          await team.save();
        }
      }

      process.env.TREASURER_PIN = cleanPin;
      const newToken = generateTreasurerToken(cleanPin);

      return res.json({
        success: true,
        token: newToken,
        message: `Đã đổi mã PIN Thủ Quỹ thành công sang: ${cleanPin}`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

module.exports = {
  getTreasurerHmacSecret,
  generateTreasurerToken,
  getValidTreasurerPins,
  verifyTreasurerToken,
  requireTreasurer,
  registerTreasurerRoutes
};
