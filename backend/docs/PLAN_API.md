# Plan và current DRAFT — SOL-02

API quản lý phần phương án tối thiểu để chuẩn bị luồng solver. Không mở CRUD trực tiếp cho version, snapshot hoặc phân công. Dữ liệu và lịch sử cũ giữ nguyên; không cần migration cho bước này.

## Endpoint

| Method | URL | Thành công | Ý nghĩa |
| --- | --- | --- | --- |
| POST | `/api/assignment-rounds/{id}/plan` | 201 | Tạo một plan, snapshot nguồn, DRAFT V1 và các dòng nhu cầu chưa gán |
| GET | `/api/assignment-rounds/{id}/plan` | 200 | Đọc current version và metadata snapshot của plan |
| GET | `/api/plan-versions/{id}` | 200 | Đọc metadata một version, kể cả lịch sử |
| POST | `/api/plan-versions/{id}/refresh-snapshot` | 200 | Chụp lại nguồn và đối soát nhu cầu trong current DRAFT |

POST tạo plan nhận:

```json
{"optimization_config_id": 1, "rule_set_version_id": 1}
```

POST refresh nhận:

```json
{"expected_revision": 2, "optimization_config_id": 1, "rule_set_version_id": 1}
```

ID phải dương; `expected_revision` bắt buộc và không âm. Cấu hình và bộ quy tắc phải có cặp xác nhận, quy tắc phủ toàn học kỳ. Đây là điều kiện tạo snapshot nguồn; kiểm tra nội dung/quy tắc nghiệp vụ và readiness đầy đủ thuộc SOL-03/04/05. API không nhận actor, snapshot, assignments hoặc token từ client; trường lạ bị từ chối.

Response là `PlanVersionDto` dùng snake_case, gồm `plan_id`, `round_id`, `plan_code`, `current_version_id`, `version_id`, `version_no`, `source_version_id`, `status`, `revision_no`, `is_current`, `input_snapshot_id`, `snapshot_schema_version`, `snapshot_content_hash`, `source_revision_token`, `live_source_revision_token`, `snapshot_fresh`, `optimization_config_id`, `rule_set_version_id`, `captured_at`, `created_by`, `created_at`, `demand_count`, `locked_count`. `created_by/created_at` là người/thời điểm tạo version. Không trả payload hồ sơ giáo viên trong response này.

`Location` của POST tạo plan trỏ tới `/api/plan-versions/{version_id}`. `plan_code` do server sinh `ROUND-{round_id}`. Nếu đã có plan, trả 409; không tự tạo version mới hoặc ghi đè plan cũ. GET current có thể trả version ở trạng thái khác DRAFT; thao tác refresh chỉ nhận current DRAFT.

## Giao dịch và revision

Tạo plan khóa round để tuần tự hóa hai yêu cầu đồng thời. Thứ tự ghi là snapshot → plan có current null → DRAFT → đặt current → chèn các nhu cầu ACTIVE trong phạm vi APPLICABLE. Mỗi nhu cầu có số tiết từ snapshot, `teacher_id=null`, lý do `NOT_ASSIGNED`. Lỗi ở bất kỳ bước nào rollback toàn bộ.

Refresh khóa plan → version → round, kiểm tra current DRAFT và expected revision, chụp snapshot mới rồi đối soát:

- Giữ nguyên dòng, người được gán và metadata khóa còn hợp lệ.
- Khóa có nhu cầu biến mất, đổi số tiết hoặc giáo viên mất điều kiện sẽ gây `LOCK_CONFLICT`; snapshot vừa tạo cũng rollback.
- Bỏ dòng nhu cầu không còn trong phạm vi ACTIVE/APPLICABLE, cập nhật số tiết và thêm nhu cầu mới chưa gán.
- Giáo viên chưa khóa mà mất điều kiện được bỏ gán với lý do `INELIGIBLE_AFTER_REFRESH`. Điều kiện công tác/chuyên môn dùng hàm DB hiện có, xét toàn khoảng hiệu lực.

Trigger tăng revision khi đổi snapshot và theo từng dòng phân công thực sự đổi. Service không cộng thêm revision trong Java và luôn đọc lại giá trị cuối. Ví dụ hai dòng nhu cầu mới cho V1 tạo `revision_no=2`; refresh đổi snapshot và ba dòng dữ liệu có thể tăng 4. Trạng thái vẫn DRAFT.

`snapshot_fresh` chỉ so token snapshot với nguồn sống, không chứng minh readiness hay đủ điều kiện mở phản hồi. SQLSTATE về đồng thời được trả 409 `CONCURRENT_MODIFICATION`; client đọc lại plan trước khi thử lại. Service không tự retry thao tác với revision cũ.

## Snapshot nguồn

`db/capture-plan-source.sql` chụp dữ liệu nguồn trong một câu SQL/MVCC snapshot, khi service giữ khóa round để đồng bộ với source-token trigger. Dữ liệu gồm nhu cầu, phạm vi, giáo viên, công tác/chuyên môn/kinh nghiệm, tải/nhiệm vụ, quy tắc/cấu hình và khóa/phân công trước đó. Snapshot là append-only theo schema hiện có.

Payload có `purpose=PLAN_DRAFT_SOURCE`, `solver_input_ready=false`, `normalization_status=NOT_BUILT`. `experience_penalties` chưa được tính, được để mảng rỗng theo cấu trúc DB và đánh dấu chưa chuẩn hóa. Đây là snapshot nguồn cho DRAFT, không được đưa trực tiếp vào solver. Adapter đầy đủ `tass-solver/2`, tải B/F/C/R, scoring, precheck và SHA-256 canonical thuộc SOL-04/05.

Hash DB vẫn là `md5(payload_json::text)` theo trigger hiện hành; không nhầm nó với SHA-256 của DTO solver. Service không gọi helper demo `tass_capture_snapshot` và không tạo dữ liệu PASS/0 giả để cho phép giải.

## Nối authentication

Checkout hiện chưa có Spring Security, JWT/session hoặc login. Team chưa chốt kiểu principal; dự định cấp tài khoản rồi đổi mật khẩu không quyết định hợp đồng principal.

`PlanActorResolver` tách riêng chỗ lấy user ID. Adapter tạm `PrincipalPlanActorResolver` ánh xạ `Principal.getName()` sang `user_account.login_name`, chỉ nhận tài khoản ACTIVE. Khi auth của nhóm có principal chứa user ID, thay adapter này; không cần đổi service/transaction/API body.

Service kiểm tra cùng trường, vai trò `ACADEMIC_MANAGER`, `manager_scope` phủ các khối của round trong toàn học kỳ. Ghi actor vào `created_by` và transaction-local `tass.actor_id` cho audit. Không đọc actor từ header/body/query. Principal trong test được cấp bằng MockMvc; production chỉ được cấp từ cơ chế xác thực server. Gọi HTTP ẩn danh hiện trả 401. Tài khoản demo trong seed vẫn DISABLED.

## Mã lỗi

| HTTP | code | Trường hợp |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | ID/body sai hoặc có trường lạ |
| 401 | `AUTHENTICATION_REQUIRED` | Chưa có principal |
| 403 | `PLAN_ACCESS_DENIED` | Tài khoản không hoạt động, sai vai trò/trường hoặc thiếu phạm vi |
| 404 | `RESOURCE_NOT_FOUND` | Không có round/plan/version |
| 409 | `PLAN_ALREADY_EXISTS` | Round đã có plan |
| 409 | `CURRENT_DRAFT_REQUIRED` | Refresh version lịch sử hoặc không phải DRAFT |
| 409 | `REVISION_CONFLICT` | expected revision cũ |
| 409 | `LOCK_CONFLICT` | Snapshot mới xung đột khóa |
| 409 | `CONCURRENT_MODIFICATION` | Xung đột transaction/source token/deadlock |
| 422 | `CONFIGURATION_NOT_CONFIRMED` | Cấu hình/quy tắc thiếu xác nhận hoặc không phủ học kỳ |

Các mã lỗi ràng buộc DB chung tiếp tục theo [API.md](API.md).

## Kiểm thử

`AssignmentPlanPostgresTest` dùng Spring Boot/MockMvc và PostgreSQL thật với schema/trigger hiện hành. Test chạy có commit và tạo fixture riêng nên chỉ bật trên **DB kiểm thử dùng riêng** đã nạp `01_schema.sql` rồi `02_seed.sql`:

```powershell
# Sau bước install solver, tại backend. Thay URL/user/password bằng DB kiểm thử riêng.
mvn test "-Dplan.integration=true" "-Dplan.test.url=jdbc:postgresql://127.0.0.1:55432/tass_plan_test" "-Dplan.test.user=tass" "-Dplan.test.password=tass_test"
```

Ngày 11/11/2026: **11/11 test đạt** bằng JUnit Jupiter Engine từ cache, trên JDK 21 (`--release 17`), Spring Boot 3.5.14 và cluster PostgreSQL 18 tạm tại `D:/HCMUT/DACN/tmp/plan-api-20261111`. Cluster được khởi tạo riêng, nạp schema/seed và dừng sau kiểm thử; không kết nối DB hiện có của người dùng.

Đã kiểm chứng: create/read qua API, revision/audit/checksum, freshness, thêm/bớt/sửa nhu cầu khi refresh, giữ khóa, rollback khóa xung đột, bỏ gán người mất điều kiện, revision cũ/lịch sử, auth/phạm vi, cấu hình không hợp lệ, lỗi giữa batch và hai yêu cầu create/refresh đồng thời.

Log: `tests.log`, `compile.log`, `server.log` trong thư mục kiểm thử trên; runner dự phòng là `run-plan-tests.py`. Tại mốc SOL-02, Maven đầy đủ/OpenAPI/H2 cũ chưa được kiểm chứng do dependency/mạng. Mốc SOL-03 đã kiểm chứng thêm HTTP/OpenAPI/H2 và Spring/JPA cùng plan/readiness qua JUnit Engine từ cache; xem [READINESS_API.md](READINESS_API.md). Maven verify toàn bộ vẫn chưa xác nhận. Chưa có lượt solver từ dữ liệu DB trong SOL-02.
