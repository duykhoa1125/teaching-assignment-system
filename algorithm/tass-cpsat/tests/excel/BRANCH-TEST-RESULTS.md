# Kết quả chạy nhánh `feature/algorithm-module` — 30/10/2026

## Mã và môi trường

- Repo: `teaching-assignment-system`, nhánh `feature/algorithm-module`, commit gốc `eb6fc5a` trước khi thêm test Excel.
- Module chạy: `algorithm/tass-cpsat` (Java 21.0.9, Maven 3.9.9, OR-Tools 9.14.6206).
- Maven được đặt trong thư mục tạm; `mvn verify` chạy trên module với repository phụ thuộc riêng trong thư mục tạm. Không thay Java/Maven hệ thống.
- Ba workbook nguồn được đối chiếu bằng `verify-excel.ps1`; dữ liệu cho solver được ẩn danh và đóng gói theo schema `tass-solver/1`.

## Kết quả

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Đối chiếu ô nguồn E26/E25/E26D | PASS 3 workbook | `verify-excel.ps1`; xác nhận `U65=0` do `SUM(U66:U70)` bỏ dòng 71–72 |
| Oracle tham chiếu nhỏ | PASS 14/14 | `node tests/excel/verify-cases.mjs`; **không phải** test code CP-SAT |
| Maven Surefire | PASS 49/49 | `ExcelDerivedSolverTest`: 3; `ExhaustiveOracleTest`: 1; `SolverTest`: 45 |
| Maven Failsafe | PASS 8/8 | `AssignmentServiceIT`: 6; `CliIT`: 2 |
| Maven `verify` | **BUILD SUCCESS**, 57/57 test, 0 lỗi | Test unit + integration trên module CP-SAT |
| CLI HK I | `OPTIMAL`, gán 10/10, thiếu 0 | `A(T1)=13.2`, `W(T1)=17.2`; `W(T7)=20`; độ lệch W tổng `4.8` |
| CLI HK II | `OPTIMAL`, gán 2/2, thiếu 0 | Dùng hai dòng chi tiết 71–72; `A(T8)=6`, `W(T8)=10`, bỏ qua `U65=0` sai |

Hai lần chạy CLI đều có `coverageOptimalityProven=true`, `softOptimalityProven=true`, hard check tuần `PASS` trong **snapshot demo**. Snapshot HK I có hash `6099fb4951427ed8e406ffda430a2d6063ca494790a3efad9cda1a921de6e1a1`; HK II có hash `d8b2ce6c9dad0f75d2794fb2bb3bfd981b97d70bcb9022b4818639f8e063d483`.

## Phạm vi kết luận

**Đã kiểm chứng:** code CP-SAT hiện tại đọc snapshot đúng schema, tách nhu cầu theo lớp, tính số lẻ bằng BigDecimal/scale, gán đúng ứng viên trong fixture, kiểm tra trần tải demo và xuất kết quả CLI. Test giảm scale từ 100 xuống 10 từ chối dữ liệu `1.25` thay vì cắt cụt.

**Chưa thể duyệt phương án thật:** Excel không đủ năng lực đã xác nhận, trạng thái công tác theo kỳ, quy tắc `B/R/F/C`, trần hard check, dữ liệu năm và bảng alias. Các giá trị đó trong fixture được ghi là demo. CLI báo `dataReadyForOpening=true` vì đã phủ đủ nhu cầu demo, nhưng vẫn có cảnh báo `ANNUAL: INSUFFICIENT_DATA`; cờ này không chứng minh đã đủ điều kiện nghiệp vụ để mở hoặc phát hành. Module chưa có adapter database/Spring Boot thật.

**Ngoài phạm vi module:** khóa/cấm gán (`SOL-02/05/06`, `INT-03`). [REVIEW.md](../../docs/REVIEW.md) của nhánh ghi rõ các chức năng này chưa được hiện thực vì SRS/storage chưa chốt. Chúng vẫn nằm trong bộ test tham chiếu để dùng khi phạm vi được mở rộng.

Lượt chạy CLI trong sandbox hạn chế không nạp được native OR-Tools (`UnsatisfiedLinkError`). Chạy lại với quyền thực thi đầy đủ của môi trường đã thành công ở cả hai fixture; Maven test native cũng thành công. Không có bằng chứng lỗi mô hình từ lần lỗi nạp thư viện đó.
