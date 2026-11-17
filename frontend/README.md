# TASS frontend

**Quy tắc giao diện:** copy y chang demo về màu sắc, font, icon, họa tiết và bố cục; chỉ thay đổi có lý do cụ thể về lỗi thiết kế, tối ưu kỹ thuật cần thiết hoặc backend. Chi tiết và tiêu chí đối chiếu tại [quy trình frontend](../docs/FRONTEND_DEVELOPMENT.md). Không coi bộ khung hiện tại là giao diện đã khớp hoàn chỉnh.

Ứng dụng React/TypeScript/Vite được khởi tạo ngày **15/11/2026**, theo [quy trình phát triển frontend](../docs/FRONTEND_DEVELOPMENT.md). Có router, khung điều phối React theo demo, QueryClient, HTTP client và các trang tổng quan/giáo viên/phân công/không tìm thấy.

**Đã có nền tảng UI FE-02A và mock MSW FE-02B.** Font Be Vietnam Pro/Manrope và SVG gốc của demo; các component dùng chung được xem thử tại `/dev/ui`. Handler giáo viên hỗ trợ đọc/ghi qua HTTP client; trang giáo viên/phân công vẫn chờ triển khai nghiệp vụ. Chưa có UI CRUD hoàn chỉnh, session hoặc solver mock.

## Khung giao diện điều phối

Đã chuyển logo, sidebar đủ13 mục/3 nhóm, header/breadcrumb, footer, chọn học kỳ, tìm kiếm nhanh, thông báo và hộp tài khoản sang React. CSS, font và ảnh đại diện trích từ demo bằng `npm run assets:shell`; giữ nguyên prototype. Menu mobile, hover/active/focus và View Transition dùng thông số gốc. Chi tiết đối chiếu và phần còn thiếu tại [UI](docs/UI.md).

Các route nghiệp vụ còn là trang chờ, tổng quan hiện chưa phải dashboard của demo. Đây là khung cho vai trò điều phối; chưa chuyển giao diện quản trị/giáo viên, đăng nhập hoặc nghiệp vụ tài khoản. Nội dung khung lấy qua MSW GET `/api/mock/layout`, chỉ chạy mock mode; API mode không gọi endpoint xem thử này.

## Hướng phát triển tiếp theo: UI với mock data

Ưu tiên **hoàn thiện nền tảng UI và giao diện với mock data trước, tích hợp API thật sau**. Các mốc FE-02–08 xây bộ UI, mock dùng chung, session/vai trò mô phỏng và các màn hình; FE-09–11 mới chuẩn bị/nối/nghiệm thu backend.

MSW đã chặn request ở lớp HTTP, dùng fixtures/handlers/scenarios/store tập trung; có reset, nhãn dữ liệu mẫu và lựa chọn `VITE_DATA_SOURCE=mock|api`. Dev mặc định mock; build thông thường mặc định API và loại worker. Mock không tự bật khi API thật lỗi. Xem [hướng dẫn mock](docs/MOCKS.md) và [cách dùng UI/font/icon](docs/UI.md).

Auth thật, backend và PostgreSQL không phải điều kiện để hoàn thiện hoặc nghiệm thu UI mock. Tích hợp thật sẽ dùng lại các màn hình/hooks, rà các hợp đồng đã mock và kiểm chứng lại với backend; session/solver mô phỏng không chứng minh xác thực hoặc tối ưu thật đã hoạt động.

## Môi trường

- Node **24.22.2**, npm **11.19.1** là bộ phiên bản đã kiểm chứng; `.node-version` và `packageManager` ghi phiên bản của nhóm.
- `engines` cùng `.npmrc` từ chối Node/npm ngoài dải tương thích. Dùng npm11 với Node24 và commit `package-lock.json`; không tạo thêm lockfile của công cụ khác.
- Docker chỉ cần khi chạy backend/PostgreSQL hoặc kiểm tra bản đóng gói. Build trong Docker dùng Node24 và Nginx, không cần Node trên host.

## Chạy local bằng PowerShell

Phát triển giao diện không cần khởi động backend/PostgreSQL. Từ gốc repo:

```powershell
Set-Location frontend
npm ci
# Chỉ copy khi chưa có frontend/.env; giữ cấu hình cá nhân đã tồn tại.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Mở [Vite local](http://127.0.0.1:5173/) hoặc [thư viện UI và công cụ mock](http://127.0.0.1:5173/dev/ui). Worker khởi động trước React, không cần backend. Port5173 cố định, Vite báo lỗi nếu đã có tiến trình khác sử dụng. Store mock ở bộ nhớ; reload về dữ liệu ban đầu, Reset mock đặt lại store và query cache ngay trong phiên.

### Khi chủ đích kiểm tra API thật

Chỉ cần bước sau ở giai đoạn tích hợp hoặc kiểm tra proxy. Tại gốc repo, khởi động backend/PostgreSQL theo [hướng dẫn hạ tầng](../infra/README.md). Nếu root `.env` đã có:

```powershell
docker compose up -d --build --wait postgres backend
```

Trong `frontend/.env`, đặt `DEV_API_PROXY_TARGET` theo cổng backend thực tế ở root `.env`, ví dụ `http://127.0.0.1:8080`. Chạy `npm run dev:api` để tắt mock và bật proxy; nếu đã đặt VITE_DATA_SOURCE=mock thì bỏ override đó trước. Khởi động lại Vite sau khi đổi cấu hình. Không dùng hostname Docker `backend` khi Vite chạy trên host.

Trong API mode, Vite proxy `/api`, `/v3/api-docs`, `/swagger-ui` sang backend. Mock mode không bật proxy; request `/api` chưa có handler bị chặn với lỗi501. Client chỉ gọi `/api/...`. Biến `DEV_*` dùng ở dev server; không đặt secret vào biến `VITE_*` vì chúng xuất hiện trong bundle trình duyệt. Đường dẫn/cơ chế cookie/token và CSRF sẽ được cập nhật theo hợp đồng auth khi backend sẵn sàng.

## Kiểm tra và build

Chạy tại `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`npm run format` định dạng mã; `prototype/` và worker sinh tự động được loại trừ. Test dùng Node test runner: HTTP client, MSW handlers/store và lựa chọn nguồn dữ liệu. Không cần backend/DB cho bộ test này.

`npm run preview` phục vụ `dist/` tại [cổng4173](http://127.0.0.1:4173/) để xem build API tĩnh, không có proxy API. `npm run build:mock` tạo `dist-mock/`; xem độc lập bằng `npm run preview -- --outDir dist-mock`. Chỉ build mock khi chọn rõ mode mock; build triển khai thông thường từ chối override VITE_DATA_SOURCE=mock.

## Cấu trúc

```text
src/
  app/       # Providers, router, error boundary và layout
  pages/     # Các màn hình; ghép feature khi nghiệp vụ được triển khai
  features/  # API/types giáo viên làm tài nguyên mẫu
  mocks/     # MSW browser/Node, handlers, fixtures, scenarios và store/reset
  shared/    # HTTP client, lỗi API và UI dùng chung
  styles/    # Design tokens và style toàn cục
test/        # Kiểm thử HTTP client, mock và cấu hình
prototype/   # Demo gốc, không đưa vào production build
```

Alias `@/` trỏ đến `src/` trong TypeScript và Vite. `features/teachers/` hiện có API/types, chưa có UI CRUD; các feature sau tiếp tục theo cấu trúc API/types/queries/components trong tài liệu quy trình.

`src/mocks/` đã có. Component/feature không import fixture trực tiếp; chỉ panel công cụ phát triển truy cập scenario/reset. Các API mock hiện hỗ trợ giáo viên và danh sách trường; dữ liệu lớp/môn/học kỳ mới là fixture. Xem [hướng dẫn mock](docs/MOCKS.md).

`apiRequest<T>(path, options)` nhận đường dẫn như `/teachers`, tự thêm `/api`, và hỗ trợ `query`, `json`, headers, method, `AbortSignal`. Client xử lý JSON, `204`, lỗi có `code/message`, non-JSON và lỗi mạng/hủy; **kiểu T không thay kiểm tra dữ liệu runtime**. Không tự retry request ghi. QueryClient chỉ retry đọc một lần với lỗi mạng/5xx; các feature phải phân biệt 400/401/403/409/422 theo hợp đồng backend.

## Docker

Từ gốc repo, helper hiện có tiếp tục chạy toàn stack:

```powershell
.\scripts\docker-dev.ps1 up
```

Frontend image `tass-frontend:dev` được build hai giai đoạn: `npm ci`/`npm run build` rồi copy `dist` vào Nginx. Mở [frontend Docker mặc định](http://127.0.0.1:3000/) theo `FRONTEND_PORT` thực tế. Nginx giữ `/healthz`, proxy API/Swagger và fallback cho route con. Compose hiện vẫn khởi động toàn stack và đợi backend healthy; chưa có cấu hình demo mock độc lập. Dùng Vite cho công việc UI/mock; không cần migrate/xóa volume DB cho giai đoạn này.

Có thể kiểm tra riêng build image mà không khởi động hoặc thay thế stack:

```powershell
docker build --file frontend/Dockerfile --tag tass-frontend:bootstrap-check .
```

`/healthz` xác nhận Nginx hoạt động, không chứng minh auth/nghiệp vụ đã tích hợp. Các API plan/readiness/solver/results/mutation vẫn yêu cầu Principal tin cậy; HTTP ẩn danh trả401. Proxy không thêm actor/header giả danh.

## Prototype được bảo toàn

`prototype/index.html` là bản sao nguyên byte của `frontend/index.html` trước khi khởi tạo, có nguồn từ `D:/HCMUT/DACN/tass-demo.html` do người dùng cung cấp. File gốc ngoài repo không bị sửa. SHA-256:

```text
030e179e84c2b765d842bfedbeef650186e18126b5a34b3451309c5d840ed0ef
```

Có thể mở file prototype trực tiếp trên máy để đối chiếu. Đăng nhập, phân công và phản hồi trong prototype chỉ dùng dữ liệu trình duyệt/localStorage/sessionStorage; không nối API hoặc CP-SAT thật. Prototype không được copy vào image production.

Demo dùng trần minh họa24 trong JS; cấu hình backend seed có25 theo T. Khi nối nghiệp vụ, lấy policy từ cấu hình/backend đã xác nhận, không hardcode hai giá trị này. Các phụ thuộc auth, dataset, nguồn tải và lifecycle nằm trong [backlog](../docs/BACKLOG.md); [audit hạ tầng](../infra/DOCKER_AUDIT.md) là hồ sơ của giai đoạn demo trước khi khởi tạo.
