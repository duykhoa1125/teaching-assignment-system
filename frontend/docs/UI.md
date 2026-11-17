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

**Quyết định người dùng 17/11/2026: không còn yêu cầu khớp hoàn toàn prototype vì giao diện đã được người dùng chỉnh sửa đẹp hơn.** Lấy giao diện hiện tại và các chỉnh sửa đã được duyệt làm chuẩn; demo chỉ là tham khảo gốc, không tự khôi phục giao diện cũ. Quyết định này thay thế yêu cầu sao chép y chang trước đây. Giữ các cải tiến, tính nhất quán, responsive, tương tác, focus và reduced motion; kiểm chứng trực quan theo phạm vi thay đổi. Xem [quy trình frontend](../../docs/FRONTEND_DEVELOPMENT.md).

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

## Sửa lỗi review 16/11/2026

Giữ nguyên bố cục, màu, font, glyph và hiệu ứng. Sửa hành vi: giữ đợt qua URL và liên kết sửa lỗi nguồn; đồng bộ cache sau thay đổi; cổng giáo viên hiển thị đúng dữ liệu đóng băng của bản đang chọn. Tên/mã giáo viên theo danh bạ thay persona portal cũ để thống nhất ID với phân công và phản hồi; giữ nguyên ảnh đại diện. Luồng phát hành nay từ chối đầu vào thiếu, nguồn cũ hoặc PDF sai; không thay thiết kế prototype.

## Quy tắc icon — yêu cầu người dùng 17/11/2026

Bảng môn học: theo ảnh phản hồi 17/11, cột thao tác đổi từ nút chữ Sửa/Xóa xuống dòng thành hai icon edit/thùng rác trên một hàng không wrap (`pages/admin/catalog-actions.css`). Giữ handler sửa và xác nhận xóa, màu cảnh báo, tooltip, aria-label theo tên môn và focus bàn phím; không đổi các cột khác hoặc prototype.

Yêu cầu bổ sung 17/11: hover icon nâng 2px/phóng 1.08 trong 180ms ease-out; logo nâng 2px/phóng 1.12/nghiêng -6° trong 220ms. Khi nhấn control, glyph thu về 0.96. `styles/icon-motion.css` áp dụng chung cho icon và BrandMark, hover cả vùng nút/link và hàng thương hiệu; không đổi nền, màu, SVG hoặc bố cục. Dùng translate/scale/rotate độc lập để giữ transform hướng mũi tên và animation có sẵn. Chỉ bật với chuột chính xác và prefers-reduced-motion: no-preference; control disabled không có motion mới. Đây là ngoại lệ được người dùng yêu cầu; prototype giữ nguyên.

Icon nghiệp vụ dùng nét và phần tô bên trong SVG như sidebar, không đặt trong ô nền/viền/bóng màu riêng. Đây là ngoại lệ có chủ đích so với demo: trước đây bộ chọn học kỳ, KPI, môn học, thẻ quản trị, lịch sử/tài liệu và trạng thái trống/lỗi có tile bao quanh; nay tile trong suốt, giữ màu và SVG gốc, kích thước, khoảng cách, vùng bấm và chuyển động. Nền của cả dòng được chọn, nút có nhãn, trạng thái, ảnh đại diện và logo giữ nguyên; nút chỉ có icon vẫn có chỉ báo focus bàn phím.

`src/styles/icon-treatment.css` áp dụng chung sau CSS demo; wrapper dùng CSS module thêm lớp `icon-surface`. Icon mới cũng theo quy tắc này. Không sửa prototype hoặc CSS sinh bởi công cụ trích demo.

## Sidebar desktop thu gọn — yêu cầu người dùng 17/11/2026

Thêm icon Thu gọn/Mở rộng ở góc phải hàng logo trong header sidebar trên màn hình lớn hơn 700px; không có dòng nút/nhãn ở chân sidebar. Chế độ gọn rộng 68px, giữ logo, icon gốc, active, số lượng cần xử lý, thanh tiến độ và tài khoản; tên mục có nhãn truy cập và tooltip. Vùng nội dung mở rộng theo sidebar, các mục điều hướng cuộn riêng khi thiếu chiều cao để nút mở rộng/tài khoản vẫn sẵn dùng. Lựa chọn lưu ở localStorage `tass-sidebar-collapsed` và vẫn đổi được khi storage bị chặn.

Đây là phần bổ sung được người dùng yêu cầu so với demo, triển khai trong `app/layouts/sidebar-collapse.css`, không sửa CSS sinh/prototype. Giữ menu mobile đầy đủ 270px và nút mở menu cũ; tắt chuyển động khi prefers-reduced-motion.

## Khoảng cách bảng, thẻ tải và dropdown — 17/11/2026

- Bộ lọc chung cách kết quả 20px. Pagination trong panel có padding 16px 20px (mobile 14px 16px), không áp sát mép bảng. Các bảng danh mục, đợt/học kỳ/năm học, nhu cầu dùng chung; bảng giáo viên đã có toolbar/footer padding riêng. Quy tắc bọc chữ của bảng FE-05 chuyển vào `styles/table-spacing.css` để không phụ thuộc việc đã ghé trang kết quả trước đó.
- Thẻ thống kê Tải & định mức thiếu padding vì công cụ trích demo bỏ sót lớp `.metric`. Đã bổ sung tên lớp trong `scripts/extract-demo-shell.mjs` rồi sinh lại CSS, khôi phục đúng padding/min-height và các breakpoint của demo; không sửa tay CSS sinh hoặc prototype.
- Bộ chọn học kỳ: nhấn lần hai đóng; vẫn hỗ trợ nhấn ngoài, Escape/trả focus và `aria-expanded`.
- `styles/dropdowns.css` đồng bộ select/filter/form với font Be Vietnam Pro, màu nền/viền/bo góc, menu option, hover/selected/focus, chiều cao mục chọn và glyph down/check gốc. Dùng native select với `appearance: base-select` khi được hỗ trợ, giữ hành vi form/bàn phím; trình duyệt cũ dùng picker native và cùng kiểu control. Select multiple/listbox giữ chế độ gốc. Tham khảo cơ chế: [MDN customizable select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select).

## Thu gọn thao tác, bộ lọc và breadcrumb — phản hồi 17/11/2026

Nhật ký quản trị: hai ô ngày trước đây không có nhãn nhìn thấy và có thể rơi xuống hai hàng gây khó hiểu. Theo phản hồi người dùng, gom thành nhóm “Thời gian ghi nhận”, gắn label “Từ ngày”/“Đến ngày”, đặt cạnh nhau; ô tìm kiếm có label riêng và thẳng hàng đáy. CSS riêng `pages/admin/audit-filters.css`; màn hình nhỏ chuyển cả nhóm xuống hàng, hai ngày vẫn cạnh nhau. Giữ nguyên giá trị/query lọc và native date picker. Đã xem trực quan desktop 1482×734, typecheck/lint/format đạt; chưa xem mobile trong lượt này. Prototype không sửa.

- Các bảng trong ảnh phản hồi (giáo viên, đợt phân công, quy tắc, phạm vi và nhu cầu) dùng icon trên một hàng không wrap: mắt xem hồ sơ, bút sửa, thùng rác xóa/bỏ nhu cầu, panel mở chi tiết, BadgeX bỏ xác nhận, Unlink gỡ phạm vi. Giữ handler, xác nhận xóa, focus và title/aria-label. Glyph có trong demo vẫn giữ nguyên; ba nghĩa chưa có trong demo dùng bộ bổ sung tập trung ở Icon. Nhãn Đang chọn của đợt thay bằng check nhỏ màu aqua, có tooltip và nhãn truy cập.
- Ma trận: bỏ bóng inset tạo vạch trái ở teacher-highlight; giữ nền/viền bao quanh và hành vi theo dõi giáo viên.
- Bộ lọc thống kê dùng flex ngang có wrap khi thiếu chỗ; hàng cấu hình solver có chiều cao cố định, nhãn thẳng hàng, ô cấu hình rộng hơn và không bọc nội dung đã chọn. Menu option mở vẫn bọc tên dài. Không thay dữ liệu lọc.
- Breadcrumb dùng nav/Link thật: trang tổng quan, tên không gian ngắn, trang hiện tại aria-current. Solver thêm cấp Phân công có thể nhấn, giữ query đợt/ngữ cảnh.
- QA desktop 1482×734: đã xem hàng icon giáo viên, bộ lọc thống kê/solver và nhấn breadcrumb Phân công thành công. Chưa kiểm tra lại toàn bộ màn hình và mobile trong lượt này. Typecheck/lint/build và 94 tests đạt; prototype nguyên SHA-256.

Phản hồi tiếp 17/11: sidebar thu gọn giảm từ 80px còn 68px, padding ngang 8px và khung logo 32px để logo/nút mở rộng vẫn vừa. Ẩn pseudo-element vạch đỏ trái của mục active chỉ trong rail; giữ nền/viền chọn, màu icon, tooltip và focus. Desktop mở rộng/mobile giữ nguyên. Đã xem desktop 1482×734, rail gọn và không còn vạch đỏ; format/build đạt.

Nhật ký — phản hồi tiếp 17/11: bỏ legend nhìn thấy “Thời gian ghi nhận” để không tăng một dòng. Giữ nhóm fieldset qua aria-label; ba nhãn Tìm nhật ký/Từ ngày/Đến ngày cùng một hàng trên desktop. Typecheck/lint đạt.

## Header trang gọn và breadcrumb bên dưới — 17/11/2026

Theo yêu cầu mới, chuyển h1/mô tả từ đầu nội dung lên topbar (20px desktop/17px mobile), bỏ dòng đợt/học kỳ trùng sidebar. Breadcrumb là nav riêng ngay sau header, trước main; giữ Link/aria-current và query ngữ cảnh. Các nút thao tác vẫn ở đầu nội dung. Đây là thay đổi bố cục được người dùng chấp thuận, không thay prototype.

`PageHeadingContent` portal tới target của AppLayout qua context, nên nội dung tiêu đề vẫn do trang sở hữu và cập nhật theo trạng thái; không dùng bảng tiêu đề hardcode hay sao chép DOM. RolePageHeader áp dụng cho các trang nghiệp vụ/quản trị/giáo viên; overview và danh sách giáo viên chuyển phần tiêu đề riêng tương ứng, 404/dev UI cũng hỗ trợ. Ngoài AppLayout dùng fallback tại chỗ. CSS ở `app/layouts/compact-page-header.css`; tiêu đề cũ không để lại khối trống, header thu gọn tìm kiếm ở chiều rộng nhỏ.

Đã xem tổng quan desktop 1482×734 và mobile 390×844, bỏ dòng ngữ cảnh và breadcrumb tách khỏi header; đã reset viewport. Typecheck/lint/build/format và 94 tests đạt. Chưa đối chiếu trực quan mọi route/tab hoặc trạng thái lỗi với header mới.

Breadcrumb — phản hồi tiếp 17/11: rút còn đúng hai phần ở mọi trang, icon theo roleDefinitions (shield/assignment/user) là Link về tổng quan vai trò, tiếp theo là tên mục hiện tại aria-current. Bỏ icon home, chữ không gian và cấp Phân công phụ của solver. Giữ vị trí dưới header. Đã xem desktop trang Phân công; typecheck/lint/format đạt.

Phản hồi tiếp 17/11: breadcrumb hai phần đưa lại vào header, desktop đặt cạnh khối tiêu đề/mô tả để không thêm hàng; mobile được wrap khi thiếu chỗ, nhãn dài ellipsis và giữ tên truy cập. Sidebar rail căn giữa brand/workspace/nav/avatar; nút mở rộng giữ ở góc phải logo, thanh cuộn nav ẩn để tránh dịch trục icon (vẫn cuộn và dùng bàn phím). Nguồn & đối soát/Nguồn & bí danh dùng glyph compare gốc thay file; Tài liệu đã phát hành giữ file. Đã xem desktop 1482×734 ở rail; typecheck/lint/build đạt, chưa QA lại mobile cho lượt chỉnh này.

## Toolbar, lịch và phân trang gọn — 17/11/2026

- Bỏ padding đầu khối nút cũ sau khi chuyển tiêu đề lên header; main bắt đầu cách header 16px. Danh mục và Năm học & đợt đặt nút Thêm cùng hàng tab (`page-toolbar`). Giáo viên đặt Thêm trong hàng lọc. Phân công, Kiểm tra, Nhu cầu, Solver, Tải, Thống kê dùng `page-control-row` để bộ chọn/tab và nút thao tác cùng hàng khi đủ rộng; mobile wrap, giữ handler và dữ liệu. Nhu cầu gom bộ chọn đợt và thao tác trong cùng panel.
- Hai ô Từ ngày/Đến ngày của Nhật ký dùng `shared/ui/date-picker.tsx` và CSS riêng: popup tiếng Việt, tuần bắt đầu thứ Hai, chọn tháng/năm, ngày hiện tại/ngày được chọn, Hôm nay/Xóa. Giá trị query/form vẫn YYYY-MM-DD, hiển thị dd/mm/yyyy; có phím mũi tên/Home/End/PageUp/PageDown, Enter chọn, Escape trả focus, native popover click ngoài đóng, tự đóng khi trang cuộn/resize. Chưa chuyển các input date khác.
- Pagination chung, danh sách giáo viên và chi tiết phân công chỉ còn mũi tên; title/aria-label Trang trước/Trang sau, giữ disabled/busy và logic phân trang. Không đổi nhãn so sánh Trước/Sau của dữ liệu.
- Sidebar: theo phản hồi cuối, quay lại chevron gốc; bỏ cặp PanelLeft thử trước đó. Rail 68px có nút 28px với tâm x=68px, y=38px (giữa header 76px), giữ vị trí trên đường biên. Root rail overflow hidden, nav chỉ cuộn dọc để tránh scrollbar/vạch dọc thừa; logo/icon vẫn cùng trục.
- QA desktop: đã xem Danh mục/Năm học & đợt/Giáo viên/Solver/Nhu cầu, lịch Nhật ký, pagination và rail; đo tâm nút đúng đường biên. Lịch chọn bằng ArrowRight/Enter, chọn tháng, Hôm nay/Xóa và query lọc cập nhật đúng. Solver mobile 390×844 đã xem, reset viewport và đóng tab QA riêng. Chưa QA trực quan mọi tab/mọi route hoặc lịch mobile. Typecheck/lint/build và 94 tests đạt; prototype nguyên SHA-256.

Sidebar — sửa viền lặp 17/11: desktop bỏ transition width/padding của sidebar và margin-left của app (trước 240ms riêng biệt), đổi kích thước đồng thời để tránh vệt mép trong lúc thu gọn/scale phân số. Chỉ một pseudo-element fixed 1px tạo phân cách, bỏ border-right/shadow của sidebar; giữ icon/nút và transition xoay chevron, mobile drawer không thay. Đây là điều chỉnh motion có chủ đích theo lỗi người dùng báo. Đã thử mở rồi thu gọn, đo sidebarRight và contentLeft đều 68px, border-right 0/separator 1px; đã xem rail sau cập nhật. Build và format đạt.

## Điều chỉnh hoàn thiện theo phản hồi 17/11/2026

- Filter text/search dùng `styles/filter-controls.css`, đủ chiều rộng placeholder thay giới hạn 180px; danh mục đo 320px cho cả tìm tên/mã và mã chính xác, ngày/select vẫn gọn. Tìm phân công 320px; giáo viên tên co giãn từ 260px, mã 210px; mobile về toàn hàng. Không đổi placeholder hoặc query.
- Ba tab Lớp học/Khối lớp/Cấp học đồng bộ edit/trash cùng hàng, title/aria-label và handler/xác nhận xóa giữ nguyên.
- PillBadge và badge tổng quan bỏ dot, giữ chỉ báo live/biểu đồ khác. `styles/status-badges.css` quy định nền/chữ/viền: thành công/đạt xanh, cảnh báo/thiếu dữ liệu vàng, lỗi/từ chối đỏ, chưa xác định trung tính. SUCCESS đo màu #287e72, nền #e7f2ed, viền pha xanh.
- Lịch: tháng rộng 94px, năm 76px, cùng cao 28px; override đủ specificity để không nhận chiều cao control/filter 40px.
- Tổng quan: chuyển Thống kê/Sinh đề xuất vào mvp-actions của ReadinessBanner; cả 4 nút cùng 40px, cùng padding/font/box-sizing, wrap khi hẹp. Header không còn hàng nút riêng.
- Motion sidebar thiết kế lại theo giao diện hiện tại: đăng ký `@property --sidebar-w` (`inherits: false`, bật sau frame đầu bằng `data-sidebar-ready`) để `.sidebar` (`72px` rail ↔ `248/225/210px`) và `.app` (`margin-left`) chạy trên cùng một timeline (mở `380ms cubic-bezier(0.16, 1, 0.3, 1)`, đóng `300ms cubic-bezier(0.22, 1, 0.36, 1)`), xóa bỏ hoàn toàn khoảng trống mép phải khi mở rộng và tràn ngang khi thu gọn của cách dùng WAAPI `translateX` cũ. Cố định trục tâm `x = 36px` cho BrandMark, trường, icon điều hướng và avatar để không nhảy ngang khi đóng/mở; nút tròn `26×26` có nền/viền che vạch phân cách, bám đường biên ở cả hai trạng thái và xoay chevron có độ nẩy nhẹ. Nhãn ẩn/hiện có thể ngắt giữa chừng và có stagger theo `--nav-i`, tiêu đề nhóm chuyển mượt sang vạch ngang `1px`, badge `.count` trượt chéo lên góc icon, kèm `.rail-tooltip` nổi bên phải rail và vạch active `::before` không bị cắt bởi vùng cuộn `.nav`. Mobile drawer có nút đóng `×`, đường cong mở/đóng bất đối xứng và stagger nội dung; tắt toàn bộ khi `prefers-reduced-motion: reduce`. Đã QA trực quan desktop `1440×900`, `1280×680` và mobile `390×844`.
- QA desktop 1482×678: đã xem placeholder đầy đủ, đo edit/trash cùng y ở cả ba tab, tháng/năm đúng kích thước, màu SUCCESS và 4 nút tổng quan cùng y/cao 40px. Đã thử motion hai chiều, thấy transform hoạt động và kiểm tra mép ở trạng thái cuối; chưa đo FPS hoặc QA lại mobile lượt này. Typecheck/lint/build và 94 tests đạt, prototype không đổi. Đã đóng tab QA riêng.

### Loading và skeleton — 17/11/2026

Theo yêu cầu người dùng, loading lấy giao diện hiện tại làm chuẩn. Skeleton bảng danh mục/đợt/chuẩn bị/nhu cầu dùng chính DataTable và cấu hình cột thật; giáo viên dùng CSS bảng hiện hành, tổng quan có thẻ chỉ số/biểu đồ/coverage, chi tiết có khung thông tin. Header và bộ lọc giữ nguyên. Route/session dùng chỉ báo gọn; các màn hình chưa có skeleton riêng dùng placeholder nội dung trung tính, không giả avatar/bảng.

Lọc/phân trang danh mục, chuẩn bị, nhu cầu và nhật ký giữ kết quả cũ với chỉ báo cập nhật. Không giữ dữ liệu qua đổi trường/năm/học kỳ/đợt/scope/applicability; bảng CRUD tạm inert khi cập nhật, phân trang khóa và không công bố khoảng dòng mới trước khi có kết quả. Giáo viên giữ cơ chế placeholder hiện có, khóa thao tác trên kết quả placeholder. Không thêm delay giả; lỗi request hiển thị lỗi thay vì coi dữ liệu placeholder là kết quả mới. Nút thao tác tiếp tục dùng busy/disabled hiện có.

Skeleton trang trí aria-hidden; bảng có aria-busy và status tải/cập nhật, CSS hỗ trợ reduced motion. `/dev/ui` có mẫu bảng/tổng quan/giáo viên/chi tiết/tải lại để QA. Đã xem bảng và trạng thái giữ dữ liệu desktop, tổng quan/chi tiết mobile 390×844; chưa QA trực quan từng route và mọi thao tác mutation.

- Dropdown solver (17/11): ba ô Đợt/Cấu hình/Bộ quy tắc dùng selectedcontent co giãn và ellipsis, sửa chữ dài bị cắt ngang; giữ kích thước, mũi tên và menu đầy đủ. CSS fallback native có nowrap/ellipsis. Đã xem Chrome desktop, mở menu/Escape; chưa QA mobile hoặc trình duyệt cũ lượt này.

- Rà dropdown toàn app (17/11): dùng `shared/ui/select.tsx` cho mọi select hiện có, kể cả SelectField, form/modal, bảng và lịch. Selectedcontent co giãn và ellipsis khi dài; giữ option đầy đủ và form/keyboard semantics, multiple/listbox vẫn native. Sửa lỗi nút Thêm giáo viên rớt xuống trái: filter flex co giãn, action căn phải sau các bộ lọc (kể cả Xóa lọc). Đã xem Chrome desktop hàng filter và modal thêm giáo viên, mở menu/Escape; chưa QA toàn bộ route/mobile/fallback.

- Nhu cầu (17/11): gom bộ lọc thành phần/lớp/môn/trạng thái/ngày vào một hàng desktop, chia đều chiều rộng và giữ ellipsis; bỏ toolbar riêng gây khoảng trống hai hàng. Mobile ≤700px giữ grid hai cột. Đã xem desktop 1440×900, typecheck/lint đạt; chưa QA mobile lượt này.

- Avatar hover (17/11, người dùng chấp thuận): trước avatar tĩnh; nay PortraitAvatar trong nút/liên kết đang bật scale 1.03 và vòng mờ 2px màu primary 18%, transition 150ms ease-out. Chỉ hover/fine pointer và no-preference; avatar trang trí giữ tĩnh, giữ focus bàn phím/layout/tài nguyên. CSS tại shared/ui/portrait-avatar.module.css, prototype nguyên byte. Đã xem Chrome desktop tại Nhu cầu, xác nhận computed scale/viền/duration và mở hồ sơ/Escape; chưa QA trực quan mobile/reduced-motion. Typecheck/lint đạt.

- Avatar hover — chỉnh theo phản hồi tiếp 17/11: bỏ scale vì làm mềm/vỡ nét minh họa; chỉ giữ vòng primary 18% 2px fade 150ms ease-out, kích thước và hình gốc không đổi. Giữ điều kiện hover/fine/no-preference. Format và diff-check đạt; chưa QA trực quan lại lượt bỏ scale.

### Tooltip dùng chung (17/11/2026)

Theo phản hồi người dùng, các gợi ý `title` trên DOM được nâng cấp qua `shared/ui/tooltips.tsx` tại entry app, thay hộp mặc định trình duyệt bằng nền `--ink`, chữ `--surface`, font body 12px/500, bo 8px và shadow giống rail. Không đổi nội dung hay tooltip biểu đồ/rail. Hover trễ 400ms, focus hiện ngay; Escape, nhấn, scroll/resize đóng; tự lật trên/dưới và giới hạn viewport. Dùng popover manual để không bị cắt trong dialog/bảng, fallback fixed và tắt animation khi reduced motion. Prototype giữ nguyên. Đã xem focus/Escape ở bảng Nhu cầu desktop; chưa QA mọi route/mobile/dialog/hover.

### Focus thống nhất (17/11/2026)

Theo phương án người dùng đã duyệt: `styles/focus.css` ghi đè CSS focus sinh từ demo, import cuối entry app. Trước: outline + halo và border focus chồng nhau; sau: nút/link/icon một vòng primary 2px cách 3px khi focus-visible; input/select/textarea chỉ viền primary và halo 14%/3px, không outline ngoài. Sidebar/tab/ma trận đặt vòng vào trong để tránh bị cắt. Select base-select bỏ vòng ở nút con, select giữ chỉ báo. Chuột không tạo vòng trên nút; ô nhập vẫn có chỉ báo đang nhập. Forced colors dùng Highlight để giữ truy cập, không đổi prototype. Đã QA desktop nút bảng bằng Tab và ô số trong dialog Nhu cầu; chưa QA mọi route/mobile/forced colors.

- Warning (17/11, người dùng duyệt): thay tam giác nhọn bằng Tabler alert-triangle bo góc trong glyph dùng chung; giữ currentColor, nét 1.6px, lớp duo 12%, kích thước và wrapper không nền. Có attribution MIT tại public/licenses/tabler-icons.txt. Đã xem icon trên thẻ “Cần bạn xử lý” ở tổng quan desktop; chưa QA mọi vị trí/mobile. Typecheck/lint đạt, prototype giữ SHA-256 gốc.

### Toast — 17/11/2026

Theo phương án người dùng duyệt: trước có viền trái 3px theo trạng thái; sau bỏ vạch màu ở tất cả toast, giữ nền/viền trung tính, bo góc/bóng/vị trí hiện tại và icon đỏ/xanh không ô nền. Chữ dài được ngắt trong khung. Hiện bằng fade + translateY(6px), 180ms ease-out, chỉ khi no-preference. Lỗi có mô tả mặc định 8 giây, thông báo khác 4,2 giây; durationMs tùy chỉnh/null/không dương giữ semantics. Hover hoặc focus tạm dừng và tiếp tục thời gian còn lại khi rời cả hai. Timer thuộc từng toast, được dọn khi đóng/clear/unmount hoặc bị đẩy khỏi stack tối đa 4 mục. Cập nhật mô tả mẫu /dev/ui theo hành vi mới; không sửa prototype.

QA Chrome desktop: đã xem toast lỗi không vạch màu, icon/viền/nội dung/nút đóng; thử đóng, focus giữ quá thời hạn và blur tự đóng tiếp. Chưa QA mobile, hover, reduced motion hoặc mọi duration tùy chỉnh. Build/lint đạt; 95/96 tests đạt, test SVG đối chiếu demo thất bại do override icon warning đã có từ lượt trước, ngoài phạm vi toast.

### FE-08 — sửa responsive giáo viên, 17/11/2026

Lỗi cụ thể: ở 390px, personal-greeting đặt avatar/tên/badge trên một hàng, ép tên đầy đủ thành cột rất hẹp. CSS riêng pages/teacher/teacher-pages.css chuyển thành grid avatar + tên và đưa badge xuống hàng dưới ở ≤700px. Giữ font/màu/ảnh/kích thước desktop, không sửa prototype hoặc CSS sinh. Đã xem trước/sau mobile 390×844 và desktop 1440×900. Phạm vi QA, reduced motion và các giới hạn được ghi tại [QA FE-08](FE08_QA.md).

### Toast tham khảo mới — 17/11/2026

Theo yêu cầu tham khảo mẫu: toast dùng chung chuyển từ một hàng nội dung sang header + mô tả thu gọn/mở rộng (mặc định đóng, ẩn cả footer) + footer đếm giây và thanh thời gian 3px. Giữ token TASS, icon hiện có không ô nền, vị trí góc phải dưới, tối đa 4 mục và thời hạn 4,2/8 giây. Footer cho phép dừng/tiếp tục; hover/focus vẫn tạm dừng. null/không dương vẫn giữ đến khi đóng. Không thêm xác nhận thao tác nguy hiểm vào toast. Mobile co theo viewport, stack cuộn khi cao; reduced motion tắt hiệu ứng chuyển động. Ảnh hưởng toàn bộ nơi dùng useToast, không đổi API gọi hoặc prototype.

Kiểm chứng: build, lint và 97/97 tests đạt. Chưa xác minh trực quan desktop/mobile và tương tác trên trình duyệt: IAB không kết nối được server local 5174 (localhost refused, IP LAN timeout). Cần xem lại /dev/ui trước nghiệm thu trực quan.

Điều chỉnh theo phản hồi tiếp theo 17/11: mặc định chỉ hiện header; nút chevron mở cả mô tả và footer, kể cả toast chỉ có tiêu đề nhưng có thời hạn. Giảm rộng 400 xuống 380px, padding header 12×14px, bo 12px, chữ hành động footer nhỏ/nhẹ hơn. Đã xem trực quan Chrome desktop /dev/ui ở cả trạng thái đóng/mở; chưa kiểm tra lại mobile hoặc reduced motion trong lượt này.

Bổ sung 17/11: thanh thời gian 3px nằm ngoài vùng thu gọn, luôn hiện ở đáy toast có thời hạn trong cả hai trạng thái. Mô tả và chữ đếm giây/dừng vẫn chỉ hiện khi mở rộng; giữ nguyên timer và pause.

Sửa cạnh đáy toast 17/11: clip nội dung bằng overflow:hidden trên khung bo 12px; bỏ bo riêng của footer/track để thanh thời gian bám đúng đường cong khung. Focus nút footer đặt vào trong để không bị cắt.

Toast hết hạn 17/11: trượt ra phải + fade trong 240ms rồi mới gỡ khỏi stack; timer cleanup khi clear/unmount. Reduced motion gỡ ngay, không trượt. Nút đóng thủ công giữ hành vi hiện tại.

Sửa chớp cạnh dưới khi exit 17/11: stack đặt overflow-x:hidden, giữ overflow-y:auto. Trước đó translateX làm vùng cuộn ngang phát sinh trong 240ms, có thể hiện thanh cuộn bên dưới toast. Không đổi thanh thời gian/timer hoặc hướng animation.

## Illustration theo trạng thái — 17/11/2026

Theo yêu cầu thêm illustration, bổ sung bộ SVG nội bộ `StateIllustration` dùng token màu hiện hành: lịch/phương án, chờ công bố, hồ sơ giáo viên, tài liệu, chuẩn bị, solver/đã áp dụng và 404/quyền/phạm vi. Trước đây các vùng này dùng icon hoặc chữ; nay có hình trang trí 160px desktop/132px mobile, ẩn khỏi accessibility và không có animation. Giữ nội dung, hành động, bảng, filter, pagination và prototype.

Áp dụng có chọn lọc qua prop cho EmptyState/RoleStateCard; không tự thay toàn bộ trạng thái lỗi/loading. Danh sách giáo viên chỉ hiện hình khi không có filter và ở trang đầu; nhu cầu chỉ hiện khi kind=empty; chuẩn bị chỉ khi nguồn phạm vi trống. Solver hoàn tất chỉ hiện khi apply_outcome=APPLIED. Thư viện `/dev/ui` có đủ 10 mẫu để xem và kiểm tra responsive.
