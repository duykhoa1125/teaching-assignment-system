# Teaching Assignment System — TASS

Hệ thống hỗ trợ phân công giảng dạy theo học kỳ, xét chuyên môn, tải, kinh nghiệm và ràng buộc. Chuẩn dự án: **Java 17 / Maven 3.9+ / Spring Boot 3.5.14 / PostgreSQL 16 trong Docker**.

## Bắt đầu

Từ root repo, mở Docker Desktop/Linux engine rồi chạy:

```powershell
.\scripts\docker-dev.ps1 up
```

Helper kiểm tra các cổng thực tế từ .env, build, đợi healthcheck và in URL. Giá trị mặc định trong .env.example là UI3000, backend8080 và PostgreSQL5433; nếu máy có SRM hoặc dịch vụ khác, chọn cổng còn trống trong .env. UI là demo browser, chưa nối business API/auth thật.

Build trực tiếp luôn chọn JDK 17:

```powershell
.\scripts\setup-java17.ps1   # chỉ cần nếu chưa có JDK 17
.\scripts\mvn17.ps1 -version
.\scripts\mvn17.ps1 verify
```

Docker dùng Java trong image, không thay JAVA_HOME của Windows. Plain mvn dùng JDK của terminal; Enforcer từ chối Java ngoài17 khi dependencies/plugin đã tải đủ. Xem [môi trường và IDE](docs/DEVELOPMENT.md), [Docker dev/demo](infra/README.md).

## Thành phần và trạng thái

| Khu vực | Nội dung |
| --- | --- |
| backend/ | 20 nhóm CRUD; plan/current DRAFT, readiness, async solver, hậu kiểm/apply, đọc tải/validation và sửa/khóa/mở khóa phân công |
| algorithm/tass-cpsat/ | Solver chính OR-Tools 9.14.6206, hợp đồng tass-solver/2 và validator |
| algorithm/tass-common/, tass-greedy/, tass-genetic/ | Thành phần dùng chung và thuật toán đối chứng |
| algorithm/tass-benchmark/, tass-comparison/ | Reactor/CLI/test chung và hồ sơ so sánh |
| frontend/ | HTML demo tự chứa, chưa nối backend thật |
| infra/ | Cấu hình dev, Nginx proxy, scripts kiểm thử/migration/backup |
| docs/ | Báo cáo chính, hướng dẫn, backlog và lịch sử được gắn mốc |

Root reactor build CP-SAT+backend; reactor comparison build toàn bộ module thuật toán. Backend vẫn48 bảng, có migration cho DB cũ. Không xóa migration hoặc module đối chứng khi làm gọn repo.

## Tài liệu hiện hành

- [Backend/API — mục lục và giới hạn](backend/docs/README.md):56 URL/118 operations; hồ sơ API14/11 có175/175 test qua JUnit trực tiếp. Maven verify/CI vẫn cần xác nhận với cache/mạng đủ.
- [Mô hình solver](algorithm/tass-cpsat/docs/CURRENT_MODEL.md), [hợp đồng](algorithm/tass-cpsat/docs/CONTRACT.md).
- [So sánh thuật toán](algorithm/tass-comparison/README.md), [benchmark09/11](algorithm/tass-comparison/reports/20261109/README.md).
- [Schema chuẩn](backend/sql/01_schema.sql), [mô tả đề tài](docs/project.md), [quy trình Git](docs/git-flow.md).
- [Báo cáo PDF](docs/report.pdf), [nguồn LaTeX](docs/report.tex), [hướng dẫn build báo cáo](docs/README.md).
- [Backlog và phân công tiếp](docs/BACKLOG.md), [hồ sơ lịch sử](docs/history/README.md), [biên bản chuẩn hóa](docs/CLEANUP.md).

Phạm vi hiện tại là phân công cố định theo học kỳ/thành phần; chính khóa/tăng cường có thể khác giáo viên. Giữ mục tiêu Z → L1 → M → experience → change và T=A+F+C+R. Rule evaluator còn là MVP minh họa; auth, profile, lifecycle/feedback, nguồn tải qua API và frontend thật còn trong backlog. SOL-10 nhiều giai đoạn không thuộc MVP đã chốt.
