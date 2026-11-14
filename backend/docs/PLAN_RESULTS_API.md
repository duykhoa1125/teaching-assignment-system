# Phân công, tải, tối ưu và validation — SOL-08

Các endpoint dùng Principal tin cậy, tài khoản ACTIVE và ACADEMIC_MANAGER có phạm vi phủ toàn round, giống plan/solver API. Đây là API cho người quản lý; chưa có endpoint cổng Teacher hoặc đăng nhập. JSON dùng snake_case; không nhận actor, snapshot, loads hay kết quả validation từ browser.

## Endpoint

| Method | URL | Kết quả |
| --- | --- | --- |
| GET | `/api/plan-versions/{id}/assignments` | Trang phân công đã lưu, có total |
| GET | `/api/plan-versions/{id}/workloads` | Tải tính từ phân công đã lưu và snapshot của version |
| GET | `/api/plan-versions/{id}/optimization` | Metadata lượt tối ưu, vector mục tiêu, proof và cấu hình |
| POST | `/api/plan-versions/{id}/validation` | 201 + Location của báo cáo validation bất biến |
| GET | `/api/plan-versions/{id}/validation` | Báo cáo mới nhất, kể cả khi đã cũ |

GET validation nhận `validation_run_id` tùy chọn để đọc đúng báo cáo thuộc version đó. Chưa có báo cáo hoặc ID thuộc version khác trả 404. Có thể đọc version/báo cáo lịch sử; POST validation chỉ cho current version, kể cả các trạng thái sau DRAFT để kiểm tra lại trước các bước phát hành. Không đổi trạng thái version.

## Phân công và tải

Assignments nhận `teacher_id`, `class_id`, `demand_type` (STANDARD/SPECIALIZED_TOPIC/ENRICHMENT), `is_locked`, `unassigned`, `valid_on` (YYYY-MM-DD), `limit` (mặc định 50, 1..200), `offset` (mặc định 0, không âm). Thứ tự cố định theo demand_id/id; total là số dòng sau lọc. Workloads nhận teacher_id, limit, offset với cùng giới hạn.

```text
GET /api/plan-versions/123/assignments?teacher_id=7&is_locked=true&limit=20
GET /api/plan-versions/123/workloads?teacher_id=7
```

Trang trả version (version_id, revision_no, input_snapshot_id, source_revision_token, snapshot_fresh, current_version), total/limit/offset/items. Assignment gồm demand/class/subject/type, số tiết, valid_from/to, teacher, khóa và lý do chưa gán. Tên lớp/môn/giáo viên lấy từ snapshot của version. Không lấy candidate chưa apply từ solver_run, không trộn tên hoặc tải từ nguồn sống sau khi snapshot cũ.

Workload có b/f/a/c/r/q/w/t/delta_t/under/over, target_applicable và checks. Tính BigDecimal bằng WorkloadMath, từ DbWorkloadPreparer và tổng phân công đã lưu. Trần tuần theo T=A+F+C+R đã chốt. Mục tiêu không áp dụng thì delta_t/under/over/q là null. Vi phạm trần của phân công được trả trong checks; dữ liệu năm chưa có giữ INSUFFICIENT_DATA, actual/limit chưa biết là null, không thay bằng 0. Các cảnh báo chung và coverage/overall_status áp dụng cho toàn version, kể cả khi lọc trang giáo viên.

GET nguồn cũ vẫn trả giá trị theo snapshot và gắn snapshot_fresh=false/cảnh báo. Thiếu nguồn tuần/inventory hoặc scope không được hỗ trợ trả 422 có mã nguồn, không tạo số tải giả. Nhiều giai đoạn vẫn bị từ chối ở phần tính tải/validation; assignments còn đọc được các dòng và khoảng hiệu lực. Không triển khai SOL-10.

## Metadata tối ưu

Optimization trả latest_run_id và run là lượt APPLIED gần nhất; nếu chưa có APPLIED thì trả lượt thử gần nhất. Vì vậy một lượt bị hủy/lỗi sau đó không thay proof của lượt đã lưu. Khi chưa chạy, run=null và cảnh báo NO_SOLVER_RUN.

`matches_version=true` chỉ khi applied_revision_no, snapshot/token và current version còn khớp. False nghĩa vector/proof mô tả lượt lịch sử, không chứng minh trạng thái phân công hiện tại. Configuration lấy từ input đã lưu của đúng run, gồm seed/workers/ngân sách/chính sách và trọng số, không có toàn hồ sơ giáo viên. Các khóa giai đoạn Z/L1/M/experience/change giữ nguyên. Summary của run giữ hợp đồng metadata đã mô tả trong SOLVER_RUN_API.md; objective_vector và warnings được đưa ra riêng để UI đọc thuận tiện.

## Validation

```http
POST /api/plan-versions/123/validation
Content-Type: application/json

{"expected_revision":4}
```

Service giữ khóa plan → version → round, kiểm tra lại quyền/current/revision/snapshot/token và chạy bộ chuẩn bị/kiểm tra dùng chung. Validation kiểm tra scope, precision, đơn vị, eligibility toàn khoảng, khóa, coverage, prechecks và các hard check với số tải tính lại. Vi phạm nghiệp vụ là kết quả 201/overall_status=VIOLATION, không phải lỗi tạo báo cáo. Thiếu riêng năm có thể trả INSUFFICIENT_DATA và vẫn cho phép bước mở phản hồi theo policy hiện có khi các kiểm tra tuần/coverage đều đạt.

Header validation_run cùng mọi validation_result và workload/summary được commit nguyên tử. Lỗi ở một dòng rollback cả báo cáo. Báo cáo gắn revision/snapshot/token, checked_by từ Principal, validator_version=tass-validation/1. Không đổi assignments/revision để tạo validation. GET kiểm tra freshness bằng tass_validation_is_fresh; không tự chọn một báo cáo cũ hơn để che báo cáo mới nhất đã lỗi/cũ.

Result gồm br_code, subject_type/ref, calculation_period, result_status, severity, missing_data, message và details (value/limit/unit/source/original_status). Schema cũ chỉ có PASS/VIOLATION/INSUFFICIENT_DATA; trường hợp NOT_APPLICABLE được lưu PASS không chặn, kèm details.original_status=NOT_APPLICABLE và giải thích rõ. Không diễn giải thành PASS pháp lý cho rule chưa hỗ trợ; evaluator vẫn là ILLUSTRATIVE_MVP_V1. Unsupported production rules hoặc nguồn thiếu không được phát hành báo cáo PASS.

GET report lưu cả workloads của lúc kiểm tra, nên sau sửa tay/đổi nguồn/restart vẫn đọc được giá trị cũ chính xác với fresh=false. API workloads tính lại trạng thái phân công hiện tại của version, hai dữ liệu có thể khác nhau khi validation đã cũ.

Mã lỗi: 400 ID/filter/body sai; 401 thiếu Principal; 403 sai vai trò/phạm vi; 404 version/report không tồn tại; POST 409 CURRENT_VERSION_REQUIRED/REVISION_CONFLICT/STALE_INPUT; 422 thiếu dữ liệu hoặc scope/rule không hỗ trợ. Không có API sửa/xóa báo cáo.

## Migration và phối hợp

DB cũ chạy [08_plan_validation_reports.sql](../sql/08_plan_validation_reports.sql) sau 04–07. Thêm validator_version/workloads_json/summary_json cho validation_run, details_json cho validation_result và guard báo cáo; vẫn 48 bảng. Báo cáo mới phải khớp current revision/snapshot/token, đủ finding_count và overall_status tương ứng lúc commit. Trigger append-only cũ giữ báo cáo bất biến; chèn thêm kết quả vào báo cáo đã đủ cũng bị từ chối. Legacy report không backfill, có thể thiếu validator_version/workloads/details.

Cập nhật 14/11/2026: API sửa/khóa/mở khóa đã có tại [ASSIGNMENT_MUTATION_API.md](ASSIGNMENT_MUTATION_API.md), dùng chung validator, CAS, khóa plan/version/round và trigger revision/audit. Thay đổi làm báo cáo cũ mất freshness; client yêu cầu validation mới khi cần. Auth thật vẫn chờ tích hợp của nhóm, các test dùng Principal giả có kiểm soát.

Kiểm chứng xuyên suốt và lệnh chạy: [SOLVER_API_VERIFICATION.md](SOLVER_API_VERIFICATION.md).

Ngày 13/11/2026: tổng **156/156 test đạt**, gồm 111 ca tích hợp/hồi quy, một ca JVM mới đọc dữ liệu đã lưu, 23 ca backend cũ và 21 ca PostgreSQL CRUD/status. Migration 08 mới chạy trên DB tạm; Maven reactor verify và script initdb còn giới hạn môi trường đã ghi rõ trong tài liệu kiểm chứng.
