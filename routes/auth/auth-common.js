/**
 * FC TNT - Auth Submodule: Common Security Constants & Helpers (routes/auth/auth-common.js)
 */

const crypto = require('crypto');

// Sinh ngẫu nhiên 32 bytes RAM nếu người dùng chưa kịp cấu hình .env (chống lộ bí mật khi public repo)
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

module.exports = {
  RUNTIME_FALLBACK_SECRET
};
