> Archived historical document. Dates, test counts and decisions below describe its original milestone. Current status: [backend documentation](../../../../../backend/docs/README.md).

# Kết quả kiểm thử và so sánh — 25/10/2026

Đã chạy `Test-All.ps1 -Offline`: Maven reactor **BUILD SUCCESS** cho cả sáu module, tổng thời gian build/test/package 2 phút 01 giây. Runtime Eclipse Temurin 21.0.12.1+1, Maven 3.9.9, Windows 11 x64, OR-Tools 9.14.6206.

Sau khi bàn giao vào `D:\HCMUT\DACN\TASS_ChuanHoa_20261022\TASS_ChuanHoa_20261022`, đã chạy lại cùng lệnh ngay tại `tass-comparison` ở ổ D: **BUILD SUCCESS trong 2 phút 14 giây**, cùng 183 lượt kiểm thử đều đạt. `results/test-summary.csv` tại ổ D ghi số liệu suite của lượt xác nhận này.

| Bộ kiểm thử | Lượt test | Failures | Errors | Skipped |
|---|---:|---:|---:|---:|
| CP-SAT gốc: unit + integration | 54 | 0 | 0 | 0 |
| Cùng CommonSolverTest với Greedy | 43 | 0 | 0 | 0 |
| Cùng CommonSolverTest với GA | 43 | 0 | 0 | 0 |
| Cùng CommonSolverTest với CP-SAT adapter | 43 | 0 | 0 | 0 |
| **Tổng test executions** | **183** | **0** | **0** | **0** |

183 là số lượt thực thi; gồm một bộ 43 ca được lặp cho ba thuật toán, không phải 183 ca nghiệp vụ độc lập. Bộ 54 gốc còn có test vét cạn 30 bài toán nhỏ cho CP-SAT. Xem `TEST-MAP.md` để đối chiếu các test cũ được dùng lại.

JAR Greedy và Genetic cũng đã được chạy từ CLI riêng, nhận cùng `greedy-trap.json`, đều trả 2/2 nhu cầu và điểm mềm 0 với status FEASIBLE.

## Benchmark trên đúng fixture gốc

Lệnh: `Run-Comparison.ps1 -Repeats 5 -Seconds 2`.

4 datasets × 5 lượt × 3 thuật toán = **60 lượt đo**. Cùng một snapshot/hash, seed và ngân sách tổng trong mỗi bộ ba. Có warm-up không tính thời gian; chạy tuần tự, xoay thứ tự. **60/60 nghiệm qua validator, 0 bộ ba lệch hash, 0 lượt vượt ngân sách thực đo**.

| Fixture | Gán/tổng của cả ba | Coverage/soft của cả ba | Median CP-SAT | Median Greedy | Median GA |
|---|---:|---:|---:|---:|---:|
| component-consistency | 1/2 | 1 / 100 | 10.903 ms | 3.506 ms | 36.480 ms |
| decimal-load | 2/2 | 0 / 0 | 7.582 ms | 1.779 ms | 42.354 ms |
| greedy-trap | 2/2 | 0 / 0 | 5.787 ms | 1.641 ms | 15.252 ms |
| shortage | 1/2 | 1 / 0 | 6.294 ms | 1.389 ms | 13.171 ms |

Các số là wall time toàn lời gọi `solve()`, gồm tiền kiểm/validator, không gồm đọc ghi JSON hoặc khởi tạo JVM. Đây là phép đo trong cùng một JVM sau warm-up, không phải cold-start. GA dùng population=40, generations≤200, mutation=0.10. CP-SAT dùng 1 worker, gap=0, mỗi pha tối đa 0.9 giây trên ngân sách tổng 2 giây. Cả Greedy và GA kết thúc trước khi dùng hết ngân sách; không cố tình chờ cho đủ hai giây.

CP-SAT có proof tối ưu coverage ở 20/20 lượt; Greedy và GA không khai báo proof. Một phương án tối ưu vẫn có thể thiếu nhu cầu trong hai fixture thiếu nguồn lực/không được tách GV.

Trên bốn bài toán rất nhỏ này, **chất lượng nghiệm bằng nhau; Greedy có median thời gian thấp nhất trong lượt đo hiện tại**. Không suy kết quả đó thành Greedy tốt nhất cho dữ liệu trường thật. Cần thêm snapshot lớn, có GV/chuyên môn/tải thật và ràng buộc đã được chốt để đánh giá chất lượng, độ ổn định theo seed và tốc độ ở quy mô sử dụng.

## Tệp kiểm chứng

- `results/test-summary.csv`: số test từng suite.
- `results/verified-comparison/manifest.json`: runtime, cấu hình và hash các input gốc.
- `results/verified-comparison/runs.csv`: đầy đủ 60 lượt và hash từng input.
- `results/verified-comparison/summary.csv`: thống kê median/p95 và chất lượng.
- Các thư mục con dataset/trial/algorithm: snapshot, result, assignments và loads của từng lượt.
- `evidence/`: báo cáo JUnit XML/TXT đã lưu kèm module và tên suite.

Khi chạy lại, thời gian cụ thể có thể khác. OutputDirectory phải là thư mục mới để giữ số liệu trước. Các giới hạn rule-service, dữ liệu năm và schema ERD của module gốc vẫn áp dụng; bộ so sánh không xác nhận các dữ liệu pháp lý chưa có.
