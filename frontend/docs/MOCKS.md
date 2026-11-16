# Hạ tầng mock — FE-02B

## Bổ sung FE-06

`assignment-store.ts`, `handlers/assignment.ts`, `fixtures/assignment.ts` mô phỏng hợp đồng trong `backend/docs/{PLAN_API,ASSIGNMENT_MUTATION_API,PLAN_RESULTS_API}.md`: GET/POST plan theo đợt, GET phiên bản/assignments/workloads, POST refresh-snapshot, PATCH assignment, khóa/mở khóa dòng hoặc nhóm. ID assignment là ID plan-demand, khác demand nguồn. Bộ lọc và phân trang giữ total/thứ tự; ma trận đọc hết các trang và từ chối kết quả trộn revision/snapshot.

Snapshot giữ tên lớp/môn/giáo viên, chuyên môn và chính sách tải tại thời điểm chụp. Thay đổi nguồn chuẩn bị/danh mục/giáo viên làm token cũ; refresh kiểm tra mọi dòng khóa trước khi áp dụng, hòa giải dòng thêm/bỏ và trả revision từ server mock. Sửa chỉ áp dụng cho DRAFT hiện hành có nguồn mới; mở khóa vẫn được phép khi nguồn cũ. No-op không tăng revision/ghi audit/đổi metadata khóa. Nhóm thành công tăng revision theo số dòng đổi; lỗi một dòng hủy cả nhóm. Kiểm tra chuyên môn, ngày và trần tải thực hiện trước khi ghi.

`/api/mock/plan-versions/{id}/workspace` bổ sung **chỉ cho mock** danh sách phiên bản/ứng viên/chính sách snapshot, chưa phải endpoint backend. Chính sách trần/định mức là fixture theo bộ quy tắc, không viết cứng trong UI. Tải `T=A+F+C+R`, `W=T-R`; dữ liệu năm chưa có trả INSUFFICIENT_DATA với giá trị thiếu/null, không giả làm kết quả validation thật.

Kịch bản tại `/dev/ui`: `planEmpty`, `planStale`, `planLockConflict`, `planRevisionConflict`, `planReadOnly`. Chọn scenario rồi điều hướng bằng menu để giữ store; reload khôi phục fixture. Revision conflict được tiêm một lần khi ghi để thử tải lại/retry thủ công. Reset và AbortSignal chặn mutation đang chờ. Các tab có store riêng.

Sau khi plan được tải, layout/session và phần độ phủ/tải của tổng quan phản ánh cùng plan qua `assignment-preview.ts`; trước đó vẫn dùng fixture tổng quan cũ. Solver, validation, feedback và auth thật chưa được mô phỏng trong FE-06. Kiểm thử mới ở `test/assignment-feature.test.mjs` dùng cùng MSW handlers, không cần DB.

## Bổ sung FE-05

`handlers/preparation.ts`, `preparation-store.ts` và `fixtures/preparation.ts` bổ sung CRUD cho danh mục/năm học/học kỳ/đợt, phạm vi khối–môn, áp dụng lớp–môn, thành phần bắt buộc và nhu cầu giảng dạy. Endpoint và kiểu dữ liệu nằm trong `features/catalogs/api.ts`, `features/preparation/api.ts`; UI gọi qua HTTP client/TanStack Query. Các handler hiện được mô phỏng tại trình duyệt, chưa nối backend thật.

Thay đổi đầu vào cập nhật token nguồn và làm mất xác nhận tập thành phần liên quan; xóa nhu cầu gỡ liên kết khỏi thành phần bắt buộc để readiness báo thiếu. Có kiểm tra FK, trùng, khoảng ngày/nhu cầu ACTIVE giao nhau và số tiết dương tối đa hai chữ số thập phân. Nhập nhiều lớp xem trước trước khi lưu; nếu một request lỗi giữa chừng, UI báo kết quả, không có transaction nhiều request giả.

Trong `/dev/ui`, chọn `readinessReady`, `readinessMissing`, `readinessBlocked` để xem đủ dữ liệu/thiếu nhu cầu/lỗi chặn. Các scenario cố định chỉ phục vụ thử UI; chọn `normal` để kiểm tra readiness tính theo store hiện tại. Reset mock khôi phục cả store chuẩn bị, scenario và query cache, đồng thời xóa phiên mô phỏng như cơ chế hiện có. Reload cũng trở về fixture. Scenario sẵn sàng không chứng minh solver hoặc quyền/backend thật hoạt động.

Mock sử dụng **MSW3.0.6**. Browser worker khởi động xong trước khi React render; tính năng gọi qua API client như bình thường. Không cần backend hoặc PostgreSQL cho chế độ mock.

## Chạy và chọn nguồn dữ liệu

| Lệnh tại frontend/   | Nguồn dữ liệu     | Kết quả                                               |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `npm run dev`        | Mock mặc định     | Vite5173, worker và công cụ `/dev/ui`                 |
| `npm run dev:api`    | API thật          | Tắt mock, bật proxy về DEV_API_PROXY_TARGET           |
| `npm run build`      | API thật mặc định | `dist/`, không worker/handler/mock tools trong bundle |
| `npm run build:mock` | Mock rõ ràng      | `dist-mock/`, gồm worker và công cụ phát triển        |

Biến `VITE_DATA_SOURCE` có thể nhận mock/api; không hợp lệ thì Vite dừng với lỗi. Nếu đã đặt biến thành mock trong `.env` hoặc môi trường, bỏ override đó trước khi chạy build API/dev:api. Build thông thường từ chối override mock, chỉ build với mode mock khi có chủ đích. Không đặt secret trong biến VITE.

`npm run preview` xem `dist` API ở4173, không proxy API. Để xem build mock độc lập:

```powershell
npm run build:mock
npm run preview -- --outDir dist-mock
```

Mock không tự bật khi backend lỗi. Khi API mode mở cùng origin đã chạy mock trước đó, bootstrap gỡ đăng ký đúng worker `/mockServiceWorker.js` và tải lại một lần nếu worker đó vẫn điều khiển trang; giữ các service worker khác.

## Cấu trúc và hợp đồng

```text
src/mocks/
  browser.ts       # setupWorker/start
  node.ts          # setupServer cho test
  fixtures/        # Trường, năm/học kỳ, khối/lớp, môn, giáo viên
  handlers/        # Endpoint đã hỗ trợ và catch-all chặn request còn thiếu
  scenarios/       # Các kịch bản tái lập
  store.ts         # Bộ nhớ thay đổi được, generation và reset
```

Chỉ mới có các endpoint mock sau:

- GET `/api/mock/layout`: hợp đồng **chỉ để xem thử UI**, trả tài khoản mẫu và tóm tắt3 ngữ cảnh. Layout gọi qua `features/workspace/api.ts`, chỉ bật trong mock mode; không đại diện endpoint/backend hoặc session thật. Chọn ngữ cảnh hiện chỉ đổi nhãn/số liệu khung, chưa phân vùng dữ liệu nghiệp vụ theo học kỳ; reload về hk1.
- GET `/api/schools?limit=20&offset=0`.
- GET `/api/teachers` với school_id/teacher_code/q/limit/offset; response là mảng, sắp ID tăng, không total.
- GET `/api/teachers/{id}`.
- POST `/api/teachers`: body school_id/teacher_code/full_name;201 và Location.
- PUT `/api/teachers/{id}`: body đầy đủ, không nhận id/trường lạ.
- DELETE `/api/teachers/{id}`:204, không body.

Handler có kiểm tra dữ liệu đầu vào, FK trường, mã giáo viên trùng trong cùng trường,404 và các giới hạn phân trang cơ bản. Nó mô phỏng hợp đồng cần cho UI, không thay thế toàn bộ constraint/transaction PostgreSQL. Dữ liệu lớp/môn/học kỳ hiện chỉ là fixture có quan hệ nhất quán, chưa có handler tương ứng. Auth/session/solver chưa được mô phỏng.

Request chưa có handler dưới `/api` được trả501 MOCK_HANDLER_MISSING tại chỗ, không chuyển tiếp ra backend. Worker cho asset/HMR và các request ngoài phạm vi nghiệp vụ đi qua bình thường. Vite cũng không bật proxy trong mock mode.

Component/feature không import fixture. Luồng mẫu `features/teachers/api.ts` gọi HTTP client; panel phát triển dùng TanStack Query để đọc response. Không tạo store UI thứ hai chứa toàn bộ danh sách giáo viên.

## Scenario, dữ liệu và reset

Mở `/dev/ui`, phần **Kiểm tra MSW** để chọn scenario và bấm Reset mock. Đây là công cụ phát triển tách khỏi màn hình nghiệp vụ, không phải cổng giáo viên/quản lý.

- normal: response sau khoảng100ms.
- empty: GET danh sách trả mảng rỗng; fixture gốc trong store vẫn giữ để đổi lại normal.
- slow: response sau khoảng1,2giây, có thể hủy bằng AbortSignal.
- badRequest/unauthorized/forbidden/conflict/invalid/unavailable: lỗi400/401/403/409/422/503 cho request đã hỗ trợ, không ghi dữ liệu.
- reference: mô phỏng lỗi409 REFERENCE_CONFLICT khi xóa giáo viên.

Các scenario auth/quyền ở đây chỉ là response lỗi, chưa có đăng nhập hoặc session giả. Scenario503 dùng lỗi minh họa SOLVER_QUEUE_FULL để thử thông báo, chưa có handler solver.

Store chỉ ở bộ nhớ: thêm/sửa/xóa giữ trong phiên trang; **reload trở lại fixture, scenario normal và ID ban đầu**. Không ghi localStorage/sessionStorage trong mốc này. Các tab có store riêng; chưa mô phỏng đồng bộ hai tab.

Reset trong panel hủy query đang chờ, reset store/scenario/ID rồi reset query cache để tải lại. Generation guard chặn mutation đang chờ độ trễ trước reset ghi vào fixture mới bằng409 MOCK_STATE_CHANGED. Khi có session/lượt chạy giả ở mốc sau, cần bổ sung reset và cơ chế lưu tương ứng.

## Kiểm thử và bảo trì

`npm test` dùng cùng handlers qua MSW Node, không kết nối DB hoặc gọi backend. Có kiểm thử CRUD, filters, pagination, lỗi/fixture, reset giữa request và hủy. HTTP client có bộ test riêng; mode mock/api có test cấu hình riêng.

`public/mockServiceWorker.js` là file sinh bởi CLI, đã loại khỏi formatter/lint. Khi cập nhật MSW:

```powershell
npm exec -- msw init public --save
```

Build API loại worker khỏi output và không nạp module mock; build mock giữ worker. Docker hiện build bản API như trước; Compose vẫn có các phụ thuộc toàn stack. Dùng Vite/preview mock để phát triển độc lập; chưa thêm image Docker demo mock riêng.

Tham chiếu: [MSW browser](https://mswjs.io/guides/integrations/browser), [MSW API](https://mswjs.io/api/setup-worker/), [backend API](../../backend/docs/API.md).
