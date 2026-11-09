# Mô hình thuật toán theo report hiện hành — 09/11/2026

Tài liệu này thay mô tả tối ưu hai pha trong hồ sơ PoC ngày 25/10. Căn cứ là `docs/report.tex`, BR-01/03/08/09, DATA-03/06/09/13/18, HC-01..04 và SC-01..04. Module nhận snapshot tin cậy từ backend; chưa phải API Spring Boot hoặc adapter trực tiếp cho schema 48 bảng.

## Mô hình và kết quả

CP-SAT tối thiểu hóa lần lượt `(Z, L1, M, experience, change)`. Sau mỗi bước, giá trị của nghiệm đã qua kiểm tra độc lập được cố định bằng đẳng thức trước bước sau. Tổng lệch là `sum(abs(T-B))`, lệch lớn nhất là `max(abs(T-B))`, với `T=F+A+C+R`. Giáo viên không có mục tiêu áp dụng được loại khỏi cả hai mục tiêu tải. Q vẫn được báo là `max(0,B-R)` để đối chiếu, nhưng không thay T-B khi R>B.

- Mỗi thành phần có tối đa một giáo viên. STANDARD, SPECIALIZED_TOPIC và ENRICHMENT độc lập; không ép chung giáo viên cho lớp–môn. Cặp lớp–môn chỉ dùng để thống kê hoàn chỉnh.
- KHTN là một tên/mã môn trong Subject, áp dụng điều kiện chuyên môn như mọi môn khác. Không có mô hình môn cha/con hoặc lớp ghép.
- Điểm kinh nghiệm là `sum(gradeWeight * pairPenalty)`. Không nhân với scale và không cộng với tải hoặc số thay đổi. `ExperienceScoring` chuyển số năm đã xác nhận theo môn/khối tại mốc tính thành điểm bằng cấu hình các ngưỡng không tăng; UNKNOWN khác 0. Backend phải dùng hồ sơ đúng môn/khối, không lấy số lớp hoặc DRAFT làm số năm kinh nghiệm.
- `previousAssignments` là mốc cùng đợt/học kỳ. Đổi giáo viên đếm một lần; nhu cầu thêm/xóa báo riêng. `PENALIZE_CHANGES` bật bước giữ mềm, `REOPTIMIZE` đặt mục tiêu change bằng 0; cấu hình phải được hiển thị trước chạy.
- Khóa chứa demandId, teacherId, lockedBy, lockedAt (ISO có múi giờ), reason. Khóa trùng, mất giáo viên, sai năng lực hoặc vượt tải trả `LOCK_CONFLICT` trước tìm kiếm. Bộ kiểm tra kết quả và tầng apply kiểm tra lại khóa. Khóa vẫn tính trong A, không tính thêm vào F.

Mỗi bước có status, objective, bestBound, seconds, stopReason, exactOptimalityProven. Chỉ có OPTIMAL toàn cục khi cả năm bước có bằng chứng chính xác. Nếu bước sau UNKNOWN/không chạy, giữ nghiệm đã kiểm tra; không nâng cờ proof. Nếu bước sau INFEASIBLE dù đã có incumbent thỏa các giá trị cố định, trả lỗi mô hình thay vì kết luận thiếu giáo viên. Hủy không trả candidate có thể áp dụng.

Greedy và GA sử dụng cùng vector từ điển, khóa, bộ điều kiện và bộ kiểm tra độc lập; chúng không cung cấp proof. CP-SAT tiếp tục là bộ giải chính. Bộ benchmark giữ nguyên dữ liệu/seed/ngân sách cho cả ba thuật toán, xuất thêm maxLoadDeviation và objectiveVector; summary có bestObjectiveVector. Thời gian là một chỉ số đo riêng, không phải thành phần của vector tối ưu.

## Hợp đồng `tass-solver/2`

Fixture đầy đủ: [report-five-stage.json](../fixtures/report-five-stage.json).

Các trường mới/bắt buộc so với DTO cũ:

| Trường | Ý nghĩa |
|---|---|
| schemaVersion | `tass-solver/2` |
| config.coverageMode / deviationBasis | `COMPONENTS` / `T` |
| config.loadWeight / experienceWeight / changeWeight | Đều là 1; giữ trường tương thích DTO, không dùng để gộp mục tiêu |
| config.stageSeconds | Đúng năm key `Z`, `L1`, `M`, `experience`, `change`; số giây hữu hạn dương; tổng không vượt totalSeconds |
| config.gradeWeights | Có `9`, `12`, `other`; số nguyên dương và 9/12 lớn hơn other |
| demand.startsOn / endsOn | Hiệu lực, cùng khoảng tính của snapshot |
| lockedAssignments | Danh sách khóa có metadata; không dùng previousAssignments thay cho khóa |
| metrics.objectiveVector | Vector năm số nguyên theo thứ tự tối ưu; L1/M có nhân integerScale, ba mục tiêu còn lại không nhân scale |
| metrics.maxLoadDeviation | M ở đơn vị tiết/tuần, dạng thập phân |
| loads.T / deltaT | Tổng tải và độ lệch T-B; deltaT NULL nếu mục tiêu không áp dụng |

Nhu cầu phải dương, <=999,99 và tối đa hai chữ số thập phân kể cả khi integerScale có thể biểu diễn số chính xác hơn. Không làm tròn. Mọi phép nhân/cộng hệ số và cận được kiểm tra trên miền số nguyên an toàn. CSV tải có thêm T và deltaT.

`softObjective` được giữ để đọc các công cụ cũ, hiện là bí danh L1 đã scale; **không dùng trường này để xếp hạng phương án**. Đọc objectiveVector. `softOptimalityProven` là bằng chứng của đủ bốn bước sau Z trong lát cắt đã cố định; OPTIMAL toàn cục còn cần coverageOptimalityProven.

Đầu vào `tass-solver/1` vẫn được đọc cho các fixture/hồ sơ kiểm thử lịch sử. Thuật toán dùng thứ tự năm mục tiêu mới; các hệ số tải/kinh nghiệm/thay đổi của v1 không khôi phục tổng điểm SOFT cũ. V1 không cung cấp đầy đủ điều kiện kiểm tra độ chính xác/hiệu lực/trọng số khối của v2. Chuyển ứng dụng sang v2 trước tích hợp; không dùng kết quả cũ như benchmark của mô hình mới.

## Hiệu lực và phần tích hợp còn lại

Một lượt giải hiện nhận **một khoảng hiệu lực đồng nhất**, với B/F/C/R, công tác và chuyên môn đủ dữ liệu cho khoảng đó. V2 từ chối nhu cầu trộn các giai đoạn. Backend phải chuẩn bị phạm vi theo hiệu lực; không đưa hai dòng 5 tiết ở giai đoạn đầu và 4 tiết ở giai đoạn sau vào một tổng A=9 tiết/tuần.

Nếu cần tối ưu đồng thời toàn học kỳ có nhiều giai đoạn, phải bổ sung mô hình tải theo từng giai đoạn và thống nhất cách tổng hợp L1/M qua các giai đoạn; không xem kết quả tối ưu từng khoảng riêng là tối ưu toàn học kỳ. Module hiện chưa cung cấp phép tối ưu đồng thời đó. Đây là giới hạn tích hợp còn lại so với phạm vi dữ liệu hiệu lực trong report, không phải đã hoàn tất mọi tình huống của report.

Các HardCheck được truyền với hệ số và đơn vị của chính phép kiểm tra. Thiếu dữ liệu tuần cần thiết chặn; thiếu riêng dữ liệu năm được giữ INSUFFICIENT_DATA và cảnh báo. Module không tự lấy 18/17 tuần nhân vào mọi phép kiểm tra, không tự đặt trần 1,5Q/25 tiết và không xác nhận chế độ pháp lý từ fixture.

Ngân sách production là 30–60 giây. Demo có nhãn có thể dùng ngân sách ngắn để kiểm thử/benchmark. Mỗi bước chỉ dùng thời gian còn lại, có hint từ incumbent. Thời gian solve() gồm validate/model/postcheck, nhưng không bao gồm queue/HTTP/DB hoặc khởi động JVM/native library trước khi gọi. Host phải trừ phần này khỏi ngân sách và kiểm tra lại current version/revision/snapshot/source token, quyền và điều kiện cứng trong giao dịch apply. InMemoryPlanStore chỉ là reference adapter.

## Kiểm chứng và tối ưu cấu trúc

Chạy toàn bộ reactor trên Windows:

```powershell
.\algorithm\tass-comparison\Test-All.ps1 -Offline
```

Đã loại các biến/ràng buộc ép cùng giáo viên trong nhóm. CP-SAT tạo x theo tập ứng viên thưa, giữ một model qua năm mục tiêu, dùng lại Prepared khi kiểm tra incumbent thay vì chạy lại tiền kiểm mỗi bước, và thay hint bằng nghiệm mới. Hai thuật toán đối chứng lưu sẵn danh sách ứng viên; comparator dùng trực tiếp năm số, không tạo tổng trọng số. Các thay đổi này giảm công việc dư thừa; chưa có benchmark quy mô trường thật để kết luận mức tăng tốc.

Bộ kiểm thử gồm đối chiếu vét cạn 30 bài toán ngẫu nhiên nhỏ theo vector từ điển, ca L1 bằng nhau/M khác nhau, kinh nghiệm trước giữ mềm, khóa sai/quá tải, T-B khi R>B, ENRICHMENT, từ chối ba chữ số và hiệu lực trộn, fallback/proof và áp dụng CAS. Bộ test dùng chung cho Greedy/GA/CP-SAT kiểm tra cùng hợp đồng/khóa. Kết quả test hiện hành được ghi riêng trong `TEST-RESULTS-20261109.md`; số liệu ngày 25/10 vẫn là hồ sơ lịch sử.
