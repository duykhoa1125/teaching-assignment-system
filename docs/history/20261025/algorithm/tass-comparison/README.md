> Historical snapshot retained before repository standardization. Use the active module README for current instructions.

# So sánh ba thuật toán TASS

Cấu trúc thư mục ngang hàng:

```text
TASS_ChuanHoa_20261022/
├── tass-cpsat/       CP-SAT gốc, fixture và validator chuẩn
├── tass-greedy/      thuật toán tham lam
├── tass-genetic/     thuật toán di truyền
├── tass-common/      decoder, hợp đồng và xuất kết quả dùng chung
├── tass-benchmark/   chương trình so sánh cặp
└── tass-comparison/  build, test chung và script chạy
```

Mở PowerShell trong `tass-comparison`:

```powershell
# Build/test tất cả. Dùng lại JDK và Maven cache trong tass-cpsat.
.\Test-All.ps1

# Sau khi tải đủ thư viện có thể kiểm thử không cần mạng.
.\Test-All.ps1 -Offline

# Cùng 4 fixture, 5 lượt/thuật toán/dataset, cùng ngân sách tổng 2 giây.
.\Run-Comparison.ps1 -Repeats 5 -Seconds 2

# Chạy riêng từng thuật toán trên cùng input.
.\Run-Algorithm.ps1 -Algorithm CP_SAT
.\Run-Algorithm.ps1 -Algorithm GREEDY
.\Run-Algorithm.ps1 -Algorithm GENETIC
```

Có thể truyền `-FixturesDirectory` chứa các snapshot JSON schema gốc để đo trên dữ liệu lớn hơn, `-OutputDirectory` mới hoặc `-JavaHome` trỏ JDK tương thích. `Run-Comparison.ps1` dùng JAR đã build; không tự chạy build vào giữa lượt đo. Kết quả từng thuật toán cũng có thể áp dụng qua `AssignmentService` gốc.

## Dùng lại kiểm thử như thế nào

Một file **CommonSolverTest.java** được biên dịch nguyên vẹn trong cả Greedy, GA và adapter CP-SAT của module benchmark. Ma trận 19 input lỗi gọi trực tiếp `SolverTest.invalidInputs()` từ test-JAR của CP-SAT; các thao tác fixture dùng helper `Fixtures` gốc. Bốn tệp JSON được đọc trực tiếp trong `tass-cpsat/fixtures`, không sao chép thành phiên bản khác.

Suite chung lấy các ca POC-01/03/04/05/09/10/11/17/18, capacity/year, decimal/unit, cùng GV, công tác/chuyên môn, thay đổi phiên bản/token và apply đồng thời từ kiểm thử hiện có. Các test độc lập về proof tối ưu, bound, hai pha và so với vét cạn vẫn chạy cho CP-SAT gốc. Không ép Greedy/GA phải trả OPTIMAL hoặc có proof giống CP-SAT; thay vào đó chúng phải qua cùng validator và công thức metric.

`tass-cpsat/pom.xml` chỉ được bổ sung artifact test-JAR và core-JAR để module khác dùng lại lớp/fixture helper. Source thuật toán và fixture CP-SAT không bị đổi để thích nghi với các phương pháp mới.

## Cách so sánh

Mỗi dataset/lượt chạy được chụp thành **cùng một inputSnapshot và SHA-256** cho cả ba thuật toán: cùng nhu cầu, GV, qualification, tải/rule, coverageMode, W/A, trọng số, previous assignments, seed và ngân sách tổng. CP-SAT dùng một worker và tối đa 45% ngân sách cho mỗi pha, để lại khoảng cho tiền/hậu xử lý. Greedy chạy một lượt xây nghiệm; GA dừng ở 200 thế hệ hoặc ngân sách, điều kiện nào tới trước.

Có một warm-up không tính thời gian cho mỗi thuật toán; chạy tuần tự và xoay thứ tự theo lượt. Thời gian chính là wall time toàn lời gọi solve(), bao gồm tiền kiểm và kiểm tra nghiệm, không bao gồm đọc/ghi JSON. Ghi cả việc vượt ngân sách thực đo. Đây là so sánh triển khai hiện tại với các tiêu chí dừng đã công bố; không khẳng định cả ba đã dùng hết cùng số giây hoặc số phép tính.

Kết quả:

- `manifest.json`: cấu hình thuật toán, GA, runtime, ngân sách và hash nguồn.
- `runs.csv`: từng lượt, seed/hash, độ phủ, tiết thiếu, nhóm hoàn chỉnh, load/experience/changes, điểm mềm, thời gian và proof.
- `summary.csv`: số lượt hợp lệ/phủ đủ, min/max/median coverage, khoảng điểm mềm tại mức phủ tốt nhất, median/p95 thời gian, số lượt có proof.
- Mỗi dataset/lượt/thuật toán có `input-snapshot.json`, `result.json`, assignments và loads CSV để đối chiếu.

Xếp hạng theo thứ tự: **hợp lệ điều kiện cứng → coverageObjective thấp hơn → softObjective thấp hơn**. Thời gian là một tiêu chí riêng; không kết luận nhanh hơn là tốt hơn nếu bỏ sót nhiều nhu cầu hơn. Chỉ đối chiếu điểm mềm khi cùng coverage, cấu hình và đơn vị. UNKNOWN/no candidate không được ghi thành nghiệm có điểm 0.

Các fixture gốc là bài toán rất nhỏ, thích hợp kiểm tra đúng/sai. Chúng chưa đủ để kết luận thuật toán nào hiệu quả nhất ở quy mô trường. Khi có snapshot dữ liệu thật đã ẩn danh và rule được chốt, giữ nguyên pipeline so sánh và chạy nhiều seed/lượt hơn. Các giới hạn về từ điển ERD và tầng quy tắc BR-16–21 của module gốc vẫn áp dụng cho cả ba.
