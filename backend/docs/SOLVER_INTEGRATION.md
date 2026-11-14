# Tích hợp thư viện solver — SOL-01

Backend dùng `vn.edu.tass:tass-cpsat:0.1.0:core` trực tiếp trong JVM. POM tại gốc chỉ gom hai module vào reactor; backend vẫn kế thừa Spring Boot và solver giữ build CLI hiện có. Không cần module Greedy/GA cho bước tích hợp này.

## Build và chạy

Chuẩn của nhóm: **JDK 17, Spring Boot 3.5** (POM hiện dùng 3.5.14), Maven 3.9+ và truy cập Maven Central hoặc cache đủ dependency. Cả backend và solver nhắm bytecode Java 17. Đặt `JAVA_HOME` tới JDK 17 của máy trước khi build. Từ thư mục gốc `DACN-code`:

Có thể dùng JDK portable riêng dự án trên Windows, tương tự việc chọn interpreter trong virtual environment. Không dùng Python `.venv` cho Java. Từ thư mục gốc:

```powershell
.\scripts\setup-java17.ps1
. .\scripts\use-java17.ps1
java -version
mvn -version
```

Script setup tải Temurin JDK 17 Windows x64 từ Adoptium, kiểm tra SHA-256 và giải nén vào `.runtime/jdk-17` (đã được gitignore). Cần mạng ở bước tải; có thể giải nén JDK 17 ZIP thủ công vào cùng đường dẫn sao cho có `bin/java.exe` và `bin/javac.exe`. Script `use-java17.ps1` chỉ đổi JAVA_HOME/PATH của terminal hiện tại. Mở terminal mới thì kích hoạt lại; IDE cần chọn project JDK tại `.runtime/jdk-17` nếu muốn đồng bộ cả chạy/debug. Maven dependencies vẫn nằm trong local repository của Maven.

```powershell
mvn verify
```

Reactor build solver trước backend. Phải chạy ít nhất tới `package`: classifier `core` chỉ được tạo ở phase này. `mvn test` tại gốc trên máy mới chưa tạo được artifact `core`. `verify` chạy cả test thuật toán, test CLI hiện có và test backend; PostgreSQL integration vẫn bật riêng bằng `-Ddb.integration=true`.

Để chạy hoặc test backend riêng, cài thư viện trước:

```powershell
mvn -pl algorithm/tass-cpsat -am install -DskipTests
cd backend
mvn test
mvn spring-boot:run
```

`spring-boot:run` cần PostgreSQL theo README backend. Build CI dùng `mvn --batch-mode --no-transfer-progress verify` từ gốc. Sau khi sửa solver và test backend riêng, chạy lại bước install để tránh dùng artifact cũ.

## Bean và runtime

`SolverConfiguration` đăng ký singleton `AssignmentSolver`, `InputValidator` và `SolutionValidator`. Constructor solver gọi `Loader.loadNativeLibraries()`; lỗi nạp native làm Spring khởi động thất bại, trước khi nhận lượt chạy. `ortools-java:9.14.6206` kéo các JAR native tương ứng Windows/Linux/macOS qua dependency runtime; artifact `core` giữ nguyên dạng thư viện, không nhúng các bản Jackson của CLI.

Spring Boot quản lý Jackson cho backend. Mapper canonical `Json.MAPPER` của solver vẫn dùng để đọc/hash snapshot nội bộ; không thay bằng mapper JSON HTTP. Snapshot DB và `Contract.Snapshot` cần adapter riêng ở SOL-05.

Mỗi lượt giải phải tạo `new Cancellation()` và truyền vào `solver.solve(snapshot, cancellation)`. Không đăng ký token hủy thành singleton. Việc chuẩn bị snapshot, executor, transaction và áp dụng nghiệm sẽ nằm ở các bước sau; không có controller nhận snapshot do client gửi trong SOL-01.

## Fixture nghiệm thu

`SolverLibraryIntegrationTest` chạy Spring Boot với cấu hình solver và Jackson. Fixture lấy trực tiếp từ `algorithm/tass-cpsat/fixtures/report-five-stage.json` vào test classpath qua Maven resources, không sao chép thêm một bản trong source backend.

Hai test kiểm tra:

- Nạp bean và native thật, giải đủ `Z/L1/M/experience/change`, chứng minh từng bước, nhận vector `[0, 0, 0, 5, 2]` và gán `D1 → MATH-ONLY`, `D2 → FLEX`; hậu kiểm lại assignments, tải, hard checks, metrics, identity/hash và đọc/ghi DTO bằng Jackson do Boot quản lý.
- Hủy trước khi giải cho một lượt trả `CANCELLED`, không có nghiệm; lượt tiếp theo dùng cùng bean và token mới vẫn giải được.

Fixture có quy tắc minh họa và thiếu dữ liệu tải năm. Test kiểm tra cảnh báo và check `INSUFFICIENT_DATA` được giữ nguyên. Hiện solver tính `dataReadyForOpening` theo việc phủ hết nhu cầu, nên cờ này có thể là `true` dù thiếu dữ liệu năm. API nghiệp vụ phải kiểm tra readiness/validation và lifecycle riêng ở SOL-03/08; không dùng cờ này để tự cho phép mở phản hồi.

## Kiểm chứng ngày 11/11/2026

- Maven `validate` của reactor thành công.
- Biên dịch source solver, cấu hình Spring và test với `--release 17` trên JDK 21; chạy hai test bằng JUnit Jupiter Engine 5.12.2, Spring Boot 3.5.14, Jackson 2.21.2 và OR-Tools 9.14.6206 từ cache local. **2/2 test thành công**, gồm nghiệm fixture qua hậu kiểm, Jackson round trip và hủy riêng lượt chạy.
- `mvn verify` chưa hoàn tất: cache thiếu POM Surefire 3.5.2 và môi trường chặn kết nối Maven Central (`Permission denied: getsockopt`). Rà soát trước cũng ghi nhận thiếu Swagger/Surefire cho backend. Chưa xác nhận toàn bộ suite backend hoặc đóng gói executable Spring Boot JAR qua Maven; cần chạy lại lệnh CI khi có đủ dependency.
- Không chạy luồng PostgreSQL/DB → solver trong SOL-01. SOL-02 đã bổ sung [plan/current DRAFT](PLAN_API.md), SOL-03 có [readiness theo đợt](READINESS_API.md) và hồi quy 36 test qua JUnit Engine từ cache. Mốc tiếp theo là tính tải/rule checks và chuẩn hóa đầu vào solver.

**Cập nhật SOL-04:** runtime dự án đã có Temurin 17.0.21; 51/51 test đạt trên JDK 17, gồm fixture solver native, Spring/JPA/OpenAPI, plan/readiness và chuẩn bị tải. Xem [WORKLOAD_PREPARATION.md](WORKLOAD_PREPARATION.md). Maven verify vẫn bị chặn dependency plugin như ghi nhận ở trên.

**Cập nhật SOL-05:** [mapper và archive chuẩn hóa](SOLVER_SNAPSHOT.md) đã kiểm chứng DB → DTO → OR-Tools → hậu kiểm trong test; 65/65 test đạt trên JDK 17. Luồng API async và transaction áp dụng nghiệm chưa triển khai. Maven offline verify hiện dừng do dependency plugin Surefire trong cache chưa đầy đủ.

Log cục bộ: `D:/HCMUT/DACN/tmp/backend-audit-20261111/solver-focused-tests.log` và `solver-integration-verify.log`. Runner dự phòng nằm cùng thư mục, dùng JUnit engine thật và source hiện tại; đây không thay thế kết quả `mvn verify` của CI.
