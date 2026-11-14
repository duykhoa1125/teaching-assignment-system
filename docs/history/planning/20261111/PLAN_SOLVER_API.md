> Archived historical document. Dates, test counts and decisions below describe its original milestone. Current status: [backend documentation](../../../../backend/docs/README.md).

# Rà soát backend và kế hoạch API thuật toán — 11/11/2026

## 1. Kết luận và phạm vi rà soát

**Cập nhật phạm vi 14/11/2026:** người dùng chốt phân công theo học kỳ + lớp + môn + thành phần; chính khóa/tăng cường được cùng hoặc khác giáo viên, mỗi thành phần một giáo viên cố định trong học kỳ. UI cần khóa riêng từng dòng hoặc khóa toàn nhóm lớp–môn, không ép cùng giáo viên. SOL-10 nhiều giai đoạn không cần cho phạm vi hiện tại; guard dữ liệu nhiều khoảng vẫn giữ. Review source, khoảng trống API/feedback và 9 kiểm tra bổ sung ở [COMPONENT_ASSIGNMENT_REVIEW.md](../../reviews/20261114/COMPONENT_ASSIGNMENT_REVIEW.md). Các nội dung bên dưới giữ lịch sử triển khai; không coi API sửa/khóa hoặc feedback là đã có.

**Bổ sung sau review, theo yêu cầu người dùng 14/11/2026:** đã triển khai API sửa/khóa/mở khóa theo dòng và atomic batch/toàn nhóm; dùng chung validator, CAS revision, quyền, audit và xử lý pure unlock khi source stale. Hợp đồng mới ở [ASSIGNMENT_MUTATION_API.md](../../../../backend/docs/ASSIGNMENT_MUTATION_API.md), migration 09 cho DB cũ. Bổ sung này thay thế nhận xét "API sửa/khóa chưa có" tại mốc review; không sửa UI demo hoặc nhận thêm workflow feedback/tăng nhu cầu, SOL-10 vẫn ngoài phạm vi.

**Khánh đã xây nền API dữ liệu đầu vào. Phần còn lại để chạy thuật toán qua web là luồng nghiệp vụ từ dữ liệu DB → snapshot tin cậy → solver → hậu kiểm → lưu phương án → trả kết quả cho UI.**

Checkout được rà soát là nhánh `dev`, HEAD và remote-tracking `origin/dev` cùng ở `322a4b3`. Reflog ghi nhận người dùng đã `git pull` fast-forward ngày 11/11/2026 từ `50406dc`; lần rà soát này không pull/merge thêm hoặc xác minh lại remote qua mạng.

Các thay đổi backend chính đã merge:

| PR/commit | Nội dung |
| --- | --- |
| PR #8, `76145b7` | Đồng bộ CRUD với schema mở rộng, sửa mapping và validation; thêm thành phần nhu cầu bắt buộc |
| PR #9, `bdecefa` | Mở rộng dữ liệu đầu vào, thêm định mức/lịch sử/nhiệm vụ; lọc, validation, Swagger và tài liệu API |
| PR #11, `322a4b3`; commit chức năng `254c2b8` | Chốt và kiểm tra trạng thái nhu cầu, công tác, chuyên môn; có SQL migration cho DB cũ |

Kế hoạch này cập nhật phần phân công công việc: **bạn nhận API thuật toán và xử lý thuật toán**. Các phần auth, CRUD, sửa tay/khóa, phản hồi và PDF cần chốt người phụ trách với Khánh, không mặc định tất cả đã có hoặc đều thuộc phần bạn. Tệp `PLAN_KHANH.md` cũ là kế hoạch tham khảo, không phải bằng chứng đã triển khai.

## 2. Khánh đã làm được đến đâu?

| Hạng mục | Đã thấy trong source | Phần còn lại |
| --- | --- | --- |
| Schema | PostgreSQL 48 bảng, trigger, snapshot, plan/version, validation và solver-run ở mức DDL | Dựng service/repository/API nghiệp vụ cho các bảng kết quả; kiểm chứng giao dịch thật |
| CRUD | **20 tài nguyên**, mỗi tài nguyên có controller/service/repository/entity/request/DTO/mapper; 40 URL và 100 tổ hợp method/URL | Không cần làm lại CRUD đầu vào |
| Đồng bộ schema | TeachingDemand có hiệu lực và unit; TeachingExperience có trạng thái/số năm/mốc tính; xác nhận tập thành phần và source token đã được bổ sung | Rule service và adapter đọc đủ ngữ cảnh để tạo snapshot solver |
| Bốn tài nguyên bổ sung so với nền 16 tài nguyên | `required-demand-components`, `teacher-workload-bases`, `teaching-histories`, `teacher-duties` | Không đồng nghĩa đã có hồ sơ giáo viên tổng hợp hoặc bộ tính tải đầy đủ |
| Danh sách/bộ lọc | `limit/offset`, bộ lọc ngữ cảnh, tìm tên; `as_of` trên các tài nguyên có ngày hiệu lực | Danh sách đang trả mảng, chưa có `total`; bộ lọc một ngày chưa chứng minh hiệu lực phủ toàn khoảng solver |
| Validation/lỗi | Độ chính xác số tiết, ngày, cặp xác nhận, trạng thái; lỗi 400/404/409/422 và mã ổn định | Lỗi nghiệp vụ run/version/lock/stale/queue cần bổ sung |
| Swagger/OpenAPI | `/swagger-ui.html`, `/v3/api-docs`, `/v3/api-docs.yaml`; schema và ví dụ | Thêm đặc tả API nghiệp vụ mới theo implementation |
| Trạng thái | API, DB CHECK, filter và tài liệu đã đồng bộ ba trường đã hỏi | Adapter solver phải dùng tập giá trị thực tế ở bên dưới |
| Test | Có test CRUD, filter, validation, OpenAPI trên H2 và test HTTP PostgreSQL tùy chọn cho 20 tài nguyên | Chưa có test luồng solver thật qua Spring Boot/PostgreSQL |
| Auth | README và API.md xác nhận chưa có xác thực/phân quyền | Gắn actor và phạm vi trường từ người dùng đã xác thực trước khi phát hành luồng ghi kết quả |
| Tích hợp thuật toán | Module solver đã có riêng trong `algorithm/` | `backend/pom.xml` chưa phụ thuộc solver/OR-Tools; chưa có bean gọi solver, adapter DB hoặc executor |

**Đối chiếu chín mục trong tin nhắn của Khánh:** mục 1 đã có phần lớn nền API đầu vào như bảng trên; mục 2 (hồ sơ tổng hợp), mục 3 (readiness), mục 4–8 (phương án, phân công, sửa, khóa, tải/validation), mục 9 (solver-run) đều chưa có endpoint nghiệp vụ trong checkout này. Chính [API.md](../../../../backend/docs/API.md) cũng ghi rõ giới hạn đó.

### Trạng thái thực tế đã merge, không dùng lại danh sách đề xuất cũ

| Trường | Tập giá trị hiện hành |
| --- | --- |
| `teaching_demand.status` | `ACTIVE`, `INACTIVE` |
| `teacher_employment.employment_status` | `TEACHING`, `ON_LEAVE`, `INACTIVE` |
| `teaching_qualification.verification_status` | `PENDING`, `VERIFIED`, `INACTIVE` |
| `teaching_history` / `teacher_workload_basis.verification_status` | `PENDING`, `VERIFIED`, `REJECTED` |

`REJECTED` không hợp lệ với **teaching_qualification** trong hợp đồng mới. Cần phân biệt các trường cùng tên nhưng khác tập giá trị. DB đã tồn tại cần chạy [03_status_contract_migration.sql](../../../../backend/sql/03_status_contract_migration.sql) sau khi kiểm tra dữ liệu; Docker Compose chỉ nạp schema/seed khi volume mới, không tự chạy migration này trên volume cũ.

## 3. Phần thuật toán có thể dùng lại

- CP-SAT đã có tối ưu tuần tự `(Z, L1, M, experience, change)`, tiền kiểm, hậu kiểm, khóa phân công, fallback và metadata chứng minh từng bước.
- Greedy và GA đã có cùng hợp đồng/bộ đánh giá, phục vụ đối chứng. API sản phẩm đầu tiên ưu tiên CP-SAT; mở lựa chọn thuật toán trên UI là phần bổ sung nếu có nhu cầu.
- `ExperienceScoring` chuyển hồ sơ số năm theo môn/khối thành điểm phạt theo policy.
- `AssignmentService.apply` và `PlanStore` là điểm nối cho việc áp dụng nghiệm; `InMemoryPlanStore` chỉ là adapter tham chiếu để test. Phải có adapter PostgreSQL nếu dùng service này trong backend.
- POM solver có artifact `vn.edu.tass:tass-cpsat:0.1.0:core`, có thể dùng làm thư viện thay vì gọi CLI/JAR bằng shell.
- Solver hiện nhận **một khoảng hiệu lực đồng nhất**. Nó chưa tối ưu đồng thời nhiều giai đoạn trong học kỳ. Seed DB có nhu cầu nhiều giai đoạn, nên không đưa nguyên seed vào solver rồi kỳ vọng chạy được.

Hồ sơ 209 lượt test và 45 lượt so sánh ngày 09/11 thuộc module thuật toán; chúng không xác nhận API tích hợp hay giao dịch PostgreSQL đã hoạt động.

## 4. Phân công đề xuất và phụ thuộc cần chốt

| Phần việc | Chủ trì đề xuất | Giao diện phối hợp |
| --- | --- | --- |
| CRUD, dữ liệu nguồn, chỉnh hợp đồng/mapping đầu vào | Khánh | Cung cấp nguồn đủ hiệu lực, trạng thái và chứng cứ để builder đọc |
| Auth, tài khoản, RBAC, phạm vi trường | Khánh hoặc người được nhóm phân công | Cung cấp principal/actor; service thuật toán kiểm tra quyền trước tạo/xem/hủy run |
| Readiness cho solver, chuẩn hóa dữ liệu, snapshot adapter | Bạn | Dùng repository/service/SQL đã có, bổ sung nguồn còn thiếu cùng Khánh |
| Điều phối run, CP-SAT, hậu kiểm, apply, metadata và kết quả | Bạn | Cần current DRAFT/revision/snapshot và giao dịch ghi phân công |
| Plan/version cơ bản | Chốt ngay; bạn có thể nhận phần tối thiểu để mở luồng solver | Một current version cho plan, trạng thái DRAFT, refresh snapshot và CAS |
| Sửa tay, khóa/mở khóa, workload/validation | Chốt ngay với Khánh | Cùng dùng bộ kiểm tra, cơ chế revision và khóa giao dịch với apply solver |
| Phản hồi, xuất PDF | Chốt riêng sau mốc tích hợp đầu tiên | Đọc kết quả đã lưu và dùng kiểm tra freshness/lifecycle |

Không làm lại API CRUD hoặc tự mở CRUD tùy ý cho snapshot, run, validation/audit. Các bản ghi này được tạo qua nghiệp vụ máy chủ. Hồ sơ GV tổng hợp phục vụ UI có thể làm song song; builder solver không cần gọi vòng qua HTTP để đọc các CRUD API.

## 5. Checklist công việc của bạn

### SOL-01 — Đưa thư viện solver vào backend [P0]

- [x] Chọn build Maven tái lập: cài/publish artifact `core` hoặc đưa các module cần thiết vào reactor phù hợp; ghi rõ lệnh build của nhóm/CI.
- [x] Thêm dependency solver và native runtime OR-Tools cần thiết cho môi trường chạy; kiểm tra tương thích Java 17+ và Jackson với Spring Boot.
- [x] Khởi tạo solver bean/nạp native một lần; mỗi run có cancellation token riêng. Không gọi `Main` hoặc shell để chạy một JAR cho từng request.
- [x] Giữ controller mỏng; tách phần chuẩn bị dữ liệu, điều phối, áp dụng và response mapper. SOL-01 chỉ thêm cấu hình hạ tầng; các lớp nghiệp vụ triển khai ở các bước sau.

**Nghiệm thu:** một test tích hợp Spring gọi thư viện bằng fixture `report-five-stage.json` và nhận kết quả qua validator. Đây là kiểm tra nối thư viện, chưa phải mốc DB.

**Cập nhật triển khai 11/11/2026:** đã thêm reactor solver/backend, dependency `core`, `SolverConfiguration` và hai test tích hợp. Hai test chạy thành công bằng JUnit Jupiter Engine từ cache local với Spring Boot/Jackson/native OR-Tools thật; Maven `validate` thành công. `mvn verify` còn chặn bởi thiếu dependency và không truy cập được Maven Central, chưa xác nhận toàn bộ suite/đóng gói. Chi tiết, lệnh build và log ở [SOLVER_INTEGRATION.md](../../../../backend/docs/SOLVER_INTEGRATION.md).

### SOL-02 — Dựng phần plan/version tối thiểu cho lượt giải [P0, phối hợp]

**Đã chốt với người dùng:** bạn nhận luôn phần plan/current DRAFT/revision/refresh snapshot tối thiểu; thực hiện sau mốc SOL-01, theo từng PR.

- [x] Bổ sung SQL persistence/service cho `assignment_plan`, `plan_version`, `plan_demand`, `input_snapshot` và cấu hình/quy tắc cần đọc. Persistence lượt chạy `solver_run` triển khai cùng điều phối SOL-06; không mở 48 CRUD.
- [x] Tạo một plan cho mỗi round, tạo version DRAFT và trỏ current version theo đúng thứ tự khóa ngoại. Tạo trùng phải xử lý xung đột.
- [x] Đọc được current version, revision, snapshot và source token. Phiên bản lịch sử giữ chỉ đọc.
- [x] Chốt transaction refresh snapshot của DRAFT; trả revision thực sau refresh để dùng làm `base_revision_no` khi nối lượt chạy.

**Nghiệm thu:** API tạo/đọc được current DRAFT trên PostgreSQL, đáp ứng trigger; có dữ liệu phân công ban đầu hợp lệ theo schema khi cần.

**Cập nhật triển khai 11/11/2026:** thêm 4 thao tác create/read current/read version/refresh snapshot; snapshot nguồn có cờ chưa chuẩn hóa, không gọi helper demo hoặc đưa thẳng vào solver. Refresh giữ khóa, đối soát nhu cầu và trả revision từ trigger. **11/11 test đạt** trên cluster PostgreSQL 18 tạm qua Spring Boot/MockMvc/JUnit Engine, gồm đồng thời và rollback. Hợp đồng/giới hạn kiểm chứng ở [PLAN_API.md](../../../../backend/docs/PLAN_API.md). Auth chưa được team chốt: giữ `PlanActorResolver` riêng, adapter `login_name` tạm; không tự cấp principal cho HTTP ẩn danh. Đã xác nhận nhóm dự định cấp tài khoản rồi đổi mật khẩu; kiểu principal và luồng xác thực vẫn cần nối sau.

### SOL-03 — Kiểm tra sẵn sàng chạy theo đợt [P0]

- [x] Dựng `GET /api/assignment-rounds/{id}/readiness` từ các view `v_tass_preparation_issues`, `v_tass_required_coverage` và kiểm tra ở service.
- [x] Kiểm tra trường/học kỳ/phạm vi; xác nhận lớp–môn; tập thành phần bắt buộc; nhu cầu ACTIVE và chính xác số tiết; công tác, năng lực, cấu hình và nguồn dữ liệu cần thiết. Bộ tính/rule validation đầy đủ tiếp tục SOL-04/05, không giả PASS tại tiền kiểm.
- [x] Tách `can_run_solver` khỏi `can_open_feedback`/`can_export`: đủ dữ liệu nhưng thiếu ứng viên vẫn có thể giải ra DRAFT một phần. Thiếu thành phần bắt buộc hoặc trạng thái chưa xác định phải được báo.
- [x] Trả danh sách lỗi/cảnh báo có mã, đối tượng và gợi ý bổ sung. Thiếu dữ liệu tuần chặn; thiếu riêng năm giữ cảnh báo theo thiết kế.
- [x] Phát hiện nhiều giai đoạn hoặc công tác nghỉ một phần chưa được solver hỗ trợ, trả lý do rõ ràng.
- [x] SOL-06: POST run gọi lại `RoundReadinessService.check` trong transaction chuẩn bị giữ khóa, qua SolverInputPreparation; không tin kết quả GET trước đó.

**Nghiệm thu:** phân biệt được dữ liệu thiếu, thiếu nguồn lực và phạm vi chưa hỗ trợ; không tự thêm giá trị 0 hoặc bỏ nhu cầu để cho phép chạy.

**Cập nhật triển khai 11/11/2026:** tiền kiểm read-only REPEATABLE_READ, cặp ID cấu hình tùy chọn/fallback current snapshot, source token và coverage; trả `preflight_only=true`, `solver_input_validated=false`. **36/36 test đạt** (14 readiness, 11 plan, 2 solver, 6 HTTP/OpenAPI đầu vào, 3 Spring/JPA), biên dịch toàn bộ source với `--release 17`. Chuẩn nhóm đã chốt JDK 17 / Spring Boot 3.5 (hiện 3.5.14); runtime kiểm thử sẵn có là JDK 21, chưa kiểm chứng chạy trực tiếp trên JDK 17 hoặc Maven verify toàn bộ. Chi tiết ở [READINESS_API.md](../../../../backend/docs/READINESS_API.md).

### SOL-04 — Tính đầu vào nghiệp vụ và bộ kiểm tra dùng chung [P0]

- [x] Tính B/F/C/R, `targetApplicable`, điều kiện công tác/chuyên môn phủ **toàn khoảng** nhu cầu; không chỉ lọc `as_of` tại một ngày.
- [x] Đọc nguồn thiếu từ snapshot DB bất biến: reduction, converted_activity, calculation_period, period_workload, cấu hình/quy tắc; không dựng thêm CRUD tùy ý. Thêm metadata inventory có xác nhận để phân biệt tập khoản rỗng đã xác nhận với dữ liệu thiếu.
- [x] Dùng `ExperienceScoring` với hồ sơ đúng teacher–subject–grade và mốc ngày; phân biệt UNKNOWN với 0; không dùng DRAFT hoặc số lớp làm số năm kinh nghiệm.
- [x] Xây weekly HardCheck/coefficients đầy đủ, annual INSUFFICIENT_DATA và precheck có căn cứ trong evaluator minh họa MVP. Không tự đánh giá PASS cho rule handler sản xuất/quỹ chưa hiện thực.
- [x] Có `WorkloadMath` và `DbWorkloadPreparer` dùng chung cho các luồng tiếp theo.
- [x] SOL-05/06/08: bộ chuẩn bị/kiểm tra đã nối vào snapshot DTO, hậu kiểm nghiệm, API workload và validation; hợp đồng cho người làm sửa tay/lock ghi trong PLAN_RESULTS_API.md, phần sửa tay không nhận thêm trong phạm vi này.

**Nghiệm thu:** kiểm thử độc lập tải và điều kiện ứng viên trên dữ liệu có nguồn; khoản cố định/khóa/nhiệm vụ không bị tính trùng.

**Cập nhật triển khai 11/11/2026:** nhóm đã chọn trần minh họa theo **T=A+F+C+R**; lưu basis T trong cấu hình, weekly fixed=F+R và converted=C. Schema vẫn 48 bảng, thêm input_confirmation_json/actor/time vào teacher_period_workload; DB cũ phải áp migration 04, không backfill xác nhận hoặc 0. **51/51 test đạt trực tiếp trên Temurin 17.0.21**, gồm 15 ca tải mới; đã thử migration DB cũ, schema/seed mới và constraint inventory. Maven verify vẫn chặn tải POM plugin. Chi tiết hợp đồng/phạm vi MVP và các việc phối hợp nguồn ở [WORKLOAD_PREPARATION.md](../../../../backend/docs/WORKLOAD_PREPARATION.md).

### SOL-05 — Tạo snapshot tin cậy và adapter `tass-solver/2` [P0]

- [x] Chuẩn bị nhất quán phía máy chủ dưới khóa plan/version/round, gắn revision thực và snapshot/token/rule/config; gọi lại readiness, không nhận snapshot/precheck từ browser.
- [x] Dùng snapshot DB hợp đồng hiện hành và mapper tường minh sang `Contract.Snapshot`; không gọi helper demo để thay bộ chuẩn bị tin cậy. Phạm vi rule evaluator vẫn minh họa MVP đã ghi ở SOL-04.
- [x] Lưu canonical TEXT, JSONB, schema version và SHA-256 trong solver_run PREPARED, liên kết snapshot DB bất biến; có migration 05/CHECK/trigger. Schema vẫn 48 bảng.
- [x] Đọc previous assignments/locks từ plan_demand của current DRAFT đang khóa, không dùng bản sao cũ trong snapshot nguồn hoặc plan/round khác.
- [x] Chạy `InputValidator` sau mapping trước archive/executor; lỗi không tạo run. Có replay xác minh hash và freshness guard để SOL-07 dùng trong outer apply transaction.

**Nghiệm thu:** cùng dữ liệu/config/identity cho cùng hash canonical; source token thay đổi làm lượt giải cũ không thể áp dụng; snapshot có thể đối soát và tái lập đầu vào.

**Cập nhật triển khai 12/11/2026:** `SolverInputPreparation`, `SolverSnapshotMapper` và archive trên solver_run đã kiểm chứng DB → DTO → native solver → hậu kiểm trong test. **65/65 test đạt trên Temurin 17.0.21**, gồm 14 ca snapshot mới: hash/order/decimal, grade_code, lock hiện tại, stale source/revision/current version, DB identity/hash/immutability và insert muộn. Migration 05 đã thử trên DB tạm cũ và schema/seed mới, chưa áp DB người dùng. Native solve chỉ được gọi ngoài transaction trong test; chưa có async API hoặc apply nghiệm. Maven offline verify vẫn lỗi dependency plugin Surefire. Chi tiết ở [SOLVER_SNAPSHOT.md](../../../../backend/docs/SOLVER_SNAPSHOT.md).

### SOL-06 — API chạy bất đồng bộ, xem trạng thái và hủy [P0]

- [x] `POST /api/plan-versions/{id}/solver-runs`: nhận expected revision và định danh cấu hình đã xác nhận; kiểm tra current DRAFT, quyền/phạm vi, readiness; trả `202` và run ID.
- [x] `GET /api/solver-runs/{id}`: trả trạng thái tác vụ, solver status, nguyên nhân dừng, metadata năm bước và apply outcome tách riêng.
- [x] `POST /api/solver-runs/{id}/cancel`: kiểm tra quyền, hủy đúng run; CAS xét cancel trước commit lưu kết quả; hủy terminal trả nguyên trạng. Kiểm tra cancellation trong commit áp phân công vẫn thuộc SOL-07.
- [x] Dùng executor và hàng chờ có giới hạn trong monolith; xử lý chạy trùng trên cùng DRAFT, hàng chờ đầy và lỗi native. OpenAPI mô tả 409 kèm Location lượt đang hoạt động, 503 khi đầy; không replay ngầm.
- [x] Lưu trạng thái bền vững; bộ điều phối mới đánh dấu FAILED/SERVICE_RESTARTED các lượt QUEUED/RUNNING/CANCEL_REQUESTED. Session advisory lock ngăn hai backend cùng điều phối DB.
- [x] Tách transaction chuẩn bị, solve ngoài transaction ghi và transaction lưu result ngắn; đo chuẩn bị/giải/lưu riêng. Transaction áp phân công triển khai ở SOL-07; các số đo không phải thời gian toàn HTTP.

**Nghiệm thu:** POST không giữ request chờ hết quá trình giải; poll thấy trạng thái thật; có cancel, lỗi và dọn trạng thái sau restart.

**Cập nhật 12/11/2026:** SOL-06 có API async/poll/cancel, result archive, summary 5 bước, executor giới hạn và recovery/ownership. Chưa áp nghiệm; apply_outcome=NOT_APPLIED. Hợp đồng và vận hành/migration 06 ở [SOLVER_RUN_API.md](../../../../backend/docs/SOLVER_RUN_API.md). **79/79 test đạt** qua JUnit Engine trên JDK 17/PostgreSQL/OR-Tools thật, gồm 14 test điều phối và 65 test hồi quy. Migration chỉ kiểm tra trên DB tạm; Maven verify vẫn chưa được xác nhận do cache Surefire thiếu dependency.

### SOL-07 — Hậu kiểm và áp dụng nghiệm bằng giao dịch PostgreSQL [P0]

- [x] `SolverResultApplier` tương đương PlanStore bền vững: tái dùng AssignmentService để kiểm tra identity/hash/assignment, tính lại tải/checks/metrics bằng SolutionValidator; không dùng InMemoryPlanStore.
- [x] Chỉ coi FEASIBLE/OPTIMAL hợp lệ là candidate. UNKNOWN, ERROR, CANCELLED hoặc không có candidate giữ phương án đã lưu.
- [x] Trong cùng transaction, khóa plan/version/round/run/assignments và kiểm tra current DRAFT, revision, snapshot/rule/config, token sống, actor và cancellation. Writer khác phải dùng cùng thứ tự khóa/CAS.
- [x] Ghi nguyên tử phân công/lý do chưa gán cùng metadata run/audit; giữ id/khóa/metadata, lỗi bất kỳ rollback toàn bộ; không xóa/chèn lại.
- [x] Lưu metadata SolverRun, kết quả áp dụng và applied_revision_no thực tế. Kết quả về muộn trả STALE/NOT_DRAFT, không ghi đè.
- [x] Dùng revision do trigger tăng theo dòng đổi, không cộng trong Java. No-op giữ revision; migration 07 cho phép applied_revision_no bằng base_revision.
- [x] Audit dùng tass.actor_id transaction-local từ requested_by được xác thực khi tạo run; kiểm tra lại quyền lúc apply, không nhận actor từ browser.

**Nghiệm thu:** sửa tay/đổi nguồn/đổi version khi solver đang chạy khiến kết quả cũ bị từ chối; không ghi một phần; không đổi trạng thái DRAFT sang trạng thái phát hành chỉ vì solver thành công.

**Cập nhật 12/11/2026:** SOL-07 đã nối hậu kiểm và transaction apply vào worker, giữ khóa/id, audit actor tin cậy, CAS cancel và revision thực; no-op không tăng giả. **95/95 test đạt** trên JDK 17/PostgreSQL/OR-Tools thật, gồm 16 ca apply mới và 79 ca hồi quy đã cập nhật. Migration 07 chỉ áp trên DB tạm; Maven verify toàn bộ vẫn chưa xác nhận. Xem [SOLVER_APPLY.md](../../../../backend/docs/SOLVER_APPLY.md).

### SOL-08 — API đọc kết quả, tải và validation [P0/P1 phối hợp]

- [x] GET assignments theo version, lọc teacher/class/type/lock/unassigned/ngày, phân trang có total; trả số tiết, hiệu lực, khóa/lý do và nhãn từ snapshot phù hợp.
- [x] GET workloads tính lại B/F/A/C/R/W/T/delta_t, thiếu/vượt và target applicability; annual thiếu giữ null/cảnh báo, nguồn tuần thiếu trả 422.
- [x] GET optimization trả vector/proof, warnings/time/config đúng run; matches_version ngăn gắn proof lịch sử cho phương án đã sửa, latest_run_id vẫn chỉ lượt thử mới nhất.
- [x] POST/GET validation lưu report/workloads/results nguyên tử, gắn revision/snapshot/token/actor; source hoặc phương án đổi làm fresh=false, báo cáo cũ không bị sửa.
- [x] Ghi DTO và hợp đồng validator/CAS/thứ tự khóa cho phần sửa tay/lock tại PLAN_RESULTS_API.md. Không nhận thêm API sửa tay/lock/unlock trong phạm vi SOL-08/09.

**Nghiệm thu:** UI có thể xem phương án/tải đã lưu sau POST run; đọc lại sau restart vẫn đúng; không lấy toàn snapshot của mọi giáo viên trả cho cổng Teacher.

**Cập nhật 13/11/2026:** đã có đủ 5 thao tác trên 4 URL, bảo vệ quyền người quản lý, snapshot labels và validation bất biến; migration 08 chỉ kiểm tra trên DB tạm. Có test HTTP xuyên suốt và JVM mới đọc lại bốn response từ checkpoint. Hợp đồng tại [PLAN_RESULTS_API.md](../../../../backend/docs/PLAN_RESULTS_API.md).

### SOL-09 — Kiểm thử luồng tích hợp và cập nhật OpenAPI [P0]

- [x] Fixture DB riêng một khoảng đồng nhất và db-uniform-expected.json đối chiếu objective/tải; không nhận JSON fixture từ browser thay adapter.
- [x] HTTP DB → readiness → tạo DRAFT → POST run → poll → hậu kiểm/apply → đọc assignments/workloads/optimization → POST/GET validation; JVM mới đọc lại checkpoint.
- [x] Bao phủ partial/no candidate, khóa đúng/xung đột, kinh nghiệm 0/UNKNOWN, precision/đơn vị/ngữ cảnh, dữ liệu thiếu; nhiều giai đoạn vẫn báo unsupported.
- [x] Ca song song/gửi trùng, sửa tay/source/current, cancel trước commit, hai completion và lỗi giữa batch; xác nhận rollback revision/audit và stale handling.
- [x] Kiểm chứng summary/checksum/immutability, JSONB, snapshot/revision và validation report guards trên PostgreSQL 18 thật, không dùng H2 thay các cơ chế này.
- [x] Test Principal giả có kiểm soát cho 401/403/account/scope, giữ test CRUD. BackendContextTest kiểm tra sự hiện diện của các bean bắt buộc thay vì cố định tổng controller/service. Đăng nhập thật vẫn chờ phần auth của nhóm, không ghi là đã kiểm chứng.
- [x] OpenAPI/API.md/README và tài liệu endpoint/lỗi/fixture/lệnh chạy đã cập nhật; Maven verify toàn bộ còn giới hạn cache/plugin, ghi rõ trong SOLVER_API_VERIFICATION.md.

**Nghiệm thu:** các kiểm thử tích hợp quan trọng chạy được ở môi trường tái lập; có log và dữ liệu đầu vào/kết quả để demo.

**Cập nhật 13/11/2026:** hoàn tất phần triển khai và kiểm chứng SOL-08/09 trong phạm vi một khoảng hiệu lực. Có fixture/oracle, source test, checkpoint, log và script DB tạm. Maven offline verify vẫn lỗi thiếu SurefireReportParameters; script initdb chưa chạy trọn trong restricted-token environment. Xem [SOLVER_API_VERIFICATION.md](../../../../backend/docs/SOLVER_API_VERIFICATION.md), không coi JUnit trực tiếp là Maven reactor verify đã đạt.

**Kết quả cuối: 156/156 test đạt** qua JUnit Engine: 111 tích hợp/hồi quy, 1 JVM mới đọc lại bốn API, 23 backend cũ và 21 PostgreSQL CRUD/status trên DB seed riêng. Migration 08 chạy lặp/schema mới vẫn 48 bảng; DB tạm đã dừng. Không sửa DB người dùng.

### SOL-10 — Mở rộng tối ưu nhiều giai đoạn [P1, cần cho dữ liệu học kỳ tổng quát]

**Ngoài phạm vi theo yêu cầu người dùng ngày 13/11/2026: dừng sau SOL-09, không triển khai SOL-10.**

- [ ] Thống nhất cách chia giai đoạn theo hiệu lực nhu cầu, công tác, định mức/nhiệm vụ/chuyên môn.
- [ ] Chốt cách tổng hợp L1/M và đếm thay đổi qua nhiều giai đoạn; cập nhật version hợp đồng, model, validator và adapter cùng nhau.
- [ ] Thêm oracle bài toán nhỏ và benchmark đủ/thiếu giáo viên, thay đổi tải/nghỉ giữa kỳ.

**Nghiệm thu:** giải được trường hợp nhiều giai đoạn bằng mô hình đã được xác định rõ. Trước mốc này, hệ thống phải báo giới hạn; tối ưu từng đoạn riêng không được gắn nhãn “tối ưu toàn học kỳ”.

## 6. Các chỗ nối dễ sai cần xử lý sớm

| Điểm nối | Quy tắc cần giữ |
| --- | --- |
| Snapshot DB và DTO solver | DB yêu cầu `schema_version`, `round`, `optimization_config` và nhiều mảng nguồn; DTO solver có `schemaVersion`, `identity`, `teachers`... Hai bên không cùng cấu trúc dù đều dùng phiên bản 2. Không đổi JSON naming strategy chung của backend để ép chúng giống nhau. |
| Hash | DB trigger xác minh MD5 của `payload_json::TEXT`; solver dùng SHA-256 canonical của `Contract.Snapshot`. Lưu và so đúng từng loại; không lấy hash này đối chiếu với hash kia. |
| Đơn vị | DB `PERIOD_PER_WEEK` → solver `PERIODS_PER_WEEK`; số liệu dùng BigDecimal, kiểm tra chính xác trước quy đổi scale. |
| Trạng thái công tác | `TEACHING` → `ACTIVE` nếu đủ toàn khoảng. `ON_LEAVE` chỉ map `FULL_TERM_LEAVE` khi thật sự nghỉ toàn khoảng hợp đồng hỗ trợ. `INACTIVE` không tự đổi thành nghỉ phép; xác định cách loại/biểu diễn qua adapter và validation. |
| Mã khối | Solver dùng gradeId để chọn trọng số `9`/`12`; cần map từ `grade_code`, không vô tình gửi PK của bảng grade làm mã khối. |
| Cấp học và ID | Chọn hệ mã nhất quán giữa scope và qualification; map string ID ↔ BIGINT tường minh khi đọc/ghi. |
| Kinh nghiệm | Lấy đúng teacher–subject–grade, hồ sơ mới nhất không sau mốc tính, cùng policy; UNKNOWN không phải 0. |
| B/F/C/R và hard checks | Từ dữ liệu có nguồn, đúng thời điểm/đơn vị; không dựa vào toàn bộ kết quả demo SQL như kết luận rule service đã kiểm tra đầy đủ. |
| Result JSON | Solver `Phase.seconds` khác DB `elapsed_ms`; summary yêu cầu đủ năm stage và `contract_version=1` riêng, cùng `config_hash`, coverage, solver status, stop reason và apply outcome. Cần mapper riêng. |
| Nhãn demo | CHECK summary của SQL chỉ cho `demo_only=true` khi mọi stage NOT_RUN. Không sao chép nguyên summary giả lập trong seed vào lượt solver đã thực thi; tách nhãn dữ liệu/quy tắc minh họa khỏi việc solver có thật sự chạy hay không. |
| Revision | Trigger DB tăng theo dòng; lấy revision cuối thực tế, kiểm tra initial revision một cách nguyên tử và không double-increment. |
| Lỗi giao dịch | Bổ sung ánh xạ lỗi stale/revision/lock, kể cả SQLSTATE `40001`; handler CRUD hiện tại chưa đủ cho nghiệp vụ solver. Không retry mù toàn bộ thao tác áp dụng kết quả cũ. |

## 7. Bộ endpoint đề xuất để chốt với team

Đây là **endpoint dự kiến**, không phải các API đã được Khánh triển khai.

| Method/route | Mục đích | Ticket |
| --- | --- | --- |
| `GET /api/assignment-rounds/{id}/readiness` | Kiểm tra đầu vào/phạm vi có thể giải | SOL-03 |
| `GET /api/assignment-rounds/{id}/plan` | Đọc plan/current version | SOL-02 |
| `POST /api/assignment-rounds/{id}/plan` | Tạo DRAFT ban đầu | SOL-02 |
| `POST /api/plan-versions/{id}/solver-runs` | Tạo lượt chạy, trả 202/run ID | SOL-06 |
| `GET /api/solver-runs/{id}` | Trạng thái, kết quả tổng hợp, proof và apply outcome | SOL-06/08 |
| `POST /api/solver-runs/{id}/cancel` | Yêu cầu hủy | SOL-06 |
| `GET /api/plan-versions/{id}/assignments` | Đọc phân công theo GV/lớp | SOL-08 |
| `GET /api/plan-versions/{id}/workloads` | Đọc tải và đối soát | SOL-08 |
| `POST /api/plan-versions/{id}/validations` | Kiểm tra và lưu kết quả validation còn mới | SOL-08 |

Body tối thiểu dự kiến cho POST solver-run:

```json
{
  "expected_revision": 12,
  "optimization_config_id": 1,
  "rule_set_version_id": 1
}
```

ID chỉ chọn cấu hình/quy tắc đã được phép và xác nhận. Snapshot, actor, token nguồn và tập gán không do client quyết định. API response dùng snake_case như backend hiện tại, nhưng DTO/hash nội bộ solver giữ contract riêng. Không bắt buộc hiển thị phần trăm tiến độ nếu engine chưa cung cấp dữ liệu thật.

Các API PATCH phân công và lock/unlock chưa có; chốt người nhận trước khi nối chức năng chỉnh sửa/chạy lại. Đăng nhập/phân quyền là phụ thuộc chung: có thể test fixture với actor kiểm soát trong môi trường test, nhưng không coi đó là auth cho bản triển khai thật.

## 8. Thứ tự PR và mốc demo

1. **PR 1:** SOL-01 và hợp đồng DTO/lỗi cho run; thêm test nối thư viện. Có thể bắt đầu ngay từ `dev` hiện tại.
2. **PR 2:** SOL-02/03/04 phần đầu vào tối thiểu và dữ liệu DB demo đồng nhất; chốt những nguồn Khánh cần bổ sung.
3. **PR 3:** SOL-05, snapshot và mapping/hash; có test từ DB sang input validator.
4. **PR 4:** SOL-06/07, async run/poll/cancel và apply có giao dịch; test stale/rollback từ đầu.
5. **PR 5:** SOL-08/09, API kết quả/tải/validation, nối UI và demo xuyên suốt.
6. **PR tiếp theo:** SOL-10 và chức năng chỉnh sửa/khóa/phản hồi/PDF theo phân công nhóm.

**Mốc demo đầu tiên:** chọn một round có dữ liệu đồng nhất → readiness → tạo DRAFT → chạy CP-SAT từ DB → poll → lưu kết quả → xem phân công/tải → đọc lại được sau restart. Kết quả đủ điều kiện kỹ thuật để lưu DRAFT chưa tự đồng nghĩa được mở phản hồi hoặc xuất PDF.

Mốc tiếp theo bổ sung sửa/khóa/chạy lại và dữ liệu thực tế. Không cần viết lại CP-SAT, Greedy hoặc GA để có mốc demo đầu tiên.

## 9. Phạm vi kiểm chứng của lần rà soát

- Đã đọc diff/commit, controller/entity/service, schema/trigger, tài liệu API, test backend và hợp đồng/mã solver hiện hành.
- Đã thử `mvn -o test`. Lần đầu Maven dùng đường dẫn cache mặc định không ghi được; sau đó dùng bản sao cache tại workspace và JDK dự án để thử lại.
- Lần thử có cache kết thúc **trước khi chạy test**, do thiếu `springdoc-openapi-starter-webmvc-ui:2.10.0` trong cache offline; Maven cũng cảnh báo plugin Surefire `3.5.5` chưa có. Đây là giới hạn môi trường/dependency của lần kiểm tra, không phải kết luận test nghiệp vụ thất bại.
- Docker daemon không sẵn sàng, nên chưa chạy HTTP/PostgreSQL integration. Chưa xác nhận migration trạng thái đã được áp dụng vào database trên máy người dùng.
- Log thử Maven: `D:\HCMUT\DACN\tmp\backend-audit-20261111\maven-test.log`. Không sửa mã backend/solver hoặc database trong lần rà soát này; chỉ tạo kế hoạch này.

## 10. Tệp căn cứ

- [API.md — trạng thái API đã có](../../../../backend/docs/API.md)
- [README backend](../../../../backend/README.md)
- [pom.xml backend](../../../../backend/pom.xml)
- [InputRecordRules.java — tập trạng thái hiện hành](../../../../backend/src/main/java/vn/edu/tass/backend/utils/InputRecordRules.java)
- [01_schema.sql — snapshot, run, trigger revision và guard](../../../../backend/sql/01_schema.sql)
- [InputDataApiTest.java](../../../../backend/src/test/java/vn/edu/tass/backend/integration/InputDataApiTest.java)
- [PostgresCrudIntegrationTest.java](../../../../backend/src/test/java/vn/edu/tass/backend/integration/PostgresCrudIntegrationTest.java)
- [CURRENT_MODEL.md — hợp đồng solver hiện hành](../../../../algorithm/tass-cpsat/docs/CURRENT_MODEL.md)
- [Contract.java](../../../../algorithm/tass-cpsat/src/main/java/vn/edu/tass/solver/Contract.java)
- [AssignmentService.java — apply và PlanStore](../../../../algorithm/tass-cpsat/src/main/java/vn/edu/tass/solver/AssignmentService.java)
- [ExperienceScoring.java](../../../../algorithm/tass-cpsat/src/main/java/vn/edu/tass/solver/ExperienceScoring.java)
