export const scenarios = {
    normal: { label: 'Bình thường' },
    empty: { label: 'Danh sách rỗng' },
    slow: { label: 'Tải chậm (1,2 giây)' },
    badRequest: {
        label: '400 · Dữ liệu không hợp lệ',
        status: 400,
        code: 'INVALID_REQUEST',
        message: 'Kịch bản mẫu: dữ liệu không hợp lệ.',
    },
    unauthorized: {
        label: '401 · Hết phiên',
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Kịch bản mẫu: cần đăng nhập lại.',
    },
    forbidden: {
        label: '403 · Thiếu quyền',
        status: 403,
        code: 'PLAN_ACCESS_DENIED',
        message: 'Kịch bản mẫu: không có quyền trong phạm vi này.',
    },
    conflict: {
        label: '409 · Xung đột',
        status: 409,
        code: 'REVISION_CONFLICT',
        message: 'Kịch bản mẫu: dữ liệu đã được thay đổi.',
    },
    invalid: {
        label: '422 · Ràng buộc dữ liệu',
        status: 422,
        code: 'DATA_CONSTRAINT',
        message: 'Kịch bản mẫu: dữ liệu không đúng ngữ cảnh.',
    },
    unavailable: {
        label: '503 · Dịch vụ bận',
        status: 503,
        code: 'SOLVER_QUEUE_FULL',
        message: 'Kịch bản mẫu: hàng chờ đã đầy.',
    },
    reference: { label: 'Xóa bản ghi đang được tham chiếu' },
    readinessReady: { label: 'Readiness · Đủ dữ liệu sẵn sàng' },
    readinessMissing: { label: 'Readiness · Thiếu dữ liệu nhu cầu' },
    readinessBlocked: { label: 'Readiness · Có issue chặn' },
    planEmpty: { label: 'Plan · Chưa có phương án' },
    planStale: { label: 'Plan · Snapshot đã cũ' },
    planLockConflict: { label: 'Plan · Nguồn xung đột khóa' },
    planRevisionConflict: { label: 'Plan · Phiên khác vừa thay đổi' },
    planReadOnly: { label: 'Plan · Phiên bản chỉ đọc' },
    solverApplied: { label: 'Solver · Sinh đề xuất & áp dụng thành công' },
    solverStale: { label: 'Solver · Bị từ chối áp dụng (STALE)' },
    solverInfeasible: { label: 'Solver · Vô nghiệm (INFEASIBLE)' },
    solverFailed: { label: 'Solver · Lỗi xử lý (FAILED)' },
    solverQueueFull: { label: 'Solver · Hàng đợi đầy (503)' },
    solverActiveRun: { label: 'Solver · Có lượt đang chạy (409 + Location)' },
    validationPass: { label: 'Validation · Đạt kiểm tra tuần (cảnh báo năm)' },
    validationViolation: { label: 'Validation · Phát hiện vi phạm' },
} as const;
export type MockScenario = keyof typeof scenarios;
export function isMockScenario(value: string): value is MockScenario {
    return Object.hasOwn(scenarios, value);
}
