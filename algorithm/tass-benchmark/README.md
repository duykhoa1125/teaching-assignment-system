# Bộ chạy benchmark

Chạy từ `..\tass-comparison\Run-Comparison.ps1` để dùng JDK tương thích đã có trong CP-SAT. JAR tự chứa sau build là `target/tass-benchmark-0.1.0-all.jar`.

Tham số Java: `<thư mục fixtures> <thư mục output MỚI> [số lượt=5] [ngân sách giây=2]`.

Xem quy trình công bằng và cách đọc chỉ số ở `..\tass-comparison\README.md`. Cả CP-SAT, Greedy và GA dùng cùng input hash trong mỗi lượt; benchmark kiểm tra lại nghiệm bằng SolutionValidator gốc trước khi ghi nhận là hợp lệ.
