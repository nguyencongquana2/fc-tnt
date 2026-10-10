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
  verifyAdminToken,
  requireAdmin,
  registerAdminRoutes
} = require('./auth/auth-admin');

const {
  getTreasurerHmacSecret,
  generateTreasurerToken,
  getValidTreasurerPins,
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
  registerTreasurerRoutes(router, context, { getValidAdminPins, generateAdminToken });

  // 3. Đăng ký các route Tài khoản Thành viên & Hồ sơ (/player/*)
  registerPlayerRoutes(router, { ...context, requireAdmin });

  return router;
}

module.exports = {
  createAuthRouter,
  requireAdmin,
  requireTreasurer,
  requirePlayerAuth,
  verifyAdminToken,
  verifyTreasurerToken,
  verifyPlayerToken,
  getValidAdminPins,
  getValidTreasurerPins,
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
