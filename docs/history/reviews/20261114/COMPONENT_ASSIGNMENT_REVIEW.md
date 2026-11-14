> Archived historical document. Dates, test counts and decisions below describe its original milestone. Current status: [backend documentation](../../../../backend/docs/README.md).

# Rà soát phân công theo thành phần — 14/11/2026

**Cập nhật sau review:** người dùng đã yêu cầu xử lý khoảng trống API sửa/khóa/mở khóa. Phần này được triển khai và mô tả tại [ASSIGNMENT_MUTATION_API.md](../../../../backend/docs/ASSIGNMENT_MUTATION_API.md), gồm atomic batch/nhóm, audit, CAS và migration 09. Các kết luận thiếu API bên dưới là hiện trạng tại thời điểm review trước thay đổi; các điểm feedback, ngày hiệu lực theo học kỳ và UI demo vẫn giữ nguyên phạm vi chưa xử lý trong đợt API này.

## Quy tắc đã được người dùng chốt

- Đơn vị phân công: học kỳ + lớp + môn + thành phần (STANDARD, SPECIALIZED_TOPIC, ENRICHMENT).
- Mỗi thành phần được giao trọn số tiết/tuần cho một giáo viên, hoặc giữ chưa phân công cùng lý do; không chia một thành phần cho nhiều người.
- Chính khóa/tăng cường có thể cùng hoặc khác giáo viên. Mỗi phân công có hiệu lực cố định trong học kỳ; không lập lịch thay giáo viên giữa các giai đoạn.
- UI gom lớp–môn để xem, khóa riêng từng dòng hoặc khóa toàn bộ các dòng của nhóm trong một thao tác. Khóa toàn nhóm không ép các dòng cùng giáo viên.
- Khóa phải giữ giáo viên/số tiết; dữ liệu mới xung đột phải được xử lý trước, không tự mở khóa. Tải khóa vẫn nằm trong A đúng một lần.
- Giữ mục tiêu Z → L1 → M → experience → change; T=A+F+C+R. Không bổ sung ưu tiên chính khóa hoặc lịch tuần thực dạy ngoài quyết định hiện có.
- SOL-10 tối ưu nhiều giai đoạn không cần triển khai cho phạm vi này. Các guard dữ liệu nhiều khoảng vẫn giữ; không cộng các mức tiết tuần ở những khoảng khác nhau.

Ví dụ: 10A1/Toán/HK1 có STANDARD 3 tiết cho cô Phương và ENRICHMENT 2 tiết cho thầy Minh. Khóa STANDARD giữ cô Phương; ENRICHMENT chưa khóa vẫn được tối ưu. Khóa cả hai giữ nguyên hai giáo viên và tổng A=5, không yêu cầu cùng người.

## Kết luận chính

Solver, validator và persistence đã phù hợp với phân công độc lập/khóa theo dòng. Chưa có đầy đủ luồng HTTP/UI dùng dữ liệu thật để người quản lý sửa/khóa hoặc duyệt đề nghị tăng tiết. Lượt rà soát này không thay code nghiệp vụ hoặc dữ liệu DB; chỉ bổ sung hồ sơ và cập nhật phạm vi kế hoạch.

## Phần đã phù hợp

| Nội dung | Bằng chứng source |
| --- | --- |
| Một giáo viên hoặc chưa gán trên mỗi thành phần | ModelBuilder tạo biến theo teacher–demand, tổng các biến và unassigned bằng 1; InputValidator từ chối trùng class–subject–semester–type |
| Cùng/khác giáo viên giữa các thành phần | ModelBuilder không có ràng buộc ép cùng giáo viên; CURRENT_MODEL ghi rõ và SolverTest.poc17ComponentsMayUseDifferentTeachers kiểm tra chính khóa/chuyên đề độc lập |
| Không chia nhỏ số tiết một dòng | plan_demand.teacher_id là một giá trị; periods_per_week_snapshot phải bằng nhu cầu trong snapshot |
| Khóa riêng một hoặc nhiều dòng | InputValidator kiểm tra metadata/ứng viên/trần của khóa; ModelBuilder cố định biến; SolutionValidator kiểm tra lại |
| Backend lấy khóa hiện tại | SolverInputPreparation đọc plan_demand của version đang giữ khóa; SolverSnapshotMapper đưa vào lockedAssignments |
| Lưu nghiệm giữ nguyên khóa | SolverAssignmentRepository đối chiếu số tiết/người và bỏ qua update dòng khóa; trigger tass_guard_assignment chặn sửa giáo viên/số tiết hoặc xóa dòng khóa |
| Không tính trùng tải | SolutionValidator cộng periods của mỗi demand được gán đúng một lần; T=A+F+C+R; kiểm tra nguồn F không trùng demand thuộc A |
| Cập nhật chỉ trên current DRAFT | Service/trigger/apply kiểm tra lifecycle, revision và source token; kết quả cũ không được ghi đè |

## Khoảng trống theo mức ưu tiên

### P1 — Chưa có API sửa/khóa/mở khóa và khóa toàn nhóm

PlanResultController hiện chỉ đọc assignments/workloads/optimization và POST/GET validation; không có API ghi phân công hoặc khóa. Các test khóa backend hiện dùng SQL trong fixture, không chứng minh người dùng có thể khóa từ HTTP.

Cần bổ sung service/API có actor và quyền, expected_revision, current DRAFT, snapshot còn mới, lý do/audit và hậu kiểm. Khóa toàn nhóm phải chọn đủ các thành phần từ snapshot của version và commit một transaction; lỗi một dòng rollback toàn nhóm. Không tạo plan/version con riêng, không khóa bằng vòng lặp HTTP từng dòng.

Frontend bulkLock hiện khóa các dòng đã chọn, bỏ qua dòng chưa gán và chỉ lưu browser. Nó chưa bảo đảm thao tác "khóa toàn bộ nhóm lớp–môn" hoặc atomic transaction ở server. Trước khi nối API cần phân biệt rõ khóa lựa chọn với khóa toàn nhóm.

### P1 — Đề nghị nhận thêm tiết môn khác với tăng nhu cầu của một lớp

Schema feedback.requested_periods_per_week được chú thích là tổng tiết môn mong muốn, không phải phần tăng và không tự tạo demand. Frontend mvpFeedbackValid cộng số tiết môn của giáo viên trên tất cả lớp ở phiên bản nguồn. Khi loại REQUEST_SUBJECT_TOTAL, mvpFeedbackSave lưu demandId=null; lớp mục tiêu không được lưu trong yêu cầu này.

Ví dụ: giáo viên đang dạy Lý 3 tiết ở 10A1 và 3 tiết ở 10A2 thì tổng hiện có là 6. Gửi 4 theo ý "10A1 từ 3 lên 4" sẽ bị validator hiện tại từ chối vì 4 không lớn hơn 6. Gửi 7 cũng không cho biết lớp nào cần tăng. Đây là điểm cần tách hợp đồng, không đổi nghĩa trường hiện có một cách ngầm định.

Đề xuất giữ REQUEST_SUBJECT_TOTAL cho nguyện vọng nhận thêm tải môn; thêm loại đề nghị tăng nhu cầu theo lớp/thành phần, có tham chiếu nguồn, lớp/môn, số tiết hiện tại và mong muốn hoặc phần tăng được định nghĩa rõ. Manager duyệt nguồn nhu cầu riêng với quyết định phân công. Cần API workflow tương ứng; hiện chưa có FeedbackController/service. UI mvpResolveSave chỉ ghi quyết định và lý do trong browser, không tạo demand phía server.

### P2 — Khoảng đồng nhất chưa đồng nghĩa phủ toàn học kỳ

DbWorkloadPreparer lấy start/end từ nhu cầu đầu tiên rồi buộc mọi nhu cầu cùng khoảng. Round-readiness cũng dùng min/max nhu cầu. Chưa có kiểm tra ở các điểm này buộc khoảng đó bằng semester.starts_on/ends_on.

Vì phạm vi vừa chốt là phân công cả học kỳ, cần chuẩn hóa/kiểm tra ngày đầu vào tương ứng với học kỳ và thêm ca tất cả demand cùng một khoảng ngắn hơn học kỳ. Không cần xây bộ chia giai đoạn hoặc lịch thực dạy để giải quyết điểm này.

### P2 — UI demo chưa dùng hợp đồng và cấu hình backend

Frontend vẫn lưu localStorage, runSolver là mô phỏng và max tải minh họa 24; seed backend đang có trần T=25. Source UI không phải bằng chứng luồng khóa/duyệt/solver thật đã nối. Khi tích hợp cần dùng DTO/ID/revision/quyền và policy của server; không giữ hai bộ trần độc lập.

## Kiểm chứng bổ sung trong lượt rà soát

Biên dịch lại source CP-SAT hiện tại bằng --release 17, chạy fixture tass-solver/2 với OR-Tools native thật trên Windows/JDK17. Fixture được điều chỉnh thành cùng lớp/môn, STANDARD 3 và ENRICHMENT 2. **9/9 kiểm tra đạt**:

1. Hai giáo viên khác nhau nhận 3 và 2 tiết.
2. Tổng A=5, không tính trùng.
3. Một giáo viên có thể nhận cả hai thành phần nếu đủ tải.
4. Khóa STANDARD, ENRICHMENT vẫn được giao độc lập.
5. Hai khóa có thể giữ hai giáo viên khác nhau.
6. Hai khóa có thể giữ cùng giáo viên nếu đủ tải.
7. Khóa vượt trần trả LOCK_CONFLICT trước khi giải.
8. Giữ STANDARD 3 tiết đã khóa và báo thiếu ENRICHMENT 2 tiết khi không còn sức chứa.
9. Hậu kiểm độc lập từ chối kết quả thay đổi giáo viên đã khóa.

Fixture, probe Java, class và log: D:/HCMUT/DACN/tmp/component-review-20261114/. Đây là kiểm tra nhắm vào quy tắc vừa chốt, không phải chạy lại toàn bộ regression/Maven hoặc xác nhận API khóa/feedback chưa tồn tại. Test hồi quy cũ 156/156 thuộc hồ sơ SOL-01–09; không cộng thành một bộ test mới đã chạy toàn bộ.

## Thứ tự tiếp theo đề xuất

1. Chuẩn hóa dữ liệu/guard theo học kỳ và ghi hợp đồng tăng nhu cầu theo lớp khác với nguyện vọng tổng tải môn.
2. API chỉnh phân công, khóa/mở khóa theo dòng và atomic batch theo nhóm, dùng chung CAS/validator/audit.
3. Workflow phản hồi/duyệt nhu cầu, xử lý source token, xác nhận tập thành phần và bản DRAFT theo lifecycle.
4. Nối UI vào API, lấy cấu hình server; kiểm thử HTTP khóa rồi chạy lại và duyệt tăng tiết xuyên suốt.

Các bước này là phần tích hợp/manual-edit/feedback đã được xác định còn thiếu; không đổi tên thành SOL-10 nhiều giai đoạn và không ghi là đã triển khai trong lượt review.
