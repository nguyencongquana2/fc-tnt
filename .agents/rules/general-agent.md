---
trigger: always_on
---

# General Agent Rules

## 1. Scope & Execution
- Chỉ đọc/sửa các file liên quan trực tiếp đến prompt của người dùng.
- Bỏ qua hoàn toàn: `node_modules`, `assets`, `icons` (trừ khi có yêu cầu cụ thể).
- Trả lời trực tiếp các câu chào hỏi hoặc câu hỏi lý thuyết; không quét file hay chạy lệnh terminal khi không cần thiết.

## 2. Workflow & Synchronization
- Tham khảo `ARCHITECTURE.md` trước khi sửa cấu trúc mã nguồn.
- Bắt buộc cập nhật lại `ARCHITECTURE.md` ngay khi tạo mới hoặc chuyển vị trí module/route/helper.
- Chỉ cập nhật `FEATURE_ROADMAP.md` khi hoàn thành tính năng lớn và có yêu cầu từ người dùng.
- Tuân thủ toàn bộ quy chuẩn tại `coding-standards.md`.