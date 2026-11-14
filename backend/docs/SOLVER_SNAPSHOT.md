# Snapshot tass-solver/2 và archive — SOL-05

Triển khai dùng **JDK 17 / Spring Boot 3.5.14**, trần minh họa T và bộ evaluator MVP đã chốt ở SOL-04. Bước này nối dữ liệu DB với DTO solver, kiểm tra đầu vào và lưu bản chuẩn hóa để đối soát/replay. Chưa có HTTP API chạy bất đồng bộ hoặc lưu nghiệm phân công.

## Luồng chuẩn bị phía máy chủ

`SolverInputPreparation.prepare(versionId, expectedRevision, configId, rulesId, principal)` là service nội bộ. Nó chỉ nhận ID/revision từ lớp gọi tin cậy, không nhận snapshot, precheck, assignment hoặc actor của client.

Trong một transaction:

1. Lấy actor từ principal và kiểm tra phạm vi quản lý.
2. Khóa plan → version → round, đọc lại current DRAFT/revision/token.
3. Yêu cầu snapshot còn mới và khớp config/rule đã chọn. Nếu nguồn/config đổi, trả STALE_INPUT/SNAPSHOT_REFRESH_REQUIRED; bên điều phối cần refresh DRAFT, đọc revision thực rồi gọi lại, không tự đoán revision+1.
4. Gọi lại readiness dưới khóa, không tin kết quả GET mà client đã xem.
5. Đọc snapshot DB bất biến, kiểm tra MD5 theo hợp đồng DB; dựng tải/kinh nghiệm bằng DbWorkloadPreparer.
6. Đọc previous assignments và locks hiện tại từ plan_demand đúng version đang khóa; map toàn bộ Contract.Snapshot.
7. Chạy InputValidator; chỉ khi đạt mới serialize canonical, tính SHA-256 và chèn solver_run trạng thái PREPARED.

Lỗi bước nào thì không tạo archive/lượt mới. Chuẩn bị không sửa assignments, không tự tăng revision hoặc đổi trạng thái DRAFT. Nó không gọi Main, shell hay native solve trong transaction. SolverRun PREPARED chỉ có đầu vào đã kiểm tra, không chứng minh thuật toán đã chạy/thành công; result_summary_json còn null.

## Mapping khác nhau giữa DB và solver

`SolverSnapshotMapper` map tường minh từng trường:

| DB/source | DTO solver |
| --- | --- |
| snapshot_schema_version=2 / payload snake_case | schemaVersion=`tass-solver/2`, camelCase riêng |
| teaching_demand.periods_per_week, valid_from/to | Demand.periods, startsOn/endsOn; đúng một khoảng đồng nhất |
| required_demand_component và xác nhận tập thành phần | Scope.requiredTypes; không bỏ nhu cầu ACTIVE chưa được xác nhận |
| school_class.class_code, subject.name | Scope.className, subjectName |
| grade.grade_code | Scope.gradeId để trọng số 9/12/other đúng; không dùng nhầm grade.id |
| education_level_id | Scope.levelId và Qualification.levelId dùng cùng ID |
| PERIOD_PER_WEEK | PERIODS_PER_WEEK trong normalization/HardCheck |
| TEACHING/ON_LEAVE/INACTIVE | Employment/targetApplicable theo bộ chuẩn bị tải; không tự coi nghỉ một phần là nghỉ cả kỳ |
| thời gian/actor/lý do khóa trên plan_demand | LockedAssignment đầy đủ metadata từ server |

Đối chiếu scope bao gồm mọi lớp đúng khối/năm học, trạng thái áp dụng đã xác nhận và tập thành phần bắt buộc. APPLICABLE cần đủ thành phần; UNDETERMINED hoặc thiếu xác nhận bị từ chối. Không đưa hai dòng nhu cầu của hai giai đoạn vào một tổng tải tuần.

Identity chứa school/semester/round/plan/version, **revision thực hiện tại**, DB snapshot ID và source token. Rule/config version có dạng `<DB id>:<version_no>`. Server hiện chọn workers=1, seed=42; hai giá trị này nằm trong input canonical, không phải quyết định nghiệp vụ ngầm từ browser.

Config giữ COMPONENTS, T−B, năm bước Z/L1/M/experience/change và PENALIZE_CHANGES. Ngân sách solver là `time_limit_seconds − non_solver_budget_seconds`: seed có tổng 60, dự phòng 10 thì solver nhận 50 giây với các stage budgets đã xác nhận. Đây là ngân sách cấu hình, chưa phải phép đo tổng thời gian HTTP hay chuẩn bị/solve/lưu.

Các mảng được sắp ổn định; requiredTypes theo enum, map theo key. BigDecimal được chuẩn hóa biểu diễn trước khi serialize nên `2` và `2.00` cho cùng hash khi dữ liệu/config/identity còn lại giống nhau. Bộ tính tải/qualification cũng sắp nguồn ổn định. InputValidator kiểm tra lại ràng buộc/precision/scale/coefficients và xung đột khóa trước khi archive.

## Previous assignments và khóa

Tham chiếu thay đổi mặc định là **current DRAFT tại revision được chuẩn bị**, với previousSource ghi rõ version/revision. Không lấy các mảng previous_assignments/locked_assignments cũ trong payload DB làm trạng thái hiện tại: sau một lần sửa tay/khóa, raw snapshot nguồn vẫn có thể giữ nguyên trong khi revision đã tăng.

Query server chỉ đọc plan_demand của version đang khóa, gồm cả các dòng chưa gán. Nó không sao chép phân công từ plan/round khác. Khóa vẫn nằm trong A; F không tăng theo khóa. InputValidator phát hiện khóa vượt tải, mất ứng viên hoặc sai metadata. Việc chọn một phiên bản lịch sử khác làm tham chiếu chưa có UI/API trong bước này.

## Lưu và bảo vệ artifact

Schema vẫn **48 bảng**. solver_run có thêm:

- solver_input_schema_version
- solver_input_json (JSONB để đối chiếu cấu trúc)
- solver_input_canonical (TEXT chứa đúng canonical JSON)
- solver_input_hash (SHA-256 hex)

`SolverInputArchive.create` dùng đúng `Json.MAPPER` và `Json.hash` của thư viện solver, không dùng mapper HTTP. Hash được tính từ UTF-8 của canonical text. **Không hash jsonb::text bằng SHA-256 rồi coi đó là hash của solver**: PostgreSQL có cách trình bày khoảng trắng/thứ tự/số riêng. MD5 của input_snapshot và SHA-256 của solver input là hai hợp đồng độc lập, giữ liên hệ qua snapshot ID/token.

CHECK PostgreSQL yêu cầu JSONB tương đương canonical text và kiểm tra SHA-256 độc lập bằng `sha256(convert_to(text,'UTF8'))`. Trigger INSERT kiểm tra identity school/semester/round/plan/version, revision, snapshot, rule/config version và live source token dưới khóa. Insert muộn với đầu vào cũ bị từ chối ngay cả khi bỏ qua lớp service Java.

Artifact và các khóa identity không sửa được sau INSERT; không vá archive cũ hoặc backfill vào demo run cũ. Trạng thái, thời điểm thực thi và result summary vẫn có thể cập nhật theo luồng SOL-06/07. Artifact có đầu vào không xóa được; TRUNCATE solver_run bị chặn. Lượt demo cũ giữ các cột artifact null, không bị tạo dữ liệu/proof giả.

## Replay và freshness

`replay(runId, principal)` kiểm tra quyền, đọc canonical text từ DB, deserialize bằng contract solver, chạy lại InputValidator và kiểm tra canonical/hash/identity. Có thể replay lịch sử khi nguồn đã đổi; replay không cho phép ghi kết quả vào DRAFT hiện tại.

`requireFresh(runId, principal)` khóa plan/version/round rồi đối chiếu current DRAFT, revision, snapshot ID và source token. Nó từ chối lượt cũ sau sửa tay/khóa, đổi snapshot/nguồn hoặc đổi current version. **SOL-07 phải gọi trong outer transaction apply** để khóa giữ đến commit; gọi guard độc lập rồi ghi sau ở transaction khác chưa đủ chống race. Guard này kiểm tra freshness; cancellation và trạng thái lượt vẫn phải được kiểm tra trong điều phối/apply SOL-06/07.

Các phương thức/record archive là nội bộ; không trả toàn bộ canonical input chứa hồ sơ giáo viên qua API poll hoặc cổng Teacher. HTTP response mapper ở SOL-06/08 sẽ trả metadata phù hợp quyền/phạm vi.

## Migration và giới hạn hiện tại

DB cũ chạy [05_solver_input_archive.sql](../sql/05_solver_input_archive.sql) sau migration 04. Script thêm cột, CHECK và trigger, không đổi số bảng hoặc backfill artifact. Schema mới đã chứa cùng guard. Đã kiểm tra migration trên PostgreSQL tạm cũ và chạy lại trên schema/seed mới; chưa áp lên DB hiện có của người dùng.

Bộ evaluator vẫn là minh họa MVP; rule handler sản xuất hoặc precheck chưa đủ dữ liệu vẫn bị chặn. Annual INSUFFICIENT_DATA được giữ là cảnh báo của bộ kiểm tra năm, không được sửa thành PASS/0 chỉ để dựng model.

PREPARED là điểm nối lưu trữ cho SOL-06. Chưa có hàng chờ, POST run/poll/cancel, recovery sau restart hay ghi nghiệm trong SOL-05. Hai lần chuẩn bị cùng identity có thể lưu hai archive giống hash; hạn chế lượt đang hoạt động/idempotency sẽ được điều phối ở SOL-06.

## Kiểm chứng 12/11/2026

**65/65 test đạt trên Temurin 17.0.21**, qua JUnit Jupiter Engine với dependency cache: 14 test snapshot mới và 51 test hồi quy trước đó. Các test mới bao phủ DB → DTO → OR-Tools native → SolutionValidator; hash/canonical/replay; decimal/order ổn định; grade_code 9/12; khóa hiện tại; stale source/revision/current version; readiness và InputValidator trước archive; dữ liệu thiếu ứng viên; checksum/immutability/insert muộn tại PostgreSQL.

Kiểm tra schema/seed mới vẫn đủ 48 bảng, migration 04/05 chạy lại được, legacy run không bị backfill. Cluster PostgreSQL 18 tạm đã dừng sau kiểm thử; không dùng DB hiện có của người dùng.

Log/runner: `D:/HCMUT/DACN/tmp/solver-snapshot-20261112/compile.log`, `tests.log`, `migration05.log`, `fresh-schema-check.log`, `run-snapshot-tests.py`. Maven offline verify được thử lại nhưng cache plugin Surefire 3.5.2 thiếu dependency `SurefireReportParameters`; Maven verify toàn bộ chưa đạt. Không thay phiên bản plugin để né lỗi môi trường.
