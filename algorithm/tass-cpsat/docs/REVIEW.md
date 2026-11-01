# Rà soát và quyết định triển khai — 25/10/2026

## Nguồn đã đối chiếu

Ưu tiên bản rà soát 22/10 trong thư mục người dùng chỉ định:

- `srs_1_1_review.tex`: phạm vi, 22 BR, FR, DATA, NFR và OI-01–05.
- `use_cases_1_1_review.tex`: đủ 19 UC; đặc biệt UC-07/08/12/13/14/15 và guard UC-16–20.
- `algorithm_review.tex`: 19 mục, HC-01–07, SC-01–04, POC-01–20. Đây là file thuật toán thực tế có trong folder; không có file đúng tên `algorithm.tex`.
- `diagrams/DG-01.puml` đến `DG-09.puml`; `DG_ERD_PATCHES.md` và `ERD_CONTRACT.md`.
- `SOLVER_INPUT_CONTRACT.md`, `REVIEW.md`, `ALGORITHM_PATCH_MAP.md`, `TRACEABILITY.csv`, `SOURCE_MANIFEST.json`, `VALIDATION.json`; đối chiếu lịch sử sửa trong `source_changes.json`/`PATCHES.md`.
- ERD gốc ở thư mục cha: `D:\HCMUT\DACN\DACN_DG-ERD.png` (41 bảng, bản thiết kế logic). Ảnh không thay từ điển cột/SQL.

Ba PDF trong `preview/` là bản render cùng các nguồn TeX, không phải baseline nghiệp vụ khác. Không dùng chúng để suy thêm yêu cầu. Cuộc trò chuyện tham chiếu chỉ có yêu cầu đọc folder và không trả tệp đính kèm; không có `Report.pdf` trong folder hay kết quả tìm file dưới `D:\HCMUT\DACN`. Vì vậy không sử dụng báo cáo cũ làm nguồn quyết định.

Không tìm thấy `pom.xml`, `build.gradle`, Java source, SQL hoặc AGENTS.md trong cây thư mục đề tài được kiểm tra. Không có database thật để thử repository. DG-09 xác nhận Spring Boot/React/PostgreSQL chỉ là đề xuất. Quyết định triển khai: Java 17 library + Maven + CLI; không tự dựng REST server công khai hoặc ánh xạ JPA.

## Điểm chưa nhất quán và cách xử lý

| Vấn đề | Bằng chứng | Xử lý trong module | Còn cần chốt cho triển khai thật |
|---|---|---|---|
| RV-02: cùng/khác GV giữa STANDARD và SPECIALIZED_TOPIC | SRS BR-01/13; ghi chú C06 ERD; algorithm mục 2/HC-01 | Giữ cùng GV, người dùng đã chấp nhận cho PoC | Quyết định phạm vi chính thức của nhóm/GVHD |
| Thành phần bắt buộc chưa có từ điển lưu trữ | DATA-04/06; ERD_CONTRACT mục 4 | Input scope có tập loại xác nhận; thiếu row chặn trước model | Chọn JSON hay quan hệ chuẩn hóa; không tự thêm cột SQL |
| DECIMAL khác nguyên dương trong nguồn cũ | RV-01; algorithm mục 4 | BigDecimal + exact scale; 1.875 không bị cắt ở scale 100 | Ý nghĩa số lẻ và quy tắc làm tròn nghiệp vụ |
| A bị lẫn W, ngưỡng tải bị suy từ Q | SRS mô hình tải; BR-05/06; RV-04 | Báo A/F/C/W/Q và deltaA/deltaW riêng; mỗi check có biểu thức riêng | Đơn vị, kỳ tính, nguồn và biểu thức của từng rule thật |
| OI-01 chưa chốt objective/trọng số | SRS OI-01; SC-01–04 | PoC chọn COMPONENTS/W; cấu hình bắt buộc, thay đổi chỉ là phạt mềm | Kinh nghiệm, trọng số, tiêu chí phân phối ngoài L1 |
| L1 không chứng minh công bằng | RV-06; POC-13 | Test 10/0 và 5/5 cùng lệch 10; không gọi metric là công bằng | Có cần minimax hoặc mục tiêu khác |
| Thất bại/timeout bị coi là thiếu GV | RV-05/07/08; UC-13 | Tách status, stop reason, proof; giữ incumbent; lý do cục bộ có giới hạn | Từ điển reason chính thức; UNRESOLVED là mã DTO nội bộ |
| Khóa/cấm có ở bản cũ nhưng chưa trong SRS/storage | RV-09; HC-04/05 | Không có chức năng khóa/cấm | Đồng bộ SRS/UC/ERD nếu mở rộng |
| Quy tắc giảm trừ/quy đổi chưa có bộ dữ liệu duyệt | OI-02; BR-16–21 | Yêu cầu prechecks từ rule service và B/R/F/C có nguồn | Bộ quy tắc thật, chứng cứ, kiểm tra chi trả/quỹ/ngoại lệ |
| Dữ liệu năm chưa đủ | OI-03; BR-09 | INSUFFICIENT_DATA có danh sách thiếu; không thế 0/PASS | Nguồn năm, biểu thức vượt năm và đơn vị giờ/tiết |
| Công tác một phần kỳ chưa có quy tắc | BR-02; RV-15 | Từ chối phần kỳ; kiểm tra chồng khoảng; không phạt người nghỉ toàn kỳ | Phân kỳ có duyệt và cách tính tải từng đoạn |
| Snapshot/revision có thể cũ khi solver trả về | FR-15; DG-04/07; RV-11 | Hash snapshot, identity và CAS trong adapter tham chiếu | Giao dịch DB thật + token bao trùm mọi nguồn liên quan |
| 60 giây đang là mục tiêu | NFR-03/OI-05 | Cả hai pha lấy ngân sách còn lại; đo elapsed và budgetExceeded | Dữ liệu/host đo thực tế; chưa chứng nhận NFR |

## Phạm vi đã hiện thực và ranh giới

Phần hiện thực là module giải trên **snapshot chuẩn hóa đáng tin cậy**, không phải toàn bộ TASS. Một nguồn dữ liệu thực cần adapter xác minh class/grade/academic-year/school/semester và quyền quản lý trước khi tạo DTO. Việc tiền kiểm thấy chuỗi chứng cứ không tự chứng minh chứng cứ là thật. Không nhận `prechecks=PASS` do một client không tin cậy tự khai rồi coi đó là kiểm tra pháp lý.

BR-04 tính Q trong module. BR-16–21 được kiểm tra như tiền điều kiện bắt buộc có kết quả PASS/NOT_APPLICABLE và căn cứ từ rule service; **chưa hiện thực engine xác minh hồ sơ nhiệm vụ, tính quỹ, thù lao hoặc hệ số theo văn bản pháp luật** vì không có bộ quy tắc/dữ liệu đã chốt. Không hardcode mức 17/19, 1.5Q hay 200 giờ thành 200 tiết. Fixture không có hồ sơ pháp lý thật.

Nhu cầu trong scope phải bao gồm toàn bộ các thành phần đã xác nhận của mỗi nhóm. Phiên bản này chưa hỗ trợ cố định một component ngoài scope bằng liên kết teacher biên. Adapter phải mở rộng nhóm vào snapshot hoặc từ chối ca đó; không chỉ cộng tải vào F.

Phân quyền, lưu trữ bền vững, UI, feedback, tạo phiên bản lịch sử và phát hành PDF vẫn thuộc ứng dụng chủ. `dataReadyForOpening` chỉ biểu thị điều kiện dữ liệu; không phải quyền chuyển trạng thái. Adapter trong bộ nhớ giúp kiểm chứng giao thức CAS, không chứng nhận giao dịch một database chưa tồn tại.

## Dấu vết nguồn (SHA-256)

| File | SHA-256 |
|---|---|
| srs_1_1_review.tex | C77FF356562648B9FE598C3BAD1FD25823411BFF115E26508F8CA3E2A8FA4882 |
| use_cases_1_1_review.tex | 99DD3F75821DDA7EE285C088D843A3B6F985B334578AAC093CECFE4871828011 |
| algorithm_review.tex | 5BB2E8F5B693A94444ED5BCA505A989FDEB3D61217E06F99F0515BF2B0822121 |
| ERD_CONTRACT.md | 9E238C765A1EFFE9EE75191A39545AD606A13FC2E6B885789AA9D8FB62646596 |
| SOLVER_INPUT_CONTRACT.md | EEBC4154D97FDA1BEFECD597CA39080619A82A28686EC6A5F663A968C9223585 |
| DG_ERD_PATCHES.md | E6D43AEC9F1582448623719B5F85B3D383CF9AF494D01C819846D8CBC1712AF6 |
