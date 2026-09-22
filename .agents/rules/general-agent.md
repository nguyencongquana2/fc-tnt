---
trigger: always_on
---

- Không tự động quét toàn bộ codebase trừ khi được yêu cầu rõ ràng.
- Với các câu hỏi chào hỏi hoặc giao tiếp đơn giản: trả lời ngay lập tức, không gọi bất kỳ công cụ (tools) nào.
- Chỉ đọc hoặc chỉnh sửa các file được nhắc tên cụ thể trong câu lệnh.
- Bỏ qua các thư mục build/cache như node_modules, target, dist, .git khi phân tích.
