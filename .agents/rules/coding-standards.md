---
trigger: always_on
---

# Quy Tắc Chuẩn Lập Trình & Bảo Mật Workspace (FC TNT Web)

Bộ quy tắc này được thiết lập để ngăn chặn vĩnh viễn các phản mẫu thiết kế (Anti-patterns) và các lỗ hổng bảo mật đã từng xuất hiện trong dự án. Mọi Agent khi đọc, viết hoặc sửa đổi mã nguồn trong workspace BẮT BUỘC phải tuân thủ nghiêm ngặt:

---

## 1. Nguyên Tắc Trách Nhiệm Đơn Lẻ (Single Responsibility Principle - SRP)
- **Giới hạn kích thước tệp**: Không viết các tệp nguyên khối (Monolith) vượt quá 400 - 500 dòng lệnh. Nếu một tệp bắt đầu phình to, phải tách thành các sub-module chuyên biệt.
- **Tách bạch nhiệm vụ rõ ràng**:
  - Module giao diện (UI/DOM Render) tách biệt hoàn toàn khỏi module quản lý trạng thái (`state.js`).
  - Logic tính toán giải đấu / sự kiện trận đấu (`matches-events.js`, `matches-live.js`, `matches-list.js`) không được viết chung vào một hàm khổng lồ.
  - Các router backend phải được tách theo từng domain nghiệp vụ trong thư mục `routes/` (auth, matches, moments, players, ai, weather).

---

## 2. Nguyên Tắc DRY (Don't Repeat Yourself) & Nguồn Sự Thật Duy Nhất (SSOT)
- **Tái sử dụng mã đa nền tảng (Frontend & Backend)**:
  - Mọi dữ liệu dùng chung (danh sách cầu thủ mặc định, thuật toán chuẩn hóa tên/biệt danh, hằng số cấu hình) BẮT BUỘC đặt trong thư mục `utils/`.
  - Sử dụng chuẩn **Universal Module Definition (UMD)**:
    ```javascript
    (function (root, factory) {
      if (typeof module === 'object' && module.exports) {
        module.exports = factory();
      } else {
        root.MyUtil = factory();
      }
    })(typeof self !== 'undefined' ? self : this, function () { ... });
    ```
- **Nghiêm cấm sao chép dữ liệu tĩnh**: Không bao giờ khai báo trùng lặp danh sách cầu thủ, regex phân tích, hoặc bảng ánh xạ biệt danh ở cả hai phía client và server.

---

## 3. Khử Khớp Nối Chặt (Loose Coupling) & Bảo Vệ Global Namespace
- **Không làm ô nhiễm biến toàn cục (`window.*`)**:
  - Tuyệt đối không gắn bừa bãi biến trạng thái hoặc hàm tiện ích lên trực tiếp `window.*` (như `window.currentMatch`, `window.allMatches`, `window.saveMatch`).
  - Toàn bộ các module phía client BẮT BUỘC phải đăng ký và tương tác thông qua **Service Locator** tập trung: `window.TNT` (`TNT.state`, `TNT.matches`, `TNT.bus`, `TNT.auth`, v.v.).
- **Giao tiếp bất đồng bộ qua Event Bus**:
  - Các module độc lập phải phát tín hiệu và lắng nghe thông qua `TNT.bus.emit('event', payload)` và `TNT.bus.on('event', callback)`, tránh việc module này gọi trực tiếp hàm nội bộ của module khác.

---

## 4. Xử Lý Ngoại Lệ & Khả Năng Chống Chịu (Error Handling & Resilience)
- **NGHIÊM CẤM EMPTY CATCH BLOCKS**:
  - Tuyệt đối không viết khối `try { ... } catch (e) {}` trống rỗng nuốt lỗi (silent error).
  - Tối thiểu phải ghi nhận log có ngữ cảnh rõ ràng: `console.warn('[ModuleName] Action failed:', e.message);` hoặc hiển thị thông báo lỗi trên UI (`showToast`).
- **Cơ chế Fallback & Đồng bộ an toàn**:
  - Mọi thao tác đồng bộ mạng (Sync API) phải bọc qua hàm xử lý trung tâm (ví dụ `_syncToServer`) để vừa cập nhật LocalStorage tức thời (Optimistic UI), vừa phát hiện và phục hồi khi mất kết nối mạng.
  - Kết nối cơ sở dữ liệu (Mongoose/MongoDB) phải luôn lắng nghe sự kiện vòng đời (`disconnected`, `reconnected`, `error`) để chuyển đổi mượt mà sang in-memory cache mà không gây crash ứng dụng.

---

## 5. Tiêu Chuẩn Bảo Mật Nghiêm Ngặt (Security Best Practices)
- **Phòng chống XSS (Cross-Site Scripting)**:
  - Bất kỳ dữ liệu nào đến từ người dùng hoặc API (tên cầu thủ, bình luận khoảnh khắc, phân tích Gemini AI) trước khi render vào DOM bằng `.innerHTML` BẮT BUỘC phải được làm sạch qua hàm `escapeHtml()`.
  - Ưu tiên sử dụng `element.textContent` hoặc `document.createElement()` đối với dữ liệu văn bản thuần túy.
- **Kiểm soát truy cập (Broken Access Control Prevention)**:
  - Mọi endpoint REST API có khả năng ghi/sửa/xóa dữ liệu (POST, PUT, DELETE) hoặc liên quan đến tài chính, quỹ đội bóng, tiền sân, thẻ phạt BẮT BUỘC phải đặt middleware xác thực quản trị viên `requireAdmin`.
  - Nghiêm cấm việc bypass token admin (không chấp nhận token rỗng, undefined hoặc token mẫu `'TNT_SECRET_TOKEN'` khi hệ thống đã có cấu hình thực tế).
- **Chống Dò Quét & Tấn Công Quá Tải (Rate Limiting)**:
  - Cổng đăng nhập mã PIN (`/api/auth/login`) bắt buộc phải bọc `loginRateLimiter` để chống Brute-force.
  - Các endpoint gọi dịch vụ AI tiêu tốn chi phí/quota (`/api/ai/*`, `/api/weather/ai-consultant`) bắt buộc phải có `aiRateLimiter`.
- **Chống Lộ Mã Nguồn (Source Code Disclosure)**:
  - Tuyệt đối KHÔNG cấu hình `app.use(express.static('.'))` phục vụ toàn bộ thư mục gốc dự án (sẽ làm lộ `.git`, `.env`, mã nguồn `server.js`).
  - Chỉ whitelist phục vụ các thư mục tài nguyên tĩnh công khai được cho phép (`public`, `css`, `js`, `utils`, `assets`).

---

## 6. Zero-Dependency & Tinh Gọn Mã Nguồn
- Ưu tiên Vanilla JavaScript và Vanilla CSS. Không tự ý cài đặt thêm các thư viện npm nặng nề bên thứ ba khi có thể giải quyết sạch sẽ bằng mã JavaScript tiêu chuẩn.
- Luôn kiểm tra cú pháp trước khi kết thúc tác vụ:
  ```bash
  node -c <file_path>
  ```

---

## 7. Tài Liệu Hóa Đồng Bộ
- Bất cứ khi nào tạo mới hoặc di dời một module, helper, hoặc route, BẮT BUỘC phải cập nhật ngay sơ đồ cấu trúc trong [ARCHITECTURE.md](file:///c:/Users/ADMIN/Documents/Cong_Quan/01_HocTap/03_DuAn/02_DuAnCaNhan/Bong_Da/Web/ARCHITECTURE.md).
