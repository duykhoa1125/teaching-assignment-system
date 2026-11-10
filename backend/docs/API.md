# TASS Backend API — dữ liệu đầu vào

Tài liệu này mô tả **các API đã triển khai**: 20 tài nguyên CRUD, gồm 40 URL và 100 tổ hợp method/URL. Các API đăng nhập, hồ sơ tổng hợp, readiness, phương án, phân công và solver chưa được triển khai nên không có trong đặc tả này.

## Xem trực tiếp

Chạy backend rồi mở:

- Swagger UI: `http://127.0.0.1:8080/swagger-ui.html`
- OpenAPI JSON: `http://127.0.0.1:8080/v3/api-docs`
- OpenAPI YAML: `http://127.0.0.1:8080/v3/api-docs.yaml`

Swagger UI có schema request/response, ví dụ body và mã phản hồi cho từng endpoint. Các ví dụ body cũng nằm trong `src/main/resources/api-examples.json`.

## Quy ước chung

Base path: `http://127.0.0.1:8080/api`. Body và response dùng JSON `snake_case` với `Content-Type: application/json`. Ngày dùng `YYYY-MM-DD`; thời điểm dùng ISO 8601 có múi giờ, ví dụ `2026-11-01T09:00:00+07:00`. Trường ID trong URL phải là số nguyên dương.

| Method | URL | Thành công | Ý nghĩa |
| --- | --- | --- | --- |
| `GET` | `/api/{resource}?limit=20&offset=0` | `200`, mảng JSON | Danh sách theo `id` tăng dần |
| `GET` | `/api/{resource}/{id}` | `200`, một object | Xem bản ghi |
| `POST` | `/api/{resource}` | `201`, object và header `Location` | Tạo bản ghi |
| `PUT` | `/api/{resource}/{id}` | `200`, object | Cập nhật bằng body đầy đủ |
| `DELETE` | `/api/{resource}/{id}` | `204`, không body | Xóa bản ghi |

`limit` mặc định 20, nhận 1–100. `offset` mặc định 0, phải không âm. Danh sách hiện trả **mảng JSON**, chưa có `total` hoặc cursor. `PUT` phải gửi lại mọi trường bắt buộc; trường tùy chọn không gửi sẽ thành `null`. JSON có trường lạ bị từ chối. `id`, `updated_at`, `recorded_at` là trường chỉ đọc. `assignment_round.source_revision_token` và `source_updated_at` cũng chỉ đọc.

### Bộ lọc

Bộ lọc chỉ áp dụng cho `GET /api/{resource}`. Có thể kết hợp nhiều bộ lọc với `limit`/`offset`. `q` tìm tên theo chuỗi con, không phân biệt chữ hoa/thường. `as_of` nhận ngày `YYYY-MM-DD` và tính cả ngày bắt đầu, ngày kết thúc.

| Resource | Bộ lọc tùy chọn ngoài `limit`/`offset` |
| --- | --- |
| `academic-years` | `school_id` |
| `semesters` | `academic_year_id` |
| `grades` | `education_level_id` |
| `classes` | `academic_year_id`, `grade_id`, `status` |
| `subjects` | `subject_code`, `q`, `as_of` |
| `teachers` | `school_id`, `teacher_code`, `q` |
| `teaching-demands` | `semester_id`, `class_id`, `subject_id`, `demand_type`, `status`, `as_of` |
| `departments` | `school_id`, `as_of` |
| `teacher-employments` | `teacher_id`, `department_id`, `semester_id`, `employment_status`, `as_of` |
| `teaching-qualifications` | `teacher_id`, `subject_id`, `education_level_id`, `verification_status`, `as_of` |
| `teaching-experiences` | `teacher_id`, `subject_id`, `grade_id`, `experience_status`, `as_of_date` (khớp chính xác ngày ghi nhận) |
| `assignment-rounds` | `semester_id`, `status` |
| `round-subject-scopes` | `round_id`, `grade_id`, `subject_id` |
| `class-subject-applicabilities` | `scope_id`, `class_id`, `status` |
| `required-demand-components` | `applicability_id`, `demand_type`, `as_of` |
| `teacher-workload-bases` | `teacher_id`, `semester_id`, `education_level_id`, `verification_status`, `as_of` |
| `teaching-histories` | `teacher_id`, `semester_id`, `class_id`, `subject_id`, `verification_status`, `as_of` |
| `teacher-duties` | `teacher_id`, `semester_id`, `duty_type`, `verification_status`, `as_of` |

`schools` và `education-levels` chỉ nhận `limit` và `offset` ở endpoint danh sách. Giáo viên và lớp không có cột hiệu lực trực tiếp, nên danh sách hai tài nguyên này không có `as_of`; ngày hiệu lực của môn, nhu cầu, định mức, lịch sử và nhiệm vụ được lọc qua chính các cột ngày của chúng.

## Mã lỗi

| Mã | Khi nào |
| --- | --- |
| `400 Bad Request` | JSON sai/thiếu trường bắt buộc, định dạng ngày sai, ID/limit/offset sai hoặc validation service không đạt |
| `404 Not Found` | URL `/{id}` không có bản ghi |
| `409 Conflict` | Trùng khóa `UNIQUE`, khóa ngoại không tồn tại, bản ghi đang được tham chiếu hoặc khoảng hiệu lực chồng lấn |
| `422 Unprocessable Entity` | Vi phạm ràng buộc/trigger PostgreSQL khác, gồm ngữ cảnh trường, học kỳ và hiệu lực |

Body lỗi có dạng:

```json
{"error":"Bad Request","code":"INVALID_REQUEST","message":"valid_to must be on or after valid_from"}
```

`code` là mã ổn định để client xử lý: `INVALID_REQUEST` (400), `RESOURCE_NOT_FOUND` (404), `DUPLICATE_RESOURCE`, `REFERENCE_CONFLICT`, `OVERLAPPING_PERIOD` (409) và `DATA_CONSTRAINT` (422). Thông điệp `message` phụ thuộc lỗi thực tế. Lỗi `400` do JSON/Bean Validation có thể trả thông điệp chung. Các trường `updated_by`, `recorded_by`, `verified_by`, `confirmed_by` hiện là ID do client gửi; **chưa có xác thực/phân quyền**, nên chúng chưa chứng minh danh tính người gọi.

## Danh mục 20 tài nguyên

Mỗi dòng dưới đây có đủ 5 method CRUD ở phần “Quy ước chung”. Body mẫu là **hình dạng request minh họa**; khi gọi thật, ID liên quan phải tồn tại, khoảng ngày phải hợp lệ và mã định danh không được trùng dữ liệu đang có. Dữ liệu seed có thể đã dùng một số cặp khóa trong ví dụ.

| Resource | Bảng SQL | Trường body bắt buộc | Trường body tùy chọn |
| --- | --- | --- | --- |
| `schools` | `school` | `school_code`, `name`, `status` | — |
| `academic-years` | `academic_year` | `school_id`, `year_code`, `starts_on`, `ends_on` | — |
| `semesters` | `semester` | `academic_year_id`, `semester_no`, `starts_on`, `ends_on` | — |
| `education-levels` | `education_level` | `level_code`, `name` | — |
| `grades` | `grade` | `education_level_id`, `grade_code`, `name` | — |
| `classes` | `school_class` | `academic_year_id`, `grade_id`, `class_code`, `status` | — |
| `subjects` | `subject` | `subject_code`, `name`, `valid_from` | `valid_to` |
| `teachers` | `teacher` | `school_id`, `teacher_code`, `full_name` | — |
| `teaching-demands` | `teaching_demand` | `semester_id`, `class_id`, `subject_id`, `periods_per_week`, `status`, `updated_by`, `demand_type`, `valid_from`, `valid_to`, `unit` | — |
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

## Ví dụ request cho từng tài nguyên

### Trường học — `/api/schools`

`POST /api/schools` hoặc `PUT /api/schools/{id}` dùng body `application/json`:

```json
{
  "school_code": "DEMO_NEW",
  "name": "Trường minh họa mới",
  "status": "ACTIVE"
}
```

### Năm học — `/api/academic-years`

`POST /api/academic-years` hoặc `PUT /api/academic-years/{id}` dùng body `application/json`:

```json
{
  "school_id": 1,
  "year_code": "2027-2028",
  "starts_on": "2027-08-01",
  "ends_on": "2028-07-31"
}
```

### Học kỳ — `/api/semesters`

`POST /api/semesters` hoặc `PUT /api/semesters/{id}` dùng body `application/json`:

```json
{
  "academic_year_id": 1,
  "semester_no": 2,
  "starts_on": "2027-01-01",
  "ends_on": "2027-05-31"
}
```

### Cấp học — `/api/education-levels`

`POST /api/education-levels` hoặc `PUT /api/education-levels/{id}` dùng body `application/json`:

```json
{
  "level_code": "TH",
  "name": "Tiểu học"
}
```

### Khối lớp — `/api/grades`

`POST /api/grades` hoặc `PUT /api/grades/{id}` dùng body `application/json`:

```json
{
  "education_level_id": 1,
  "grade_code": "11",
  "name": "Khối 11"
}
```

### Lớp học — `/api/classes`

`POST /api/classes` hoặc `PUT /api/classes/{id}` dùng body `application/json`:

```json
{
  "academic_year_id": 1,
  "grade_id": 1,
  "class_code": "10A4",
  "status": "ACTIVE"
}
```

### Môn học — `/api/subjects`

`POST /api/subjects` hoặc `PUT /api/subjects/{id}` dùng body `application/json`:

```json
{
  "subject_code": "TIN_HOC",
  "name": "Tin học",
  "valid_from": "2026-08-01"
}
```

### Giáo viên — `/api/teachers`

`POST /api/teachers` hoặc `PUT /api/teachers/{id}` dùng body `application/json`:

```json
{
  "school_id": 1,
  "teacher_code": "GV_NEW",
  "full_name": "Nguyễn Văn A"
}
```

### Nhu cầu giảng dạy — `/api/teaching-demands`

`POST /api/teaching-demands` hoặc `PUT /api/teaching-demands/{id}` dùng body `application/json`:

```json
{
  "semester_id": 1,
  "class_id": 1,
  "subject_id": 1,
  "periods_per_week": 4,
  "status": "ACTIVE",
  "updated_by": 1,
  "demand_type": "STANDARD",
  "valid_from": "2026-09-01",
  "valid_to": "2026-12-31",
  "unit": "PERIOD_PER_WEEK"
}
```

### Tổ chuyên môn — `/api/departments`

`POST /api/departments` hoặc `PUT /api/departments/{id}` dùng body `application/json`:

```json
{
  "school_id": 1,
  "department_code": "TIN",
  "name": "Tổ Tin học",
  "valid_from": "2026-08-01"
}
```

### Công tác giáo viên — `/api/teacher-employments`

`POST /api/teacher-employments` hoặc `PUT /api/teacher-employments/{id}` dùng body `application/json`:

```json
{
  "teacher_id": 1,
  "department_id": 1,
  "semester_id": 1,
  "employment_status": "TEACHING",
  "position_code": "TEACHER",
  "valid_from": "2026-08-01"
}
```

### Chuyên môn giảng dạy — `/api/teaching-qualifications`

`POST /api/teaching-qualifications` hoặc `PUT /api/teaching-qualifications/{id}` dùng body `application/json`:

```json
{
  "teacher_id": 1,
  "subject_id": 1,
  "education_level_id": 1,
  "verification_status": "PENDING",
  "valid_from": "2026-08-01"
}
```

### Kinh nghiệm giảng dạy — `/api/teaching-experiences`

`POST /api/teaching-experiences` hoặc `PUT /api/teaching-experiences/{id}` dùng body `application/json`:

```json
{
  "teacher_id": 1,
  "subject_id": 1,
  "grade_id": 1,
  "experience_status": "UNKNOWN",
  "as_of_date": "2026-08-01",
  "recorded_by": 1
}
```

### Đợt phân công — `/api/assignment-rounds`

`POST /api/assignment-rounds` hoặc `PUT /api/assignment-rounds/{id}` dùng body `application/json`:

```json
{
  "semester_id": 1,
  "round_code": "ROUND_NEW",
  "status": "DRAFT"
}
```

### Phạm vi môn của đợt — `/api/round-subject-scopes`

`POST /api/round-subject-scopes` hoặc `PUT /api/round-subject-scopes/{id}` dùng body `application/json`:

```json
{
  "round_id": 1,
  "grade_id": 1,
  "subject_id": 1
}
```

### Áp dụng môn cho lớp — `/api/class-subject-applicabilities`

`POST /api/class-subject-applicabilities` hoặc `PUT /api/class-subject-applicabilities/{id}` dùng body `application/json`:

```json
{
  "scope_id": 1,
  "class_id": 1,
  "status": "UNDETERMINED",
  "updated_by": 1
}
```

### Thành phần nhu cầu bắt buộc — `/api/required-demand-components`

`POST /api/required-demand-components` hoặc `PUT /api/required-demand-components/{id}` dùng body `application/json`:

```json
{
  "applicability_id": 1,
  "demand_type": "STANDARD",
  "valid_from": "2026-09-01",
  "valid_to": "2026-12-31"
}
```

### Cơ sở định mức giáo viên — `/api/teacher-workload-bases`

`POST /api/teacher-workload-bases` hoặc `PUT /api/teacher-workload-bases/{id}` dùng body `application/json`:

```json
{
  "teacher_id": 1,
  "semester_id": 1,
  "education_level_id": 1,
  "position_code": "TEACHER",
  "base_periods_per_week": 17,
  "unit": "PERIOD_PER_WEEK",
  "valid_from": "2026-08-01",
  "valid_to": "2026-12-31",
  "profile_ref": "hoso:gv:1",
  "verification_status": "PENDING"
}
```

### Lịch sử thực dạy — `/api/teaching-histories`

`POST /api/teaching-histories` hoặc `PUT /api/teaching-histories/{id}` dùng body `application/json`:

```json
{
  "teacher_id": 1,
  "academic_year_id": 1,
  "semester_id": 1,
  "class_id": 1,
  "subject_id": 1,
  "taught_from": "2026-09-01",
  "taught_to": "2026-12-31",
  "source_kind": "EXTERNAL_RECORD",
  "evidence_ref": "bienban:1",
  "verification_status": "PENDING",
  "recorded_by": 1
}
```

### Nhiệm vụ giáo viên — `/api/teacher-duties`

`POST /api/teacher-duties` hoặc `PUT /api/teacher-duties/{id}` dùng body `application/json`:

```json
{
  "teacher_id": 1,
  "semester_id": 1,
  "rule_definition_id": 1,
  "duty_type": "HOMEROOM",
  "class_id": 1,
  "scope_description": "Chủ nhiệm lớp 10A1",
  "valid_from": "2026-08-01",
  "verification_status": "PENDING",
  "payment_status": "UNPAID"
}
```

## Ví dụ response và truy vấn

Tạo giáo viên:

```http
POST /api/teachers HTTP/1.1
Content-Type: application/json

{"school_id":1,"teacher_code":"GV_NEW","full_name":"Nguyễn Văn A"}
```

Response minh họa:

```http
HTTP/1.1 201 Created
Location: /api/teachers/101
Content-Type: application/json

{"id":101,"school_id":1,"teacher_code":"GV_NEW","full_name":"Nguyễn Văn A"}
```

Lọc nhu cầu giảng dạy còn hiệu lực tại một ngày, mỗi trang tối đa 20 bản ghi:

```http
GET /api/teaching-demands?semester_id=1&demand_type=STANDARD&status=ACTIVE&as_of=2026-10-01&limit=20&offset=0
```

Một phần tử response minh họa:

```json
{
  "id": 101,
  "semester_id": 1,
  "class_id": 1,
  "subject_id": 1,
  "periods_per_week": 4.00,
  "status": "ACTIVE",
  "updated_by": 1,
  "updated_at": "2026-10-01T09:00:00+07:00",
  "demand_type": "STANDARD",
  "valid_from": "2026-09-01",
  "valid_to": "2026-12-31",
  "unit": "PERIOD_PER_WEEK"
}
```

Lọc định mức giáo viên:

```http
GET /api/teacher-workload-bases?teacher_id=1&semester_id=1&verification_status=VERIFIED&as_of=2026-10-01
```

### Kiểm tra dữ liệu quan trọng

- `teaching_demand.status`: `ACTIVE`, `INACTIVE`.
- `teacher_employment.employment_status`: `TEACHING`, `ON_LEAVE`, `INACTIVE`. `ON_LEAVE` là tạm nghỉ; để ngừng hiệu lực công tác, kết thúc khoảng `TEACHING` cũ rồi ghi khoảng `INACTIVE` không chồng lấn. Bảng `teacher` chưa có cột trạng thái riêng.
- `teaching_qualification.verification_status`: `PENDING`, `VERIFIED`, `INACTIVE`. Khi ngừng hiệu lực chuyên môn, cần kết thúc khoảng `VERIFIED` cũ hoặc cập nhật bản ghi cũ; thêm một bản ghi `INACTIVE` chồng lấn không vô hiệu hóa bản `VERIFIED` còn hiệu lực. Các bảng khác có `verification_status` giữ tập giá trị riêng.
- Database đã tồn tại cần kiểm tra dữ liệu cũ rồi chạy `sql/03_status_contract_migration.sql`. Script đổi `MATERNITY_LEAVE` thành `ON_LEAVE` và thêm ba CHECK constraint; trạng thái ngoài tập được duyệt sẽ khiến transaction thất bại để xử lý thủ công.
- `school.status`, `school_class.status`, `assignment_round.status` và `teacher_duty.payment_status` vẫn chỉ yêu cầu chuỗi không rỗng theo schema.
- `class_subject_applicability.status`: `APPLICABLE`, `NOT_APPLICABLE`, `UNDETERMINED`. Khi gửi `confirmed_by` cần gửi cả `confirmed_at`; `components_confirmed_by` và `components_confirmed_at` cũng phải đi cùng nhau. `required_demand_component.confirmed_by` và `confirmed_at` áp dụng quy tắc tương tự.
- `assignment_round.scope_confirmed_by` đi cùng `scope_confirmed_at`; `round_subject_scope.confirmed_by` đi cùng `confirmed_at`; `teaching_qualification.verified_by` đi cùng `verified_at`. `assignment_round.closes_at` không được trước `opens_at`.
- `teaching_demand.demand_type`: `STANDARD`, `SPECIALIZED_TOPIC`, `ENRICHMENT`; `unit` là `PERIOD_PER_WEEK`; `periods_per_week` dương, tối đa 999.99, tối đa 2 chữ số thập phân.
- `required_demand_component.demand_type` dùng cùng ba giá trị với nhu cầu giảng dạy. Khi sửa thành phần bắt buộc, trigger PostgreSQL xóa xác nhận tập thành phần của bản ghi áp dụng tương ứng.
- `teaching_experience.experience_status`: `UNKNOWN` không có số năm, `NO_EXPERIENCE` bằng 0, `HAS_EXPERIENCE` dương. Hai trạng thái đã biết cần có `verified_by`, `verified_at` và `evidence_ref` không rỗng.
- `teaching_history.source_kind`: `EXTERNAL_RECORD` hoặc `CONFIRMED_ACTUAL`. `teaching_history` và `teacher_workload_basis` dùng `verification_status` là `PENDING`, `VERIFIED`, `REJECTED`; `VERIFIED` cần `verified_by` và `verified_at`.
- `teacher_workload_basis.base_periods_per_week` dương, tối đa 999.99, tối đa 2 chữ số thập phân; `unit` là `PERIOD_PER_WEEK`. Với hồ sơ `TEACHER` đã xác nhận, PostgreSQL kiểm tra giá trị theo cấp học trong schema hiện tại.
- `teacher_duty.duty_type=HOMEROOM` yêu cầu `class_id`. `reduction_value` không âm, tối đa 999.99, tối đa 2 chữ số thập phân.
- Ngày kết thúc phải không trước ngày bắt đầu. ID trong request phải dương, các trường `VARCHAR` có giới hạn độ dài theo schema và `semester_no` thuộc khoảng 1–32767. PostgreSQL còn kiểm tra mối quan hệ giữa trường, năm học, học kỳ, lớp, môn và khoảng hiệu lực. Các bản ghi đang được tham chiếu có thể không sửa/xóa được.

## Chạy và kiểm thử

```powershell
cd backend
docker compose up -d
mvn spring-boot:run
```

Mở Swagger UI ở `http://127.0.0.1:8080/swagger-ui.html`. Nếu cần kiểm thử trên PostgreSQL đã nạp schema và seed, chạy `mvn test "-Ddb.integration=true"`. Dữ liệu demo trong `sql/02_seed.sql` không phải dữ liệu pháp lý thực tế.
