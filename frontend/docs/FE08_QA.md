# QA FE-08 — 17/11/2026

Trạng thái: **đã hoàn thành vòng QA mock FE-08 theo ma trận bên dưới**. Phạm vi kiểm chứng là Chrome desktop/mobile và các luồng đại diện, không phải chứng nhận mọi tổ hợp trạng thái hoặc mọi trình duyệt. Không dùng checks kỹ thuật thay cho đối chiếu hình ảnh với prototype. Lượt này dùng Chrome, mock, server local cổng 5174; không nối API thật.

## Kết quả

- 96/96 tests đạt, lint và build API/mock đạt. Test SVG so chính xác toàn bộ glyph demo kể cả override cuối; chỉ warning dùng SVG Tabler đã được duyệt, được kiểm tra chính xác riêng thay vì bỏ qua.
- Format: checkout Windows dùng CRLF; Prettier mặc định LF gây 187 cảnh báo thuần line ending. Đặt endOfLine auto, kiểm tra toàn bộ đạt với tùy chọn này, không format lại hàng loạt.
- Prototype SHA-256: `030e179e84c2b765d842bfedbeef650186e18126b5a34b3451309c5d840ed0ef`.
- Desktop: xem tổng quan và thư viện UI; mobile 390×844: xem Nhu cầu, dialog tạo nhu cầu, menu điều hướng, Giáo viên (có dữ liệu/rỗng), Solver, Thống kê và Kiểm tra (chưa có báo cáo).
- Smoke DOM mobile Chuẩn bị/Phân công/Tải: không tràn ngang cấp document; chưa thay cho đối chiếu trực quan toàn trang.
- Bàn phím dialog Nhu cầu: focus đầu ở Lớp học; Shift+Tab tới nút đóng; Escape đóng và trả focus về Tạo nhu cầu. Không lưu thay đổi.
- Sửa lỗi Nhu cầu mobile: media query grid hai cột bị quy tắc flex desktop phía sau ghi đè, làm select mất chữ. Đưa media query xuống cuối; xem lại filter hiển thị đúng và dialog vừa 390×844. Desktop vẫn dùng quy tắc flex cũ. Không sửa query hoặc prototype.
- Đã khôi phục viewport và scenario bình thường. Lượt QA dùng origin riêng, không reset dữ liệu origin phát triển hiện có.

## Kết quả bổ sung trong vòng hoàn tất

| Phạm vi                         | Bằng chứng thực hiện                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quản trị                        | Xem tổng quan, danh mục và đợt desktop; form sửa môn mở bằng Enter, Shift+Tab quay vòng nút đóng/Lưu, Escape trả focus Sửa môn Toán. Xem các trang tài khoản/quy tắc/quyền/nguồn/đợt/nhật ký mobile. Tài khoản hiện là danh sách chỉ đọc đúng phạm vi mock.                                                                                                           |
| Nhật ký                         | Lịch mobile vừa viewport; ArrowRight/Enter chọn 18/11/2026, trả focus ô ngày, danh sách chuyển sang rỗng đúng bộ lọc.                                                                                                                                                                                                                                                 |
| Feedback/lịch sử/tài liệu/nguồn | Xem trạng thái mặc định ở 1440×900 và 390×844, không tràn ngang cấp trang. Bảng rộng cuộn trong panel. Preview PDF nháp trên mobile có cảnh báo năm, nguồn snapshot và nút tải nháp; chưa đủ lifecycle thì không có nút phát hành.                                                                                                                                    |
| Nghiệp vụ                       | Xem workspace ma trận và tải desktop; quan sát skeleton Chuẩn bị/Kiểm tra, trước đó đã xem Solver/Thống kê/Nhu cầu mobile. Các xung đột, read-only, token/revision, hủy/reset và retry request được kiểm tra qua bộ 96 tests HTTP/model. Không gọi các test này là E2E trình duyệt.                                                                                   |
| Giáo viên                       | Xem cả ba trang khi chưa mở phương án. Qua UI điều phối, mở phản hồi trên scenario validationPass; giáo viên thấy V2/r10, ba thành phần/10 tiết gán, tổng tải 19/17 với cảnh báo thiếu tải năm. Gửi phản hồi mẫu và reload giữ nội dung/nguồn SNAP-4. Truy cập /assignment bị chặn theo vai trò. Xem tải đã mở cả desktop/mobile, form gửi phản hồi mobile vừa khung. |
| Reduced motion                  | Bật lệnh DevTools Emulate CSS prefers-reduced-motion: reduce; xác nhận matchMedia=true, sidebar transitionDuration=0s và toast lỗi animationName=none. Đã đóng DevTools, media query trở lại cấu hình trình duyệt.                                                                                                                                                    |
| Toast và lỗi                    | Xem lỗi có nút Thử lại tại /dev/ui; thử retry. Focus nút đóng toast giữ thông báo quá 8 giây, sau rời focus tiếp tục timer; toast lỗi vừa mobile. Tooltip focus/Escape đã kiểm tra ở lượt trước.                                                                                                                                                                      |
| Demo                            | Mở prototype gốc ở 1440×900, đối chiếu tổng quan quản trị với React: giữ khối KPI/welcome/danh mục, font/ảnh/glyph; khác biệt header/logo/icon là ngoại lệ đã duyệt, số liệu lấy store hiện hành. SVG/portrait/font có tests so tài nguyên gốc. Không tuyên bố đã so pixel từng route.                                                                                |

### Lỗi sửa thêm

Thẻ chào giáo viên mobile đặt avatar, tên và badge cùng một hàng khiến tên bị ép thành cột hẹp. `pages/teacher/teacher-pages.css` dùng grid hai cột ở ≤700px, badge xuống hàng hai; tên đọc được, avatar/tài nguyên/font/màu giữ nguyên. Đã xem trước/sau 390×844 và xác nhận desktop 1440×900 giữ nguyên. Đây là sửa lỗi responsive cụ thể, không sửa prototype/CSS sinh.

## Giới hạn và bàn giao

- Đây là nghiệm thu mock theo các luồng/viewport đã ghi, không chứng nhận toàn bộ frontend khớp pixel demo, mọi hover hay mọi tổ hợp route/scenario. Native select fallback, forced colors và trình duyệt khác chưa nằm trong vòng QA này.
- Các kiểm thử model/HTTP bù cho tổ hợp xung đột/lifecycle; không thay đối chiếu trực quan.
- Auth/solver/validation/PDF vẫn là mô phỏng; FE-09–11 là giai đoạn riêng. Thay ảnh cá nhân và CRUD tài khoản không thuộc luồng đã triển khai.
- Fixture QA ở origin 5174 đã reset, scenario Bình thường, viewport đã khôi phục; không sửa dữ liệu origin phát triển khác. Chưa commit/push.
