# Nền tảng UI — FE-02A

## Logo và favicon TASS

Theo yêu cầu riêng ngày 16/11/2026, thay dấu cuốn sách bằng monogram T tự vẽ dạng các dải hình học có khoảng âm chéo. `BrandMark` dùng chung symbol trong `public/tass-mark.svg` với favicon; áp dụng ở trang đăng nhập và sidebar. Giữ chữ `tass.`, màu thương hiệu, kích thước khung, bố cục và toàn bộ icon nghiệp vụ; prototype/glyph gốc được bảo toàn. Tham khảo hướng hình khối của [Orbita Grid](https://dribbble.com/shots/27761272-Unused-Logo-Concept-Orbita-Grid) và [Virex](https://dribbble.com/shots/26890460-Virex-Minimal-Symbol-of-Motion-Connection); SVG triển khai là bản vẽ riêng cho dự án.

## FE-06 — Workspace phân công

`/assignment` dùng ma trận, bảng chi tiết, gán nhanh bằng native popover, drawer, tab, thanh chọn nhiều dòng và CSS/SVG/font/animation được trích từ demo. Phím mũi tên/Home/End di chuyển giữa các ô; Enter mở gán nhanh; Escape đóng và trả focus. Có lọc môn, tìm lớp/môn/giáo viên, theo dõi tải giáo viên và chuyển phiên bản. Route lớn được tải riêng để giảm bundle khởi động.

Khác biệt cần thiết theo hợp đồng backend:

- Thêm bộ chọn đợt/phiên bản và nút làm mới snapshot; URL lưu `round_id`, `version_id`, `context_id`. Bản lưu trữ và phiên bản ngoài DRAFT chỉ đọc; nguồn thay đổi chặn sửa/khóa nhưng cho mở khóa DRAFT hiện hành.
- Lý do bắt buộc cho mọi thay đổi, khóa/mở khóa; bỏ gán gửi `teacher_id: null` cùng mã và diễn giải. Khóa nhóm lớp–môn là một thao tác nguyên tử, giữ giáo viên riêng từng thành phần, gồm cả dòng bị bộ lọc che.
- Số liệu và số cột theo snapshot từ dữ liệu chuẩn bị (fixture mặc định 9 thành phần/6 giáo viên), không giữ các con số minh họa 36/12 của HTML. Sau khi đọc plan, sidebar và tổng quan lấy độ phủ/tải từ cùng store. Danh sách ứng viên và chính sách hiện là hợp đồng **mock-only**; chưa đại diện API chọn ứng viên thật.
- Preview tải dùng dữ liệu snapshot; thiếu tải hiển thị chưa đủ dữ liệu. Lưu dùng revision lúc mở form; 409 giữ lỗi và cho tải lại, không tự replay. Xuất PDF/mở lấy ý kiến chưa bật, solver chỉ dẫn tới route chờ của mốc sau.
- Sửa lỗi thiết kế có sẵn: icon tìm kiếm đè placeholder do cascade input; giới hạn sửa padding trong workspace. Khi lọc còn 1–2 môn, min-width cố định làm cột lớp phình ra và che toàn bộ ô trên mobile; giới hạn cột lớp và tính độ rộng tối thiểu theo số môn trong trường hợp này. Giữ nguyên font, màu và bố cục ma trận đầy đủ.

Đã đối chiếu trình duyệt ở 1280×900 và 390×844: ma trận/bảng, gán nhanh/drawer, impact preview hai giáo viên, lọc, focus/Escape, khóa nhóm, tạo/refresh và xung đột revision. Không tràn ngang trang; bảng rộng cuộn riêng. Phiên QA cuối không có console error/warning; prototype giữ nguyên byte. Cần lặp lại các trạng thái liên quan khi sửa feature.

## FE-05 — Danh mục, đợt và chuẩn bị dữ liệu

Các trang `/admin/catalogs`, `/admin/periods`, `/preparation`, `/demands`, `/checks` đã có UI và mock. Bảng và hộp thoại dùng `variant="prototype"` để tái sử dụng lớp CSS, font, SVG, kích thước và animation gốc; biến thể mặc định vẫn phục vụ component gallery. Đã bỏ KPI tự thêm ở danh mục/đợt/nhu cầu, khôi phục tiêu đề, bộ lọc loại nhu cầu và số bước trong vòng tròn. Đã gỡ CSS tiêu đề cũ ghi đè font/weight/responsive của demo.

**Điều chỉnh cần thiết theo mô hình dữ liệu, khác với nội dung HTML demo:**

- Danh mục chỉ có môn/lớp/khối/cấp trong hợp đồng hiện tại; chưa có Tổ chuyên môn. Cột và form phản ánh mã, hiệu lực, khóa ngoại thật của hợp đồng mock; không dựng trạng thái hoặc trường dữ liệu chưa hỗ trợ. Năm học được kèm tên trường để phân biệt hai bản ghi trùng mã năm.
- Năm học/học kỳ/đợt là ba tài nguyên riêng nên có tab, bộ lọc và form riêng; token cùng thời điểm cập nhật nguồn chỉ đọc. Chưa giả lập số tuần hay phiên bản quy tắc từ bảng gộp của demo.
- Chuẩn bị tách phạm vi khối–môn, áp dụng lớp–môn và xác nhận tập thành phần theo mô hình backend. Có bộ chọn đợt rõ ràng; KPI cuối dùng readiness thay tiến độ gán vì workspace/plan thuộc FE-06.
- Nhu cầu có lọc lớp/môn/trạng thái/ngày hiệu lực, tạo lẻ và xem trước nhập nhiều lớp. Chưa hiển thị giáo viên phụ trách/khóa gán vì chưa có plan trong feature này. Dòng lỗi xem trước được xuống dòng; bảng rộng cuộn trong vùng riêng.
- Trung tâm kiểm tra đọc readiness theo cặp cấu hình/bộ quy tắc, hiển thị coverage và issue từ response. Đây là tiền kiểm đầu vào, chưa phải lịch sử lượt validation theo version/revision của phương án như demo; chạy lại không tạo bản ghi validation hay chạy solver.

**Đối chiếu trình duyệt:** năm trang ở 1280×900 và 390×844; đủ bốn bước chuẩn bị; kiểu bảng/modal/stepper, bộ lọc mobile 2×2, năm học theo trường, metadata nguồn và ba scenario readiness. Đã thử lỗi xung đột nhập nhiều lớp bị chặn lưu, Escape/trả focus, nhập trong drawer và Escape ở hộp xác nhận chỉ đóng hộp xác nhận. Các trang không tràn ngang; bảng có thể cuộn ngang. Kết quả đối chiếu không đồng nghĩa dữ liệu/cột nghiệp vụ đã giống bảng HTML khi hợp đồng khác nhau như các điểm trên.

**Demo là nguồn chuẩn, phải sao chép y chang mọi chi tiết thị giác.** Giữ màu/font/icon/họa tiết/bố cục và các trạng thái. Chỉ đổi khi có lỗi thiết kế cụ thể, tối ưu kỹ thuật cần thiết hoặc cần phù hợp backend; ghi rõ lý do và phạm vi trước/sau. Xem quy tắc bắt buộc trong [quy trình frontend](../../docs/FRONTEND_DEVELOPMENT.md). Nền tảng hiện tại còn cần đối chiếu các màn hình, chưa được nghiệm thu là bản sao hoàn chỉnh.

Xem và thử component tại `/dev/ui` khi chạy `npm run dev`. Route này có trong dev và bản build mock, không có trong bản build API triển khai thật. Trang chỉ phục vụ kiểm tra thành phần, chưa phải màn hình CRUD giáo viên.

## Font, icon và tokens

- Font thân bài **Be Vietnam Pro**, tiêu đề **Manrope** variable400–800. Cả15 file woff2 và khai báo font-face/unicode-range được trích nguyên byte từ demo, phục vụ cùng bundle; không phụ thuộc Google Fonts/CDN khi chạy.
- Icon gốc: 69 SVG cuối cùng trích từ prototype, kể cả các override, tại `prototype-glyphs.ts`. Dùng `Icon name="dashboard"`, `name="teachers"`, `name="assignment"`, `name="brand"`...; nét1.6, lớp duo opacity0.12 như demo. Các lời gọi glyph cũ có icon tương ứng được ánh xạ về SVG gốc. Lucide tạm còn cho các tiện ích phát triển mới chưa có đối ứng trong demo; không dùng làm nguồn thay icon của demo. Icon trang trí được ẩn khỏi accessibility; nút chỉ có icon phải có nhãn.
- `src/styles/tokens.css` quy định thang chữ, spacing, radius, focus, trạng thái và shadow. Các màu nền/chủ đạo kế thừa prototype trong `global.css`.
- Giấy phép font và icon được giữ tại `public/licenses/` và đi cùng bản build.

```tsx
import { Save } from 'lucide-react';
import { Button } from '@/shared/ui/button';

<Button icon={Save} type="submit" loading={isSaving}>
    Lưu
</Button>;
```

`Button` mặc định `type="button"`; dùng `type="submit"` rõ ràng trong form. Variant gồm primary/secondary/ghost/danger, size sm/md. `loading` đặt aria-busy và vô hiệu hóa gửi lặp; component không tự gửi request.

## Khung điều phối React

`app/layouts/app-layout.tsx` ghép logo, sidebar đầy đủ13 mục/3 nhóm, tiến độ, tài khoản, header/breadcrumb và footer. `navigation.ts` là danh sách dùng chung cho menu/router/tìm kiếm. Các route chưa chuyển có trang chờ riêng; không đánh dấu nội dung nghiệp vụ là đã hoàn tất.

`npm run assets:shell` trích CSS liên quan tới layout/shared styles từ phần head của prototype qua PostCSS, scope dưới `.tass-shell` và giữ nguyên thứ tự cascade/media/animation. Global root/scrollbar/view-transition được giữ để khớp demo. File sinh `prototype-shell.css` cùng15 font/ảnh đại diện nằm trong source; build không cần đọc prototype. Không sửa file sinh trực tiếp; thay bộ trích và đối chiếu lại sau khi sinh. Test kiểm tra hash prototype và byte tài nguyên gốc.

`ShellModal` dùng native dialog để giữ focus/Escape/trả focus, với DOM bên trong và animation của demo. Chọn học kỳ dùng native popover với cách tính vị trí theo demo. Menu mobile có backdrop, khóa cuộn, focus trong menu và Escape trả focus về nút mở. Khác biệt kỹ thuật là native dialog thay backdrop/div thủ công; màu blur/kích thước/timing giữ thông số gốc.

Đã đối chiếu demo và React ở1280×900 và390×844: sidebar/header, logo, chữ, khoảng cách, nhóm menu, progress/avatar, bảng chọn học kỳ và hộp tìm kiếm. Kích thước desktop sidebar248px/header68px; mobile drawer270px/header61px. Cũng giữ breakpoint225px/210px và nén theo chiều cao từ CSS gốc. Đã thử menu cuộn tới mục cuối, đổi học kỳ, điều hướng tìm kiếm, Escape/trả focus và không tràn ngang ở390px. Các màn hình nghiệp vụ, giao diện quản trị/giáo viên và toàn bộ trạng thái của chúng chưa được đối chiếu.

Dữ liệu khung là hợp đồng xem thử `/api/mock/layout`, không phải session hay quyền truy cập. Đổi học kỳ hiện thay nhãn/số liệu khung; chưa có kho dữ liệu nghiệp vụ riêng từng đợt, phiên bản/PDF hay lưu lựa chọn sau reload. Dòng footer/ghi chú giữ văn bản demo để đối chiếu. Đổi ảnh, phiên/quyền, đăng xuất và trang cài đặt còn chờ feature tương ứng; các nút này chưa thực hiện auth hoặc ghi dữ liệu.

## Form

`InputField`, `SelectField`, `TextareaField` nhận native props cùng `label`, `hint`, `error`; tự tạo ID và liên kết label/help/error. Có thể truyền ID hoặc aria-describedby bên ngoài. Chúng không tự chứa schema hoặc nghiệp vụ.

```tsx
<InputField
    label="Tên hiển thị"
    required
    value={name}
    onChange={(event) => setName(event.target.value)}
    error={errors.name}
/>
```

Caller quản lý state, kiểm tra giá trị và gửi form. Khi cần kiểm tra native HTML, giữ `required`, `type`, `minLength`... phù hợp. Nội dung lỗi và label phải mô tả được trường nhập khi đọc bằng screen reader.

## Dialog và xác nhận

`Dialog` dùng native HTML dialog với showModal, tên/mô tả, focus trap và Escape. `open/onOpenChange` là state của caller. Khi mở, ưu tiên phần tử có `data-dialog-autofocus`, sau đó trường nhập đầu tiên. Khi đóng, trình duyệt trả focus về nút mở. Scroll của body bị khóa khi dialog mở.

`ConfirmDialog` ưu tiên focus nút Hủy. Caller quản lý `busy` và chỉ đóng sau khi thao tác hoàn tất. Khi busy, nút đóng/Hủy/xác nhận, Escape và backdrop không đóng dialog; không dùng dialog để giữ những tác vụ nền dài hạn. Không mở nhiều modal lồng nhau trong mốc này.

## Bảng và phân trang

`DataTable<Row>` nhận caption, columns với hàm render, rows và rowKey ổn định. Bảng có caption, header scope và vùng cuộn ngang có thể focus khi cần. Component không tự lọc, fetch hoặc suy đoán tổng bản ghi.

`Pagination` nhận offset/limit/itemCount/hasNext/onPageChange/busy. Với API trả mảng không có total, feature xác định hasNext theo hợp đồng; UI chỉ hiển thị trang và khoảng dòng hiện có. Đổi filter thì caller reset offset.

## Thông báo và trạng thái

- `useToast()` cần nằm trong ToastProvider (đã lắp ở app/providers). Tone success/info dùng status, error dùng alert. Thông báo giữ đến khi đóng, tối đa4 thông báo gần nhất; không tự biến lỗi API thành thành công.
- `LoadingState`, `EmptyState`, `ErrorState` nhận nội dung/handler từ caller. Nút Thử lại chỉ có khi có onRetry thật; có thể truyền busy để ngăn bấm lặp.
- Toast không phải nơi đặt xác nhận quan trọng bắt buộc người dùng đọc; dùng nội dung trong form/trang hoặc dialog phù hợp.

## Kiểm chứng

### Hiệu ứng chuyển tab của sidebar

Sidebar dùng lại thông số demo: hover đổi nền/màu trong0.2s; tab active nền trắng, chữ màu ink, viền/bóng nhẹ, chỉ icon và vạch3×16px ở mép trái nhấn màu primary. Focus bàn phím có outline và halo nằm trong nút. Không dùng nền cam và tô cam toàn bộ nhãn như bộ khung ban đầu.

Khi chọn route bằng sidebar, native View Transition chụp vùng main có tên workspace: trang cũ fade/translateY(-3px) trong0.12s, trang mới opacity/translateY(16px)/scale(.985) về trạng thái bình thường trong0.32s với cubic-bezier(.22,1,.36,1). Browser không hỗ trợ, reduced motion hoặc transition đang chạy thì điều hướng trực tiếp, theo fallback của demo. Menu dùng button như demo; tìm kiếm nhanh hỗ trợ Ctrl/Cmd K, ↑/↓, Enter và Escape.

Đã kiểm tra chọn route trong trình duyệt cùng style active, viền/bóng và vạch chỉ báo; typecheck/lint/build đạt. Đây là phần sidebar/chuyển workspace được sửa, không xác nhận mọi hiệu ứng của toàn bộ prototype đã được chuyển xong.

Kiểm tra tự động dự án bằng typecheck/lint/format/test/build. Kiểm tra tương tác tại `/dev/ui`: biểu mẫu, lỗi nhập, Escape/trả focus, xác nhận busy, toast và phân trang. Xem ở desktop và màn hình 390px; bảng có thể cuộn trong vùng riêng nhưng trang không được tràn ngang.

## FE-07: Solver, tải, validation và dashboard thống nhất

- **`/solver-runs`**: điều phối `POST /api/plan-versions/{id}/solver-runs` (`202` + `Location`), polling `GET /api/solver-runs/{id}` có giới hạn tần suất và dừng ở trạng thái kết thúc hoặc unmount (không tự hủy khi rời trang), giữ `?run_id=` trên URL để khôi phục khi reload, xử lý `409 SOLVER_RUN_ACTIVE` theo `Location` và `503 SOLVER_QUEUE_FULL`. Phân biệt rõ `status`, `cp_sat_status` (`FEASIBLE (HEURISTIC)` khi `demo_only && !exactOptimalityProven`, không gắn nhãn `OPTIMAL` cho heuristic), `apply_outcome` (`APPLIED` mới tính là đã lưu; `STALE`/`NOT_DRAFT`/`REJECTED`/`FAILED`/`CANCELLED` không ghi đè bản nháp), và hiển thị `GET /optimization` (`matches_version`).
- **`/workload`**: hiển thị bảng và biểu đồ F/A/C/R, `T = F + A + C + R`, `W = F + A + C`, `Q = max(0, B - R)`, `T - B`, `A - Q`, `W - Q`. Giới hạn tuần (`T <= limit`) đọc từ `WorkloadRow.checks` (`details.limit`), không hardcode 24/25; tải năm thiếu hiển thị nhãn `Chưa đủ dữ liệu` (`INSUFFICIENT_DATA` / `null`, không quy về 0). Cho phép lọc vượt định mức/trần tuần, mở Drawer xem chi tiết giáo viên và tải CSV UTF-8 BOM.
- **`/statistics`**: tổng hợp độ phủ và bảng theo môn/khối/lớp/giáo viên từ `/assignments` và dữ liệu chuẩn bị (giới hạn `limit=100` theo chuẩn catalog/preparation API), liệt kê cặp lớp–môn chưa đủ nhu cầu/gán và xuất CSV.
- **`/checks`**: giữ nguyên **Tiền kiểm nguồn (Readiness)** và bổ sung tab mặc định **Kiểm tra phương án (`POST/GET /validation`)** — phân biệt `404` "chưa có báo cáo" với lỗi HTTP, hiển thị `fresh` / stale banner khi bản nháp hoặc nguồn thay đổi, đếm `PASS` / `VIOLATION` / `INSUFFICIENT_DATA`, giữ nguyên lưu ý `ANNUAL` thiếu dữ liệu không chặn nếu tuần đạt.
- **Dashboard (`/`) & `/assignment`**: đồng bộ cùng một nguồn fixture/store ngay từ lần tải đầu (`assignmentStore.ensure` trong `readPlanLayout` và `readPlanOverview`), nối CTA `/solver-runs`, `/checks`, `/workload`, `/statistics`, hỗ trợ `?demand=` và hiển thị trạng thái validation/solver thực.
- CSS bổ sung từ prototype được trích qua `scripts/extract-demo-shell.mjs` (thêm các lớp `mvp-vector`, `diff-*`, `metrics`, `stacked-*`, `run-art`, `run-step`, `solver-*`) cùng helper bố cục cục bộ tại `src/pages/results/results.css` để cố định chiều rộng cột mã quy tắc `/checks` và khoảng cách nhãn trục X biểu đồ `/workload` tránh tràn/gãy giữa từ.

## FE-08: Phản hồi theo phiên bản, lịch sử, văn bản PDF, nguồn/bí danh và quản trị

- **Thay thế toàn bộ 8 route placeholder (`src/app/router.tsx`)**: gỡ `layout-placeholder.tsx`; bổ sung `/feedback`, `/history`, `/documents`, `/sources`, `/admin/sources`, `/admin/rules`, `/admin/audit`, và nối `/admin/teachers` tái sử dụng `TeachersPage` (khớp `prototype/index.html`). Ở chế độ `api`, các trang dùng hợp đồng mock dự kiến hiển thị thông báo rõ trạng thái chỉ phục vụ ở chế độ `mock`.
- **Phản hồi & vòng đời phiên bản (`/feedback`, `/assignment`, `/teacher*`)**: lọc trạng thái/loại/mức, xem chi tiết đề xuất, đánh dấu `Đã xử lý` kèm ghi chú; mở/đóng lấy ý kiến (`OPEN_FOR_FEEDBACK` <-> `DRAFT`), đóng băng và rẽ bản nháp kế tiếp (`V{n+1} DRAFT`) kế thừa điều chỉnh; `/assignment` tự khóa sửa khi không phải `DRAFT` và thay nút chờ bằng link tới `/feedback` / `/documents`. Trên cổng giáo viên, `ReleaseVersionSelect` cho phép chọn phiên bản đã phát hành và hiển thị đúng trạng thái của bản đang xem (`selectedRelease.phase`) kể cả khi điều phối đã tạo bản nháp mới, kèm cảnh báo năm và modal gửi phản hồi ở `/teacher/feedback`.
- **Lịch sử & phát hành PDF (`/history`, `/documents`)**: dùng chung `SnapshotDocumentMarkup` (`src/features/governance/document-markup.tsx`); `/history` hỗ trợ tạo snapshot thủ công, xem lại mẫu in và khôi phục thành bản nháp mới (chặn khôi phục snapshot legacy `is_full: false`); `/documents` dựng PDF nhiều trang phía client (`src/features/results/pdf.ts`) kèm băm `SHA-256`, tải xuống và theo dõi các bản đã phát hành.
- **Nguồn/bí danh & quản trị (`/sources`, `/admin/sources`, `/admin/rules`, `/admin/audit`)**: quản lý nguồn dữ liệu & bí danh chuẩn hóa giáo viên/môn học; chỉnh sửa quy tắc định mức (`B-THPT`, `B-THCS`, `R-DUTY`, `LIMIT-T`); lọc nhật ký audit không dấu theo từ khóa, ngày, tác vụ và xem diff chi tiết.
- **CSS prototype & bảng**: `scripts/extract-demo-shell.mjs` trích thêm `history-row`, `version-icon`, `mvp-feedback-detail`, `mvp-print-preview`, `mvp-document-head`, `document-author`; `src/pages/results/results.css` bổ sung co giãn ô tìm kiếm và bọc chữ bảng `.mvp-table` trên desktop.
