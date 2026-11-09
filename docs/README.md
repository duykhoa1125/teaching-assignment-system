# Báo cáo LaTeX: cài môi trường và build offline

Nguồn chính là [`report.tex`](report.tex), kết quả là [`report.pdf`](report.pdf). Hướng dẫn dưới đây dành cho Windows 10/11 64-bit và VS Code desktop. Sau khi cài đủ công cụ, package và font, việc sửa báo cáo và tạo PDF chạy trên máy, không cần Internet.

## 1. Bộ tệp cần giữ cùng nhau

Mở **thư mục gốc `DACN-code`** bằng **File → Open Folder** để VS Code đọc cấu hình `.vscode/`. Không chỉ mở riêng file `.tex` hoặc thư mục `docs`.

```text
DACN-code/
├── .vscode/
│   ├── extensions.json       # Gợi ý cài LaTeX Workshop
│   └── settings.json         # Ctrl+S → latexmk → XeLaTeX
└── docs/
    ├── README.md
    ├── report.tex
    ├── report.pdf
    ├── images/
    │   └── hcmut.png
    └── diagrams/
        ├── DG-01.png ... DG-09.png
        └── ERD_20261108.png
```

Các hình được đọc trực tiếp từ `images/` và `diagrams/` trong `docs`; không cần thư mục `docs/srs/` trên máy người soạn ban đầu. Báo cáo không dùng `\input` ngoài, tệp `.bib`, BibTeX/Biber, Python, Java, Node.js hay dịch vụ Overleaf để build. Những đường dẫn SQL/Excel/JAR được nhắc trong nội dung là tài liệu tham chiếu, không phải đầu vào của trình biên dịch.

## 2. Những gì cần tải

Chọn **một** bản phân phối TeX. Hướng dẫn chính dùng MiKTeX và Strawberry Perl; nếu đã cài TeX Live đầy đủ thì dùng luôn, không cần cài thêm MiKTeX.

| Thành phần | Tải ở đâu, chọn gì | Vai trò |
| --- | --- | --- |
| VS Code desktop | [Trang tải VS Code](https://code.visualstudio.com/download), Windows x64 User Installer | Soạn `.tex`, xem PDF |
| MiKTeX | [Trang tải MiKTeX](https://miktex.org/download), Windows x64 Basic Installer cho cách cài có mạng; Setup Utility cho bộ cài offline ở mục 4 | Cung cấp XeLaTeX và package TeX |
| Strawberry Perl | [Trang tải Strawberry Perl](https://strawberryperl.com/), bản 64-bit MSI | Chạy `latexmk`; MiKTeX không kèm Perl |
| LaTeX Workshop | [Extension `James-Yu.latex-workshop`](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) | Build khi lưu, xem và tự cập nhật PDF |
| Font | Times New Roman và Arial nếu máy đã có; nếu thiếu, nguồn tự dùng Latin Modern Roman/Sans trong bộ TeX | Hiển thị tiếng Việt và nội dung báo cáo |

Không cần LaTeX Utilities, trình xem PDF bên ngoài hay extension trả phí. Nếu cần PDF có bố cục giống nhau giữa các máy, cả nhóm nên dùng cùng bộ font và cùng phiên bản TeX/package; cơ chế font dự phòng có thể làm thay đổi ngắt dòng và số trang. Không đưa font thương mại vào repo.

## 3. Cài trên máy có Internet, sau đó dùng offline

1. Cài VS Code; bật **Add to PATH** nếu trình cài đưa ra tùy chọn này.
2. Cài Strawberry Perl x64 MSI, giữ tùy chọn thêm Perl vào `PATH`.
3. Cài MiKTeX Basic cho **Only for me**, khổ giấy **A4**. Trong giai đoạn chuẩn bị có mạng, chọn **Install missing packages on-the-fly: Always** để công cụ tải được package còn thiếu. Xem [hướng dẫn cài MiKTeX chính thức](https://miktex.org/howto/install-miktex).
4. Mở **MiKTeX Console** đúng chế độ người dùng của bản vừa cài, vào **Updates**, kiểm tra và cài các cập nhật; khởi động lại Console nếu được yêu cầu. Trong **Packages**, bảo đảm có `latexmk` và các package ở mục 5.
5. Mở VS Code, nhấn **Ctrl+Shift+X**, tìm đúng ID `James-Yu.latex-workshop` rồi chọn **Install**. Hoặc chạy trong PowerShell sau khi lệnh `code` đã có trên PATH:

   ```powershell
   code --install-extension James-Yu.latex-workshop
   ```

6. Đóng toàn bộ cửa sổ VS Code và mở lại để nhận `PATH` mới. Mở thư mục gốc repo và chạy các lệnh kiểm tra ở mục 6 trong terminal của VS Code.
7. Khi **vẫn còn mạng**, thực hiện một lần build theo mục 7 để MiKTeX cài nốt phụ thuộc gián tiếp và tạo format cần thiết. Sau khi build thành công, thử ngắt mạng, sửa một dòng, lưu và kiểm tra PDF cập nhật. Nếu lần chuẩn bị này còn báo thiếu package thì cài đủ trước khi chuyển sang offline.

Máy đã cài MiKTeX/Perl có thể bỏ qua bước cài lại và kiểm tra từ mục 6. Chỉ có Basic Installer và extension là chưa đủ bảo đảm build offline; package cần có sẵn. Nếu máy đích không có mạng ngay từ đầu, dùng mục 4.

## 4. Chuẩn bị bộ cài cho máy hoàn toàn không có Internet

Một thành viên dùng máy có mạng tải bộ sau vào USB/ổ chia sẻ, **bên ngoài repo Git**. README này mô tả bộ cần chuẩn bị; các bộ cài và kho package dung lượng lớn không nằm trong repo.

```text
latex-offline-kit/
├── VSCodeUserSetup-x64-<version>.exe
├── strawberry-perl-<version>-64bit.msi
├── James-Yu.latex-workshop-<version>.vsix
├── miktexsetup_standalone.exe
├── miktex-repository/                  # Toàn bộ kết quả lệnh download bên dưới
└── DACN-code/                         # Bản sao repo có đủ nguồn và hình ở mục 1
```

### Trên máy có mạng

1. Tải bộ cài VS Code và Strawberry Perl theo mục 2, giữ lại các tệp `.exe`/`.msi`.
2. Trong **Extensions** của VS Code, tìm LaTeX Workshop, nhấp phải extension rồi chọn **Download VSIX** hoặc **Download Specific Version VSIX**. Giữ tệp `.vsix` và dùng cùng phiên bản cho cả nhóm. Nếu phiên bản đã chọn có khai báo extension phụ thuộc, tải cả VSIX của các phụ thuộc đó. Xem [hướng dẫn tải/cài VSIX](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace).
3. Tải và giải nén [MiKTeX Setup Utility x64](https://miktex.org/download/win/miktexsetup-x64.zip). Đặt `miktexsetup_standalone.exe` vào `latex-offline-kit`.
4. Mở PowerShell tại `latex-offline-kit`, tải kho package đầy đủ:

   ```powershell
   $repoPath = Join-Path (Get-Location) 'miktex-repository'
   .\miktexsetup_standalone.exe --verbose "--local-package-repository=$repoPath" --package-set=complete download
   ```

   Đợi lệnh kết thúc thành công rồi mới sao chép **cả thư mục** sang máy đích. Kho `complete` có dung lượng nhiều GB, bao gồm các phụ thuộc gián tiếp; không chỉ sao chép vài tệp `.sty`. Nếu bị gián đoạn, chạy lại lệnh để tiếp tục. Cách tạo kho dựa trên [hướng dẫn local repository](https://miktex.org/howto/local-repository) và [tài liệu Setup Utility](https://docs.miktex.org/manual/miktexsetup.html).

### Trên máy không có mạng

1. Cài VS Code và Strawberry Perl từ bộ cài đã tải.
2. Với máy chưa có MiKTeX, mở PowerShell tại `latex-offline-kit`, cài cho người dùng hiện tại từ kho local:

   ```powershell
   $repoPath = Join-Path (Get-Location) 'miktex-repository'
   .\miktexsetup_standalone.exe --verbose "--local-package-repository=$repoPath" --package-set=complete --shared=no --modify-path install
   ```

   Với máy đã có MiKTeX, dùng MiKTeX Console của bản hiện tại: đổi nguồn package sang **local package repository**, trỏ đến `miktex-repository`, rồi cài package còn thiếu. Không cài chồng thêm một bản khác chỉ để sửa PATH. Cách dùng kho local được mô tả trong [hướng dẫn triển khai MiKTeX](https://miktex.org/howto/deploy-miktex).
3. Trong MiKTeX Console, chọn kho package local nói trên làm nguồn thay cho mirror Internet để có thể xử lý package còn thiếu khi offline. Không chạy cập nhật từ mirror Internet trên máy đích.
4. Trong VS Code: **Extensions → menu `…` → Install from VSIX…**, chọn tệp LaTeX Workshop đã tải. Hoặc:

   ```powershell
   code --install-extension '.\James-Yu.latex-workshop-<version>.vsix'
   ```

   Thay `<version>` bằng tên tệp thực tế. Xem [hướng dẫn cài extension từ VSIX](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace).
5. Đóng/mở lại VS Code, mở `DACN-code`, làm mục 6–7. Giữ USB/kho local cho đến khi lần build offline đầu tiên hoàn tất.

**Nếu nhóm chọn TeX Live:** có thể dùng [TeX Live bản đầy đủ](https://www.tug.org/texlive/doc/texlive-en/texlive-en.html) hoặc [ISO chính thức](https://www.tug.org/texlive/acquire-iso.html). Mount ISO, chạy `install-tl-windows.bat`, chọn `scheme-full` và cài từ ISO. TeX Live Windows có Perl phục vụ các công cụ TeX, không cần Strawberry Perl riêng. VS Code, VSIX và nguồn/hình vẫn cần chuẩn bị như trên. Đây là lựa chọn thay thế MiKTeX; chỉ để một bộ TeX được ưu tiên trên PATH.

## 5. Các package mà `report.tex` sử dụng

Kho MiKTeX `complete` hoặc TeX Live `scheme-full` bao gồm các nhóm dưới đây. Với bản cài tối giản, tìm tên package trong MiKTeX Console → **Packages** và cài cùng các phụ thuộc mà trình quản lý yêu cầu; không chép `.sty` thủ công.

| Package/bộ package | Tệp hoặc lệnh dùng trong báo cáo |
| --- | --- |
| `latexmk`, XeTeX/XeLaTeX | Điều phối nhiều lượt build và xử lý Unicode |
| `latex-base` | `report.cls`; các gói lõi như `ifthen`, `inputenc`, `fontenc` khi cần |
| `geometry`, `iftex`, `fontspec` | Khổ giấy, nhận diện engine, font hệ thống |
| `lm` | Font Latin Modern và `lmodern.sty` cho nhánh dự phòng |
| `amsmath`, `amsfonts` | `amsmath.sty`, `amssymb.sty` và ký hiệu toán |
| `graphics`, `float`, `pdflscape`, `caption`, `xcolor` | `graphicx.sty`, hình, bảng xoay và màu |
| `tools` | `array.sty`, `longtable.sty`, `tabularx.sty` |
| `booktabs`, `enumitem` | Bảng và danh sách |
| `pgf` | `tikz.sty`, thư viện `calc` vẽ khung bìa |
| `fancyhdr`, `lastpage` | Header/footer và tổng số trang |
| `url`, `hyperref` | URL và tham chiếu có liên kết |

Dùng **XeLaTeX** theo recipe đã cấu hình. Nhánh pdfLaTeX trong nguồn có hỗ trợ dự phòng, nhưng hướng dẫn này thống nhất XeLaTeX để dùng font Unicode tiếng Việt; không cần cài bộ hỗ trợ T5 chỉ để chạy recipe XeLaTeX.

## 6. Kiểm tra môi trường trước khi build

Chạy trong terminal PowerShell **bên trong VS Code** sau khi mở lại ứng dụng:

```powershell
Get-Command xelatex, latexmk, perl, kpsewhich | Select-Object Name, Source
xelatex --version
latexmk -v
perl -v
```

Nếu dùng TeX Live, Perl nội bộ không nhất thiết xuất hiện dưới lệnh `perl` trên PATH; `latexmk -v` chạy được mới là kiểm tra cần thiết cho recipe. Nếu dùng MiKTeX, cần có Strawberry Perl.

Kiểm tra các tệp TeX trực tiếp, không biên dịch tài liệu:

```powershell
$texFiles = @(
    'report.cls', 'geometry.sty', 'iftex.sty', 'fontspec.sty',
    'amsmath.sty', 'amssymb.sty', 'graphicx.sty', 'float.sty',
    'pdflscape.sty', 'caption.sty', 'xcolor.sty', 'array.sty',
    'longtable.sty', 'tabularx.sty', 'booktabs.sty', 'enumitem.sty',
    'tikz.sty', 'tikzlibrarycalc.code.tex', 'fancyhdr.sty',
    'lastpage.sty', 'url.sty', 'hyperref.sty', 'lmodern.sty'
)
foreach ($texFile in $texFiles) {
    $resolvedPath = kpsewhich $texFile
    if ($resolvedPath) { Write-Host "OK      $texFile" }
    else { Write-Host "MISSING $texFile" -ForegroundColor Red }
}
```

Kết quả `MISSING` cần được xử lý bằng trình quản lý package hoặc kho local trước khi build offline. Kiểm tra này chỉ xác nhận các tệp trực tiếp; lần build thành công mới kiểm tra được đầy đủ format, font và phụ thuộc gián tiếp.

## 7. Ctrl+S để tự tạo PDF

1. Mở **File → Open Folder → `DACN-code`**. Nếu repo đang ở **Restricted Mode**, chọn tin cậy workspace khi đây là bản repo của nhóm để extension được hoạt động.
2. Mở `docs/report.tex`; kiểm tra góc phải dưới VS Code nhận ngôn ngữ là **LaTeX**, mã hóa **UTF-8** và LaTeX Workshop đã được bật cho workspace.
3. Sửa nội dung rồi nhấn **Ctrl+S**. Cấu hình repo đặt `latex-workshop.latex.autoBuild.run` là `onSave`; recipe `latexmk (xelatex)` tạo **`docs/report.pdf`**. `latexmk` tự chạy đủ lượt cần thiết cho mục lục, danh mục hình và tham chiếu. Xem [tài liệu auto build và recipe](https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile).
4. Nhấn **Ctrl+Alt+V** hoặc dùng Command Palette → **LaTeX Workshop: View LaTeX PDF file** để mở PDF trong tab. Sau những lần build thành công tiếp theo, tab PDF tự cập nhật. Việc build là nền; chờ hoàn tất trước khi kiểm tra kết quả.
5. Muốn build lại ngay, kể cả khi file chưa thay đổi: **Ctrl+Alt+B** hoặc **LaTeX Workshop: Build LaTeX project**. Nếu cần chọn recipe, dùng **Build with recipe → latexmk (xelatex)**.

Các dòng `%!LW recipe`, `%!TEX program` và `%!TEX root` ở đầu nguồn thống nhất recipe và tệp gốc. `.vscode/settings.json` không chứa đường dẫn tuyệt đối riêng của một máy. Cấu hình giữ log, cache và SyncTeX để chẩn đoán, build tăng dần và tra cứu giữa nguồn/PDF; `.gitignore` đã bỏ qua các tệp phụ.

**Build thủ công để chẩn đoán**, chạy từ thư mục gốc repo:

```powershell
latexmk -cd -xelatex -synctex=1 -interaction=nonstopmode -halt-on-error -file-line-error docs/report.tex
```

Lệnh trên tạo PDF cùng thư mục với nguồn. Nếu Ctrl+S không chạy nhưng lệnh này thành công, kiểm tra lại workspace/extension và thiết lập `onSave`. Sau khi thay riêng ảnh PNG, nhấn Ctrl+Alt+B; chế độ `onSave` chỉ tự kích hoạt khi lưu tệp TeX.

## 8. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `spawn latexmk ENOENT`, `xelatex is not recognized` | Kiểm tra `Get-Command`, thêm thư mục `bin` của bản TeX thực tế vào **User PATH**, rồi đóng/mở lại toàn bộ VS Code. Ví dụ MiKTeX: `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64` hoặc `C:\Program Files\MiKTeX\miktex\bin\x64`; TeX Live: `C:\texlive\<year>\bin\windows`. |
| MiKTeX báo thiếu script engine `perl` | Cài Strawberry Perl; kiểm tra `C:\Strawberry\perl\bin` trên PATH rồi mở lại VS Code. |
| `File ...sty not found` hoặc chờ tải package khi mất mạng | Cài package tương ứng từ kho local ở mục 4. Basic MiKTeX chưa tải đủ package không thể tự lấy chúng khi mất mạng. |
| Không tìm thấy `images/hcmut.png` hoặc sơ đồ | Kiểm tra đủ tệp mục 1. Dùng nguồn mới với `diagrams/`, giữ nguyên tên file và chữ hoa/thường khi làm việc trên Linux. |
| `fontspec` báo cần XeTeX/LuaTeX | Chọn recipe `latexmk (xelatex)`, không chạy pdfLaTeX. |
| Font không giống máy khác hoặc số trang thay đổi | Thống nhất Times New Roman/Arial hoặc cùng dùng font dự phòng Latin Modern, cùng phiên bản bộ TeX. |
| Ctrl+S không build | Mở đúng thư mục gốc, bật LaTeX Workshop, kiểm tra Restricted Mode, ngôn ngữ LaTeX và setting `onSave`. Xem **View → Output → LaTeX Workshop**. |
| PDF vẫn là bản cũ | Xem lỗi đầu tiên trong Output hoặc `docs/report.log`. Build lỗi có thể để lại PDF thành công từ lần trước; kiểm tra thời gian sửa file. Đóng trình xem ngoài nếu nó khóa PDF. |
| Mục lục/tham chiếu hiện `??` sau lần đầu | Đợi `latexmk` chạy xong các lượt. Nếu vẫn còn, kiểm tra label/ref trong nguồn và log; không chỉ chạy XeLaTeX một lượt. |

## 9. Đưa bản cập nhật lên Git cho nhóm

`.gitignore` đã cho phép `docs/report.tex`, README và logo, đồng thời vẫn bỏ qua log/cache. Từ thư mục gốc repo, kiểm tra rồi stage riêng các tệp tài liệu/cấu hình:

```powershell
git status --short
git add .gitignore .vscode/settings.json .vscode/extensions.json docs/README.md docs/report.tex docs/images/hcmut.png
git diff --cached --stat
```

Các sơ đồ trong `docs/diagrams/` cũng phải có trong commit; nếu cập nhật ảnh, stage rõ từng tệp ảnh đó. Sau khi tự build và kiểm tra PDF, có thể thêm `git add docs/report.pdf` để cập nhật bản đọc sẵn. Không commit bộ cài, kho package, font hệ thống hoặc tệp build phụ. Commit/push trên nhánh công việc hiện tại và mở Pull Request vào `dev` theo rule của repo; không push trực tiếp vào `dev`.
