# Test Java đối chiếu thuật toán với bảng Excel

File test: [ExcelDerivedSolverTest.java](../../src/test/java/vn/edu/tass/solver/ExcelDerivedSolverTest.java). Test tự dựng dữ liệu đầu vào bằng Java và chạy trực tiếp `AssignmentSolver` (CP-SAT), không cần fixture hoặc script riêng.

Nguồn số liệu: workbook `TỔ VẬT LÝ - PCCM NH26-27.xlsx` trong thư mục `DACN/test/`, sheet `Tổ VẬT LÝ NH 26-27`. Test chỉ đưa các ô cần thiết vào snapshot; mã giáo viên `E26-T1/T7/T8` là mã ẩn danh.

| Test | Dữ liệu lấy từ Excel | Kết quả cần đạt |
|---|---|---|
| `hk1EightScienceClassesAndTwoPhysicsClassesMatchSourceTotals` | HK I: `H8=4`; bốn lớp ở dòng 10, mỗi lớp `1.25`; ba lớp ở dòng 12, mỗi lớp `1.4`; hai lớp ở dòng 64, mỗi lớp `2`. Tổng `H7=13.2`, `J7=4`, `N7=17.2`; giáo viên thứ hai có `H57=12`, `J57=4`, `L57=4`, `N57=20`. | Gán đủ 10/10 nhu cầu đúng giáo viên; tải `A/F/C/W/Q` đúng, tổng lệch tải `4.8`, hard check tuần đạt, solver chứng minh tối ưu. |
| `hk2UsesTwoDetailRowsDespiteStaleZeroClassSummary` | HK II: `U65=0` vì công thức `SUM(U66:U70)` bỏ qua hai dòng 71–72; mỗi dòng có một lớp chuyên đề và `W71=W72=3`. Tổng `W65=6`, `Y65=4`, `AC65=10`. | Tạo 2 nhu cầu từ dòng chi tiết, gán đủ 2/2; `A=6`, `C=4`, `W=10`. Không lấy `U65=0` làm số lớp. |
| `quarterPeriodsRequireAtLeastHundredthScale` | Dòng 10 có hệ số `1.25` tiết/lớp. | Input với `integerScale=10` bị từ chối (`INVALID_INPUT`), tránh cắt cụt số lẻ. |

Chạy từ thư mục `algorithm/tass-cpsat`:

```powershell
mvn -Dtest=ExcelDerivedSolverTest test
```

**Giới hạn:** Excel không cung cấp đủ dữ liệu xác nhận năng lực, trạng thái làm việc, quy tắc `B/R/F/C` hoặc trần tải. Các trường đó trong test là giả định để kiểm tra đường đi của solver. Kết quả test không phải phê duyệt phương án phân công thực tế.
