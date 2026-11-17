import type {
    AssignmentChange,
    AssignmentRow,
    PlanVersion,
    WorkloadRow,
    WorkspaceTeacher,
} from './types.ts';

export const ASSIGNMENT_PAGE_SIZE = 50;
export function canEditPlan(version: PlanVersion | undefined) {
    return Boolean(version?.is_current && version.status === 'DRAFT');
}
export function canWritePlan(version: PlanVersion | undefined) {
    return canEditPlan(version) && Boolean(version?.snapshot_fresh);
}
export function assignmentChange(
    revision: number,
    teacher: string,
    reason: string,
    unassigned: string,
): AssignmentChange {
    if (!reason.trim() || reason.trim().length > 2000)
        throw new Error('Nhập lý do thay đổi từ 1 đến 2000 ký tự.');
    if (!teacher && (!unassigned.trim() || unassigned.trim().length > 2000))
        throw new Error('Nhập lý do chưa phân công từ 1 đến 2000 ký tự.');
    if (
        teacher &&
        (!/^\d+$/.test(teacher) ||
            !Number.isSafeInteger(Number(teacher)) ||
            Number(teacher) <= 0)
    )
        throw new Error('Chọn giáo viên hợp lệ.');
    return {
        expected_revision: revision,
        teacher_id: teacher ? Number(teacher) : null,
        change_reason: reason.trim(),
        ...(!teacher
            ? {
                  unassigned_reason_code: 'MANUAL_UNASSIGNED',
                  unassigned_reason_text: unassigned.trim(),
              }
            : {}),
    };
}
export function candidateState(
    teacher: WorkspaceTeacher,
    row: AssignmentRow,
    load?: WorkloadRow,
) {
    if (!load)
        return {
            projected: null,
            reason: 'Chưa có dữ liệu tải cho phiên bản này',
        };
    const projected =
        Math.round(
            ((load?.t ?? teacher.fixed + teacher.converted + teacher.reduced) -
                (row.teacher_id === teacher.id ? row.periods_per_week : 0) +
                row.periods_per_week) *
                100,
        ) / 100;
    const reason = !teacher.subjects.some(
        (subject) => subject.id === row.subject_id,
    )
        ? 'Chưa có chuyên môn phù hợp'
        : teacher.valid_from > row.valid_from || teacher.valid_to < row.valid_to
          ? 'Hồ sơ không phủ toàn giai đoạn'
          : projected > teacher.weekly_limit
            ? 'Vượt trần'
            : null;
    return { projected, reason };
}
export function filterAssignmentRows(
    rows: readonly AssignmentRow[],
    search: string,
    subject: string,
) {
    const normalize = (s: string) =>
        s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .toLocaleLowerCase('vi');
    const q = normalize(search.trim());
    return rows.filter(
        (row) =>
            (!subject || String(row.subject_id) === subject) &&
            (!q ||
                normalize(
                    `${row.class_name} ${row.subject_name} ${row.teacher_name ?? ''}`,
                ).includes(q)),
    );
}
export function planError(error: unknown) {
    const e = error as { code?: string; message?: string };
    const labels: Record<string, string> = {
        REVISION_CONFLICT:
            'Phương án vừa được thay đổi. Tải lại dữ liệu rồi kiểm tra trước khi thực hiện lại.',
        STALE_INPUT:
            'Nguồn đầu vào đã đổi. Làm mới snapshot trước khi sửa hoặc khóa; vẫn có thể mở khóa.',
        LOCK_CONFLICT:
            'Snapshot mới xung đột với phân công đã khóa. Mở khóa dòng liên quan rồi làm mới lại.',
        CURRENT_DRAFT_REQUIRED:
            'Chỉ được thay đổi bản nháp hiện hành. Phiên bản này chỉ đọc.',
        PLAN_ALREADY_EXISTS:
            'Đợt đã có phương án. Tải lại để mở phương án hiện hành.',
        ASSIGNMENT_LOCKED: 'Phân công đã khóa. Mở khóa trước khi điều chỉnh.',
        ASSIGNMENT_NOT_ASSIGNED:
            'Có dòng chưa gán giáo viên. Cả nhóm chưa được khóa.',
        ASSIGNMENT_INELIGIBLE:
            'Giáo viên chưa đủ điều kiện cho thành phần và giai đoạn này.',
        ASSIGNMENT_HARD_VIOLATION:
            'Thay đổi vi phạm điều kiện tải hoặc ràng buộc của phương án.',
        CONCURRENT_MODIFICATION:
            'Dữ liệu đang thay đổi. Tải lại trước khi thực hiện lại.',
    };
    return (
        labels[e?.code ?? ''] ??
        e?.message ??
        'Không thể xử lý phương án. Vui lòng thử lại.'
    );
}
