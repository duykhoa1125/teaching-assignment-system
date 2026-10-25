# Truy vết hiện thực và kiểm thử

| Nguồn | Thành phần | Kiểm thử |
|---|---|---|
| HC-01, BR-01/12/13/15 | ModelBuilder x/y/z, InputValidator scope/components | greedy trap; no teachers; component consistency; required type/duplicate validation |
| HC-02, BR-02/03 | Employment/Qualification, sparse eligible matrix | Full-term leave; other semester; wrong level; unverified qualification; partial term rejected |
| HC-03, BR-06/09 | HardCheck expressions, annual status | Capacity partial; annual own coefficients; fixed load infeasible; missing weekly rejected |
| BR-04/05, SC-02, POC-05/11/12 | Q, exact normalization, independent BigDecimal loads | Decimal 1.875; F/C/W; F/A overlap rejection; overflow; L1 counterexample |
| HC-06, BR-16–21 | Required external rule-service prechecks | Missing/violating prechecks rejected. No claim of implementing legal document/rule engine |
| SC-01 | Coverage mode | COMPONENTS vs PERIODS; COMPLETE_GROUPS |
| SC-03 | Experience soft penalty | 30 seeded native instances compared against independent exhaustive enumeration |
| SC-04, POC-10 | Previous assignments by demand identity | Teacher switch counted once; added/removed separate; explicit preserve policy |
| POC-08/14 | Two-phase runner and injectable backend | UNKNOWN phase 1; UNKNOWN phase 2 fallback; phase 2 proof cannot promote phase 1; real phase 2 disabled |
| POC-09 | Cancellation + apply guard | Pre-cancel returns no candidate; cancellation preserves saved data |
| POC-15, FR-15/NFR-04 | AssignmentService and in-memory CAS | Simultaneous applies; source token/version/snapshot changes; state change; snapshot hash mismatch |
| POC-16 | InputValidator | Invalid/missing inputs stop before phases; annual warnings stay distinct |
| POC-17/18 | Components and employment | Whole group, duplicate type, no split teacher; correct period and target applicability |
| DATA-18 | CLI and JSON | Packaged JAR with native libs, JSON/hash roundtrip, CSV outputs, existing-output protection |

POC-06/07 (user locks), POC-19 (feedback lifecycle), POC-20 (PDF lifecycle) không được đánh dấu đạt: không thuộc module core đang hiện thực. POC-20 chỉ có tiền đề `dataReadyForOpening` và test DRAFT một phần không đạt tiền đề dữ liệu; chưa thử renderer hay giao dịch phát hành PDF.

Các test UNKNOWN/FEASIBLE sử dụng backend thay thế **chỉ để kiểm tra điều phối**, vì timeout rất ngắn không bảo đảm CP-SAT trả trạng thái mong muốn trên mọi máy. Các ca tối ưu và vét cạn chạy OR-Tools native thật. Bài toán nhỏ có thể kết thúc OPTIMAL quá nhanh để dùng làm benchmark timeout.
