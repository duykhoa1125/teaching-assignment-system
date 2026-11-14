# Hậu kiểm và áp dụng nghiệm — SOL-07

Worker của POST solver-runs tự hậu kiểm và áp nghiệm sau khi CP-SAT kết thúc. Không có endpoint nhận candidate từ browser hoặc apply tùy ý một lượt lịch sử. Luồng vẫn yêu cầu Principal tin cậy ở thời điểm tạo run; trước khi ghi, backend kiểm tra lại tài khoản/quyền quản lý của requested_by đã lưu phía máy chủ.

## Hậu kiểm độc lập

SolverResultApplier tái sử dụng AssignmentService với PlanStore callback để kiểm tra candidate FEASIBLE/OPTIMAL, toàn bộ identity/hash, mỗi demand xuất hiện đúng một lần, khóa, điều kiện ứng viên, số tiết và thông tin hiển thị. SolutionValidator tính lại loads, checks và vector mục tiêu từ snapshot bất biến, đối chiếu kết quả solver; không tin các giá trị tải solver trả về. Đồng thời kiểm tra thứ tự năm bước, objective/best bound của proof và các cờ coverage/soft optimality.

Hậu kiểm diễn ra trước transaction ghi. Sai hash/identity, thiếu/trùng demand, ứng viên không hợp lệ, tải/mục tiêu hoặc proof sai đều trả apply_outcome=REJECTED, task FAILED/POST_VALIDATION_FAILED; không đổi phân công. Summary của kết quả bị từ chối không công nhận proof. UNKNOWN/INFEASIBLE hoặc lỗi không có candidate không được ghi phân công, kể cả khi result còn mang danh sách assignments.

## Giao dịch ghi

Trong cùng một transaction, thứ tự khóa là assignment_plan → plan_version → assignment_round → solver_run → các plan_demand theo id. Transaction giữ khóa đến commit, đọc lại immutable archive và kiểm tra:

1. Run còn RUNNING/CANCEL_REQUESTED; terminal không được apply lần hai.
2. Canonical input/hash khớp archive, identity của version/snapshot/revision/token không đổi.
3. Version vẫn current DRAFT; revision và snapshot ID khớp lượt chạy; source token còn sống.
4. Run chưa bị hủy và actor còn ACTIVE, có vai trò/phạm vi quản lý toàn round.

Token nguồn được bảo vệ bằng khóa round, cùng cơ chế trigger nguồn hiện có. Tất cả writer sửa phương án phải dùng thứ tự khóa này, expected revision và trigger/CAS chung; không cập nhật bằng một đường ghi bỏ qua guard. Sửa tay/lock API đầy đủ vẫn là phần phối hợp riêng.

Backend cập nhật tại chỗ teacher/reason của dòng chưa khóa. Không xóa/chèn lại, không đổi id hoặc metadata khóa. Các dòng không đổi không được UPDATE. tass.actor_id được đặt transaction-local từ requested_by đã xác thực, để audit trigger ghi đúng actor. Có thêm audit SOLVER_APPLY, kể cả khi nghiệm không làm đổi dòng nào.

Phân công, revision do trigger tăng, audit, applied_revision_no, result archive và summary terminal cùng commit. Lỗi giữa batch hoặc khi lưu metadata làm rollback toàn bộ. Worker lưu task FAILED/APPLY_FAILED trong transaction riêng sau rollback; không báo APPLIED. Nếu DB đang mất kết nối thì không thể đảm bảo lưu lỗi ngay, recovery sau restart xử lý lượt còn dở.

Không cộng revision trong Java. Đổi hai dòng có thể tăng revision hai lần; không đổi dòng nào thì applied_revision_no bằng base_revision. Migration 07 đổi CHECK từ `>` thành `>=` để lưu đúng trường hợp này; không tăng revision giả để vượt CHECK.

## Hủy và cạnh tranh

Hủy và commit được phân xử bằng row lock của solver_run. Nếu CANCEL_REQUESTED được ghi trước khi apply lấy lock, apply bỏ candidate và kết thúc CANCELLED. Nếu apply đã giữ lock và commit thành công, yêu cầu cancel chờ rồi trả nguyên trạng terminal/APPLIED, không báo hoàn tác. Token Cancellation cũng được giữ monitor xuyên qua transaction commit để shutdown không chen vào giữa bước kiểm tra cuối và commit.

Người dùng sửa phân công/khóa hoặc refresh snapshot trong lúc solver chạy làm apply=STALE; đổi current version/trạng thái làm apply=NOT_DRAFT. Worker vẫn lưu kết quả solver để theo dõi, nhưng không ghi đè phương án. Hai lời gọi completion đồng thời của cùng run chỉ được áp một lần.

## Kết quả poll

| summary.apply_outcome | Ý nghĩa |
| --- | --- |
| APPLIED | Candidate hợp lệ đã commit; xem applied_revision_no |
| STALE | Revision/snapshot/token đã đổi; phân công được giữ nguyên |
| NOT_DRAFT | Version không còn current DRAFT |
| CANCELLED | Hủy thắng trước commit |
| NO_CANDIDATE | Không có FEASIBLE/OPTIMAL để áp |
| REJECTED | Hậu kiểm sai hoặc actor mất quyền; xem failure_code |
| FAILED | Lỗi ghi; phân công/revision/audit đã rollback |
| NOT_APPLIED | Lỗi trước apply hoặc lượt cũ chưa đi qua luồng này |

SUCCEEDED chỉ cho biết solver có candidate và lượt kết thúc; cần xem apply_outcome để biết đã lưu hay bị STALE/NOT_DRAFT. Không tự chuyển DRAFT thành trạng thái mở phản hồi/xuất. Quy tắc tải vẫn là MVP minh họa và annual thiếu dữ liệu vẫn giữ cảnh báo. Lưu ValidationRun/Result và API đọc phân công/tải thuộc SOL-08.

Poll bổ sung applied_revision_no và apply_ms. apply_ms gồm hậu kiểm, chờ khóa và cập nhật phân công/audit trước khi encode/lưu terminal; không gồm commit cuối. solve_ms chỉ đo engine, archive_write_ms đo encode/ghi metadata trước commit. input_fresh=false có thể do chính lượt này làm tăng revision; không tự diễn giải cờ đó thành apply=STALE. Sau sửa tiếp, dùng current revision và validation mới để đánh giá trạng thái hiện tại.

## Migration và kiểm chứng

DB cũ chạy [07_solver_result_apply.sql](../sql/07_solver_result_apply.sql) sau 04/05/06 trước khi chạy backend mới. Script thêm apply_ms, cho phép applied_revision_no bằng base_revision, chạy lặp được; không backfill hoặc tự áp các lượt cũ. Schema mới giữ 48 bảng.

Kiểm thử dùng JDK 17.0.21, PostgreSQL 18 tạm và OR-Tools native. Bao phủ apply thật qua HTTP, partial candidate, locked/no-op/multiple rows, actor audit, stale revision/snapshot/source/current, thu hồi quyền, hậu kiểm hash/demand/objective/proof, cancel khi transaction chờ khóa, hai completion đồng thời và lỗi ở dòng thứ hai làm rollback toàn bộ. Runner/log ở `D:/HCMUT/DACN/tmp/solver-apply-20261112/`; không áp migration lên DB hiện có của người dùng. Maven verify toàn bộ còn thiếu dependency Surefire trong cache.

**95/95 test đạt ngày 12/11/2026** qua JUnit Jupiter Engine từ cache: 16 ca apply mới cùng 79 ca tích hợp/hồi quy đã cập nhật theo hành vi tự apply. Migration 07 đã kiểm tra trên cluster tạm cũ, chạy lặp và cùng schema/seed mới (48 bảng). Cluster tạm đã dừng sau kiểm thử; git diff --check không báo lỗi whitespace.
