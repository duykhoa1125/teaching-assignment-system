# Thành phần dùng chung

`HeuristicProblem` giải mã chromosome thành nghiệm thỏa chuyên môn, công tác, cùng GV trong nhóm và mọi biểu thức tải cứng. `HeuristicResults` gọi **InputValidator, SolutionValidator, Contract và AssignmentService gốc từ tass-cpsat**. Thư viện này không gọi CP-SAT để tìm nghiệm cho Greedy/GA.

Các thuật toán dùng cùng cặp điểm `(coverageObjective, softObjective)` theo thứ tự từ điển: giảm coverage trước, sau đó giảm soft; không dùng một hệ số phạt lớn để đổi ràng buộc cứng lấy điểm. Mọi kết quả phải qua validator gốc trước khi được chấp nhận.

Build từ `..\tass-comparison\Test-All.ps1`. Cần giữ cấu trúc các thư mục ngang hàng.
