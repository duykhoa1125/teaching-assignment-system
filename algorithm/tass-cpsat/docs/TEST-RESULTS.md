# Kết quả kiểm thử — 25/10/2026

Kết quả dưới đây là chạy thực trên Windows, không lấy từ VALIDATION.json của bộ tài liệu.

## Môi trường và lệnh

- Windows 11 x64; AMD Ryzen 7 8845H, 16 logical processors.
- Eclipse Temurin **21.0.12.1+1**, x64; biên dịch target Java 17.
- Maven 3.9.9; Google OR-Tools **9.14.6206**; JUnit Jupiter 5.11.4.
- Fixture mặc định: một worker, seed 42, gap tương đối/tuyệt đối bằng 0; tổng ngân sách pipeline 20 giây; mỗi pha tối đa 8 giây.
- Lệnh: `.\scripts\Test.ps1` (Maven `verify`, gồm Surefire, đóng gói JAR và Failsafe).
- Kết quả cuối: **BUILD SUCCESS**, 46.482 giây cho cả build/test/package, không phải thời gian solver đơn lẻ.

| Suite | Số test | Failures | Errors | Skipped | Thời gian suite |
|---|---:|---:|---:|---:|---:|
| ExhaustiveOracleTest | 1 | 0 | 0 | 0 | 3.457s |
| SolverTest | 45 | 0 | 0 | 0 | 0.529s |
| AssignmentServiceIT | 6 | 0 | 0 | 0 | 3.217s |
| CliIT | 2 | 0 | 0 | 0 | 3.439s |
| **Tổng** | **54** | **0** | **0** | **0** | |

Test vét cạn chứa **30 bài toán sinh có seed cố định**, mỗi bài xét độc lập toàn bộ 27 cách gán 3 nhu cầu cho 2 GV hoặc bỏ trống. Cả mục tiêu coverage và mục tiêu mềm của CP-SAT khớp optimum tính từ phép liệt kê. 30 bài toán này nằm trong 1 test JUnit, không cộng thành 30 test để tăng số đếm.

Integration tests chạy thư viện native, kiểm tra hai lượt apply đồng thời chỉ một lượt thắng, dữ liệu cũ/token/version/state thay đổi bị từ chối, hủy/lỗi giữ gán đã lưu, DRAFT thiếu được lưu nhưng không đạt điều kiện dữ liệu để mở. CliIT khởi chạy JAR có đủ thư viện, đọc lại JSON/hash, kiểm tra CSV và bảo vệ thư mục output đã tồn tại. Tầng store là adapter trong bộ nhớ; chưa có database thật để test transaction SQL.

## Chạy fixture từ JAR đã đóng gói

Lệnh `.\scripts\Run.ps1` với từng fixture, kết quả lưu trong `output/verified-*`:

| Fixture | Status | Gán/tổng | Tiết thiếu | Tổng lệch tải W | Elapsed pipeline |
|---|---|---:|---:|---:|---:|
| greedy-trap | OPTIMAL | 2/2 | 0 | 0 | 0.1379877s |
| shortage | OPTIMAL | 1/2 | 1 | 0 | 0.1598777s |
| component-consistency | OPTIMAL | 1/2 | 1 | 1 | 0.1609340s |
| decimal-load | OPTIMAL | 2/2 | 0 | 0 | 0.2368772s |

Tất cả có coverageOptimalityProven=true và budgetExceeded=false. OPTIMAL của fixture thiếu chỉ khẳng định tối ưu dưới tập ràng buộc và objective; không có nghĩa gán đầy đủ hoặc được phép mở/xuất. Hai fixture thiếu có `dataReadyForOpening=false`.

Fixture số lẻ xác minh A=3.125, F=0.5, C=0.375, W=Q=4; deltaA=-0.875 và deltaW=0. Tải năm của cả bốn fixture giữ **INSUFFICIENT_DATA** với danh sách thiếu riêng.

Elapsed trong bảng đo từ tiền kiểm đến kết quả; không gồm JVM startup/nạp DLL hay giao dịch DB. Đây là số đo toy một lượt, chưa kết luận đạt NFR-03 cho quy mô trường, chưa có benchmark dữ liệu thật.

SHA-256 JAR được chạy:

`AE54B29B4A085AF1D921B5D77320526926A6DF68580EAC9474A73F9C53055A55`

## Lỗi môi trường đã gặp và xử lý

Lượt native đầu với Oracle JDK **23.0.2** dừng tiến trình bằng EXCEPTION_ACCESS_VIOLATION trong msvcp140.dll. Crash log xác nhận JVM nạp DLL **14.36.32532.0 từ thư mục bin của JDK**, dù bản System32 là 14.50.35719.0. Đây phù hợp với [OR-Tools issue #4690](https://github.com/google/or-tools/issues/4690) về runtime C++ đi kèm JDK.

Đã tải bản Temurin 21 x64 từ API chính thức Adoptium và kiểm tra SHA-256 archive:

`F9D6E191AB098C0D416E7D588A24420A8621CD2F4720DAB2459B8B7B2D2D8B4E`

JDK riêng có DLL C++ 14.40.33810.0, chạy toàn bộ 54 tests và bốn CLI fixture thành công. Java hệ thống được giữ nguyên. `Setup-Java.ps1` chọn bản Temurin 21 hiện có từ API và xác minh checksum tương ứng; lần tải tương lai có thể mang bản vá khác. Không xóa hoặc chép đè DLL trong Program Files/System32.

Build có cảnh báo Maven Shade về module-info và các resource LICENSE/NOTICE/MANIFEST trùng giữa dependencies. JAR đã được kiểm thử chạy thực trên classpath; module này không được đóng gói để chạy như JPMS module. Không xem cảnh báo đóng gói là lỗi solver hoặc che kết quả test.

Có một lỗi biên dịch trung gian do đổi helper `bounded`; đã sửa trước lượt BUILD SUCCESS nêu trên. Chỉ kết quả sau sửa được dùng để bàn giao.
