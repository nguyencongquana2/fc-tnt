# 🌟 FC TNT - LỘ TRÌNH TÍNH NĂNG & ĐỊNH HƯỚNG PHÁT TRIỂN (FEATURE ROADMAP)

Tài liệu này tổng hợp toàn bộ các tính năng cốt lõi của hệ thống quản trị đội bóng **FC TNT**: phân loại rõ ràng giữa các tính năng **Đã hoàn thiện (Production Ready)** và các tính năng **Kế hoạch tương lai (Future Roadmap)**.

---

## 🟢 PHẦN I: CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN (COMPLETED FEATURES)

### ⚡ 1. Trợ Lý Sân Cỏ Live & Ghi Nhận Diễn Biến Trực Tiếp (Live Match Engine) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Giúp người quản lý bên ngoài đường biên ghi nhận mọi diễn biến trận đấu theo thời gian thực (realtime) cực kỳ nhanh chóng và nhàn hạ.
* **Tính năng chi tiết**:
  - **Nhận diện giọng nói (Voice-to-Text)**: Bấm mic nói tự nhiên (VD: *"Quân vừa sút xa ghi bàn, Tuấn Anh kiến tạo"*, *"Hùng cản phá xuất thần cứu thua"*) -> Hệ thống tự động phân tích cú pháp NLP và ghi nhận sự kiện ngay lập tức.
  - **Bàn phím 1-chạm 18 sự kiện thực chiến (18 Quick Event Chips)**: Phân thành 4 nhóm màu trực quan (Tấn công, Tuyến giữa, Phòng ngự, Tình huống phủi), tối ưu kích thước lớn cho tay ướt mồ hôi. Bao gồm cả Phản lưới nhà (+1 đội bạn), Sai lầm thủ môn, Chọc khe xé gió, Thoát pressing, Đánh chặn trục giữa, Nã đại bác sút xa, Xoạc bóng, Phạm lỗi chiến thuật, Kiếm đá phạt, Mất bóng nguy hiểm...
  - **Bộ chọn đội hình nhanh (Live Roster Sheet)**: 1-chạm chọn nhanh 7 cầu thủ đá chính mặc định, chọn tất cả hoặc tùy chỉnh quân số có mặt trên sân.
  - **Đồng bộ thời gian thực (Realtime Sync & Draft)**: Sử dụng Socket.IO và MongoDB `LiveMatchDraft` lưu vết liên tục, chống mất dữ liệu khi mất mạng hoặc tải lại trang.
  - **📋 Copy Gửi Nhóm Zalo**: 1-chạm sao chép toàn bộ tóm tắt tỷ số và danh sách người ghi bàn/kiến tạo theo định dạng văn bản đẹp mắt để gửi vào nhóm chat Zalo của đội.
  - **🤖 1-Chạm Đẩy Sang AI Chấm Điểm**: Chuyển toàn bộ chuỗi sự kiện thực tế trong trận sang Gemini AI để tự động chấm điểm chi tiết.

---

### 🏟️ 2. Sơ Đồ Chiến Thuật Sân 7 (3-1-2) Chuẩn Sofascore & Kéo Thả (Drag & Drop) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Trực quan hóa đội hình thi đấu sân 7 chuyên nghiệp, khoa học theo phong cách bảng điểm Sofascore quốc tế.
* **Tính năng chi tiết**:
  - **Mặt sân cỏ nhân tạo thực tế**: Sơ đồ chiến thuật chuẩn 3-1-2 gồm 4 tuyến rõ ràng:
    - 🧤 Tuyến 1: Thủ môn (1 GK)
    - 🛡️ Tuyến 2: 3 Hậu vệ (Cánh trái - Thòng giữa - Cánh phải)
    - ⚙️ Tuyến 3: 1 Tiền vệ giữa (1 MF)
    - ⚡ Tuyến 4: 2 Tiền đạo cánh (2 FW)
  - **Kéo thả mượt mà (Drag & Drop)**: Dễ dàng kéo đổi vị trí giữa các cầu thủ trên sân, hoặc kéo từ **Băng ghế dự bị (Bench)** vào sân để thực hiện quyền thay người.
  - **Hiệu ứng Radar AI Quét Sân (AI Tactical Radar Live)**: Hiệu ứng tia quét laser và sóng radar công nghệ cao chuyển động dọc sân bóng.
  - **Thông số trực quan trên từng cầu thủ**: Hiển thị avatar tròn, họ tên, điểm phong độ (rating) kèm huy hiệu số bàn thắng (⚽) và kiến tạo (👟).

---

### 💰 3. Quản Lý Tiền Sân, Chia Tiền & Tạo Mã VietQR Động ✅ *(Đã hoàn thiện)*
* **Mục đích**: Xử lý bài toán tế nhị về tài chính sau mỗi trận đấu một cách công bằng, minh bạch và tiện lợi nhất.
* **Tính năng chi tiết**:
  - **Bảng kê chi phí trận đấu**: Nhập tiền thuê sân, tiền nước uống, tiền bóng, tiền phụ phí phát sinh.
  - **Chia tiền tự động**: Tự động chia đều tổng số tiền cho danh sách các cầu thủ thực tế có mặt ra sân.
  - **Theo dõi trạng thái đóng tiền**: Đánh dấu trực quan ai đã nộp (`Đã thanh toán`), ai còn nợ (`Chưa thanh toán`).
  - **Tạo mã VietQR chuyển khoản 1-chạm**: Tự động sinh mã VietQR chuẩn ngân hàng kèm số tiền chính xác và nội dung chuyển khoản (VD: `FC TNT Tien san tran 21-09`), hỗ trợ quét mã chuyển khoản tức thì qua mọi app ngân hàng.

---

### 🏆 4. Bảng Vinh Danh & Thẻ Cầu Thủ FIFA (Awards & Hall of Fame) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Tôn vinh thành tích của các cá nhân xuất sắc, thúc đẩy tinh thần thi đấu nhiệt huyết của anh em trong toàn mùa giải.
* **Tính năng chi tiết**:
  - **Bục vinh danh Podium 3D**: Trao cúp Vàng 🥇, cúp Bạc 🥈, cúp Đồng 🥉 cho top 3 cầu thủ dẫn đầu.
  - **Các hạng mục vinh danh**:
    - 👑 **Vua Phá Lưới (Golden Boot)**: Thống kê tổng số bàn thắng ghi được.
    - 👟 **Vua Kiến Tạo (Playmaker King)**: Thống kê số đường chuyền dọn cỗ thành bàn.
    - ⭐ **Cầu Thủ Xuất Sắc Nhất (MVP / MOTM)**: Cầu thủ đạt danh hiệu Cầu thủ xuất sắc nhất trận nhiều lần nhất.
    - 🧤 **Găng Tay Vàng (Golden Glove)**: Dành riêng cho thủ môn có số pha cứu thua xuất thần nhiều nhất.
    - 🛡️ **Chiến Binh Bền Bỉ**: Cầu thủ có số lần ra sân cống hiến nhiều nhất mùa giải.
  - **Thẻ cầu thủ FIFA Hologram**: Thiết kế thẻ bài FIFA Ultimate Team kèm hiệu ứng nghiêng 3D Holographic Parallax khi rê chuột.

---

### 🎨 5. Tự Động Xuất Poster "Ảnh Khoe Mạng Xã Hội" (Shareable Match Cards) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Giúp anh em có ảnh đồ họa xịn xò để đăng Story, Facebook, Zalo khoe thành tích chiến thắng sau trận đấu.
* **Tính năng chi tiết**:
  - **Tạo poster tự động (HTML5 Canvas Engine)**: Ghép logo FC TNT, tên đối thủ, tỷ số, ngày giờ, sân đấu và danh sách cầu thủ lập công thành ảnh đồ họa sắc nét.
  - **4 phong cách đồ họa đỉnh cao**: Cyber Neon, Gold Champion, Emerald Pitch, Crimson Fire.
  - **Tải ảnh chuẩn kích thước**: Xuất ảnh `.png` chất lượng cao chuẩn tỷ lệ vuông 1:1 hoặc tỷ lệ dọc 9:16 (Story/Reels).
  - **1 chạm sao chép vào Clipboard**: Dán trực tiếp vào khung chat Zalo/Messenger cực nhanh.

---

### 📸 6. Khoảnh Khắc & Kỷ Niệm Đội Bóng (FC TNT Moments) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Lưu giữ những kỷ niệm, tình cảm anh em ngoài sân cỏ (ăn uống, liên hoan, sinh nhật, du đấu, giao lưu...).
* **Tính năng chi tiết**:
  - **Dòng thời gian (Timeline / Mini Feed)**: Hiển thị bài viết theo ngày tháng, địa điểm và câu chuyện.
  - **Album ảnh & Video**: Đăng nhiều ảnh cùng lúc, xem ảnh phóng to Lightbox sắc nét, hỗ trợ nhúng video kỷ niệm.
  - **Gắn thẻ (Tag) thành viên**: Đính kèm danh sách anh em có mặt trong sự kiện.
  - **Tương tác**: Thả cảm xúc bia/tim/bóng/lửa (🍻, ❤️, ⚽, 🔥) và bình luận "chém gió", troll vui vẻ.

---

### 🌦️ 7. Dự Báo Thời Tiết 7 Ngày & AI Thẩm Định Sân AKKA ✅ *(Đã hoàn thiện)*
* **Mục đích**: Giúp đội chủ động kiểm tra thời tiết tại sân nhà **AKKA (68 Chu Văn An, Thanh Liệt, Hà Nội)**.
* **Tính năng chi tiết**:
  - **Dự báo 7 ngày chuyên biệt 2 Slot Vàng**: Slot 20:45 – 22:15 và Slot 22:15 – 23:45 trích xuất từ Open-Meteo API.
  - **Chỉ số đá bóng MPI (Match Playing Index)**: Đánh giá điểm thời tiết 0 - 100% kèm nhãn Hoàn hảo 🟢, Cân nhắc 🟡, Cảnh báo mưa 🔴.
  - **Radar diễn biến mưa theo giờ (17:00 - 23:00)**: Theo dõi thời điểm mưa/tạnh để biết sân có kịp khô ráo trước giờ lăn bóng.
  - **AI Cố Vấn Mặt Sân AKKA**: Tự động tính toán lượng mưa và thời gian róc nước của nền đá mi sân AKKA để trả lời mọi câu hỏi của anh em.
  - **Tư vấn chọn đinh giày (Boot Advisor)**: Gợi ý chọn giày TF bám sân chống trượt hay TF mỏng tốc độ.

---

### 🤖 8. Hệ Thống Trí Tuệ Nhân Tạo (FC TNT AI Core) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Tận dụng Google Gemini AI để tự động hóa nghiệp vụ chuyên môn và tăng tính công tâm, giải trí.
* **Tính năng chi tiết**:
  - **AI Match Rating (Chấm điểm phong độ)**: Đọc chuỗi sự kiện trận đấu (bàn thắng, kiến tạo, cứu thua, lỗi vị trí, tấu hài...) để chấm điểm từng cầu thủ thang điểm 10 chuẩn xác, công tâm kèm lời nhận xét hóm hỉnh.
  - **AI Pitch & Weather Consultant**: Thẩm định tình trạng sân bãi và đưa ra lời khuyên chiến thuật, trang phục thi đấu.

---

### 🔒 9. Bảo Mật Quản Trị Phân Quyền Bằng Mã PIN & Phòng Thủ Toàn Diện (Admin Security & Hardening) ✅ *(Đã hoàn thiện)*
* **Mục đích**: Phân định rõ ràng giữa người xem bình thường và Quản trị viên (Đội trưởng / Thủ quỹ), thiết lập các chốt chặn an ninh mạng vững chắc.
* **Tính năng chi tiết**:
  - **Chống tấn công Brute-force mã PIN**: Tích hợp Sliding Window Rate Limiter giới hạn tối đa 5 lần thử/15 phút trên mỗi IP, kèm header phản hồi HTTP 429 Retry-After.
  - **Phân quyền truy cập nghiêm ngặt (Broken Access Control)**: Mọi API thêm/sửa/xóa trận đấu, cập nhật tiền sân, xóa khoảnh khắc, xóa bình luận đều bắt buộc qua middleware `requireAdmin`.
  - **Chống lộ mã nguồn (Source Code Disclosure)**: Chặn đứng nguy cơ rò rỉ mã nguồn backend, chỉ phục vụ tài nguyên tĩnh thông qua danh sách whitelist thư mục công khai (`css`, `js`, `utils`, `assets`).
  - **Bảo vệ RAM máy chủ & Kiểm soát kích thước tải (10MB Payload Guard)**: Tự động nén ảnh chụp điện thoại bằng Canvas ở trình duyệt (giảm 95% dung lượng), hạ giới hạn body-parser xuống 10MB an toàn và bắt lỗi HTTP 413 Payload Too Large.
  - **Chống spam hạn ngạch Gemini AI**: Rate limiter riêng biệt cho các API gọi trí tuệ nhân tạo (max 12 request/10 phút) để bảo vệ chi phí và hạn ngạch Google AI Studio.
  - **Giám sát vòng đời kết nối MongoDB**: Tự động chuyển đổi mượt mà giữa MongoDB Atlas và bộ nhớ in-memory dự phòng khi mạng chập chờn mà không gây crash ứng dụng.

---

### 📱 10. Ứng Dụng Web Tiến Bộ (PWA) & Trải Nghiệm Thể Thao Đỉnh Cao ✅ *(Đã hoàn thiện)*
* **Mục đích**: Mang lại trải nghiệm mượt mà, cảm giác như dùng ứng dụng cài đặt từ App Store / Google Play.
* **Tính năng chi tiết**:
  - **Hỗ trợ cài đặt PWA (Add to Home Screen)**: Cài đặt trực tiếp lên màn hình chính điện thoại, khởi chạy toàn màn hình không có thanh địa chỉ trình duyệt.
  - **Giao diện Bottom Navigation Bar**: Thanh điều hướng ngón tay cái thuận tiện cho thao tác một tay trên điện thoại.
  - **Splash Screen & Minigame tâng bóng**: Màn hình chào sân rực lửa kèm minigame chạm tâng bóng giải trí trong lúc tải dữ liệu.
  - **Thẻ trận đấu phân loại trực quan (Accent Left Border)**: Viền màu và vệt sáng gradient phân biệt rõ ràng giữa Thắng (Xanh ngọc lục bảo), Hòa (Vàng hổ phách), Thua (Đỏ hồng Crimson).

---

## 🔮 PHẦN II: LỘ TRÌNH PHÁT TRIỂN TƯƠNG LAI (UPCOMING ROADMAP)

### 💰 11. Sổ Quỹ Đội Bóng Minh Bạch Dài Hạn (Team Fund & Fee Tracker) ⏳ *(Kế hoạch sắp tới)*
* **Mục đích**: Quản lý thu chi quỹ đội dài hạn theo từng tháng/quý/năm, tách biệt với tiền sân từng trận.
* **Tính năng chi tiết**:
  - **Thống kê số dư quỹ tổng**: Quản lý quỹ chung của cả đội bóng qua các tháng.
  - **Bảng đóng quỹ định kỳ**: Danh sách thành viên đã đóng / còn thiếu tiền quỹ tháng.
  - **Nhật ký thu chi ngoài sân**: Mua bóng thi đấu, in thêm áo đấu mới, quỹ liên hoan, thăm hỏi thành viên ốm đau hoặc mừng sinh nhật.

---

### 🗳️ 12. Điểm Danh & Khảo Sát Đi Đá (Match Attendance Poll) ⏳ *(Kế hoạch sắp tới)*
* **Mục đích**: Nắm bắt số lượng quân số trước mỗi trận đấu (trước 1 - 2 ngày) để chủ động sắp xếp đội hình hoặc tìm người đá tăng cường.
* **Tính năng chi tiết**:
  - **Khảo sát trước trận 1 chạm**: Lựa chọn nhanh giữa `✅ Đi được`, `⏱️ Đi muộn 15-20p`, `❌ Xin nghỉ bận việc`.
  - **Đếm quân số tự động**: Cảnh báo đội trưởng nếu quân số dưới 7 người để kịp thời gọi viện binh.

---

### 🏅 13. Phòng Truyền Thống & Kỷ Lục CLB (Hall of Records) ⏳ *(Kế hoạch sắp tới)*
* **Mục đích**: Ghi lại lịch sử, bảng vàng và những kỷ lục vô tiền khoáng hậu của FC TNT qua các mùa giải.
* **Tính năng chi tiết**:
  - **Tủ cúp & Huy chương**: Lưu trữ các giải đấu phong trào đã tham dự.
  - **Kỷ lục vô tiền khoáng hậu**: Trận thắng đậm nhất lịch sử, chuỗi trận bất bại dài nhất, cầu thủ ghi nhiều bàn nhất trong một trận đấu (Hat-trick, Poker, Re-poker).

---

### 📚 14. Học Viện Kỹ Năng & Chiến Thuật (FC TNT Academy / Video Hub) 💡 *(Ý tưởng nghiên cứu)*
* **Mục đích**: Nâng tầm tư duy chơi bóng và kỹ năng cá nhân cho toàn đội thông qua kho bài giảng, video phân tích tình huống thực chiến.
* **Tính năng chi tiết**:
  - **Phân loại bài học theo vị trí**: Mẹo di chuyển cho Tiền đạo (FW), Tiền vệ (MF), Hậu vệ (DF) và Thủ môn (GK).
  - **Chiến thuật sân 7**: Bài tập thoát pressing, bọc lót khu vực, các bài phối hợp cố định khi đá biên, phạt góc.
  - **Nhúng Video đa nền tảng**: Nhúng video hữu ích từ YouTube Shorts, TikTok, Facebook Reels.

---

### 📱 15. Bot Tự Động Nhắn Tin Zalo / Telegram (Auto Notification Bot & Webhook) 💡 *(Ý tưởng nghiên cứu)*
* **Mục đích**: Tự động thông báo lịch đấu mới, nhắc nhở trước giờ bóng lăn và chia sẻ poster kết quả trận đấu thẳng vào nhóm Zalo của FC TNT.
* **Tính năng chi tiết**:
  - **Tự động nhắc điểm danh**: Gửi link điểm danh vào nhóm Zalo 24h và 4h trước giờ thi đấu.
  - **Tự động đăng kết quả & Poster**: Ngay sau khi trận đấu kết thúc, bot gửi ảnh poster và kết quả chung cuộc vào nhóm.
  - **Nhắc nhở sinh nhật thành viên**: Chúc mừng sinh nhật anh em vào đúng 08:00 sáng ngày sinh nhật.

---

### 🤖 16. Mở Rộng Hệ Thống Trí Tuệ Nhân Tạo (AI Expansion) 💡 *(Ý tưởng nghiên cứu)*
* **Mục đích**: Bổ sung thêm nhiều tiện ích thông minh và giải trí từ AI.
* **Tính năng chi tiết**:
  - **AI Match Reporter**: Tự động viết bài phóng sự tổng thuật trận đấu siêu hài hước theo phong cách bình luận viên VTV/Tạ Biên Cương.
  - **AI Team Balancer**: Tự động chia 2 đội hình đá tập nội bộ cân bằng sức mạnh dựa trên danh sách điểm danh thực tế.
  - **AI Caption Generator**: Gợi ý caption, status siêu mặn khi đăng ảnh/video khoảnh khắc kỷ niệm.

---

### 👥 17. Hệ Thống Tài Khoản Cầu Thủ & Xác Thực Chuẩn JWT / Phân Quyền Đa Cấp (Player Accounts & JWT / RBAC) ⏳ *(Kế hoạch sắp tới)*
* **Mục đích**: Chuyển đổi từ mô hình 1 mã PIN dùng chung sang mô hình mỗi thành viên trong đội có một tài khoản riêng, phân định vai trò và bảo vệ phiên đăng nhập bằng chuẩn công nghiệp JWT (JSON Web Token) kết hợp băm mật khẩu `bcrypt`.
* **Tính năng chi tiết**:
  - **Tài khoản cá nhân liên kết 1-1 với Hồ sơ Cầu thủ**: Mỗi cầu thủ đăng ký/đăng nhập bằng số điện thoại hoặc tên định danh riêng, có mật khẩu cá nhân được băm bằng muối bảo mật (`bcrypt`).
  - **Cơ chế xác thực số chuẩn JWT & Refresh Token**:
    - Cấp Access Token có chữ ký số HMAC-SHA256 (`JWT_SECRET`) chống giả mạo, mang theo thông tin định danh (`playerId`, `name`, `role`) và thời gian hết hạn (`exp`).
    - Refresh Token bảo mật tự động gia hạn phiên làm việc mà không bắt người dùng phải đăng nhập lại liên tục.
    - Triệt tiêu hoàn toàn rủi ro lộ mã PIN gốc qua Base64 của cơ chế cũ.
  - **Phân quyền vai trò đa cấp (Role-Based Access Control - RBAC)**:
    - 👑 **Đội trưởng (Captain / Super Admin)**: Toàn quyền quản trị, thêm/sửa/xóa trận đấu, duyệt thành viên, cập nhật thông tin đội và kích hoạt AI chấm điểm.
    - 💰 **Thủ quỹ (Treasurer)**: Quản lý tiền sân, đối soát mã VietQR, xác nhận thu nợ và quản lý quỹ chung của đội bóng.
    - ⚽ **Thành viên (Player)**: Tự do cập nhật ảnh đại diện cá nhân, bio, số áo ưa thích, tự xác nhận điểm danh đi đá / vắng mặt, bình luận chém gió trong Khoảnh khắc.
    - 👁️ **Khách / Cổ động viên (Guest / Fan)**: Xem lịch thi đấu, bảng xếp hạng phong độ, bảng vinh danh và thả cảm xúc tương tác.
  - **Nhật ký thao tác minh bạch (Audit Trail)**: Ghi vết rõ ràng thành viên nào vừa cập nhật tỉ số, thủ quỹ nào vừa xác nhận đóng tiền nhằm tăng cường sự tin tưởng và minh bạch tuyệt đối trong nội bộ đội bóng.

---

*📅 Ngày cập nhật: 25/09/2026 • Đội bóng: FC TNT*
