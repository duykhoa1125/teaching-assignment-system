# Teaching Assignment System (TASS)

Hệ thống hỗ trợ quyết định phân công giảng dạy giáo viên theo học kỳ, dựa trên chuyên môn, định mức giảng dạy và tối ưu hóa ràng buộc đa mục tiêu.

## Trạng thái

- **Đặc tả & thiết kế:** Đã hoàn thiện báo cáo yêu cầu hệ thống và thiết kế thuật toán ([`docs/report.pdf`](docs/report.pdf)) cùng bộ sơ đồ thiết kế ([`docs/diagrams/`](docs/diagrams/)).
- **Thuật toán (`algorithm/`):** Đã xây dựng module tối ưu bằng **Google OR-Tools CP-SAT** (`tass-cpsat`), cùng các module đối chứng **Greedy** (`tass-greedy`), **Genetic Algorithm** (`tass-genetic`), thư viện dùng chung (`tass-common`) và bộ so sánh (`tass-benchmark`, `tass-comparison`).
- **Backend (`backend/`):** Đã thiết kế CSDL PostgreSQL 48 bảng (`backend/sql/`) và xây dựng REST API CRUD bằng **Java 17 / Spring Boot** cho 16 bảng dữ liệu đầu vào.
- **Frontend & Hạ tầng (`frontend/`, `infra/`):** Chưa khởi tạo mã nguồn.

## Cấu trúc repository

```text
algorithm/        Các module thuật toán phân công (CP-SAT, Greedy, GA), benchmark và kiểm thử
backend/          Mã nguồn backend Java Spring Boot và script PostgreSQL (schema, seed, queries)
docs/             Báo cáo, mô tả đề tài, sơ đồ thiết kế, hợp đồng dữ liệu và quy trình Git
frontend/         Mã nguồn giao diện web (chưa khởi tạo)
infra/            Cấu hình hạ tầng và triển khai (chưa khởi tạo)
.github/          Workflow và template GitHub trong tương lai
```

## Tài liệu

### Tổng quan & Quy trình
- [Mô tả đề tài](docs/project.md)
- [Báo cáo yêu cầu hệ thống & thiết kế thuật toán (PDF)](docs/report.pdf)
- [Hợp đồng dữ liệu bổ sung bản Alternate](docs/diagrams/DATA_DICTIONARY_ALTERNATE.md)
- [Quy trình Git](docs/git-flow.md)

### Backend & Cơ sở dữ liệu
- [Tài liệu Backend CRUD](backend/README.md)

### Thuật toán & Kiểm thử
- [Module CP-SAT (`tass-cpsat`)](algorithm/tass-cpsat/README.md)
- [Hợp đồng tích hợp Solver (`CONTRACT.md`)](algorithm/tass-cpsat/docs/CONTRACT.md)
- [Bộ so sánh ba thuật toán (`tass-comparison`)](algorithm/tass-comparison/README.md)

## Quy mô nhóm

Dự án được thực hiện bởi nhóm **03 thành viên** trong khuôn khổ Đồ án Chuyên ngành (CO4029).
