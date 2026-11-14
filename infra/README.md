# Docker dev/demo cho TASS

Phạm vi đã chốt: dev/demo local cho team; không triển khai server và không làm SOL-10. Stack chính ở `compose.yaml` tại **gốc DACN-code**, gồm frontend demo Nginx, Spring Boot/JDK 17 và PostgreSQL 16. Maven/JDK/Node/PostgreSQL không cần cài trên host để build/chạy stack này; host cần Docker Desktop với Linux engine hoạt động và mạng tải image/Maven/Ubuntu packages cho lần build đầu.

## Chạy từ PowerShell

Mở Docker Desktop, đợi Engine running, kiểm tra `docker info` có phần Server. Từ gốc repository:

```powershell
.\scripts\docker-dev.ps1 up
```

Helper tạo `.env` từ `.env.example` nếu chưa có, kiểm tra Compose và Linux engine, build, đợi healthcheck rồi thử UI/API/Swagger proxy. Không tự sửa `.env` đã có. Lệnh có thể dùng từ thư mục khác bằng đường dẫn tới script; helper tự chọn đúng gốc repo và project `tass-dev`.

Trước khi `up`, helper in cả ba cổng thực tế, đối chiếu container đang chạy và thử bind các cổng chưa có container TASS sở hữu. Nếu có xung đột, helper dừng trước khi thay đổi container và báo các cổng cần sửa. Biến `$env:POSTGRES_PORT`, `$env:BACKEND_PORT`, `$env:FRONTEND_PORT` trong PowerShell có thể ghi đè `.env`; xóa các biến này nếu muốn dùng cấu hình đã lưu. Phép kiểm tra chỉ phản ánh thời điểm chạy, không giữ chỗ cổng.

| Dịch vụ | Địa chỉ trên máy host | Địa chỉ trong Compose |
| --- | --- | --- |
| Giao diện demo | http://127.0.0.1:3000 | frontend:80 |
| Swagger qua Nginx | http://127.0.0.1:3000/swagger-ui.html | proxy → backend:8080 |
| OpenAPI qua Nginx | http://127.0.0.1:3000/v3/api-docs | proxy → backend:8080 |
| Backend trực tiếp | http://127.0.0.1:8080 | backend:8080 |
| PostgreSQL dev | 127.0.0.1:5433 | postgres:5432 |

Đổi host ports trong `.env` nếu cần. Backend trong container luôn dùng `postgres:5432`, không dùng `localhost` hoặc cổng 5433 của Windows. Vì vậy PostgreSQL 18 cài trực tiếp trên Windows có thể giữ nguyên; không cần dừng/gỡ dịch vụ đó. Docker backend dùng JDK 17 trong image, không phụ thuộc JAVA_HOME của host.

Frontend hiện là prototype tự chứa, chưa nối dữ liệu/auth/solver thật. Proxy đã sẵn sàng và Swagger/API có thể được truy cập, nhưng API plan/solver/kết quả vẫn trả 401 nếu chưa có Principal đáng tin cậy. Xem [các phần cần team chốt](DOCKER_AUDIT.md).

POSTGRES_USER/POSTGRES_PASSWORD là tài khoản kết nối database, không phải tài khoản đăng nhập giao diện. Seed user_account hiện DISABLED; tài khoản demo trong HTML là mô phỏng browser riêng.

## Các lệnh thường dùng

```powershell
.\scripts\docker-dev.ps1 config  # chỉ kiểm tra cấu hình, không cần engine
.\scripts\docker-dev.ps1 status
.\scripts\docker-dev.ps1 logs
.\scripts\docker-dev.ps1 smoke
.\scripts\docker-dev.ps1 down    # giữ volume/dữ liệu
.\scripts\docker-dev.ps1 up
```

Lệnh Compose tương đương khi tự chạy (tại gốc repo):

```powershell
Copy-Item .env.example .env  # chỉ làm khi chưa có .env
docker compose --env-file .env up -d --build --wait --wait-timeout 240
docker compose --env-file .env ps
docker compose --env-file .env logs --tail 100 backend postgres frontend
```

Root project dùng volume `tass-dev_postgres_data` theo project name mặc định, riêng với `backend_postgres_data` của compose DB-only cũ. Không tự tái sử dụng dữ liệu/mật khẩu cũ, không xóa volume cũ. `backend/compose.yaml` được giữ để tương thích workflow cũ; không chạy lẫn hai bộ lệnh khi chẩn đoán.

## Healthcheck và runtime

- PostgreSQL: kiểm tra TCP, đăng nhập đúng user/password/database và các cột schema cần cho SOL-04–08. Schema/credential không khớp khiến DB unhealthy, backend chưa khởi động.
- Backend: `/internal/health` kiểm tra Boot readiness, kết nối DB và quyền sở hữu coordinator. Bean OR-Tools phải load native thành công trước khi coordinator sẵn sàng. Response chỉ UP/DOWN, không có credentials hoặc dữ liệu; endpoint được ẩn khỏi OpenAPI nghiệp vụ.
- Frontend: `/healthz` xác nhận Nginx chạy. Nó không xác nhận việc nối business API vốn chưa được triển khai trong HTML demo.
- Startup theo DB healthy → backend healthy → frontend. Healthy là trạng thái hạ tầng; khác readiness nghiệp vụ của từng round/dataset.
- Backend bind 0.0.0.0 bên trong container, host chỉ publish loopback. JVM chạy user không phải root, root filesystem read-only, `/tmp` có executable mappings để JNI/JNA extract native libraries. Heap mặc định tối đa 50% của giới hạn 2 GiB để chừa chỗ cho bộ nhớ native solver; đây là cấu hình dev tạm đề xuất.

## Dữ liệu, backup và migration

Volume mới nhận `01_schema.sql` và `02_seed.sql`, đã chứa schema 48 bảng và thay đổi 03–09. Seed là dữ liệu giả: tài khoản DISABLED, không có đăng nhập thật, có nhu cầu nhiều giai đoạn nên không phải dataset chạy solver đồng nhất. Docker startup không biến dữ liệu đó thành dữ liệu sẵn sàng solve.

Với volume đã khởi tạo, đổi POSTGRES_PASSWORD trong `.env` không tự đổi mật khẩu trong DB. Root stack dùng một biến chung cho backend/DB để tránh gõ hai cấu hình khác nhau, nhưng operator vẫn phải khớp credentials của volume đang dùng.

```powershell
.\scripts\docker-dev.ps1 backup
.\scripts\docker-dev.ps1 migrate
.\scripts\docker-dev.ps1 up
```

Backup ghi file pg_dump dạng custom tại `.runtime/docker-backups/` bằng công cụ trong container, không pipe binary qua PowerShell. Helper `migrate` backup trước, dừng frontend/backend, rồi chạy tuần tự 03–09 bằng psql/ON_ERROR_STOP; mỗi SQL file có transaction riêng. Không reseed DB và không tự restart khi migration lỗi. Volume mới đã đủ schema nên không cần chạy migrate lại. Migration 09 hỗ trợ mở khóa thuần metadata khi source stale cho API sửa/khóa/mở khóa; xem [hợp đồng backend](../backend/docs/ASSIGNMENT_MUTATION_API.md).

Migration có thể làm đổi source token; đọc lại/refresh current DRAFT khi nghiệp vụ yêu cầu. Import dữ liệu từ DB Windows/volume cũ và chuẩn hóa dữ liệu không nằm trong lệnh khởi động; team cần chốt nguồn dữ liệu, version PostgreSQL và quy trình restore trước.

## Kiểm thử trong Docker

```powershell
.\scripts\docker-dev.ps1 test
```

Profile test dùng `postgres-test`, không publish cổng và không dùng volume dev. Tmpfs bị tạo lại cho mỗi lần helper chạy test. Test runner có Maven/JDK 17/PostgreSQL client, chạy reactor verify + integration, JVM mới đọc checkpoint và PostgreSQL CRUD trên một DB seed riêng. Báo cáo ở `.runtime/docker-test-reports/`, Maven test cache có volume riêng. Helper giữ log rồi dừng/xóa **container test**; không xóa DB dev.

Build image runtime bỏ bước test có chủ đích; lệnh test là gate riêng trước khi team merge/release. Nếu muốn chạy thủ công nhiều lần với `docker compose --profile test run`, cần tạo lại container postgres-test vì test suite có commit fixture; dùng helper để giữ đúng cách cô lập này.

## Chẩn đoán theo đúng tầng

| Triệu chứng | Kiểm tra |
| --- | --- |
| Named pipe Docker không tồn tại, permission denied, chỉ thấy Client | Docker Desktop/Linux engine/context/quyền của terminal; chưa phải lỗi Java/PostgreSQL |
| Pull/build lỗi tải artifact/image | Mạng tới Docker Hub, Maven Central và Ubuntu APT; proxy/mirror nếu team cần |
| Port allocated | Đổi host ports trong .env; không dừng DB Windows của dự án khác |
| DB unhealthy, password authentication failed | Log postgres, user/database/password của đúng volume; đổi env không đổi DB đã tồn tại |
| Thiếu cột schema | Đúng volume chưa được migrate; backup/migrate có kiểm soát, không reseed |
| OR-Tools UnsatisfiedLinkError | Linux arch/base glibc/native artifacts và /tmp executable; không chuyển runtime sang Alpine |
| Backend healthy nhưng API 401 | Auth/Principal chưa nối, không phải lỗi Docker |
| UI thao tác không đổi DB | HTML vẫn dùng localStorage/demo algorithm, chưa có API client |

Giới hạn đã kiểm chứng và danh sách dependencies/điểm chốt: [DOCKER_AUDIT.md](DOCKER_AUDIT.md).
