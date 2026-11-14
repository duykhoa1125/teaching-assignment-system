# Frontend demo

`index.html` là bản sao nguyên byte của `D:/HCMUT/DACN/tass-demo.html` do người dùng cung cấp. File gốc không bị sửa. SHA-256:

```text
030e179e84c2b765d842bfedbeef650186e18126b5a34b3451309c5d840ed0ef
```

Đây là HTML/CSS/JavaScript tự chứa, có font/ảnh nhúng data URI, không có package.json, npm install, Node build hoặc tài nguyên CDN ngoài. Đã phân tích cú pháp inline JavaScript bằng Node VM mà không thực thi code demo. Nginx phục vụ file này trong Docker.

**Các thao tác, đăng nhập, đề xuất phân công và phản hồi trong demo vẫn chạy ở trình duyệt, lưu localStorage/sessionStorage. Chưa gọi backend hoặc CP-SAT thật.** Docker chỉ đóng gói prototype hiện có; không tự biến mô hình dữ liệu/demo auth thành hợp đồng API thật.

Nginx đã chuẩn bị proxy cùng origin cho `/api/`, `/v3/api-docs`, `/swagger-ui...` sang backend. Có thể mở Swagger tại `http://127.0.0.1:3000/swagger-ui.html`. API nghiệp vụ hiện cần Principal của auth thật; proxy không thêm header giả danh để vượt kiểm tra quyền.

Team cần chốt auth, dataset dev, mapping DTO/IDs/revision và người nối API. Demo dùng trần minh họa 24 trong JS; cấu hình backend seed dùng 25 theo T. Hai phía phải lấy một policy đã chốt khi tích hợp, không đồng bộ số này bằng cách sửa ngầm UI hoặc backend. Xem [bản rà soát](../infra/DOCKER_AUDIT.md).
