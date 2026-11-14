# TASS backend: CRUD dữ liệu đầu vào

Backend cung cấp REST API cho 20 bảng dữ liệu đầu vào trong `sql/01_schema.sql`. Schema có 48 bảng; các bảng snapshot, lượt chạy, kiểm tra và nhật ký được quản lý qua luồng nghiệp vụ, không có CRUD trực tiếp.

Backend đã nối thư viện CP-SAT và validator vào Spring (SOL-01). Xem [tích hợp solver](docs/SOLVER_INTEGRATION.md) về build, native runtime và kiểm chứng fixture.

SOL-02 bổ sung API tạo/đọc plan và version, refresh snapshot của current DRAFT với kiểm tra revision/khóa. Xem [hợp đồng plan API](docs/PLAN_API.md). API này yêu cầu principal tin cậy; adapter auth hiện tách riêng để nối với phần đăng nhập của nhóm.

SOL-03 bổ sung [readiness theo đợt](docs/READINESS_API.md): kiểm tra nguồn dữ liệu, khoảng hiệu lực được hỗ trợ, cảnh báo thiếu ứng viên và điều kiện mở phản hồi/xuất tách riêng. Đây là tiền kiểm nguồn; SOL-04/05 tiếp tục tính tải và chuẩn hóa DTO solver.

SOL-04 có [bộ chuẩn bị tải/kinh nghiệm](docs/WORKLOAD_PREPARATION.md) dùng snapshot DB, BigDecimal và inventory nguồn xác nhận. Nhóm chốt trần minh họa theo T=A+F+C+R. DB cũ cần áp `sql/04_workload_input_confirmation.sql` và xác nhận nguồn trước khi refresh DRAFT; chưa có endpoint chạy solver trong bước này.

SOL-05 đã nối snapshot DB sang [DTO tass-solver/2 và archive SHA-256](docs/SOLVER_SNAPSHOT.md), qua InputValidator trước khi lưu solver_run PREPARED. DB cũ cần migration 05. Bước này chưa có API async/poll/cancel hoặc áp dụng nghiệm.

SOL-06 bổ sung [API async run/poll/cancel](docs/SOLVER_RUN_API.md), hàng chờ có giới hạn, lưu result/metadata và recovery sau restart. DB cũ cần migration 06; chỉ chạy một backend cho một DB.

SOL-07 nối [hậu kiểm và apply bằng transaction](docs/SOLVER_APPLY.md) vào worker. Chỉ APPLIED mới xác nhận đã lưu phân công; STALE/NOT_DRAFT không ghi đè DRAFT đã sửa. Giữ khóa, revision thực theo từng dòng và audit; DB cũ cần migration 07 để hỗ trợ no-op apply.

SOL-08 có [API phân công/tải/metadata/validation](docs/PLAN_RESULTS_API.md), lọc/phân trang và báo cáo validation bất biến theo revision/snapshot/token. DB cũ cần migration 08. SOL-09 có [kiểm thử xuyên suốt và đọc lại sau restart](docs/SOLVER_API_VERIFICATION.md), fixture đối chiếu và script chạy DB tạm. Dừng ở SOL-09; SOL-10 ngoài phạm vi theo yêu cầu.

Tài liệu API đầy đủ, gồm bộ lọc, mã lỗi và ví dụ request/response: [docs/API.md](docs/API.md). Khi chạy backend, mở Swagger UI tại `http://127.0.0.1:8080/swagger-ui.html`; đặc tả OpenAPI ở `/v3/api-docs` (JSON) hoặc `/v3/api-docs.yaml` (YAML).

## Cấu trúc

Mã nguồn nằm tại `src/main/java/vn/edu/tass/backend` và được tổ chức theo mẫu Blog App API:

| Package | Nội dung |
| --- | --- |
| `controller` | 20 controller CRUD cùng controller plan, readiness, solver run và kết quả/validation |
| `entity` | 20 JPA entity, mỗi bảng một file |
| `mapper` | 20 mapper thủ công, mỗi bảng một file; ánh xạ request/entity/DTO theo từng trường |
| `exception` | Ngoại lệ và ánh xạ lỗi HTTP |
| `payload/request` | 20 request class có validation |
| `payload/dto` | 20 response DTO và DTO lỗi |
| `repository` | 20 JPA repository CRUD và SQL repository cho plan/readiness |
| `service` | 20 service CRUD, service plan/readiness và giao diện lấy actor |
| `service/impl` | 20 service CRUD, service plan/readiness có transaction và adapter principal |
| `utils` | Kiểm tra tham số và phân trang theo `limit`/`offset` |

Ví dụ: `TeacherController` → `TeacherService` → `TeacherServiceImpl` → `TeacherRepository` → `Teacher`; `TeacherServiceImpl` dùng `TeacherMapper` để ánh xạ thủ công từng trường. Mapper có `toEntity`, `applyRequest` và `toDto`; `applyRequest` dùng cho cả tạo mới và cập nhật. JPA chỉ truy cập schema có sẵn; `spring.jpa.hibernate.ddl-auto=none`, nên ứng dụng không tự tạo hoặc sửa bảng PostgreSQL.

## Chạy local

**Dev/demo dùng Docker toàn stack:** chạy `..\scripts\docker-dev.ps1 up` từ backend hoặc `.\scripts\docker-dev.ps1 up` từ gốc repo. Xem [infra/README.md](../infra/README.md). Root Compose đóng gói JDK17/Maven/backend, frontend demo và PostgreSQL riêng trên host5433; không cần Java/PostgreSQL trên host để chạy stack này. `backend/compose.yaml` bên dưới là workflow DB-only cũ.

### Chạy backend trực tiếp trên host (tùy chọn)

Chuẩn nhóm: JDK 17, Spring Boot 3.5 (hiện 3.5.14), Maven và PostgreSQL 15+ hoặc Docker. Đặt `JAVA_HOME` tới JDK 17 trước khi build/chạy.

```powershell
# Tại thư mục gốc DACN-code: build/install thư viện solver trước lần chạy đầu.
. .\scripts\use-java17.ps1
java -version
mvn -version
# Cả hai phải dùng Java 17; Maven không tự chọn JDK từ java.version trong POM.
mvn -pl algorithm/tass-cpsat -am install -DskipTests
cd backend
docker compose up -d
mvn clean compile
mvn spring-boot:run
```

Compose nạp `backend/sql/01_schema.sql` và `backend/sql/02_seed.sql` khi volume mới được tạo. Mặc định API kết nối `jdbc:postgresql://localhost:5432/tass`, user `tass`, mật khẩu demo `tass_dev`. Có thể đặt `DB_URL`, `DB_USER`, `DB_PASSWORD` để dùng database khác. API lắng nghe trên `127.0.0.1` và hiện chưa có đăng nhập/phân quyền.

Chờ log ứng dụng đã khởi động rồi mở Swagger UI tại `http://127.0.0.1:8080/swagger-ui.html` hoặc OpenAPI JSON tại `http://127.0.0.1:8080/v3/api-docs`. Lệnh chạy app, kiểm tra đặc tả và xử lý lỗi getter/setter do dùng nhầm JDK được ghi tại [API.md](docs/API.md#xem-trực-tiếp). API nghiệp vụ plan/solver/kết quả/sửa phân công có kiểm tra Principal/phạm vi; chưa nối login thì các endpoint đó trả 401. DB/volume cũ cần migration 04–09; compose không tự chạy migration khi volume đã tồn tại.

## Endpoint

Mỗi tài nguyên có các endpoint sau:

| Method | URL | Kết quả |
| --- | --- | --- |
| GET | `/api/{resource}?limit=20&offset=0` | Danh sách theo `id` tăng dần; `limit` tối đa 100 |
| GET | `/api/{resource}/{id}` | Một bản ghi hoặc 404 |
| POST | `/api/{resource}` | Tạo bản ghi, trả 201 và header `Location` |
| PUT | `/api/{resource}/{id}` | Thay các trường trong request, trả bản ghi mới |
| DELETE | `/api/{resource}/{id}` | Xóa bản ghi, trả 204; 409 nếu đang được tham chiếu |

| Resource | Bảng SQL | Trường body bắt buộc | Trường tùy chọn |
| --- | --- | --- | --- |
| `schools` | `school` | `school_code`, `name`, `status` | |
| `academic-years` | `academic_year` | `school_id`, `year_code`, `starts_on`, `ends_on` | |
| `semesters` | `semester` | `academic_year_id`, `semester_no`, `starts_on`, `ends_on` | |
| `education-levels` | `education_level` | `level_code`, `name` | |
| `grades` | `grade` | `education_level_id`, `grade_code`, `name` | |
| `classes` | `school_class` | `academic_year_id`, `grade_id`, `class_code`, `status` | |
| `subjects` | `subject` | `subject_code`, `name`, `valid_from` | `valid_to` |
| `teachers` | `teacher` | `school_id`, `teacher_code`, `full_name` | |
| `teaching-demands` | `teaching_demand` | `semester_id`, `class_id`, `subject_id`, `periods_per_week`, `status`, `updated_by`, `demand_type`, `valid_from`, `valid_to`, `unit` | |
| `departments` | `department` | `school_id`, `department_code`, `name`, `valid_from` | `valid_to` |
| `teacher-employments` | `teacher_employment` | `teacher_id`, `department_id`, `semester_id`, `employment_status`, `position_code`, `valid_from` | `valid_to` |
| `teaching-qualifications` | `teaching_qualification` | `teacher_id`, `subject_id`, `education_level_id`, `verification_status`, `valid_from` | `verified_by`, `verified_at`, `evidence_ref`, `valid_to` |
| `teaching-experiences` | `teaching_experience` | `teacher_id`, `subject_id`, `grade_id`, `experience_status`, `as_of_date`, `recorded_by` | `years_of_experience`, `evidence_ref`, `source_import_id`, `verified_by`, `verified_at` |
| `assignment-rounds` | `assignment_round` | `semester_id`, `round_code`, `status` | `scope_confirmed_by`, `scope_confirmed_at`, `opens_at`, `closes_at` |
| `round-subject-scopes` | `round_subject_scope` | `round_id`, `grade_id`, `subject_id` | `confirmed_by`, `confirmed_at` |
| `class-subject-applicabilities` | `class_subject_applicability` | `scope_id`, `class_id`, `status`, `updated_by` | `reason`, `confirmed_by`, `confirmed_at`, `components_confirmed_by`, `components_confirmed_at` |
| `required-demand-components` | `required_demand_component` | `applicability_id`, `demand_type`, `valid_from`, `valid_to` | `demand_id`, `confirmed_by`, `confirmed_at` |
| `teacher-workload-bases` | `teacher_workload_basis` | `teacher_id`, `semester_id`, `education_level_id`, `position_code`, `base_periods_per_week`, `unit`, `valid_from`, `valid_to`, `profile_ref`, `verification_status` | `rule_definition_id`, `source_import_id`, `verified_by`, `verified_at` |
| `teaching-histories` | `teaching_history` | `teacher_id`, `academic_year_id`, `semester_id`, `class_id`, `subject_id`, `taught_from`, `taught_to`, `source_kind`, `evidence_ref`, `verification_status`, `recorded_by` | `source_import_id`, `source_plan_demand_id`, `verified_by`, `verified_at` |
| `teacher-duties` | `teacher_duty` | `teacher_id`, `semester_id`, `rule_definition_id`, `duty_type`, `scope_description`, `valid_from`, `verification_status`, `payment_status` | `class_id`, `valid_to`, `reduction_value`, `evidence_ref`, `verified_by` |

Danh sách `teachers` lọc theo `school_id`, `teacher_code`, `q` (tìm tên); `classes` theo `academic_year_id`, `grade_id`, `status`; `subjects` theo `subject_code`, `q`, `as_of`; `teaching-demands` theo `semester_id`, `class_id`, `subject_id`, `demand_type`, `status`, `as_of`. Ba tài nguyên mới lọc theo `teacher_id`, `semester_id` và các khóa ngữ cảnh tương ứng; hỗ trợ `verification_status` và `as_of`. Các bộ lọc có thể kết hợp với `limit`/`offset`; `as_of` tính cả ngày bắt đầu và kết thúc.

Body JSON dùng tên cột SQL dạng `snake_case`. Ngày dùng `YYYY-MM-DD`; thời điểm dùng ISO 8601 có múi giờ, ví dụ `2026-11-01T09:00:00+07:00`. `PUT` cần đủ trường bắt buộc; trường tùy chọn bỏ qua sẽ được đặt thành `null`. `id`, `updated_at` và `recorded_at` do ứng dụng quản lý. Các khóa ngoại và quy tắc dữ liệu tiếp tục do PostgreSQL kiểm tra.

`demand_type` nhận `STANDARD`, `SPECIALIZED_TOPIC` hoặc `ENRICHMENT`; `unit` phải là `PERIOD_PER_WEEK`. Kinh nghiệm dùng `UNKNOWN` (không có số năm), `NO_EXPERIENCE` (0 năm) hoặc `HAS_EXPERIENCE` (số năm dương và có bằng chứng xác nhận). Các cặp `confirmed_by`/`confirmed_at` phải được gửi cùng nhau. Khi sửa `required_demand_component`, trigger PostgreSQL xóa xác nhận tập thành phần trên bản ghi áp dụng tương ứng. Response của `assignment-rounds` chứa `source_revision_token` và `source_updated_at` do database quản lý; request không nhận hai trường này.

Ba API mới kiểm tra khoảng ngày, trạng thái xác nhận và số tiết trước khi lưu. PostgreSQL kiểm tra tiếp việc cùng trường, cùng năm/học kỳ, khoảng hiệu lực và các ràng buộc nghiệp vụ khác. `teacher_duty` loại `HOMEROOM` phải có `class_id`. Chưa có đăng nhập, vì vậy các trường người ghi nhận/xác nhận trong request chỉ là dữ liệu; không được xem là bằng chứng xác thực người dùng.

Ví dụ:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/teachers
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/teachers -ContentType application/json -Body '{"school_id":1,"teacher_code":"GV_NEW","full_name":"Nguyễn Văn A"}'
```

## Kiểm thử

```powershell
# Tại thư mục gốc DACN-code, build solver rồi backend và chạy kiểm thử:
mvn verify

# Sau khi đã install solver vào Maven local repository:
cd backend
mvn test
docker compose up -d
mvn test "-Ddb.integration=true"
```

`mvn test` kiểm tra cấu trúc 20 bộ API, HTTP CRUD và bộ lọc trên H2. Tùy chọn `db.integration=true` chạy thêm HTTP CRUD cho cả 20 tài nguyên trên PostgreSQL đã nạp schema và seed; các thay đổi trong test được rollback.

`SolverLibraryIntegrationTest` dùng Spring Boot với Jackson và OR-Tools thật, không cần DB. Khi build từ source mới, dùng `mvn verify` tại gốc: artifact `core` được tạo ở phase `package`, nên `mvn test` tại gốc chưa đủ để tạo dependency này.

## Sửa và khóa phân công

Đã có API sửa giáo viên/bỏ gán, khóa/mở khóa theo dòng hoặc atomic batch/toàn nhóm lớp–môn trong current DRAFT. Xem [ASSIGNMENT_MUTATION_API.md](docs/ASSIGNMENT_MUTATION_API.md); Swagger nhóm Manual assignments. DB cũ cần migration 09 sau 04–08; schema mới đã có guard. Không gồm UI hoặc workflow duyệt tăng tiết.
