# TASS Greedy

Module thuật toán tham lam, ngang hàng với `tass-cpsat`. Dùng trực tiếp fixture tại `..\tass-cpsat\fixtures` và bộ kiểm thử chung trong `..\tass-comparison\shared-tests`.

Thứ tự: nhu cầu ít GV đủ điều kiện trước; nếu coverage theo tiết thì ưu tiên số tiết lớn hơn khi cùng số ứng viên. Với từng nhu cầu, chọn GV còn tải và phù hợp quy tắc nhóm có mức tăng điểm mềm thấp nhất; hòa điểm dùng mã GV. Không đổi lại các quyết định trước, không có tìm kiếm toàn cục, không gọi solver CP-SAT. Đây là baseline có xử lý nhu cầu ít lựa chọn, không cố tình dùng một baseline yếu để tạo lợi thế cho thuật toán khác.

Từ thư mục này:

```powershell
# Chạy bộ test gốc của CP-SAT và cùng các test chung cho Greedy, đóng gói JAR.
..\tass-comparison\Test-All.ps1 -Algorithm GREEDY

# Chạy đúng fixture CP-SAT hiện có.
.\Run.ps1
.\Run.ps1 -Fixture ..\tass-cpsat\fixtures\shortage.json
```

Kết quả JSON/CSV có cùng schema với CP-SAT. Status khả thi là FEASIBLE; không chứng minh tối ưu. Có thể thất bại về độ phủ hoặc điểm mềm trên bài toán mà CP-SAT/GA tìm được nghiệm tốt hơn. Cấu hình và ràng buộc cứng giữ nguyên theo snapshot.
