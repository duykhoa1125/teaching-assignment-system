# PHÂN TÍCH ĐỀ TÀI HỆ THỐNG HỖ TRỢ PHÂN CÔNG GIẢNG DẠY

> Tên đề tài đề xuất: **Xây dựng hệ thống hỗ trợ quyết định phân công giảng dạy giáo viên dựa trên tối ưu hóa ràng buộc đa mục tiêu**
>
> Quy mô nhóm: **03 thành viên**  
> Backend: **Java Spring Boot**  
> Ngày cập nhật: **05/09/2026**

## 1. Tóm tắt và đánh giá đề tài

Đề tài xây dựng một hệ thống hỗ trợ nhà trường hoặc tổ chuyên môn quản lý dữ liệu và lập phương án phân công giáo viên cho từng môn, lớp và học kỳ. Hệ thống không chỉ lưu trữ bảng phân công mà còn kiểm tra chuyên môn, định mức, khối lượng công việc và các quy tắc của đơn vị; từ đó đề xuất phương án phù hợp, phát hiện thiếu nguồn lực và hỗ trợ người quản lý điều chỉnh trước khi phê duyệt.

Đây là đề tài phù hợp để phát triển xuyên suốt từ Đồ án chuyên ngành đến Luận văn tốt nghiệp vì có đủ ba lớp bài toán:

1. **Hệ thống thông tin quản lý:** giáo viên, môn học, lớp, khối, năm học, học kỳ, định mức và báo cáo.
2. **Nghiệp vụ có nhiều quy tắc:** chuyên môn, giảm tiết, quy đổi nhiệm vụ, phân công bắt buộc, thiếu và vượt định mức.
3. **Bài toán tối ưu tổ hợp:** lựa chọn phương án phân công tốt trong số lượng lớn khả năng và nhiều mục tiêu cạnh tranh.

Nếu chỉ hiện thực CRUD, phân công thủ công và thống kê, sản phẩm phù hợp với Đồ án chuyên ngành. Để đạt độ sâu của Luận văn tốt nghiệp, hệ thống cần có mô hình tối ưu, thuật toán đối chứng, khả năng giải thích kết quả và đánh giá thực nghiệm.

## 2. Xác định đúng bài toán và phạm vi

### 2.1. Phân công giảng dạy không phải xếp thời khóa biểu

| Phân công giảng dạy | Xếp thời khóa biểu |
|---|---|
| Xác định giáo viên nào dạy môn/lớp nào | Xác định môn học diễn ra vào ngày, tiết và phòng nào |
| Quan tâm chuyên môn, định mức và khối lượng | Quan tâm xung đột thời gian, phòng và tiết học |
| Lập kế hoạch theo học kỳ hoặc năm học | Lập lịch chi tiết theo tuần/ngày |
| Kết quả là bảng phân công chuyên môn | Kết quả là thời khóa biểu |

Phạm vi luận văn nên tập trung vào **Teacher Assignment Problem**. Kết quả phân công có thể trở thành đầu vào cho hệ thống xếp thời khóa biểu trong tương lai, nhưng không nên giải đồng thời cả hai bài toán ở phiên bản cốt lõi.

### 2.2. Phạm vi khuyến nghị

Phiên bản cốt lõi nên giới hạn như sau:

- Áp dụng cho một trường phổ thông.
- Lập phương án theo năm học và học kỳ.
- Phân công giáo viên vào từng nhu cầu `lớp - môn - học kỳ`.
- Mặc định một giáo viên phụ trách trọn một nhu cầu giảng dạy.
- Có thể mở rộng việc chia nhu cầu cho nhiều giáo viên ở giai đoạn 2.
- Không xếp ngày, tiết và phòng học cụ thể.
- Không quản lý điểm, học sinh, học phí, giáo án hoặc học liệu.
- Chưa xây dựng ứng dụng di động.
- Chưa triển khai mô hình SaaS đa trường.

### 2.3. Ngoài phạm vi

- Xếp thời khóa biểu chi tiết.
- Quản lý điểm, hạnh kiểm và hồ sơ học sinh.
- Tính lương hoặc thanh toán dạy thêm giờ.
- Quản lý thay tiết theo ngày.
- Dự báo tuyển dụng giáo viên bằng học máy.
- Chatbot hoặc trợ lý AI sinh nội dung.

Các nội dung trên chỉ nên được ghi nhận là hướng phát triển.

## 3. Vấn đề thực tế cần giải quyết

Quy trình phân công thủ công thường gặp các vấn đề:

- Dữ liệu nằm rải rác trong bảng tính, hồ sơ nhân sự và kinh nghiệm của tổ trưởng.
- Khó phát hiện giáo viên bị giao sai hoặc lệch chuyên môn.
- Khó cân bằng tải vì định mức của mỗi giáo viên có thể khác nhau.
- Giáo viên chủ nhiệm, tổ trưởng, cán bộ quản lý hoặc người kiêm nhiệm có chế độ giảm hay quy đổi riêng.
- Khi giáo viên nghỉ hoặc số lớp thay đổi, người quản lý phải điều chỉnh nhiều vị trí liên quan.
- Không biết chính xác nguyên nhân thiếu giáo viên ở một môn hoặc khối.
- Khó tạo và so sánh nhiều phương án.
- Khó truy vết ai đã sửa, lý do sửa và ai phê duyệt.

Hệ thống phải phân biệt bốn khái niệm nghiệp vụ:

| Khái niệm | Ý nghĩa | Mức độ đề xuất |
|---|---|---|
| Thiếu phủ nhu cầu | Môn/lớp chưa có giáo viên phụ trách | Nghiêm trọng |
| Thiếu định mức cá nhân | Khối lượng giáo viên thấp hơn định mức | Cảnh báo |
| Vượt định mức | Khối lượng giáo viên cao hơn định mức | Cảnh báo hoặc giới hạn cấu hình |
| Sai chuyên môn | Giáo viên không đủ điều kiện dạy nhu cầu | Ràng buộc cứng |

Khi thiếu nguồn lực, hệ thống nên để nhu cầu ở trạng thái **chưa phân công** và giải thích phần thiếu thay vì tự động giao cho một giáo viên sai chuyên môn.

## 4. Mục tiêu

### 4.1. Mục tiêu tổng quát

Xây dựng hệ thống hỗ trợ nhà trường tạo, kiểm tra, điều chỉnh, so sánh và phê duyệt phương án phân công giảng dạy phù hợp với chuyên môn, định mức và quy tắc của đơn vị.

### 4.2. Mục tiêu cụ thể

- Số hóa dữ liệu phục vụ phân công giảng dạy.
- Chuẩn hóa và cấu hình được các quy tắc nghiệp vụ.
- Tạo phương án phân công tự động hoặc bán tự động.
- Bảo đảm giáo viên được phân công đúng phạm vi chuyên môn.
- Hạn chế số môn/lớp chưa có giáo viên.
- Cân bằng khối lượng theo định mức thực tế của từng người.
- Phát hiện các trường hợp thiếu, vượt và bất thường.
- Cho phép khóa, sửa và tái tối ưu một phần phương án.
- Giải thích vì sao một phân công được đề xuất, bị cảnh báo hoặc bị từ chối.
- Lưu nhiều kịch bản để so sánh.
- Xuất báo cáo Excel/PDF phục vụ quản lý.
- Đánh giá hiệu quả so với phân công thủ công và thuật toán cơ sở.

## 5. Câu hỏi nghiên cứu

Luận văn có thể tập trung vào ba câu hỏi:

- **RQ1:** Mô hình tối ưu ràng buộc có giảm số nhu cầu chưa phân công và số vi phạm so với phương pháp thủ công hoặc thuật toán tham lam không?
- **RQ2:** Mô hình có cải thiện mức cân bằng khối lượng trong khi vẫn bảo đảm chuyên môn không?
- **RQ3:** Chức năng giải thích và tái tối ưu có giảm thời gian điều chỉnh phương án của người quản lý không?

Đóng góp dự kiến của đề tài:

- Mô hình hóa nghiệp vụ phân công giáo viên phổ thông.
- Mô hình tối ưu đa mục tiêu.
- Cơ chế cấu hình quy định theo thời gian hiệu lực.
- Cơ chế giải thích kết quả và phát hiện thiếu nguồn lực.
- Hệ thống phần mềm hoàn chỉnh trên nền Java Spring Boot.
- Kết quả thực nghiệm trên nhiều quy mô dữ liệu.

## 6. Đối tượng sử dụng và phân quyền

### 6.1. Ban giám hiệu hoặc quản lý chuyên môn

- Quản lý năm học, lớp, môn và giáo viên.
- Cấu hình quy tắc.
- Tạo và so sánh phương án.
- Khóa các phân công bắt buộc.
- Phê duyệt và công bố kết quả.
- Xem thống kê toàn trường.

### 6.2. Tổ trưởng chuyên môn

- Xác nhận năng lực chuyên môn của giáo viên trong tổ.
- Đề xuất phân công.
- Xem cảnh báo và điều chỉnh phương án.
- Gửi phương án lên ban giám hiệu.

### 6.3. Giáo viên

- Xem phân công cá nhân.
- Xem cách tính khối lượng.
- Gửi phản hồi hoặc yêu cầu điều chỉnh.

### 6.4. Quản trị viên

- Quản lý tài khoản và vai trò.
- Cấu hình hệ thống.
- Theo dõi nhật ký và tình trạng tác vụ.
- Thực hiện sao lưu và phục hồi.

Trong MVP có thể dùng ba vai trò: `ADMIN`, `ACADEMIC_MANAGER` và `VIEWER`.

## 7. Quy trình nghiệp vụ đề xuất

```text
Tạo năm học và học kỳ
        ↓
Nhập giáo viên, lớp, môn và chương trình
        ↓
Khai báo chuyên môn, định mức và điều chỉnh tải
        ↓
Kiểm tra chất lượng và tính khả thi sơ bộ của dữ liệu
        ↓
Tạo một phương án phân công
        ↓
Chạy thuật toán đề xuất
        ↓
Xem điểm, cảnh báo và lời giải thích
        ↓
Điều chỉnh thủ công / khóa một số phân công
        ↓
Tái tối ưu phần còn lại
        ↓
So sánh các phương án
        ↓
Phê duyệt → Công bố → Xuất báo cáo → Lưu trữ
```

Vòng đời phương án:

```text
DRAFT → VALIDATED → SOLVING → REVIEWING → APPROVED → PUBLISHED → ARCHIVED
```

Chỉ phương án ở trạng thái `DRAFT` hoặc `REVIEWING` mới được chỉnh sửa. Việc sửa phương án đã duyệt phải tạo phiên bản mới hoặc đưa phương án trở lại quy trình duyệt và ghi nhật ký đầy đủ.

## 8. Phân tích yêu cầu chức năng

### 8.1. Dữ liệu nền

- Quản lý năm học và học kỳ.
- Quản lý cấp học, khối và lớp.
- Quản lý tổ chuyên môn.
- Quản lý môn học và phân môn.
- Quản lý giáo viên, trạng thái làm việc và loại hợp đồng.
- Import dữ liệu từ Excel.
- Kiểm tra dữ liệu trùng, thiếu hoặc không hợp lệ.

### 8.2. Ma trận chuyên môn

Quan hệ giáo viên - môn học không nên lưu dưới dạng văn bản tự do. Mỗi quan hệ cần thể hiện:

- Có đủ điều kiện giảng dạy hay không.
- Cấp học và phạm vi khối có thể dạy.
- Mức ưu tiên: chuyên môn chính, chuyên môn phụ hoặc có thể hỗ trợ.
- Mức độ thành thạo hoặc kinh nghiệm.
- Nguyện vọng giảng dạy.
- Trường hợp bị cấm hoặc hạn chế phân công.
- Thời gian hiệu lực của năng lực hoặc chứng chỉ nếu cần.

Giới tính, tuổi và các đặc điểm cá nhân không liên quan trực tiếp đến chuyên môn không được đưa vào hàm tối ưu.

### 8.3. Nhu cầu giảng dạy

Đối tượng trung tâm là `TeachingRequirement`, ví dụ:

> Lớp 8A - môn Toán - học kỳ I - 4 tiết/tuần - cần một giáo viên.

Mỗi nhu cầu gồm:

- Lớp.
- Môn hoặc phân môn.
- Học kỳ.
- Số tiết mỗi tuần và tổng số tiết.
- Số giáo viên cần thiết.
- Có được chia cho nhiều giáo viên hay không.
- Mức ưu tiên.
- Yêu cầu đặc biệt.

### 8.4. Định mức và khối lượng

Hệ thống quản lý riêng:

- Định mức cơ sở.
- Số tiết được giảm.
- Số tiết công việc được quy đổi.
- Số tiết trực tiếp được phân công.
- Khối lượng được công nhận.
- Phần thiếu và phần vượt.

Công thức khái quát:

```text
Định mức được công nhận = Định mức cơ sở - Số tiết được giảm

Khối lượng được công nhận
    = Số tiết trực tiếp được phân công
    + Số tiết công việc được quy đổi

Chênh lệch
    = Khối lượng được công nhận
    - Định mức được công nhận
```

Thông tư 05/2025/TT-BGDĐT quy định định mức trung bình theo tuần và cách xác định định mức theo năm học, đồng thời có các chế độ giảm và quy đổi. Các giá trị không được viết cố định trong mã nguồn. `WorkloadPolicy` phải có thời gian hiệu lực, phạm vi áp dụng, căn cứ và công thức cấu hình.

### 8.5. Lập và tối ưu phương án

- Tạo phương án mới.
- Sao chép phương án cũ.
- Khóa phân công bắt buộc.
- Cấm một số cặp giáo viên - nhu cầu.
- Cấu hình quy tắc cứng và mềm.
- Chạy thuật toán đề xuất.
- Theo dõi trạng thái tác vụ tối ưu.
- Dừng tác vụ và lấy lời giải tốt nhất hiện có.
- Lưu cấu hình, điểm số, thời gian chạy và trạng thái solver.
- Điều chỉnh thủ công bằng bảng hoặc kéo thả.
- Tái tối ưu nhưng giữ nguyên các phân công đã khóa.

### 8.6. Kiểm tra và giải thích

Thông báo phải nêu nguyên nhân cụ thể, ví dụ:

- `Giáo viên không có chuyên môn phù hợp với môn Vật lý.`
- `Phân công này làm khối lượng vượt định mức 5 tiết.`
- `Giáo viên không hoạt động trong học kỳ đang xét.`
- `Nhu cầu đã được khóa cho giáo viên khác.`

Đối với nhu cầu chưa phân công được, hệ thống phải phân tích cung - cầu, ví dụ:

> Khối 9 cần 24 tiết Vật lý; tổng năng lực còn lại của giáo viên đủ điều kiện là 18 tiết; thiếu tối thiểu 6 tiết.

Mỗi đề xuất nên hiển thị các yếu tố chính:

- Chuyên môn phù hợp ở mức nào.
- Tải trước và sau khi phân công.
- Quy tắc nào được đáp ứng.
- Điểm phạt hoặc lợi ích của lựa chọn.
- Lựa chọn thay thế gần nhất nếu có.

### 8.7. Phê duyệt và báo cáo

- Gửi phương án để duyệt.
- Từ chối kèm lý do.
- Phê duyệt và công bố.
- Lưu lịch sử phiên bản.
- Xuất bảng phân công theo giáo viên.
- Xuất bảng phân công theo lớp, môn và tổ.
- Thống kê thiếu/vượt định mức.
- Liệt kê nhu cầu chưa được phủ.
- So sánh hai phương án.
- Thống kê thay đổi sau khi tái tối ưu.
- Xuất Excel và PDF.

## 9. Ràng buộc nghiệp vụ

### 9.1. Ràng buộc cứng

- Mỗi nhu cầu được giao đúng số giáo viên theo chính sách.
- Giáo viên phải đủ điều kiện chuyên môn.
- Giáo viên phải hoạt động trong học kỳ.
- Phân công bị cấm không được sử dụng.
- Phân công đã khóa phải được giữ nguyên.
- Không vượt giới hạn tuyệt đối nếu đơn vị cấu hình.
- Tổng số tiết phân bổ cho một nhu cầu phải bằng số tiết yêu cầu.
- Phân môn tích hợp phải được giao đúng người đủ năng lực.
- Dữ liệu thuộc đúng năm học và học kỳ của phương án.

### 9.2. Ràng buộc mềm

- Khối lượng gần định mức.
- Cân bằng tỷ lệ tải giữa các giáo viên.
- Hạn chế số môn khác nhau mà một giáo viên phải chuẩn bị.
- Hạn chế số khối lớp khác nhau.
- Ưu tiên chuyên môn chính.
- Duy trì giáo viên đã dạy lớp hoặc môn ở kỳ trước.
- Tôn trọng nguyện vọng.
- Giảm thay đổi so với phương án đang sử dụng.
- Ưu tiên giáo viên có kinh nghiệm cho lớp đặc thù.

Một quy tắc có thể là cứng ở đơn vị này nhưng mềm ở đơn vị khác. Vì vậy, cần cấu hình loại, trọng số, phạm vi và thời gian hiệu lực thay vì đặt trực tiếp trong mã nguồn.

## 10. Mô hình tối ưu

Gọi:

- $T$: tập giáo viên.
- $D$: tập nhu cầu giảng dạy.
- $h_d$: số tiết của nhu cầu $d$.
- $a_{td}$: bằng 1 nếu giáo viên $t$ đủ điều kiện dạy nhu cầu $d$.
- $x_{td}$: bằng 1 nếu giáo viên $t$ được giao nhu cầu $d$.
- $u_d$: bằng 1 nếu nhu cầu $d$ chưa được phân công.

### 10.1. Phủ nhu cầu

$$
\sum_{t \in T} x_{td} + u_d = 1, \quad \forall d \in D
$$

Biến $u_d$ giúp mô hình vẫn trả về một phương án có thể phân tích khi thiếu giáo viên.

### 10.2. Đúng chuyên môn

$$
x_{td} \leq a_{td}
$$

### 10.3. Khối lượng giáo viên

$$
W_t = q_t + \sum_{d \in D} h_d x_{td}
$$

Trong đó $q_t$ là số tiết được quy đổi từ nhiệm vụ khác.

$$
N_t = b_t - r_t
$$

Trong đó:

- $b_t$: định mức cơ sở.
- $r_t$: tổng số tiết được giảm.
- $N_t$: định mức được công nhận.

Độ lệch được tuyến tính hóa bằng:

$$
W_t - N_t = \text{over}_t - \text{under}_t
$$

### 10.4. Mục tiêu tối ưu

Ưu tiên theo thứ tự:

1. Giảm số tiết chưa có giáo viên.
2. Đưa số vi phạm ràng buộc cứng về 0.
3. Giảm vượt định mức nghiêm trọng.
4. Giảm tổng độ lệch định mức.
5. Tăng mức phù hợp chuyên môn.
6. Giảm số môn và khối khác nhau trên mỗi giáo viên.
7. Duy trì tính liên tục.
8. Giảm số thay đổi so với phương án hiện tại.

Với Timefold, có thể biểu diễn theo `HardMediumSoftLongScore` hoặc một dạng điểm nhiều tầng phù hợp. Ràng buộc pháp lý và chuyên môn nằm ở tầng hard; thiếu phủ nhu cầu có thể dùng tầng medium với mức phạt rất lớn để mô hình vẫn sinh được phương án giải thích; các tiêu chí cân bằng và sở thích nằm ở tầng soft.

Không nên dựa hoàn toàn vào một tổng trọng số tùy ý. Cần ghi nhận lý do chọn trọng số, xác nhận với người dùng nghiệp vụ và thực hiện phân tích độ nhạy.

## 11. Thuật toán

### 11.1. Baseline cho giai đoạn 1

Thuật toán tham lam:

1. Tính danh sách giáo viên đủ điều kiện cho mỗi nhu cầu.
2. Sắp xếp nhu cầu theo số giáo viên đủ điều kiện tăng dần.
3. Nếu bằng nhau, ưu tiên nhu cầu có số tiết lớn hơn.
4. Chọn giáo viên có mức phù hợp cao và tỷ lệ tải hiện tại thấp.
5. Thực hiện một số phép đổi chéo để giảm quá tải.

Baseline dễ hiện thực, dễ kiểm thử và là mốc so sánh cho luận văn.

### 11.2. Bộ tối ưu cho giai đoạn 2

Sử dụng **Timefold Solver** được nhúng trực tiếp trong ứng dụng Spring Boot.

Mô hình Timefold dự kiến:

- `TeachingRequirement` hoặc một lớp trung gian là planning entity.
- `Teacher` là planning value.
- Năm học, học kỳ, môn, lớp, chuyên môn và chính sách là problem facts.
- `teacher` là planning variable của nhu cầu.
- `ConstraintProvider` định nghĩa hard/medium/soft constraints.
- `AssignmentPlanSolution` là planning solution.
- `SolverManager` chạy tác vụ bất đồng bộ và cho phép theo dõi tiến độ.

Lý do chọn Timefold:

- Viết bằng Java và tích hợp tự nhiên với Spring Boot.
- Phù hợp mô hình ràng buộc cứng/mềm.
- Không cần vận hành thêm một dịch vụ Python.
- Thuận tiện cho tái tối ưu, ghim giá trị và giải thích điểm ràng buộc.
- Giúp nhóm duy trì một backend thống nhất.

Không cần bổ sung Machine Learning nếu chưa có dữ liệu lịch sử đủ lớn và mục tiêu dự báo rõ ràng. Đây là bài toán tối ưu ràng buộc, không phải bài toán sinh nội dung.

## 12. Thiết kế cơ sở dữ liệu

### 12.1. Sơ đồ khái quát

```text
AcademicYear
 ├── Semester
 ├── ClassGroup ── GradeLevel ── SchoolLevel
 ├── Teacher ── Department
 │    ├── TeacherCompetency ── Subject
 │    └── TeacherWorkloadAdjustment
 ├── TeachingRequirement ── ClassGroup + Subject + Semester
 └── AssignmentPlan
      ├── TeachingAssignment
      ├── ConstraintConfiguration
      ├── OptimizationRun
      └── ConstraintViolation
```

### 12.2. Các thực thể chính

| Thực thể | Vai trò |
|---|---|
| `AcademicYear` | Năm học và trạng thái |
| `Semester` | Học kỳ thuộc năm học |
| `SchoolLevel` | Cấp học |
| `GradeLevel` | Khối lớp |
| `ClassGroup` | Lớp theo năm học |
| `Department` | Tổ chuyên môn |
| `Subject` | Môn học |
| `SubjectComponent` | Phân môn của môn tích hợp |
| `Teacher` | Hồ sơ và trạng thái giáo viên |
| `TeacherCompetency` | Phạm vi chuyên môn của giáo viên |
| `WorkloadPolicy` | Chính sách định mức có phiên bản |
| `TeacherWorkloadAdjustment` | Giảm tiết hoặc quy đổi riêng |
| `TeachingRequirement` | Nhu cầu lớp - môn - học kỳ |
| `AssignmentPlan` | Một kịch bản phân công |
| `TeachingAssignment` | Kết quả gán giáo viên vào nhu cầu |
| `ConstraintConfiguration` | Cấu hình quy tắc và trọng số |
| `OptimizationRun` | Thông tin một lần chạy solver |
| `ConstraintViolation` | Cảnh báo hoặc vi phạm được phát hiện |
| `AuditLog` | Nhật ký hành động và thay đổi |

Không đặt trực tiếp `teacher_id` trong bảng lớp - môn vì cách đó không hỗ trợ nhiều phương án, lịch sử và so sánh kịch bản.

### 12.3. Yêu cầu toàn vẹn dữ liệu

- Mã giáo viên duy nhất trong phạm vi trường.
- Một lớp chỉ thuộc một khối và một năm học.
- Nhu cầu không được trùng tổ hợp lớp, môn, học kỳ và nhóm.
- Số tiết phải lớn hơn 0.
- Chính sách định mức không được có hai khoảng hiệu lực chồng chéo cho cùng phạm vi.
- Phân công phải thuộc cùng năm học với phương án.
- Phương án đã công bố không được cập nhật trực tiếp.
- Các trường số tiết nên dùng kiểu số cho phép phần thập phân nếu nghiệp vụ quy đổi yêu cầu.

## 13. Kiến trúc hệ thống

### 13.1. Kiến trúc tổng thể

```text
React + TypeScript
        │ REST/JSON
        ▼
Java Spring Boot modular monolith
 ├── Authentication & Authorization
 ├── Academic Data
 ├── Teacher & Competency
 ├── Workload Policy
 ├── Assignment Planning
 ├── Timefold Optimization
 ├── Reporting
 └── Audit
        │
        ▼
PostgreSQL
```

Kiến trúc modular monolith phù hợp nhóm ba người vì đơn giản hơn microservices nhưng vẫn tách rõ miền nghiệp vụ. Bộ tối ưu có thể tách thành module Java riêng mà không phải triển khai thành dịch vụ độc lập.

### 13.2. Công nghệ đề xuất

| Thành phần | Công nghệ |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Java, Spring Boot |
| Tối ưu | Timefold Solver |
| Cơ sở dữ liệu | PostgreSQL |
| ORM | Spring Data JPA / Hibernate |
| Migration | Flyway |
| Bảo mật | Spring Security |
| API documentation | Springdoc OpenAPI |
| Excel | Apache POI |
| Kiểm thử backend | JUnit 5, Mockito, Spring Boot Test, Testcontainers |
| Kiểm thử frontend/E2E | Vitest, Playwright |
| Đóng gói | Docker, Docker Compose |
| CI | GitHub Actions hoặc hệ thống tương đương |

Nên chọn JDK được Spring Boot và phiên bản Timefold sử dụng hỗ trợ chính thức; Java 21 là lựa chọn nền ổn định cho thiết kế ban đầu. Phiên bản thư viện cụ thể phải được khóa trong `pom.xml` và cập nhật có kiểm soát.

### 13.3. Cấu trúc module backend đề xuất

```text
com.project.teachingassignment
 ├── auth
 ├── user
 ├── academic
 ├── teacher
 ├── competency
 ├── workload
 ├── planning
 ├── optimization
 ├── reporting
 ├── audit
 └── shared
```

Mỗi module nên chứa `domain`, `application`, `infrastructure` và `api` ở mức cần thiết. Không để controller truy cập repository trực tiếp; quy tắc nghiệp vụ phải đi qua application/domain service.

### 13.4. Luồng chạy tối ưu

1. API nhận yêu cầu chạy solver.
2. Backend kiểm tra dữ liệu và tạo `OptimizationRun`.
3. Hệ thống dựng `AssignmentPlanSolution` từ cơ sở dữ liệu.
4. `SolverManager` chạy nền.
5. Best solution được cập nhật định kỳ.
6. Người dùng theo dõi trạng thái qua polling hoặc Server-Sent Events.
7. Khi hoàn tất, kết quả được chuyển thành `TeachingAssignment`.
8. Hệ thống tính lại cảnh báo và báo cáo.

Mỗi lần chạy phải lưu:

- Cấu hình ràng buộc.
- Phiên bản chính sách.
- Dấu vết bộ dữ liệu đầu vào.
- Thời gian giới hạn.
- Seed nếu có.
- Điểm ban đầu và cuối.
- Trạng thái kết thúc.
- Thời gian chạy.

## 14. Yêu cầu phi chức năng

### 14.1. Tính đúng đắn

- Không lưu được phân công vi phạm ràng buộc cứng nếu không có cơ chế ngoại lệ được phê duyệt.
- Công thức định mức phải có unit test.
- Kết quả báo cáo phải khớp với phương án đã duyệt.
- Solver phải được kiểm tra bằng các bộ dữ liệu nhỏ có đáp án biết trước.

### 14.2. Hiệu năng

- API thông thường phản hồi trong khoảng dưới 2 giây ở tải mục tiêu.
- Tác vụ tối ưu được chạy nền và có giới hạn thời gian.
- Với bộ dữ liệu trung bình, mục tiêu ban đầu là tìm được phương án khả thi trong 30-60 giây.
- Nếu hết thời gian, hệ thống trả về lời giải tốt nhất cùng trạng thái chưa chứng minh tối ưu.
- Mọi mục tiêu hiệu năng phải được xác nhận lại bằng benchmark thực tế.

### 14.3. Bảo mật và riêng tư

- Phân quyền theo vai trò và phạm vi tổ chuyên môn.
- Mật khẩu được băm bằng thuật toán an toàn do Spring Security hỗ trợ.
- Không thu thập dữ liệu cá nhân không cần thiết.
- Dữ liệu thử nghiệm phải ẩn danh.
- Ghi nhật ký các thao tác quan trọng.
- Không ghi mật khẩu, token hoặc thông tin nhạy cảm vào log.
- Có quy trình sao lưu và phục hồi PostgreSQL.

### 14.4. Khả năng bảo trì

- Migration cơ sở dữ liệu bằng Flyway.
- Quy tắc không được rải trong controller hoặc giao diện.
- Chính sách và trọng số có phiên bản.
- API được mô tả bằng OpenAPI.
- Pull request phải có ít nhất một người khác review.
- Có test cho luồng nghiệp vụ quan trọng.

### 14.5. Khả năng giải thích và kiểm toán

- Mỗi cảnh báo phải có mã, mô tả và dữ liệu liên quan.
- Mỗi lần chỉnh sửa thủ công phải lưu người sửa, thời gian và lý do.
- Có thể so sánh trước/sau giữa hai phiên bản.
- Người quản lý có quyền quyết định cuối cùng; solver chỉ đề xuất.

## 15. Phân tích hệ thống tương tự và khoảng trống

Các nhóm giải pháp cần khảo sát:

| Nhóm | Điểm mạnh | Vấn đề cần nghiên cứu |
|---|---|---|
| Excel và phân công thủ công | Linh hoạt, quen thuộc | Dễ sai, khó tối ưu, khó truy vết |
| Nền tảng quản lý trường học | Tích hợp nhiều nghiệp vụ | Cách tối ưu và giải thích thường không được công khai |
| Khung solver như Timefold | Mạnh về tối ưu ràng buộc | Không phải sản phẩm nghiệp vụ hoàn chỉnh |

Tài liệu công khai của MISA EMIS cho biết hệ thống có hỗ trợ phân công giáo viên và lập thời khóa biểu. Vì vậy, tính mới của đồ án không nên chỉ là màn hình phân công. Hướng tạo khác biệt:

- Giải thích từng đề xuất.
- Chẩn đoán nguyên nhân thiếu giáo viên.
- Tái tối ưu trong khi giữ phân công đã khóa.
- So sánh nhiều kịch bản.
- Mô hình hóa chính sách định mức theo thời gian hiệu lực.
- Đánh giá công bằng bằng chỉ số định lượng.

Không khẳng định sản phẩm thương mại thiếu một chức năng nếu nhóm chưa khảo sát và kiểm chứng trực tiếp.

## 16. Kế hoạch hai giai đoạn

### 16.1. Giai đoạn 1 - Đồ án chuyên ngành

Mục tiêu là có một MVP chạy xuyên suốt:

- Khảo sát ít nhất một trường hoặc tổ chuyên môn.
- Mô tả quy trình hiện tại và quy trình đề xuất.
- Viết đặc tả yêu cầu.
- Thiết kế use case, ERD và kiến trúc.
- Quản lý giáo viên, lớp, môn và năm học.
- Quản lý ma trận chuyên môn.
- Cấu hình định mức cơ bản.
- Import dữ liệu từ Excel.
- Phân công thủ công.
- Kiểm tra sai chuyên môn, thiếu và vượt định mức.
- Thuật toán tham lam tạo phương án ban đầu.
- Dashboard và xuất báo cáo cơ bản.
- Unit test và integration test cho luồng chính.

### 16.2. Giai đoạn 2 - Luận văn tốt nghiệp

- Hoàn thiện mô hình Timefold.
- Tối ưu đa mục tiêu.
- Cấu hình hard/medium/soft constraints.
- Khóa và tái tối ưu một phần.
- Nhiều kịch bản và so sánh kịch bản.
- Giải thích điểm và chẩn đoán thiếu nguồn lực.
- Hỗ trợ môn tích hợp hoặc chia nhu cầu nếu dữ liệu thực tế yêu cầu.
- Quy trình phê duyệt và nhật ký đầy đủ.
- Kiểm thử bảo mật và hiệu năng.
- Triển khai hệ thống.
- So sánh thủ công, greedy và Timefold.
- Đánh giá người dùng và viết luận văn.

## 17. Phân công nhóm ba thành viên

Việc phân công nên theo trục trách nhiệm chính nhưng mọi thành viên vẫn phải hiểu toàn hệ thống, review chéo và cùng tham gia tích hợp.

| Thành viên | Trách nhiệm chính | Hạng mục cụ thể |
|---|---|---|
| Thành viên 1 - Backend/Architecture | Kiến trúc, nghiệp vụ nền và dữ liệu | Spring Boot, PostgreSQL, Flyway, JPA, auth/RBAC, năm học, lớp, môn, giáo viên, API và tích hợp |
| Thành viên 2 - Optimization/Research | Thuật toán và đánh giá khoa học | Mô hình toán, greedy baseline, Timefold domain/constraints, giải thích, benchmark và phân tích kết quả |
| Thành viên 3 - Frontend/Quality/Delivery | Trải nghiệm người dùng và chất lượng phát hành | React, màn hình phân công, dashboard, import/export, E2E, Docker, CI và tài liệu sử dụng |

### 17.1. Trách nhiệm chung

Cả ba thành viên cùng thực hiện:

- Khảo sát nghiệp vụ.
- Xác nhận hard/soft constraints.
- Review pull request.
- Viết test cho phần mình phụ trách.
- Chuẩn bị dữ liệu demo.
- Viết báo cáo và thuyết trình.
- Trực tiếp trình bày được luồng end-to-end.

### 17.2. Phân chia theo giai đoạn

#### Giai đoạn 1

- **Thành viên 1:** dựng backend, cơ sở dữ liệu, bảo mật và API dữ liệu nền.
- **Thành viên 2:** đặc tả quy tắc, hiện thực bộ kiểm tra và greedy baseline.
- **Thành viên 3:** xây frontend, luồng nhập dữ liệu, phân công thủ công và báo cáo.
- **Cả nhóm:** tích hợp, kiểm thử MVP, thu thập phản hồi và hoàn thiện báo cáo.

#### Giai đoạn 2

- **Thành viên 1:** hoàn thiện workflow phương án, phê duyệt, audit, hiệu năng API và triển khai.
- **Thành viên 2:** hiện thực Timefold, giải thích, tái tối ưu, benchmark và đánh giá thuật toán.
- **Thành viên 3:** giao diện scenario comparison, constraint explanation, dashboard, E2E và tài liệu người dùng.
- **Cả nhóm:** thử nghiệm người dùng, phân tích kết quả, viết luận văn và chuẩn bị bảo vệ.

### 17.3. Quy tắc phối hợp

- Dùng issue cho từng chức năng và tiêu chí chấp nhận.
- Mỗi pull request cần ít nhất một thành viên khác review.
- Không để một thành viên sở hữu độc quyền phần dữ liệu hoặc thuật toán.
- Tích hợp liên tục theo tuần, không đợi cuối giai đoạn mới ghép module.
- Demo nội bộ định kỳ bằng dữ liệu chung.
- Tất cả quyết định nghiệp vụ quan trọng được ghi trong `docs`.
- Thành viên 2 không làm solver tách rời; solver phải được tích hợp qua API và UI ngay từ các phiên bản sớm.

## 18. Dữ liệu thử nghiệm và đánh giá

### 18.1. Bộ dữ liệu đề xuất

| Bộ | Giáo viên | Lớp | Nhu cầu lớp - môn |
|---|---:|---:|---:|
| Nhỏ | 20 | 10 | 100-150 |
| Trung bình | 60 | 30 | 350-500 |
| Lớn | 120 | 60 | 700-1.000 |

Nếu có thể, cần ít nhất một bộ dữ liệu thực đã ẩn danh gồm:

- Bảng phân công cũ.
- Danh sách lớp và số tiết.
- Danh sách giáo viên theo môn.
- Định mức và nhiệm vụ kiêm nhiệm.
- Các phân công bắt buộc hoặc bị hạn chế.

### 18.2. Chỉ số đánh giá

- Tỷ lệ nhu cầu được phân công.
- Tổng số tiết chưa có giáo viên.
- Số phân công sai chuyên môn, mục tiêu bằng 0.
- Độ lệch trung bình so với định mức.
- Mức vượt lớn nhất.
- Độ lệch chuẩn của tỷ lệ tải.
- Số môn khác nhau trung bình trên mỗi giáo viên.
- Tỷ lệ giữ lại phân công cũ.
- Thời gian chạy.
- Số thao tác điều chỉnh thủ công.
- Thời gian người dùng cần để hoàn thiện phương án.

Chỉ số tải chuẩn hóa:

$$
\text{LoadRatio}_t = \frac{\text{Khối lượng được công nhận}_t}{\text{Định mức được công nhận}_t}
$$

Không nên đánh giá công bằng bằng số tiết thô vì giáo viên thường, người kiêm nhiệm và cán bộ quản lý có định mức khác nhau.

### 18.3. Phương án đối chứng

Luận văn so sánh tối thiểu:

1. Phương án thủ công hoặc dữ liệu lịch sử.
2. Thuật toán tham lam.
3. Timefold Solver.

Nên báo cáo từng chỉ số riêng thay vì chỉ công bố một điểm tổng hợp. Nếu solver có yếu tố ngẫu nhiên, chạy lặp nhiều lần với giới hạn thời gian và seed được ghi nhận.

## 19. Chiến lược kiểm thử

- **Unit test:** công thức định mức, giảm tiết, quy đổi và kiểm tra chuyên môn.
- **Constraint test:** dùng `ConstraintVerifier` để kiểm tra từng Timefold constraint độc lập.
- **Solver test:** bộ dữ liệu nhỏ có kết quả biết trước.
- **Property/invariant test:** không có nhu cầu bị phân công trùng ngoài chính sách cho phép.
- **Repository test:** PostgreSQL thật qua Testcontainers.
- **Integration test:** nhập dữ liệu → chạy tối ưu → lưu phương án → xuất báo cáo.
- **End-to-end test:** toàn bộ quy trình của người quản lý bằng Playwright.
- **Performance test:** bộ dữ liệu nhỏ, trung bình và lớn.
- **Security test:** kiểm tra phân quyền và truy cập chéo vai trò.
- **User acceptance test:** cán bộ chuyên môn dùng thử và đánh giá.
- **Usability test:** thời gian hoàn thành tác vụ, số lỗi và thang SUS nếu đủ người tham gia.

## 20. Tiêu chí chấp nhận tham khảo

- Không có phân công sai chuyên môn trong phương án được duyệt.
- Mọi nhu cầu đều được phân công hoặc có trạng thái chưa phân công kèm nguyên nhân.
- Mọi cảnh báo có mã và thông tin giải thích.
- Có thể khóa một phân công và tái tối ưu phần còn lại.
- Có thể tạo, lưu và so sánh ít nhất hai kịch bản.
- Bộ dữ liệu trung bình tìm được phương án khả thi trong giới hạn thời gian đã công bố.
- Khi hết thời gian, hệ thống vẫn trả lời giải tốt nhất cùng trạng thái solver.
- Mọi chỉnh sửa quan trọng có audit log.
- Báo cáo khớp dữ liệu phương án đã duyệt.
- Quy trình cài đặt và chạy được tái lập bằng Docker Compose.

## 21. Rủi ro và biện pháp giảm thiểu

### 21.1. Không có dữ liệu thực

Dữ liệu tổng hợp có thể kiểm thử kỹ thuật nhưng tính thuyết phục thấp. Nhóm nên xin dữ liệu đã ẩn danh và ít nhất một buổi xác nhận kết quả với người làm chuyên môn.

### 21.2. Quy tắc nghiệp vụ không rõ

Mỗi quy tắc phải được ghi nhận thành một trong bốn loại:

- Bắt buộc.
- Có thể vi phạm nếu được phê duyệt.
- Chỉ là mong muốn.
- Chưa thuộc phạm vi.

### 21.3. Gán trọng số tùy ý

- Xác nhận trọng số với người dùng nghiệp vụ.
- Ưu tiên điểm nhiều tầng.
- Thực hiện phân tích độ nhạy.
- Trình bày kết quả theo từng tiêu chí.

### 21.4. Không có lời giải

- Dùng trạng thái chưa phân công thay vì làm mô hình hoàn toàn vô nghiệm.
- Kiểm tra cung - cầu trước khi chạy solver.
- Chỉ ra ràng buộc gây thiếu.
- Cho phép nới ràng buộc mềm và chạy lại.

### 21.5. Mở rộng sang thời khóa biểu quá sớm

Giải đồng thời giáo viên, tiết, ngày và phòng làm số biến tăng mạnh. Nhóm phải giữ ranh giới phạm vi và chỉ mở rộng sau khi phần phân công đã hoàn chỉnh.

### 21.6. Phụ thuộc một thành viên

- Review chéo mã nguồn.
- Viết tài liệu thiết kế solver và cơ sở dữ liệu.
- Pair programming ở các phần rủi ro cao.
- Mỗi module quan trọng có ít nhất hai người hiểu và chạy được.

### 21.7. Gọi hệ thống là AI không có cơ sở

Nên dùng thuật ngữ **hệ thống hỗ trợ quyết định** và **tối ưu hóa ràng buộc**. Không cần bổ sung chatbot chỉ để tạo cảm giác có AI.

## 22. Câu hỏi cần xác nhận khi khảo sát

1. Hệ thống áp dụng cho tiểu học, THCS, THPT hay trường nhiều cấp?
2. Định mức được xét theo tuần, học kỳ hay cả năm?
3. Một môn của một lớp có được chia cho nhiều giáo viên không?
4. Vượt định mức bị cấm hay chỉ cần cảnh báo/phê duyệt?
5. Xử lý giáo viên hợp đồng, thỉnh giảng hoặc liên trường như thế nào?
6. Môn tích hợp được chia theo phân môn ra sao?
7. Giáo viên nghỉ hoặc chuyển công tác giữa năm được xử lý thế nào?
8. Quy tắc nào là quy định pháp lý, quy tắc nào là quy định nội bộ?
9. Ai có quyền sửa, khóa, duyệt và công bố phương án?
10. Nhà trường dùng tiêu chí nào để nhận định một phương án là tốt?
11. Có cần duy trì giáo viên giữa hai học kỳ hoặc hai năm liên tiếp không?
12. Có giới hạn số lớp, số môn hoặc số khối tối đa trên mỗi giáo viên không?

## 23. Cấu trúc báo cáo đề xuất

1. Giới thiệu đề tài và vấn đề thực tế.
2. Cơ sở lý thuyết và nghiên cứu liên quan.
3. Khảo sát, phân tích nghiệp vụ và yêu cầu.
4. Mô hình toán học và phương pháp tối ưu.
5. Thiết kế kiến trúc, cơ sở dữ liệu và giao diện.
6. Hiện thực hệ thống bằng Spring Boot và Timefold.
7. Thử nghiệm và đánh giá.
8. Kết luận và hướng phát triển.

## 24. Tài liệu tham khảo ban đầu

1. Bộ Giáo dục và Đào tạo, **Thông tư 05/2025/TT-BGDĐT quy định chế độ làm việc đối với giáo viên phổ thông, dự bị đại học**: <https://chinhphu.vn/?classid=1&docid=213113&orggroupid=4&pageid=27160>
2. Timefold, **Timefold Solver Documentation**: <https://docs.timefold.ai/timefold-solver/latest/introduction>
3. Google, **OR-Tools Employee Scheduling**: <https://developers.google.com/optimization/scheduling/employee_scheduling>
4. MISA, **Tài liệu giới thiệu nghiệp vụ quản lý học sinh và phân công giảng dạy MISA EMIS**: <https://emis.misa.vn/emisconglap/qlth/documents/QuanLy_HocSinh.pdf>
5. M. Johannesson và cộng sự, **A General Formulation for the Teacher Assignment Problem: Computational Analysis Over a Real-World Dataset**: <https://research.chalmers.se/publication/552094/file/552094_Fulltext.pdf>
6. B. Domenech và A. Lusa, **A MILP Model for the Teacher Assignment Problem Considering Teachers' Preferences**, European Journal of Operational Research, 2016: <https://upcommons.upc.edu/entities/publication/8c7700e0-698b-4bbb-8cf3-a43165ea90c4>

## 25. Kết luận định hướng

Định hướng phù hợp nhất cho nhóm ba người là:

> **Giai đoạn 1 xây dựng nền tảng quản lý, kiểm tra quy tắc và thuật toán tham lam; giai đoạn 2 phát triển bộ tối ưu Timefold, giải thích kết quả, mô phỏng kịch bản, triển khai và đánh giá thực nghiệm.**

Cốt lõi học thuật không nằm ở số lượng màn hình CRUD mà nằm ở việc trả lời được:

1. Thế nào là một phương án hợp lệ?
2. Thế nào là một phương án tốt và công bằng?
3. Hệ thống giải thích thế nào khi không thể đáp ứng toàn bộ nhu cầu?
4. Kết quả tối ưu tốt hơn phương án thủ công hoặc baseline ở mức nào?

Nếu giữ đúng phạm vi, sử dụng Spring Boot cùng Timefold và tổ chức phối hợp tốt giữa ba thành viên, đề tài có đủ độ rộng về công nghệ phần mềm và đủ độ sâu về nghiên cứu cho cả hai giai đoạn.
