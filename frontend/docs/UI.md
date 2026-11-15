# Nền tảng UI — FE-02A

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

Kiểm tra tự động dự án bằng typecheck/lint/format/test/build. Kiểm tra tương tác tại `/dev/ui`: biểu mẫu, lỗi nhập, Escape/trả focus, xác nhận busy, toast và phân trang. Xem ở desktop và màn hình390px; bảng có thể cuộn trong vùng riêng nhưng trang không được tràn ngang.
