import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { formatPeriods as fmt } from '@/features/preparation/model';
import type { AssignmentRow, WorkspaceTeacher, WorkloadRow } from './types';

/** Prototype impact panel, calculated exclusively from the selected snapshot. */
export function AssignmentImpact({
    row,
    next,
    teachers,
    loads,
    coverage,
}: {
    row: AssignmentRow;
    next: number | null;
    teachers: WorkspaceTeacher[];
    loads: WorkloadRow[];
    coverage: { assigned: number; total: number };
}) {
    if (row.teacher_id === next)
        return (
            <div className="impact-unchanged">
                <Icon name="check" />
                <span>
                    {row.teacher_id
                        ? 'Đang giữ nguyên giáo viên phụ trách.'
                        : 'Chọn một giáo viên để xem thay đổi tải của cả hai bên.'}
                </span>
            </div>
        );
    const afterCoverage =
        coverage.assigned -
        Number(row.teacher_id !== null) +
        Number(next !== null);
    return (
        <>
            <div className="impact-heading">
                <span>TÁC ĐỘNG TRƯỚC KHI LƯU</span>
                <span>
                    {coverage.assigned} → {afterCoverage}/{coverage.total} đã
                    gán
                </span>
            </div>
            {[...new Set([row.teacher_id, next])]
                .filter((id) => id !== null)
                .map((id) => {
                    const teacher = teachers.find((item) => item.id === id);
                    const load = loads.find((item) => item.teacher_id === id);
                    if (!teacher || !load)
                        return (
                            <p className="impact-warning" key={id}>
                                Chưa đủ dữ liệu tải snapshot của giáo viên #{id}{' '}
                                để xem tác động.
                            </p>
                        );
                    const before = load.t;
                    const after =
                        Math.round(
                            (before -
                                (row.teacher_id === id
                                    ? row.periods_per_week
                                    : 0) +
                                (next === id ? row.periods_per_week : 0)) *
                                100,
                        ) / 100;
                    const over = after > teacher.base_norm;
                    return (
                        <div className="impact-person" key={id}>
                            <div className="flex">
                                <PortraitAvatar
                                    portraitKey={teacher.portrait_key}
                                    colorIndex={teacher.color_index}
                                />
                                <div className="grow">
                                    <strong>{teacher.full_name}</strong>
                                    <small>
                                        {id === next
                                            ? 'Nhận phân công'
                                            : 'Bàn giao phân công'}
                                    </small>
                                </div>
                                <span
                                    className={`impact-delta ${after > before ? 'positive' : ''}`}
                                >
                                    {after > before ? '+' : ''}
                                    {fmt(after - before)} tiết
                                </span>
                            </div>
                            <div className="impact-values">
                                <span>
                                    <small>Trước</small>
                                    {fmt(before)}
                                </span>
                                <Icon name="arrow" />
                                <span>
                                    <small>Sau</small>
                                    <b>{fmt(after)}</b>
                                </span>
                                <span className="grow" />
                                <span className="impact-remaining">
                                    <small>
                                        {over
                                            ? 'Vượt định mức'
                                            : 'Còn tới định mức'}
                                    </small>
                                    {fmt(Math.abs(teacher.base_norm - after))}{' '}
                                    tiết
                                </span>
                            </div>
                            <div className="impact-track">
                                <i
                                    style={{
                                        width: `${Math.max(0, Math.min(100, (after / teacher.weekly_limit) * 100))}%`,
                                        background: over
                                            ? 'var(--chart-over)'
                                            : 'var(--aqua)',
                                    }}
                                />
                            </div>
                            <small className="impact-limit">
                                Định mức {teacher.base_norm} · Còn{' '}
                                {fmt(Math.max(0, teacher.weekly_limit - after))}{' '}
                                tiết tới trần {teacher.weekly_limit}
                            </small>
                            {after > teacher.weekly_limit ? (
                                <div className="impact-warning danger">
                                    <Icon name="warning" />
                                    Vượt trần{' '}
                                    {fmt(after - teacher.weekly_limit)} tiết;
                                    cần chọn giáo viên khác.
                                </div>
                            ) : over ? (
                                <div className="impact-warning">
                                    <Icon name="balance" />
                                    Vượt định mức cơ sở{' '}
                                    {fmt(after - teacher.base_norm)} tiết, trong
                                    trần minh họa.
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            {next === null && (
                <p className="impact-warning">
                    Nhu cầu sẽ trở lại danh sách chờ. Cần ghi rõ lý do bỏ gán.
                </p>
            )}
        </>
    );
}
