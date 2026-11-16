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

Store dùng bộ nhớ và một envelope sessionStorage có phiên bản (`tass-mock-state-v3`), gồm nguồn chuẩn bị, danh bạ giáo viên, phương án và governance. Reload giữ đồng bộ dữ liệu, scenario, bộ đếm ID/revision và snapshot; token nguồn không quay về giá trị cũ. Cache v1 thiếu nguồn (và schema không tương thích) bị bỏ, khởi tạo lại fixture; Reset mock đặt lại toàn bộ. Nếu trình duyệt chặn hoặc hết storage, dùng bộ nhớ và reload không bảo đảm giữ dữ liệu. Chưa mô phỏng đồng bộ hai tab.

Reset trong panel hủy query đang chờ, reset store/scenario/ID rồi reset query cache để tải lại. Generation guard chặn mutation đang chờ độ trễ trước reset ghi vào fixture mới bằng409 MOCK_STATE_CHANGED. Khi có session/lượt chạy giả ở mốc sau, cần bổ sung reset và cơ chế lưu tương ứng.

## Kiểm thử và bảo trì

`npm test` dùng cùng handlers qua MSW Node, không kết nối DB hoặc gọi backend. Có kiểm thử CRUD, filters, pagination, lỗi/fixture, reset giữa request và hủy. HTTP client có bộ test riêng; mode mock/api có test cấu hình riêng.

`public/mockServiceWorker.js` là file sinh bởi CLI, đã loại khỏi formatter/lint. Khi cập nhật MSW:

```powershell
npm exec -- msw init public --save
```

Build API loại worker khỏi output và không nạp module mock; build mock giữ worker. Docker hiện build bản API như trước; Compose vẫn có các phụ thuộc toàn stack. Dùng Vite/preview mock để phát triển độc lập; chưa thêm image Docker demo mock riêng.

## FE-07: Mock Solver, Validation, Workloads & Unified Overview

- **Solver & Optimization (`mocks/assignment-store.ts`, `mocks/handlers/assignment.ts`)**:
    - `POST /api/plan-versions/:id/solver-runs` trả `202` + `Location: /api/solver-runs/:id`; kiểm tra DRAFT, revision, snapshot fresh, cấu hình/quy tắc; trả `409 SOLVER_RUN_ACTIVE` kèm `Location` khi đã có lượt chạy hoạt động, `503 SOLVER_QUEUE_FULL` trong scenario tương ứng.
    - `GET /api/solver-runs/:id` chuyển dần `QUEUED -> RUNNING -> SUCCEEDED/COMPLETED/FAILED/CANCELLED`; heuristic cục bộ tôn trọng khóa, chuyên môn và trần tải tuần, sinh vector `[Z, L1, M, experience, change]` và `cp_sat_status: 'FEASIBLE'` (`demo_only: true`, `exactOptimalityProven: false`). Khi `APPLIED` và có thay đổi, tăng `revision_no`, lưu hậu kiểm tự động và ghi audit; no-op giữ nguyên `applied_revision_no === base_revision`.
    - `POST /api/solver-runs/:id/cancel` chuyển `QUEUED -> CANCELLED`, `RUNNING -> CANCEL_REQUESTED -> CANCELLED`, idempotent ở trạng thái cuối.
    - `GET /api/plan-versions/:id/optimization` trả `latest_run_id`, `run`, `matches_version`, `configuration` (snake_case) và `objective_vector`.
- **Validation & Workloads**:
    - `Workloads` sửa công thức `q = Math.max(0, base_norm - reduced)`, phát `WEEKLY_WORKLOAD_CAP` (có `details.limit` 24/25 và `source` quy tắc) và `ANNUAL_WORKLOAD` (`INSUFFICIENT_DATA`, `null`), phân trang sau khi lọc `teacher_id`.
    - `POST /api/plan-versions/:id/validation` trả `201` + `Location` kể cả khi `VIOLATION`; `GET` trả `404` khi chưa có báo cáo và tính `fresh` theo version, revision, snapshot và live token.
- **Scenario mới (`/dev/ui`)**: `solverApplied`, `solverStale`, `solverInfeasible`, `solverFailed`, `solverQueueFull`, `solverActiveRun`, `validationPass`, `validationViolation`.
- **Thống nhất Dashboard/Layout & reload recovery (mock-only)**:
    - `fixtures/overview.ts`, `fixtures/layout.ts` và `assignment-preview.ts` dùng chung nguồn từ `fixtures/index.ts`, `fixtures/preparation.ts` và gọi `assignmentStore.ensure(mockStore.list())` từ đầu (`6` giáo viên, `9` nhu cầu ở `hk1`, `2` giáo viên ở `thcs-demo`). Riêng `teacher/overview` tạm giữ `readTeacherPortalOverview` cho tài khoản demo giáo viên FE-04 cho tới FE-09.
    - Trên trình duyệt (`document` + `window.sessionStorage`), `assignmentStore` lưu trong envelope `tass-mock-state-v3` cùng dữ liệu nguồn để giữ lượt chạy `?run_id=` và bản nháp qua thao tác reload `F5`; Reset mock đặt lại toàn bộ, đổi scenario đặt lại phương án/governance và giữ nguồn hiện có. Lịch sử/diff chi tiết của lượt chạy trên UI mock dùng trường `solver_runs` / `solver_diffs` trong `/api/mock/plan-versions/:id/workspace` (mock-only, không tạo endpoint API giả).

## FE-08: Mock Governance, Feedback Lifecycle & Planned Endpoints

- **Endpoint mock dự kiến (`mocks/governance-store.ts`, `mocks/handlers/governance.ts`)**: các nghiệp vụ backend chưa chốt hợp đồng API (phản hồi theo phiên bản, mở/đóng lấy ý kiến, lịch sử snapshot, phát hành PDF kèm SHA-256, nguồn/bí danh, quy tắc và nhật ký audit) đi qua `/api/mock/governance/*` và `/api/mock/teacher/feedback`. Riêng `/admin/teachers` tái sử dụng `TeachersPage` (`/api/teachers`, `/api/schools`) hoạt động trên cả hai chế độ `mock` và `api`.
- **Liên kết vòng đời với `mocks/assignment-store.ts`**: bổ sung `setRoundStatus()` (cập nhật `status` giữ nguyên `revision_no` để không làm cũ validation) và `createNextDraftFromRound()` (rẽ sang bản nháp kế tiếp `V{n+1}` kế thừa các dòng hiện hành); `/api/mock/teacher/overview` hỗ trợ tham số `release_id`, trả `released_versions` đã khử trùng lặp theo `(version_no, revision_no)` cùng `version_no`, `revision_no`, `selected_release_id`, `annual_warning` và danh sách `feedback_items`.
- **Seed mặc định & đồng bộ shell/overview (`mocks/handlers/index.ts`)**: `hk1` khởi tạo `2` phản hồi mở + `1` đã xử lý, snapshot legacy `SNAP-HK1-V1` (`is_full: false`), `4` quy tắc (`B-THPT`, `B-THCS`, `R-DUTY`, `LIMIT-T`), nguồn `source-legacy` và hợp nhất `assignmentStore.audit()` với nhật ký quản trị (hỗ trợ tìm kiếm tiếng Việt không dấu). Số lượng phản hồi mở ở sidebar/overview và `recent_audit` ở admin overview đọc trực tiếp từ `governanceStore`.
- **Lưu trữ phiên (`sessionStorage`)**: trên trình duyệt, `governanceStore` dùng chung envelope `tass-mock-state-v3` với phương án, nguồn và danh bạ. Reset mock đặt lại tất cả; đổi scenario đặt lại phần phương án/governance.

Tham chiếu: [MSW browser](https://mswjs.io/guides/integrations/browser), [MSW API](https://mswjs.io/api/setup-worker/), [backend API](../../backend/docs/API.md).

## Sửa lỗi review 16/11/2026

- Coverage của validation/workloads tính cả thành phần bắt buộc chưa có nhu cầu, kiểm tra cửa sổ hiệu lực và tiền kiểm nguồn đã chụp. Dataset mặc định thiếu Ngữ văn 10A2 nên solver gán 9/9 dòng vẫn chưa đủ 10 thành phần; mở phản hồi/hoàn tất/phát hành còn kiểm tra readiness nguồn hiện hành. Scenario `validationPass` tạo đầy đủ nhu cầu trước khi chụp, không bỏ qua guard.
- Cổng giáo viên dùng ID danh bạ/snapshot (101, 105, 201 cho các tài khoản trải nghiệm), lấy phân công và tải từ đúng bản phát hành đã đóng băng. Trước lần phát hành đầu không lộ phân công nháp; chọn bản cũ giữ dữ liệu cũ, phản hồi chỉ nhận bản hiện hành và nhu cầu của chính giáo viên. Ảnh đại diện giữ chỉ số riêng. Fixture portal cũ đã bỏ.
- Mọi thay đổi nguồn/phương án/validation/vòng đời làm hết hạn cache governance, tổng quan và cổng giáo viên cùng các kết quả liên quan. Điều hướng giữa phân công, solver, checks, tải, thống kê và liên kết sửa readiness giữ `round_id/context_id`; ID đợt không hợp lệ không tự chạy PC-01.
- Phát hành PDF đối chiếu version/revision/token/validation và nội dung snapshot với nguồn hiện hành; xác minh base64, kích thước, dấu đầu/cuối PDF và SHA-256. Sau bước băm bất đồng bộ kiểm tra lại nguồn, phase, phản hồi và reset/hủy; phát hành trùng chỉ ghi một tài liệu. Đây là guard mock, chưa phải xác thực PDF/chữ ký số ở backend.
- Regression: `test/frontend-review-regressions.test.mjs`, gồm khôi phục ở tiến trình Node mới, thiếu đầu vào, bản phát hành cá nhân V2/V3, phạm vi điều hướng, cache và PDF stale/corrupt/concurrent/reset/abort.
