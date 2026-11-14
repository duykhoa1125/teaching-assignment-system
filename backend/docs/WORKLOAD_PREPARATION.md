# Tải và tiền kiểm dùng chung — SOL-04

Chuẩn triển khai: **JDK 17 / Spring Boot 3.5.14**. Nhóm đã chọn trần minh họa theo **T = A + F + C + R**. Mục tiêu cân bằng vẫn là T − B; cấu hình ghi rõ `hard_limits.basis="T"`, không suy từ tên `max_total_weekly`.

## Thành phần đã thêm

- `WorkloadSourceRepository`: đọc payload bất biến của input_snapshot theo ID, không ghép nguồn sống giữa quá trình tính.
- `DbWorkloadPreparer`: ánh xạ tường minh snake_case DB sang tải/kinh nghiệm/HardCheck/Precheck của solver. Chưa tạo toàn bộ `Contract.Snapshot` hoặc API chạy solver.
- `WorkloadMath`: phép tính BigDecimal dùng lại cho tải phân công/sửa tay/hậu kiểm. Các API tương ứng sẽ nối trong SOL-05/06/08.

Snapshot phải có đúng identity round/config/rule/token, nhu cầu một khoảng đồng nhất và một kỳ tính tải phủ toàn khoảng. Nhu cầu giữ precision hai chữ số; không làm tròn. Mọi phép tính dùng BigDecimal, kể cả khi đọc số JSON.

## Tính B/F/C/R và điều kiện ứng viên

B được chọn từ đúng một hồ sơ định mức VERIFIED, đúng giáo viên/học kỳ/vị trí, phủ toàn khoảng và có profile_ref. Giá trị được đối chiếu với rule_definition đã chọn, theo cấp của hồ sơ; không hardcode 17/19 vào Java hoặc suy mức giảm từ ghi chú.

F lấy đúng một nguồn `OUTSIDE_SCOPE_WEEKLY` VERIFIED của giáo viên/kỳ tính, có số tiết và evidence_ref. Không dùng nguồn tham chiếu tổng phương án khi chưa chứng minh đó là tải ngoài phạm vi. Các outside_demand_ids không được trùng D; phân công khóa vẫn ở A, không cộng lại vào F. Nguồn độc lập có thể có F=0 nếu đã xác nhận rõ ràng.

R là tổng các khoản nhiệm vụ/giảm tiết có xác nhận, bằng chứng, đúng rule/value/unit và phủ toàn khoảng. GVCN phải tham chiếu lớp đúng năm học. C là tổng quantity × approved_factor chính xác; đối chiếu converted_periods đã lưu, hệ số rule và max_factor nếu có. Không lấy hệ số trần làm hệ số được chọn; không tự đổi giờ/năm thành tiết/tuần.

Danh sách nguồn phải khớp inventory đã xác nhận, không bỏ qua cả dòng PENDING hoặc dòng mới chưa được liệt kê. Source ID và item_key không được lặp trong/cross C và R; rule/evidence lặp gây lỗi vì chưa chứng minh được đó là hai khoản độc lập. Khi chứng cứ cấp tài liệu dùng chung cho nhiều khoản, cần tách căn cứ nguồn đủ rõ thay vì ép cộng các khoản mơ hồ.

Công tác phải là một bản ghi phủ toàn khoảng; nghỉ/công tác một phần bị từ chối. `workload_policy.eligible_position_codes` chọn vị trí được xét trong MVP. TEACHING đúng vị trí có targetApplicable=true; ON_LEAVE toàn khoảng không có mục tiêu/ứng viên. INACTIVE và vị trí ngoài phạm vi không được gán. Không tự tạo B=0 cho người nghỉ: định mức và nguồn tải vẫn cần đầy đủ để tính/đối soát.

Chuyên môn dùng các hồ sơ VERIFIED đúng subject/education_level, đủ bằng chứng và phủ toàn khoảng. Có thể hợp các đoạn liền nhau không có khe hở, giữ danh sách nguồn trong qualification chuẩn hóa. Một ngày có chuyên môn không đủ chứng minh cả khoảng.

## Xác nhận danh sách nguồn, kể cả danh sách rỗng

Schema vẫn **48 bảng**. Bảng teacher_period_workload có thêm:

- `input_confirmation_json`: hợp đồng inventory phiên bản 1.
- `input_confirmed_by`: FK user_account, do quy trình xác nhận máy chủ quản lý.
- `input_confirmed_at`: thời điểm xác nhận.

Cả ba trường cùng null nghĩa là chưa xác nhận; không được suy R/C bằng 0. Khi xác nhận, phải có metadata và đủ hai trường actor/time. Ví dụ cho một giáo viên/kỳ tính:

```json
{
  "contract_version": 1,
  "round_id": 123,
  "in_scope_demand_ids": [1001, 1002],
  "outside_demand_ids": [],
  "reduction_items": [
    {"source_table": "teacher_duty", "source_id": 21, "item_key": "teacher7-homeroom-10A1"}
  ],
  "conversion_items": [],
  "evidence_ref": "confirmed-load-inventory:teacher7:round123"
}
```

`in_scope_demand_ids` phải đúng toàn bộ D của snapshot. Danh sách reductions/conversions phải khớp chính xác các dòng nguồn áp dụng trong khoảng, có item_key riêng. Hai danh sách rỗng chỉ cho R=C=0 khi việc kiểm đủ danh sách đã được xác nhận. Inventory này xác nhận tập nguồn, không thay việc xác minh/phê duyệt giá trị từng dòng. Người phụ trách CRUD cần giữ/reset trạng thái xác nhận nguồn đúng quy trình khi sửa dữ liệu.

Hiện teacher_period_workload chỉ có một dòng/giáo viên/kỳ tính; confirmation chọn một round tại một thời điểm. Nếu đổi phạm vi round phải xác nhận lại F/inventory phù hợp, không dùng chung một F cho mọi phạm vi khi chưa đối chiếu. Không có endpoint CRUD tùy ý cho metadata này trong SOL-04; quy trình xác nhận có auth sẽ cần phối hợp với người phụ trách dữ liệu. Không nhận metadata này từ POST solver-run hoặc snapshot client.

## Migration và seed

DB cũ chạy [04_workload_input_confirmation.sql](../sql/04_workload_input_confirmation.sql) sau migration trạng thái. Script thêm cột/constraint/index, **không backfill** xác nhận hoặc số 0 cho dữ liệu cũ. Nó chỉ bổ sung basis T và lựa chọn evaluator/vị trí cho đúng cấu hình minh họa `DEMO_FIVE_STAGE` phiên bản 1; không đổi các cấu hình khác.

Schema/seed mới đã có cột và xác nhận inventory minh họa tường minh cho round demo. Seed vẫn nhiều giai đoạn nên chưa tự trở thành fixture chạy solver hợp lệ. Docker chỉ nạp schema/seed khi volume mới; không tự chạy migration này trên volume cũ. Trong phiên triển khai này chỉ áp migration vào PostgreSQL tạm để kiểm thử, chưa chạy trên DB hiện có của người dùng.

Các snapshot cũ vẫn bất biến và có thể thiếu metadata/policy mới. Cần xác nhận nguồn và refresh current DRAFT; không vá snapshot lịch sử.

## Kinh nghiệm và phép kiểm tra

ExperienceScoring dùng đúng teacher–subject–grade, hồ sơ mới nhất không sau experience.as_of_date. NO_EXPERIENCE=0 đi qua band tương ứng; UNKNOWN giữ null, policy BLOCK sẽ báo lỗi, PENALTY dùng đúng mức đã cấu hình. Không đếm lớp, dùng DRAFT hoặc cộng teaching_history thành số năm.

Với cơ sở T, weekly HardCheck có:

```text
fixed = F + R
converted = C
coefficient[demand_id] = số tiết nhu cầu, cho mọi nhu cầu kể cả hệ số 0 khi áp dụng
fixed + converted + Σ coefficient × assignment ≤ ngưỡng của cấu hình
```

Giá trị fixed+C đã vượt trần sẽ chặn trước model. R không được nhét vào F của Workload; chỉ được tính trong fixed của phép kiểm tra T. Cơ sở W được nhận diện nếu một cấu hình khác chọn rõ ràng, nhưng cấu hình minh họa hiện tại đã chốt T. Mỗi check có đơn vị, khoảng tính và source; 25 không phải một trần chung hardcode.

Annual HardCheck là INSUFFICIENT_DATA với danh sách thiếu tải năm/đơn vị quy đổi/ngưỡng năm; không giả lập số 0 hoặc PASS. Scale ít nhất 100, chọn theo giá trị chính xác, tối đa 10^6, kiểm tra miền số nguyên an toàn. Dữ liệu quy đổi không khớp giá trị lưu sẽ bị từ chối, không làm tròn để ép khớp schema hiện tại.

`WorkloadMath.evaluate` trả B/R/Q/A/F/C/W/T, delta và thiếu/vượt. Q=max(0,B−R) là đại lượng phụ; độ lệch chính vẫn T−B, kể cả khi R>B. Người targetApplicable=false có delta/thiếu/vượt null.

## Giới hạn bộ quy tắc

Evaluator hiện hỗ trợ rõ `workload_policy.rule_evaluator="ILLUSTRATIVE_MVP_V1"`, config demo_only và rule_type DEMO với nguồn document/clause/ref, điều kiện demo, giá trị và hiệu lực. Nó kiểm tra dữ liệu/tính toán của bộ minh họa đã có, **không chứng nhận quy tắc pháp lý sản xuất**.

BR-04/16/17/21 có PASS/NOT_APPLICABLE dựa trên các kiểm tra đã thực hiện. BR-18/19 được ghi NOT_APPLICABLE trong phạm vi minh họa có nhãn, đúng phạm vi mở rộng trong báo cáo; không ghi PASS pháp lý. Nếu có quỹ/phân bổ quỹ, BR-20 là INSUFFICIENT_DATA vì chưa có bộ đánh giá quỹ được phê duyệt. Rule handler không hỗ trợ hoặc thiếu nguồn bị từ chối. `Prepared.rulesReady()` và InputValidator ở bước nối tiếp đều phải chặn các precheck chưa đủ dữ liệu.

## Kiểm chứng

Ngày 11/11/2026: Java và Maven đều nhận **Temurin 17.0.21** tại `.runtime/jdk-17`. **51/51 test đạt trực tiếp trên JDK 17**, gồm 15 ca tải mới và 36 ca hồi quy trước đó, qua JUnit Jupiter Engine với dependency cache. PostgreSQL 18 tạm kiểm chứng transaction/trigger và nguồn bất biến; cluster đã dừng sau test.

Đã kiểm tra schema/seed mới tạo đủ 48 bảng, 10 inventory demo tường minh, basis T; migration chạy được trên DB cũ và chạy lại trên schema mới; constraint từ chối metadata `{}` có actor/time. Không thêm xác nhận giả cho các dòng cũ.

Log/runner: `D:/HCMUT/DACN/tmp/workload-api-20261111/compile.log`, `tests.log`, `migration.log`, `fresh-schema-check.log`, `run-java17-tests.py`. Maven verify đã thử với JDK 17 nhưng vẫn bị chặn tải POM Surefire 3.5.2 từ Maven Central; chưa coi runner cache là Maven verify toàn bộ thành công.

SOL-05 tiếp tục dựng đủ DTO tass-solver/2, identity/hash canonical và InputValidator. SOL-06/08 mới nối chuẩn bị/áp dụng nghiệm, đọc tải và validation; chưa có lượt solver từ DB trong SOL-04.

**Cập nhật SOL-05 (12/11/2026):** đã nối bộ chuẩn bị này vào [snapshot solver và archive](SOLVER_SNAPSHOT.md), kiểm chứng DB → DTO → native solver → hậu kiểm trong test. Tổng hồi quy 65/65 đạt trên JDK 17; chưa có API chạy/apply nghiệm.
