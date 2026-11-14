# TASS CP-SAT

Thư viện và CLI Java 17 dùng OR-Tools 9.14.6206. Backend phụ thuộc artifact `vn.edu.tass:tass-cpsat:0.1.0:core`; CLI/shaded JAR phục vụ thử nghiệm, không được gọi bằng shell cho mỗi HTTP request.

## Hợp đồng hiện hành

- [CURRENT_MODEL.md](docs/CURRENT_MODEL.md): tối ưu tuần tự **Z → L1 → M → experience → change**, cân bằng T−B với T=A+F+C+R.
- [CONTRACT.md](docs/CONTRACT.md): tass-solver/2, precision/hiệu lực, identity, locks và proof.
- Mỗi thành phần được giao trọn cho một giáo viên hoặc để chưa gán. STANDARD/SPECIALIZED_TOPIC/ENRICHMENT cùng lớp–môn có thể cùng hoặc khác giáo viên. Khóa áp dụng theo demand, không ép chung người cho nhóm.
- Một khoảng hiệu lực đồng nhất. Không cộng các mức tiết tuần của nhiều khoảng thành một tải; không coi tối ưu từng khoảng là tối ưu chung học kỳ.
- Tải tuần/hard checks cần nguồn xác nhận; thiếu dữ liệu năm giữ cảnh báo. Đây không phải bộ máy tự suy diễn quy định pháp lý.

## Build và chạy trên Windows

Từ root DACN-code:

```powershell
.\scripts\setup-java17.ps1
.\scripts\mvn17.ps1 -f algorithm/tass-cpsat/pom.xml verify
.\algorithm\tass-cpsat\scripts\Run.ps1 -Fixture fixtures/report-five-stage.json
```

Từ module này, có thể dùng `scripts/Test.ps1` và `scripts/Run.ps1`. Mọi wrapper chọn JDK 17 từ helper chung, hỗ trợ -JavaHome17; không tự dùng JDK 21/23. Setup-Java.ps1 cũ chỉ chuyển tiếp tới bộ cài17 ở root. Xem [DEVELOPMENT.md](../../docs/DEVELOPMENT.md).

Artifact core/test-helpers được tạo ở phase package. Muốn cài core để backend build riêng: từ root chạy `scripts/mvn17.ps1 -pl algorithm/tass-cpsat -am install -DskipTests`. Root verify build CP-SAT+backend; [Test-All.ps1](../tass-comparison/Test-All.ps1) build/test toàn bộ thuật toán.

Chạy offline chỉ khi cache đã đủ, gồm plugin Enforcer 3.6.2 mới. Test.ps1 giữ cache .m2 của module; không commit cache/JDK/JAR. Native runtime dùng bản tương ứng OS/architecture; Docker dùng glibc và JRE17.

## Fixtures và output

`report-five-stage.json` là fixture v2 chính. Các fixture v1 như decimal-load giữ kiểm thử tương thích lịch sử; chúng không thay chính sách precision tối đa hai chữ số của v2/backend. component-consistency hiện cho phép khác giáo viên giữa các thành phần, không dùng mô tả ép chung giáo viên trong hồ sơ25/10.

CLI xuất input-snapshot.json, result.json, assignments.csv và loads.csv vào thư mục output mới. Output không được ghi đè; các lượt tạo sinh bị ignore. CLI không phát hành PDF hoặc tự chuyển phương án sang EXPORTED.

## Kiểm chứng

- [Hồ sơ09/11](docs/TEST-RESULTS-20261109.md), [summary/source hashes](docs/verification-20261109.json):209 lượt test module, không phải test API/PostgreSQL.
- [Benchmark45 lượt](../tass-comparison/reports/20261109/README.md).
- [Truy vết hiện hành](docs/TRACEABILITY.md).
- [Hồ sơ25/10 đã lưu trữ](../../docs/history/20261025/algorithm/tass-cpsat/TEST-RESULTS.md): chỉ đọc theo ngày/mô hình gốc.
- [API tích hợp backend và175 test](../../backend/docs/README.md).

Các kết quả lịch sử giữ nguyên JDK/phiên bản đã đo. Chuẩn chạy dự án hiện tại là17; không sửa metadata21 của benchmark cũ thành17.
