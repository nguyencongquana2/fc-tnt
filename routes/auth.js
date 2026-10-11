/**
 * FC TNT - Auth & Admin Permissions Router (routes/auth.js)
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các submodule từ thư mục routes/auth/:
 * - auth-admin.js: Mã PIN Admin, sinh token HMAC, middleware requireAdmin & routes admin
 * - auth-treasurer.js: Mã PIN Thủ Quỹ, sinh token HMAC, middleware requireTreasurer & routes thủ quỹ
 * - auth-player.js: PBKDF2 hash mật khẩu cầu thủ, token thành viên, đổi pass, hồ sơ & cấp tài khoản
 */

const express = require('express');

// Nạp các submodule chuyên biệt từ routes/auth/
const {
  getHmacSecret,
  generateAdminToken,
  getValidAdminPins,
  validateAdminPin,
  verifyAdminToken,
  requireAdmin,
  registerAdminRoutes
} = require('./auth/auth-admin');

const {
  getTreasurerHmacSecret,
  generateTreasurerToken,
  getValidTreasurerPins,
  validateTreasurerPin,
  verifyTreasurerToken,
  requireTreasurer,
  registerTreasurerRoutes
} = require('./auth/auth-treasurer');

const {
  hashPassword,
  verifyPassword,
  sanitizePlayer,
  getPlayerTokenSecret,
  generatePlayerToken,
  verifyPlayerToken,
  requirePlayerAuth,
  registerPlayerRoutes
} = require('./auth/auth-player');

function createAuthRouter(context) {
  const router = express.Router();

  // 1. Đăng ký các route Quản trị viên (/login, /change-pin, /check)
  registerAdminRoutes(router, context);

  // 2. Đăng ký các route Thủ Quỹ & Đăng nhập PIN hợp nhất (/treasurer/*, /pin-login)
  registerTreasurerRoutes(router, context, { getValidAdminPins, generateAdminToken, validateAdminPin });

  // 3. Đăng ký các route Tài khoản Thành viên & Hồ sơ (/player/*)
  registerPlayerRoutes(router, { ...context, requireAdmin });

  return router;
}

// Middleware xác thực liên thông Quản trị viên HOẶC Thủ Quỹ (Dành cho nghiệp vụ tài chính trận đấu)
const requireAdminOrTreasurer = async (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  const treasurerToken = req.headers['x-treasurer-token'];

  if (adminToken && await verifyAdminToken(adminToken)) {
    req.isAdmin = true;
    return next();
  }

  if (treasurerToken && await verifyTreasurerToken(treasurerToken)) {
    req.isTreasurer = true;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Yêu cầu quyền Quản trị viên hoặc Thủ quỹ để thực hiện thao tác này!'
  });
};

module.exports = {
  createAuthRouter,
  requireAdmin,
  requireTreasurer,
  requireAdminOrTreasurer,
  requirePlayerAuth,
  verifyAdminToken,
  verifyTreasurerToken,
  verifyPlayerToken,
  getValidAdminPins,
  getValidTreasurerPins,
  validateAdminPin,
  validateTreasurerPin,
  generateAdminToken,
  generateTreasurerToken,
  generatePlayerToken,
  hashPassword,
  verifyPassword,
  sanitizePlayer,
  getHmacSecret,
  getTreasurerHmacSecret,
  getPlayerTokenSecret
};
