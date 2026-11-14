> Archived historical document. Dates, test counts and decisions below describe its original milestone. Current status: [backend documentation](../../../../backend/docs/README.md).

# Kịch bản báo cáo tiến độ dự án TASS

**Mốc nội dung:** 09/11/2026.  
**Người trình bày:** đại diện nhóm, xưng “em/nhóm em” với giảng viên.  
**Thời lượng dự kiến:** khoảng 10–12 phút, tùy mức độ giải thích thuật toán.  
**Cách dùng:** đọc phần A; phần B và C dùng để đối chiếu số liệu và trả lời câu hỏi. Các chỉ dẫn trong ngoặc vuông không cần đọc.

## A. Lời trình bày

### 1. Mở đầu: dự án đang ở giai đoạn nào?

Em chào thầy. Hôm nay em xin báo cáo tiến độ của nhóm với đề tài TASS, hệ thống hỗ trợ phân công giảng dạy theo học kỳ.

Trong giai đoạn vừa rồi, nhóm tập trung vào ba phần chính: thống nhất lại yêu cầu và tài liệu kỹ thuật; xây dựng nền dữ liệu và khung backend API; đồng thời hoàn thiện module thuật toán và kiểm chứng bằng các thuật toán đối chứng.

Đến thời điểm hiện tại, nhóm đã có schema cơ sở dữ liệu 48 bảng, khung backend với API CRUD cho 16 nhóm dữ liệu đầu vào, và ba thuật toán có thể chạy độc lập để sinh phương án phân công. Nhóm cũng đã thống nhất luồng chức năng và hợp đồng trao đổi dữ liệu để các phần backend, thuật toán và giao diện có thể tích hợp với nhau. Phần giao diện hiện đang được dựng wireframe cơ bản.

Sau đây em xin trình bày phần nền hệ thống trước, sau đó đi sâu hơn vào thuật toán và kết quả so sánh.

### 2. Những việc đã thực hiện về tài liệu, cơ sở dữ liệu và backend

[Có thể mở ERD và cấu trúc thư mục backend khi trình bày.]

Về tài liệu, nhóm đã rà soát và hiệu chỉnh lại báo cáo kỹ thuật, thống nhất các quy tắc nghiệp vụ với mô hình dữ liệu và mô hình thuật toán hiện hành. Những nội dung như cách tính tải, điều kiện giáo viên được nhận phân công, khóa phân công và thứ tự ưu tiên tối ưu đã được làm rõ để các thành viên cùng triển khai theo một cách hiểu.

Nhóm cũng đã rút gọn những phần trùng lặp trong báo cáo và bổ sung hướng dẫn môi trường LaTeX để các thành viên có thể cùng chỉnh sửa, tự biên dịch tài liệu trên máy và quản lý nguồn qua Git.

Về cơ sở dữ liệu, nhóm đã dựng schema PostgreSQL gồm 48 bảng, kèm dữ liệu minh họa và bộ truy vấn đối chiếu. Các nhóm dữ liệu chính bao gồm hồ sơ giáo viên, chuyên môn và kinh nghiệm; lớp, môn học và nhu cầu giảng dạy; định mức và nhiệm vụ; phương án, phiên bản phân công và các thông tin phục vụ kiểm tra, phản hồi, truy vết.

Thiết kế dữ liệu đã tính đến hiệu lực theo thời gian và lịch sử thay đổi. Chẳng hạn, dữ liệu chuyên môn hoặc định mức cần đúng trong khoảng thời gian đang phân công; một phương án cũng cần gắn với phiên bản dữ liệu đầu vào để biết kết quả còn phù hợp khi dữ liệu nguồn thay đổi hay không.

Về backend, nhóm đã dựng khung bằng Java và Spring Boot, tổ chức thành các lớp controller, service, repository, entity, request, DTO và mapper. Hiện đã có 16 bộ CRUD cho dữ liệu đầu vào, với các thao tác thêm, xem, sửa, xóa và phân trang. Đây là nền để nhóm tiếp tục triển khai các nghiệp vụ tổng hợp và kết nối giao diện.

Nhóm đã thống nhất cách tổ chức API giữa các tính năng, từ tên trường trao đổi, luồng chuẩn bị dữ liệu đến luồng tạo phương án và đọc kết quả. Phần đã đạt được là khung triển khai cùng hướng tích hợp thống nhất; công việc tiếp theo là đồng bộ đầy đủ mapping theo schema mới và nối các API nghiệp vụ với solver, phân quyền và cơ chế lưu phương án.

### 3. Giới thiệu bài toán mà thuật toán giải quyết

[Chuyển sang sơ đồ luồng hoặc phần mô hình trong báo cáo.]

Bài toán của nhóm là: với một tập nhu cầu giảng dạy của các lớp trong học kỳ và hồ sơ giáo viên tương ứng, hệ thống cần đề xuất giáo viên cho từng nhu cầu, bảo đảm điều kiện chuyên môn, công tác và các giới hạn tải được cung cấp.

Đầu vào của thuật toán là một bản chụp dữ liệu đã được chuẩn hóa, gồm giáo viên, nhu cầu, điều kiện đủ năng lực, định mức, tải hiện có, kinh nghiệm, phân công trước đó và những phân công đã khóa. Đầu ra gồm danh sách phân công, tải của từng giáo viên, phần còn thiếu, các chỉ số đánh giá và trạng thái của lượt giải.

Mỗi thành phần nhu cầu được giao tối đa cho một giáo viên. Các thành phần như tiết thường, chuyên đề và tăng cường được xét riêng, theo mô hình đã thống nhất. Nếu một nhu cầu không có ứng viên phù hợp hoặc không thể gán mà vẫn giữ giới hạn cứng, kết quả có thể để nhu cầu đó chưa được phân công và kèm lý do.

Nhóm tách rõ hai lớp tiêu chí. Lớp đầu là điều kiện cứng, như chuyên môn phù hợp, dữ liệu hiệu lực và giữ nguyên các phân công đã khóa. Lớp tiếp theo là các mục tiêu lựa chọn phương án tốt hơn trong tập phương án hợp lệ, như giảm thiếu, cân bằng tải và ưu tiên kinh nghiệm.

### 4. Cách tối ưu của mô hình hiện tại

Mô hình hiện tại tối ưu theo năm bước, theo đúng thứ tự ưu tiên.

Thứ nhất là giảm số thành phần nhu cầu chưa được phân công. Nghĩa là trước hết hệ thống cố gắng đáp ứng được nhiều nhu cầu nhất trong điều kiện nguồn lực và ràng buộc cho phép.

Thứ hai là giảm tổng độ lệch giữa tải và định mức của các giáo viên có mục tiêu tải áp dụng. Khi tính tải, nhóm xét cả phần phân công trong bài toán, tải cố định ngoài phạm vi, hoạt động quy đổi và phần nhiệm vụ hoặc giảm trừ đã được ghi nhận. Vì vậy, việc cân bằng dựa trên toàn bộ tải cần đối soát của giáo viên.

Thứ ba là giảm độ lệch lớn nhất của một giáo viên. Bước này giúp phân biệt những phương án có cùng tổng độ lệch, nhưng một phương án lại tập trung phần lệch quá nhiều vào một người.

Thứ tư là giảm điểm phạt kinh nghiệm, tức ưu tiên giáo viên có kinh nghiệm phù hợp với môn và khối theo cấu hình. Trong mô hình hiện hành, khối 9 và khối 12 được đặt trọng số cao hơn các khối khác.

Cuối cùng là giảm số thay đổi so với phương án trước đó khi bật chính sách giữ ổn định. Những phân công đã khóa luôn được giữ như điều kiện cứng; còn ưu tiên hạn chế thay đổi với các phân công chưa khóa nằm ở bước tối ưu cuối.

Nhóm dùng thứ tự ưu tiên này theo kiểu từ điển: chỉ xét mục tiêu sau khi đã giữ giá trị đạt được ở các mục tiêu trước. Ví dụ, hệ thống không đánh đổi việc thiếu thêm một nhu cầu chỉ để có điểm kinh nghiệm tốt hơn. Khi một bước chưa chứng minh được tối ưu do giới hạn thời gian, kết quả ghi rõ mức độ chứng minh của từng bước.

### 5. Ba thuật toán đang có trong mã nguồn

[Có thể dùng bảng so sánh ở phần B để minh họa.]

Thuật toán thứ nhất là Greedy, hay thuật toán tham lam. Cách làm là xử lý trước những nhu cầu có ít giáo viên đủ điều kiện, rồi chọn ứng viên hợp lệ tốt nhất tại thời điểm gán. Ưu điểm là đơn giản, dễ giải thích và tạo được phương án nhanh. Tuy nhiên, khi đã chọn ở bước trước thì thuật toán không quay lại tìm kiếm toàn cục, nên có thể bỏ lỡ phương án tốt hơn.

Thuật toán thứ hai là Genetic Algorithm, hay thuật toán di truyền. Nhóm biểu diễn phương án bằng thứ tự xử lý nhu cầu và ưu tiên chọn giáo viên. Thuật toán duy trì một quần thể phương án, rồi qua các bước chọn lọc, lai ghép và đột biến để tìm phương án tốt hơn. Bộ giải mã kiểm tra điều kiện khi xây dựng phân công, và nghiệm cuối còn được kiểm tra độc lập.

Trong cấu hình so sánh hiện có, GA dùng quần thể 40 cá thể, tối đa 200 thế hệ và xác suất đột biến 0,1. GA có khả năng khảo sát nhiều lựa chọn hơn Greedy, nhưng chất lượng phụ thuộc quá trình tìm kiếm và ngân sách thời gian; thuật toán không cung cấp bằng chứng tối ưu.

Thuật toán thứ ba, cũng là bộ giải chính mà nhóm lựa chọn, là CP-SAT của Google OR-Tools. Nhóm mô hình hóa quyết định gán giáo viên bằng các biến nhị phân, đưa điều kiện cứng vào mô hình và giải lần lượt năm mục tiêu vừa trình bày.

Điểm nhóm quan tâm ở CP-SAT là khả năng biểu diễn trực tiếp các ràng buộc, giữ đúng thứ tự ưu tiên và cung cấp thông tin chứng minh tối ưu. Nếu hết thời gian nhưng đã có nghiệm hợp lệ, module có thể trả nghiệm tốt nhất đã được kiểm tra, đồng thời phân biệt rõ trạng thái khả thi với trạng thái đã chứng minh tối ưu.

Cả ba thuật toán cùng được đánh giá theo một bộ mục tiêu và qua cùng bộ kiểm tra kết quả. Greedy và GA là các module đối chứng độc lập, không gọi CP-SAT để tìm nghiệm. Nhờ đó, nhóm có thể đối chiếu chất lượng phương án và thời gian thay vì chỉ trình bày kết quả của một thuật toán.

### 6. Kết quả đã kiểm chứng và cách đọc kết quả so sánh

[Mở bảng kết quả `report-five-stage.json` ở phần B.]

Theo hồ sơ kiểm chứng ngày 09/11, bộ module thuật toán đã vượt qua 209 lượt thực thi kiểm thử, không có failure hoặc error. Trong đó có bộ test dùng chung được chạy với cả ba thuật toán và phép đối chiếu CP-SAT với kết quả vét cạn trên 30 bài toán nhỏ.

Các nội dung được kiểm tra gồm điều kiện đầu vào, tính tải, thứ tự mục tiêu, kinh nghiệm, khóa phân công và cách giữ nghiệm hợp lệ khi chưa hoàn tất quá trình tìm kiếm.

Nhóm cũng có 45 lượt đo so sánh, từ 5 bộ dữ liệu nhỏ, mỗi bộ chạy 3 lần với 3 thuật toán. Trong từng bộ ba, các thuật toán dùng cùng dữ liệu, seed và ngân sách. Cả 45 phương án đều vượt qua bộ kiểm tra tính hợp lệ.

Ví dụ rõ nhất là bộ dữ liệu năm mục tiêu. Cả ba thuật toán đều phân công đủ và có độ lệch tải bằng không. CP-SAT và GA đạt điểm phạt kinh nghiệm là 5, với 2 thay đổi so với phương án trước; Greedy đạt điểm phạt kinh nghiệm là 15 và không thay đổi phân công.

Theo thứ tự mục tiêu đã thống nhất, phương án có điểm kinh nghiệm 5 tốt hơn phương án có điểm 15, dù phải thay đổi hai phân công chưa khóa. Ví dụ này cho thấy tác dụng của việc ưu tiên kinh nghiệm trước mức độ giữ ổn định. Trong bộ dữ liệu đó, CP-SAT còn cung cấp đủ bằng chứng tối ưu cho cả năm bước; GA tìm được cùng chất lượng nhưng không có bằng chứng này.

Về tốc độ, trên các bộ dữ liệu nhỏ đã đo, Greedy có thời gian trung vị thấp nhất, tiếp theo là CP-SAT và GA. Vì vậy, lý do nhóm chọn CP-SAT là cách xử lý ràng buộc, chất lượng tìm kiếm và khả năng chứng minh tối ưu. Nhóm vẫn cần đánh giá trên dữ liệu nhà trường có quy mô và độ phức tạp lớn hơn trước khi kết luận về hiệu năng sử dụng thực tế.

### 7. Phần đang thực hiện: tích hợp và wireframe giao diện

Về phần thuật toán, nhóm đã hoàn thiện module theo mô hình năm bước cho phạm vi một khoảng hiệu lực đồng nhất. Module đã nhận được đầu vào chuẩn hóa, sinh phương án và xuất các chỉ số để đánh giá. Mốc tiếp theo là đưa module này vào luồng ứng dụng dùng dữ liệu thật từ cơ sở dữ liệu.

Về giao diện, nhóm đang dựng wireframe cơ bản để thống nhất cách người dùng thao tác và những dữ liệu cần hiển thị. Trước mắt, các luồng cần làm rõ là quản lý dữ liệu giáo viên và nhu cầu giảng dạy; chọn học kỳ, đợt phân công; chạy thuật toán; xem phân công theo giáo viên hoặc lớp; xem tải và những nhu cầu còn thiếu.

Wireframe sẽ là cơ sở để rà lại request, response và các API tổng hợp trước khi triển khai giao diện có dữ liệu thật. Nhóm cũng sẽ thể hiện rõ các thao tác chỉnh sửa, khóa phân công và chạy lại để người quản lý có thể kiểm soát đề xuất của hệ thống.

Trong giai đoạn tiếp theo, nhóm ưu tiên một luồng tích hợp hoàn chỉnh: chuẩn bị dữ liệu, tạo phương án nháp, chạy CP-SAT, lưu kết quả, hiển thị phân công và tải, sau đó cho phép chỉnh sửa hoặc khóa một phân công rồi chạy lại.

Song song đó, nhóm sẽ bổ sung phân quyền và kiểm soát phiên bản dữ liệu để kết quả solver không ghi đè lên phương án đã được chỉnh sửa trong lúc đang chạy. Với dữ liệu có nhiều giai đoạn hiệu lực trong cùng học kỳ, nhóm cần mở rộng mô hình tải theo giai đoạn trước khi tối ưu đồng thời toàn bộ học kỳ.

### 8. Kết thúc báo cáo

Đến mốc hiện tại, nhóm đã có nền thiết kế và dữ liệu, khung backend API, cùng module thuật toán đã được kiểm chứng và so sánh với hai thuật toán đối chứng. Tài liệu kỹ thuật đã được hiệu chỉnh để thống nhất hướng triển khai, và nhóm đang chuyển sang dựng wireframe và tích hợp các thành phần.

Trong đợt làm việc tiếp theo, nhóm tập trung đưa luồng phân công từ dữ liệu đầu vào đến màn hình kết quả chạy được xuyên suốt, sau đó đánh giá trên dữ liệu sát thực tế hơn. Nhóm mong thầy góp ý thêm về luồng màn hình và bộ dữ liệu dùng cho mốc demo tích hợp.

Em xin hết phần báo cáo tiến độ.

## B. Bảng tra nhanh khi trình bày

### 1. Tiến độ theo hạng mục

| Hạng mục | Kết quả đến mốc báo cáo | Trọng tâm tiếp theo |
| --- | --- | --- |
| Tài liệu kỹ thuật | Đã hiệu chỉnh báo cáo, làm rõ nghiệp vụ, mô hình dữ liệu và thứ tự tối ưu; có hướng dẫn LaTeX offline | Cập nhật theo các mốc tích hợp và phản hồi của GVHD |
| Cơ sở dữ liệu | Có schema PostgreSQL 48 bảng, seed và truy vấn đối chiếu | Kiểm chứng bất biến, hoàn thiện migration và mapping Java |
| Backend | Có khung Spring Boot và 16 bộ CRUD dữ liệu đầu vào | API nghiệp vụ tổng hợp, phân quyền và lưu phương án |
| Thống nhất API | Đã thống nhất hướng tổ chức API và hợp đồng trao đổi giữa các chức năng/module | Hiện thực adapter DB–solver, kiểm tra payload và nối giao diện |
| Thuật toán | CP-SAT năm bước; Greedy và GA đối chứng; bộ kiểm tra độc lập; có hồ sơ kiểm chứng | Tích hợp backend, dữ liệu quy mô thực tế và bài toán nhiều giai đoạn |
| UI | Đang dựng wireframe cơ bản theo tiến độ nhóm cung cấp | Chốt luồng, trường hiển thị, mock rồi nối API |

“Hoàn thiện thuật toán” trong kịch bản là hoàn thiện **module hiện hành cho một khoảng hiệu lực đồng nhất**. Luồng web–database–solver hoàn chỉnh là mốc tích hợp tiếp theo. Trạng thái wireframe do nhóm cung cấp; thư mục `frontend/` trong repo hiện mới có `.gitkeep`.

### 2. Năm mục tiêu dùng chung

| Thứ tự | Ký hiệu | Đại lượng cần giảm |
| --- | --- | --- |
| 1 | `Z` | Số thành phần nhu cầu chưa được phân công |
| 2 | `L1` | Tổng độ lệch tuyệt đối `sum(abs(T − B))` |
| 3 | `M` | Độ lệch tuyệt đối lớn nhất `max(abs(T − B))` |
| 4 | `experience` | Điểm phạt kinh nghiệm có trọng số khối |
| 5 | `change` | Số thay đổi trên các nhu cầu có trong mốc trước, khi bật chính sách giữ ổn định |

`T = F + A + C + R`: tải cố định ngoài phạm vi + phân công trong phạm vi + hoạt động quy đổi + nhiệm vụ/giảm trừ được ghi nhận. `B` là định mức từ hồ sơ. Các khoản dùng cùng đơn vị/kỳ tính và không được tính trùng. Khóa phân công thuộc điều kiện cứng, khác với mục tiêu mềm hạn chế thay đổi.

CP-SAT cố định giá trị của nghiệm đã kiểm tra sau mỗi bước trước khi giải bước tiếp theo. Nếu giá trị đó chưa được chứng minh tối ưu, các bước sau chỉ tối ưu trong phạm vi giá trị đã cố định; không được gọi kết quả là tối ưu toàn cục. Greedy và GA xếp hạng phương án theo cùng vector năm mục tiêu.

### 3. So sánh cách triển khai trong source

| Tiêu chí | Greedy | Genetic Algorithm | CP-SAT |
| --- | --- | --- | --- |
| Cách tìm nghiệm | Nhu cầu ít ứng viên trước; gán lựa chọn hợp lệ tốt nhất tại từng bước | Quần thể thứ tự nhu cầu/ưu tiên giáo viên; chọn lọc, lai ghép, đột biến | Biến quyết định, ràng buộc và giải tuần tự năm mục tiêu |
| Khả năng thay đổi lựa chọn trước | Không quay lui | Có, qua các cá thể và thế hệ | Có, trong quá trình tìm kiếm của solver |
| Bảo vệ điều kiện cứng | Decoder và validator | Decoder và validator | Mô hình ràng buộc và validator |
| Cách đánh giá | Vector `(Z, L1, M, experience, change)` | Cùng vector | Cùng vector; cố định giá trị từng bước |
| Khóa phân công | Có xử lý | Có xử lý | Có xử lý |
| Bằng chứng tối ưu | Không có | Không có | Có khi chứng minh được; báo riêng từng bước |
| Vai trò hiện tại | Mốc đối chứng đơn giản, nhanh | Đối chứng tìm kiếm quần thể | Bộ giải chính |

### 4. Số liệu hiện hành nên sử dụng

Nguồn là hồ sơ ngày **09/11/2026**, mô hình năm bước. Các bộ kết quả lịch sử ngày 25/10 dùng mô hình cũ và không được trộn vào bảng này.

- **209 lượt thực thi kiểm thử**, 0 failure, 0 error, 0 skipped. Có bộ 46 ca được lặp cho ba thuật toán; đây không phải 209 yêu cầu nghiệp vụ độc lập.
- **45 lượt đo** = 5 fixture × 3 lần lặp × 3 thuật toán; 45/45 qua validator, không có lượt vượt ngân sách `solve()` 2 giây trong hồ sơ đo này.
- Oracle đối chiếu CP-SAT với vét cạn **30 bài toán ngẫu nhiên nhỏ**.
- Phép đo có warm-up, cùng snapshot/seed/ngân sách trong từng bộ ba, thứ tự thuật toán được luân phiên.
- Thời gian đo bao gồm tiền kiểm, mô hình và hậu kiểm trong `solve()`; không bao gồm khởi động JVM, đọc/ghi JSON, HTTP, hàng đợi hay giao dịch database.

**Ví dụ `report-five-stage.json`, 3 lần lặp cho mỗi thuật toán:**

| Thuật toán | Vector mục tiêu | Trung vị thời gian `solve()` | Bằng chứng tối ưu |
| --- | --- | ---: | --- |
| Greedy | `(0, 0, 0, 15, 0)` | 1,733 ms | Không có |
| GA | `(0, 0, 0, 5, 2)` | 25,534 ms | Không có |
| CP-SAT | `(0, 0, 0, 5, 2)` | 7,657 ms | Đủ năm bước trong các lượt đo này |

Các giá trị L1/M trong vector được biểu diễn theo hệ số nguyên của đầu vào; cả hai bằng 0 trong ví dụ nên không làm thay đổi cách đọc bảng. Điểm kinh nghiệm là **điểm phạt**, càng thấp càng tốt, không phải số năm kinh nghiệm.

Ở fixture `shortage.json`, cả ba thuật toán còn thiếu một thành phần và vẫn tạo phương án hợp lệ. Cần phân biệt **hợp lệ**, **phân công đủ** và **đã chứng minh tối ưu**: tối ưu trong điều kiện thiếu nguồn lực vẫn có thể còn nhu cầu chưa gán.

## C. Câu hỏi có thể được hỏi và cách trả lời

### Vì sao chọn CP-SAT khi Greedy nhanh hơn?

“Trong các bài toán nhỏ đã đo, Greedy nhanh hơn. Nhóm chọn CP-SAT vì cần biểu diễn nhiều điều kiện cứng, giữ thứ tự ưu tiên rõ ràng và biết khi nào có bằng chứng tối ưu. Bộ dữ liệu năm bước cũng cho thấy CP-SAT tìm được điểm kinh nghiệm tốt hơn Greedy. Nhóm sẽ đo thêm trên dữ liệu thực tế để đánh giá sự đánh đổi về thời gian.”

### GA đạt cùng nghiệm với CP-SAT thì khác biệt ở đâu?

“GA tìm được cùng chất lượng trong ví dụ đã đo, nhưng không chứng minh không còn nghiệm tốt hơn. CP-SAT có đủ bằng chứng cho năm bước ở ví dụ đó. Chất lượng và độ ổn định của GA còn phụ thuộc seed, cấu hình và thời gian tìm kiếm.”

### Có thể nói thuật toán đã hoàn thiện chưa?

“Nhóm đã hoàn thiện module thuật toán năm bước trong phạm vi đầu vào hiện hành và có kiểm thử, đối chứng. Phần tiếp theo là adapter từ database, luồng lưu/áp dụng kết quả trong backend và đánh giá trên dữ liệu nhà trường. Tối ưu đồng thời nhiều giai đoạn hiệu lực vẫn cần mở rộng mô hình.”

### Đã có API thì tại sao vẫn phải tích hợp?

“API hiện có chủ yếu phục vụ CRUD các dữ liệu đầu vào. Nhóm đã thống nhất hướng API và hợp đồng dữ liệu, nhưng luồng tạo phương án cần thêm nghiệp vụ tổng hợp: dựng snapshot đúng, gọi solver, kiểm tra kết quả còn mới, lưu phân công và trả dữ liệu phù hợp cho UI. Đây là phần nhóm đang chuyển sang triển khai.”

### 209 test và 45 lượt đo có chứng minh toàn hệ thống chạy tốt không?

“Đó là bằng chứng cho module thuật toán trong các bộ dữ liệu và điều kiện đã kiểm tra. Bộ test có adapter lưu trong bộ nhớ; chưa phải kiểm chứng giao dịch PostgreSQL hoặc luồng web hoàn chỉnh. Để nghiệm thu sản phẩm, nhóm cần thêm kiểm thử tích hợp backend, database và giao diện.”

### Thiếu giáo viên thì hệ thống xử lý thế nào?

“Hệ thống ưu tiên giảm số nhu cầu thiếu trong khi vẫn giữ điều kiện cứng. Nếu nguồn lực không đủ, module có thể trả phương án một phần cùng lý do chưa gán. Điều kiện cho mở phản hồi hoặc xuất phương án được kiểm tra thêm ở tầng nghiệp vụ.”

### Giao diện hiện đã làm được gì?

“Nhóm đang dựng wireframe để chốt bố cục, thao tác và dữ liệu cần hiển thị, trước hết cho quản lý dữ liệu và luồng xem/chỉnh phương án. Bản UI kết nối dữ liệu thật là mốc tiếp theo sau khi chốt wireframe và API.”

## D. Tài liệu và mã nguồn để mở khi cần minh họa

| Nội dung | Tệp tham chiếu |
| --- | --- |
| Báo cáo kỹ thuật | [report.tex](../../../report.tex) |
| Sơ đồ hệ thống và ERD | [docs/diagrams](../../../diagrams) |
| Schema 48 bảng | [01_schema.sql](../../../../backend/sql/01_schema.sql) |
| Backend 16 bộ CRUD | [backend/README.md](../../../../backend/README.md) |
| Mô hình thuật toán hiện hành | [CURRENT_MODEL.md](../../../../algorithm/tass-cpsat/docs/CURRENT_MODEL.md) |
| Hợp đồng solver | [CONTRACT.md](../../../../algorithm/tass-cpsat/docs/CONTRACT.md) |
| Greedy | [GreedySolver.java](../../../../algorithm/tass-greedy/src/main/java/vn/edu/tass/solver/GreedySolver.java) |
| GA | [GeneticSolver.java](../../../../algorithm/tass-genetic/src/main/java/vn/edu/tass/solver/GeneticSolver.java) |
| CP-SAT và thứ tự năm bước | [AssignmentSolver.java](../../../../algorithm/tass-cpsat/src/main/java/vn/edu/tass/solver/AssignmentSolver.java) |
| Cách Greedy/GA cùng chấm năm mục tiêu | [HeuristicProblem.java](../../../../algorithm/tass-common/src/main/java/vn/edu/tass/solver/HeuristicProblem.java) |
| Hồ sơ kiểm chứng ngày 09/11 | [TEST-RESULTS-20261109.md](../../../../algorithm/tass-cpsat/docs/TEST-RESULTS-20261109.md) |
| Tổng hợp số liệu so sánh | [summary.csv](../../../../algorithm/tass-comparison/reports/20261109/summary.csv) |
| Chi tiết 45 lượt đo | [runs.csv](../../../../algorithm/tass-comparison/reports/20261109/runs.csv) |

**Ghi chú biên soạn:** kịch bản đối chiếu source và hồ sơ kết quả đã có trong workspace, không phát sinh một lượt chạy benchmark mới. Trạng thái đang dựng wireframe và thống nhất API lấy theo tiến độ nhóm cung cấp; phần triển khai backend được diễn đạt theo phạm vi mã nguồn hiện có.
