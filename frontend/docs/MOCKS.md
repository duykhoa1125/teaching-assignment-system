# Hạ tầng mock — FE-02B

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
