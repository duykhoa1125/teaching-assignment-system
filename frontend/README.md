# TASS frontend

Ứng dụng React/TypeScript/Vite được khởi tạo ngày **15/11/2026**, theo [quy trình phát triển frontend](../docs/FRONTEND_DEVELOPMENT.md). Có router, layout responsive ban đầu, QueryClient, HTTP client và các trang tổng quan/giáo viên/phân công/không tìm thấy.

**Đây là bộ khung FE-01. Trang giáo viên và phân công hiện là màn hình chờ triển khai; chưa có CRUD, phiên đăng nhập hoặc kết nối solver trong giao diện.** Không hiển thị dữ liệu nghiệp vụ giả. HTTP client và proxy đã sẵn sàng cho các feature tiếp theo.

## Môi trường

- Node **24.22.2**, npm **11.19.1** là bộ phiên bản đã kiểm chứng; `.node-version` và `packageManager` ghi phiên bản của nhóm.
- `engines` cùng `.npmrc` từ chối Node/npm ngoài dải tương thích. Dùng npm11 với Node24 và commit `package-lock.json`; không tạo thêm lockfile của công cụ khác.
- Docker chỉ cần khi chạy backend/PostgreSQL hoặc kiểm tra bản đóng gói. Build trong Docker dùng Node24 và Nginx, không cần Node trên host.

## Chạy local bằng PowerShell

Tại gốc repo, khởi động backend/PostgreSQL theo [hướng dẫn hạ tầng](../infra/README.md). Nếu chỉ cần hai service này và root `.env` đã có:

```powershell
docker compose up -d --build --wait postgres backend
```

Sau đó, từ gốc repo:

```powershell
Set-Location frontend
npm ci
# Chỉ copy khi chưa có frontend/.env; giữ cấu hình cá nhân đã tồn tại.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Mở [Vite local](http://127.0.0.1:5173/). Frontend vẫn mở được khi backend chưa chạy; những request API được bổ sung sau này cần backend hoạt động. Port5173 cố định, Vite báo lỗi nếu đã có tiến trình khác sử dụng.

Trong `frontend/.env`, đặt `DEV_API_PROXY_TARGET` theo cổng backend thực tế ở root `.env`, ví dụ `http://127.0.0.1:8080`. Khởi động lại Vite sau khi đổi cấu hình. Không dùng hostname Docker `backend` khi Vite chạy trên host.

Vite proxy `/api`, `/v3/api-docs`, `/swagger-ui` sang backend. Client chỉ gọi `/api/...`. Biến `DEV_*` dùng ở dev server; không đặt secret vào biến `VITE_*` vì chúng xuất hiện trong bundle trình duyệt. Đường dẫn/cơ chế cookie/token và CSRF sẽ được cập nhật theo hợp đồng auth khi backend sẵn sàng.

## Kiểm tra và build

Chạy tại `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`npm run format` định dạng mã; `prototype/` được loại trừ để bảo toàn file gốc. Kiểm thử hiện dùng Node test runner và khả năng đọc TypeScript của Node24, không cần bộ test riêng; các ca HTTP nằm trong `test/http.test.mjs`.

`npm run preview` phục vụ `dist/` tại [cổng4173](http://127.0.0.1:4173/) để xem build tĩnh; không có proxy API trong preview. Dùng Vite dev hoặc Docker/Nginx khi kiểm tra API cùng origin.

## Cấu trúc

```text
src/
  app/       # Providers, router, error boundary và layout
  pages/     # Các màn hình; ghép feature khi nghiệp vụ được triển khai
  shared/    # HTTP client, lỗi API và UI dùng chung
  styles/    # Design tokens và style toàn cục
test/        # Kiểm thử hành vi HTTP client
prototype/   # Demo gốc, không đưa vào production build
```

Alias `@/` trỏ đến `src/` trong TypeScript và Vite. Tạo `src/features/<nghiep-vu>/` khi triển khai feature đầu tiên, theo cấu trúc API/types/queries/components trong tài liệu quy trình; chưa tạo các module nghiệp vụ rỗng.

`apiRequest<T>(path, options)` nhận đường dẫn như `/teachers`, tự thêm `/api`, và hỗ trợ `query`, `json`, headers, method, `AbortSignal`. Client xử lý JSON, `204`, lỗi có `code/message`, non-JSON và lỗi mạng/hủy; **kiểu T không thay kiểm tra dữ liệu runtime**. Không tự retry request ghi. QueryClient chỉ retry đọc một lần với lỗi mạng/5xx; các feature phải phân biệt 400/401/403/409/422 theo hợp đồng backend.

## Docker

Từ gốc repo, helper hiện có tiếp tục chạy toàn stack:

```powershell
.\scripts\docker-dev.ps1 up
```

Frontend image `tass-frontend:dev` được build hai giai đoạn: `npm ci`/`npm run build` rồi copy `dist` vào Nginx. Mở [frontend Docker mặc định](http://127.0.0.1:3000/) theo `FRONTEND_PORT` thực tế. Nginx giữ `/healthz`, proxy API/Swagger và fallback cho route con. Không cần migrate/xóa volume DB cho thay đổi frontend này.

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
