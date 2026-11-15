# Quy trình phát triển frontend TASS

Cập nhật: **15/11/2026**. Trạng thái: **đã khởi tạo bộ khung FE-01; chưa tích hợp giao diện nghiệp vụ/auth**.

Tài liệu này hướng dẫn chuyển prototype thành frontend gọi API thật, từ khởi tạo đến nghiệm thu. React/TypeScript/Vite, React Router, TanStack Query và HTTP client đã được thiết lập; phiên bản và cách chạy nằm trong [README frontend](../frontend/README.md). Cơ chế auth và các feature nghiệp vụ vẫn cần triển khai theo lộ trình bên dưới.

## 1. Hiện trạng và mục tiêu

| Khu vực | Hiện trạng | Hướng phát triển |
| --- | --- | --- |
| Frontend | `frontend/index.html` là entry React; prototype tự chứa được giữ nguyên tại `frontend/prototype/index.html` | Router/layout/HTTP client đã có; chuyển từng màn hình nghiệp vụ sang component và dữ liệu API |
| Backend | Có CRUD, plan/current DRAFT, readiness, async solver, kết quả/validation và sửa/khóa phân công | Tái sử dụng hợp đồng hiện hành |
| Authentication | Chưa có login/session/JWT thật; API nghiệp vụ yêu cầu Principal tin cậy | Phối hợp backend để chốt và tích hợp |
| Docker | Đã build frontend bằng Node24, Nginx phục vụ `dist`, proxy API và SPA fallback | Giữ quy trình này khi bổ sung feature |
| Nghiệp vụ còn thiếu | Hồ sơ giáo viên tổng hợp, API xác nhận nguồn tải, lifecycle/feedback và các phần khác trong backlog | Theo dõi phụ thuộc, không coi là API đã có |

Mục tiêu đầu tiên là frontend có cấu trúc rõ ràng, kế thừa phong cách demo, và màn hình giáo viên đọc/ghi dữ liệu thật. Sau đó hoàn thiện luồng người quản lý:

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

Frontend là SPA, backend Spring Boot tiếp tục cung cấp nghiệp vụ. Chọn cách tổ chức này để phù hợp với Nginx và backend riêng hiện có. Khởi đầu bằng state của React cùng TanStack Query; chỉ bổ sung công cụ quản lý state khác khi có nhu cầu cụ thể.

Chọn thư viện form, bộ UI hoặc công cụ kiểm thử khi có ca sử dụng cụ thể, rồi ghi lý do vào PR. Component tương tác như dialog, menu, combobox phải hỗ trợ bàn phím, focus và nhãn truy cập; nếu dùng thư viện hỗ trợ, thống nhất trước khi nhân rộng.

### 2.2. Các quyết định phải có khi bắt đầu tích hợp

| Quyết định | Nội dung cần ghi | Phụ thuộc |
| --- | --- | --- |
| Runtime | Phiên bản Node/npm cụ thể đáp ứng Vite được chọn; cách cố định phiên bản | FE-01 |
| Dependencies | Phiên bản trực tiếp trong `package.json`, lockfile được commit | FE-01 |
| Phong cách UI | Phần giữ từ demo, token màu/font/khoảng cách, cách dựng bảng/form | FE-01/02 |
| Auth | Endpoint, cookie hay token, khôi phục phiên, hết hạn, logout, lỗi quyền; CSRF nếu dùng cookie | FE + backend, trước FE-04 |
| Ngữ cảnh | Cách xác định trường, học kỳ, đợt, version; nguồn dữ liệu lựa chọn | FE + backend |
| Dataset dev | Dữ liệu CRUD và fixture đủ nguồn/xác nhận để chạy solver; tài khoản hợp lệ khi auth sẵn sàng | FE + backend |
| Cấu hình/quy tắc | Nguồn lấy ID và metadata đã xác nhận; API lựa chọn chưa có thì ghi phụ thuộc | FE + backend |

Không tự đặt endpoint login hoặc chọn JWT chỉ vì demo có màn hình đăng nhập. Quyền thực thi luôn được backend kiểm tra. Việc ẩn nút trên giao diện chỉ hỗ trợ trải nghiệm sử dụng.

## 3. Khởi tạo trong repository

Ứng dụng nằm tại `frontend/`, có package và quy trình build riêng, bên cạnh `backend/`, `algorithm/`, `infra/`. Chưa cần thêm workspace manager cho một ứng dụng frontend.

Thực hiện lần lượt khi bắt đầu FE-01:

1. Kiểm tra working tree và tạo nhánh từ `dev` theo [quy trình Git](git-flow.md). Giữ các thay đổi ngoài phạm vi của người khác.
2. Lưu nguyên byte `frontend/index.html` vào `frontend/prototype/index.html`, đối chiếu SHA-256 trong [README frontend](../frontend/README.md). Giữ nguyên file gốc ngoài repository.
3. Kiểm tra Node/npm và chọn phiên bản Vite tương thích. Ghi phiên bản runtime trong cấu hình của nhóm và README.
4. Sinh template `react-ts` ở thư mục tạm trong workspace, rồi đưa các file cần thiết vào `frontend/`; đối chiếu từng file trùng tên. Không chạy trình scaffold đè trực tiếp lên thư mục đang có demo/Dockerfile.
5. Thiết lập TypeScript strict, lint, format và alias `@/` thống nhất giữa TypeScript và Vite. Giữ UTF-8, LF; quy ước định dạng phù hợp `.editorconfig`.
6. Tạo router, layout cơ bản, QueryClient và HTTP client. Chỉ tạo thư mục có mã sử dụng.
7. Cập nhật Dockerfile và `.dockerignore` trong cùng thay đổi chuyển ứng dụng: Dockerfile hiện chỉ copy HTML, `.dockerignore` hiện chỉ cho phép các file frontend cụ thể. Không để Docker phục vụ Vite entry HTML chưa build.
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
Page/component → query hoặc mutation hook → feature API → HTTP client → backend
```

Component hiển thị dữ liệu và nhận tương tác. `api.ts` định nghĩa request/response; `queries.ts` quản lý cache và tác động sau mutation. HTTP client xử lý giao thức, không quyết định điều kiện nghiệp vụ của giáo viên hoặc phương án.

Giữ DTO `snake_case` theo backend ở bước đầu. Chỉ tạo mapper/view model khi giao diện cần dữ liệu khác cấu trúc response; không chuyển đổi toàn bộ dữ liệu bằng quy tắc đổi tên ngầm.

## 5. Quản lý state và điều hướng

| Loại state | Nơi quản lý | Quy tắc |
| --- | --- | --- |
| Dữ liệu backend | TanStack Query | Không sao chép toàn bộ danh sách/plan vào một global store khác |
| Học kỳ, round, version, bộ lọc/phân trang | URL khi cần khôi phục/chia sẻ | Parse và kiểm tra giá trị; đổi filter thì reset offset |
| Form đang nhập, dialog, chọn dòng | State/form trong feature | Giữ trong phạm vi màn hình; bỏ chọn khi ngữ cảnh dữ liệu đổi |
| Session và quyền hiển thị | Module session, cung cấp qua provider | Backend quyết định quyền thực; cơ chế lưu theo hợp đồng auth |
| Theme/sidebar | State giao diện, có thể lưu localStorage | Chỉ lưu tùy chọn giao diện |

Query key phải có đủ ngữ cảnh thực tế và tham số lọc. Ví dụ minh họa:

```ts
['teachers', { schoolId, q, limit, offset }]
['assignments', { versionId, teacherId, isLocked, limit, offset }]
['solver-run', { runId }]
```

Không dùng object chứa giá trị chưa chuẩn hóa từ form làm ngữ cảnh. Dọn cache có dữ liệu người dùng khi logout/đổi tài khoản. Khi chuyển round/version, hủy hoặc bỏ qua response cũ để không hiển thị lẫn ngữ cảnh.

Sau mutation phân công, cập nhật metadata revision backend trả về rồi làm mới các query liên quan: assignments, workloads, readiness, optimization và validation. Báo cáo validation cũ vẫn được hiển thị như lịch sử nếu có nhãn freshness rõ ràng.

## 6. Quy ước tích hợp API

Nguồn hợp đồng là [API.md](../backend/docs/API.md), các tài liệu nghiệp vụ liên quan và OpenAPI của backend đang chạy. Nếu DTO/tài liệu/code khác nhau, xác minh với backend và cập nhật hợp đồng trong cùng công việc liên quan; không tự suy đoán trường dữ liệu.

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

Auth backend là phụ thuộc của luồng plan/readiness/solver/results/mutation. CRUD hiện chưa có cơ chế phân quyền hoàn chỉnh; việc CRUD chạy được không chứng minh auth đã tích hợp.

Trong thời gian chờ auth, có thể làm layout, CRUD và mock theo đúng hợp đồng. Mock chỉ hoạt động trong môi trường phát triển có nhãn rõ, không tự bật khi API lỗi và không được tính là nghiệm thu tích hợp. Không thêm header actor/user giả hoặc dùng tài khoản seed DISABLED để vượt quyền.

Fixture solver cần đủ dữ liệu nguồn, inventory và các xác nhận mà backend yêu cầu. Một vài giáo viên/lớp/môn tạo bằng CRUD chưa đủ để chạy solver. Các nguồn chưa có API quản trị cần fixture được backend chuẩn bị và ghi rõ giới hạn giao diện.

### 7.2. Plan, snapshot và sửa phân công

- Đọc plan của round trước; chỉ tạo khi chưa có plan. API hiện không tự tạo DRAFT kế tiếp.
- Chỉ cho sửa/khóa/chạy solver khi trạng thái và quyền phù hợp; backend vẫn kiểm tra lại ở thời điểm ghi.
- Gửi `expected_revision` từ backend, không tự cộng 1. Một thao tác có thể tăng revision nhiều lần hoặc không đổi trong trường hợp no-op.
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
- Lấy chính sách tải từ cấu hình/backend. Demo hiện dùng 24 trong JS, seed minh họa có 25; không hardcode một trong hai thành ngưỡng chung.
- Giữ `INSUFFICIENT_DATA`, `NOT_APPLICABLE` và `null` đúng ý nghĩa; chưa có dữ liệu năm không có nghĩa tải năm bằng 0.
- `201` khi tạo validation nghĩa báo cáo được lưu; `overall_status` vẫn có thể là `VIOLATION`.
- Nhãn freshness và `matches_version` quyết định báo cáo/proof có còn mô tả phương án hiện tại. Sửa tay có thể làm kết quả kiểm tra cũ hết hiệu lực.
- Quy tắc tải hiện là MVP minh họa; không đổi nhãn thành đạt quy định thực tế khi chưa có dữ liệu/quy tắc tương ứng.

## 8. Môi trường local và Docker

### 8.1. Khi phát triển

- Chạy PostgreSQL và backend theo [hướng dẫn hạ tầng](../infra/README.md); có thể chỉ khởi động hai service này khi dùng Vite trên host.
- Chạy Vite trên một cổng riêng được ghi trong README. Cổng 3000 mặc định đang dành cho Nginx demo, nên kiểm tra xung đột trước khi cấu hình.
- Vite proxy `/api` đến địa chỉ backend được publish trên host, theo `.env` thực tế; không dùng hostname Docker `backend` từ trình duyệt/host.
- Đích proxy chỉ thuộc cấu hình dev server, có thể dùng biến như `DEV_API_PROXY_TARGET`. Base URL phía client mặc định là `/api`.
- Biến `VITE_*` sẽ được đưa vào bundle phía trình duyệt; không chứa secret. Giữ `.env` backend/root tách với cấu hình frontend và commit file mẫu phù hợp.
- Khi auth dùng đường dẫn ngoài `/api`, cập nhật proxy/cookie/CSRF theo hợp đồng auth. Thử trên cấu hình thực trước khi nghiệm thu session.

### 8.2. Khi đóng gói

- Build nhiều giai đoạn: Node chạy `npm ci`/build, Nginx phục vụ `dist`.
- Cập nhật allowlist `.dockerignore` cho package, lockfile, cấu hình, `src` và tài nguyên cần build; giữ secrets, cache, `node_modules` và prototype ngoài build nếu không cần phục vụ.
- Giữ proxy API/OpenAPI/Swagger, `/healthz` và SPA fallback hiện có. Lỗi `/api/...` phải đi tới backend, không bị chuyển thành HTML trang chủ.
- Thử mở trực tiếp và reload một route con, tải asset, gọi API và đăng nhập khi auth đã có.
- Không xóa volume PostgreSQL để giải quyết lỗi frontend; kiểm tra migrations theo hướng dẫn backend.

## 9. Thứ tự triển khai và đầu ra

| Mốc | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| FE-00 | Tài liệu quy trình này và liên kết tra cứu | Có phạm vi, kiến trúc, phụ thuộc và tiêu chí nghiệm thu |
| FE-01 | Scaffold, runtime, scripts, router/providers, HTTP client, chuyển Docker build | Typecheck/lint/build đạt; Docker phục vụ ứng dụng đã build; demo gốc được bảo toàn |
| FE-02 | Layout và bộ UI tối thiểu theo demo | Điều hướng, focus, loading/empty/error hoạt động trên các kích thước màn hình mục tiêu |
| FE-03 | Giáo viên qua API thật | Danh sách, tìm kiếm, phân trang, thêm/sửa/xóa và lỗi tham chiếu; reload vẫn đọc đúng dữ liệu |
| FE-04 | Session, người dùng/quyền và ngữ cảnh | Backend auth sẵn sàng; login, reload, hết phiên, logout, 401/403 được kiểm chứng |
| FE-05 | Dữ liệu đầu vào và readiness | Các màn hình nguồn cần thiết; nhận biết nguồn thiếu; fixture đủ điều kiện; config/rule IDs có nguồn rõ |
| FE-06 | Plan/DRAFT, assignments, sửa và khóa | Tạo/đọc/refresh, revision thực, batch và xung đột hoạt động theo hợp đồng |
| FE-07 | Solver, tải và validation | Submit/poll/cancel/khôi phục; phân biệt apply; đọc kết quả đã lưu và báo cáo còn/cũ |
| FE-08 | Nghiệm thu và bàn giao | Luồng tích hợp chạy với dataset/tài khoản hợp lệ; tài liệu, checks và Docker được cập nhật |

FE-04 có thể được backend chuẩn bị song song với FE-01–03; cần hoàn tất trước khi nghiệm thu các API nghiệp vụ có bảo vệ. Trong FE-05, đọc readiness tiền kiểm trước khi tạo plan bằng lựa chọn config/rule rõ ràng; sau khi có DRAFT thì đọc lại theo snapshot/current version.

Mỗi mốc có thể tách thành nhiều PR nhỏ. FE-00 và bộ khung kỹ thuật FE-01 đã thực hiện; FE-02 có layout ban đầu nhưng chưa phải bộ UI đầy đủ. Các feature từ FE-03 trở đi chưa triển khai. Lifecycle/feedback/phát hành/PDF và hồ sơ giáo viên tổng hợp được bổ sung sau khi API và phạm vi tương ứng sẵn sàng, theo [backlog](BACKLOG.md).

## 10. Quy trình cho một công việc frontend

1. **Xác định hành vi:** người dùng nào, màn hình nào, đầu vào/đầu ra và ca lỗi cần xử lý.
2. **Đối chiếu API:** request/response, quyền, ID, pagination, revision và dữ liệu phụ thuộc. Thiếu API thì ghi rõ phần mock/phần chờ backend.
3. **Làm trọn một luồng nhỏ:** UI → hook → API → dữ liệu thật; gồm các trạng thái tải/rỗng/lỗi/thành công.
4. **Kiểm chứng:** chạy checks phù hợp, thử ca thành công và lỗi nghiệp vụ quan trọng; cập nhật tài liệu khi hợp đồng/cấu hình thay đổi.
5. **Mở PR vào `dev`:** mô tả vấn đề, hành vi sau thay đổi, ảnh nếu đổi giao diện, cách kiểm chứng và phụ thuộc còn lại. Review/merge theo quy trình repo.

Không đánh dấu hoàn thành tích hợp khi chỉ chạy mock hoặc chỉ nhận HTTP 200 mà chưa kiểm tra nội dung nghiệp vụ. Nếu môi trường thiếu auth/dataset thì ghi phần đã kiểm chứng và phần chưa kiểm chứng cụ thể.

## 11. Kiểm thử và tiêu chí hoàn thành

Kiểm thử tự động tập trung vào hành vi dễ sai: tạo request đúng trường, phân trang không có total, chuyển trạng thái solver, xử lý xung đột và cập nhật dữ liệu sau mutation. Dùng mock API cho lỗi khó tái hiện; các ca quan trọng phải có lượt chạy với backend thật trước nghiệm thu.

Các kịch bản tích hợp tối thiểu:

- CRUD giáo viên, lỗi dữ liệu/khóa ngoại, trang rỗng và reload.
- Đăng nhập, khôi phục/hết phiên, logout và thiếu quyền khi auth sẵn sàng.
- Readiness trả HTTP 200 nhưng có issue chặn; dữ liệu thiếu không hiển thị như đã đạt.
- Hai trình duyệt cùng sửa một DRAFT: revision cũ nhận 409, không ghi đè dữ liệu mới.
- Sửa/khóa theo ID dòng phân công, khóa batch rollback khi một dòng không hợp lệ.
- Solver thành công/APPLIED, không có nghiệm, bị hủy, gửi trùng và hàng chờ đầy.
- Reload lúc solver đang chạy; nguồn hoặc revision đổi trước apply; không báo lưu thành công khi STALE/NOT_DRAFT.
- Báo cáo validation có VIOLATION hoặc đã cũ; không hiển thị thành PASS hiện hành.
- Truy cập trực tiếp route con trong Docker và lỗi API không bị trả thành trang HTML.

Checklist cho mỗi PR, đánh dấu mục không áp dụng và giải thích khi cần:

- [ ] Phạm vi và API được đối chiếu; không có hành vi dựa vào endpoint chưa tồn tại.
- [ ] Typecheck, lint và build đạt sau khi scripts đã được thiết lập.
- [ ] Kiểm thử phù hợp với thay đổi đã chạy; kết quả/giới hạn được ghi rõ.
- [ ] Loading/empty/error, chống gửi lặp và thông báo kết quả đã được xử lý.
- [ ] Filter/cache/revision đúng ngữ cảnh; không trộn dữ liệu giữa round/version/tài khoản.
- [ ] Form có nhãn, thao tác bàn phím và focus phù hợp; giao diện được xem trên kích thước mục tiêu.
- [ ] Không hardcode actor, ngưỡng tải hoặc dữ liệu demo thành kết quả nghiệp vụ.
- [ ] Không commit secret/cache/build output; README/cấu hình mẫu được cập nhật nếu cần.
- [ ] Diff được tự review, có review của thành viên khác và checks bắt buộc đạt trước merge.

## 12. Tài liệu tra cứu

- [Trạng thái frontend demo](../frontend/README.md).
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

Kiểm thử Docker dùng container riêng trên cổng loopback ngẫu nhiên, GET qua backend dev đang chạy để kiểm tra proxy; không thay thế các service dev hoặc sửa dữ liệu DB. Chưa nghiệm thu responsive trên thiết bị nhỏ, đăng nhập, CRUD từ UI hoặc luồng solver xuyên suốt; các phần này thuộc mốc tiếp theo. Bộ khung chưa có CI frontend và chưa được merge/push trong bước khởi tạo.
