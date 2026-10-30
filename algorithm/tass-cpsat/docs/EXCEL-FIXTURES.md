# Fixture đối chiếu Excel tổ Vật lý 2026–2027

Hai fixture `fixtures/excel-derived-*.json` dùng số liệu từ workbook `test/TỔ VẬT LÝ - PCCM NH26-27.xlsx` trong workspace cha `DACN`, sheet `Tổ VẬT LÝ NH 26-27`. Tên giáo viên được thay bằng `E26-T1`, `E26-T7`, `E26-T8`; workbook gốc không được đưa vào repo.

| Fixture | Ô nguồn | Oracle |
|---|---|---|
| `excel-derived-hk1.json` | Dòng 7–12: 6A3 `4`; 8A5/6/8/9 mỗi lớp `1.25`; 9A2/3/4 mỗi lớp `1.4`; `H7=13.2`, `J7=4`, `N7=17.2`, `S7=19`. Dòng 57, 64: 12A1/12A4 mỗi lớp `2`; `H57=12`, `J57=4`, `L57=4`, `N57=20`, `S57=17`. | 10/10 nhu cầu; T1 `A=13.2,W=17.2`; T7 `A=4,F=8,C=8,W=20`. |
| `excel-derived-hk2-stale-summary.json` | Dòng 65, 71–72: `U65=0` do `SUM(U66:U70)` bỏ sót hai dòng có `U71=U72=1`; `W71=W72=3`, `W65=6`, `Y65=4`, `AC65=10`; `AG65` trống. | 2/2 nhu cầu chuyên đề; T8 `A=6,W=10`. Không dùng `U65=0` để tạo số nhu cầu. |

`B/R/F/C` là cách ánh xạ **demo** để kiểm tra đường đi của solver: HK I dùng `S7/S57` làm `B`, `R=0`, `J7` và `J57+L57` làm `C`; T7 có `F=8` là phần dạy khác ngoài 2 lớp fixture. HK II đặt `B=10` demo vì `AG65` trống. Năng lực môn/cấp, trạng thái công tác, ngày học kỳ, trần hard check và điểm phạt cũng là giả định kiểm thử. Những giá trị này không chứng minh quy tắc trường hay điều kiện pháp lý đã được xác nhận.

`ExcelDerivedSolverTest` chạy native CP-SAT với hai fixture, so gán, tải, hard check và scale. Tệp [verify-excel.ps1](../tests/excel/verify-excel.ps1) đối chiếu ô nguồn nếu truyền đường dẫn đến thư mục chứa Excel; workbook không nằm trong repo. Từ thư mục module chạy `node tests/excel/generate-branch-fixtures.mjs`, sau đó `mvn verify`.

Trên snapshot demo đã chạy ngày 30/10/2026, hai fixture trả `OPTIMAL`, nhưng annual check vẫn `INSUFFICIENT_DATA`. `dataReadyForOpening=true` từ module chỉ phản ánh phủ đủ nhu cầu demo; không dùng làm quyết định mở hoặc phát hành phương án thật.
