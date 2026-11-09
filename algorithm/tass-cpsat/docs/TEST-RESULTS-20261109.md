# Kiểm chứng mô hình năm bước — 09/11/2026

Lệnh `algorithm/tass-comparison/Test-All.ps1 -Offline` hoàn tất **BUILD SUCCESS** cho sáu module, thời gian 2 phút 23 giây. Runtime dùng JDK Temurin 21 riêng của dự án, Maven 3.9.9 và OR-Tools 9.14.6206 trên Windows x64.

| Bộ kiểm thử | Lượt | Failures | Errors | Skipped |
|---|---:|---:|---:|---:|
| CP-SAT unit (ExcelDerived, Oracle, ReportSolver, SolverTest) | 63 | 0 | 0 | 0 |
| CP-SAT integration (CLI, in-memory apply/CAS) | 8 | 0 | 0 | 0 |
| Bộ dùng chung chạy với Greedy | 46 | 0 | 0 | 0 |
| Bộ dùng chung chạy với GA | 46 | 0 | 0 | 0 |
| Bộ dùng chung chạy với CP-SAT adapter | 46 | 0 | 0 | 0 |
| **Tổng** | **209** | **0** | **0** | **0** |

209 là số lượt thực thi; có bộ 46 ca lặp với ba thuật toán. Oracle là một test thực thi vét cạn 30 bài toán ngẫu nhiên nhỏ độc lập, đối chiếu vector năm mục tiêu. Không coi đó là 209 yêu cầu nghiệp vụ độc lập hoặc kiểm thử PostgreSQL/API.

Các ca mới kiểm tra M khi L1 bằng nhau; kinh nghiệm khối cuối cấp đứng trước giữ mềm; cùng/khác giáo viên giữa tiết thường và chuyên đề; khóa hợp lệ, khóa sai chuyên môn/quá tải; T-B khi R>B; ENRICHMENT; độ chính xác v2; phân biệt kinh nghiệm 0/UNKNOWN; policy điểm không tăng theo số năm; fallback UNKNOWN, bằng chứng từng bước và lỗi INFEASIBLE ở bước sau. Bộ ca v1 giữ các kiểm tra lịch sử về đơn vị/scale, cùng với cảnh báo chuyển hợp đồng; chỉ v2 áp giới hạn hai chữ số và ngày hiệu lực tường minh.

## So sánh bổ sung

```powershell
.\algorithm\tass-comparison\Run-Comparison.ps1 -Repeats 3 -Seconds 2
```

5 fixture × 3 lượt × 3 thuật toán = **45 lượt đo**. **45/45 phương án qua validator, 0 lượt vượt ngân sách solve() 2 giây được đo.** Có warm-up riêng; seed/ngân sách/snapshot giống nhau trong mỗi bộ ba. Dữ liệu là các bài toán nhỏ tổng hợp; không suy ra SLA toàn hệ thống hoặc hiệu năng trên trường thật.

Ở fixture v2 `report-five-stage.json`, kết quả của cả ba lần lặp:

| Thuật toán | (Z, L1, M, kinh nghiệm, thay đổi) | Bằng chứng tối ưu |
|---|---|---|
| CP-SAT | (0, 0, 0, 5, 2) | Đủ năm bước |
| GA | (0, 0, 0, 5, 2) | Không có |
| Greedy | (0, 0, 0, 15, 0) | Không có |

Ví dụ này kiểm chứng CP-SAT ưu tiên kinh nghiệm phù hợp ở lớp cuối cấp dù cần đổi hai phân công chưa khóa. Greedy giữ phương án xây dựng cục bộ có điểm kinh nghiệm cao hơn; dùng cùng comparator không bảo đảm heuristic tìm được nghiệm tốt nhất.

Chứng cứ:

- `verification-20261109.json`: kết quả JUnit theo suite và SHA-256 nguồn Java.
- `algorithm/tass-comparison/results/test-summary.csv`: tổng hợp suite của lượt build cuối.
- `algorithm/tass-comparison/results/report-20261109/`: manifest, runs.csv, summary.csv và snapshot/result từng lượt của phép so sánh bổ sung.
- Log build: `D:\HCMUT\DACN\tmp\algorithm-20261109-final-build.log`.

## Giới hạn còn lại

Một lần giải v2 nhận một khoảng hiệu lực đồng nhất; dữ liệu nhiều giai đoạn bị từ chối thay vì cộng các mức tiết/tuần. Tối ưu đồng thời nhiều giai đoạn cần mô hình tải từng giai đoạn và chính sách tổng hợp mục tiêu tường minh. Chưa có adapter schema 48 bảng, bộ kiểm tra đầy đủ các chế độ pháp lý, hoặc đo queue/HTTP/database/PDF trong ngân sách 60 giây. InMemoryPlanStore là adapter tham chiếu; các test apply không chứng nhận giao dịch PostgreSQL/Spring Boot.

Các chỉnh sửa giảm biến liên kết nhóm, tái sử dụng Prepared và cache ứng viên đã qua kiểm thử tính đúng. Chưa thực hiện phép đo đối chiếu trước/sau trên dữ liệu trường thật để kết luận tỷ lệ tăng tốc.
