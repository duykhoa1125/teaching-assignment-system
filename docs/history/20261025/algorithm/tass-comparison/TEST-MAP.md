> Historical snapshot retained before repository standardization. Use the active module README for current instructions.

# Ma trận kiểm thử dùng chung

Các dòng sau lấy lại scenario/assertions nghiệp vụ từ `tass-cpsat/src/test/java/vn/edu/tass/solver/SolverTest.java` và `AssignmentServiceIT.java`. Chúng nằm trong **một nguồn duy nhất** `shared-tests/vn/edu/tass/solver/CommonSolverTest.java`, được chạy 3 lần bằng adapter CP-SAT, Greedy và GA.

| Test nguồn CP-SAT | Test chung |
|---|---|
| checkedInFixtures (4 tệp) | originalFixturesAndExpectedCoverage (4 lượt) |
| invalidInputs / poc16BadDataStopsBeforeModel (19 dòng) | originalInvalidInputs / originalInputValidationMatrix (19 lượt), gọi trực tiếp source matrix từ test-JAR |
| poc01GreedyTrapSavesFlexibleTeacherForOnlyPossibleDemand | poc01GreedyTrap |
| poc03NoCandidateDoesNotInventTeacher | poc03UnverifiedQualificationIsNotEligibility |
| poc04CapacityReturnsPartialAndLocalReason | poc04CapacityAndHonestLocalReason |
| poc05And11ExactDecimalsOutsideAndConvertedLoad | poc05And11OriginalDecimalFixture |
| poc17AssignedComponentsCannotUseDifferentTeachers | poc17ComponentsNeverUseDifferentTeachers |
| poc18LeaveIsNotUnderloadAndNoCrossSemesterEligibility | poc18LeaveAndOtherSemesterNotEligible |
| levelQualificationIsNotInherited | originalWrongLevelCase |
| annualConstraintUsesItsOwnCoefficientsAndUnits | originalAnnualExpressionUsesOwnUnit |
| fixedLoadViolationCanMakeModelInfeasibleEvenWithUnassignedVariables | originalBaselineInfeasibilityCase |
| noTeachersProducesAllUnassigned | originalNoTeachersCase |
| coveragePeriodsAndComponentsAreDifferentObjectives / completeGroupObjectiveAndPartialGroupsAreReported | originalCoverageModes (cả 3 mode) |
| poc10ChangesCountTeacherSwitchOnceAndAddedRemovedSeparately | poc10OriginalChangeMetricCase |
| scalingDoesNotChangeRelativeLoadExperienceWeights | originalScalingInvariant |
| poc09CancelledRunHasNoApplicableCandidate | poc09Cancellation |
| nativeSolveValidateAndAtomicApplyKeepsDraft | originalApplyAndStaleRevision |
| poc15TwoConcurrentAppliesExactlyOneWins | originalConcurrentApplyCase |
| poc15ChangedSourceTokenOrVersionOrStateRejectsLateResult | originalChangedTokenVersionSnapshotStateCases |
| cancellationAndFailurePreserveSavedAssignments | originalCancelledApplyPreservesSavedData |
| partialDraftCanBeAppliedButCannotPassOpeningDataGuard | originalPartialDraftCanApplyButNotOpen |
| Kiểm chứng bổ sung | sameSeedReproducesDecisionsWhenNoTimeLimitIntervenes |

**43 test executions mỗi thuật toán**, gồm 4 fixture + 19 dòng input lỗi + 20 test methods còn lại. Không có bản fixture sao chép riêng cho Greedy/GA. Common suite gọi lại `Fixtures` và các hàm kiểm tra số gốc từ test-JAR. Các thông số thời gian và status/proof được phân biệt theo loại thuật toán.

CP-SAT vẫn chạy nguyên bộ 54 tests riêng, gồm 30 bài toán vét cạn trong một test, kiểm tra pha 1/2 UNKNOWN/FEASIBLE/OPTIMAL, proof/bound, JAR native và API áp dụng. Không dùng những test chứng minh optimum làm điều kiện bắt buộc cho một heuristic; khi so sánh chất lượng, ghi điểm và độ phủ thực đạt thay vì thay assertion để che một nghiệm kém.

Nguồn test được dùng trực tiếp, nên khi đổi matrix input lỗi hoặc fixture chuẩn trong CP-SAT, lần chạy tiếp của cả ba sẽ thấy thay đổi đó. Nếu thay contract lớn, cần cập nhật suite chung và kiểm thử đồng bộ.
