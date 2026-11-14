# Dọn và chuẩn hóa repository — 14/11/2026

Thực hiện gói A+B+chuẩn hóa theo duyệt của người dùng. Không sửa thuật toán, Java nghiệp vụ, SQL/migration, nội dung báo cáo chính, UI demo, .env, JDK/cache hoặc database volume. Không commit/push tự động.

## Output đã bỏ

- backend/bin và các target của backend/CP-SAT/common/Greedy/GA/benchmark.
- Các output CLI tạo sinh, boot-run.log và file phụ report.aux/lof/out/toc.
- Log test tạm .runtime/solver-api-tests, backup POM originals/tass-cpsat-pom.before-comparison.xml.
- Placeholder .gitkeep trong backend/frontend/infra/docs-diagrams đã có nội dung; giữ .github/.gitkeep.

Đường dẫn tuyệt đối được xác minh nằm trong repo và không qua reparse point trước khi xóa đệ quy. Thư mục có postmaster.pid hoặc file backup DB sẽ bị chặn. Các JAR/classes cần build lại trước khi dùng CLI; output bị xóa không phải source.

## Tài liệu/kết quả được lưu

- [docs/history](history/README.md): kế hoạch, tiến độ, review, Alternate dictionary/ERD cũ và hồ sơ/evidence25/10. Các file có nhãn lịch sử; link được đổi theo vị trí mới.
- Bản nháp SRS/Alternate, mẫu báo cáo và raw benchmark25/10 lưu ngoài repo tại D:/HCMUT/DACN/archives/DACN-code-legacy-20261114/. Không xóa mất tư liệu đó.
- [reports/20261109](../algorithm/tass-comparison/reports/20261109/README.md): xuất bản183 file/~0,52MiB của benchmark năm bước đang được báo cáo trích dẫn; trước đây bị ignore trong results/.
- [summary175 test backend](../backend/docs/verification/20261114/summary.json) và test-summary.txt: trích số liệu từ log đã có, không ghi thành một lượt test mới. Không đưa database test/raw classpath log lên Git.

Các phần chưa làm được đưa vào [BACKLOG.md](BACKLOG.md), thay vì bị mất cùng kế hoạch cũ. Root README, backend/docs/README và README thuật toán là điểm vào hiện hành. Nguồn report.tex/PDF/ảnh và toàn bộ fixtures/shared-tests vẫn giữ.

## Java 17 trên toàn bộ đường chạy dự án

- Docker builder/runtime giữ17.
- scripts/java17.ps1 là bộ chọn chung; mọi wrapper run/test thuật toán và mvn17.ps1 dùng17, từ chối -JavaHome21/23.
- Root/backend/CP-SAT/comparison POM có Enforcer 3.6.2 yêu cầu Java `[17,18)` và Maven 3.9+. Common/Greedy/GA/benchmark kế thừa parent comparison đã có guard; compiler release vẫn17.
- VS Code có task Maven qua wrapper và terminal JAVA_HOME/PATH17. Workspace local sinh bởi configure-java17-workspace.ps1 map JavaSE-17 bằng đường dẫn thật của từng máy, không commit đường dẫn máy cá nhân.
- .editorconfig/.gitattributes thống nhất UTF-8/LF cho source text; HTML demo giữ nguyên byte bằng thuộc tính -text.
- JAVA_HOME Windows gốc đang là C:/Program Files/Java/jdk-23 lúc kiểm tra. Không sửa registry/toàn máy; Docker không tự đổi biến này. Terminal ngoài dự án cần helper hoặc tự chọn17. Java language server có JRE riêng, xem [DEVELOPMENT.md](DEVELOPMENT.md).

JDK 21 cũ và Maven cache được giữ local theo gói đã duyệt, nhưng không còn được wrapper tự chọn. Metadata JDK 21 trong hồ sơ09/11 mô tả môi trường đo lịch sử, không phải cấu hình hiện hành và không bị sửa thành17.

## Kiểm tra trong lượt này

- Resolver chọn17 khi JAVA_HOME của caller là23; explicit -JavaHome23 bị từ chối.
- mvn17.ps1 -version báo Maven 3.9.9 / Java 17.0.21 và khôi phục môi trường caller.
- CP-SAT, Greedy và GA chạy CLI thật bằng17 với report-five-stage.json; lần lượt OPTIMAL, FEASIBLE, FEASIBLE. Output smoke ở ngoài repo, không thay hồ sơ benchmark09/11.
- Các POM được parse/kiểm tra guard và quan hệ kế thừa; scripts qua parse; nội dung Docker COPY/fixture và liên kết Markdown được rà soát sau khi chuyển file.
- Không chạy lại175 test nghiệp vụ chỉ vì thay Markdown/script; hồ sơ đó thuộc mốc API trước cleanup. Maven validate/Enforcer chưa chạy trọn trong phiên này: Maven Central bị từ chối kết nối, cache hiện chưa có plugin mới. Không ghi là build/verify đã thành công.

Inventory/move plan/danh sách output đã bỏ và logs smoke ở D:/HCMUT/DACN/tmp/repo-cleanup-20261114/. Cấu trúc docs và đường dẫn mới đã sẵn sàng để người dùng review rồi stage trên terminal có quyền Git.
