# Sửa, khóa và mở khóa phân công — 14/11/2026

## Phạm vi

Chỉ backend và hợp đồng API, không sửa UI demo. Mỗi dòng là một thành phần của học kỳ/lớp/môn: STANDARD, SPECIALIZED_TOPIC hoặc ENRICHMENT. Các thành phần có thể cùng hoặc khác giáo viên. Không chia một dòng cho nhiều người, không đổi số tiết nguồn qua API phân công.

## Endpoint

Base: `/api/plan-versions/{id}/assignments`. Tất cả trả **200** và `AssignmentMutationDto` khi thành công, gồm no-op.

| Method | URL nối sau base | Ý nghĩa |
| --- | --- | --- |
| PATCH | `/{assignmentId}` | Gán/đổi giáo viên hoặc bỏ gán một thành phần |
| POST | `/{assignmentId}/lock` | Khóa một dòng đã gán |
| POST | `/{assignmentId}/unlock` | Mở khóa một dòng |
| POST | `/locks` | Khóa atomic các dòng được chọn hoặc toàn nhóm lớp–môn |
| POST | `/unlocks` | Mở khóa atomic các dòng được chọn hoặc toàn nhóm |

`id` là version ID; `assignmentId` và `assignment_ids` là **id của dòng plan_demand** từ GET assignments, không phải demand_id. Không có endpoint PATCH số tiết, snapshot hoặc metadata khóa tùy ý. Actor lấy từ Principal phía server và kiểm tra tài khoản ACTIVE, vai trò/phạm vi academic manager; không nhận actor trong body/header tự đặt. HTTP chưa có auth hợp lệ trả 401.

## Sửa phân công

```http
PATCH /api/plan-versions/20/assignments/101
Content-Type: application/json
```

```json
{
  "expected_revision": 7,
  "teacher_id": 12,
  "change_reason": "Phân công chính khóa theo quyết định của tổ chuyên môn"
}
```

`teacher_id` là property bắt buộc. Để bỏ gán phải gửi explicit null và cả hai lý do:

```json
{
  "expected_revision": 8,
  "teacher_id": null,
  "unassigned_reason_code": "MANUAL_UNASSIGNED",
  "unassigned_reason_text": "Chờ bổ sung giáo viên đúng chuyên môn",
  "change_reason": "Thu hồi phân công chưa phù hợp"
}
```

Khi teacher_id khác null, không gửi lý do chưa phân công. Không gửi periods_per_week, actor_id hoặc trường lạ. change_reason bắt buộc, tối đa 2000 ký tự; mã lý do chưa gán tối đa 80, nội dung tối đa 2000.

Chỉ sửa current DRAFT có snapshot còn mới, đúng expected_revision và dòng chưa khóa. Backend dựng phương án dự kiến và dùng PlanValidationEvaluator/DbWorkloadPreparer/SolverSnapshotMapper chung với luồng solver để kiểm tra chuyên môn/công tác, phạm vi, tải và hard checks trước khi ghi. Không cho vượt trần đã xác nhận. Cho phép DRAFT một phần; riêng REQUIRED_COVERAGE chưa đủ và thiếu dữ liệu annual không chặn một sửa đổi hợp lệ. Không tự ghi validation report mới hoặc gắn nhãn toàn phương án PASS.

Nếu phương án hiện có các vi phạm cứng khác ngoài coverage, sửa đổi cũng phải qua hậu kiểm toàn bộ phương án dự kiến; không dùng API này để lưu một phương án còn vi phạm cứng. Nguồn thiếu/chưa hỗ trợ có thể trả 422. Mở khóa không phụ thuộc bước chuẩn hóa này.

## Khóa/mở khóa một dòng

```json
{
  "expected_revision": 9,
  "reason": "Giữ phân công chính khóa đã xác nhận"
}
```

Gửi body trên tới `.../101/lock` hoặc `.../101/unlock`. reason bắt buộc, tối đa 2000 ký tự. Khóa lấy actor/thời điểm từ server và giữ teacher cùng số tiết snapshot. Không khóa dòng chưa gán. Dòng đã khóa trả no-op và giữ nguyên người/thời điểm/lý do khóa cũ; dòng đã mở cũng trả no-op. PATCH dòng khóa trả 409, kể cả body giữ nguyên giáo viên; phải mở khóa bằng thao tác riêng trước khi sửa.

**Ngoại lệ có chủ đích cho unlock:** khi source token đã đổi, vẫn được mở khóa thuần metadata trong current DRAFT với expected_revision đúng và quyền hợp lệ. Không đổi teacher/số tiết/nhu cầu/snapshot; response vẫn `snapshot_fresh=false`. Sau đó refresh snapshot, đọc revision mới rồi sửa/khóa/chạy solver. Điều này tránh kẹt refresh báo LOCK_CONFLICT nhưng không mở khóa được do STALE_INPUT. Quyết định chưa được xem là hợp lệ với nguồn mới chỉ vì đã mở khóa.

## Atomic batch và toàn nhóm

Chọn các dòng cụ thể:

```json
{
  "expected_revision": 10,
  "assignment_ids": [101, 102],
  "reason": "Giữ các phân công đã thống nhất"
}
```

Hoặc chọn **toàn bộ nhóm từ snapshot version**:

```json
{
  "expected_revision": 10,
  "class_id": 30,
  "subject_id": 2,
  "reason": "Giữ toàn bộ phân công Toán lớp 10A1"
}
```

Chỉ được dùng một selector: assignment_ids (1..2000 ID dương, không trùng), hoặc đủ class_id+subject_id. Group không nhận danh sách teacher để tránh vô tình ép chung người. Không có selector theo filter phân trang hoặc "tất cả đang hiển thị".

Ví dụ group gồm STANDARD 3 tiết/cô Phương và ENRICHMENT 2 tiết/thầy Minh: POST locks khóa cả hai với đúng giáo viên riêng. Nếu có một dòng chưa gán, cả thao tác bị từ chối, không âm thầm bỏ qua hoặc khóa một phần. Muốn khóa riêng phần đã gán dùng assignment_ids hoặc endpoint theo dòng. Dòng đã khóa/mở đúng trạng thái là no-op; các dòng thực sự đổi được commit cùng transaction. Bất kỳ lỗi DB/audit nào rollback toàn bộ.

## Response, revision và tác động khi chạy solver

```json
{
  "version": {
    "version_id": 20,
    "revision_no": 12,
    "input_snapshot_id": 40,
    "source_revision_token": "token-from-server",
    "snapshot_fresh": true,
    "current_version": true
  },
  "matched_count": 2,
  "changed_count": 2,
  "items": []
}
```

Ví dụ rút gọn: items thực tế chứa các AssignmentRow đã chọn sau thao tác, cùng cấu trúc GET assignments và thứ tự ổn định. Không trả toàn snapshot hoặc thay dữ liệu của dòng ngoài selector.

Revision tăng **theo từng dòng thực sự thay đổi**, đọc lại từ trigger DB: khóa hai dòng có thể tăng 2; không mặc định +1/request. No-op không tăng revision hoặc thêm audit mutation. reason được ghi audit cấp thao tác; trigger giữ before/after của mỗi dòng và actor transaction-local. Mở khóa xóa metadata lock trên dòng, nhưng lịch sử/lý do mở vẫn có trong audit.

Thứ tự khóa: plan → version → round → assignment rows theo id. CAS revision được kiểm tra lại dưới khóa. Cho phép thao tác khi solver đang giải; revision mới khiến nghiệm về muộn STALE, không ghi đè quyết định thủ công. Nếu apply đã commit trước thì request cũ nhận REVISION_CONFLICT. Report validation cũ sẽ fresh=false; metadata tối ưu cũ matches_version=false. Client đọc lại version rồi tự quyết định validate hoặc chạy lại, không tự tăng revision trong browser.

## Mã lỗi

| HTTP | code | Trường hợp |
| --- | --- | --- |
| 400 | INVALID_REQUEST | Body/ID/selector sai, teacher_id bị bỏ qua, thiếu lý do, trùng ID hoặc trường lạ |
| 401 | AUTHENTICATION_REQUIRED | Thiếu Principal tin cậy |
| 403 | PLAN_ACCESS_DENIED | Không đủ tài khoản/vai trò/phạm vi |
| 404 | RESOURCE_NOT_FOUND | Version/dòng/nhóm không tồn tại trong phạm vi version |
| 409 | CURRENT_DRAFT_REQUIRED | Version lịch sử hoặc không còn DRAFT |
| 409 | REVISION_CONFLICT | expected_revision cũ |
| 409 | STALE_INPUT | Nguồn đổi khi sửa/khóa; unlock thuần metadata được phép |
| 409 | ASSIGNMENT_LOCKED | Sửa dòng đang khóa |
| 409 | ASSIGNMENT_NOT_ASSIGNED | Khóa có dòng chưa gán |
| 409 | LOCK_CONFLICT | Khóa không hợp lệ hoặc vượt trần |
| 409 | CONCURRENT_MODIFICATION | Xung đột giao dịch DB |
| 422 | ASSIGNMENT_INELIGIBLE | Giáo viên không đủ điều kiện theo snapshot |
| 422 | ASSIGNMENT_HARD_VIOLATION | Phương án dự kiến vi phạm hard checks |
| 422 | Mã chuẩn hóa nguồn / DATA_CONSTRAINT | Thiếu dữ liệu, scope chưa hỗ trợ hoặc ràng buộc DB |

## Migration và kiểm thử

DB cũ cần đầy đủ 04–08, sau đó áp [09_manual_assignment_unlock.sql](../sql/09_manual_assignment_unlock.sql) bằng psql với ON_ERROR_STOP. Migration 09 chỉ thay guard assignment để cho phép pure unlock; không thêm bảng, không backfill, không đổi dữ liệu. Chạy lặp được. Schema 01 mới đã có cùng guard. Không tự áp migration lên DB người dùng trong lúc phát triển/kiểm thử.

PlanAssignmentPostgresTest dùng DB riêng, source có STANDARD 3 + ENRICHMENT 2 và hai giáo viên hợp lệ. Bao phủ API thật qua MockMvc/PostgreSQL, sửa/bỏ gán, CAS, quyền, no-op, selector, batch rollback, source stale/ineligible rồi unlock, report stale và khóa HTTP → native solver → apply. Lệnh opt-in chung: `mvn -pl backend -am verify -Dplan.integration=true -Dplan.test.url=... -Dplan.test.user=...` chỉ trên DB test có thể bỏ đi.

Ngày 14/11/2026: **18/18 ca mới, tổng hồi quy backend 175/175 đạt**: 130 tích hợp/OpenAPI/H2, 1 đọc lại trong JVM mới, 23 backend cũ và 21 PostgreSQL CRUD. Toàn bộ source liên quan được biên dịch release 17 và chạy JUnit Jupiter Engine thực trên JDK17/PostgreSQL18/OR-Tools native Windows; không dùng solver/DB giả. Principal trong test được cấp có kiểm soát vì auth thật chưa được nhóm nối. Migration 09 đã áp lặp và cùng schema/seed mới trên DB tạm, vẫn 48 bảng; DB người dùng không bị áp migration hoặc sửa dữ liệu, cluster test đã dừng.

Log/runner/checkpoint: `D:/HCMUT/DACN/tmp/manual-assignments-20261114/`. Maven offline reactor verify vẫn bị cache plugin Surefire thiếu `SurefireReportParameters` trước khi chạy suite, không ghi là Maven verify thành công. Scripts kiểm thử/migration qua kiểm tra cú pháp; chưa chạy Docker test profile trong phiên agent. Chi tiết hồi quy ở [SOLVER_API_VERIFICATION.md](SOLVER_API_VERIFICATION.md).
