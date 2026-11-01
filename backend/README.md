# TASS backend CRUD

## Cấu trúc mã nguồn

`src/main/java/vn/edu/tass/backend` được chia theo trách nhiệm:

| Package | Vai trò |
| --- | --- |
| `controller` | Nhận HTTP request và trả response |
| `payload/dto` | DTO cho JSON request/response |
| `entity` | 16 class entity, mỗi bảng đầu vào một file; khai báo tên bảng, cột và kiểu dữ liệu |
| `service` | Kiểm tra dữ liệu và điều phối CRUD |
| `repository` | Truy vấn PostgreSQL bằng JDBC |
| `model` | Danh mục URL của 16 resource; đọc metadata cột từ entity |
| `exception` | Lỗi nghiệp vụ và ánh xạ sang HTTP status |

Các endpoint dùng chung controller/service/repository vì 16 bảng có cùng thao tác CRUD. Mỗi bảng có một entity riêng trong `entity`; `ResourceCatalog` đọc metadata từ các entity để giới hạn các cột có thể ghi. Các entity dùng với JDBC, nên annotation `@SqlTable` và `@SqlColumn` là metadata của backend. URL và JSON vẫn giữ dạng mô tả bên dưới.

REST API Spring Boot cho **16 bảng dữ liệu đầu vào** trong `sql/01_schema.sql`. Ba file trong `backend/sql` là bản sao của thư mục `sql` tại workspace để backend chạy được khi clone repo riêng. Schema gốc có 41 bảng; API chỉ mở CRUD cho nhóm dữ liệu đầu vào.

## Chạy local

Yêu cầu Java 17+, Maven và Docker (hoặc PostgreSQL 15+ đã tạo schema bằng `sql/01_schema.sql`).

```powershell
cd backend
docker compose up -d
mvn spring-boot:run
```

Compose khởi tạo schema và dữ liệu demo từ `backend/sql/01_schema.sql` và `backend/sql/02_seed.sql` **chỉ khi volume database còn trống**. API mặc định kết nối `jdbc:postgresql://localhost:5432/tass`, user `tass`, mật khẩu demo `tass_dev`. Với database riêng, đặt `DB_URL`, `DB_USER`, `DB_PASSWORD` trước khi chạy. API chỉ lắng nghe trên `127.0.0.1` và hiện chưa có đăng nhập/phân quyền.

## Endpoint

Mỗi resource hỗ trợ:

| Method | URL | Kết quả |
| --- | --- | --- |
| GET | `/api/{resource}?limit=20&offset=0` | Danh sách theo `id` tăng dần; `limit` tối đa 100 |
| GET | `/api/{resource}/{id}` | Một bản ghi hoặc 404 |
| POST | `/api/{resource}` | Tạo, trả 201 và header `Location` |
| PUT | `/api/{resource}/{id}` | Thay toàn bộ các cột được phép sửa, trả bản ghi mới |
| DELETE | `/api/{resource}/{id}` | Xóa, trả 204; 409 nếu bản ghi đang được tham chiếu |

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
| `teaching-demands` | `teaching_demand` | `semester_id`, `class_id`, `subject_id`, `periods_per_week`, `status`, `updated_by`, `demand_type` | |
| `departments` | `department` | `school_id`, `department_code`, `name`, `valid_from` | `valid_to` |
| `teacher-employments` | `teacher_employment` | `teacher_id`, `department_id`, `semester_id`, `employment_status`, `position_code`, `valid_from` | `valid_to` |
| `teaching-qualifications` | `teaching_qualification` | `teacher_id`, `subject_id`, `education_level_id`, `verification_status`, `valid_from` | `verified_by`, `verified_at`, `evidence_ref`, `valid_to` |
| `teaching-experiences` | `teaching_experience` | `teacher_id`, `subject_id`, `experience_level`, `experience_period`, `recorded_by` | `grade_id` |
| `assignment-rounds` | `assignment_round` | `semester_id`, `round_code`, `status` | `scope_confirmed_by`, `scope_confirmed_at`, `opens_at`, `closes_at` |
| `round-subject-scopes` | `round_subject_scope` | `round_id`, `grade_id`, `subject_id` | `confirmed_by`, `confirmed_at` |
| `class-subject-applicabilities` | `class_subject_applicability` | `scope_id`, `class_id`, `status`, `updated_by` | `reason` |

Body JSON dùng **tên cột SQL dạng snake_case**. Ngày dùng `YYYY-MM-DD`; thời điểm dùng ISO 8601 có múi giờ, ví dụ `2026-11-01T09:00:00+07:00`. ID và `semester_no` là số nguyên; `periods_per_week` là số. `PUT` cần đủ mọi trường bắt buộc, và trường tùy chọn bỏ qua sẽ thành `null`. `id`, `updated_at` và `recorded_at` do database/API quản lý. PostgreSQL kiểm tra khóa ngoại, tính duy nhất, ngày hợp lệ, và các trigger ngữ cảnh. `updated_by`, `recorded_by` và các trường xác nhận phải là ID một `user_account` có sẵn; dữ liệu demo có ID `1`. Giá trị `class-subject-applicabilities.status` là `APPLICABLE`, `NOT_APPLICABLE` hoặc `UNDETERMINED`; giá trị `teaching-demands.demand_type` là `STANDARD` hoặc `SPECIALIZED_TOPIC`.

Ví dụ:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/teachers
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/teachers -ContentType application/json -Body '{"school_id":1,"teacher_code":"GV_NEW","full_name":"Nguyễn Văn A"}'
Invoke-RestMethod -Method Put -Uri http://127.0.0.1:8080/api/teachers/5 -ContentType application/json -Body '{"school_id":1,"teacher_code":"GV_NEW","full_name":"Nguyễn Văn B"}'
Invoke-RestMethod -Method Delete -Uri http://127.0.0.1:8080/api/teachers/5
```

Nếu dùng PostgreSQL bên ngoài Docker, chạy `backend/sql/01_schema.sql`, sau đó tùy chọn chạy `backend/sql/02_seed.sql`. `backend/sql/03_queries.sql` là truy vấn kiểm tra chỉ đọc.

## Kiểm thử

```powershell
cd backend
mvn test
docker compose up -d
mvn test "-Ddb.integration=true"
docker compose down
```

Lệnh đầu kiểm tra danh sách đúng 16 resource, đối chiếu cột với schema SQL, kiểm tra đường đi CRUD và HTTP. Lệnh có `db.integration=true` chạy thêm 16 bài CRUD trên PostgreSQL thật, mỗi bài tạo, đọc, sửa, xóa rồi rollback để không đổi dữ liệu demo. Cần database đã được khởi tạo từ `backend/sql/01_schema.sql` và `backend/sql/02_seed.sql`.
