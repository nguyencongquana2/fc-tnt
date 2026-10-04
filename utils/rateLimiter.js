/**
 * FC TNT - Sliding Window Rate Limiter Middleware
 * Ngăn chặn tấn công Brute-force mã PIN và hạn chế lạm dụng Gemini AI API
 */

function createRateLimiter({ windowMs = 60000, max = 30, message = 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }) {
  const hits = new Map(); // ip -> Array<timestamp>

  // Dọn dẹp định kỳ tránh rò rỉ bộ nhớ
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, valid);
      }
    }
  }, Math.max(windowMs, 60000));

  if (cleanupTimer.unref) cleanupTimer.unref();

  return function rateLimiterMiddleware(req, res, next) {
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown';
    const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'unknown';
    const now = Date.now();
    const timestamps = hits.get(ip) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= max) {
      const earliest = validTimestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - earliest)) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSec
      });
    }

    validTimestamps.push(now);
    hits.set(ip, validTimestamps);
    next();
  };
}

// 1. Rate limiter cho đăng nhập PIN (Tối đa 5 lần thử trong 15 phút)
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Bạn đã thử mã PIN quá 5 lần! Để bảo mật hệ thống, vui lòng chờ 15 phút trước khi thử lại.'
});

// 2. Rate limiter cho gọi Gemini AI API (Tối đa 12 lần trong 10 phút)
const aiRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: 'Bạn đã gửi quá nhiều yêu cầu AI liên tiếp. Vui lòng đợi vài phút để hệ thống xử lý.'
});

// 3. Rate limiter cho đăng bình luận (Tối đa 10 bình luận trong 2 phút)
const commentRateLimiter = createRateLimiter({
  windowMs: 2 * 60 * 1000,
  max: 10,
  message: 'Bạn đang gửi bình luận quá nhanh! Vui lòng thử lại sau 2 phút.'
});

// 4. Rate limiter cho thả cảm xúc (Tối đa 40 lượt trong 1 phút)
const reactionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'Bạn đang thả cảm xúc quá nhanh! Vui lòng chờ một lát.'
});

// 5. Rate limiter cho tải ảnh đại diện cầu thủ (Tối đa 10 lần trong 10 phút)
const avatarRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Bạn đã cập nhật ảnh đại diện quá nhiều lần liên tiếp! Vui lòng thử lại sau 10 phút.'
});

// 6. Rate limiter cho tạo/sửa chiến thuật (Tối đa 15 lần trong 5 phút)
const tacticRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: 'Bạn đã lưu quá nhiều bài chiến thuật liên tiếp! Vui lòng chờ ít phút.'
});

// 7. Rate limiter cho upload media (Tối đa 20 lượt trong 5 phút)
const uploadRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Bạn đã tải lên quá nhiều tệp liên tiếp! Vui lòng thử lại sau 5 phút.'
});

// 8. Rate limiter cho Casso Webhook (Tối đa 60 lượt trong 1 phút)
const paymentWebhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Quá nhiều request webhook gửi tới, vui lòng thử lại sau.'
});

/**
 * Sliding Window Rate Limiter chuyên dụng cho WebSocket / Socket.IO events
 * @param {Object} options
 * @param {number} options.windowMs - Độ dài cửa sổ thời gian (ms), mặc định 1000ms
 * @param {number} options.max - Số lượt tối đa được phát sinh trong cửa sổ
 */
function createSocketRateLimiter({ windowMs = 1000, max = 30 }) {
  const socketHits = new Map(); // socketId -> Array<timestamp>

  // Dọn dẹp định kỳ tránh rò rỉ bộ nhớ
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, timestamps] of socketHits.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        socketHits.delete(id);
      } else {
        socketHits.set(id, valid);
      }
    }
  }, Math.max(windowMs * 2, 10000));

  if (cleanupTimer.unref) cleanupTimer.unref();

  return {
    allow(socketId) {
      if (!socketId) return false;
      const now = Date.now();
      const timestamps = socketHits.get(socketId) || [];
      const valid = timestamps.filter(t => now - t < windowMs);

      if (valid.length >= max) {
        return false;
      }

      valid.push(now);
      socketHits.set(socketId, valid);
      return true;
    },
    remove(socketId) {
      socketHits.delete(socketId);
    }
  };
}

module.exports = {
  createRateLimiter,
  createSocketRateLimiter,
  loginRateLimiter,
  aiRateLimiter,
  commentRateLimiter,
  reactionRateLimiter,
  avatarRateLimiter,
  tacticRateLimiter,
  uploadRateLimiter,
  paymentWebhookLimiter
};
