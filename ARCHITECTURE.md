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

## 2. Cấu Tr�├── css/                  # [Mô-đun hoá] Hệ thống giao diện phân tầng
│   ├── base.css          # Design system, CSS variables, typography, navbar, modal base
│   ├── matches.css       # Sơ đồ sân 7 Sofascore, thẻ cầu thủ & AI rating modal
│   ├── live.css          # Trợ lý sân cỏ Live Companion & Voice Logger
│   ├── moments.css       # Bảng tin khoảnh khắc, photo grid Facebook & lightbox
│   ├── finance.css       # Thu chi quỹ trận, VietQR container & laser scanner
│   ├── funds.css         # Sổ quỹ đội bóng, modal nạp quỹ linh hoạt & bảng số dư ví
│   ├── weather.css       # Radar thời tiết Canvas & dynamic weather particles
│   ├── tactics.css       # Bảng sa bàn sân 7, quân cờ kéo thả, thanh công cụ vẽ & playbook
│   ├── effects.css       # Hiệu ứng splash screen, 3D tilt, crown shine & neon lasers
│   ├── responsive.css    # Tối ưu hóa hiển thị responsive mobile & tablet
│   └── style.css         # Master stylesheet hub hợp nhất toàn bộ bằng @import
├── js/                   # Module logic phía Client (SPA)
│   ├── core.js           # [Decoupling] Service Locator & Event Bus trung tâm (window.TNT)
│   ├── app.js            # [Facade] Bộ điều phối khởi tạo ứng dụng & Dashboard (~280 dòng)
│   ├── app/              # [Mô-đun hoá] Phân tách nghiệp vụ xác thực & hồ sơ cá nhân
│   │   ├── app-auth.js       # Quản lý PIN Admin, Thủ Quỹ, Đăng nhập Cầu thủ, Đổi mật khẩu & Header UI
│   │   └── app-profile.js    # Modal hồ sơ cá nhân (My Profile Hub), cập nhật avatar & liên kết ví quỹ
│   ├── state.js          # [Facade] Bộ điều phối trung tâm quản lý State & Realtime (~280 dòng)
│   ├── state/            # [Mô-đun hoá] Phân tách nghiệp vụ State & LocalStorage
│   │   ├── state-auth.js      # Quản lý PIN Admin, Token Thủ Quỹ, Token PBKDF2 Cầu thủ & Session
│   │   ├── state-players.js   # Quản lý danh sách cầu thủ, avatar, thống kê phong độ & Leaderboards
│   │   ├── state-matches.js   # Lịch sử trận đấu, kết quả, chi phí quỹ và tổng quan phong độ đội
│   │   └── state-social.js    # Khoảnh khắc (Moments), cảm xúc, bình luận & kịch bản sa bàn (Tactics)
│   ├── tactics/          # [Mô-đun hoá] Phân tách nghiệp vụ sa bàn sân 7
│   │   ├── tactics-screen.js      # Toàn màn hình (Fullscreen) & tự động xoay ngang 90° trên Mobile
│   │   ├── tactics-canvas.js      # Canvas vector engine, math uốn lượn, mũi tên & rAF 60fps
│   │   ├── tactics-pieces.js      # Quản lý 14 quân cờ, ma trận sơ đồ (3-1-2, 2-3-1, 3-2-1), kéo thả cảm ứng
│   │   ├── tactics-playbook.js    # Kho bài tập mẫu, bộ lọc danh mục, thảo luận & lưu kịch bản
│   │   └── tactics-realtime.js    # Điều phối phòng họp Socket.IO trực tiếp
│   ├── matches.js        # Bộ điều phối trung tâm (Facade) module trận đấu
│   ├── matches/          # [Mô-đun hoá] Phân tách nghiệp vụ trận đấu chi tiết
│   │   ├── matches-list.js        # Render thẻ danh sách trận & banner Live Match
│   │   ├── matches-detail.js      # Modal chi tiết trận (#match-detail-modal), đội hình sân 7 & reviews
│   │   ├── matches-form.js        # Modal tạo/sửa trận (#match-form-modal), chọn đội hình & PIN bảo mật
│   │   ├── matches-pitch.js       # Sa bàn sân 7 Sofascore (3-1-2) & kéo thả vị trí
│   │   ├── matches-ai-client.js   # Bộ não phân tích đánh giá AI cục bộ (Football NLP & Rules Engine)
│   │   ├── matches-ai-review.js   # Bảng nhận xét phong độ, cuộn mượt, mở rộng/thu gọn & Filter Pills
│   │   ├── matches-ai.js          # Modal chấm điểm AI (#ai-match-rating-modal), API Gemini & áp dụng rating
│   │   ├── matches-live.js        # Trợ lý sân cỏ Live Companion (Orchestrator & Sync)
│   │   ├── matches-live-timer.js  # Đồng hồ thi đấu, Screen Wake Lock & điểm danh Roster
│   │   ├── matches-live-events.js # Bộ chọn cầu thủ sự kiện nhanh & Timeline trực tiếp
│   │   └── matches-live-voice.js  # Nhận diện giọng nói (Voice-to-Event) & phân tích Smart NLP
│   ├── players.js        # [Facade] Bộ điều phối trung tâm module cầu thủ (~55 dòng)
│   ├── players/          # [Mô-đun hoá] Phân tách nghiệp vụ quản lý cầu thủ & tài khoản
│   │   ├── players-list.js      # Render lưới thẻ FIFA cầu thủ (#players-grid-container) & ví quỹ
│   │   ├── players-form.js      # Modal thêm/sửa (#player-modal), form submit & xóa cầu thủ
│   │   ├── players-provision.js # Modal cấp tài khoản & đặt lại mật khẩu (#admin-provision-modal)
│   │   └── players-profile.js   # Modal chi tiết hồ sơ (#player-profile-modal) & nén ảnh Canvas
│   ├── finance.js        # [Facade] Bộ điều phối trung tâm chia tiền sân (~45 dòng)
│   ├── finance/          # [Mô-đun hoá] Phân tách nghiệp vụ chia tiền sân & VietQR
│   │   ├── finance-modal.js      # Giao diện Modal (#match-finance-modal), form chi phí & tính toán
│   │   ├── finance-checklist.js  # Bảng checklist nộp tiền, trừ ví số dư quỹ & xuất báo cáo Zalo
│   │   └── finance-qr.js         # Tạo mã VietQR động, định danh chuyển khoản & Socket.IO realtime
│   ├── finance-funds.js  # Bộ điều phối trung tâm (Facade) phân hệ Sổ Quỹ Đội & Ví Thành Viên
│   ├── funds/            # [Mô-đun hoá] Phân tách nghiệp vụ sổ quỹ chi tiết
│   │   ├── funds-core.js     # Trạng thái số dư, render bảng chính, điều chỉnh quỹ & báo cáo Zalo
│   │   ├── funds-topup.js    # Modal nạp quỹ (#modal-funds-topup), bulk inputs & tính tổng tức thì
│   │   └── funds-history.js  # Modal lịch sử (#modal-funds-history), bộ lọc Filter Pills & bảng giao dịch
│   ├── awards.js         # Bảng vinh danh & danh hiệu
│   ├── poster.js         # [Facade] Bộ điều phối trung tâm tạo poster ảnh (~45 dòng)
│   ├── poster/           # [Mô-đun hoá] Phân tách nghiệp vụ kết xuất đồ họa Canvas & xuất file
│   │   ├── poster-core.js     # Quản lý modal, điều khiển controls (1:1 / 9:16, 4 themes) & render
│   │   ├── poster-draw.js     # Engine vẽ Canvas layout (nền gradient 4 theme, header, footer, bo góc)
│   │   ├── poster-elements.js # Engine vẽ nội dung (scoreboard hoàng gia, thẻ MOTM, bàn thắng, đội hình)
│   │   └── poster-export.js   # Xuất ảnh PNG HD, sao chép ảnh vào Clipboard & Web Share API
│   ├── moments.js        # Bộ điều phối trung tâm (Facade) module khoảnh khắc
│   ├── moments/          # [Mô-đun hoá] Phân tách nghiệp vụ khoảnh khắc chi tiết
│   │   ├── moments-feed.js        # Bảng tin khoảnh khắc, photo grid Facebook & thả cảm xúc
│   │   ├── moments-comments.js    # Quản lý gửi/xóa bình luận an toàn & realtime Socket.IO
│   │   ├── moments-lightbox.js    # Xem ảnh/video toàn màn hình (Modal Lightbox)
│   │   └── moments-modal.js       # Form đăng khoảnh khắc, nén ảnh canvas & tải lên Cloudinary
│   ├── weather.js        # [Facade] Bộ điều phối trung tâm module thời tiết (~45 dòng)
│   ├── weather/          # [Mô-đun hoá] Phân tách nghiệp vụ thời tiết & AI cố vấn
│   │   ├── weather-core.js   # Dữ liệu Open-Meteo, fallback, thẻ 7 ngày & Dashboard widget
│   │   ├── weather-radar.js  # Chi tiết ngày, phân tích 2 slot thi đấu & Radar diễn biến 17h-23h
│   │   └── weather-ai.js     # Cố vấn AI thời tiết & Bộ não Football NLP tiếng Việt thẩm định sân
│   ├── splash.js         # Màn hình chào sân & minigame tâng bóng
│   ├── effects.js        # Hiệu ứng âm thanh & pháo hoa confetti
├── models/               # Mongoose Schemas (MongoDB)
│   ├── Player.js         # Hồ sơ cầu thủ & số dư quỹ (fundBalance)
│   ├── FundTransaction.js # Lịch sử biến động số dư ví thành viên (Top-up, Match deduct, Adjust)
│   ├── Match.js          # Lịch sử trận đấu & đội hình
│   ├── LiveMatchDraft.js # Bản nháp trận đấu Live đồng bộ realtime
│   ├── Moment.js         # Bài đăng khoảnh khắc & bình luận
│   ├── Tactic.js         # Kịch bản sa bàn chiến thuật & bình luận trao đổi
│   └── Team.js           # Thông tin đội bóng, mã PIN Admin & mã PIN Thủ Quỹ
├── routes/               # [Mô-đun hoá] Tách API từ server.js theo miền nghiệp vụ
│   ├── auth.js           # Bộ điều phối trung tâm (Facade) phân hệ xác thực & bảo mật
│   ├── auth/             # [Mô-đun hoá] Phân tách nghiệp vụ xác thực chi tiết
│   │   ├── auth-common.js    # Khóa bí mật Runtime secret & cấu hình chung
│   │   ├── auth-admin.js     # Mã PIN Admin, sinh token HMAC, middleware requireAdmin
│   │   ├── auth-treasurer.js # Mã PIN Thủ Quỹ, sinh token HMAC, middleware requireTreasurer
│   │   └── auth-player.js    # PBKDF2 hash mật khẩu cầu thủ, token thành viên & hồ sơ
│   ├── funds.js          # API sổ quỹ, nạp tiền linh hoạt, trừ tiền sân (requireTreasurer)
│   ├── players.js        # API CRUD cầu thủ & avatar
│   ├── matches.js        # API trận đấu & quản lý thu chi quỹ trận
│   ├── payments.js       # API Webhook Casso.vn, tự động gạch nợ tiền sân & Ting ting realtime
│   ├── tactics.js        # API kịch bản chiến thuật & thảo luận thực chiến
│   ├── ai.js             # Bộ điều phối trung tâm (Facade) API AI chấm điểm trận đấu
│   ├── ai/               # [Mô-đun hoá] Phân tách lõi AI & Cloud LLM
│   │   ├── ai-engine.js      # Bộ não phân tích Smart Football Rules Engine & NLP nội bộ
│   │   └── ai-gemini.js      # Tích hợp Google Gemini Cloud LLM & prompt engineering
│   ├── liveMatch.js      # API live match sync bản nháp thời gian thực
│   ├── moments.js        # API khoảnh khắc, cảm xúc reactions & bình luận
│   ├── upload.js         # API chữ ký số & tải đa phương tiện Cloudinary (Ảnh/Video)
│   └── weather.js        # API dự báo thời tiết Open-Meteo & AI thẩm định mặt sân
├── sockets/              # [Mô-đun hoá] Socket.IO event controllers
│   └── tacticsSocket.js  # Phòng họp sa bàn trực tiếp, sync kéo thả & vẽ vector
├── utils/                # [DRY - Shared Logic] Mô-đun dùng chung giữa Backend & Frontend (UMD)
│   ├── officialPlayers.js # Nguồn sự thật duy nhất (SSOT) cho 15 cầu thủ mặc định ban đầu
│   ├── officialTactics.js # Kịch bản bài tập chiến thuật sân 7 chuẩn mẫu (SSOT)
│   ├── tacticsPieces.js  # 15 quân cờ sân 7 mặc định & bóng dùng chung Server/Client (SSOT)
│   ├── playerAliases.js   # Từ điển alias và phân giải tên cầu thủ cho AI NLP & Voice
│   ├── rateLimiter.js     # Bộ lọc trượt (Sliding Window) chống Brute-force PIN, lạm dụng AI, Spam Comment & Avatar DoS
│   ├── validators.js      # Bộ kiểm chuẩn dữ liệu đầu vào (Avatar, Comment, Reactions) dùng chung UMD
│   └── securityHeaders.js # Bộ tạo HTTP Headers bảo vệ web (CSP, HSTS, X-Frame, No-Sniff, Permissions)
├── scripts/              # Công cụ tự động hóa
│   └── generate_favicons.py # Tự động tạo bộ icon favicon & logo
├── .env                  # Biến môi trường (MONGODB_URI, GEMINI_API_KEY, ADMIN_PIN)
├── .gitignore
├── index.html            # Khung giao diện Single-Page Application
├── manifest.json         # Cấu hình Progressive Web App (PWA)
├── package.json          # Quản lý dependencies (Express, Mongoose, Socket.IO)
├── robots.txt            # Chỉ thị SEO cho Googlebot
├── server.js             # App bootstrap tinh gọn (~390 dòng), kết nối DB & Socket.IO
└── sitemap.xml           # Sơ đồ trang web phục vụ SEO
```

### `routes/` (Bộ Định Tuyến API Backend)
Tách rời các endpoint từ `server.js` thành các module độc lập theo miền nghiệp vụ:
- `auth.js`: Xác thực mã PIN quản trị (`/api/auth/login`), đổi PIN (`/api/auth/change-pin`), kiểm tra token (`/api/auth/check`) và middleware `requireAdmin`. Đồng thời quản lý hệ thống tài khoản thành viên: đăng nhập cầu thủ (`/api/auth/player/login`), đổi mật khẩu (`/api/auth/player/change-password`), Admin cấp tài khoản khởi tạo (`/api/auth/player/provision`), lấy thông tin cá nhân (`/api/auth/player/me`) và cập nhật hồ sơ (`/api/auth/player/profile`).
- `players.js`: Quản lý danh sách cầu thủ (`/api/players`), thêm/sửa/xóa cầu thủ và cập nhật avatar tự do (tự động loại trừ `passwordHash` khi trả về danh sách công khai).
- `matches.js`: Lịch sử trận đấu (`/api/matches`) và quản lý thu chi/quỹ trận sân bóng.
- `payments.js`: Webhook tự động hóa thanh toán tiền sân qua Casso.vn (`/api/payments/casso-webhook`), xác thực chữ ký số an toàn, bóc tách cú pháp chuyển khoản (`TNT M... P...`), chống xử lý trùng lặp giao dịch (Idempotency), phát âm thanh Ting ting & cập nhật tiến độ thanh toán thời gian thực qua Socket.IO.
- `tactics.js`: API lưu trữ và quản lý kịch bản sa bàn chiến thuật (`/api/tactics`), bài tập cố định (phạt góc, ném biên, thoát pressing) và bình luận thảo luận chiến thuật thực chiến.
- `ai.js` & `ai/`: [Mô-đun hoá] Hệ thống AI chấm điểm phong độ & viết nhận xét cá nhân hóa (`/api/ai/rate-match`), điều phối qua Facade trung tâm (`routes/ai.js`) và phân tách thành các submodule chuyên biệt:
  - `ai/ai-engine.js`: Bộ não phân tích Smart Football Rules Engine & NLP nội bộ phía backend, chấm điểm ngoại tuyến khi mất mạng hoặc hết quota Google API.
  - `ai/ai-gemini.js`: Kết nối Google Gemini API (2.0-flash / 1.5-flash), prompt engineering theo chuẩn sân 7 FC TNT và đồng bộ hóa số liệu sự kiện trực tiếp.
- `liveMatch.js`: Đồng bộ trạng thái bản nháp trận đấu Live đa thiết bị qua Socket.IO (`/api/live-match/*`).
- `moments.js`: Bảng tin khoảnh khắc (`/api/moments`), đăng bài, thả cảm xúc (react) và bình luận (comments).
- `weather.js`: Lấy dự báo thời tiết thực tế từ Open-Meteo (`/api/weather/forecast`) và AI cố vấn chiến thuật/mặt sân (`/api/weather/ai-consultant`).

### `models/` (Dữ liệu & Mongoose Schemas)
Chứa các định nghĩa Schema cấu trúc dữ liệu lưu trong MongoDB:
- `Player.js`: Hồ sơ cầu thủ (họ tên, biệt danh, số áo, vị trí, ảnh đại diện, thông tin ngân hàng VietQR) và hệ thống tài khoản thành viên (`username`, `passwordHash` PBKDF2, `mustChangePassword`, `role`, `accountStatus`, `preferredFoot`, `height`, `weight`, `bio`, `lastLogin`).
- `Match.js`: Chi tiết trận đấu (ngày giờ, đối thủ, sân đấu, sơ đồ sân 7, bàn thắng, kiến tạo, điểm rating, MOTM, chi phí trận).
- `LiveMatchDraft.js`: Lưu trữ trạng thái tạm thời của trận đấu đang live/chưa kết thúc để đồng bộ thời gian thực.
- `Moment.js`: Dữ liệu bài đăng kỷ niệm đội bóng (tiêu đề, hình ảnh, video, danh sách gắn thẻ, biểu cảm reactions, bình luận).
- `Tactic.js`: Lưu trữ bài tập sa bàn chiến thuật (tọa độ x/y 14 quân cờ sân 7 + bóng, các nét vẽ mũi tên/vùng highlight, sơ đồ đội hình, tác giả và danh sách bình luận góp ý).
- `Team.js`: Thông tin chung của đội và cấu hình mã PIN quản trị (Admin PIN).

### `js/` (Logic Xử Lý Phía Client)
Chứa toàn bộ logic giao diện, nghiệp vụ và tương tác dữ liệu:
- `core.js`: [Decoupling & Clean Architecture] Cung cấp không gian tên tập trung `window.TNT` cùng Event Bus nội bộ (`TNT.bus` / `TNT.events`), áp dụng mẫu Service Locator & Mediator Pattern. Chuẩn hóa toàn bộ tiện ích dùng chung (`TNT.utils.escapeHtml`, `TNT.utils.formatMoney`, `TNT.utils.formatDate`, `TNT.utils.copyToClipboard`) và Hệ thống UI Toast tập trung (`TNT.ui.showToast`, tự động lắng nghe sự kiện `toast:show`, `toast:error`, `toast:success`, `toast:info`). Giải quyết triệt để phản mẫu Tight Coupling và ô nhiễm biến toàn cục, đồng thời tương thích ngược 100% (`window.escapeHtml`, `window.formatMoney`, `window.showToast`).
- `state.js` & `state/`: [Mô-đun hoá] Quản lý state tập trung (`APP_STATE`), điều phối qua Facade trung tâm (~280 dòng) và phân tách thành 4 submodule chuyên biệt:
  - `state/state-auth.js`: Quản lý mã PIN Quản trị viên, xác thực tài khoản thành viên PBKDF2 Token, đổi mật khẩu và cấp tài khoản.
  - `state/state-players.js`: Quản lý danh sách cầu thủ, avatar, tính toán thống kê phong độ & bảng vinh danh (Top Goals/Assists/MOTM).
  - `state/state-matches.js`: Quản lý lịch sử trận đấu, kết quả, chi phí quỹ và tổng quan phong độ toàn đội.
  - `state/state-social.js`: Quản lý bài đăng khoảnh khắc (Moments), cảm xúc reactions, bình luận và kịch bản sa bàn chiến thuật (Tactics).
- `app.js` & `app/`: [Mô-đun hoá] Điểm khởi đầu phía client & Dashboard, điều phối qua Facade trung tâm (~280 dòng) và phân tách thành 2 submodule chuyên biệt:
  - `app/app-auth.js`: Quản lý sự kiện đăng nhập PIN Quản trị, quyền Thủ Quỹ, đăng nhập thành viên, đổi mật khẩu và cập nhật trạng thái huy hiệu header.
  - `app/app-profile.js`: Quản lý Modal hồ sơ cá nhân (My Profile Hub), xem/sửa thông số phong độ, tải ảnh đại diện & kiểm tra số dư ví quỹ.
- `tactics.js` & `tactics/`: [Mô-đun hoá] Sa bàn chiến thuật sân 7 HTML5 Canvas, điều phối qua Facade trung tâm và phân tách thành 5 submodule chuyên biệt:
  - `tactics/tactics-screen.js`: Bộ điều khiển toàn màn hình (Fullscreen) và tự động xoay ngang 90° trên điện thoại.
  - `tactics/tactics-canvas.js`: Engine vẽ vector (mũi tên, đường chuyền nét đứt, uốn cong Bézier, khoanh vùng highlight, nhãn chữ), Undo/Redo và render đồng bộ 60fps qua `requestAnimationFrame`.
  - `tactics/tactics-pieces.js`: Quản lý 14 quân cờ sân 7 + bóng, ma trận sơ đồ (3-1-2, 2-3-1, 3-2-1), kéo thả cảm ứng mượt mà (rAF & `touchcancel`), modal đổi tên/số áo.
  - `tactics/tactics-playbook.js`: Kho kịch bản bài tập mẫu, bộ lọc danh mục, thảo luận góp ý, thả tim và modal lưu bài tập mới.
  - `tactics/tactics-realtime.js`: Điều phối phòng họp chiến thuật trực tiếp qua Socket.IO, tự động vào/rời phòng theo tab để tiết kiệm tài nguyên.
- `matches.js` & `matches/`: [Mô-đun hoá] Quản lý toàn bộ nghiệp vụ trận đấu, được điều phối qua facade `matches.js` và phân tách thành các submodule:
  - `matches/matches-list.js`: Render thẻ danh sách trận đấu trực quan và thẻ banner Live Match đang diễn ra.
  - `matches/matches-detail.js`: Quản lý Modal chi tiết trận (#match-detail-modal), dựng sa bàn sân 7 (3-1-2), danh sách dự bị & bộ lọc nhận xét phong độ cá nhân.
  - `matches/matches-form.js`: Quản lý Form tạo/sửa trận đấu (#match-form-modal), chọn danh sách tham gia, lưu trận & modal xác thực mã PIN an toàn khi sửa/xóa trận.
  - `matches/matches-pitch.js`: Sa bàn chiến thuật sân 7 Sofascore (3-1-2), engine kéo-thả (Drag & Drop) và Quick Edit điểm số.
  - `matches/matches-ai-client.js`: Bộ não phân tích đánh giá AI cục bộ phía client (Football NLP & Rules Engine), tính điểm tức thì khi mất mạng.
  - `matches/matches-ai-review.js`: Điều khiển UI bảng nhận xét phong độ từng cầu thủ, hỗ trợ cuộn mượt, thu gọn/mở rộng và bộ lọc Filter Pills.
  - `matches/matches-ai.js`: Quản lý Modal chấm điểm AI (#ai-match-rating-modal), gọi endpoint Gemini API, xem trước kết quả và áp dụng điểm số vào sơ đồ trận đấu.
  - `matches/matches-live.js`: Bộ điều phối trung tâm Trợ lý sân cỏ Live Match, đồng bộ đám mây realtime qua Socket.IO và xuất báo cáo Zalo.
  - `matches/matches-live-timer.js`: Quản lý đồng hồ thi đấu sân phủi, giữ sáng màn hình ngoài trời (Screen Wake Lock) và điểm danh đội hình.
  - `matches/matches-live-events.js`: Ma trận nút chọn cầu thủ sự kiện nhanh, ghi nhận diễn biến và hiển thị dòng thời gian (Timeline).
  - `matches/matches-live-voice.js`: Trợ lý ghi nhận sự kiện bằng giọng nói tiếng Việt tự nhiên (Web Speech API kết hợp Football NLP).
- `players.js` & `players/`: [Mô-đun hoá] Quản lý cầu thủ, tài khoản & hồ sơ cá nhân, điều phối qua Facade trung tâm (~55 dòng) và phân tách thành 4 submodule chuyên biệt:
  - `players/players-list.js`: Render lưới thẻ cầu thủ phong cách thẻ FIFA, hiển thị số áo, vị trí, số dư ví quỹ và bộ chỉ số phong độ.
  - `players/players-form.js`: Quản lý Modal thêm/sửa thông tin cầu thủ (#player-modal), phân quyền Admin lưu trữ và xóa cầu thủ.
  - `players/players-provision.js`: Quản lý Modal cấp tài khoản thành viên (#admin-provision-modal), tạo mật khẩu ngẫu nhiên, gợi ý username & sao chép thông tin gửi Zalo.
  - `players/players-profile.js`: Quản lý Modal hồ sơ chi tiết (#player-profile-modal), xem lịch sử chấm điểm từng trận và Engine nén ảnh đại diện Canvas tự động.
- `finance.js` & `finance/`: [Mô-đun hoá] Nghiệp vụ tính tiền sân & chia bill, điều phối qua Facade trung tâm (~45 dòng) và phân tách thành 3 submodule chuyên biệt:
  - `finance/finance-modal.js`: Giao diện Modal (#match-finance-modal), nhập liệu chi phí, tự động tính chia đầu người & làm tròn.
  - `finance/finance-checklist.js`: Bảng checklist nộp tiền, 1-chạm xác nhận đã nộp, trừ thẳng vào ví số dư quỹ & xuất báo cáo Messenger/Zalo.
  - `finance/finance-qr.js`: Sinh mã VietQR động theo từng cầu thủ, phát âm thanh "Ting ting" 🔔 độc lập qua Web Audio API & tự động gạch nợ realtime qua Casso Webhook Socket.IO.
- `awards.js`: Bảng vinh danh cá nhân (Top ghi bàn, Vua kiến tạo, Cầu thủ xuất sắc nhất MOTM, Găng tay vàng).
- `poster.js` & `poster/`: [Mô-đun hoá] Bộ tạo poster ảnh thi đấu Full HD, điều phối qua Facade trung tâm (~45 dòng) và phân tách thành 4 submodule chuyên biệt:
  - `poster/poster-core.js`: Quản lý trạng thái poster, mở/đóng Modal (#poster-generator-modal), tiền tải avatar và điều phối luồng vẽ theo 2 tỉ lệ (1:1 / 9:16).
  - `poster/poster-draw.js`: Engine vẽ Canvas layout gồm nền gradient đa theme, ánh sáng Neon Stadium, header, footer và khối bo góc.
  - `poster/poster-elements.js`: Engine vẽ các khối nội dung: bảng điểm scoreboard hoàng gia, thẻ MVP MOTM, danh sách ghi bàn/kiến tạo và đội hình ra sân.
  - `poster/poster-export.js`: Chức năng xuất ảnh PNG HD, 1-chạm sao chép ảnh vào Clipboard để dán trực tiếp vào Zalo/Facebook và gọi Web Share API trên di động.
- `moments.js`: Bảng tin khoảnh khắc đội bóng: đăng bài, tải ảnh, thả cảm xúc (tim, bia, bóng, lửa) và bình luận.
- `weather.js` & `weather/`: [Mô-đun hoá] Radar thời tiết & AI cố vấn sân AKKA, điều phối qua Facade trung tâm (~45 dòng) và phân tách thành 3 submodule chuyên biệt:
  - `weather/weather-core.js`: Quản lý kết nối Open-Meteo & API vệ tinh, fallback phía client, lưới thẻ dự báo 7 ngày và widget tổng quan trên Dashboard.
  - `weather/weather-radar.js`: Hiển thị chi tiết ngày thi đấu, thẩm định 2 khung giờ 20h45 & 22h15, độ ẩm/thoát nước mặt cỏ nhân tạo và Radar diễn biến theo giờ (17:00 – 23:00).
  - `weather/weather-ai.js`: Cố vấn AI thời tiết sân bóng & chat trực tiếp, tích hợp bộ não Football NLP tiếng Việt nhận diện ca đấu, thứ trong tuần, sân đọng nước, giày đinh TF và cảnh báo dông sét.
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

### `sockets/` (Điều Phối Realtime Socket.IO)
- `tacticsSocket.js`: Quản lý toàn bộ phòng họp chiến thuật trực tiếp qua Socket.IO: đồng bộ kéo thả 15 quân cờ, nét vẽ vector (mũi tên, đường chuyền nét đứt, Bézier), Undo/Redo, đặt lại sa bàn, nạp bài tập mẫu và áp dụng Sliding Window Rate Limiter chống DoS/Spam.

### `utils/` (Mô-đun Dùng Chung - Nguyên Tắc DRY)
Áp dụng mẫu Universal Module Definition (UMD) để tái sử dụng mã nguồn đồng thời trên cả Node.js Backend (`module.exports`) và Trình duyệt Frontend (`window` global) mà không phụ thuộc vào bundler:
- `officialPlayers.js`: Nguồn sự thật duy nhất (Single Source of Truth - SSOT) cho danh sách 15 cầu thủ chính thức mặc định. Loại bỏ hoàn toàn sự trùng lặp dữ liệu giữa `server.js` và `js/state.js`.
- `officialTactics.js`: Kịch bản các bài tập chiến thuật sân 7 chuẩn mẫu (phạt góc, ném biên, thoát pressing) đồng bộ giữa client và server.
- `tacticsPieces.js`: Nguồn sự thật duy nhất (SSOT) cho 15 quân cờ sân 7 và bóng mặc định, dùng chung giữa `sockets/tacticsSocket.js` và `js/tactics/tactics-pieces.js`.
- `playerAliases.js`: Bảng ánh xạ từ khóa/biệt danh phủi (`FC_TNT_KNOWN_ALIASES`) và thuật toán chuẩn hóa tên cầu thủ (`getPlayerAliases`). Phục vụ phân tích giọng nói (Voice-to-Event) ở frontend và NLP rating trận đấu của Gemini AI ở backend.
- `validators.js`: Bộ kiểm chuẩn dữ liệu đầu vào (Avatar 2.5MB, Comment, Reactions) dùng chung UMD.
- `rateLimiter.js`: Middleware giới hạn tần suất yêu cầu (Sliding Window Rate Limiter) thuần Node.js không phụ thuộc thư viện ngoài, bảo vệ cổng đăng nhập mã PIN khỏi tấn công dò quét (Brute-force) và bảo vệ hạn ngạch gọi Google Gemini API khỏi hành vi spam.
- `securityHeaders.js`: Bộ tạo HTTP Headers bảo vệ web (CSP, HSTS, X-Frame, No-Sniff, Permissions).

### `scripts/` (Công Cụ Tiện Ích)
- `generate_favicons.py`: Script Python tự động sinh toàn bộ bộ nhận diện icon và favicon từ vector sang `assets/icons/` và `assets/images/`.

### `server.js` (App Bootstrap)
- Đóng vai trò bootstrap tinh gọn (~390 dòng): khởi tạo Express, kết nối MongoDB, Socket.IO, cấu hình phục vụ static/fallback và gắn kết các route từ thư mục `routes/` cùng controller `sockets/`.
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
| **API Sa bàn chiến thuật, Playbook mẫu** | [routes/tactics.js](file:///routes/tactics.js) | Kịch bản sa bàn, thảo luận & bài tập mẫu |
| **Realtime Whiteboard Socket sa bàn** | [sockets/tacticsSocket.js](file:///sockets/tacticsSocket.js) | Điều phối phòng họp chiến thuật trực tiếp |
| **API Khoảnh khắc, Cảm xúc, Bình luận** | [routes/moments.js](file:///routes/moments.js) | Feed khoảnh khắc, tương tác |
| **API Thời tiết Sân AKKA & Cố vấn AI** | [routes/weather.js](file:///routes/weather.js) | Open-Meteo API và tư vấn chiến thuật |
| **Cấu trúc trường dữ liệu MongoDB** | [models/](file:///models/) | Mở model tương ứng (`Match.js`, `Player.js`, ...) |
| **Gọi API từ client, State chung, Socket.IO** | [js/state.js](file:///js/state.js) | Quản lý `APP_STATE`, `apiCall()`, `saveLocalState()` |
| **Giao diện sân 7 Sofascore, Live Match** | [js/matches.js](file:///js/matches.js) | Giao diện pitch Sofascore & live match |
| **Chia tiền trận, quỹ đội, VietQR & Webhook tự động** | [js/finance.js](file:///js/finance.js), [routes/payments.js](file:///routes/payments.js) | Công thức chia tiền, VietQR cá nhân hóa, Casso Webhook & Ting ting |
| **Danh sách cầu thủ phía giao diện** | [js/players.js](file:///js/players.js) | Render danh sách và modal cầu thủ |
| **Bảng vinh danh, tính toán danh hiệu** | [js/awards.js](file:///js/awards.js) | Top Goals/Assists/MOTM |
| **Bài đăng kỷ niệm, bình luận phía Client** | [js/moments.js](file:///js/moments.js) | Feed giao diện và tương tác |
| **Dự báo thời tiết phía Client** | [js/weather.js](file:///js/weather.js) | Giao diện radar thời tiết và chat AI cố vấn |
| **Xuất ảnh đồ hoạ / Poster trận** | [js/poster.js](file:///js/poster.js) | Xử lý canvas / html2canvas |
| **Cấu trúc khung HTML, thẻ tab, modal popup** | [index.html](file:///index.html) | Tìm theo `id="tab-..."` hoặc `id="modal-..."` |
| **Màu sắc, kích thước, hiệu ứng CSS, responsive** | [css/style.css](file:///css/style.css) | Toàn bộ CSS gom trong file này |
| **Sinh bộ nhận diện favicon/icon** | [scripts/generate_favicons.py](file:///scripts/generate_favicons.py) | Xuất ảnh vào `assets/icons/` & `assets/images/` |
