# Kiến trúc frontend

Frontend là SPA React/TypeScript/Vite. Giữ React Query cho dữ liệu API, Context cho phiên/vai trò/ngữ cảnh, React state cho tương tác cục bộ và URL cho trạng thái điều hướng. Hiện chưa có nhu cầu thêm Zustand.

## Trách nhiệm các thư mục

| Thư mục        | Trách nhiệm                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------- |
| `src/app`      | Khởi tạo, providers, router, guard và layout ứng dụng                                        |
| `src/pages`    | Điểm vào route, ghép màn hình; đưa logic nghiệp vụ phức tạp về feature khi chỉnh màn hình đó |
| `src/features` | Component, hook, kiểu dữ liệu và logic theo nghiệp vụ                                        |
| `src/shared`   | UI và hạ tầng dùng chung, không phụ thuộc một màn hình nghiệp vụ                             |
| `src/mocks`    | MSW, fixture và store mô phỏng; component nghiệp vụ không import trực tiếp                   |

Luồng dữ liệu: **component → query/mutation hook → API của feature → HTTP client → MSW hoặc backend**. Không lưu thêm một bản dữ liệu API trong Context/store UI. Mutation tiếp tục dùng cơ chế invalidation hiện có, bao gồm các view phụ thuộc chéo.

Đây là quy ước để refactor từng màn hình khi cần, không phải yêu cầu tách đồng loạt các page hay tạo thêm abstraction cho handler đơn giản. Các feature có thể dùng hợp đồng công khai của nhau; không đưa nghiệp vụ riêng vào `shared` chỉ để né phụ thuộc.

## Ví dụ đã áp dụng: Chuẩn bị dữ liệu

`pages/preparation/preparation-page.tsx` giữ điểm vào route và import CSS cũ, export màn hình từ feature. Bên trong `features/preparation`:

| File                                                                                                             | Trách nhiệm                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `preparation-screen.tsx`                                                                                         | Ghép phần tổng quan, điều hướng bốn bước và dialog                                  |
| `use-preparation-data.ts`                                                                                        | Lấy dữ liệu bằng các query có sẵn, xác định đợt/học kỳ, tạo map và số liệu dẫn xuất |
| `use-preparation-step.ts`, `round-navigation.ts`                                                                 | Đọc/đổi bước trên URL; giữ nguyên đợt và ngữ cảnh khi chuyển bước                   |
| `use-scope-editor.ts`                                                                                            | Bộ lọc, form, validation và mutation phạm vi khối–môn/xác nhận đợt                  |
| `use-applicability-editor.ts`                                                                                    | Bộ lọc, form phân loại lớp–môn và xác nhận tập thành phần                           |
| `use-required-component-editor.ts`                                                                               | Bộ lọc, form và mutation thành phần bắt buộc                                        |
| `use-preparation-deletion.ts`                                                                                    | Điều khiển xác nhận xóa và chọn mutation theo loại bản ghi                          |
| `scope-step.tsx`, `applicability-step.tsx`, `required-components-step.tsx`, `readiness-step.tsx`                 | Bảng, bộ lọc và nội dung từng bước                                                  |
| `scope-dialog.tsx`, `applicability-dialog.tsx`, `required-component-dialog.tsx`, `preparation-delete-dialog.tsx` | Hiển thị form/xác nhận, gọi editor tương ứng                                        |
| `preparation-summary.tsx`                                                                                        | Banner chọn đợt và KPI                                                              |

Các editor được gọi ở cấp `PreparationScreen`, ngoài điều kiện chọn bước. Vì vậy chuyển bước không làm mất bộ lọc hoặc khởi tạo lại state form. Dialog giữ vị trí độc lập với từng bước để bảo toàn vòng đời, focus và hành vi đóng/mở. Kiểu `PreparationData` và các kiểu editor là hợp đồng nội bộ màn hình, không phải DTO API mới.

Refactor này giữ markup, class, CSS, query key, API, validation, payload và cơ chế invalidation hiện có. Có một sửa lỗi hành vi: trước đây chuyển bước ghi đè toàn bộ query string; hiện chỉ thay `step`, giữ `round_id`, `context_id` và các tham số khác. Không thay thiết kế giao diện, dependency hoặc hợp đồng backend.

## Cách kiểm chứng

Chạy `npm test`, `npm run lint`, `npm run build` và `npm run build:mock`. Regression về chuyển bước có trong `test/frontend-review-regressions.test.mjs`. Trên trình duyệt, kiểm tra cả bốn bước, lưu/xóa/xác nhận, lỗi form, giữ bộ lọc khi chuyển bước, URL đợt không mặc định, dialog bằng bàn phím và viewport desktop/mobile. Build/test không thay kiểm chứng trực quan.

### Kết quả refactor ngày 17/11/2026

- 97/97 tests, lint, typecheck qua build API/mock và format các file thay đổi đạt. Test ranh giới feature tiếp tục kiểm tra cả các module vừa tách, không chỉ page cũ.
- Chrome, origin QA riêng cổng 5174: xem bố cục desktop; thêm/xóa phạm vi; chuyển bước giữ bộ lọc; thử thiếu lý do Không áp dụng rồi lưu hợp lệ; thêm/xóa thành phần và chốt lại tập; xem readiness và issue sau thay nguồn.
- Mobile 390×844: xem cả bốn bước và dialog thành phần; kiểm tra Shift+Tab tới nút đóng, Escape đóng dialog và trả focus về nút mở. Chọn PC-02 rồi chuyển bước giữ `round_id=2`, `context_id=hk1` trên URL.
- Đã reset fixture QA và khôi phục viewport. CSS và prototype không thay đổi. Đây là QA tập trung cho màn hình Chuẩn bị, không phải chạy lại toàn bộ checklist frontend hoặc so ảnh tự động từng pixel trước/sau.
