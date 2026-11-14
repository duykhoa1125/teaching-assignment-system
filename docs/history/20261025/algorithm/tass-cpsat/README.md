> Historical snapshot retained before repository standardization. Use the active module README for current instructions.

# TASS — module phân công giáo viên CP-SAT

> **Cập nhật 09/11/2026:** mã hiện hành dùng năm bước Z/L1/M/experience/change, hỗ trợ khóa cứng, ENRICHMENT và tải T-B. Xem [mô hình và hợp đồng hiện hành](../../../../../algorithm/tass-cpsat/docs/CURRENT_MODEL.md), [fixture v2](../../../../../algorithm/tass-cpsat/fixtures/report-five-stage.json). Các mô tả hai pha, ép cùng giáo viên và số liệu bên dưới thuộc PoC cũ, chỉ giữ để đối chiếu lịch sử. Module hiện nhận một khoảng hiệu lực đồng nhất; giới hạn đa giai đoạn được nêu trong tài liệu hiện hành.

Java 17+ / Maven, Google OR-Tools **9.14.6206**. Module gồm thư viện Java, CLI, JSON fixture và unit/integration tests. Tài liệu đầu vào là bộ rà soát **22/10/2026** tại `D:\HCMUT\DACN\TASS_ChuanHoa_20261022\TASS_ChuanHoa_20261022`.

Thư mục nguồn không có ứng dụng Java/Spring Boot, repository, schema SQL hoặc migration. Vì vậy module được xây độc lập; các record trong `Contract.java` là **hợp đồng solver**, không phải tên cột tự suy từ ERD. Có hướng dẫn ghép vào Spring Boot trong [hợp đồng tích hợp](../../../../../algorithm/tass-cpsat/docs/CONTRACT.md).

## Chạy trên Windows

Cần Maven 3.9+ và JDK 17+ x64 có runtime C++ tương thích với OR-Tools. Môi trường kiểm chứng dùng Temurin 21 đặt riêng trong dự án. Máy hiện tại có Oracle JDK 23.0.2 với DLL C++ cũ gây native crash; xem [báo cáo kiểm thử](TEST-RESULTS.md). Script không đổi Java hệ thống.

Mở PowerShell trong thư mục module:

```powershell
# Chỉ cần nếu chưa có JDK tương thích: tải Temurin 21 vào .runtime và kiểm tra SHA-256.
.\scripts\Setup-Java.ps1

# Biên dịch, chạy unit tests, đóng gói, chạy integration tests.
.\scripts\Test.ps1

# Chạy thử; script tự chọn JDK riêng và tạo thư mục output mới.
.\scripts\Run.ps1
.\scripts\Run.ps1 -Fixture fixtures\shortage.json
.\scripts\Run.ps1 -Fixture fixtures\component-consistency.json
.\scripts\Run.ps1 -Fixture fixtures\decimal-load.json
```

Nếu chính sách PowerShell chặn script, có thể chạy từng script trong một tiến trình: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test.ps1`. Không cần đổi execution policy toàn máy. Các script cũng nhận `-JavaHome 'đường dẫn JDK'`. Sau khi tải đủ thư viện, dùng `Test.ps1 -Offline`.

Chạy trực tiếp với JAVA_HOME đã trỏ đúng JDK:

```powershell
mvn -B verify
& "$env:JAVA_HOME\bin\java.exe" -jar target\tass-cpsat-0.1.0.jar fixtures\greedy-trap.json output\my-first-run
```

Thư mục output phải chưa tồn tại để giữ kết quả trước. CLI trả mã 0 khi có nghiệm, kể cả DRAFT một phần; mã 2 cho input không hợp lệ; mã 3 khi không có candidate; mã 65 cho JSON sai; mã 73 nếu output đã tồn tại. Native crash là lỗi tiến trình, không được diễn giải là thiếu GV.

Mỗi lượt xuất:

- `input-snapshot.json`: toàn bộ input và cấu hình bất biến.
- `result.json`: assignment, lý do chưa gán, A/F/C/W/Q, kiểm tra tuần/năm, các chỉ số, status/objective/bound từng pha, hash snapshot và thông tin thời gian.
- `assignments.csv`, `loads.csv`: bảng kết quả kỹ thuật để đối chiếu PoC.

Đây là xuất dữ liệu của module. Chức năng phát hành **PDF Phương án đề xuất** theo UC-20 thuộc ứng dụng TASS và chưa được dựng trong module này; CLI không chuyển READY/EXPORTED.

## Fixture và hành vi dự kiến

| Fixture | Kết quả |
|---|---|
| `greedy-trap.json` | 2/2 nhu cầu: GV chỉ Toán nhận D1; GV linh hoạt nhận D2. Tránh bẫy tham lam |
| `shortage.json` | 1/2 nhu cầu, thiếu 1 tiết; DRAFT một phần, không ép gán quá tải |
| `component-consistency.json` | 1/2 thành phần; tổng năng lực hai GV đủ nhưng không được chia GV trong cùng lớp–môn–kỳ |
| `decimal-load.json` | 2/2; A=3.125, F=0.5, C=0.375, W=Q=4, scale=1000 |

Mọi fixture là dữ liệu giả. Người dùng đã chọn ngày 25/10/2026: một GV cho các thành phần cùng nhóm; coverage theo số thành phần; lệch tải tính theo W. Trọng số 1/1/0, giới hạn tải nhỏ và ngân sách 20s/8s/8s là giả định kỹ thuật của fixture, có nhãn. Các cấu hình khác được yêu cầu tường minh, không suy ra từ dữ liệu.

## Mô hình hiện thực

Pipeline: `InputValidator → ModelBuilder → AssignmentSolver (2 pha) → SolutionValidator → Result → AssignmentService/PlanStore`.

- Chỉ tạo x cho ứng viên đúng công tác, học kỳ, đơn vị, môn/cấp và hiệu lực; mỗi thành phần có x hoặc y chưa gán.
- Biến z giữ cùng GV cho mọi thành phần đã gán của nhóm. DRAFT có thể thiếu thành phần.
- Mỗi check cứng có `fixed + converted + Σ(coefficient × x) ≤ limit` riêng, cùng đơn vị/kỳ tính trong chính check đó. Không lấy `1.5Q` hoặc `35 tuần` làm mặc định.
- Q=max(0,B−R), A=Σh×x, W=F+A+C; under/over dùng max chính xác. Người nghỉ toàn kỳ không bị phạt thiếu tải.
- Pha 1 tối thiểu phần thiếu theo COMPONENTS, PERIODS hoặc COMPLETE_GROUPS. Pha 2 cố định mức phủ đã tìm và tối thiểu `α×Eload + β×S×Eexperience + γ×S×Echanges`.
- Nghiệm pha 1 được giữ khi pha 2 UNKNOWN/không chạy; pha 2 không nâng cờ chứng minh độ phủ của pha 1. Gap limits bằng 0; cờ proof còn kiểm tra objective với bound.
- Kiểm tra độc lập bằng BigDecimal trước khi trả và trước khi áp dụng. Lưu DRAFT dùng compare-and-set nguyên tử trên identity/revision/hash/token; có adapter trong bộ nhớ để chạy integration tests.

Các giới hạn cần đọc trước khi nối dữ liệu thật: [rà soát tài liệu](REVIEW.md), [hợp đồng và tích hợp](../../../../../algorithm/tass-cpsat/docs/CONTRACT.md), [truy vết kiểm thử](../../../../../algorithm/tass-cpsat/docs/TRACEABILITY.md). Đặc biệt, BR-16–21 cần kết quả có chứng cứ từ tầng quy tắc nghiệp vụ; module không có bộ máy suy diễn pháp luật hay từ điển 41 bảng.

Nguồn kỹ thuật: [OR-Tools Java/Maven](https://developers.google.com/optimization/install/java), [CP-SAT](https://developers.google.com/optimization/cp/cp_solver), [Java CpModel API](https://or-tools.github.io/docs/javadoc/com/google/ortools/sat/CpModel.html).
