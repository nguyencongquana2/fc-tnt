/**
 * FC TNT - Security HTTP Headers Middleware (Zero-Dependency)
 * Thiết lập các tiêu chuẩn an toàn HTTP Headers chống Clickjacking, XSS, MIME-sniffing, Data Injection và che giấu thông tin máy chủ
 */

function securityHeadersMiddleware(req, res, next) {
  // 1. Che giấu thông tin công nghệ máy chủ (Express / Node.js)
  res.removeHeader('X-Powered-By');

  // 2. Chống MIME-sniffing: Trình duyệt phải tuân thủ nghiêm ngặt Content-Type khai báo
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Chống Clickjacking: Ngăn chặn trang bị nhúng lén vào iframe của tên miền độc hại
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 4. Kích hoạt bộ lọc XSS trên các trình duyệt cũ
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 5. Kiểm soát Referrer: Chỉ gửi origin khi điều hướng liên kết ngoài qua giao thức an toàn
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Chính sách phần cứng (Permissions-Policy):
  // Cho phép microphone trên cùng origin (dành cho tính năng Live Match Voice Logger), vô hiệu hóa camera, geolocation, payment
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), display-capture=()');

  // 7. Cách ly ngữ cảnh duyệt web (Cross-Origin-Opener-Policy)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // 8. HSTS (Strict-Transport-Security): Ép buộc sử dụng HTTPS trên Production / Render
  if (process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https' || req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // 9. Content Security Policy (CSP): Bảo vệ tài nguyên tải vào SPA
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://images.unsplash.com https://img.vietqr.io https://api.vietqr.io https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https://api.open-meteo.com https://generativelanguage.googleapis.com https:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.facebook.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
}

module.exports = {
  securityHeadersMiddleware
};
