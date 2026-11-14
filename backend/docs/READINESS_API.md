# Readiness theo đợt — SOL-03

Chuẩn nhóm: **JDK 17, Spring Boot 3.5** (POM hiện 3.5.14). Endpoint đọc dữ liệu chuẩn bị, không tạo plan/snapshot, sửa nguồn hoặc chạy solver.

## Request và quyền

```http
GET /api/assignment-rounds/{id}/readiness?optimization_config_id=1&rule_set_version_id=1
```

Gửi cả hai ID dương hoặc bỏ cả hai. Khi bỏ cả hai, service dùng cấu hình/quy tắc trong current snapshot. Nếu chưa có plan để chọn mặc định, trả 200 với lỗi nghiệp vụ `CONFIGURATION_SELECTION_REQUIRED` trong `issues`; không tự chọn cấu hình mới nhất. ID không tồn tại/chưa xác nhận cũng được báo trong readiness. Chỉ gửi một ID, ID không dương hoặc không phải số trả 400.

Auth/phạm vi dùng cùng `PlanActorResolver` với plan API: principal tin cậy, tài khoản ACTIVE, vai trò ACADEMIC_MANAGER và manager_scope phủ đợt. HTTP ẩn danh trả 401, sai phạm vi trả 403, round không tồn tại trả 404. Backend chưa có login; adapter principal vẫn tách riêng để nối auth của nhóm.

## Response

`RoundReadinessDto` dùng snake_case, gồm:

| Trường | Ý nghĩa |
| --- | --- |
| `round_id`, `source_revision_token` | Đợt và token nguồn tại lần đọc nhất quán |
| `optimization_config_id`, `rule_set_version_id` | Lựa chọn đang tiền kiểm; có thể null khi chưa chọn |
| `starts_on`, `ends_on` | Bao khoảng hiệu lực nhu cầu ACTIVE/APPLICABLE; fallback học kỳ khi không có nhu cầu |
| `current_version_id`, `revision_no` | Current version/revision, null khi chưa có plan |
| `can_run_solver` | Đạt các kiểm tra nguồn hiện có cho một lượt giải DRAFT |
| `can_open_feedback`, `can_export` | Điều kiện phát hành riêng theo coverage/validation/freshness/lifecycle |
| `preflight_only=true`, `solver_input_validated=false` | Chưa tính tải/scoring đầy đủ hoặc validate DTO chuẩn hóa |
| `coverage` | Số thành phần bắt buộc đã gán, chưa gán, thiếu nhu cầu hoặc thiếu dòng plan |
| `issues` | Mã, mức độ, loại vấn đề, đối tượng, thông điệp và cách bổ sung |

Một issue có `code`, `severity` (`ERROR`/`WARNING`/`INFO`), `category`, `entity_type`, `entity_id`, `related_id`, `message`, `suggestion`. `related_id` thường chỉ teacher/demand hoặc kỳ tính liên quan; không trả toàn bộ hồ sơ GV. Kết quả sắp theo mã/đối tượng/ID để UI đối soát ổn định.

`can_run_solver` là tiền kiểm nguồn, không thay thế `InputValidator` sau mapping, bộ tính tải/quy tắc hoặc quyền/lifecycle của POST run. Có thể kiểm tra nguồn trước khi tạo DRAFT. Khi current đã tồn tại và không phải DRAFT, cờ này là false. Snapshot cũ được cảnh báo: run preparation sau này phải refresh dưới khóa và lấy revision mới. Không dùng GET trước đó làm bằng chứng cho phép chạy.

## Kiểm tra dữ liệu

Service đọc `v_tass_preparation_issues`, `v_tass_required_coverage` và bổ sung kiểm tra trong một transaction read-only `REPEATABLE_READ`, để token và các phép đọc cùng thấy một phiên bản nguồn.

- Trường/học kỳ/phạm vi; xác nhận scope, áp dụng lớp–môn và tập thành phần bắt buộc. Nhu cầu ACTIVE ngoài tập bắt buộc không bị bỏ qua để cho phép chạy.
- Số tiết dương, tối đa 999.99, hai chữ số thập phân và đơn vị `PERIOD_PER_WEEK`; lớp ACTIVE và hiệu lực môn phủ nhu cầu.
- Tình trạng công tác trong khoảng giải; định mức đã xác nhận, đúng vị trí và phủ toàn khoảng cho người TEACHING.
- Bối cảnh trường đã xác nhận; kỳ tính tải và `OUTSIDE_SCOPE_WEEKLY` có số tiết/bằng chứng, kể cả 0 có xác nhận. Không dùng bản ghi tham chiếu phương án làm F ngoài phạm vi khi chưa chứng minh không tính trùng.
- Từ SOL-04, cần metadata xác nhận danh sách nguồn theo round/kỳ tính; thiếu hoặc sai tập D báo `WORKLOAD_INVENTORY_UNCONFIRMED`. Bộ chuẩn bị đầy đủ còn kiểm tra danh sách R/C khớp nguồn, xem [WORKLOAD_PREPARATION.md](WORKLOAD_PREPARATION.md).
- Nhiệm vụ/giảm tiết/hoạt động trong tải phải có giá trị, xác nhận và chứng cứ; quy tắc thuộc bộ đã chọn và phủ hiệu lực.
- Cấu hình/quy tắc có xác nhận, hợp đồng cấu hình hợp lệ và phủ khoảng giải. Ngưỡng tải tuần lấy từ cấu hình đã chọn (`hard_limits.max_total_weekly`, `hard_limits.basis`, `hard_limits.source`), không lấy 25 làm ngưỡng chung. Nhóm đã chọn basis T cho cấu hình minh họa. Nhãn demo vẫn được cảnh báo.
- Ứng viên theo hàm DB `tass_teacher_eligible`, xét công tác/chuyên môn phủ toàn khoảng. Không có ứng viên tạo WARNING `NO_ELIGIBLE_TEACHER`; vẫn có thể giải DRAFT một phần nếu các dữ liệu khác đầy đủ.
- Kinh nghiệm lấy đúng teacher–subject–grade, hồ sơ mới nhất không sau mốc cấu hình. `NO_EXPERIENCE=0` khác `UNKNOWN`: policy BLOCK báo ERROR; policy PENALTY chỉ cho qua với cảnh báo dùng mức phạt đã cấu hình. Chưa thực hiện scoring trong readiness.
- Khóa hiện tại xung đột nhu cầu/số tiết/điều kiện nguồn báo `LOCK_CONFLICT`.

Nguồn hiện hỗ trợ một khoảng nhu cầu đồng nhất, một kỳ tính tải phủ khoảng đó và công tác/nghỉ không đổi trong khoảng. Nhiều khoảng nhu cầu, nhiều kỳ tính tải, công tác/nghỉ hoặc giảm tiết một phần được báo `UNSUPPORTED_SCOPE`, không cộng tải các giai đoạn. Hoạt động có đơn vị gốc khác `PERIOD_PER_WEEK` cần bộ chuẩn hóa có căn cứ ở SOL-04; readiness hiện báo chưa hỗ trợ.

Không tính B/F/C/R, hard checks, penalty hoặc thay dữ liệu thiếu bằng 0 ở bước này. `ANNUAL_WORKLOAD_NOT_VALIDATED` luôn nhắc rằng riêng tiền kiểm nguồn chưa kiểm chứng tải năm; không khẳng định dữ liệu năm đã đủ hay tự coi bằng 0. Bộ tính/validator và snapshot `tass-solver/2` ở SOL-04/05 còn phải kiểm tra tiếp.

## Điều kiện mở phản hồi và xuất

Thiếu giáo viên hoặc chưa gán đủ không tự chặn tiền kiểm solver; hai cờ phát hành luôn yêu cầu có current plan, snapshot còn mới, lựa chọn cấu hình khớp snapshot, đủ mọi thành phần đã gán và không còn feedback PENDING.

Chỉ validation còn mới **mới nhất** theo thời điểm/ID cho revision/snapshot/source token hiện tại được xét. Phải có kết quả kiểm tra, không có VIOLATION; INSUFFICIENT_DATA chỉ được chấp nhận ở `ACADEMIC_YEAR:*`, cùng policy của trigger DB. Thiếu validation tuần không được che bởi ngoại lệ cảnh báo năm.

`can_open_feedback` cần trạng thái DRAFT; khi thực hiện mở còn phải có deadline tương lai. `can_export` cần READY_TO_EXPORT; thao tác xuất còn phải tạo bản ghi xuất đúng guard DB. Thay trạng thái làm tăng revision có thể khiến validation trước đó hết hiệu lực, nên phải đọc/lưu validation cho revision thực.

Giới hạn nhiều giai đoạn của solver không tự cấm phát hành một phương án sửa tay đã được hậu kiểm đúng khoảng. Các kiểm tra dữ liệu, coverage và validation vẫn áp dụng. Chưa có endpoint chuyển trạng thái, validation hoặc xuất trong SOL-03.

## Kiểm thử và việc nối tiếp

`RoundReadinessPostgresTest`: 14 ca trên school/học kỳ riêng, trong DB PostgreSQL kiểm thử dùng riêng đã nạp schema/seed. Bật bằng `-Dplan.integration=true` cùng `plan.test.url/user/password`, như [PLAN_API.md](PLAN_API.md). Test commit dữ liệu vào DB kiểm thử; không dùng database thật của nhóm.

Kiểm chứng 11/11/2026: **36/36 test đạt** bằng JUnit Jupiter Engine từ cache: 14 readiness, 11 plan, 2 fixture solver, 6 HTTP/OpenAPI dữ liệu đầu vào và 3 khởi tạo Spring/JPA. Đã biên dịch toàn bộ source backend/solver với `--release 17`, kiểm tra OpenAPI 44 URL và các bean mới. Runtime kiểm thử hiện có là JDK 21, Spring Boot 3.5.14; **chưa xác nhận chạy trực tiếp trên JDK 17** hoặc toàn bộ Maven `verify` do thiếu cache plugin/mạng trước đó. Không coi kiểm chứng bytecode 17 là kiểm chứng runtime JDK 17.

Log/runner cục bộ: `D:/HCMUT/DACN/tmp/readiness-api-20261111/tests.log`, `compile.log`, `server.log`, `run-regression-tests.py`. PostgreSQL tạm đã dừng sau test. Cấu hình test PostgreSQL đặt ngoài package quét của ứng dụng, tránh làm thay đổi cấu hình JPA/H2 trong test cũ.

SOL-04/05 bổ sung tính tải/scoring/rule checks và InputValidator thật. SOL-06 phải gọi lại `RoundReadinessService.check` trong transaction chuẩn bị đã giữ khóa nguồn/current DRAFT, với đúng cấu hình POST run; chưa có POST run để nối bước gọi lại trong SOL-03.

**Cập nhật SOL-04:** 51/51 test đã đạt trực tiếp trên JDK 17, gồm toàn bộ 36 ca trên và 15 ca tải/kinh nghiệm mới. Đã kiểm chứng bổ sung migration và schema/seed mới; giới hạn runtime JDK 17 trước đây đã được giải quyết. Maven verify vẫn chưa hoàn tất vì tải POM plugin bị chặn; chi tiết ở tài liệu chuẩn bị tải.
