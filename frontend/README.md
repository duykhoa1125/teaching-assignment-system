# TASS frontend

**Quy tắc giao diện (17/11/2026):** không còn yêu cầu khớp hoàn toàn prototype vì người dùng đã chỉnh sửa giao diện đẹp hơn. Lấy giao diện hiện tại và các chỉnh sửa đã được duyệt làm chuẩn; prototype là tài liệu tham khảo gốc. Giữ các cải tiến, kiểm chứng responsive, khả năng truy cập và tương tác theo [quy trình frontend](../docs/FRONTEND_DEVELOPMENT.md).

Cập nhật **17/11/2026**. React/TypeScript/Vite với React Router, TanStack Query và MSW. FE-01–07 đã có nền tảng và các luồng nghiệp vụ mô phỏng; FE-08 đã hoàn thành vòng QA mock theo [ma trận kiểm chứng](docs/FE08_QA.md), có giới hạn phạm vi được ghi rõ. Chưa nghiệm thu tích hợp API thật (FE-09–11).

## Phạm vi hiện có

- Session mô phỏng, đăng nhập/đăng xuất, chọn vai trò, phạm vi và ngữ cảnh học kỳ/đợt.
- Tổng quan, CRUD giáo viên/danh mục/năm học/học kỳ/đợt; chuẩn bị dữ liệu, nhu cầu và readiness.
- Workspace DRAFT, sửa/khóa, snapshot/revision; submit/poll/cancel solver mô phỏng, validation, tải và thống kê.
- Phản hồi, lịch sử, phát hành PDF mô phỏng, nguồn/bí danh/quy tắc/nhật ký và cổng giáo viên theo bản phát hành.
- Component dùng chung, skeleton, dropdown, tooltip, focus và toast tại `/dev/ui`.

Font, SVG và tài nguyên gốc được giữ từ demo; các ngoại lệ giao diện đã duyệt được ghi tại [UI](docs/UI.md). Prototype nguyên byte. Build/test đạt không có nghĩa mọi màn hình, responsive và hiệu ứng đã khớp hoặc được nghiệm thu.

## Mock và bước tiếp theo

Dev mặc định mock; MSW chặn request qua HTTP client. Dữ liệu nguồn/danh bạ/phương án/governance lưu trong sessionStorage có phiên bản; reload giữ dữ liệu trong cùng tab, Reset mock khôi phục fixture. Nếu storage bị chặn thì chỉ lưu bộ nhớ; chưa đồng bộ hai tab.

Auth, solver, validation và phát hành PDF hiện là mô phỏng. Các hợp đồng `/api/mock/*` không đại diện endpoint backend đã có. API mode không tự bật mock khi request lỗi. Backend/PostgreSQL không cần cho phát triển UI mock.

Bước hiện tại: [FE-09 — đối chiếu API và kế hoạch tích hợp](docs/FE09_API_INTEGRATION.md) đã có lượt rà soát source, bảng lệch DTO và danh sách phụ thuộc. Chưa chốt/triển khai auth, API lựa chọn cấu hình/workspace và dataset đăng nhập thật nên FE-09 chưa nghiệm thu đầy đủ. Sau khi giải quyết các phụ thuộc, FE-10 nối từng feature; FE-11 nghiệm thu tích hợp. Xem [quy trình](../docs/FRONTEND_DEVELOPMENT.md), [mock](docs/MOCKS.md) và [QA FE-08](docs/FE08_QA.md).

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

Mở [Vite local](http://127.0.0.1:5173/) hoặc [thư viện UI và công cụ mock](http://127.0.0.1:5173/dev/ui). Worker khởi động trước React, không cần backend. Port5173 cố định, Vite báo lỗi nếu đã có tiến trình khác sử dụng. Store mock lưu trong sessionStorage khi khả dụng; Reset mock đặt lại dữ liệu, phiên và query cache.

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
  features/  # API/types/queries và nghiệp vụ theo tính năng
  mocks/     # MSW browser/Node, handlers, fixtures, scenarios và store/reset
  shared/    # HTTP client, lỗi API và UI dùng chung
  styles/    # Design tokens và style toàn cục
test/        # Kiểm thử HTTP client, mock và cấu hình
prototype/   # Demo gốc, không đưa vào production build
```

Alias `@/` trỏ đến `src/` trong TypeScript và Vite. Feature giữ API/types/queries và logic nghiệp vụ; page ghép giao diện. Component không import fixture trực tiếp. Các handler/store/scenario dùng chung được mô tả tại [mock](docs/MOCKS.md).

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
