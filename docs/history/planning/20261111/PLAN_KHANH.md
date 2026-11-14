> Archived historical document. Dates, test counts and decisions below describe its original milestone. Current status: [backend documentation](../../../../backend/docs/README.md).

# Kế hoạch backend cho Khánh — 09/11/2026

## 1. Mục tiêu và phân vai

Khánh phụ trách backend từ dữ liệu đầu vào đến phương án được lưu và trả cho frontend. Mốc tích hợp đầu tiên là một luồng chạy được: đăng nhập quản lý → chọn học kỳ/đợt → kiểm tra đầu vào → tạo DRAFT → chạy CP-SAT → xem phân công/tải → sửa hoặc khóa một gán → chạy lại.

Khoa phụ trách wireframe/frontend, phối hợp chốt màn hình và dữ liệu cần hiển thị. Người phụ trách thuật toán tiếp tục sở hữu mô hình, validator solver, phiên bản hợp đồng và benchmark; Khánh sở hữu adapter DB–solver, điều phối lượt chạy và giao dịch áp dụng. Khánh phối hợp người duy trì schema khi sửa ràng buộc SQL; không tự thay đổi chính sách phân công đã chốt.

Lịch dưới đây là kế hoạch mục tiêu trong khoảng 8 tuần còn lại, tính từ khi bắt đầu; chưa phải ước lượng đã xác nhận theo số giờ rảnh của Khánh. Chốt năng lực/giờ làm ở buổi giao việc đầu tiên và điều chỉnh độ lớn mỗi PR, giữ thứ tự phụ thuộc. Cần có bản tích hợp đầu tiên cuối tuần 4 và dành tuần 8 để ổn định.

## 2. Kết quả rà soát backend hiện tại

Căn cứ: checkout `dev` tại commit `1388233` và các thay đổi thuật toán đang có trong workspace. Đây là rà soát tĩnh mã nguồn cho việc lập kế hoạch, chưa chạy lại Maven backend. Các kết quả 209 lượt kiểm thử và 45 lượt so sánh gần nhất thuộc module thuật toán, không chứng nhận backend đã hoạt động với schema mới.

| Hạng mục | Trạng thái quan sát | Hệ quả đối với đầu việc |
|---|---|---|
| Spring Boot, JPA, Bean Validation, PostgreSQL, Docker Compose | Đã có; 16 bộ controller/service/repository/entity/request/DTO/mapper | Tiếp tục từ nền hiện có |
| SQL trong `backend/sql/` | Đã có 48 bảng; ba tệp bằng nội dung với bản gốc khi chuẩn hóa BOM/xuống dòng | Không giao việc sao chép lại SQL; dùng bản trong repo làm nguồn triển khai đã thống nhất |
| TeachingDemand | Thiếu `valid_from`, `valid_to`, `unit` trong Java/request | API tạo nhu cầu chưa cung cấp đủ dữ liệu schema yêu cầu |
| TeachingExperience | Java còn `experience_level`, `experience_period`; schema đã thay cấu trúc | Truy vấn/ghi entity này sẽ tham chiếu cột cũ; phải sửa trước khi tích hợp UI |
| ClassSubjectApplicability | Thiếu `confirmed_by/at`, `components_confirmed_by/at` | Chưa quản lý được xác nhận tập bắt buộc |
| AssignmentRound | Thiếu `source_revision_token`, `source_updated_at` | Chưa cung cấp đủ metadata kiểm soát đầu vào cũ |
| Dữ liệu nghiệp vụ còn lại | Chưa có entity/service cho lịch sử, cơ sở định mức, thành phần bắt buộc, phương án/phiên bản, snapshot, lượt kiểm tra/lượt giải, phản hồi/xuất | Triển khai theo luồng nghiệp vụ, không cần mở CRUD đại trà cho cả 48 bảng |
| API hiện tại | CRUD từng bảng; list chỉ `limit/offset`, chưa lọc theo trường/học kỳ/đợt | Frontend cần API tổng hợp và bộ lọc có phạm vi |
| Xác thực/phân quyền | Chưa có Spring Security hoặc luồng đăng nhập trong mã đã đọc | `updated_by`, `recorded_by` hiện từ request; cần chuyển sang người dùng đã xác thực |
| Migrations, OpenAPI, solver integration | Chưa có dependency/cấu hình tương ứng trong backend | Bổ sung để tạo môi trường tái lập và hợp đồng cho frontend |
| Test backend | Có H2/MockMvc, test so entity–schema và PostgreSQL CRUD tùy chọn | Cập nhật theo schema mới; kiểm tra trigger/range/JSONB/CAS bằng PostgreSQL thật |

`EntitySchemaTest` hiện so cả tập cột entity với SQL; bốn chênh lệch trên là dữ liệu cần sửa thực tế. Khi mở rộng chức năng, thay các khẳng định cứng “đúng 16 controller/service” bằng kiểm tra đăng ký và hành vi tài nguyên cần thiết, không giữ số 16 làm tiêu chí thiết kế.

Hai ca SQL còn cần xử lý nằm trong `D:/HCMUT/DACN/database/review_20261109/README.md`: sửa ngữ cảnh SourceImport sau khi đã được sử dụng và khoảng thực dạy ngoài phân công dẫn nguồn. Theo nội dung bộ SQL hiện tại, chúng vẫn cần được sửa/kiểm chứng trước khi xem schema đã hoàn tất. Bộ ba mới chạy được không đồng nghĩa mọi bất biến đã đạt.

## 3. Quy tắc tổ chức triển khai

- Một ứng dụng Spring Boot, PostgreSQL và thư viện solver Java; chưa cần thêm dịch vụ solver riêng hoặc hàng đợi bên ngoài. Dùng executor có giới hạn và lưu trạng thái lượt chạy để frontend theo dõi.
- Giữ request/response `snake_case` theo API hiện có. Thống nhất mẫu phân trang, mã lỗi, trường hiển thị và OpenAPI với Khoa trước khi dựng các màn dùng dữ liệu thật.
- Controller nhận yêu cầu nghiệp vụ; service kiểm tra quyền và giao dịch. Các bảng snapshot/validation/solver/audit được ghi qua nghiệp vụ, không mở CRUD cho trình duyệt tự tạo PASS, proof hoặc audit.
- Các trạng thái/xác nhận, actor, revision và token do server quản lý. Người dùng không tự gửi `updated_by`, `verified_by`, `locked_by` hoặc token mới để thay cho principal/quy trình xác nhận.
- DDL có trigger tăng revision và ghi audit; thống nhất một cơ chế với JPA/service để không tăng hai lần hoặc giữ persistence context cũ. Không thêm `@Version` một cách độc lập với cơ chế revision của DB.
- Mỗi PR có phạm vi nhỏ, API mẫu và ca nghiệm thu. Kiểm thử phần nghiệp vụ cùng PR, không dồn toàn bộ sang tuần cuối.

## 4. Các đầu việc giao Khánh

### BE-01 — Đồng bộ mapping, schema và môi trường chạy [ưu tiên P0]

**Làm trước:**

- Sửa đồng bộ entity/request/DTO/mapper của bốn bảng nêu ở mục 2. TeachingExperience dùng `experience_status`, `years_of_experience`, `as_of_date`, nguồn và thông tin xác nhận; `grade_id` bắt buộc theo DDL mới.
- Bổ sung validation nhu cầu dương, <=999,99, tối đa hai chữ số, đúng loại và ngày; không làm tròn trước kiểm tra. Cho phép ba loại STANDARD/SPECIALIZED_TOPIC/ENRICHMENT.
- Đưa schema vào Flyway hoặc cơ chế migration đã thống nhất; tách migration cấu trúc với seed demo. Compose chỉ nạp init khi volume mới, không tự cập nhật volume đang có. Không xóa volume để thay cho migration.
- Sửa hai khoảng trống SQL đã tái hiện và viết ca hồi quy PostgreSQL. Nếu sửa SQL nguồn, đồng bộ bản gốc/bản trong repo có kiểm soát; ghi rõ bản nào là nguồn chuẩn.
- Seed tài khoản demo hiện DISABLED, không có mật khẩu đăng nhập: chuẩn bị bootstrap riêng cho profile local trong BE-02, không coi seed này là người dùng đăng nhập được.

**Bàn giao:** môi trường khởi tạo được từ README; API đọc/ghi hồ sơ, nhu cầu và xác nhận có mapping đúng; migration và seed chạy lại có kiểm soát.

**Nghiệm thu:** không còn truy vấn hai cột kinh nghiệm cũ; round trả được token; tạo nhu cầu không thiếu ngày/đơn vị; 2,345 bị từ chối và không bị lưu thành 2,35; hai ca SQL lỗi được chặn. Database đã có dữ liệu được nâng cấp bằng migration, không tạo lại tùy tiện.

### BE-02 — Đăng nhập, phân quyền và hợp đồng API [P0]

- Triển khai đăng nhập với mật khẩu được băm, logout và tra cứu tài khoản hiện hành. Chọn một cơ chế session/token duy nhất; không cần OAuth/SSO cho demo.
- Áp dụng Administrator, Academic Manager, Teacher và phạm vi trường/khối theo report. Cả endpoint lẫn service nghiệp vụ phải bảo vệ tài nguyên được tham chiếu; người không có quyền không được đổi actor hoặc đoán ID để xem dữ liệu khác.
- Tạo dữ liệu tài khoản local qua bootstrap có cấu hình; không lưu mật khẩu thật trong repo. Không trả credential/hash qua DTO hoặc snapshot.
- Bổ sung OpenAPI và ví dụ request/response; CORS cho địa chỉ frontend local đã thống nhất. Nếu dùng cookie, cấu hình CSRF/cookie nhất quán với Khoa.
- Chuẩn hóa lỗi có `code`, `message`, `field_errors`/đối tượng liên quan; phân biệt 401, 403, 404, 409 xung đột và 422 vi phạm nghiệp vụ. Không trả chi tiết SQL chứa dữ liệu nội bộ.

**Nghiệm thu:** phân biệt chưa đăng nhập với thiếu quyền; Teacher không đọc dữ liệu GV khác; actor ghi nhận từ principal. Khoa có thể dựng mock theo OpenAPI mà không chờ toàn bộ backend.

### BE-03 — Hồ sơ giáo viên và dữ liệu tải [P0]

- Bổ sung nghiệp vụ cho TeachingHistory, TeacherWorkloadBasis, TeacherDuty, TeacherReduction, ConvertedActivity và CalculationPeriod đủ cho demo; giữ các bảng quỹ/chế độ đặc thù theo phạm vi mở rộng.
- Cho phép xem hồ sơ GV tổng hợp: công tác, chuyên môn, kinh nghiệm theo môn/khối, lịch sử lớp đã thực dạy, định mức và nhiệm vụ còn hiệu lực. Có lọc theo trường, tổ, học kỳ, môn/khối, phân trang ở server.
- B lấy từ hồ sơ cấp công tác đã xác nhận: THCS 19, THPT 17; không suy từ môn dạy. Nhiệm vụ/giảm trừ/quy đổi không tính trùng. KHTN dùng một bản ghi môn như Toán/Vật lý.
- Giữ UNKNOWN khác 0; lịch sử nhiều lớp cùng thời gian không tự cộng đôi số năm. Nhập số năm đã được xác nhận; nếu xây chức năng tự tổng hợp từ lịch sử, phải hợp khoảng thời gian và có quy tắc tính năm rõ ràng.
- SourceImport/bí danh phục vụ truy vết dữ liệu đã chuẩn hóa. Chưa làm bộ import Excel tổng quát trong ticket này.

**Nghiệm thu:** lấy được hồ sơ đủ đầu vào B/F/C/R và kinh nghiệm; nguồn và hiệu lực có thể đối soát; thiếu giá trị hiện trạng thái thiếu, không trả 0 thay thế.

### BE-04 — Phạm vi đợt, tập thành phần bắt buộc và kiểm tra chuẩn bị [P0]

- Triển khai xác nhận phạm vi môn/khối, trạng thái áp dụng từng lớp–môn và RequiredDemandComponent, liên kết nhu cầu đúng lớp/môn/kỳ/loại/giai đoạn.
- API xác nhận phải xét tập thành phần đầy đủ, không chỉ đếm nhu cầu đang tồn tại. Sửa tập bắt buộc làm xác nhận cũ hết hiệu lực.
- Thao tác nhập nhiều lớp thực hiện nguyên tử; sai một phần không ghi nửa yêu cầu.
- Trả báo cáo chuẩn bị theo đợt: mã lỗi, đối tượng, dữ liệu còn thiếu, cảnh báo năm và phạm vi hiệu lực mà solver hỗ trợ. Dùng view SQL để hỗ trợ, bổ sung kiểm tra tải/công tác/kinh nghiệm/cấu hình ở service.
- Tách “đủ dữ liệu để chạy solver” với “có thể phủ đủ/mở phản hồi”. Không có ứng viên cho một nhu cầu phải được hiển thị là thiếu nguồn lực; khi dữ liệu đã đủ, vẫn có thể chạy để sinh DRAFT một phần.

**Nghiệm thu:** đợt demo chính và đợt chuẩn bị cho báo cáo khác nhau; thành phần bắt buộc chưa có demand bị phát hiện; thiếu dữ liệu tuần chặn, thiếu riêng năm giữ cảnh báo đúng chính sách.

### BE-05 — Phương án, phiên bản, sửa tay, khóa và tính tải [P0]

- Triển khai AssignmentPlan/PlanVersion/PlanDemand và API đọc tổng hợp theo GV hoặc lớp, có lọc và hiển thị gán thiếu/lý do.
- Mỗi đợt một plan, một current version. Tạo trùng trả xung đột. Lịch sử chỉ đọc; tạo phiên bản mới sao chép nội dung và nguồn; khôi phục cũng tạo DRAFT mới.
- Gán/đổi/bỏ gán và khóa/mở khóa chỉ trên DRAFT hiện hành, có reason/audit. Tối đa một GV mỗi thành phần; chuẩn/chuyên đề được khác GV. Không ghi một khóa không có GV hợp lệ.
- Xây workload/validation service dùng chung cho sửa tay, kết quả solver và chuyển trạng thái. Tính T/B/độ lệch cùng các thành phần đối soát; xét đúng thời điểm/giai đoạn. Giới hạn cứng có căn cứ, không lấy 25 trong seed làm ngưỡng chung.
- Lưu ValidationRun/Result gắn version/revision/snapshot/token. Sửa nguồn hoặc gán làm kiểm tra cũ lỗi thời. Tất cả writer cùng tham gia kiểm soát đồng thời.

**Nghiệm thu:** một sửa thành công, sửa dựa trên revision cũ bị từ chối và không ghi đè; sửa lịch sử bị chặn; hai request cùng revision chỉ một request thắng; khóa không bị solver/sửa tay âm thầm đổi; T=F+A+C+R không tính trùng.

### BE-06 — Adapter snapshot và tích hợp CP-SAT [P0]

- Thêm dependency thư viện Java/core của solver theo build có thể tái lập; khởi tạo OR-Tools native một lần khi ứng dụng khởi động. Không gọi shell/JAR CLI cho mỗi request web.
- Backend tạo snapshot nhất quán từ DB và cấu hình đã xác nhận, lưu InputSnapshot bất biến. Viết mapper tường minh sang `tass-solver/2`; không deserialize trực tiếp JSON payload SQL thành DTO solver.
- Dùng ExperienceScoring với hồ sơ đúng môn/khối/mốc tính để tạo ma trận điểm phạt; truyền khóa hiện hành và previousAssignments cùng đợt/học kỳ.
- API tạo lượt chạy trả 202 + run ID; frontend poll trạng thái. Executor có giới hạn, chặn chạy trùng không chủ ý cho cùng DRAFT; cancel theo từng run. Không giữ transaction ghi mở trong lúc giải.
- Lưu SolverRun với metadata từng bước, proof, trạng thái dừng và kết quả áp dụng riêng. Result UNKNOWN/ERROR/CANCELLED không được xem là ứng viên để ghi gán.
- Khi áp dụng: transaction kiểm tra lại current DRAFT, expected revision, snapshot, token nguồn sống và điều kiện cứng; ghi toàn bộ gán/lý do, tăng revision theo cơ chế thống nhất và ghi kết quả APPLIED. Kết quả đến muộn báo STALE, giữ phương án đã lưu.
- Tầng điều phối tính ngân sách toàn lượt, trừ thời gian chuẩn bị/ghi kết quả khỏi tổng 30–60 giây. Phải đo thêm HTTP/DB; thời gian solve() hiện chưa chứng minh SLA toàn ứng dụng.

**Nghiệm thu:** gọi API thật tạo phương án từ dữ liệu DB; năm mục tiêu đúng thứ tự; khóa được giữ; thiếu GV vẫn lưu DRAFT hợp lệ có lý do; sửa tay trong lúc solver chạy khiến kết quả cũ bị từ chối, không ghi một phần.

### BE-07 — Phản hồi giáo viên và vòng đời phương án [P1, cần cho nghiệm thu report]

- Triển khai mở phản hồi, đóng/xử lý phản hồi, tạo DRAFT kế tiếp, sẵn sàng xuất theo BR-09. Teacher chỉ xem phân công/tải của mình khi phương án đã mở theo đúng quyền.
- Gửi phản hồi kiểm tra principal, current source version và deadline trong giao dịch. Nội dung đã gửi giữ nguyên; kết quả xử lý có người/thời điểm/lý do.
- Đề nghị nhận thêm ghi tổng tiết mong muốn của môn, lớn hơn tổng hiện tại theo nguồn; không hiểu là số tiết tăng thêm, không tự sinh demand hoặc nới tải.
- Thay đổi phân công sau phản hồi tạo phiên bản mới, giữ nguồn và phản hồi lịch sử; bỏ mở lại phải ghi quyết định theo report.

**Nghiệm thu:** không gửi thay GV khác hoặc vào phiên bản cũ/quá hạn; phản hồi đúng môn/phân công của người gửi; không xuất khi còn phản hồi chưa xử lý.

### BE-08 — Xuất PDF, nhật ký và hoàn thiện bàn giao [P1, PDF là yêu cầu của report]

- PDF phương án đề xuất có hai góc nhìn GV/lớp, loại thành phần, kỳ, số tiết và tải; mã phiên bản và cảnh báo thiếu năm rõ ràng.
- Tạo/lưu tệp thành công rồi kiểm tra lại freshness trước ghi ExportRecord/EXPORTED. Tệp được tạo nhưng không thể phát hành do xung đột không được hiển thị là xuất thành công. Tải lại tệp đã lưu không tạo lượt xuất mới.
- API đọc audit có lọc/quyền; chỉ đưa thông tin cần thiết. Chức năng tra cứu audit nâng cao có thể làm sau phần cốt lõi; ghi audit ở thao tác quan trọng phải có ngay từ trước.
- Hoàn thiện README chạy local, cấu hình, tài khoản demo, API và dữ liệu demo, kịch bản E2E, danh sách giới hạn còn lại.

**Nghiệm thu:** lỗi tạo tệp/xung đột không chuyển EXPORTED; PDF đúng dữ liệu bản chụp, tải lại đúng tệp đã phát hành; người ngoài phạm vi không tải được tệp.

## 5. Những ánh xạ phải chốt trước BE-06

| Nguồn DB | Đích/ý nghĩa solver | Điều cần tránh |
|---|---|---|
| JSON InputSnapshot schema v2 của SQL | DTO `tass-solver/2` có cấu trúc khác | Hai số phiên bản đều là 2 không làm chúng thành cùng hợp đồng |
| `employment_status='TEACHING'` | `EmploymentStatus.ACTIVE` | Không gửi nguyên enum DB vào solver |
| `unit='PERIOD_PER_WEEK'` | `PERIODS_PER_WEEK` | Đổi nhãn có chủ đích, kiểm tra cùng đại lượng/kỳ tính |
| `grade.id`, `grade.grade_code` | gradeId trong DTO hiện dùng mã khối để tra weight `9`/`12` | Không gửi PK 3 thay mã khối 9 rồi làm mất ưu tiên cuối cấp |
| Giá trị PK và mã cấp học | Chuỗi nhất quán giữa Scope và Qualification | Không trộn `education_level_id=2` với `THCS` ở một phía |
| `criteria_weights_json` | Config năm bước, `stageSeconds`, `gradeWeights`, beta=1 | Không tự khôi phục tổng SOFT theo trọng số cũ |
| MD5 payload SQL | Hash canonical SHA-256 của solver | Lưu và đối chiếu đúng từng hash; không so hai thuật toán băm như cùng một trường |
| B/F/C/R theo hiệu lực | Workload của khoảng tính đã xác nhận | Không cộng các mức tiết/tuần của nhiều giai đoạn thành một tải tuần |

**Phụ thuộc thuật toán cần được quản lý:** solver v2 hiện nhận một khoảng hiệu lực đồng nhất. Người phụ trách thuật toán cùng nhóm phải chốt mô hình/cách tổng hợp L1/M trước khi tối ưu chung nhiều giai đoạn. Khánh dựng adapter và báo trạng thái phạm vi chưa hỗ trợ; không tự giải từng đoạn rồi gắn nhãn “tối ưu toàn học kỳ”, không bỏ các dòng nhu cầu không phù hợp. Bộ demo đầu tiên chọn dữ liệu đồng nhất đã chuẩn bị riêng; seed 48 bảng hiện có hai giai đoạn nên không đưa nguyên trạng vào solver rồi kỳ vọng chạy được.

Khánh có thể hoàn thiện nhập/xem và tính tải theo ngày cho dữ liệu nhiều giai đoạn trong BE-03/05 độc lập với việc tối ưu đồng thời. Khi chốt lại hợp đồng đa giai đoạn, cập nhật adapter và test qua một PR riêng với người phụ trách thuật toán.

## 6. Lịch mục tiêu 8 tuần

| Tuần | Ưu tiên của Khánh | Mốc có thể kiểm tra | Phối hợp |
|---|---|---|---|
| 1 | BE-01; chốt hợp đồng API và bắt đầu BE-02 | Mapping mới, môi trường DB và API đầu vào có schema đúng; Khoa có contract/mock | Khoa rà các màn và trường dữ liệu; nhóm chốt nguồn SQL |
| 2 | Hoàn tất BE-02; BE-03/04 phần cốt lõi | Đăng nhập/RBAC, hồ sơ GV, nhu cầu và báo cáo chuẩn bị | Khoa nối màn danh sách/form; thuật toán chốt mapper và dữ liệu demo đồng nhất |
| 3 | BE-05; dựng skeleton BE-06 bằng fixture | API DRAFT, sửa/khóa, tải/validation; tạo và theo dõi run thử | Thuật toán hỗ trợ DTO và expected result; Khoa dựng màn phương án |
| 4 | Hoàn tất BE-06 với DB thật | Chạy được toàn luồng đầu tiên: DB → API → solver → lưu → xem UI | Cả nhóm demo nội bộ; kiểm tra sửa tay khi đang chạy |
| 5 | Hoàn thiện BE-05/06, phạm vi lỗi/thiếu tải | Tích hợp ổn định; quyền, stale result, lock và concurrency có test | Sửa phát hiện từ lần demo; cập nhật contract nếu cần |
| 6 | BE-07 | Teacher xem/gửi phản hồi; quản lý xử lý và tạo phiên bản mới | Khoa nối cổng GV và luồng trạng thái |
| 7 | BE-08; E2E toàn luồng | Xuất PDF có guard; bộ dữ liệu/kịch bản demo đầy đủ | Cả nhóm kiểm tra nội dung PDF và dữ liệu báo cáo |
| 8 | Sửa lỗi, đóng gói, tài liệu, tập demo | Môi trường tái lập và demo ổn định; giới hạn được ghi rõ | Không thêm tính năng mới; rehearsal cả nhóm |

Nếu mốc tuần 4 chưa đạt, giảm công việc trang trí/nâng cao, import hàng loạt, quản trị quỹ/chế độ đặc thù, dashboard tùy biến và tra cứu audit nâng cao. Không âm thầm bỏ RBAC, validation, khóa/CAS, năm mục tiêu, phản hồi hoặc PDF rồi vẫn tuyên bố đủ report. Thay đổi phạm vi Must cần nhóm ghi lại và thống nhất với GVHD.

## 7. API cần thống nhất với Khoa

Các route dưới đây là **đề xuất để chốt contract**, chưa phải endpoint đã hiện thực. Endpoint CRUD đang có được giữ và mở rộng có kiểm soát. Wireframe thể hiện hành vi người dùng, không bắt buộc mỗi bảng SQL có một màn hình riêng.

| Luồng | API đề xuất | Dữ liệu quan trọng |
|---|---|---|
| Đăng nhập/tài khoản hiện hành | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Vai trò, phạm vi, trạng thái đăng nhập |
| Hồ sơ tổng hợp | `GET /api/teachers/{id}/profile?semester_id=...` | Chuyên môn, số năm theo khối, công tác, định mức/nhiệm vụ và nguồn |
| Nhu cầu | Mở rộng `GET /api/teaching-demands` và thao tác batch | Bộ lọc trường/kỳ/lớp/môn/loại, hiệu lực, lỗi từng dòng nhưng ghi nguyên tử |
| Chuẩn bị đợt | `GET /api/assignment-rounds/{id}/readiness` | BLOCKED/READY theo dữ liệu, cảnh báo năm, thiếu nguồn lực, phạm vi solver |
| Plan hiện hành | `GET /api/assignment-rounds/{id}/plan`, `POST /api/assignment-rounds/{id}/plan` | Current version, revision, source token, trạng thái, lịch sử |
| Phân công/tải | `GET /api/plan-versions/{id}/assignments`, `/workloads` | Lọc theo GV/lớp; T/B/delta, thành phần tải, đơn vị/hiệu lực, thiếu dữ liệu |
| Sửa/khóa | `PATCH /api/plan-versions/{id}/assignments/{demand_id}`, `POST .../{demand_id}/lock`, `POST .../{demand_id}/unlock` | Expected revision, dữ liệu nguồn cũ, reason; 409 khi xung đột |
| Kiểm tra | `POST /api/plan-versions/{id}/validations`, `GET /api/validation-runs/{id}` | BR, đối tượng, mức độ, dữ liệu thiếu và freshness |
| Chạy solver | `POST /api/plan-versions/{id}/solver-runs`, `GET /api/solver-runs/{id}`, `POST /api/solver-runs/{id}/cancel` | Run ID, tiến trình, status/proof, apply_outcome; không nhận snapshot tùy ý từ UI |
| Mở/xử lý phản hồi | Action API trên phiên bản + `POST /api/feedback`, API xử lý feedback | Deadline, nguồn, tổng tiết môn mong muốn, người xử lý và phiên bản kết quả |
| Cá nhân giáo viên | `GET /api/me/assignments`, `GET /api/me/workload`, `GET /api/me/feedback` | Server lấy teacher_id từ tài khoản |
| Xuất/tải | `POST /api/plan-versions/{id}/exports`, `GET /api/exports/{id}/file` | Trạng thái phát hành, version/revision, cảnh báo và file có quyền tải |

Chốt với Khoa ở cuối ngày 1–2: cấu trúc phân trang, bộ lọc, định dạng ngày/số thập phân, mã lỗi và cách hiển thị run đang chạy; kết quả sau apply gồm current revision mới. Bổ sung mẫu lỗi khóa, dữ liệu cũ, thiếu dữ liệu, không đủ quyền để wireframe thể hiện đúng từ đầu.

## 8. Gói bàn giao đầu tiên cho Khánh

Giao **BE-01** làm PR đầu tiên; mở nhánh đề xuất `feat/backend-schema-alignment` từ `dev` đã có các thay đổi nhóm thống nhất. Không gom sửa mapping, đăng nhập, solver và PDF vào một PR.

Checklist PR đầu:

- [ ] Đọc report phần FR-06/08/09 và DATA-02/03/04/06/07, schema 48 bảng cùng CURRENT_MODEL.md.
- [ ] Sửa bốn bộ entity/request/DTO/mapper; giữ token và actor là trường do server quản lý.
- [ ] Cập nhật validation và test EntitySchemaTest/CRUD theo cấu trúc mới; bỏ fixture tham chiếu cột đã xóa.
- [ ] Kiểm chứng các ràng buộc mới trên PostgreSQL, không chỉ H2; xử lý hai GAP SQL đã có ca tái hiện.
- [ ] Có migration, hướng dẫn khởi tạo/nâng cấp và seed local rõ ràng; không xóa dữ liệu có sẵn.
- [ ] Bàn giao ví dụ JSON cho hồ sơ kinh nghiệm, nhu cầu có hiệu lực và báo cáo lỗi cho Khoa.
- [ ] PR ghi phần đã chạy, phần chưa chạy, giới hạn và công việc kế tiếp; người khác trong nhóm review trước merge.

Sau PR này làm BE-02, rồi hồ sơ/tải và chuẩn bị đợt. Đây là phần cần làm ngay để UI wireframe chuyển sang màn hình dùng API thật và để adapter solver có đầu vào đáng tin cậy.
