# Hợp đồng solver và tích hợp

> Hợp đồng hiện hành ngày 09/11/2026 là [tass-solver/2 và mô hình năm bước](CURRENT_MODEL.md). Nội dung tass-solver/1/hai pha dưới đây là hồ sơ lịch sử; dùng tài liệu mới khi dựng adapter backend. Các nguyên tắc về quyền, snapshot bất biến và giao dịch CAS tiếp tục áp dụng.

`Contract.java` định nghĩa schema JSON `tass-solver/1`. Đây là DTO mới của module, không phải từ điển database. JSON từ chối trường không biết, tên key trùng và null cho primitive. Các collection được sao chép bất biến. `input-snapshot.json` phải được giữ cùng `result.json` để đọc tên hiển thị, cấu hình, nguồn và đơn vị; hash SHA-256 tính từ serialization chuẩn hóa key/order, không phải hash byte của tệp JSON có thụt dòng.

## Input

| Khối | Hợp đồng |
|---|---|
| identity | school/semester/round/plan/version, baseRevision, snapshotId, sourceRevisionToken, rule/config version bắt buộc. Snapshot chỉ một semester |
| period | Ngày đầu/cuối semester. Chỉ hỗ trợ nhu cầu áp dụng toàn kỳ. Adapter xác minh liên kết năm học của lớp/học kỳ |
| normalization | integerScale 1..1,000,000; unit PERIODS_PER_WEEK; FIXED_WEEKLY hoặc AVERAGE_WEEKLY; EXACT. Làm tròn nghiệp vụ phải được xác nhận trước khi đưa vào |
| config | coverageMode, deviationBasis, preservePolicy, trọng số nguyên không âm, tổng thời gian, thời gian tối đa từng pha, workers, seed, decisionSource, demoAssumptions |
| scopes | Lớp, môn, khối, cấp, tên hiển thị, applicability và requiredTypes có nguồn. APPLICABLE cần component; NOT_APPLICABLE không có component; UNDETERMINED chặn |
| demands | ID duy nhất; lớp/môn/kỳ/type duy nhất; số tiết >0; bắt buộc khớp scope và semester. STANDARD hoặc SPECIALIZED_TOPIC |
| teachers | ID/tên; công tác theo semester/trường/ngày; năng lực môn–cấp có verification/hiệu lực; workload; điểm phạt kinh nghiệm; hardChecks |
| workload | B/R/F/C phải có giá trị và nguồn, kể cả 0. Q do module tính. F chỉ một baseline được chọn, outsideDemandIds không trùng D. targetApplicable=false khi không có công tác active đúng phạm vi |
| hardChecks | Mỗi GV có ít nhất một check WEEKLY đủ dữ liệu và trạng thái check ANNUAL tường minh. Check PASS là **đầu vào đủ để tính**, không phải kết luận nghiệm đã PASS |
| previousAssignments | Nguồn snapshot cũ và demand/teacher, teacher có thể null. Chỉ demand chung tính changes; demand mới/xóa báo riêng; giáo viên cũ không còn hợp lệ được phép thay |
| prechecks | BR-04 và BR-16–21 phải có PASS/NOT_APPLICABLE với nguồn/giải thích từ rule service đáng tin cậy. Thiếu/VIOLATION/INSUFFICIENT_DATA chặn trước model |
| hardCheckInventorySource | Bằng chứng tầng nghiệp vụ đã xác định đầy đủ tập rule áp dụng, tránh bỏ sót một giới hạn bằng cách không gửi nó |

Tất cả checks đủ dữ liệu cần coefficient cho **mọi demand**, kể cả 0. Biểu thức mỗi check là `fixed + converted + sum(coeff[d] * x[teacher,d]) <= limit`; mọi số thuộc đơn vị và kỳ của chính check. Check ANNUAL có thể dùng OVERTIME_HOURS với hệ số đã được xác nhận; không lấy số tuần hoặc h_j tự nhân vào. Số liệu bình quân không tự tạo coefficient cho tuần thực tế. Adapter phải gửi từng phép kiểm tra tuần/giai đoạn cần thiết và căn cứ chuyển đổi.

Mọi số tải được nhân scale bằng BigDecimal rồi `longValueExact`; không round trong solver. Cận tổng tải/điểm tối ưu giới hạn bảo thủ ở 10^12, dưới 2^53, giúp kiểm tra overflow và đọc bound double không mất độ chính xác số nguyên. Input quá lớn bị từ chối rõ ràng, không ép xuống int.

## Output và chất lượng

Một candidate có đúng một Assignment cho từng demand: teacherId hoặc reasonCode/reason, không đồng thời cả hai. Không có nghiệm thì assignments rỗng và metrics null; không tạo giả kết quả toàn bỏ gán. Load báo B/R/Q/A/F/C/W và hai độ lệch; Q/under/over/delta null khi mục tiêu không áp dụng, không báo thiếu tải cho người nghỉ.

`coverageOptimalityProven` chỉ từ pha 1. `softOptimalityProven` chỉ là chứng minh trong lát cắt coverage đã giữ. Overall OPTIMAL cần cả hai; FEASIBLE có thể dùng để áp dụng. `fullCoverageImpossibleProven` chỉ true khi pha 1 chứng minh optimum >0; không suy từ một nghiệm thiếu hoặc timeout. Nó nói về snapshot và ràng buộc hiện tại, không xác định cần tuyển thêm bao nhiêu GV hay nguyên nhân từng dòng.

`NO_QUALIFIED_TEACHER`: không có ứng viên đủ điều kiện trong snapshot. `CAPACITY_EXCEEDED`: mọi ứng viên tương thích nhóm đều vi phạm ít nhất một check khi **thêm trực tiếp** vào nghiệm đang có. `UNRESOLVED`: không có chẩn đoán chắc chắn hơn. Hai mã sau không khẳng định một dòng không bao giờ được gán nếu đổi các gán khác. Các mã DTO cần ánh xạ từ điển chính thức trước lưu DB.

Status ứng dụng INVALID_INPUT/VALIDATION_FAILED/ERROR/CANCELLED không được ghi như CP-SAT enum. Từng Phase giữ status thực, objective/bound khi có nghiệm, stopReason và wall time. Mỗi pha bị giới hạn bởi ngân sách còn lại; `elapsedSeconds` đo pipeline từ validate đến kết quả, không gồm khởi động JVM/nạp thư viện hoặc giao dịch DB bên ngoài. `budgetExceeded` báo phần vượt thực đo; đây chưa phải cơ chế deadline cứng cho tác vụ tiền/hậu xử lý lớn. Host phải trừ ngân sách capture/apply và điều phối worker/process nếu cần SLA tuyệt đối.

## Nối vào Spring Boot sau khi có repo/schema

1. Khai báo `AssignmentSolver` thành bean; nạp native library một lần lúc khởi động. Chạy mỗi lượt với snapshot bất biến và cancellation token riêng.
2. Tầng ứng dụng kiểm tra Academic Manager + phạm vi trường; đọc current DRAFT/revision và toàn bộ dữ liệu cần thiết trong một transaction đọc nhất quán.
3. Adapter dùng **entity/repository thật** để tạo DTO. Join ClassSubjectApplicability với tập TeachingDemand theo lớp/môn/semester; không bịa FK demand_id đơn. Xác minh class–grade–year–school, scope overlaps, TeacherEmployment, rule evidence và baseline ngoài phạm vi.
4. Chạy solver ngoài transaction ghi dài. Lưu metadata lượt chạy theo dictionary sau khi chốt; không tạo enum/cột từ status DTO một cách tự động.
5. Gọi `AssignmentService.apply` với PlanStore adapter bền vững. Trong cùng transaction: khóa/check current plan-version, DRAFT, revision và token các nguồn; ghi đủ assignments/reasons; tăng revision; vô hiệu hóa validation cũ; ghi appliedRevision/audit; commit tất cả hoặc rollback.
6. Mọi writer khác (sửa tay, đổi rule/input, thay version, chuyển state) phải tham gia cùng cơ chế concurrency. Token chỉ timestamp của một bảng là không đủ.
7. Mở/phát hành thực hiện BR-09 cùng guard lifecycle và feedback; kiểm tra lại sau render trước ghi ExportRecord. Solver không thực hiện thao tác này.

Không mở endpoint nhận snapshot tùy ý từ trình duyệt rồi tin prechecks. Client gửi định danh/yêu cầu; máy chủ dựng snapshot từ nguồn có quyền và các quyết định đã xác nhận. Không trả toàn bộ snapshot chứa mọi giáo viên cho cổng Teacher.

`AssignmentService.InMemoryPlanStore` chỉ là reference adapter chạy test: synchronized + identity/hash/revision CAS, không tự đổi state hay ghi DB. Không trình bày integration test của adapter này như đã kiểm thử PostgreSQL/JPA/Spring MVC.
