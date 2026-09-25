# Kiến Trúc Dự Án FC TNT (Architecture Overview)

Tài liệu tóm tắt cấu trúc kỹ thuật và định hướng tra cứu mã nguồn của dự án FC TNT.

---

## 1. Mục Đích Dự Án & Tech Stack

- **Mục đích**: Ứng dụng web quản lý toàn diện cho đội bóng đá phủi **FC TNT**, bao gồm: quản lý danh sách cầu thủ, lập đội hình & sơ đồ chiến thuật sân 7 (3-1-2) chuẩn phong cách Sofascore, cập nhật trận đấu trực tiếp (Live Match), bảng vinh danh cá nhân, quản lý thu chi & chia quỹ trận đấu tích hợp mã VietQR, góc kỷ niệm (Moments), và dự báo thời tiết sân đấu cùng AI cố vấn chiến thuật.
- **Tech Stack**:
  - **Backend**: Node.js, Express.js, MongoDB (Mongoose ODM).
  - **Realtime Sync**: Socket.IO (đồng bộ dữ liệu tức thì giữa các thiết bị khi có thay đổi).
  - **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), hoạt động theo mô hình Single-Page Application (SPA) gọn nhẹ, không dùng framework nặng.
  - **Dịch vụ tích hợp**: AI Rate Match & Cố vấn thời tiết (Gemini API qua backend), VietQR API, Open-Meteo / Weather API.

---

## 2. Cấu Trúc Tổng Thể & Vai Trò Từng Thư Mục

```
FC-TNT/
├── assets/
│   ├── icons/            # Toàn bộ favicon, apple-touch-icon, pwa icons
│   └── images/           # Logo đội bóng, logo.svg, hình ảnh nền
├── css/                  # [Mô-đun hoá] Hệ thống giao diện phân tầng
│   ├── base.css          # Design system, CSS variables, typography, navbar, modal base
│   ├── matches.css       # Sơ đồ sân 7 Sofascore, thẻ cầu thủ & AI rating modal
│   ├── live.css          # Trợ lý sân cỏ Live Companion & Voice Logger
│   ├── moments.css       # Bảng tin khoảnh khắc, photo grid Facebook & lightbox
│   ├── finance.css       # Thu chi quỹ trận, VietQR container & laser scanner
│   ├── weather.css       # Radar thời tiết Canvas & dynamic weather particles
│   ├── effects.css       # Hiệu ứng splash screen, 3D tilt, crown shine & neon lasers
│   ├── responsive.css    # Tối ưu hóa hiển thị responsive mobile & tablet
│   └── style.css         # Master stylesheet hub hợp nhất toàn bộ bằng @import
├── js/                   # Module logic phía Client (SPA)
│   ├── core.js           # [Decoupling] Service Locator & Event Bus trung tâm (window.TNT)
│   ├── app.js            # Điều hướng tab, modal, toast
│   ├── state.js          # Quản lý state tập trung & socket realtime
│   ├── matches.js        # Bộ điều phối trung tâm (Facade) module trận đấu
│   ├── matches/          # [Mô-đun hoá] Phân tách nghiệp vụ trận đấu chi tiết
│   │   ├── matches-list.js   # Danh sách trận đấu, modal chi tiết & CRUD
│   │   ├── matches-pitch.js  # Sa bàn sân 7 Sofascore (3-1-2) & kéo thả vị trí
│   │   ├── matches-ai.js     # Đánh giá trận đấu & chấm điểm bằng AI Gemini
│   │   └── matches-live.js   # Trợ lý sân cỏ Live Companion & Voice-to-Event
│   ├── players.js        # Danh sách cầu thủ & form thông tin
│   ├── finance.js        # Chia tiền sân & tạo mã VietQR
│   ├── awards.js         # Bảng vinh danh & danh hiệu
│   ├── poster.js         # Xuất ảnh đồ họa chia sẻ mạng xã hội
│   ├── moments.js        # Bảng tin khoảnh khắc & tương tác
│   ├── weather.js        # Radar thời tiết & AI cố vấn
│   ├── splash.js         # Màn hình chào sân & minigame tâng bóng
│   └── effects.js        # Hiệu ứng âm thanh & pháo hoa confetti
├── models/               # Mongoose Schemas (MongoDB)
│   ├── Player.js         # Hồ sơ cầu thủ
│   ├── Match.js          # Lịch sử trận đấu & đội hình
│   ├── LiveMatchDraft.js # Bản nháp trận đấu Live đồng bộ realtime
│   ├── Moment.js         # Bài đăng khoảnh khắc & bình luận
│   └── Team.js           # Thông tin đội bóng & mã PIN Admin
├── routes/               # [Mô-đun hoá] Tách API từ server.js theo miền nghiệp vụ
│   ├── auth.js           # Đăng nhập PIN, đổi PIN, kiểm tra quyền Admin
│   ├── players.js        # API CRUD cầu thủ & avatar
│   ├── matches.js        # API trận đấu & quản lý thu chi quỹ trận
│   ├── ai.js             # API AI rate match chấm điểm trận đấu & NLP Gemini
│   ├── liveMatch.js      # API live match sync bản nháp thời gian thực
│   ├── moments.js        # API khoảnh khắc, cảm xúc reactions & bình luận
│   └── weather.js        # API dự báo thời tiết Open-Meteo & AI thẩm định mặt sân
├── utils/                # [DRY - Shared Logic] Mô-đun dùng chung giữa Backend & Frontend (UMD)
│   ├── officialPlayers.js # Nguồn sự thật duy nhất (SSOT) cho 15 cầu thủ mặc định ban đầu
│   ├── playerAliases.js   # Từ điển alias và phân giải tên cầu thủ cho AI NLP & Voice
│   └── rateLimiter.js     # Bộ lọc trượt (Sliding Window) chống Brute-force PIN & bảo vệ Gemini API
├── scripts/              # Công cụ tự động hóa
│   └── generate_favicons.py # Tự động tạo bộ icon favicon & logo
├── .env                  # Biến môi trường (MONGODB_URI, GEMINI_API_KEY, ADMIN_PIN)
├── .gitignore
├── index.html            # Khung giao diện Single-Page Application
├── manifest.json         # Cấu hình Progressive Web App (PWA)
├── package.json          # Quản lý dependencies (Express, Mongoose, Socket.IO)
├── robots.txt            # Chỉ thị SEO cho Googlebot
├── server.js             # App bootstrap gọn gàng (~220 dòng), kết nối DB & Socket.IO
└── sitemap.xml           # Sơ đồ trang web phục vụ SEO
```

### `routes/` (Bộ Định Tuyến API Backend)
Tách rời các endpoint từ `server.js` thành các module độc lập theo miền nghiệp vụ:
- `auth.js`: Xác thực mã PIN quản trị (`/api/auth/login`), đổi PIN (`/api/auth/change-pin`), kiểm tra token (`/api/auth/check`) và middleware `requireAdmin`.
- `players.js`: Quản lý danh sách cầu thủ (`/api/players`), thêm/sửa/xóa cầu thủ và cập nhật avatar tự do.
- `matches.js`: Lịch sử trận đấu (`/api/matches`) và quản lý thu chi/quỹ trận sân bóng.
- `ai.js`: AI chấm điểm phong độ & viết nhận xét cá nhân hóa bằng Gemini API kết hợp NLP (`/api/ai/rate-match`).
- `liveMatch.js`: Đồng bộ trạng thái bản nháp trận đấu Live đa thiết bị qua Socket.IO (`/api/live-match/*`).
- `moments.js`: Bảng tin khoảnh khắc (`/api/moments`), đăng bài, thả cảm xúc (react) và bình luận (comments).
- `weather.js`: Lấy dự báo thời tiết thực tế từ Open-Meteo (`/api/weather/forecast`) và AI cố vấn chiến thuật/mặt sân (`/api/weather/ai-consultant`).

### `models/` (Dữ liệu & Mongoose Schemas)
Chứa các định nghĩa Schema cấu trúc dữ liệu lưu trong MongoDB:
- `Player.js`: Hồ sơ cầu thủ (họ tên, biệt danh, số áo, vị trí, ảnh đại diện, thông tin ngân hàng VietQR).
- `Match.js`: Chi tiết trận đấu (ngày giờ, đối thủ, sân đấu, sơ đồ sân 7, bàn thắng, kiến tạo, điểm rating, MOTM, chi phí trận).
- `LiveMatchDraft.js`: Lưu trữ trạng thái tạm thời của trận đấu đang live/chưa kết thúc để đồng bộ thời gian thực.
- `Moment.js`: Dữ liệu bài đăng kỷ niệm đội bóng (tiêu đề, hình ảnh, video, danh sách gắn thẻ, biểu cảm reactions, bình luận).
- `Team.js`: Thông tin chung của đội và cấu hình mã PIN quản trị (Admin PIN).

### `js/` (Logic Xử Lý Phía Client)
Chứa toàn bộ logic giao diện, nghiệp vụ và tương tác dữ liệu:
- `core.js`: [Decoupling & Clean Architecture] Cung cấp không gian tên tập trung `window.TNT` cùng Event Bus nội bộ (`TNT.events`), áp dụng mẫu Service Locator & Mediator Pattern. Giải quyết triệt để vấn đề Tight Coupling (liên kết chặt chẽ) giữa các module qua biến toàn cục tự do, đồng thời duy trì khả năng tương thích ngược hoàn hảo.
- `state.js`: Quản lý state tập trung (`APP_STATE`), tiện ích khử độc XSS (`window.escapeHtml`), xử lý xác thực/token Admin, hàm gọi API chung (`apiCall`), bộ đệm LocalStorage và lắng nghe Socket.IO (`data_updated`).
- `app.js`: Điểm khởi đầu phía client, chuyển đổi tab chính (Dashboard, Awards, Matches, Weather, Moments, Players), điều khiển modal và toast thông báo.
- `matches.js` & `matches/`: [Mô-đun hoá] Quản lý toàn bộ nghiệp vụ trận đấu, được điều phối qua facade `matches.js` và phân tách thành các submodule:
  - `matches/matches-list.js`: Quản lý danh sách trận, hiển thị chi tiết, tạo/sửa trận và xác thực PIN an toàn khi xóa.
  - `matches/matches-pitch.js`: Sa bàn chiến thuật sân 7 Sofascore (3-1-2), engine kéo-thả (Drag & Drop) và Quick Edit điểm số.
  - `matches/matches-ai.js`: AI Match Rating & Review Engine kết nối Gemini API chấm điểm và sinh nhận xét chi tiết.
  - `matches/matches-live.js`: Trợ lý sân cỏ Live Match, đồng hồ thi đấu, ghi nhận sự kiện, nhận diện giọng nói (Voice-to-Event) và đồng bộ Socket.IO.
- `players.js`: Quản lý danh sách cầu thủ, form thêm/sửa/xoá cầu thủ, upload avatar, thống kê phong độ.
- `finance.js`: Nghiệp vụ quỹ và tài chính: tính tiền sân/tiền nước, chia đều cho người đi đá, theo dõi ai đã đóng tiền, tạo mã VietQR chuyển khoản nhanh.
- `awards.js`: Bảng vinh danh cá nhân (Top ghi bàn, Vua kiến tạo, Cầu thủ xuất sắc nhất MOTM, Găng tay vàng).
- `poster.js`: Xuất poster đội hình và kết quả trận đấu ra định dạng ảnh để chia sẻ mạng xã hội.
- `moments.js`: Bảng tin khoảnh khắc đội bóng: đăng bài, tải ảnh, thả cảm xúc (tim, bia, bóng, lửa) và bình luận.
- `weather.js`: Lấy dự báo thời tiết tại sân thi đấu và hiển thị tư vấn chiến thuật/trang phục từ AI.
- `splash.js` & `effects.js`: Hiệu ứng màn hình chào (splash screen), hiệu ứng âm thanh và pháo hoa ăn mừng (confetti).

### `css/` (Giao Diện & Hệ Thống Định Kiểu Phân Tầng)
Toàn bộ stylesheet được mô-đun hóa chuyên biệt theo từng miền giao diện:
- `base.css`: Design system, biến màu sắc (`:root`), typography, nút bấm, navbar, modal base, xác thực PIN và footer.
- `matches.css`: Sơ đồ chiến thuật sân 7 Sofascore (3-1-2), bố cục modal 2 cột, thẻ cầu thủ, kéo thả và AI rating reviews.
- `live.css`: Giao diện Trợ lý sân cỏ Live Match, đồng hồ bấm giờ, ma trận nút bấm sự kiện và bảng điểm danh đội hình.
- `moments.css`: Bảng tin khoảnh khắc, lưới ảnh Facebook, biểu cảm cảm xúc, bình luận và lightbox xem ảnh Full HD.
- `finance.css`: Quản lý quỹ, danh sách nộp tiền, khung mã VietQR chuyển khoản và tia laser quét QR.
- `weather.css`: Radar thời tiết Canvas, thẻ dự báo 7 ngày và hiệu ứng hạt mưa/nắng/sấm chớp động.
- `effects.css`: Màn hình chào splash screen, minigame tâng bóng, hiệu ứng 3D tilt, vương miện MOTM, neon lasers và poster canvas.
- `responsive.css`: Tối ưu hóa toàn diện giao diện trên thiết bị di động và tablet (media queries, bottom nav bar, mobile touch).
- `style.css`: File hub trung tâm nhập khẩu toàn bộ bằng `@import` phục vụ tương thích ngược.

### `assets/` (Tài Nguyên Đồ Họa)
Được phân cấp rõ ràng:
- `assets/icons/`: Bộ icon favicon đa kích cỡ (`favicon.ico`, `favicon-48.png`, `favicon-192.png`, `favicon.png`, `favicon.svg`, `apple-touch-icon.png`).
- `assets/images/`: Logo chính thức của đội bóng (`logo.png`, `logo.svg`, `logo-512.png`) và hình ảnh nền.

### `utils/` (Mô-đun Dùng Chung - Nguyên Tắc DRY)
Áp dụng mẫu Universal Module Definition (UMD) để tái sử dụng mã nguồn đồng thời trên cả Node.js Backend (`module.exports`) và Trình duyệt Frontend (`window` global) mà không phụ thuộc vào bundler:
- `officialPlayers.js`: Nguồn sự thật duy nhất (Single Source of Truth - SSOT) cho danh sách 15 cầu thủ chính thức mặc định. Loại bỏ hoàn toàn sự trùng lặp dữ liệu giữa `server.js` và `js/state.js`.
- `playerAliases.js`: Bảng ánh xạ từ khóa/biệt danh phủi (`FC_TNT_KNOWN_ALIASES`) và thuật toán chuẩn hóa tên cầu thủ (`getPlayerAliases`). Phục vụ phân tích giọng nói (Voice-to-Event) ở frontend và NLP rating trận đấu của Gemini AI ở backend.
- `rateLimiter.js`: Middleware giới hạn tần suất yêu cầu (Sliding Window Rate Limiter) thuần Node.js không phụ thuộc thư viện ngoài, bảo vệ cổng đăng nhập mã PIN khỏi tấn công dò quét (Brute-force) và bảo vệ hạn ngạch gọi Google Gemini API khỏi hành vi spam.

### `scripts/` (Công Cụ Tiện Ích)
- `generate_favicons.py`: Script Python tự động sinh toàn bộ bộ nhận diện icon và favicon từ vector sang `assets/icons/` và `assets/images/`.

### `server.js` (App Bootstrap)
- Đóng vai trò bootstrap tinh gọn: khởi tạo Express, kết nối MongoDB, Socket.IO, cấu hình phục vụ static/fallback và gắn kết các route từ thư mục `routes/`.
- Tích hợp middleware kiểm soát kích thước payload an toàn (`10mb`) và xử lý lỗi chuẩn HTTP 413 (`PayloadTooLargeError`), kết hợp thuật toán nén ảnh Canvas ở Client ([js/moments.js](file:///c:/Users/ADMIN/Documents/Cong_Quan/01_HocTap/03_DuAn/02_DuAnCaNhan/Bong_Da/Web/js/moments.js), [js/players.js](file:///c:/Users/ADMIN/Documents/Cong_Quan/01_HocTap/03_DuAn/02_DuAnCaNhan/Bong_Da/Web/js/players.js)) để bảo vệ RAM tiến trình Node.js và tuân thủ giới hạn 16MB BSON của MongoDB.

---

## 3. Luồng Xử Lý Chính (Data Flow)

```
[Browser Client: index.html]
       │
       ├─► (1) Tải giao diện HTML/CSS và các module JS
       ├─► (2) js/state.js gửi request GET /api/data
       │
       ▼
[Backend Server: server.js -> routes/]
       │
       ├─► (3) Định tuyến yêu cầu đến routes/ (auth, players, matches, moments, weather)
       ├─► (4) Truy vấn MongoDB thông qua models/ (Player, Match, Moment, Team)
       ├─► (5) Trả về JSON tổng hợp cho client
       │
       ▼
[Client State: APP_STATE]
       │
       ├─► (6) js/app.js & các module tính năng render dữ liệu lên DOM (index.html)
       │
       ▼
[Tương Tác & Thời Gian Thực]
       │
       ├─► (7) Khi Admin tạo/sửa dữ liệu ──► Gửi API đến routes/ ──► Lưu MongoDB
       └─► (8) server.js phát socket: io.emit('data_updated')
               └─► Mọi client đang mở tự động fetch cập nhật mới nhất mà không cần tải lại trang.
```

---

## 4. Bảng Tra Cứu Nhanh Khi Cần Chỉnh Sửa

Khi cần can thiệp vào một tính năng, tra cứu trực tiếp theo bảng dưới đây:

| Nội dung cần sửa đổi | File / Thư mục đích | Ghi chú |
| :--- | :--- | :--- |
| **Khởi động server, Socket.IO, tĩnh** | [server.js](file:///server.js) | Bootstrap ứng dụng, mount routes |
| **Xác thực PIN, phân quyền Admin** | [routes/auth.js](file:///routes/auth.js) | Đăng nhập PIN, đổi PIN, middleware `requireAdmin` |
| **API Cầu thủ & Upload Avatar** | [routes/players.js](file:///routes/players.js) | Quản lý danh sách và hồ sơ cầu thủ |
| **API Trận đấu, Quỹ sân, Live Match, AI Rating** | [routes/matches.js](file:///routes/matches.js) | Lịch sử trận, chia tiền, live draft, AI chấm điểm |
| **API Khoảnh khắc, Cảm xúc, Bình luận** | [routes/moments.js](file:///routes/moments.js) | Feed khoảnh khắc, tương tác |
| **API Thời tiết Sân AKKA & Cố vấn AI** | [routes/weather.js](file:///routes/weather.js) | Open-Meteo API và tư vấn chiến thuật |
| **Cấu trúc trường dữ liệu MongoDB** | [models/](file:///models/) | Mở model tương ứng (`Match.js`, `Player.js`, ...) |
| **Gọi API từ client, State chung, Socket.IO** | [js/state.js](file:///js/state.js) | Quản lý `APP_STATE`, `apiCall()`, `saveLocalState()` |
| **Giao diện sân 7 Sofascore, Live Match** | [js/matches.js](file:///js/matches.js) | Giao diện pitch Sofascore & live match |
| **Chia tiền trận, quỹ đội, thanh toán VietQR** | [js/finance.js](file:///js/finance.js) | Công thức chia tiền và VietQR |
| **Danh sách cầu thủ phía giao diện** | [js/players.js](file:///js/players.js) | Render danh sách và modal cầu thủ |
| **Bảng vinh danh, tính toán danh hiệu** | [js/awards.js](file:///js/awards.js) | Top Goals/Assists/MOTM |
| **Bài đăng kỷ niệm, bình luận phía Client** | [js/moments.js](file:///js/moments.js) | Feed giao diện và tương tác |
| **Dự báo thời tiết phía Client** | [js/weather.js](file:///js/weather.js) | Giao diện radar thời tiết và chat AI cố vấn |
| **Xuất ảnh đồ hoạ / Poster trận** | [js/poster.js](file:///js/poster.js) | Xử lý canvas / html2canvas |
| **Cấu trúc khung HTML, thẻ tab, modal popup** | [index.html](file:///index.html) | Tìm theo `id="tab-..."` hoặc `id="modal-..."` |
| **Màu sắc, kích thước, hiệu ứng CSS, responsive** | [css/style.css](file:///css/style.css) | Toàn bộ CSS gom trong file này |
| **Sinh bộ nhận diện favicon/icon** | [scripts/generate_favicons.py](file:///scripts/generate_favicons.py) | Xuất ảnh vào `assets/icons/` & `assets/images/` |
