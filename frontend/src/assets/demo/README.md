# Tài nguyên gốc của khung giao diện

Trích nguyên byte từ `frontend/prototype/index.html` bằng `npm run assets:shell`.

- `font-1.woff2`–`font-12.woff2`: Be Vietnam Pro, các subset và trọng lượng được khai báo trong demo.
- `font-13.woff2`–`font-15.woff2`: Manrope variable400–800, các subset của demo.
- `manager.svg`: ảnh đại diện tài khoản điều phối, giữ cả metadata/ghi nhận CC0 bên trong SVG.

Khai báo font-face và unicode-range nằm trong `src/app/layouts/prototype-shell.css`; không sửa trực tiếp file sinh. Giấy phép font đi cùng build tại `public/licenses/be-vietnam-pro-OFL.txt` và `public/licenses/manrope-OFL.txt`. Nguồn giấy phép Manrope: https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt.

Đây là tài nguyên của layout; chưa bao gồm toàn bộ hình minh họa của các màn hình nghiệp vụ.
