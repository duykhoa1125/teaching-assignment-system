# Benchmark mô hình năm bước — 09/11/2026

Hồ sơ đã lưu: **5 fixture ×3 lần ×3 thuật toán =45 lượt đo**, cùng snapshot/seed/ngân sách trong từng bộ ba;45/45 qua validator. Không phải kết quả benchmark mới trong lượt chuẩn hóa repo14/11.

- [manifest.json](manifest.json): môi trường gốc, policy, snapshot hashes, ngân sách và warm-up.
- [runs.csv](runs.csv): từng lượt đo và vector mục tiêu.
- [summary.csv](summary.csv): thống kê tổng hợp.
- Các thư mục kèm theo giữ snapshot/result JSON của từng lượt để đối chiếu.

Manifest ghi JDK21 vì đó là môi trường lịch sử đã chạy; không sửa thành17 để khớp cấu hình mới. Chuẩn build/run hiện tại là JDK17. File generated cho các lần chạy mới tiếp tục nằm results/ và bị ignore; hồ sơ này được xuất bản có chủ đích trong reports/.

Phân biệt175 test backend với209 lượt test module thuật toán và45 lượt benchmark. Xem [hồ sơ thuật toán](../../../tass-cpsat/docs/TEST-RESULTS-20261109.md) và [backend](../../../../backend/docs/SOLVER_API_VERIFICATION.md).
