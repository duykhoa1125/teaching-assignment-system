# TASS backend: CRUD dữ liệu đầu vào

Backend cung cấp REST API cho 17 bảng dữ liệu đầu vào trong `sql/01_schema.sql`. Schema có 48 bảng; các bảng snapshot, lượt chạy, kiểm tra và nhật ký được quản lý qua luồng nghiệp vụ, không có CRUD trực tiếp.

## Cấu trúc

Mã nguồn nằm tại `src/main/java/vn/edu/tass/backend` và được tổ chức theo mẫu Blog App API:

| Package | Nội dung |
| --- | --- |
| `controller` | 17 controller, mỗi tài nguyên một file |
| `entity` | 17 JPA entity, mỗi bảng một file |
| `mapper` | 17 mapper thủ công, mỗi bảng một file; ánh xạ request/entity/DTO theo từng trường |
| `exception` | Ngoại lệ và ánh xạ lỗi HTTP |
| `payload/request` | 17 request class có validation |
| `payload/dto` | 17 response DTO và DTO lỗi |
| `repository` | 17 interface riêng, mỗi interface kế thừa `JpaRepository` |
| `service` | 17 service interface |
| `service/impl` | 17 service implementation; CRUD dùng repository tương ứng trực tiếp |
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

Body JSON dùng tên cột SQL dạng `snake_case`. Ngày dùng `YYYY-MM-DD`; thời điểm dùng ISO 8601 có múi giờ, ví dụ `2026-11-01T09:00:00+07:00`. `PUT` cần đủ trường bắt buộc; trường tùy chọn bỏ qua sẽ được đặt thành `null`. `id`, `updated_at` và `recorded_at` do ứng dụng quản lý. Các khóa ngoại và quy tắc dữ liệu tiếp tục do PostgreSQL kiểm tra.

`demand_type` nhận `STANDARD`, `SPECIALIZED_TOPIC` hoặc `ENRICHMENT`; `unit` phải là `PERIOD_PER_WEEK`. Kinh nghiệm dùng `UNKNOWN` (không có số năm), `NO_EXPERIENCE` (0 năm) hoặc `HAS_EXPERIENCE` (số năm dương và có bằng chứng xác nhận). Các cặp `confirmed_by`/`confirmed_at` phải được gửi cùng nhau. Khi sửa `required_demand_component`, trigger PostgreSQL xóa xác nhận tập thành phần trên bản ghi áp dụng tương ứng. Response của `assignment-rounds` chứa `source_revision_token` và `source_updated_at` do database quản lý; request không nhận hai trường này.

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

`mvn test` kiểm tra cấu trúc 17 bộ CRUD, mapping với schema, HTTP CRUD và thao tác JPA thật trên H2. Tùy chọn `db.integration=true` chạy thêm HTTP CRUD trên PostgreSQL đã nạp schema và seed; các thay đổi trong test được rollback.
