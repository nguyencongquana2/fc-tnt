---
trigger: always_on
---

# Coding & Security Standards (FC TNT Web)

## 1. Kiến Trúc & Codebase
- **Giới hạn file**: Tối đa 400 - 500 dòng/file. Tách sub-module chuyên biệt nếu phình to.
- **Tách tầng**: UI/DOM tách rời `state.js`; logic giải đấu chia nhỏ theo domain; backend router tách theo thư mục `routes/` (auth, matches, moments, players, ai, weather).
- **Zero-Dependency**: Ưu tiên Vanilla JS/CSS. Không cài npm packages ngoài khi giải quyết được bằng JS tiêu chuẩn.
- **Kiểm tra cú pháp**: Chạy `node -c <file_path>` trước khi kết thúc tác vụ.

## 2. DRY, SSOT & Client Namespace
- Dữ liệu/thuật toán dùng chung Client-Server bắt buộc đặt tại `utils/` và đóng gói chuẩn UMD. Cấm trùng lặp danh sách cầu thủ, regex, mapping tên ở 2 phía.
- Cấm gán biến trực tiếp vào `window.*`. Mọi module đăng ký qua Service Locator `window.TNT` (`TNT.state`, `TNT.matches`, `TNT.bus`, `TNT.auth`...).
- Giao tiếp client bắt buộc dùng Event Bus: `TNT.bus.emit('event', payload)` và `TNT.bus.on('event', cb)`.

## 3. Khả Năng Chịu Lỗi & Đồng Bộ (Resilience)
- Cấm `catch (e) {}` rỗng. Luôn log `console.warn('[Module] Action failed:', e.message)` hoặc hiển thị `showToast()`.
- Thao tác API bọc qua hàm xử lý trung tâm (hỗ trợ Optimistic UI + lưu LocalStorage khi mất mạng).
- MongoDB/Mongoose: Bắt buộc lắng nghe sự kiện vòng đời (`disconnected`, `reconnected`, `error`) để fallback sang memory cache, tránh crash server.

## 4. Tiêu Chuẩn Bảo Mật
- **XSS**: Dữ liệu user/API trước khi gán `.innerHTML` bắt buộc qua `escapeHtml()`. Ưu tiên `.textContent` hoặc `document.createElement()`.
- **Phân quyền**: Toàn bộ endpoint POST/PUT/DELETE, quỹ đội bóng, tiền sân, thẻ phạt bắt buộc dùng middleware `requireAdmin`. Cấm hardcode/bypass token admin.
- **Rate Limit**: Bắt buộc `loginRateLimiter` cho `/api/auth/login` và `aiRateLimiter` cho `/api/ai/*`, `/api/weather/ai-consultant`.
- **Static Whitelist**: Cấm `app.use(express.static('.'))`. Chỉ public whitelist: `public`, `css`, `js`, `utils`, `assets`.

## 5. Tài Liệu Hóa
- Bắt buộc cập nhật ngay `ARCHITECTURE.md` khi tạo mới hoặc di dời module, helper, router.