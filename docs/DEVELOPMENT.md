# Java và cách chạy dự án

## Chuẩn chung

Ứng dụng và build dùng **JDK 17, Maven 3.9+**. Backend dùng Spring Boot 3.5.14; solver và các module đối chứng cùng biên dịch release17. Docker builder là Maven/Temurin17, runtime là JRE17. Mọi POM độc lập và parent thuật toán có Maven Enforcer 3.6.2 yêu cầu Java `[17,18)` từ phase validate.

Docker không sửa JAVA_HOME/PATH trên Windows. `java -version` hoặc `mvn -version` trong terminal ngoài container vẫn phản ánh môi trường của terminal đó. compiler release17 chỉ chọn API/bytecode đích, không chọn JVM đang chạy Maven. Quy tắc kiểm tra JDK dùng [RequireJavaVersion của Maven](https://maven.apache.org/enforcer-archives/enforcer-3.6.2/enforcer-rules/requireJavaVersion.html).

## Chạy Docker

Từ root repo: `./scripts/docker-dev.ps1 up`. Host không cần JDK/Maven để chạy stack. Cổng được đọc từ .env và in bởi helper; sửa cổng trong .env nếu trùng dịch vụ khác. Không dùng Java 23 của host để suy ra Java trong image. Xem [hướng dẫn dev/demo](../infra/README.md).

## Build/chạy trực tiếp trên Windows

```powershell
# Chỉ cần tải khi máy chưa có JDK 17 dùng được.
.\scripts\setup-java17.ps1

# Mỗi lệnh wrapper tự chọn17 và khôi phục môi trường caller khi kết thúc.
.\scripts\mvn17.ps1 -version
.\scripts\mvn17.ps1 verify

# Hoặc kích hoạt17 cho toàn terminal hiện tại.
. .\scripts\use-java17.ps1
java -version
mvn -version
```

Bộ chọn dùng: -JavaHome rõ ràng → JDK 17 local `.runtime/jdk-17` → JAVA_HOME hợp lệ17 → javac trên PATH nếu thuộc JDK 17. Truyền -JavaHome21/23 bị từ chối, không âm thầm dùng phiên bản đó. Helper không sửa registry hoặc môi trường toàn máy. Các script run/test thuật toán cùng dùng scripts/java17.ps1; Setup-Java cũ chỉ chuyển tiếp sang bộ cài17 chung.

```powershell
# Chỉ module solver:
.\scripts\mvn17.ps1 -f algorithm/tass-cpsat/pom.xml verify

# Toàn bộ module đối chứng, vẫn hỗ trợ cache offline khi đã tải đủ:
.\algorithm\tass-comparison\Test-All.ps1
.\algorithm\tass-comparison\Test-All.ps1 -Offline

# Nếu cần chỉ rõ Maven cache:
.\scripts\mvn17.ps1 '-Dmaven.repo.local=D:/my-cache/repository' verify
```

Một lần build đầu cần mạng tải plugin/dependencies. Thêm Enforcer là thêm build-time plugin; máy chỉ có cache cũ có thể cần tải plugin3.6.2 trước khi offline. Trong phiên agent, Maven Central bị từ chối kết nối và cache Surefire cũ chưa đầy đủ, nên không ghi rằng reactor verify đã đạt.

## VS Code

Mở đúng root DACN-code. Shared settings đặt JAVA_HOME/PATH của terminal Windows vào JDK 17 local; task **TASS: Maven verify (JDK 17)** gọi wrapper chung. Sau khi đổi settings hãy đóng terminal cũ và mở terminal mới.

Để IDE có runtime path chính xác theo máy, không commit đường dẫn D:/C: của một thành viên:

```powershell
.\scripts\configure-java17-workspace.ps1
code .runtime/tass-java17.code-workspace
```

Workspace sinh trong .runtime được ignore, map JavaSE-17 tới JDK đã xác minh và JAVA_HOME17 cho Maven terminal. Có thể truyền -JavaHome tới script nếu dùng JDK 17 cài riêng. Không đặt java.jdt.ls.java.home về17: Java language server của extension hiện có thể cần JRE21 riêng, trong khi project vẫn compile/run17. Đây là hai runtime khác nhau theo [tài liệu vscode-java](https://github.com/redhat-developer/vscode-java/wiki/JDK-Requirements).

Nếu chạy từ CMD/PowerShell ngoài workspace hoặc IDE khác, dùng helper hoặc tự chọn JDK 17 cho Maven runner/project SDK của IDE đó. Source repo không tự thay JAVA_HOME toàn máy hoặc các dự án khác.

## Phạm vi build và tài liệu

Root reactor gồm CP-SAT và backend. Reactor comparison gồm các module CP-SAT/common/Greedy/GA/benchmark và parent comparison. Không xóa module đối chứng khi làm gọn repo.

- [Backend/API và kiểm chứng](../backend/docs/README.md).
- [Mô hình solver hiện hành](../algorithm/tass-cpsat/docs/CURRENT_MODEL.md).
- [Benchmark09/11 đã xuất bản](../algorithm/tass-comparison/reports/20261109/README.md).
- [Backlog](BACKLOG.md) và [tài liệu lịch sử](history/README.md).
