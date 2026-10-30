# Test case Java đối chiếu thuật toán với Excel

Nhánh `test/algorithm-excel-validation` bắt đầu từ `feature/algorithm-module` (`eb6fc5a`). Hai snapshot JSON ẩn danh trong `fixtures/` là **dữ liệu đầu vào** cho JUnit, không phải mã test. Ba workbook gốc ở thư mục `DACN/test/` không được đưa lên Git.

## Chạy test

Từ `algorithm/tass-cpsat`:

```powershell
mvn verify
mvn verify "-Dtass.excel.dir=C:\Users\MyPC\Desktop\DACN\test"
```

Thay đường dẫn ở lệnh thứ hai theo máy. Nếu không truyền `tass.excel.dir`, ba test đối chiếu workbook sẽ được bỏ qua; mọi test solver vẫn chạy. Nếu có truyền mà thư mục hoặc workbook thiếu, test sẽ thất bại.

## Ca đã tự động hóa

| ID | JUnit | Dữ liệu và kết quả mong đợi |
|---|---|---|
| XLS-01 | `ExcelWorkbookEvidenceTest.currentYearCellsAndStaleSummaryFormulaMatchFixtures` | E26, HK I: `F7=8`, `H7=13.2`, `J7=4`, `N7=17.2`; chi tiết `4 + 4×1.25 + 3×1.4 = 13.2`. |
| XLS-02 | Cùng test | E26, HK II: `U7=13`, `W7=20.2`, `AC7=24.2`. |
| XLS-03 | Cùng test | E26: `U65=0` do công thức `SUM(U66:U70)` bỏ dòng 71–72, dù `U71=U72=1`; tải chi tiết `W71=W72=3`, `W65=6`, `AC65=10`. |
| XLS-04 | Cùng test | E26 HK I: `H31=N31=23.4`, `S31=19`. Đây là bằng chứng cần rà định mức, chưa phải kết luận vi phạm trần cứng. |
| XLS-05 | Cùng test | E26 HK II: `W39=AC39=29.2`, `AG39=19`; chưa có đủ chính sách để suy ra trần cứng. |
| XLS-06 | Cùng test | E26: `H57=12`, `J57=4`, `L57=4`, `N57=20`, `S57=17`. |
| XLS-07 | Cùng test | E26: `4×1.25=5`, `3×1.4≈4.2`; so số thực với sai số `1e-7` vì Excel có thể lưu `4.1999999999999993`. |
| XLS-09 | Cùng test | Dấu môn `D37=CN`; chuyên đề `E79=CHUYÊN ĐỀ A1 + A2`; các mã lớp và chuyên đề ở `E8/E10/E12/E64/T71/T72`. |
| XLS-10 | `ExcelWorkbookEvidenceTest.draftWorkbookIsRecognizedAsSeparateSource` | E26D có sheet `Tổ VẬT LÝ NH 26-27`, `H7=13.2`; nhận diện workbook dự kiến là nguồn riêng. |
| XLS-11 | `ExcelWorkbookEvidenceTest.historicalLeaveEvidenceMatchesSource` | E25 có ghi chú `NGHỈ THAI SẢN` ở `E16`, `F16=H16=0`; không suy ra trạng thái hiện tại. |
| CP-01 | `ExcelDerivedSolverTest.hk1EightScienceClassesAndTwoPhysicsClassesMatchSourceTotals` | Solver CP-SAT gán 10/10 nhu cầu HK I; kiểm tra người nhận, tải `A/F/C/W/Q`, độ lệch và hard check tuần. |
| CP-02 | `ExcelDerivedSolverTest.hk2UsesTwoDetailRowsDespiteStaleZeroClassSummary` | Solver gán 2/2 chuyên đề HK II từ hai dòng chi tiết, không dùng `U65=0` làm số lớp. |
| CP-03 | `ExcelDerivedSolverTest.quarterPeriodsRequireAtLeastHundredthScale` | Input có hệ số `1.25` nhưng scale `10` bị từ chối thay vì làm tròn sai. |

Các ca XLS-08 và XLS-12 liên quan nối tên ngắn/tên đầy đủ của giáo viên và so bảng theo lớp với bảng theo kỳ. Chúng cần bảng alias được xác nhận trước khi có oracle tự động. Test hiện tại chỉ xác nhận ô `F5` trên sheet theo lớp có dữ liệu. E26, E25 và E26D là ba nguồn khác nhau; không dùng bảng cũ hay bảng dự kiến làm nghiệm chuẩn của năm hiện tại.

## Giới hạn khi duyệt nghiệm thật

Fixture solver dùng mã giáo viên ẩn danh và các giả định thử nghiệm cho năng lực, `B/R/F/C`, trần hard check và thời gian học kỳ. Excel không cung cấp đủ dữ liệu để xác nhận các chính sách này. Kết quả `OPTIMAL` của snapshot chỉ chứng minh solver xử lý đúng mô hình đã nhập; phương án phân công thật vẫn cần đối chiếu chính sách, năng lực và định danh đã duyệt.

Kết quả lần chạy ở [BRANCH-TEST-RESULTS.md](BRANCH-TEST-RESULTS.md).
