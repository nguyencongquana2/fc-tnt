/**
 * FC TNT - Auth Submodule: Common Security Constants & Helpers (routes/auth/auth-common.js)
 */

const crypto = require('crypto');

// Sinh ngẫu nhiên 32 bytes RAM nếu người dùng chưa kịp cấu hình .env (chống lộ bí mật khi public repo)
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

// Băm mã PIN an toàn chuẩn PBKDF2-SHA512 kèm Salt ngẫu nhiên 16 bytes
function hashPin(pin) {
  if (!pin || typeof pin !== 'string') return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(pin).trim(), salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Đối soát mã PIN (hỗ trợ cả hash PBKDF2 mới lẫn plaintext cũ với timingSafeEqual)
function verifyPinHash(inputPin, storedValue) {
  if (!inputPin || !storedValue || typeof storedValue !== 'string') return false;
  const cleanInput = String(inputPin).trim();
  const cleanStored = String(storedValue).trim();

  // 1. Dạng PBKDF2 hash (chứa ký tự ':')
  if (cleanStored.includes(':')) {
    try {
      const [salt, expectedHash] = cleanStored.split(':');
      if (!salt || !expectedHash) return false;
      const computedHash = crypto.pbkdf2Sync(cleanInput, salt, 10000, 64, 'sha512').toString('hex');
      const hashBuf = Buffer.from(expectedHash, 'hex');
      const compBuf = Buffer.from(computedHash, 'hex');
      if (hashBuf.length !== compBuf.length) return false;
      return crypto.timingSafeEqual(hashBuf, compBuf);
    } catch (e) {
      return false;
    }
  }

  // 2. Tương thích ngược: plaintext cũ với timingSafeEqual
  const inBuf = Buffer.from(cleanInput);
  const stBuf = Buffer.from(cleanStored);
  if (inBuf.length !== stBuf.length) return false;
  return crypto.timingSafeEqual(inBuf, stBuf);
}

module.exports = {
  RUNTIME_FALLBACK_SECRET,
  hashPin,
  verifyPinHash
};
