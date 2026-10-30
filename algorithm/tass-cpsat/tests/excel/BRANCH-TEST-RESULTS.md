# Kết quả kiểm thử Java — 30/10/2026

Nhánh `test/algorithm-excel-validation` bắt đầu từ `feature/algorithm-module` (`eb6fc5a`). Module: `algorithm/tass-cpsat`; Java 21.0.9, Maven 3.9.9, OR-Tools 9.14.6206.

| Kiểm tra | Kết quả |
|---|---|
| `ExcelWorkbookEvidenceTest` với `-Dtass.excel.dir=<folder-test>` | PASS 3/3: E26, E25, E26D; xác nhận lỗi tổng hợp `U65=0` do `SUM(U66:U70)` bỏ hai dòng 71–72. |
| `ExcelDerivedSolverTest` chạy CP-SAT thật | PASS 3/3: HK I gán 10/10, HK II gán 2/2, input scale sai bị từ chối. |
| Toàn bộ `mvn verify` có đối chiếu workbook | PASS 60/60: Surefire 52, Failsafe 8; 0 lỗi, 0 bỏ qua. |

Fixture HK I cho `A(T1)=13.2`, `W(T1)=17.2`, `W(T7)=20`, tổng lệch tải `4.8`. Fixture HK II lấy hai dòng chi tiết 71–72, cho `A(T8)=6`, `W(T8)=10`. Cả hai nghiệm có `coverageOptimalityProven=true`, `softOptimalityProven=true` trên **snapshot demo**.

Workbook không nằm trong Git. Nếu chạy Maven mà không truyền `tass.excel.dir`, chỉ ba test đọc workbook được bỏ qua; test solver vẫn chạy. Các fixture ẩn danh dùng chính sách và năng lực giả định. Excel chưa đủ dữ liệu để duyệt một phương án phân công thật, gồm `B/R/F/C`, trần hard check, năng lực theo kỳ và bảng alias giáo viên/lớp. Trạng thái `dataReadyForOpening=true` của fixture demo không chứng minh phương án thật đã đủ điều kiện phát hành.
