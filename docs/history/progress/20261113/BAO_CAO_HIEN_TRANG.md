> Archived historical document. Dates, test counts and decisions below describe its original milestone. Current status: [backend documentation](../../../../backend/docs/README.md).

# Báo cáo tiến độ TASS — 13/11/2026

Báo cáo dựa trên source đang có tại `DACN-code`, gồm cả thay đổi local chưa commit; đối chiếu Git, manifest, controller/entity, SQL, Dockerfile, Compose và log kiểm thử. Không sửa source nghiệp vụ, chạy lại test hay khởi động hệ thống trong lần tổng hợp này. Số bảng là số khai báo trong schema, không phải kết quả truy vấn database đang chạy của người dùng.

## 1. Kết quả tổng quan

TASS (Teaching Assignment System) là hệ thống hỗ trợ phân công giảng dạy theo học kỳ, xét chuyên môn, nhu cầu lớp–môn, định mức/tải, kinh nghiệm và các ràng buộc tối ưu.

| Hạng mục | Chi tiết |
| --- | --- |
| Entity CRUD | **20**, có Controller–Service–Repository và Request/DTO/Mapper |
| Database | **48 bảng** trong `backend/sql/01_schema.sql` |
| Controller | **25**: 20 CRUD, 4 controller plan/readiness/solver/results, 1 health nội bộ |
| API | **114 method mapping**  |
| Backend | Java 17, Spring Boot **3.5.14**, Maven |
| Thuật toán tích hợp API | Google OR-Tools CP-SAT **9.14.6206**, chạy trực tiếp trong JVM backend |
| Frontend | HTML/CSS/JavaScript, dữ liệu demo ; chưa nối business API/auth thật |
| Docker | Có Dockerfile frontend/backend, root Compose, healthcheck, test/tools profiles và helper scripts |
| Nginx | cấu hình image `nginx:1.28-bookworm`, phục vụ HTML và reverse proxy API/Swagger |


## 2. Cấu trúc source

| Thư mục | Vai trò |
| --- | --- |
| `backend/` | Spring Boot API, mô hình JPA, xử lý nghiệp vụ, tích hợp solver, test, SQL và tài liệu API |
| `algorithm/tass-cpsat/` | Solver chính, hợp đồng dữ liệu, chuẩn hóa/kiểm tra đầu vào và hậu kiểm nghiệm |
| `algorithm/tass-greedy/`, `tass-genetic/` | Thuật toán đối chứng Greedy và Genetic Algorithm |
| `algorithm/tass-common/` | Thành phần dùng chung cho các module thuật toán |
| `algorithm/tass-benchmark/`, `tass-comparison/` | Công cụ benchmark và so sánh thuật toán |
| `frontend/` | `index.html` demo và Dockerfile Nginx |
| `scripts/` | Thiết lập/kích hoạt JDK 17, Docker dev helper và kiểm thử solver API |
| `docs/` | Báo cáo, đặc tả, sơ đồ, hợp đồng dữ liệu và quy trình làm việc |
| `pom.xml` | Maven reactor build `tass-cpsat` trước backend; không gom toàn bộ sáu module thuật toán |

Luồng CRUD đi theo Controller → Service → Repository/JPA → PostgreSQL; Request được validation, Mapper chuyển giữa Entity và DTO. Luồng plan/solver bổ sung các transaction và SQL nghiệp vụ chuyên biệt. Các thư mục `bin/`, `target/`, `.runtime/` là output/môi trường cục bộ, không tính là module source độc lập.

## 3. Hai mươi thực thể chính của backend CRUD

| STT | Entity | Bảng | Chức năng |
| --- | --- | --- | --- |
| 1 | School | `school` | Trường |
| 2 | Department | `department` | Tổ/bộ môn |
| 3 | AcademicYear | `academic_year` | Năm học |
| 4 | Semester | `semester` | Học kỳ |
| 5 | EducationLevel | `education_level` | Cấp học |
| 6 | Grade | `grade` | Khối |
| 7 | SchoolClass | `school_class` | Lớp |
| 8 | Subject | `subject` | Môn học |
| 9 | Teacher | `teacher` | Hồ sơ giáo viên |
| 10 | TeacherEmployment | `teacher_employment` | Công tác và trạng thái giảng dạy theo thời gian |
| 11 | TeachingQualification | `teaching_qualification` | Chuyên môn/điều kiện dạy môn |
| 12 | TeachingExperience | `teaching_experience` | Kinh nghiệm giảng dạy |
| 13 | TeacherDuty | `teacher_duty` | Nhiệm vụ giáo viên |
| 14 | TeacherWorkloadBasis | `teacher_workload_basis` | Cơ sở định mức/tải |
| 15 | TeachingHistory | `teaching_history` | Lịch sử giảng dạy |
| 16 | AssignmentRound | `assignment_round` | Đợt phân công |
| 17 | RoundSubjectScope | `round_subject_scope` | Phạm vi môn của đợt |
| 18 | ClassSubjectApplicability | `class_subject_applicability` | Môn áp dụng cho lớp |
| 19 | TeachingDemand | `teaching_demand` | Nhu cầu giảng dạy |
| 20 | RequiredDemandComponent | `required_demand_component` | Thành phần nhu cầu bắt buộc |


## 4. Bốn mươi tám bảng database

| Nhóm | Số bảng | Danh sách đầy đủ |
| --- | --- | --- |
| Tổ chức và danh mục học vụ | 8 | `school`, `department`, `academic_year`, `semester`, `education_level`, `grade`, `school_class`, `subject` |
| Tài khoản và quyền | 4 | `user_account`, `role`, `user_role`, `manager_scope` |
| Giáo viên và dữ liệu giảng dạy | 7 | `teacher`, `teacher_employment`, `teaching_qualification`, `teaching_experience`, `teacher_duty`, `teaching_history`, `teacher_workload_basis` |
| Tải, giảm trừ, hoạt động và quỹ | 7 | `calculation_period`, `teacher_reduction`, `converted_activity`, `school_context`, `school_fund`, `fund_allocation`, `teacher_period_workload` |
| Đợt, phạm vi và nhu cầu | 5 | `assignment_round`, `round_subject_scope`, `class_subject_applicability`, `teaching_demand`, `required_demand_component` |
| Cấu hình và quy tắc | 3 | `optimization_config`, `rule_set_version`, `rule_definition` |
| Snapshot và phương án | 4 | `input_snapshot`, `assignment_plan`, `plan_version`, `plan_demand` |
| Chạy giải, kiểm tra và theo dõi | 6 | `solver_run`, `validation_run`, `validation_result`, `feedback`, `export_record`, `audit_log` |
| Nhập và chuẩn hóa tên | 4 | `source_import`, `teacher_alias`, `class_alias`, `subject_alias` |
| **Tổng** | **48** | |

Đã có schema, seed, query mẫu và migration 03–08: chuẩn hóa status; xác nhận đầu vào tải; archive đầu vào solver; chạy bất đồng bộ; áp nghiệm; lưu báo cáo validation. Schema mới đã tích hợp các thay đổi tương ứng; DB cũ cần quy trình migration riêng.

Database có khóa ngoại, check/unique/exclusion constraints, trigger kiểm soát revision/audit, snapshot bất biến và dữ liệu JSONB. Có bảng tài khoản/phản hồi/export không đồng nghĩa các chức năng đăng nhập, phản hồi, xuất file đã có API hoàn chỉnh.

`spring.jpa.hibernate.ddl-auto=none` và `spring.sql.init.mode=never`: backend không tự tạo schema bằng Hibernate hay tự chạy seed khi khởi động. Root Compose mount schema/seed cho quá trình khởi tạo **volume PostgreSQL mới**; thay file SQL không tự nâng cấp volume đã tồn tại. Chưa có Flyway/Liquibase trong POM.

## 5. Công nghệ và môi trường

| Thành phần | Phiên bản/cấu hình trong source |
| --- | --- |
| Java | Target/build **JDK 17**; image build Temurin 17, runtime Temurin **17 JRE** |
| Spring Boot | **3.5.14** |
| Maven trong Docker | **3.9.9**, image `maven:3.9.9-eclipse-temurin-17` |
| PostgreSQL trong Compose | **Major 16**, image `postgres:16-bookworm`; không pin patch version/digest |
| PostgreSQL đã dùng kiểm thử cục bộ | **18**, cluster tạm riêng; khác môi trường Docker mục tiêu |
| PostgreSQL JDBC | **42.6.2**, khai báo trực tiếp trong backend POM |
| API stack | Spring Web, Spring Data JPA, Bean Validation, Lombok |
| OpenAPI/Swagger | springdoc **2.10.0** |
| Solver | `tass-cpsat:0.1.0:core`, OR-Tools **9.14.6206** |
| Frontend | Browser HTML/CSS/JS, localStorage/sessionStorage; không có `package.json` |
| Web server/proxy | **Nginx 1.28**, image `nginx:1.28-bookworm` |
| Đóng gói | Backend executable JAR qua multi-stage Dockerfile; frontend Nginx image; điều phối Docker Compose |

Build tạo thư viện solver `core` trước, rồi đóng gói backend. CP-SAT chạy trong cùng process backend qua thư viện Java/JNI; không có container solver riêng. Greedy/GA phục vụ nghiên cứu/đối chứng, API hiện không gọi chúng. Runtime native dùng Linux glibc và thư viện hệ thống phù hợp; `/tmp` cho phép nạp thư viện native.

Không thấy Redis, message broker, mail service hay object storage trong runtime hiện tại. Hàng chờ solver là executor trong backend, không phải Redis/RabbitMQ. Coordinator hiện giữ PostgreSQL advisory lock và yêu cầu một backend instance sở hữu DB, chưa phải kiến trúc scale ngang nhiều worker.

### Biến môi trường

Không chép mật khẩu thực từ `.env` vào báo cáo. Dùng `.env.example` làm mẫu.

| Biến | Ý nghĩa/mặc định dev |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database, user, mật khẩu của container DB; Compose chuyển cùng thông tin sang backend |
| `POSTGRES_PORT` | Cổng DB trên host: **5433**, chuyển vào container **5432** |
| `BACKEND_PORT` | Cổng API trên host: **8080** |
| `FRONTEND_PORT` | Cổng UI/proxy trên host: **3000**, chuyển vào Nginx **80** |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Backend đọc kết nối JDBC; trong Compose dùng `jdbc:postgresql://postgres:5432/tass` khi DB tên mặc định |
| `SERVER_ADDRESS`, `SERVER_PORT` | Trong container bind `0.0.0.0:8080`; chạy local ngoài container mặc định `127.0.0.1:8080` |
| `SOLVER_CONCURRENT_RUNS` | **1** worker mặc định |
| `SOLVER_QUEUE_CAPACITY` | Hàng chờ **8** lượt mặc định |
| `BACKEND_MEMORY_LIMIT`, `BACKEND_CPU_LIMIT` | **2g**, **2.0 CPU** mặc định; chưa phải số đo tải production |
| `JAVA_TOOL_OPTIONS` | Heap tối đa 50% RAM và UTF-8; chừa bộ nhớ ngoài heap cho OR-Tools |
| `TEST_DB_PASSWORD` | Mật khẩu DB kiểm thử độc lập trong profile test |

Backend chạy ngoài Docker mặc định trỏ `localhost:5432/tass`; nếu muốn dùng DB root Compose qua host cần đổi `DB_URL` sang cổng **5433**. Bên trong Docker dùng DNS service `postgres:5432`, không dùng `localhost:5433`.



## 6. Luồng nghiệp vụ backend đã triển khai

1. **Chuẩn bị dữ liệu:** dùng CRUD nhập danh mục trường/năm học/học kỳ, giáo viên, công tác, chuyên môn, kinh nghiệm, tải và nhu cầu. Chuẩn hóa status, khoảng hiệu lực, đơn vị, nguồn xác nhận và dữ liệu bắt buộc.
2. **Kiểm tra readiness:** `GET /api/assignment-rounds/{id}/readiness` cho biết thiếu hoặc sai gì trước khi giải; không dùng trạng thái giao diện để tự quyết định dữ liệu đã sẵn sàng.
3. **Tạo phương án:** `POST /api/assignment-rounds/{id}/plan` tạo plan, snapshot nguồn, current DRAFT V1 và các dòng nhu cầu chưa gán. Có API đọc plan/version, refresh snapshot và kiểm soát `expected_revision`.
4. **Chuẩn bị solver:** server đọc DB/snapshot, tính tải và penalty, tạo DTO chuẩn, kiểm tra dữ liệu, lưu archive/hash. Client không gửi snapshot tùy ý để thay dữ liệu server.
5. **Chạy bất đồng bộ:** `POST /api/plan-versions/{id}/solver-runs` trả 202 và run ID. Executor gọi CP-SAT sau transaction chuẩn bị. Client poll `GET /api/solver-runs/{id}`, có thể yêu cầu hủy bằng POST `/cancel`.
6. **Hậu kiểm và lưu nghiệm:** kiểm tra nghiệm, quyền, current DRAFT, revision, freshness và cancellation trước khi apply. Ghi phân công/tải/metadata/audit trong transaction; lỗi sẽ rollback. Phải thấy `apply_outcome=APPLIED` mới kết luận nghiệm đã được lưu.
7. **Đọc và kiểm tra kết quả:** GET `/api/plan-versions/{id}/assignments`, `/workloads`, `/optimization`; POST/GET `/validation` tạo/đọc báo cáo kiểm tra có revision và thông tin freshness. Kết quả đã lưu đọc lại được sau khi JVM khởi động lại.

Solver run có các trạng thái như QUEUED, RUNNING, CANCEL_REQUESTED, CANCELLED, SUCCEEDED, COMPLETED, FAILED. Có chặn lượt trùng, báo hàng chờ đầy và xử lý lượt bị gián đoạn khi backend restart; không tự coi mọi SUCCEEDED là đã apply.

Các service plan/solver kiểm tra Principal, tài khoản ACTIVE, vai trò `ACADEMIC_MANAGER`, cùng trường và phạm vi quản lý. Tuy nhiên **chưa có login/session/JWT thật để cấp Principal cho người dùng HTTP**; gọi ẩn danh vào các API yêu cầu Principal sẽ nhận 401. Test dùng Principal giả có kiểm soát. CRUD cũ chưa có lớp auth bảo vệ toàn cục.

<!-- ## 8. Các mốc thay đổi

| Mốc | Những việc có bằng chứng |
| --- | --- |
| 01–07/11 | Xây dựng CRUD đầu vào, tách Entity/Repository/Service/Controller và mapper rõ ràng; đưa thuật toán và kiểm thử đối chứng vào repo |
| 09/11 | Đồng bộ schema mở rộng **48 bảng**, cập nhật ERD/báo cáo; bổ sung input APIs và tài liệu |
| 10/11 | Merge thay đổi validation/filter, đồng bộ CRUD và sửa status contract; HEAD hiện thấy là `322a4b3` |
| 11–13/11, source local | SOL-01: nối thư viện solver; SOL-02: plan/current DRAFT/snapshot; SOL-03: readiness; SOL-04: chuẩn bị tải; SOL-05: mapper/archive; SOL-06: async run/poll/cancel; SOL-07: apply transaction; SOL-08: đọc kết quả/validation; SOL-09: kiểm chứng xuyên suốt/restart |
| 13/11, source local | Bổ sung frontend demo, Dockerfile, root Compose, Nginx proxy, healthcheck, công cụ migration/backup/test và hướng dẫn JDK/Docker |

**Trạng thái Git:** nhiều phần SOL-01–09, Docker/infra/frontend và tài liệu hiện là file mới chưa track hoặc thay đổi chưa commit. Báo cáo này mô tả working tree; không khẳng định các phần local đã merge/push lên remote. `git diff --stat` mặc định bỏ qua file untracked nên không đại diện toàn bộ khối lượng đã làm.

`.github/` hiện chỉ có `.gitkeep`; chưa có workflow CI thực thi trong source được kiểm tra. Hướng dẫn chạy CI trong tài liệu chưa đồng nghĩa đã triển khai pipeline.

## 9. Bằng chứng kiểm thử và giới hạn

Log trong `D:/HCMUT/DACN/tmp/docker-audit-20261113/` ghi nhận:

| Bộ kiểm thử | Kết quả log |
| --- | --- |
| Plan/readiness/workload/snapshot/solver/apply/results và hồi quy HTTP/OpenAPI/H2 | 112/112 |
| JVM mới đọc lại assignments/workloads/optimization/validation đã lưu | 1/1 |
| Backend CRUD/validation/schema/exception trước đó | 23/23 |
| CRUD thực PostgreSQL và status contract | 21/21 |
| **Tổng** | **157/157, 0 failures** |

Đây là kết quả đợt chạy đã có, trên Windows/Temurin JDK 17/PostgreSQL 18 tạm; lần tổng hợp này chỉ đọc log. Tài liệu SOL-09 cũ ghi 156 test, audit mới có thêm test health/readiness nên ghi 157; dùng log audit mới nhất làm mốc.

Theo audit hiện có, Compose config và cú pháp helper scripts đã qua kiểm tra. Docker Engine từng bị chặn quyền; chưa có bằng chứng Docker build/up, `nginx -t` trong image, Linux JNI smoke test hoặc profile kiểm thử container chạy thành công. Maven reactor `verify` đầy đủ trước đó còn vướng cache/dependency plugin; các bộ trên đã chạy bằng JUnit Jupiter Engine thật từ cache, không được diễn giải là Maven CI đã xanh.

Vì vậy cách báo cáo phù hợp là: **“Đã chuẩn bị cấu hình đóng gói và điều phối Docker cho frontend, backend, PostgreSQL; cần kiểm chứng build và chạy xuyên suốt trong Linux Docker.”**

## 10. Công việc còn lại

1. Nối frontend với CRUD, plan/readiness, async solver/poll/cancel và API đọc kết quả; thống nhất DTO, revision, ID và hiển thị lỗi.
2. Hoàn thiện auth thật và phân quyền HTTP; thống nhất session/JWT, Principal và luồng tài khoản. UI demo chưa đăng nhập được vào API bằng tài khoản browser hiện tại.
3. Chuẩn hóa dataset demo, cấu hình trần tải và nguồn dữ liệu được xác nhận. Demo JS đang có giả định riêng, chưa đồng nhất dữ liệu/policy backend.
4. Kiểm chứng Docker build/up và native OR-Tools trên Linux, kết nối qua Nginx, DB persistence, migration/backup và test profile; hoàn tất Maven verify và thiết lập CI.
5. Triển khai API còn thiếu theo phạm vi nhóm: sửa tay, lock/unlock, khôi phục lịch sử, feedback, xuất PDF và hồ sơ giáo viên tổng hợp. UI có màn hình/mô phỏng không đồng nghĩa backend đã hỗ trợ.
6. Review, chọn lọc và commit/push các thay đổi local để thành viên khác tái lập cùng một phiên bản.

Phạm vi solver/workload hiện là **MVP minh họa cho một khoảng hiệu lực đồng nhất**; dữ liệu nhiều giai đoạn bị báo không hỗ trợ, SOL-10 ngoài phạm vi hiện tại. Chưa kết luận tối ưu toàn học kỳ nhiều giai đoạn, chưa coi rule evaluator minh họa là bộ kiểm tra pháp lý đầy đủ. Không có đủ cơ sở để gán một phần trăm hoàn thành chung nếu chưa có danh sách yêu cầu và trọng số được nhóm thống nhất.

## 11. Đoạn trình bày tiến độ có thể dùng

“Đến ngày 13/11/2026, nhóm đã xây dựng phần lõi hệ thống TASS gồm cơ sở dữ liệu PostgreSQL 48 bảng và backend Java 17, Spring Boot 3.5.14 với 20 tài nguyên CRUD. Backend đã tích hợp OR-Tools CP-SAT, hỗ trợ kiểm tra đầu vào, tạo phương án nháp và snapshot, chạy tối ưu bất đồng bộ, hủy/theo dõi lượt chạy, hậu kiểm và lưu nghiệm bằng transaction, đọc kết quả và báo cáo validation. Log kiểm thử mới nhất ghi nhận 157/157 test backend đạt trên môi trường Windows/JDK 17/PostgreSQL 18 tạm. Nhóm đã chuẩn bị Dockerfile và Docker Compose sử dụng PostgreSQL 16, backend Java 17 và Nginx 1.28 để phục vụ frontend, proxy API. Frontend hiện ở mức prototype chạy dữ liệu trong trình duyệt; các bước tiếp theo là nối API, hoàn thiện xác thực/phân quyền và xác nhận toàn bộ stack chạy trong Linux Docker. Một số thay đổi mới hiện vẫn nằm ở working tree local, cần review và commit để bàn giao.”

## Nguồn đối chiếu trong repository

- `backend/pom.xml`, `algorithm/tass-cpsat/pom.xml`, root `pom.xml`.
- `backend/src/main/java/vn/edu/tass/backend/entity/`, `controller/`, `repository/`, `solver/`.
- `backend/src/main/resources/application.properties` và `backend/sql/01_schema.sql` đến `08_plan_validation_reports.sql`.
- Root `compose.yaml`, `.env.example`, `backend/Dockerfile`, `frontend/Dockerfile`, `infra/docker/nginx.conf`.
- `backend/docs/PLAN_API.md`, `READINESS_API.md`, `WORKLOAD_PREPARATION.md`, `SOLVER_SNAPSHOT.md`, `SOLVER_RUN_API.md`, `SOLVER_APPLY.md`, `PLAN_RESULTS_API.md`, `SOLVER_API_VERIFICATION.md`.
- `infra/DOCKER_AUDIT.md`, Git log/status và bốn test log tại thư mục audit nêu trên. -->
