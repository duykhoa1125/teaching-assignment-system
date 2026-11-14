# So sánh thuật toán TASS

Reactor này build CP-SAT, common, Greedy, Genetic và benchmark cùng parent comparison. Các module dùng chung hợp đồng, validator và vector từ điển **(Z,L1,M,experience,change)**. CP-SAT có thể cung cấp proof; Greedy/GA chỉ báo chất lượng nghiệm đã kiểm tra.

## Chạy

Từ thư mục algorithm/tass-comparison:

```powershell
.\Test-All.ps1
.\Test-All.ps1 -Offline  # chỉ khi cache đã đầy đủ
.\Run-Algorithm.ps1 -Algorithm CP_SAT
.\Run-Algorithm.ps1 -Algorithm GREEDY
.\Run-Algorithm.ps1 -Algorithm GENETIC
.\Run-Comparison.ps1 -Repeats 3 -Seconds 2
```

Mọi script chọn **JDK 17** qua scripts/java17.ps1 ở root; có thể truyền -JavaHome trỏ JDK 17. Không tự chọn runtime21 cũ. Setup chung: từ root chạy scripts/setup-java17.ps1. Cache Maven của các wrapper thuật toán vẫn ở tass-cpsat/.m2 để giữ workflow offline đã có.

Root reactor CP-SAT+backend và reactor comparison có mục đích khác nhau. CLI run/comparison cần các JAR đã được build; xóa target khi dọn output sẽ yêu cầu build lại. Không có thao tác tải/build ngầm vào giữa lượt đo.

## Kiểm thử và hồ sơ

[CommonSolverTest.java](shared-tests/vn/edu/tass/solver/CommonSolverTest.java) là nguồn chung chạy bằng ba adapter; dùng core và test-helpers của CP-SAT, không copy fixture thành ba bản. Chính khóa/chuyên đề/tăng cường được phép dùng giáo viên khác nhau; lock vẫn được bảo toàn. [TEST-MAP.md](TEST-MAP.md) là ma trận hiện hành.

- Hồ sơ module09/11: [209 lượt test](../tass-cpsat/docs/TEST-RESULTS-20261109.md).
- Hồ sơ benchmark09/11: [45 lượt, manifest/CSV/raw JSON](reports/20261109/README.md).
- Hồ sơ cũ25/10: [183 lượt test/60 lượt đo](../../docs/history/20261025/algorithm/tass-comparison/TEST-RESULTS.md), không trộn vào kết quả năm bước hiện hành.

Generated results/ bị ignore; hồ sơ được chọn để bàn giao nằm reports/. Các lần đo mới phải dùng cùng input/seed/ngân sách trong từng bộ ba, validator chung, warm-up và thứ tự luân phiên. Thời gian solve() không bao gồm queue/HTTP/DB hoặc JVM startup, và không phải một thành phần của vector mục tiêu.

Không dùng softObjective alias L1 để xếp hạng thay vector năm mục tiêu. Kết quả FEASIBLE không chứng minh tối ưu; dữ liệu đủ không đồng nghĩa đủ điều kiện phát hành phương án. [Backend/API](../../backend/docs/README.md) có kiểm soát lifecycle, revision và source token riêng.
