# Bộ test case duyệt thuật toán phân công giảng dạy

## 1. Phạm vi và trạng thái hiện tại

Bộ này đối chiếu ba file Excel ở thư mục `DACN/test/` của workspace với mô hình phân công giáo viên theo **lớp–môn–học kỳ**. Test được phát triển trên nhánh `test/algorithm-excel-validation`, bắt đầu từ `feature/algorithm-module` tại commit `eb6fc5a`. Code CP-SAT nằm trong `algorithm/tass-cpsat/`. Các ca bên dưới kiểm tra hành vi bài toán và đối chiếu trực tiếp với module ở mục 5. Workbook gốc không được đưa vào Git.

Nguồn Excel:

| Mã | File | Sheet cần dùng | Vai trò |
|---|---|---|---|
| E26 | `TỔ VẬT LÝ - PCCM NH26-27.xlsx` | `Tổ VẬT LÝ NH 26-27`, `PCCM 2026 _ 2027`, `phân công GVCN` | Bảng 2026–2027, hai học kỳ và đối chiếu theo lớp |
| E26D | `DỰ KIẾN _PCCM 2026_2027 gui TTCM.xlsx` | `Tổ VẬT LÝ NH 26-27` | Bản dự kiến cùng niên khóa; không tự cộng vào E26 |
| E25 | `PCCM 25-26 - TỔ VẬT LÝ - đã điều chỉnh hk2.xlsx` | `tổ VẬT LÝ 25-26`, `tổ VẬT LÝ 24-25` | Đối chứng lịch sử, trạng thái giáo viên và thay đổi học kỳ |

Không chép tên giáo viên vào fixture. Mã `T1`, `D1` trong `cases.json` là dữ liệu tổng hợp, không chỉ người thật.

## 2. Quy tắc đầu vào cần chốt trước khi duyệt nghiệm thực

| Vấn đề | Quy tắc kiểm thử |
|---|---|
| Định mức | Cột `S`/`AG` của Excel ghi “số tiết định mức”, nhưng chưa đủ chứng cứ để coi là `B` hay `Q`. `B`, `R`, `Q=max(0,B-R)` và trần cứng `U` phải đến từ bộ chính sách có phiên bản. |
| Kiêm nhiệm | Excel cộng `J`/`L` vào `N` và `Y`/`AA` vào `AC`. Việc chuyển chúng thành giảm trừ `R` hay tải quy đổi `C` cần quy tắc và chứng cứ; tuyệt đối tránh tính hai lần. |
| Chuyên môn | Cột môn/nhóm môn và gán lịch sử không đủ để khẳng định ma trận đủ điều kiện `e_ij`. Cần hồ sơ năng lực theo môn, khối, học kỳ và trạng thái hoạt động. |
| Đơn vị | Dữ liệu có `1.25`, `1.4`, `4.2` tiết/tuần; phải chọn hệ số nguyên hóa, tối thiểu 100 nếu giữ hai chữ số thập phân, và thống nhất quy tắc làm tròn. |
| Danh tính lớp và môn | `A1`, `TH`, `A2 (CHUYÊN ĐỀ)`, `CN`, `KHTN + LÝ` phải được chuẩn hóa có ngữ cảnh khối, môn và loại nhu cầu; không tự gộp chuyên đề với lớp thường. |
| Học kỳ | Bảng giáo viên có HK I/HK II riêng; sheet phân công theo lớp chủ yếu ghi theo năm. Không suy ra cùng một gán cho hai học kỳ từ sheet theo lớp. |

## 3. Test case kiểm tra import và dữ liệu Excel

**Cách chạy:** import từng workbook/sheet vào snapshot, lưu tọa độ ô nguồn cho mỗi giá trị, rồi đối chiếu kết quả với bảng sau. Kết quả `REVIEW` là dữ liệu cần người quản lý xác nhận trước khi đưa vào solver; không phải lỗi solver.

| ID | Nguồn và thao tác | Kết quả mong đợi |
|---|---|---|
| XLS-01 | E26, sheet `Tổ VẬT LÝ NH 26-27`, HK I: đọc `F7`, `H7`, `J7`, `N7` và chi tiết dòng 8–14. | `F7=8`; `H7=4+5+4.2=13.2`; `N7=13.2+4=17.2`. Có 8 lớp/nhóm theo tổng nguồn; không tạo 8 nhu cầu nếu chưa tách đúng danh sách lớp. |
| XLS-02 | Cùng dòng 7 nhưng HK II: đọc `U7`, `W7`, `Y7`, `AC7`. | `U7=13`, `W7=20.2`, `AC7=24.2`. Hai học kỳ là hai snapshot; không cộng `H7+W7` thành tải tuần. |
| XLS-03 | E26 HK II dòng 65: so `U65` với `U71:U72`, kiểm tra công thức. | `U65` lưu `0` do công thức `SUM(U66:U70)` bỏ sót dòng 71–72; chi tiết có `1+1=2` lớp và `W65=6`. Gắn `SUMMARY_MISMATCH`, không dùng `U65=0` như sự thật đã xác nhận. |
| XLS-04 | E26 HK I dòng 31: `H31=23.4`, `N31=23.4`, `S31=19`. | Chênh với định mức hiển thị là `+4.4`; **không** kết luận vi phạm trần cứng vì Excel không cung cấp `U`. Kiểm tra riêng tải mục tiêu và trần cứng. |
| XLS-05 | E26 HK II dòng 39: `W39=29.2`, `AC39=29.2`, `AG39=19`. | Chênh với định mức hiển thị `+10.2`; cảnh báo cần rà chính sách/trần. Không tự đặt `U=19` hoặc tự chấp nhận vượt. |
| XLS-06 | E26 HK I dòng 57: `H57=12`, `J57=4`, `L57=4`, `N57=20`. | Đối chiếu `12+4+4=20`; lưu riêng dạy trực tiếp, chủ nhiệm, nhiệm vụ khác. Khi áp chính sách `R/C`, chỉ ghi nhận mỗi khoản một lần. |
| XLS-07 | E26 dòng 10 và 12: `F10=4`, `G10=1.25`, `H10=5`; `F12=3`, `G12=1.4`, `H12≈4.1999999999999993`. | Kết quả nghiệp vụ là `5.00` và `4.20` tiết/tuần. So sánh theo số nguyên hóa/decimal, không so bằng bit dấu phẩy động. |
| XLS-08 | E26 sheet theo lớp `PCCM 2026 _ 2027` ô `F5` và sheet giáo viên ô `B57`, `E64`. | Tên ngắn và tên đầy đủ chỉ được nối khi có bảng alias/ID đã xác nhận. Đối chiếu lớp 12A1–Lý sau chuẩn hóa; nếu không xác định duy nhất thì `REVIEW`, không tự tạo hai giáo viên hoặc tự hợp nhất. |
| XLS-09 | E26 sheet giáo viên dòng 37 (`D37=CN`) và dòng 79 (`E79=CHUYÊN ĐỀ A1 + A2`). | Tách môn Công nghệ và nhu cầu chuyên đề; không diễn giải `CN` là khối lớp, không biến một chuỗi chuyên đề thành hai gán thường không có chứng cứ. |
| XLS-10 | Import E26 và E26D cùng niên khóa. | Giữ `source_workbook`, `sheet`, `version`, `year`, `semester`; phát hiện trùng khóa nhu cầu và yêu cầu chọn phiên bản ưu tiên. Không nhân đôi nhu cầu do hai bản Excel. |
| XLS-11 | E25 sheet `tổ VẬT LÝ 24-25`, dòng 16 có ghi chú nghỉ thai sản, HK I `F16=0`, `H16=0`. | Gắn `REVIEW` để xác nhận trạng thái hoạt động theo đúng kỳ trước khi tạo `e_ij`; không suy diễn một ghi chú lịch sử thành trạng thái hiện tại năm 2026–2027. |
| XLS-12 | E26 sheet theo lớp, ví dụ `F5` và `F13`, rồi đối chiếu nhu cầu HK I/HK II ở sheet giáo viên. | Tên giáo viên theo năm là bằng chứng tham khảo, không là oracle tuyệt đối cho gán từng học kỳ. Báo thiếu kỳ, tên alias hoặc số tiết trước khi chấm độ chính xác của solver. |

## 4. Test case solver có oracle xác định

Các ca `SOL-01` đến `SOL-14` nằm trong [cases.json](cases.json). Mỗi giáo viên có `B` (định mức cơ sở), `R` (giảm trừ), `C` (tải quy đổi), `U` (trần cứng). Mỗi nhu cầu có `h` tiết/tuần. `eligible` là cặp đủ điều kiện đã xác nhận. Trạng thái `FEASIBLE_OR_OPTIMAL` nghĩa là nghiệm có thể được lưu khi đã qua validator; chỉ khẳng định **tối ưu** khi solver báo `OPTIMAL` hoặc có bằng chứng tương đương. Fixture dùng thứ tự mục tiêu kiểm thử: ít nhu cầu trống → ít lệch `|W-Q|` → ít điểm phạt kinh nghiệm → ít thay đổi gán. Thứ tự/trọng số thật ở OI-01 vẫn cần duyệt.

`cases.json` là **oracle tham chiếu tối giản**, chưa phải input JSON của code nhánh này. Module thật dùng `F` ngoài phạm vi, hard check có coefficient riêng, coverage mode và tổng có trọng số ở pha 2. [verify-cases.mjs](verify-cases.mjs) chỉ xác nhận đáp án của mô hình tham chiếu; 14 kết quả đó **không** đồng nghĩa CP-SAT đã chạy 14 test. `SOL-02` (cấm) và `SOL-05`/`SOL-06` (khóa) đang **ngoài phạm vi module**: [REVIEW.md](../../docs/REVIEW.md) ghi rõ SRS/storage chưa chốt khóa/cấm.

| ID | Tình huống | Oracle chính |
|---|---|---|
| SOL-01 | Nghiệm duy nhất | `D1→T1`, `D2→T2`; phủ 2/2, lệch 0. |
| SOL-02 | Cặp bị cấm | `D1→T2`; tuyệt đối không chọn `T1:D1`. |
| SOL-03 | Không ai đủ điều kiện | `D1` trống; `NO_QUALIFIED_TEACHER`, DRAFT một phần. |
| SOL-04 | Có người đủ chuyên môn nhưng `C+h>U` | `D1` trống; `CAPACITY_EXCEEDED`, không ép gán. |
| SOL-05 | Khóa hợp lệ | Giữ `T1:D1`, gán `D2→T2`. |
| SOL-06 | Hai khóa vượt trần cùng giáo viên | `INFEASIBLE`; giải thích `LOCK_CONFLICT`, giữ DRAFT cũ và khóa cũ. |
| SOL-07 | `W=U` chính xác | Gán `D1→T1`, `Q=W=6`, hợp lệ ở biên. |
| SOL-08 | Phủ đủ làm điểm kinh nghiệm tăng 100 | Vẫn phủ 2/2 trước khi tối ưu điểm mềm. |
| SOL-09 | Hai gán có thể dồn một người hoặc chia đều | Chia đều để tổng lệch tải bằng 0. |
| SOL-10 | `B=8`, `R=2`, `C=2`, `h=4` | `Q=6`, `W=6`; không cộng `R` như tải dạy. |
| SOL-11 | Giáo viên không hoạt động | Dù có cặp trong `eligible` thô, `D1` vẫn trống. |
| SOL-12 | Tối ưu lại khi các điểm cao hơn hòa | Giữ cả hai gán cũ, `changedAssignments=0`. |
| SOL-13 | `C=1.25`, `h=4.2` | `W=5.45`, lệch `0.55`; không lỗi làm tròn. |
| SOL-14 | Cân bằng tải hòa, kinh nghiệm khác nhau | Chọn `T1`, điểm phạt kinh nghiệm 0. |

Từ thư mục module `algorithm/tass-cpsat`, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\excel\verify-excel.ps1 -WorkbookDirectory <đường-dẫn-đến-folder-test-có-Excel>` để xác nhận ô nguồn và `node tests/excel/verify-cases.mjs` để xác nhận oracle tham chiếu. Script Node không chạy code sản phẩm. Test nối trực tiếp CP-SAT với Excel nằm ở mục 5; hai bộ có mục đích khác nhau.

## 5. Đối chiếu trực tiếp nhánh thuật toán và ca tích hợp

File [generate-branch-fixtures.mjs](generate-branch-fixtures.mjs) tạo hai snapshot ẩn danh đúng schema `tass-solver/1` từ những ô E26 đã kiểm chứng: [HK I](../../fixtures/excel-derived-hk1.json) gồm 8 nhu cầu KHTN và 2 nhu cầu Vật lý; [HK II](../../fixtures/excel-derived-hk2-stale-summary.json) gồm 2 nhu cầu chuyên đề ở dòng 71–72, bỏ qua tổng lớp sai ở `U65`. [ExcelDerivedSolverTest.java](../../src/test/java/vn/edu/tass/solver/ExcelDerivedSolverTest.java) chạy **solver thật** và kiểm tra gán, tải, ràng buộc cùng độ chính xác của scale.

Các snapshot này chỉ lấy **số lớp, tiết/tuần và tổng tải quan sát** từ Excel. Năng lực, trạng thái công tác, ngày kỳ, `B/R/C`, trần cứng và điểm phạt là giả định demo được ghi rõ trong fixture. Chúng kiểm chứng đường đi của code và phép tính với số liệu thực, **không** chứng minh phương án có thể áp dụng cho trường. Đặc biệt `S7=19`, `S57=17` được dùng làm `B` demo với `R=0`; `J7=4` và `J57+L57=8` được dùng làm `C` demo. Chính sách thật phải được xác nhận độc lập.

Chạy từ thư mục module: `node tests/excel/generate-branch-fixtures.mjs`, sau đó `mvn verify`. Nếu PowerShell chặn script chạy kèm repo, dùng `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test.ps1`. Sau khi đóng gói, có thể chạy CLI với từng fixture và lưu output ở thư mục mới để kiểm tra `result.json`, `assignments.csv`, `loads.csv`.

| ID | Bước kiểm tra | Điều kiện đạt |
|---|---|---|
| INT-01 | Chạy cùng snapshot hai lần, cùng policy/seed/time limit. | Lưu snapshot ID, policy version, solver version, seed, thời gian, trạng thái, objective/bound; validator trả 0 vi phạm cứng. Nếu nghiệm khác do solver, chỉ so ràng buộc và điểm mục tiêu. |
| INT-02 | Đổi dữ liệu/policy khi solver đang chạy. | Kết quả snapshot cũ không ghi đè DRAFT phiên bản mới; có cảnh báo phiên bản. |
| INT-03 | Mở rộng ngoài phạm vi hiện tại: dùng SOL-06 trên DRAFT đã lưu. | Khi có khóa, trạng thái lỗi/xung đột rõ; DRAFT và khóa trước đó còn nguyên. |
| INT-04 | Hết time limit sau khi có nghiệm khả thi. | `FEASIBLE`, lưu nghiệm đã qua validator và metadata; không ghi `OPTIMAL`. |
| INT-05 | Hết time limit chưa có nghiệm, hủy chạy, hoặc model lỗi. | `UNKNOWN`/`CANCELLED`/`MODEL_INVALID` tương ứng; không ghi đè DRAFT cũ. |
| INT-06 | Chạy E26 cho HK I và HK II sau khi hoàn tất bảng alias, năng lực và policy. | Mỗi nhu cầu có đúng một giáo viên hoặc trạng thái chưa gán có lý do; 0 gán sai chuyên môn và 0 gán vượt hard check đã xác nhận. Báo riêng tỷ lệ phủ, tổng lệch tải, số đổi gán, thời gian. |
| INT-07 | So phương án solver với E25/E26 đã được thầy xác nhận. | Báo số gán giống/khác, tải theo giáo viên và nhu cầu trống; không coi Excel là nghiệm tối ưu hay dùng tỷ lệ khớp tuyệt đối làm tiêu chí duy nhất. |

## 6. Tiêu chí duyệt và biên bản

**Có thể duyệt module solver ở phạm vi hiện tại** khi toàn bộ test Java gắn với E26 và các test có sẵn trên nhánh đều đạt, mỗi nghiệm lưu qua validator với **0 vi phạm cứng**, và các trạng thái thiếu/timeout được báo đúng. `SOL-02/05/06` và `INT-03` là ca **mở rộng khóa/cấm**, không chấm module hiện tại bằng các ca đó. `INT-06/07` cần dữ liệu và rule thật để thầy duyệt nghiệm nghiệp vụ; khác bảng thủ công phải được phân tích, không tự động chấm sai.

**Chưa thể duyệt trên dữ liệu Excel thật** nếu chưa xác nhận: bộ chính sách `B/R/C/U`, năng lực/chuyên môn theo kỳ, bảng alias giáo viên/lớp, cách tính chuyên đề, và lỗi tổng hợp như `U65`. Excel không chứa đủ dữ liệu để tự suy ra các giá trị này. Module CP-SAT đã có code; ứng dụng Spring Boot và adapter dữ liệu thật vẫn chưa có trong repo.

Kết quả chạy code nhánh `feature/algorithm-module` ở [BRANCH-TEST-RESULTS.md](BRANCH-TEST-RESULTS.md). `dataReadyForOpening=true` trong fixture demo chỉ là cờ của module khi phủ đủ nhu cầu; hai fixture vẫn cảnh báo thiếu dữ liệu hard check năm và chưa có chính sách thật, nên không được coi là phương án trường đã sẵn sàng mở/phát hành.

Mẫu ghi kết quả mỗi lần chạy:

| Ngày | Commit backend | Dataset/snapshot | Policy | Case | Solver status | Gán/Trống | Vi phạm cứng | Lệch tải | Thời gian | Kết luận và bằng chứng |
|---|---|---|---|---|---|---|---|---|---|---|
| _Điền khi chạy_ | | | | | | | | | | |
