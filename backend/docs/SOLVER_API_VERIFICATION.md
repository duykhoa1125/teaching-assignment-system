# Kiểm chứng và bàn giao SOL-01 đến SOL-09 — 13/11/2026

## Bổ sung API sửa/khóa/mở khóa — 14/11/2026

Đã có [5 thao tác mới](ASSIGNMENT_MUTATION_API.md), migration 09 và OpenAPI 56 URL/118 tổ hợp method/URL. Không sửa UI demo hoặc triển khai workflow feedback. Phần còn lại của tài liệu giữ hồ sơ SOL-01–09 ở mốc trước.

**175/175 test backend đạt** sau thay đổi: 130 tích hợp/hồi quy/OpenAPI/H2, 1 đọc lại trong JVM mới, 23 backend cũ và 21 PostgreSQL CRUD/status. Trong đó PlanAssignmentPostgresTest thêm 18 ca HTTP/service/DB cho gán/bỏ gán, khóa/mở khóa từng dòng và toàn nhóm, hai giáo viên khác nhau, no-op, CAS, quyền, selector, hậu kiểm tải, rollback revision/audit, source stale/ineligible và chống lợi dụng unlock để đổi quyết định. Khóa tạo qua HTTP đi tiếp qua OR-Tools native/apply; sửa trong khi giải khiến kết quả cũ STALE. Các test coordinator được đóng context sau lớp để không giữ ownership sang lớp khác.

Chạy bằng JUnit Jupiter Engine thật, biên dịch release 17 trên Temurin17.0.21, PostgreSQL18 tạm và OR-Tools Windows. Migration 09 chạy lặp và cùng schema/seed mới, vẫn 48 bảng. Checkpoint xuất sau các fixture tạo dữ liệu rồi được đọc lại trong JVM riêng. Log tại D:/HCMUT/DACN/tmp/manual-assignments-20261114/; cluster test đã dừng, DB người dùng không bị sửa.

Đã thử lại Maven offline verify: vẫn thiếu class SurefireReportParameters của plugin3.5.2 trong cache. Vì vậy chưa xác nhận Maven reactor verify hoặc test profile Docker chạy trọn. Helper đã thêm bước export checkpoint riêng sau suite để không phụ thuộc thứ tự tạo fixture; PowerShell/POSIX scripts qua kiểm tra cú pháp. Không đổi dependency để né cache.

Phạm vi hiện tại: một khoảng hiệu lực đồng nhất, Java 17 / Spring Boot 3.5, rule evaluator MVP minh họa và trần T. SOL-10 nằm ngoài phạm vi theo yêu cầu của nhóm; dữ liệu nhiều giai đoạn được báo unsupported, không âm thầm bỏ nhu cầu hoặc gắn nhãn tối ưu toàn học kỳ.

## Luồng và fixture

Fixture PostgreSQL độc lập được tạo bởi RoundReadinessPostgresTest.fixture trong mỗi test: trường/học kỳ/manager/scope, một giáo viên đủ chuyên môn/công tác, B=17, F=C=R=0 có inventory xác nhận, kinh nghiệm 0 năm và một nhu cầu STANDARD 2 tiết trong 01/08–31/12/2026. ID sinh riêng; không dùng dữ liệu thật. [db-uniform-expected.json](../src/test/resources/solver-fixtures/db-uniform-expected.json) là oracle review được: vector [0,1500,1500,6,1], T=2, deltaT=-15, thiếu dữ liệu năm vẫn giữ cảnh báo.

SolverRunPostgresTest đi qua HTTP readiness → tạo DRAFT → POST run → poll → hậu kiểm/apply → assignments/workloads/optimization → POST/GET validation → readiness cho phép mở phản hồi. Browser không gửi snapshot hay precheck để thay adapter DB. Các bộ trước đó kiểm tra fixture report-five-stage và DB→DTO→native→SolutionValidator độc lập.

Các ca gồm partial/no candidate, khóa đúng/xung đột, no-op, nhiều dòng tăng revision thực, kinh nghiệm 0/UNKNOWN, precision/đơn vị/ngữ cảnh/nguồn thiếu, scope nhiều giai đoạn, auth 401/403, gửi trùng/đầy hàng chờ, cancel trước commit, sửa phương án/nguồn/current version khi đang solve, lỗi giữa batch, rollback audit, summary/checksum/immutability PostgreSQL. SOL-08 bổ sung lọc/phân trang, nhãn snapshot, stale validation, tải vượt trần, NA target, annual null và sealing báo cáo.

Sau JVM tích hợp, test xuất checkpoint gồm bốn response đọc đã lưu. PlanResultRestartPostgresTest chạy trong JVM mới, kết nối cùng DB tạm và so sánh lại assignments/workloads/optimization/validation. Không dùng state worker/cache trong bộ nhớ để khôi phục dữ liệu. Từ 14/11, helper xuất lại checkpoint bằng riêng ca `SolverRunPostgresTest#newCoordinatorRecoversInterruptedRunsAndRejectsSecondOwner` sau toàn bộ suite để các fixture tạo sau đó không làm thay đổi freshness trước lượt đọc lại.

## Chạy bằng Maven

Từ gốc repository, có JDK tại .runtime/jdk-17, Maven và PostgreSQL binaries:

```powershell
.\scripts\test-solver-api.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'
```

Script chỉ tạo cluster mới tại .runtime/solver-api-tests/<UUID>, bind loopback cổng trống, nạp schema/seed mới, chạy Maven verify với plan.integration=true, rồi chạy test đọc lại trong JVM mới. Sau đó tạo DB seed mới riêng để chạy PostgresCrudIntegrationTest cho 20 tài nguyên; bộ CRUD cũ giả định bản ghi mới xuất hiện trong trang danh sách đầu tiên, nên không dùng chung DB đã tích lũy fixture của solver. Script dừng PostgreSQL trong finally và giữ log/data để rà soát; không kết nối DB đang dùng hoặc tự áp migration cho DB đó. Có thể truyền -MavenRepository và -Offline khi cache đủ.

Khi đã có **DB dùng riêng cho test, có thể bỏ đi**, có thể chạy thủ công:

```powershell
. .\scripts\use-java17.ps1
mvn verify '-Dplan.integration=true' '-Dplan.test.url=jdbc:postgresql://127.0.0.1:55432/postgres' '-Dplan.test.user=tass_test' '-Dsolver.e2e.artifact=D:/path/in/workspace/checkpoint.json'
mvn -pl backend -am verify '-Dplan.integration=true' '-Dtest=SolverRunPostgresTest#newCoordinatorRecoversInterruptedRunsAndRejectsSecondOwner' '-Dsurefire.failIfNoSpecifiedTests=false' '-Dplan.test.url=jdbc:postgresql://127.0.0.1:55432/postgres' '-Dplan.test.user=tass_test' '-Dsolver.e2e.artifact=D:/path/in/workspace/checkpoint.json'
mvn -pl backend -am verify '-Dtest=PlanResultRestartPostgresTest' '-Dsurefire.failIfNoSpecifiedTests=false' '-Dplan.test.url=jdbc:postgresql://127.0.0.1:55432/postgres' '-Dplan.test.user=tass_test' '-Dsolver.replay.checkpoint=D:/path/in/workspace/checkpoint.json'
```

Không bật plan.integration trên DB thật: các test cố ý commit fixture để thử nhiều transaction. Các API ghi solver/validation cần đầy đủ migration 04–08 nếu dùng DB cũ; schema mới đã chứa chúng. Danh sách API hiện có là 51 URL, 113 tổ hợp method/URL trong OpenAPI.

## Giới hạn kiểm chứng môi trường

Maven offline verify được thử lại: plugin Surefire 3.5.2 còn thiếu class SurefireReportParameters trong cache dependency, chưa chạy được reactor verify toàn bộ. Không đổi version plugin/dependency để né lỗi. Script PowerShell đã kiểm tra cú pháp nhưng initdb trong môi trường agent bị lỗi tạo restricted token (87); chưa xác nhận script Maven chạy trọn tại đây. Đây khác với cluster PostgreSQL tạm đã khởi tạo sẵn dùng cho kiểm chứng JUnit trực tiếp.

Các suite được biên dịch toàn source bằng --release 17 và chạy JUnit Jupiter Engine thực, Spring Boot/Jackson/OR-Tools thực từ cache trên Temurin 17.0.21, PostgreSQL 18. Không dùng stub thay solver/DB; chỉ dùng gate có kiểm soát để thử cạnh tranh và Principal giả cho contract auth chưa được nhóm triển khai. Log/runner/checkpoint tại D:/HCMUT/DACN/tmp/plan-results-20261112/.

## Kết quả đã chạy

**156/156 test đạt** ngày 13/11/2026, qua bốn lượt JVM:

| Suite | Đạt | Log |
| --- | --- | --- |
| Solver/plan/readiness/workload/snapshot/apply/results và HTTP/OpenAPI/H2 | 111/111 | tests.log |
| Đọc lại bốn API trong JVM mới | 1/1 | restart-tests.log |
| CRUD controller có mock repository, schema entity, validation service, exception mapping hiện có | 23/23 | legacy-tests.log |
| CRUD thực PostgreSQL cho 20 tài nguyên và kiểm tra status contract | 21/21 | postgres-crud-tests.log |

Tất cả test backend hiện có được giữ; bộ tích hợp mới thêm 16 ca đọc kết quả/validation và một ca đọc sau restart so với mốc SOL-07. Các test Mockito cũ chạy với Byte Buddy agent có sẵn trong cache. Không thay dependency/plugin.

Migration 08 đã kiểm tra trên cluster tạm cũ, chạy lặp và cùng schema/seed mới; tổng 48 bảng. Guard current revision/token, report/result aggregate, append-only và lỗi giữa batch đã được kiểm chứng. Cluster tạm đã dừng sau các suite; git diff --check không báo lỗi whitespace. Dữ liệu và migration của DB người dùng chưa bị thay đổi.

Auth/login thật, API sửa tay/lock/unlock, phản hồi và PDF thuộc phần phối hợp khác. Không coi các ca Principal giả là kiểm chứng đăng nhập thực tế; các kiểm tra định danh/vai trò/phạm vi trong service đã được bao phủ.
