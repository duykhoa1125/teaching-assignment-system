# Tài liệu backend TASS

**Trạng thái API ngày14/11/2026:** Java 17, Spring Boot 3.5.14, PostgreSQL 48 bảng; 20 nhóm CRUD và API nghiệp vụ plan/readiness/solver/kết quả/sửa–khóa phân công. OpenAPI có **56 URL,118 tổ hợp method/URL**. Hồ sơ kiểm chứng API gần nhất: **175/175 test đạt** qua JUnit trực tiếp; Maven reactor verify chưa được xác nhận vì cache/plugin và quyền mạng.

## Hợp đồng và luồng nghiệp vụ

| Tài liệu | Nội dung |
| --- | --- |
| [API.md](API.md) | Điểm vào: quy ước, Swagger, CRUD và các API nghiệp vụ |
| [PLAN_API.md](PLAN_API.md) | Một plan/đợt, current DRAFT, revision và refresh snapshot |
| [READINESS_API.md](READINESS_API.md) | Tiền kiểm dữ liệu, coverage và điều kiện chạy |
| [WORKLOAD_PREPARATION.md](WORKLOAD_PREPARATION.md) | Chuẩn hóa B/F/C/R, kinh nghiệm và hard checks |
| [SOLVER_SNAPSHOT.md](SOLVER_SNAPSHOT.md) | Mapper DB → tass-solver/2, canonical input/hash/replay |
| [SOLVER_RUN_API.md](SOLVER_RUN_API.md) | Chạy bất đồng bộ, xem trạng thái và hủy |
| [SOLVER_APPLY.md](SOLVER_APPLY.md) | Hậu kiểm, transaction apply và chặn nghiệm cũ |
| [PLAN_RESULTS_API.md](PLAN_RESULTS_API.md) | Đọc phân công/tải/metadata và validation report |
| [ASSIGNMENT_MUTATION_API.md](ASSIGNMENT_MUTATION_API.md) | Sửa, khóa/mở khóa theo dòng hoặc atomic batch/toàn nhóm |

Các tài liệu SOL giữ phần ghi nhận theo mốc triển khai. Những đoạn ghi “chưa có async/apply” trong tài liệu mốc sớm không phải trạng thái hiện hành; dùng bảng trên và API.md để tra hợp đồng đang có.

## Build, kiểm thử và bàn giao

- [Java 17 và môi trường dự án](../../docs/DEVELOPMENT.md).
- [Build/tích hợp thư viện](SOLVER_INTEGRATION.md).
- [Hồ sơ kiểm chứng API](SOLVER_API_VERIFICATION.md), [summary175 test](verification/20261114/summary.json).
- [Schema và migrations](../sql/01_schema.sql): DB cũ cần migration03_status đến09 phù hợp trạng thái hiện có; không xóa volume để thay migration.
- [Backlog hiện hành](../../docs/BACKLOG.md); [kế hoạch/review lịch sử](../../docs/history/README.md).

## Phạm vi đã chốt

Phân công cố định theo học kỳ + lớp + môn + thành phần. Chính khóa/chuyên đề/tăng cường có thể cùng hoặc khác giáo viên; mỗi thành phần nhận trọn số tiết bởi một người. Khóa từng dòng hoặc toàn nhóm không ép các dòng cùng giáo viên. Giữ mục tiêu Z → L1 → M → experience → change và T=A+F+C+R. Một khoảng hiệu lực đồng nhất; SOL-10 nhiều giai đoạn không nằm trong MVP hiện tại.

API ghi cần Principal đáng tin cậy, tài khoản ACTIVE và phạm vi quản lý. Auth/login thật, frontend tích hợp, teacher profile, lifecycle/feedback và bộ quy tắc sản xuất còn trong backlog. Dữ liệu demo không phải căn cứ pháp lý hay tài khoản đăng nhập thực tế.
