# Backlog hiện hành — 14/11/2026

Danh sách này giữ các việc chưa làm khi lưu trữ kế hoạch cũ. Người phụ trách cần được nhóm phân công; các dòng dưới không phải tính năng đã triển khai.

| Ưu tiên | Phần còn lại | Hợp đồng/phụ thuộc |
| --- | --- | --- |
| P0 | Auth/login, cấp tài khoản/đổi mật khẩu, RBAC thống nhất | Principal hiện tra login_name của user ACTIVE; chốt principal chứa user/school/roles; không dùng actor từ client để bỏ qua quyền |
| P0 | API hồ sơ giáo viên tổng hợp theo học kỳ | Tái dùng công tác/chuyên môn/kinh nghiệm/lịch sử/định mức/nhiệm vụ; phân biệt dữ liệu thiếu, lịch sử và trạng thái xác minh |
| P0 | API chuẩn bị và xác nhận nguồn tải/cấu hình | calculation_period, tải ngoài phạm vi, inventory, giảm trừ, quy đổi, optimization config và rule set; dữ liệu hiện được adapter đọc từ DB |
| P0 | Chuẩn hóa ngày dữ liệu theo học kỳ | Code hiện buộc các demand cùng khoảng, chưa buộc khoảng đó bằng toàn học kỳ; bổ sung guard/test theo phạm vi đã chốt |
| P0 | Lifecycle plan/version | Bản DRAFT kế tiếp, chuyển trạng thái, mở/đóng nhận phản hồi, phát hành; giữ cùng CAS/token/validation/audit |
| P0 | Feedback và duyệt tăng nhu cầu theo lớp | Tách nguyện vọng tổng tiết môn với tăng nhu cầu một lớp/thành phần; xác định lớp/môn/nguồn/số tiết và quyết định quản lý; không tự gán phần tăng cho người gửi |
| P0 | Nối frontend thật | Auth → readiness → DRAFT → sửa/khóa → run/poll/cancel → tải/validation; xử lý409/422/503 và revision thực |
| P0 | Nghiệm thu build/tích hợp nhóm | Maven verify/CI và Docker test profile với mạng/cache đủ; logs JUnit trực tiếp không thay bằng chứng Maven thành công |
| P1 | Quy tắc nghiệp vụ thực tế, tải năm | Evaluator hiện ILLUSTRATIVE_MVP_V1; annual thiếu giữ INSUFFICIENT_DATA. Chốt nguồn/quy tắc và thêm handler có kiểm thử, không chỉ bỏ nhãn demo |
| P1 | PDF và phản hồi/restore mở rộng | Chỉ xuất từ kết quả còn phù hợp với lifecycle/revision/token; thống nhất quyền truy cập |
| Theo FE | CRUD pagination total và lỗi chuẩn hóa | Không phá mảng response cũ nếu chưa chốt phiên bản hợp đồng |

## Phần đã có, không giao lại như việc chưa làm

Plan/current DRAFT/refresh, readiness, chuẩn bị tải/kinh nghiệm, snapshot tass-solver/2, async run/poll/cancel, hậu kiểm/apply nguyên tử, đọc kết quả/tải/tối ưu/validation và API sửa/khóa/mở khóa theo dòng/nhóm đã có. Xem [backend docs](../backend/docs/README.md).

SOL-10 nhiều giai đoạn không cần cho MVP hiện tại. Không xây thời khóa biểu, lịch đổi giáo viên giữa kỳ, môn cha/con hoặc lớp ghép chỉ vì chúng xuất hiện trong một bản thiết kế Alternate cũ. Mọi mở rộng cần được nhóm chốt lại.
