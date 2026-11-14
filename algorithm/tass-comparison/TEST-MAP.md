# Ma trận kiểm thử dùng chung

Nguồn duy nhất: [CommonSolverTest.java](shared-tests/vn/edu/tass/solver/CommonSolverTest.java), được build trong Greedy/GA/benchmark bằng core/test-helpers CP-SAT. Fixture đọc từ ../tass-cpsat/fixtures, không sao chép thành dữ liệu riêng cho từng thuật toán.

| Phạm vi | Kiểm tra tiêu biểu |
| --- | --- |
| Fixture và input lỗi | originalFixturesAndExpectedCoverage; originalInputValidationMatrix dùng SolverTest.invalidInputs |
| Ứng viên/công tác/chuyên môn | poc01GreedyTrap; poc03UnverifiedQualificationIsNotEligibility; poc18LeaveAndOtherSemesterNotEligible; originalWrongLevelCase |
| Thành phần độc lập | poc17ComponentsCanUseDifferentTeachers; không ép cùng người cho chính khóa/chuyên đề/tăng cường |
| Tải/precision/đơn vị | poc04CapacityAndHonestLocalReason; poc05And11OriginalDecimalFixture; originalAnnualExpressionUsesOwnUnit; originalScalingInvariant |
| Nghiệm thiếu/coverage | originalNoTeachersCase; originalCoverageModes; originalBaselineInfeasibilityCase |
| Giữ mềm và CAS | poc10OriginalChangeMetricCase; originalApplyAndStaleRevision; originalConcurrentApplyCase; originalChangedTokenVersionSnapshotStateCases |
| Hủy/fallback | poc09Cancellation; originalCancelledApplyPreservesSavedData |
| Năm mục tiêu/khóa | reportV2FixtureUsesFiveElementScore; locksAreRespectedByEveryAlgorithm; ineligibleLockReturnsExplicitConflictForEveryAlgorithm |

Hồ sơ09/11 ghi **46 lượt CommonSolverTest mỗi thuật toán**, ba lần chạy; CP-SAT riêng63 unit+8 integration. Tổng209 là lượt thực thi, không phải209 yêu cầu độc lập. [Hồ sơ gốc](../tass-cpsat/docs/TEST-RESULTS-20261109.md) giữ môi trường/phạm vi của lần chạy đó; không gọi đây là lượt test mới trong lúc dọn repo.

Các ca oracle/proof và trạng thái inject nằm ở CP-SAT; không yêu cầu Greedy/GA phải chứng minh tối ưu. Backend PostgreSQL/HTTP, Principal và transaction apply được kiểm chứng ở bộ riêng, xem [backend](../../backend/docs/SOLVER_API_VERIFICATION.md).
