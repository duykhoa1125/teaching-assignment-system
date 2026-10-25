# TASS Genetic Algorithm (GA)

Module di truyền, ngang hàng với `tass-cpsat`. Dùng trực tiếp fixture tại `..\tass-cpsat\fixtures` và bộ kiểm thử chung trong `..\tass-comparison\shared-tests`.

Chromosome gồm random key cho thứ tự nhu cầu và gene ưu tiên GV (có lựa chọn chưa gán). Decoder luôn giữ điều kiện chuyên môn, công tác, cùng GV giữa thành phần và các giới hạn tải. Fitness là cặp coverage/soft theo thứ tự từ điển, cùng công thức của CP-SAT. Mỗi nghiệm cuối được validator gốc kiểm tra lại.

Mặc định: 40 cá thể, tối đa 200 thế hệ, tournament 3, giữ 2 cá thể tốt, uniform crossover, xác suất đột biến mỗi gene 0.10. Quần thể có một cá thể khởi tạo theo Greedy; còn lại khởi tạo ngẫu nhiên. Seed từ snapshot. Dừng khi đủ thế hệ, hết ngân sách chung hoặc bị hủy. Không gọi CP-SAT trong tìm nghiệm.

Từ thư mục này:

```powershell
..\tass-comparison\Test-All.ps1 -Algorithm GENETIC
.\Run.ps1
.\Run.ps1 -Fixture ..\tass-cpsat\fixtures\decimal-load.json
```

API `GeneticSolver.Options` cho phép cấu hình population/generations/mutation. Tham số phải được ghi nhận khi so sánh; không chỉnh riêng cho một test rồi báo như cấu hình chung. JAR mặc định dùng cùng Options ghi trên.

Result khả thi là FEASIBLE và không có proof tối ưu. Seed cố định cho kết quả lặp lại khi chạy đủ thế hệ; khi chạm giới hạn thời gian, số thế hệ thực tế và kết quả có thể khác giữa các máy/lượt chạy.
