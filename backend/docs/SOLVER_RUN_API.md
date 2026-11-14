# Async solver run — SOL-06/07

Backend Java 17 / Spring Boot 3.5 chạy CP-SAT trong executor có giới hạn. SOL-06 lưu đầu vào/kết quả/metadata; SOL-07 đã nối [hậu kiểm và apply bằng transaction](SOLVER_APPLY.md) vào worker. Chỉ apply_outcome=APPLIED mới xác nhận đã lưu phân công. Quy tắc tải vẫn là MVP minh họa, trần T=A+F+C+R; annual thiếu dữ liệu vẫn được giữ nguyên.

## API

Các endpoint cần Principal đáng tin cậy và quyền ACADEMIC_MANAGER phủ toàn bộ round, giống [plan API](PLAN_API.md). Chưa có đăng nhập trong backend; không gửi actor qua body/header tự tạo.

| Method | URL | Thành công |
| --- | --- | --- |
| POST | `/api/plan-versions/{id}/solver-runs` | 202, body lượt chạy và Location `/api/solver-runs/{id}` |
| GET | `/api/solver-runs/{id}` | 200, trạng thái và summary |
| POST | `/api/solver-runs/{id}/cancel` | 200, trạng thái sau yêu cầu hủy |

Body POST run:

```json
{"expected_revision":12,"optimization_config_id":1,"rule_set_version_id":1}
```

Revision là giá trị thực đọc từ current DRAFT; trigger có thể tăng nhiều lần khi thay đổi nhiều dòng. Backend giữ khóa plan/version/round trong transaction chuẩn bị, kiểm tra lại quyền, revision, snapshot/config và readiness, chuẩn hóa và chạy InputValidator trước khi lưu archive/QUEUED cùng transaction. Không tự refresh snapshot cũ. Solver chạy sau commit, ngoài transaction chuẩn bị.

Một DRAFT chỉ có một lượt QUEUED/RUNNING/CANCEL_REQUESTED, được bảo vệ bằng cả điều phối và unique index PostgreSQL. Gửi trùng trả **409 SOLVER_RUN_ACTIVE**, kèm Location để poll lượt hiện tại; không có idempotency key hoặc replay ngầm. Sau terminal, một POST hợp lệ tạo lượt mới. UI nên giữ run ID nhận được; có thể theo Location nếu gửi lại trong lúc lượt trước còn hoạt động. Khi hàng chờ đầy, trả **503 SOLVER_QUEUE_FULL** và không tạo archive. Các lỗi khác: 401/403 auth/phạm vi, 404 không tồn tại, 409 REVISION_CONFLICT/STALE_INPUT/SNAPSHOT_REFRESH_REQUIRED/CURRENT_DRAFT_REQUIRED/LOCK_CONFLICT, 422 SOLVER_NOT_READY hoặc mã lỗi chuẩn hóa nguồn.

## Trạng thái, hủy và metadata

Luồng thường: QUEUED → RUNNING → SUCCEEDED/COMPLETED/FAILED. SUCCEEDED nghĩa solver trả candidate FEASIBLE/OPTIMAL và luồng kết thúc; cần xem apply_outcome để phân biệt APPLIED với STALE/NOT_DRAFT. COMPLETED dùng cho UNKNOWN/INFEASIBLE không có candidate. FAILED có failure_code, ví dụ EXECUTION_FAILED, SOLVER_ERROR, POST_VALIDATION_FAILED, AUTHORIZATION_CHANGED, APPLY_FAILED hoặc SERVICE_RESTARTED. Lượt nội bộ PREPARED và lượt legacy vẫn đọc được, không tự đưa vào hàng chờ.

Hủy QUEUED chuyển ngay CANCELLED, gỡ khỏi hàng chờ và trả lại chỗ. Hủy RUNNING chuyển CANCEL_REQUESTED, gọi Cancellation riêng của đúng lượt để stopSearch; poll chuyển CANCELLED khi worker kết thúc. Yêu cầu hủy lặp lại không đổi timestamp đầu tiên. Hủy terminal trả nguyên trạng, không báo hoàn tác. Transaction apply kiểm tra cancellation dưới row lock: nếu cancel thắng trước khi apply lấy lock thì candidate bị loại; nếu apply giữ lock và commit trước thì cancel trả terminal/APPLIED. Chi tiết thứ tự khóa và token monitor ở SOLVER_APPLY.md.

GET trả id, version_id, base_revision, requested_by, input_hash, input_fresh, applied_revision_no, apply_ms, các thời điểm queued_at/execution_started_at/finished_at/cancellation_requested_at, failure_code và summary. Không trả hồ sơ giáo viên, canonical input hoặc danh sách phân công candidate qua poll.

`summary.cp_sat_status` giữ trạng thái solver; `termination_reason` ghi lý do dừng; `apply_outcome` và post_validation_status tách khỏi solver status (xem bảng kết quả trong SOLVER_APPLY.md). Summary lưu đủ năm bước Z/L1/M/experience/change, objective, best_bound, elapsed_ms, stop_reason, exactOptimalityProven và gap_tolerance. Bước chưa chạy được ghi NOT_RUN, không tạo proof giả. `demo_only=false` phân biệt lượt thuộc luồng thực thi với bản ghi seed minh họa; riêng cờ này không chứng minh solver đã chạy, cần xem cp_sat_status/stages. `illustrative_workload_rules=true` nói về quy tắc tải minh họa của input. Với lỗi trước solve, cp_sat_status=NOT_RUN và cả năm bước NOT_RUN; lượt bị gián đoạn khi restart có thể chưa có summary, failure_code ghi SERVICE_RESTARTED.

Các số đo riêng:

- preparation_ms: từ lúc được cấp chỗ đến khi chuẩn bị archive/enqueue trong transaction, không gồm toàn bộ HTTP hay commit cuối.
- solve_ms: thời gian gọi engine, gồm dựng model/kiểm tra/native trong thư viện.
- apply_ms: hậu kiểm, chờ khóa và cập nhật phân công/audit; không gồm encode/lưu terminal và commit cuối.
- archive_write_ms: encode summary/result và câu SQL ghi terminal trong transaction lưu; không gồm câu SQL cập nhật chính số đo này và commit cuối. Trạng thái terminal và số đo được công bố cùng transaction.
- queued_at → execution_started_at: thời gian chờ executor. started_at cũ của bảng được giữ tương thích; API dùng execution_started_at để tránh coi thời điểm tạo archive là thời điểm bắt đầu giải.

Đầu vào config vẫn dành riêng ngân sách non_solver_budget_seconds như SOL-05. Các số đo không bảo đảm toàn HTTP nằm trong ngân sách này; không đổi thời gian solve thành tổng thời gian request. Result JSON nội bộ lưu riêng solver_result_json. Apply khóa và kiểm tra lại identity/hash/revision/token trong cùng transaction ghi. input_fresh=false có thể do chính apply làm tăng revision; không tự coi đó là apply=STALE. applied_revision_no ghi revision thực sau lưu và có thể bằng base_revision khi không có dòng thay đổi.

## Vận hành và migration

DB cũ chạy [06_solver_run_execution.sql](../sql/06_solver_run_execution.sql) sau migration 04/05 và [07_solver_result_apply.sql](../sql/07_solver_result_apply.sql), trước khi chạy backend mới. Script thêm cột/index/CHECK, chạy lặp được, không backfill artifact hoặc chạy tự động trên DB của người dùng. Schema mới đã chứa các thay đổi, vẫn 48 bảng.

Mặc định SOLVER_CONCURRENT_RUNS=1 và SOLVER_QUEUE_CAPACITY=8; mỗi solve dùng workers=1 đã lưu trong input. Giới hạn cấu hình lần lượt 1..8 và 1..1000; điều chỉnh cùng tài nguyên CPU/RAM/pool kết nối. Có một connection PostgreSQL dành riêng để giữ session advisory lock cho bộ điều phối; đây là mô hình **một backend cho một DB**, chưa hỗ trợ nhiều replica. Backend thứ hai không lấy được lock sẽ dừng khởi tạo. Cần PostgreSQL trực tiếp hoặc pool giữ session, không dùng transaction pooling cho connection này.

Khi khởi động và đã giữ ownership, các lượt có queued_at còn QUEUED/RUNNING/CANCEL_REQUESTED chuyển FAILED/SERVICE_RESTARTED. Không tự replay, áp nghiệm hoặc sửa các lượt PREPARED/legacy/terminal. Khi shutdown, backend yêu cầu dừng native, đợi transaction đang giữ token kết thúc rồi awaitTermination tối đa 5 giây; lần khởi động sau xử lý phần còn dở. Khi mất DB không thể bảo đảm ghi trạng thái ngay; lỗi được log, dữ liệu còn dở được xử lý khi khởi động lại. API submit từ chối khi connection ownership không còn sống. H2 chỉ phục vụ test CRUD, không kích hoạt executor nghiệp vụ.

## Kiểm chứng

Kiểm thử dùng PostgreSQL 18 tạm, JDK 17.0.21 và OR-Tools native từ cache, không sửa DB hiện có của người dùng. Bao phủ HTTP 202/poll/Location, giải thật và proof, quyền, không apply phân công, gửi trùng đồng thời, hàng chờ đầy, hủy queued/running/terminal, hủy khi candidate đã trả về, lỗi native, nguồn đổi khi giải và restart/ownership.

**Mốc SOL-06: 79/79 test đạt ngày 12/11/2026** qua JUnit Jupiter Engine: 14 test điều phối và 65 test hồi quy. Migration 06 đã chạy trên cluster tạm, chạy lặp và kiểm tra cùng schema/seed mới vẫn 48 bảng. Kết quả cập nhật cho luồng apply ở SOLVER_APPLY.md.

Runner và log tại `D:/HCMUT/DACN/tmp/solver-runs-20261112/`. Maven verify toàn bộ vẫn chưa được xác nhận vì cache Surefire thiếu dependency; kết quả JUnit trực tiếp được ghi riêng.
