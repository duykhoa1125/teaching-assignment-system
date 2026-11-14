# Truy vết hiện thực và kiểm thử

Mô hình hiện hành: [CURRENT_MODEL.md](CURRENT_MODEL.md), [CONTRACT.md](CONTRACT.md). Quyết định/two-phase cũ ở [hồ sơ25/10](../../../docs/history/20261025/algorithm/tass-cpsat/REVIEW.md).

| Phạm vi | Hiện thực | Bằng chứng kiểm thử |
| --- | --- | --- |
| Một người hoặc chưa gán trên thành phần | ModelBuilder x/y, InputValidator scope/type/identity | Greedy trap, no teachers, duplicate/missing component; chính khóa/chuyên đề có thể khác người |
| Công tác/chuyên môn | Employment/Qualification và tập ứng viên đủ hiệu lực | Nghỉ toàn kỳ, sai học kỳ/cấp, chưa xác minh, thiếu phủ hiệu lực |
| Tải và điều kiện cứng | HardCheck với đơn vị/hệ số riêng; T=A+F+C+R | Trần tải, annual unknown/own coefficients, F không trùng A, khóa không tính thêm F |
| Số học chính xác | integerScale, BigDecimal, safe integer bounds | V1 giữ fixture decimal lịch sử; V2 từ chối quá hai chữ số và không làm tròn |
| Năm mục tiêu | Z → L1 → M → experience → change | ReportSolverTest, oracle30 bài toán nhỏ trong một test; M phân biệt tie L1; kinh nghiệm trước giữ mềm |
| Kinh nghiệm | ExperienceScoring theo môn/khối/mốc và policy | UNKNOWN khác0, penalty không tăng theo số năm, trọng số khối9/12 |
| Khóa | InputValidator, model equality, SolutionValidator | Khóa đúng, sai năng lực, vượt trần, cùng/khác giáo viên theo các thành phần |
| Hủy và trạng thái từng bước | Cancellation, incumbent đã hậu kiểm, proof từng bước | Hủy không áp candidate; UNKNOWN giữ incumbent; infeasible ở bước sau không suy thiếu nguồn lực |
| Áp dụng | AssignmentService và PostgreSQL adapter ở backend | Identity/hash/token/revision, stale, cancel, rollback, audit và completion đồng thời |
| CLI | JSON/hash và CSV, native JAR | CliIT, thư mục output mới, không ghi đè kết quả cũ |

Các bộ ba thuật toán dùng [CommonSolverTest](../../tass-comparison/TEST-MAP.md) để đối chiếu cùng hợp đồng. Những backend thay thế chỉ điều khiển test fallback/cạnh tranh; các ca tối ưu và oracle chạy native thật.

**Phân biệt phạm vi:** module core có xử lý khóa và reference CAS trong bộ nhớ. API sửa/khóa/mở khóa và PostgreSQL thật ở [backend](../../../backend/docs/ASSIGNMENT_MUTATION_API.md). Auth thật, feedback/lifecycle và PDF vẫn ở [backlog](../../../docs/BACKLOG.md). Bộ kiểm thử không chứng minh đã có rule engine pháp lý sản xuất.

Hồ sơ thuật toán209 lượt ngày09/11 và backend175 lượt ngày14/11 là hai bộ khác nhau; xem các tài liệu kiểm chứng tương ứng, không cộng thành một suite mới.
