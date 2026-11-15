# Quy trình phát triển frontend TASS

Cập nhật: **15/11/2026**. Trạng thái: **đã có FE-01, nền tảng UI FE-02A và mock MSW FE-02B; chưa có UI nghiệp vụ/auth/solver hoàn chỉnh**.

Hướng phát triển: **hoàn thiện nền tảng và giao diện với mock data trước, tích hợp API thật sau**. React/TypeScript/Vite, React Router, TanStack Query và HTTP client đã có; đã có font Be Vietnam Pro/Manrope, SVG gốc của demo, component dùng chung, MSW và khung điều phối React. Mock giáo viên/danh sách trường đã hoạt động qua HTTP client; session và solver mô phỏng, UI CRUD nghiệp vụ còn ở mốc sau. Xem [README frontend](../frontend/README.md), [UI](../frontend/docs/UI.md) và [mock](../frontend/docs/MOCKS.md).

## 1. Hiện trạng và mục tiêu

### Quy tắc bắt buộc: sao chép đúng giao diện demo

**Giao diện phải y chang `frontend/prototype/index.html`**: màu sắc, font và trọng lượng chữ, icon/SVG/logo, họa tiết/minh họa, bố cục, kích thước, khoảng cách và các trạng thái/responsive. Không thay bằng thiết kế hoặc tài nguyên gần giống do sở thích hay sự tiện dụng của thư viện. Tái cấu trúc component/mock không được tự làm đổi diện mạo.

Ngoại lệ chỉ gồm lỗi thiết kế đã xác định, tối ưu kỹ thuật/hiệu năng cần thiết, hoặc điều chỉnh cần cho backend. Ưu tiên tối ưu bên trong mà không đổi phần nhìn thấy; nếu buộc thay đổi giao diện, ghi rõ vấn đề, lý do, trước/sau và tác động, giữ phạm vi tối thiểu. Đối chiếu demo và ứng dụng ở cùng viewport/trạng thái trước nghiệm thu; build/test đạt không thay kiểm chứng trực quan.

Bộ khung hiện có vẫn cần tiếp tục đối chiếu và hoàn thiện; không coi nền tảng đã có là toàn bộ giao diện đã khớp demo.

| Khu vực | Hiện trạng | Hướng phát triển |
| --- | --- | --- |
| Frontend | React, font/icon, component dùng chung và MSW; prototype nguyên bản tại `frontend/prototype/index.html` | Dùng nền tảng này để hoàn thiện từng màn hình nghiệp vụ với mock |
| Backend | Có CRUD, plan/current DRAFT, readiness, async solver, kết quả/validation và sửa/khóa phân công | Tái sử dụng hợp đồng hiện hành |
| Authentication | Chưa có login/session/JWT thật; API nghiệp vụ yêu cầu Principal tin cậy | Làm session/vai trò mô phỏng cho UI trước; auth thật thuộc giai đoạn tích hợp |
| Docker | Đã build frontend bằng Node24, Nginx phục vụ `dist`, proxy API và SPA fallback | Giữ quy trình này khi bổ sung feature |
| Nghiệp vụ còn thiếu | Hồ sơ giáo viên tổng hợp, API xác nhận nguồn tải, lifecycle/feedback và các phần khác trong backlog | Theo dõi phụ thuộc, không coi là API đã có |

Mục tiêu trước mắt là frontend chạy độc lập, kế thừa phong cách demo, có đầy đủ trạng thái giao diện và tương tác với mock data. Thứ tự: **nền tảng UI/mock → các màn hình và luồng mô phỏng → nghiệm thu UI → tích hợp backend**. Backend, PostgreSQL và auth thật không phải điều kiện để phát triển hoặc nghiệm thu giai đoạn mock.

Luồng người quản lý cần hoàn thiện bằng mock trước, rồi kiểm chứng lại bằng backend ở giai đoạn sau:

```text
Đăng nhập → chọn học kỳ/đợt → chuẩn bị dữ liệu → readiness
          → tạo/đọc current DRAFT → sửa/khóa phân công
          → chạy/theo dõi/hủy solver → xem kết quả, tải và validation
```

Phạm vi là phân công cố định theo học kỳ/lớp/môn/thành phần. Không đưa thời khóa biểu, đổi giáo viên giữa kỳ hoặc SOL-10 nhiều giai đoạn vào đợt triển khai này. Các thành phần chính khóa/chuyên đề/tăng cường có thể nhận các giáo viên khác nhau.

## 2. Công nghệ và quyết định cần ghi nhận

### 2.1. Phương án khởi đầu

| Thành phần | Đề xuất | Trách nhiệm |
| --- | --- | --- |
| UI | React + TypeScript | Component và kiểu dữ liệu; bật TypeScript strict |
| Build/dev server | Vite, template `react-ts` | Chạy local, cập nhật giao diện khi sửa mã và build tài nguyên tĩnh |
| Routing | React Router | URL, layout, trang không tồn tại và điều hướng theo ngữ cảnh |
| Dữ liệu server | TanStack Query | Query, mutation, cache, tải lại và polling solver |
| HTTP | `fetch` qua HTTP client dùng chung | Base URL, headers, đọc response và chuẩn hóa lỗi |
| Styling | CSS variables + CSS Modules | Màu sắc, typography, khoảng cách và style theo component |
| Package manager | npm | Một lockfile thống nhất và `npm ci` cho môi trường tái lập |

Frontend là SPA. Trong giai đoạn UI, tầng mock mô phỏng response và trạng thái thay đổi dữ liệu; khi tích hợp, backend Spring Boot cung cấp nghiệp vụ thật. Cả hai dùng cùng feature API và query/mutation hooks. Khởi đầu bằng state của React cùng TanStack Query; chỉ bổ sung công cụ quản lý state khác khi có nhu cầu cụ thể.

Chọn thư viện form, bộ UI hoặc công cụ kiểm thử khi có ca sử dụng cụ thể, rồi ghi lý do vào PR. Component tương tác như dialog, menu, combobox phải hỗ trợ bàn phím, focus và nhãn truy cập; nếu dùng thư viện hỗ trợ, thống nhất trước khi nhân rộng.

### 2.2. Các quyết định theo giai đoạn

| Quyết định | Nội dung cần ghi | Phụ thuộc |
| --- | --- | --- |
| Runtime | Phiên bản Node/npm cụ thể đáp ứng Vite được chọn; cách cố định phiên bản | FE-01 |
| Dependencies | Phiên bản trực tiếp trong `package.json`, lockfile được commit | FE-01 |
| Phong cách UI | Phần giữ từ demo, token màu/font/khoảng cách, bảng/form/dialog/thông báo và trạng thái tải/rỗng/lỗi | FE-02 |
| Mock | MSW3.0.6, fixture ID ổn định, độ trễ/scenario/reset; dữ liệu trong bộ nhớ và reload về fixture | FE-02B đã có; lưu session/run thuộc mốc sau |
| Session mô phỏng | Vai trò, trạng thái hết phiên/thiếu quyền, điều hướng và cách khôi phục/reset | FE-04; không cần auth backend |
| Ngữ cảnh | Trường, học kỳ, đợt, version thống nhất trong fixture và URL | FE-02–07; đối chiếu backend ở FE-09 |
| Auth thật | Endpoint, cookie hay token, khôi phục phiên, hết hạn, logout, lỗi quyền; CSRF nếu dùng cookie | FE + backend ở FE-09/10 |
| Dataset tích hợp | Fixture DB đủ nguồn/xác nhận để chạy solver; tài khoản hợp lệ | FE + backend ở FE-09/10 |
| Cấu hình/quy tắc thật | Nguồn lấy ID và metadata đã xác nhận; API lựa chọn chưa có thì ghi phụ thuộc | FE + backend ở FE-09/10 |

Session mock không quyết định dùng JWT hay cookie cho auth thật. Những luồng chưa có API backend được ghi là hợp đồng dự kiến, không đặt endpoint giả vào danh sách API đã triển khai. Khi tích hợp, backend kiểm tra quyền thực; việc ẩn nút trên giao diện chỉ hỗ trợ trải nghiệm sử dụng.

## 3. Khởi tạo trong repository

Ứng dụng nằm tại `frontend/`, có package và quy trình build riêng, bên cạnh `backend/`, `algorithm/`, `infra/`. Chưa cần thêm workspace manager cho một ứng dụng frontend.

Thực hiện lần lượt khi bắt đầu FE-01:

1. Kiểm tra working tree và tạo nhánh từ `dev` theo [quy trình Git](git-flow.md). Giữ các thay đổi ngoài phạm vi của người khác.
2. Lưu nguyên byte `frontend/index.html` vào `frontend/prototype/index.html`, đối chiếu SHA-256 trong [README frontend](../frontend/README.md). Giữ nguyên file gốc ngoài repository.
3. Kiểm tra Node/npm và chọn phiên bản Vite tương thích. Ghi phiên bản runtime trong cấu hình của nhóm và README.
4. Sinh template `react-ts` ở thư mục tạm trong workspace, rồi đưa các file cần thiết vào `frontend/`; đối chiếu từng file trùng tên. Không chạy trình scaffold đè trực tiếp lên thư mục đang có demo/Dockerfile.
5. Thiết lập TypeScript strict, lint, format và alias `@/` thống nhất giữa TypeScript và Vite. Giữ UTF-8, LF; quy ước định dạng phù hợp `.editorconfig`.
6. Tạo router, layout cơ bản, QueryClient và HTTP client. Chỉ tạo thư mục có mã sử dụng.
7. Cập nhật Dockerfile và `.dockerignore` trong cùng thay đổi chuyển ứng dụng: thay cách copy HTML demo bằng build frontend và cho phép các đầu vào build cần thiết. Bước này đã thực hiện trong FE-01; không để Docker phục vụ Vite entry HTML chưa build.
8. Cập nhật README, file cấu hình mẫu và cách chạy. Bản demo vẫn là tài liệu tham chiếu; nếu cần tiếp tục phục vụ demo, ghi rõ URL/cách mở.

Các script cần có sau khởi tạo:

| Lệnh tại `frontend/` | Ý nghĩa |
| --- | --- |
| `npm ci` | Cài dependencies từ lockfile đã commit |
| `npm run dev` | Chạy Vite dev server |
| `npm run typecheck` | Kiểm tra kiểu dữ liệu |
| `npm run lint` | Kiểm tra quy ước mã |
| `npm run build` | Kiểm tra/build ứng dụng vào `dist/` |
| `npm run preview` | Xem thử bản build trên máy |

Các script trên đã có sau FE-01. Bổ sung `npm run format`, `npm run format:check` và `npm test` (Node test runner cho HTTP client). `preview` chỉ phục vụ build tĩnh, không có API proxy; dùng Vite dev hoặc Docker khi kiểm tra cùng backend. CI frontend chưa được thiết lập; khi bổ sung, dùng cùng các lệnh kiểm tra của nhóm.

## 4. Kiến trúc mã nguồn

Cấu trúc đích dưới đây bao gồm phần đã có và phần nghiệp vụ sẽ bổ sung. Hiện có app/pages/shared/styles/mocks và API/types của teachers; auth, queries/components nghiệp vụ và assignment feature chưa được triển khai đầy đủ.

```text
frontend/
├── prototype/                  # HTML demo được lưu nguyên bản
├── public/                     # Tài nguyên cần giữ tên/đường dẫn
├── src/
│   ├── app/
│   │   ├── router.tsx          # Route và lắp ráp màn hình
│   │   ├── providers.tsx       # QueryClient, session và provider ứng dụng
│   │   └── layouts/            # Sidebar, header và khung trang
│   ├── pages/
│   │   ├── teachers/
│   │   └── assignment-workspace/
│   ├── features/
│   │   ├── auth/
│   │   ├── teachers/
│   │   │   ├── api.ts         # Hàm gọi API giáo viên
│   │   │   ├── queries.ts     # Query keys, query và mutation hooks
│   │   │   ├── types.ts       # DTO/request và kiểu dữ liệu của feature
│   │   │   ├── components/    # TeacherForm, TeacherTable...
│   │   │   └── index.ts       # Giao diện công khai khi cần
│   │   ├── teaching-demands/
│   │   └── assignment/        # Plan, readiness, sửa/khóa, solver, kết quả
│   ├── mocks/                 # Chỉ được nạp khi chọn chế độ mock
│   │   ├── browser.ts         # Khởi động tầng chặn request trước khi render
│   │   ├── handlers/          # Mô phỏng response theo tài nguyên/luồng
│   │   ├── fixtures/          # Bộ dữ liệu gốc, ID và quan hệ ổn định
│   │   ├── scenarios/         # Thành công, rỗng, chậm và lỗi
│   │   └── store.ts           # Dữ liệu mock thay đổi được và thao tác reset
│   ├── shared/
│   │   ├── api/               # HTTP client và lỗi dùng chung
│   │   ├── ui/                # Button, Dialog, trạng thái tải/rỗng/lỗi
│   │   └── lib/               # Hàm thuần dùng chung
│   ├── styles/                # Reset và design tokens
│   └── main.tsx
├── package.json
├── package-lock.json
├── vite.config.ts
└── Dockerfile
```

### 4.1. Trách nhiệm và chiều phụ thuộc

```text
app → pages → features → shared
```

- `app` cấu hình ứng dụng và ghép các phần qua router/providers.
- `pages` điều phối màn hình, đọc ngữ cảnh URL và ghép các tính năng.
- `features` giữ nghiệp vụ, API, hooks và component đặc thù.
- `shared` cung cấp phần dùng chung, không import ngược từ feature/page/app.
- Page có thể dùng trực tiếp `shared`. Feature không import page hoặc cấu hình app.
- Khi hai feature cần phối hợp, ưu tiên điều phối ở page. Nếu cần import lẫn nhau, dùng giao diện công khai và tránh phụ thuộc vòng.
- Test đặt gần phần mã được kiểm tra; kịch bản xuyên suốt đặt riêng khi bổ sung bộ kiểm thử.

`TeacherForm` thuộc `teachers`; `Button` thuộc `shared/ui`. Chỉ đưa component lên shared khi trách nhiệm dùng chung đã rõ. Feature `assignment` có thể tách thư mục con theo plan/readiness/solver/results khi lớn lên.

### 4.2. Luồng đọc và ghi dữ liệu

```text
Page/component → query hoặc mutation hook → feature API → HTTP client
                                                        ├─ mock handler → mock store
                                                        └─ backend thật (giai đoạn sau)
```

Component hiển thị dữ liệu và nhận tương tác. `api.ts` định nghĩa request/response; `queries.ts` quản lý cache và tác động sau mutation. Component/hook không import trực tiếp fixture và không có nhánh xử lý riêng theo chế độ dữ liệu. HTTP client xử lý giao thức, không quyết định điều kiện nghiệp vụ của giáo viên hoặc phương án. `app` là điểm khởi động mock; mock có thể dùng kiểu dữ liệu của feature nhưng feature không phụ thuộc ngược vào mock.

Giữ DTO `snake_case` theo backend ở bước đầu. Chỉ tạo mapper/view model khi giao diện cần dữ liệu khác cấu trúc response; không chuyển đổi toàn bộ dữ liệu bằng quy tắc đổi tên ngầm.

### 4.3. Thiết kế mock data

MSW và nền tảng fixture/handler/scenario/store/reset đã triển khai trong FE-02B; yêu cầu dưới đây áp dụng tiếp cho các feature sau. Phạm vi hiện có API mock giáo viên, GET danh sách trường và hợp đồng xem thử khung `/api/mock/layout` (không phải endpoint backend/session). Fixture lớp/môn/học kỳ đã có nhưng chưa có handler; session và solver chưa mô phỏng.

- Dùng MSW ở tầng HTTP để các query/mutation dùng cùng đường dẫn, request và response như khi nối backend; không rải dữ liệu giả trong component.
- Khởi động mock xong trước khi render ứng dụng để tránh request đầu tiên đi đến proxy thật. Request nghiệp vụ chưa có handler phải báo lỗi rõ ngay trong mock mode, không chuyển tiếp sang backend; asset và HMR vẫn tải bình thường.
- Fixture có ID, quan hệ trường/học kỳ/lớp/môn/giáo viên/round/version ổn định. Bảng, dashboard, tải và validation phải dựa trên cùng bộ dữ liệu, tránh mỗi màn hình có một bản riêng lệch nhau.
- Mock store hỗ trợ tạo/sửa/xóa và các trạng thái cần để đi hết luồng. Query invalidation vẫn đi qua TanStack Query; không sửa state riêng trong component để giả lập lưu thành công.
- Có scenario chọn được và tái lập: dữ liệu bình thường, rỗng, tải chậm, lỗi400/401/403/409/422/503, snapshot cũ, solver không có nghiệm/bị hủy/thất bại. Không gây lỗi ngẫu nhiên khó tái hiện.
- Quy định rõ dữ liệu nào mất khi reload và dữ liệu nào được giữ để thử luồng khôi phục session/run. Nếu lưu browser storage, dùng namespace/phiên bản riêng cho mock và không lẫn session/dữ liệu API thật.
- Có thao tác reset về fixture gốc; reset đồng thời mock store, lượt chạy mô phỏng, session liên quan và query cache để UI đọc lại nhất quán.
- Ở FE-07, solver mock chỉ mô phỏng trạng thái và kết quả đã chuẩn bị theo kịch bản; không chạy CP-SAT hay chứng minh tối ưu. Tải/validation mô phỏng không phải kết quả tính/kiểm chứng của backend.
- Ở FE-04, đăng nhập mock dùng tài khoản/vai trò minh họa, không gọi auth thật hoặc tạo token/header để giả danh trên backend. Nhãn dữ liệu mẫu đã có; session/vai trò chưa được triển khai.

Lựa chọn `VITE_DATA_SOURCE=mock|api` đã hoạt động. `npm run dev` mặc định mock, `dev:api` bật proxy và gỡ worker cũ nếu có. Giá trị không hợp lệ hoặc ép mock vào build API làm Vite báo lỗi; không tự fallback. `npm run build` tạo bản API không worker/handler/mock tools; `build:mock` tạo bản mẫu có nhãn ở `dist-mock`. Cách chọn scenario, reset và quy tắc reload nằm trong [hướng dẫn mock](../frontend/docs/MOCKS.md).

## 5. Quản lý state và điều hướng

| Loại state | Nơi quản lý | Quy tắc |
| --- | --- | --- |
| Dữ liệu qua API client (mock hoặc thật) | TanStack Query | Không sao chép toàn bộ danh sách/plan vào một global store UI khác; mock store nằm phía handler |
| Học kỳ, round, version, bộ lọc/phân trang | URL khi cần khôi phục/chia sẻ | Parse và kiểm tra giá trị; đổi filter thì reset offset |
| Form đang nhập, dialog, chọn dòng | State/form trong feature | Giữ trong phạm vi màn hình; bỏ chọn khi ngữ cảnh dữ liệu đổi |
| Session và quyền hiển thị | Module session, cung cấp qua provider | Mock mô phỏng vai trò để thử UI; API thật kiểm tra quyền ở backend |
| Theme/sidebar | State giao diện, có thể lưu localStorage | Chỉ lưu tùy chọn giao diện |

Query key phải có đủ ngữ cảnh thực tế và tham số lọc. Ví dụ minh họa:

```ts
['teachers', { schoolId, q, limit, offset }]
['assignments', { versionId, teacherId, isLocked, limit, offset }]
['solver-run', { runId }]
```

Không dùng object chứa giá trị chưa chuẩn hóa từ form làm ngữ cảnh. Dọn cache có dữ liệu người dùng khi logout/đổi tài khoản. Khi chuyển round/version, hủy hoặc bỏ qua response cũ để không hiển thị lẫn ngữ cảnh.

Sau mutation phân công, cập nhật metadata revision từ response của handler/backend rồi làm mới các query liên quan: assignments, workloads, readiness, optimization và validation. Báo cáo validation cũ vẫn được hiển thị như lịch sử nếu có nhãn freshness rõ ràng.

## 6. Quy ước tích hợp API

Nguồn hợp đồng là [API.md](../backend/docs/API.md), các tài liệu nghiệp vụ liên quan và OpenAPI khi kiểm tra backend. Các API đã có dùng cùng hợp đồng cho mock và tích hợp thật. Với màn hình chưa có API, ghi riêng DTO/luồng dự kiến và phụ thuộc backend; vẫn có thể phát triển và nghiệm thu UI bằng mock. Nếu DTO/tài liệu/code khác nhau, xác minh với backend và cập nhật hợp đồng liên quan.

### 6.1. HTTP và dữ liệu

- Gọi `/api/...` qua HTTP client chung, không hardcode host trong component.
- Xử lý response `204` không có body; không gọi JSON parser vô điều kiện.
- Giữ mã lỗi nghiệp vụ và chi tiết từ backend để feature xử lý; phân biệt lỗi HTTP, mất mạng và request bị hủy.
- CRUD danh sách trả mảng với `limit/offset`, chưa có total. Hiển thị phân trang trước/sau; có thể đọc thêm một bản ghi để xác định trang tiếp, hoặc cho phép trang tiếp rỗng. Không tự tạo tổng số bản ghi từ độ dài trang hiện tại.
- Assignments/workloads có `items/total/limit/offset`; dùng đúng kiểu response riêng.
- `PUT` gửi đủ trường bắt buộc; trường tùy chọn bỏ qua sẽ thành `null`. Request không gửi trường chỉ đọc hoặc trường UI phụ trợ.
- Ngày nghiệp vụ giữ dạng `YYYY-MM-DD`, không chuyển qua UTC làm lệch ngày. Thời điểm có múi giờ được định dạng rõ trên UI.
- Giá trị thiếu/null hiển thị là chưa có dữ liệu hoặc không áp dụng theo hợp đồng; không thay mặc định bằng 0.
- TypeScript không kiểm tra response ở runtime; các giá trị quyết định điều hướng/trạng thái cần được kiểm tra hợp lệ trước khi dùng.

### 6.2. Trạng thái giao diện và lỗi

Mỗi màn hình đọc dữ liệu cần có loading, empty, error và success. Khi tải lại nền, có thể giữ dữ liệu cũ nhưng phải thể hiện đang cập nhật. Form chỉ đóng hoặc báo thành công sau response ghi thành công; ngăn gửi lặp khi request đang chờ.

| Tình huống | Hành vi frontend |
| --- | --- |
| 400 | Hiển thị lỗi request/form theo mã và chi tiết thực tế |
| 401 | Xử lý theo hợp đồng session; tránh vòng lặp chuyển đến trang đăng nhập |
| 403 | Thông báo thiếu quyền/phạm vi; không tự thử bằng actor khác |
| 404 | Phân biệt tài nguyên không còn với trạng thái chưa tạo plan/report |
| 409 | Xử lý theo mã: revision cũ, khóa, snapshot cũ hoặc lượt chạy đang hoạt động |
| 422 | Hiển thị nguyên nhân nghiệp vụ/nguồn dữ liệu và đường dẫn xử lý nếu đã có màn hình phù hợp |
| 503 `SOLVER_QUEUE_FULL` | Thông báo chưa tạo lượt chạy, cho phép người dùng thử lại sau |
| Mất mạng/timeout khi ghi | Trạng thái kết quả có thể chưa biết; đọc lại dữ liệu hoặc lượt chạy trước khi gửi lại |

Không retry tự động mutation thay đổi dữ liệu. Retry GET cần giới hạn và không lặp các lỗi xác thực/đầu vào. Luôn có thông báo cho người dùng khi request thất bại; không chỉ ghi console.

## 7. Các quy tắc riêng của TASS

### 7.1. Auth và dữ liệu phát triển

Giai đoạn UI dùng session/vai trò mô phỏng và fixture trong frontend. Có thể đi hết luồng plan/readiness/solver/results/mutation bằng mock mà không cần khởi động backend, PostgreSQL hoặc đăng nhập thật. Đây là đầu ra được nghiệm thu của giai đoạn UI, không phải nghiệm thu tích hợp.

Ở giai đoạn API thật, auth backend là phụ thuộc của các endpoint nghiệp vụ trên. CRUD hiện chưa có cơ chế phân quyền hoàn chỉnh; việc CRUD chạy được không chứng minh auth đã tích hợp. Không thêm header actor/user giả hoặc dùng tài khoản seed DISABLED để vượt quyền.

Fixture DB để tích hợp solver cần đủ dữ liệu nguồn, inventory và xác nhận mà backend yêu cầu; fixture giao diện không thay thế được bộ dữ liệu này. Một vài giáo viên/lớp/môn tạo bằng CRUD chưa đủ để chạy solver. Các nguồn chưa có API quản trị cần fixture được backend chuẩn bị ở giai đoạn tích hợp.

Các quy tắc ở mục7.2–7.4 là hành vi đích để handler mô phỏng các trạng thái quan trọng, rồi kiểm chứng lại với backend thật. Mock không cần tái triển khai toàn bộ bộ tính tải, validator hoặc thuật toán tối ưu.

### 7.2. Plan, snapshot và sửa phân công

- Đọc plan của round trước; chỉ tạo khi chưa có plan. API hiện không tự tạo DRAFT kế tiếp.
- Chỉ cho sửa/khóa/chạy solver khi trạng thái và quyền phù hợp; backend vẫn kiểm tra lại ở thời điểm ghi.
- Gửi `expected_revision` từ response API client, không tự cộng1 trong UI. Handler mô phỏng revision/no-op/xung đột; khi tích hợp, dùng revision backend trả về vì một thao tác có thể tăng nhiều lần hoặc không đổi.
- `assignmentId` là ID dòng `plan_demand` từ GET assignments, khác `demand_id`.
- Khóa nhóm không ép các thành phần cùng giáo viên. Batch là atomic; không báo thành công một phần khi backend rollback.
- Snapshot cũ cần được hiển thị và xử lý theo hợp đồng refresh; không tự refresh rồi ghi lại thao tác cũ âm thầm.
- Unlock có ngoại lệ cho snapshot cũ theo [hợp đồng mutation](../backend/docs/ASSIGNMENT_MUTATION_API.md): đọc revision mới, refresh khi cần rồi mới tiếp tục sửa/khóa/chạy.

### 7.3. Solver và kết quả

1. Đọc readiness và giải thích các vấn đề nguồn. `can_run_solver` là tiền kiểm, không bảo đảm POST run sẽ được chấp nhận.
2. POST run với revision/config/rule set thực. Khi nhận `202`, lưu `runId` và bắt đầu poll.
3. Nếu nhận `409 SOLVER_RUN_ACTIVE`, theo `Location` để đọc lượt đang chạy, không tạo vòng lặp submit.
4. Poll có chu kỳ giới hạn, dừng khi terminal hoặc rời màn hình; request hủy chỉ gửi khi người dùng chọn hủy. Rời trang không tự hủy solver.
5. Đưa run ID vào URL hoặc cách khôi phục đã thống nhất; sau reload đọc lại API. ID phía client không phải bằng chứng quyền truy cập.
6. `CANCEL_REQUESTED` chưa phải `CANCELLED`; hủy sau khi apply đã commit không hoàn tác kết quả.
7. Phân biệt trạng thái thực thi với trạng thái apply. Chỉ `apply_outcome=APPLIED` mới xác nhận phân công đã được lưu; `SUCCEEDED` riêng lẻ chưa đủ.
8. Sau apply, tải lại dữ liệu đã lưu từ API assignments/workloads. Không hiển thị candidate chưa apply như phương án hiện hành.

Giữ nguyên các trạng thái như `INFEASIBLE`, `UNKNOWN`, `STALE`, `NOT_DRAFT` theo hợp đồng; dịch nhãn hiển thị nhưng không gộp thành một trạng thái thành công chung.

### 7.4. Tải và validation

- Dùng tên, số tiết và tải theo snapshot/version từ API kết quả; không trộn dữ liệu nguồn sống với lịch sử.
- Lấy chính sách tải từ fixture cấu hình trong mock mode và từ backend khi tích hợp. Demo hiện dùng24 trong JS, seed minh họa có25; không hardcode một trong hai thành ngưỡng chung trong component.
- Giữ `INSUFFICIENT_DATA`, `NOT_APPLICABLE` và `null` đúng ý nghĩa; chưa có dữ liệu năm không có nghĩa tải năm bằng 0.
- `201` khi tạo validation nghĩa báo cáo được lưu; `overall_status` vẫn có thể là `VIOLATION`.
- Nhãn freshness và `matches_version` quyết định báo cáo/proof có còn mô tả phương án hiện tại. Sửa tay có thể làm kết quả kiểm tra cũ hết hiệu lực.
- Quy tắc tải hiện là MVP minh họa; không đổi nhãn thành đạt quy định thực tế khi chưa có dữ liệu/quy tắc tương ứng.

## 8. Môi trường local và Docker

### 8.1. Khi phát triển

- Chạy frontend bằng `npm ci` và `npm run dev` tại `frontend/`, mặc định mock và không cần backend/PostgreSQL. `/dev/ui` xem component và kiểm tra GET giáo viên qua HTTP client/TanStack Query/MSW; trang giáo viên nghiệp vụ còn chờ FE-03.
- Chỉ khởi động PostgreSQL/backend theo [hướng dẫn hạ tầng](../infra/README.md) khi chủ đích kiểm tra API thật; đây là bước của giai đoạn tích hợp.
- Vite dùng cổng5173; Nginx toàn stack mặc định dùng3000. Kiểm tra xung đột trước khi chạy.
- Vite proxy `/api` đến địa chỉ backend được publish trên host, theo `.env` thực tế; không dùng hostname Docker `backend` từ trình duyệt/host.
- Đích proxy chỉ thuộc cấu hình dev server, có thể dùng biến như `DEV_API_PROXY_TARGET`. Base URL phía client mặc định là `/api`.
- Khi mock bật, handler xử lý request nghiệp vụ trước proxy và không để request chưa được hỗ trợ lọt tới backend. Khi mock tắt, proxy phục vụ kiểm tra API thật; không lẫn hai nguồn dữ liệu trong một phiên.
- Biến `VITE_*` sẽ được đưa vào bundle phía trình duyệt; không chứa secret. Giữ `.env` backend/root tách với cấu hình frontend và commit file mẫu phù hợp.
- Khi auth dùng đường dẫn ngoài `/api`, cập nhật proxy/cookie/CSRF theo hợp đồng auth. Thử trên cấu hình thực trước khi nghiệm thu session.

### 8.2. Khi đóng gói

- Build nhiều giai đoạn: Node chạy `npm ci`/build, Nginx phục vụ `dist`.
- Cập nhật allowlist `.dockerignore` cho package, lockfile, cấu hình, `src` và tài nguyên cần build; giữ secrets, cache, `node_modules` và prototype ngoài build nếu không cần phục vụ.
- Giữ proxy API/OpenAPI/Swagger, `/healthz` và SPA fallback hiện có. Lỗi `/api/...` phải đi tới backend, không bị chuyển thành HTML trang chủ.
- Thử mở trực tiếp và reload một route con, tải asset. Khi kiểm tra API mode, thêm proxy API và đăng nhập khi auth đã có.
- Docker runtime vẫn build bản API; Compose khởi động toàn stack và phụ thuộc healthcheck backend. Bản demo mock độc lập đã có qua build:mock/preview, chưa thêm image Docker mock riêng.
- Không xóa volume PostgreSQL để giải quyết lỗi frontend; kiểm tra migrations theo hướng dẫn backend.

## 9. Thứ tự triển khai và đầu ra

| Mốc | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| FE-00 | Tài liệu quy trình này và liên kết tra cứu | Có phạm vi, kiến trúc, phụ thuộc và tiêu chí nghiệm thu |
| FE-01 | Scaffold, runtime, scripts, router/providers, HTTP client, chuyển Docker build | Typecheck/lint/build đạt; Docker phục vụ ứng dụng đã build; demo gốc được bảo toàn |
| FE-02A | Nền tảng UI dùng chung | Be Vietnam Pro/Manrope, SVG gốc demo, tokens/layout, form/bảng/dialog/thông báo và trạng thái; có trang xem thử, desktop/mobile và bàn phím |
| FE-02B | Hạ tầng mock MSW | Fixtures/handlers/scenarios/store/reset, chọn chế độ rõ; API giáo viên và danh sách trường làm mẫu; không gửi request nghiệp vụ ra backend |
| FE-03 | Giáo viên với mock | Danh sách, tìm kiếm, phân trang, thêm/sửa/xóa và lỗi tham chiếu; dữ liệu cập nhật nhất quán, reset được |
| FE-04 | Đăng nhập/session mô phỏng và ngữ cảnh | Thử vai trò, login/logout, reload, hết phiên, thiếu quyền và chuyển trường/học kỳ/đợt bằng mock; không cần auth thật |
| FE-05 | Lớp, môn, nhu cầu và readiness với mock | Màn hình nguồn, bộ lọc/form và các scenario dữ liệu đủ/thiếu, có issue chặn |
| FE-06 | Workspace plan/DRAFT với mock | Tạo/đọc/refresh, sửa/khóa từng dòng/nhóm, no-op và xung đột revision/snapshot được mô phỏng |
| FE-07 | Solver, tải, validation và dashboard với mock | Submit/poll/cancel/khôi phục, APPLIED/STALE/lỗi, báo cáo còn/cũ; dashboard cùng nguồn fixture với các màn hình |
| FE-08 | Nghiệm thu giao diện với mock | Các luồng chính tương tác được, desktop/mobile và loading/empty/error đủ; không cần backend/PostgreSQL |
| FE-09 | Chuẩn bị tích hợp API thật | Chốt auth, rà hợp đồng đang mock, endpoint còn thiếu, dataset DB và mapping ID/config/quyền |
| FE-10 | Nối API thật theo từng feature | Chọn API mode, nối CRUD rồi nghiệp vụ; xác minh session, revision, snapshot, run/apply và lỗi từ backend |
| FE-11 | Nghiệm thu tích hợp và bàn giao | Luồng thật chạy với dataset/tài khoản hợp lệ; checks và Docker/tài liệu được cập nhật |

FE-02–08 ưu tiên hoàn thiện UI và mock; việc backend chuẩn bị auth/API/fixture có thể diễn ra song song, không chặn nghiệm thu UI. Chỉ chuyển trọng tâm sang API thật sau khi giai đoạn mock đạt tiêu chí FE-08 và phạm vi tích hợp đã được xác định. Trong cả mock và API mode, thử readiness tiền kiểm trước khi tạo plan bằng lựa chọn config/rule rõ ràng; sau khi có DRAFT thì đọc lại theo snapshot/current version.

Mỗi mốc có thể tách thành nhiều PR nhỏ. FE-00/01 và nền tảng FE-02A/02B đã có; FE-03 trở đi chưa triển khai thành các màn hình nghiệp vụ hoàn chỉnh. API mock giáo viên và panel kiểm tra ở FE-02B không thay thế màn hình CRUD FE-03. Khi thêm feature mới, tiếp tục mở rộng bộ UI và handler tương ứng; không coi toàn bộ giai đoạn UI mock đã hoàn tất.

Các màn hình trong prototype là tham chiếu giao diện và tương tác, không tự mở rộng phạm vi nghiệp vụ đã chốt. Nếu làm UI lifecycle/feedback/phát hành/PDF hoặc hồ sơ giáo viên tổng hợp trước khi API có, ghi rõ đó là mock theo hợp đồng dự kiến và theo dõi phụ thuộc trong [backlog](BACKLOG.md); không báo chúng đã được backend hỗ trợ.

## 10. Quy trình cho một công việc frontend

1. **Xác định hành vi:** người dùng nào, màn hình nào, đầu vào/đầu ra và ca lỗi cần xử lý.
2. **Định nghĩa dữ liệu và scenario:** đối chiếu hợp đồng đã có; thiết kế fixture/handler, quyền mô phỏng, ID, pagination, revision và lỗi. Thiếu API thì ghi hợp đồng dự kiến/phụ thuộc backend.
3. **Làm trọn một luồng nhỏ:** UI → hook → API client → mock handler/store; gồm tải/rỗng/lỗi/thành công và cập nhật dữ liệu sau thao tác. Không bỏ qua tầng query/mutation bằng fixture trong component.
4. **Kiểm chứng:** chạy checks phù hợp, thử scenario thành công/lỗi/reset và các kích thước màn hình mục tiêu; cập nhật tài liệu. Ở FE-10/11, thay nguồn dữ liệu bằng API mode và kiểm chứng lại luồng trên backend.
5. **Mở PR vào `dev`:** mô tả vấn đề, hành vi sau thay đổi, ảnh nếu đổi giao diện, cách kiểm chứng và phụ thuộc còn lại. Review/merge theo quy trình repo.

Ghi riêng **hoàn thành UI với mock** và **hoàn thành tích hợp API thật**. Mock là đầu ra chính của giai đoạn hiện tại, không phải cách chữa tạm khi backend lỗi. Khi nghiệm thu tích hợp, HTTP200 riêng lẻ chưa chứng minh hành vi nghiệp vụ đúng; ghi phần đã/chưa kiểm chứng cụ thể.

## 11. Kiểm thử và tiêu chí hoàn thành

### 11.1. Nghiệm thu giao diện với mock — FE-02–08

Kiểm thử tự động tập trung vào hành vi dễ sai: request đúng trường, phân trang, chuyển trạng thái solver mô phỏng, xử lý lỗi và cập nhật dữ liệu sau mutation. Không cần backend hoặc PostgreSQL ở giai đoạn này.

- Chạy ứng dụng khi backend tắt; mọi request nghiệp vụ được handler xử lý hoặc báo chưa hỗ trợ, không lọt ra backend.
- Đi được các luồng chính bằng fixture dùng chung; thêm/sửa/xóa và dashboard/danh sách liên quan cập nhật nhất quán.
- Chọn được scenario loading, empty, error, success; lỗi400/401/403/409/422/503 có thông báo/hành động phù hợp.
- Thử session/vai trò mô phỏng, đổi ngữ cảnh, hết phiên và dọn cache; không lẫn dữ liệu giữa các ngữ cảnh.
- Thử revision/snapshot cũ, khóa batch thất bại, các trạng thái solver/cancel/apply/validation bằng scenario tái lập. Reload khôi phục theo chính sách lưu mock đã ghi rõ.
- Reset trả về fixture gốc và xóa state/cache mô phỏng liên quan. Có nhãn mock; không hiển thị kết quả mô phỏng như đã chạy CP-SAT thật.
- Xem desktop/mobile, thao tác bàn phím, focus/dialog/form, route con và trang404; không có tràn ngang hoặc thông báo bị khuất ở kích thước mục tiêu.
- Typecheck/lint/format/test/build phù hợp đạt; README nêu cách bật mock, chọn scenario và reset. Build API thật không tự bật mock.

### 11.2. Nghiệm thu tích hợp thật — FE-09–11

Chạy lại các luồng quan trọng bằng API mode với tài khoản và fixture DB hợp lệ, không bật handler/session mock. Các kịch bản tích hợp tối thiểu:

- CRUD giáo viên, lỗi dữ liệu/khóa ngoại, trang rỗng và reload.
- Đăng nhập, khôi phục/hết phiên, logout và thiếu quyền khi auth sẵn sàng.
- Readiness trả HTTP 200 nhưng có issue chặn; dữ liệu thiếu không hiển thị như đã đạt.
- Hai trình duyệt cùng sửa một DRAFT: revision cũ nhận 409, không ghi đè dữ liệu mới.
- Sửa/khóa theo ID dòng phân công, khóa batch rollback khi một dòng không hợp lệ.
- Solver thành công/APPLIED, không có nghiệm, bị hủy, gửi trùng và hàng chờ đầy.
- Reload lúc solver đang chạy; nguồn hoặc revision đổi trước apply; không báo lưu thành công khi STALE/NOT_DRAFT.
- Báo cáo validation có VIOLATION hoặc đã cũ; không hiển thị thành PASS hiện hành.
- Truy cập trực tiếp route con trong Docker và lỗi API không bị trả thành trang HTML.

### 11.3. Checklist cho mỗi PR

Đánh dấu mục không áp dụng và giải thích khi cần:

- [ ] Phạm vi/giai đoạn/mock hay API được ghi rõ; hợp đồng hiện có và hợp đồng dự kiến được phân biệt.
- [ ] Fixture/handler/scenario tập trung, reset được; mock mode không gửi request nghiệp vụ ra backend hoặc tự bật khi API lỗi.
- [ ] Typecheck, lint và build đạt sau khi scripts đã được thiết lập.
- [ ] Kiểm thử phù hợp với thay đổi đã chạy; kết quả/giới hạn được ghi rõ.
- [ ] Loading/empty/error, chống gửi lặp và thông báo kết quả đã được xử lý.
- [ ] Filter/cache/revision đúng ngữ cảnh; không trộn dữ liệu giữa round/version/tài khoản.
- [ ] Form có nhãn, thao tác bàn phím và focus phù hợp; giao diện được xem trên kích thước mục tiêu.
- [ ] Không hardcode actor, ngưỡng tải hoặc dữ liệu demo thành kết quả nghiệp vụ.
- [ ] Không commit secret/cache/build output; README/cấu hình mẫu được cập nhật nếu cần.
- [ ] Diff được tự review, có review của thành viên khác và checks bắt buộc đạt trước merge.

## 12. Tài liệu tra cứu

- [Trạng thái và cách chạy frontend](../frontend/README.md).
- [Backend: mục lục hiện hành](../backend/docs/README.md), [API chung](../backend/docs/API.md).
- [Plan và revision](../backend/docs/PLAN_API.md), [readiness](../backend/docs/READINESS_API.md).
- [Sửa/khóa phân công](../backend/docs/ASSIGNMENT_MUTATION_API.md).
- [Solver run/poll/cancel](../backend/docs/SOLVER_RUN_API.md), [hậu kiểm/apply](../backend/docs/SOLVER_APPLY.md).
- [Assignments/workloads/validation](../backend/docs/PLAN_RESULTS_API.md).
- [Docker](../infra/README.md), [audit demo và phụ thuộc](../infra/DOCKER_AUDIT.md).
- [Backlog](BACKLOG.md), [Git flow](git-flow.md).
- [React: xây ứng dụng từ đầu](https://react.dev/learn/build-a-react-app-from-scratch), [Vite: khởi tạo](https://vite.dev/guide/).
- [React Router: cài đặt](https://reactrouter.com/start/declarative/installation), [TanStack Query: tổng quan](https://tanstack.com/query/latest/docs/framework/react/overview).

## 13. Ghi nhận khởi tạo FE-01 — 15/11/2026

Nhánh triển khai: `feat/frontend-bootstrap`, tách từ `dev`. Các thay đổi tài liệu FE-00 được giữ trên nhánh này. Frontend dùng Node24.22.2/npm11.19.1, React19.3.1, TypeScript7.0.2, Vite8.3.6, React Router8.5.1 và TanStack Query5.107.1; phiên bản dependency trực tiếp và lockfile đã được ghi vào repository.

Đã có router/layout, trang tổng quan và các trang chờ giáo viên/phân công, trang404, error boundary, QueryClient, HTTP client, proxy dev, scripts kiểm tra/định dạng và Docker build nhiều giai đoạn. Module feature sẽ được tạo khi triển khai nghiệp vụ, chưa có session hoặc CRUD/solver trong UI.

Kết quả kiểm chứng:

| Kiểm tra | Kết quả |
| --- | --- |
| Typecheck, lint, format check | Đạt |
| Node test runner | 12/12 ca HTTP đạt: filters, JSON/null,204,409/Location,422, lỗi proxy/JSON/mạng và hủy |
| Build trên Windows | Đạt, tạo `frontend/dist` |
| Build image Linux | Đạt; `npm ci` từ lockfile rồi build bằng Node24, Nginx phục vụ tài nguyên đã build |
| Container tạm | Healthcheck đạt; `/`, route con, `/healthz` và asset trả200; CRUD/OpenAPI proxy hoạt động; API không tồn tại trả404 thay vì SPA HTML |
| Trình duyệt | Đã xem bố cục desktop, điều hướng, tải lại trực tiếp route con và trang404 trên bản dev/Docker |
| Prototype | SHA-256 giữ nguyên giá trị trong README frontend |

Đây là hồ sơ kiểm chứng của bước khởi tạo, không phải nghiệm thu mock. Kiểm thử Docker dùng container riêng trên cổng loopback ngẫu nhiên, GET qua backend dev đang chạy để kiểm tra proxy; không thay thế các service dev hoặc sửa dữ liệu DB. Chưa nghiệm thu responsive trên thiết bị nhỏ, session mock, CRUD từ UI hoặc luồng solver mô phỏng. Bộ khung chưa có CI frontend; trạng thái commit/merge/push tra trực tiếp trong Git.

## 14. Nền tảng UI và mock — FE-02A/02B, 15/11/2026

Hai phần được triển khai trực tiếp trên checkout frontend hiện có; không giao cho agent khác. FE-02A bổ sung Be Vietnam Pro (self-hosted), Lucide, tokens, button/fields/table/pagination/dialog/confirm/toast và loading/empty/error. FE-02B dùng MSW3.0.6 với fixture tập trung, store trong bộ nhớ, scenario/reset và API mock giáo viên/danh sách trường. Giấy phép font/icon được giữ trong public/licenses.

`/dev/ui` là trang xem thử component và công cụ mock, chỉ có trong dev hoặc bản build mock. Kiểm tra API client qua TanStack Query/MSW ở trang này không đánh dấu màn hình CRUD giáo viên FE-03 hoàn thành. Các trang nghiệp vụ hiện vẫn chờ mốc tiếp theo.

Kết quả kiểm chứng của thay đổi này:

- Typecheck, lint, format check đạt; Node test runner **27/27 ca đạt**, gồm HTTP client, lựa chọn mode và MSW CRUD/filter/pagination/error/reset/abort.
- `npm run build` và `npm run build:mock` đạt. Kiểm tra output: bản API không có worker/handler mock; bản mock có worker và công cụ phát triển.
- Docker build qua `npm ci` và build API thành công với font/icon mới.
- Trình duyệt: font tiếng Việt nạp thành công; biểu mẫu và lỗi nhập, thông báo, xác nhận busy, phân trang, scenario empty/503 và reset hoạt động.
- Dialog: focus trường nhập/nút Hủy phù hợp, Tab/Shift+Tab quay vòng trong modal, Escape đóng và trả focus về nút mở.
- Kiểm tra màn hình390px: trang chính/trang component không tràn ngang; dialog vừa màn hình.
- Bản mock build tĩnh chạy qua preview, đọc dữ liệu qua HTTP client/MSW mà không cần proxy/backend. Khi chuyển cùng origin sang dev:api, trang mở lại và panel/nhãn mock biến mất.
- Prototype vẫn giữ SHA-256 gốc; không thao tác ghi lên backend hoặc thay đổi DB trong bước này.

Giới hạn: chưa có UI CRUD giáo viên đầy đủ, session hoặc solver mock, lưu dữ liệu mock qua reload hay đồng bộ giữa các tab. Chưa có image Docker mock riêng/CI frontend. Các kiểm tra giao diện ở trên là lượt kiểm chứng thủ công bằng trình duyệt, chưa có bộ E2E UI tự động.


## 15. Chuyển khung điều phối sang React — 15/11/2026

Đã chuyển logo/sidebar13 mục và3 nhóm/header/breadcrumb/footer, responsive mobile, bảng chọn học kỳ, tìm kiếm nhanh, thông báo và hộp tài khoản. Font/CSS/ảnh đại diện trích từ prototype bằng `npm run assets:shell`, giữ nguyên file gốc. Font thân bài Be Vietnam Pro và tiêu đề Manrope; SVG dùng bộ gốc đã trích. Không thay React entry bằng toàn bộ HTML demo.

Đã đối chiếu phần khung ở1280×900 và390×844, gồm cả menu active, popover/modal và điều hướng bàn phím. Thay backdrop/div bằng native dialog để quản lý focus; giữ thông số nhìn thấy và motion của demo. Kết quả và phạm vi chi tiết ở [UI](../frontend/docs/UI.md).

Khung dùng MSW GET `/api/mock/layout` qua HTTP client; không tạo endpoint backend hoặc session giả. Chọn học kỳ chỉ thay ngữ cảnh xem thử của khung, chưa chứng minh dữ liệu nghiệp vụ/lưu đợt/phiên bản/PDF hoạt động. Nút đổi ảnh, phiên/quyền/đăng xuất và cài đặt còn chờ feature tài khoản. Dashboard, CRUD và giao diện các vai trò khác chưa chuyển đầy đủ. Bước tiếp theo là chuyển từng màn hình theo demo với mock, bắt đầu tổng quan; không nối API thật ở bước này.
