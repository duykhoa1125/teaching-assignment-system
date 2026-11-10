# TASS backend: dữ liệu đầu vào, hồ sơ giáo viên và readiness

Backend cung cấp REST API cho 20 bảng dữ liệu đầu vào trong `sql/01_schema.sql`, hồ sơ giáo viên theo học kỳ và `GET /api/assignment-rounds/{id}/readiness` để kiểm tra dữ liệu trước khi lập phương án. Schema có 48 bảng; các bảng snapshot, lượt chạy, kiểm tra và nhật ký được quản lý qua luồng nghiệp vụ, không có CRUD trực tiếp.

Tài liệu API đầy đủ, gồm bộ lọc, mã lỗi và ví dụ request/response: [docs/API.md](docs/API.md). Khi chạy backend, mở Swagger UI tại `http://127.0.0.1:8080/swagger-ui.html`; đặc tả OpenAPI ở `/v3/api-docs` (JSON) hoặc `/v3/api-docs.yaml` (YAML).

## Cấu trúc

Mã nguồn nằm tại `src/main/java/vn/edu/tass/backend` và được tổ chức theo mẫu Blog App API:

| Package | Nội dung |
| --- | --- |
| `controller` | 20 controller CRUD, 1 controller hồ sơ giáo viên và 1 controller readiness |
| `entity` | 20 JPA entity, mỗi bảng một file |
| `mapper` | 20 mapper CRUD theo bảng và 1 mapper tổng hợp hồ sơ giáo viên |
| `exception` | Ngoại lệ và ánh xạ lỗi HTTP |
| `payload/request` | 20 request class có validation |
| `payload/dto` | 20 response DTO CRUD, DTO hồ sơ, DTO readiness và DTO lỗi |
| `repository` | 20 interface riêng, mỗi interface kế thừa `JpaRepository` |
| `service` | 20 service CRUD, 1 service hồ sơ và 1 service readiness |
| `service/impl` | 20 service CRUD, service tổng hợp hồ sơ và service kiểm tra readiness |
| `utils` | Kiểm tra tham số và phân trang theo `limit`/`offset` |

Ví dụ: `TeacherController` → `TeacherService` → `TeacherServiceImpl` → `TeacherRepository` → `Teacher`; `TeacherServiceImpl` dùng `TeacherMapper` để ánh xạ thủ công từng trường. Mapper có `toEntity`, `applyRequest` và `toDto`; `applyRequest` dùng cho cả tạo mới và cập nhật. JPA chỉ truy cập schema có sẵn; `spring.jpa.hibernate.ddl-auto=none`, nên ứng dụng không tự tạo hoặc sửa bảng PostgreSQL.

## Chạy local

Yêu cầu Java 17+, Maven và PostgreSQL 15+ hoặc Docker.

```powershell
cd backend
docker compose up -d
mvn spring-boot:run
```

Compose nạp `backend/sql/01_schema.sql` và `backend/sql/02_seed.sql` khi volume mới được tạo. Mặc định API kết nối `jdbc:postgresql://localhost:5432/tass`, user `tass`, mật khẩu demo `tass_dev`. Có thể đặt `DB_URL`, `DB_USER`, `DB_PASSWORD` để dùng database khác. API lắng nghe trên `127.0.0.1` và hiện chưa có đăng nhập/phân quyền.

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
cd backend
mvn test
docker compose up -d
mvn test "-Ddb.integration=true"
```

`mvn test` kiểm tra cấu trúc 20 bộ API, HTTP CRUD và bộ lọc trên H2. Tùy chọn `db.integration=true` chạy thêm HTTP CRUD cho cả 20 tài nguyên trên PostgreSQL đã nạp schema và seed; các thay đổi trong test được rollback.
