import {
    DEMAND_TYPE_LABELS,
    formatPeriods,
} from '@/features/preparation/model';
import { ActorIdentity, PersonIdentity } from '@/features/session/role-ui';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { formatGovernanceDateTime } from './model';
import type { PlanSnapshot } from './types';

/** Renders frozen plan snapshot document markup matching prototype `mvpDocumentMarkup`. */
export function SnapshotDocumentMarkup({
    snapshot,
    mode = 'teachers',
}: {
    snapshot: PlanSnapshot;
    mode?: 'teachers' | 'classes';
}) {
    const teacherById = new Map(
        snapshot.teachers.map((teacher) => [teacher.id, teacher]),
    );
    const sortedRows = snapshot.rows
        .slice()
        .sort((a, b) =>
            mode === 'teachers'
                ? (a.teacher_id ?? 0) - (b.teacher_id ?? 0)
                : a.class_name.localeCompare(b.class_name, 'vi'),
        );

    return (
        <div>
            <div className="mvp-document-head">
                <div className="eyebrow">
                    TASS / {snapshot.round_code} / V{snapshot.version_no}-r
                    {snapshot.revision_no}
                </div>
                <h2>Phương án đề xuất phân công giảng dạy</h2>
                <p>
                    {snapshot.academic_year} · {snapshot.context_title} ·{' '}
                    {snapshot.interval.from} → {snapshot.interval.to}
                </p>
                <div className="document-author">
                    <ActorIdentity actor={snapshot.by} />
                    <span>· {formatGovernanceDateTime(snapshot.at)}</span>
                </div>
            </div>

            {snapshot.annual_warning ? (
                <div className="mvp-note warning">
                    <Icon name="warning" />
                    <span>
                        CHƯA ĐỦ DỮ LIỆU KIỂM TRA TẢI NĂM ·{' '}
                        {snapshot.annual_warning}
                    </span>
                </div>
            ) : null}

            <h3 style={{ marginBottom: 15 }}>Tải giảng dạy · tiết / tuần</h3>
            <div className="table-scroll">
                <table className="data-table mvp-table">
                    <thead>
                        <tr>
                            <th>GIÁO VIÊN</th>
                            <th>F</th>
                            <th>A</th>
                            <th>C</th>
                            <th>R</th>
                            <th>W</th>
                            <th>Q</th>
                            <th>T</th>
                            <th>B</th>
                            <th>T−B</th>
                        </tr>
                    </thead>
                    <tbody>
                        {snapshot.teachers.map((teacher) => (
                            <tr key={teacher.id}>
                                <td>
                                    <PersonIdentity
                                        name={teacher.full_name}
                                        portraitKey={teacher.portrait_key}
                                        colorIndex={teacher.color_index}
                                        detail={teacher.teacher_code}
                                        compact
                                    />
                                </td>
                                <td>{formatPeriods(teacher.f)}</td>
                                <td>{formatPeriods(teacher.a)}</td>
                                <td>{formatPeriods(teacher.c)}</td>
                                <td>{formatPeriods(teacher.r)}</td>
                                <td>{formatPeriods(teacher.w)}</td>
                                <td>{formatPeriods(teacher.q)}</td>
                                <td>{formatPeriods(teacher.t)}</td>
                                <td>{formatPeriods(teacher.b)}</td>
                                <td>{formatPeriods(teacher.delta)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3 style={{ margin: '22px 0 15px' }}>
                Phân công theo {mode === 'teachers' ? 'giáo viên' : 'lớp'}
            </h3>
            <div className="table-scroll">
                <table className="data-table mvp-table">
                    <thead>
                        {mode === 'teachers' ? (
                            <tr>
                                <th>GIÁO VIÊN</th>
                                <th>LỚP / MÔN</th>
                                <th>LOẠI</th>
                                <th>TIẾT</th>
                                <th>GIAI ĐOẠN</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>LỚP</th>
                                <th>MÔN / LOẠI</th>
                                <th>TIẾT</th>
                                <th>GIÁO VIÊN</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {sortedRows.map((row) => {
                            const assigned =
                                row.teacher_id !== null
                                    ? teacherById.get(row.teacher_id)
                                    : undefined;
                            const teacherCell =
                                row.teacher_id !== null ? (
                                    <PersonIdentity
                                        name={
                                            row.teacher_name ??
                                            assigned?.full_name ??
                                            `Hồ sơ #${row.teacher_id}`
                                        }
                                        portraitKey={
                                            assigned?.portrait_key ?? 1
                                        }
                                        colorIndex={assigned?.color_index ?? 0}
                                        compact
                                    />
                                ) : (
                                    <span className="muted">Chưa gán</span>
                                );

                            return mode === 'teachers' ? (
                                <tr key={row.id}>
                                    <td>{teacherCell}</td>
                                    <td>
                                        {row.class_name}
                                        <small>{row.subject_name}</small>
                                    </td>
                                    <td>
                                        {DEMAND_TYPE_LABELS[row.demand_type] ??
                                            row.demand_type}
                                    </td>
                                    <td>
                                        {formatPeriods(row.periods_per_week)}
                                    </td>
                                    <td>
                                        {row.valid_from} → {row.valid_to}
                                    </td>
                                </tr>
                            ) : (
                                <tr key={row.id}>
                                    <td>{row.class_name}</td>
                                    <td>
                                        <SubjectIdentity
                                            name={row.subject_name}
                                            detail={
                                                DEMAND_TYPE_LABELS[
                                                    row.demand_type
                                                ] ?? row.demand_type
                                            }
                                        />
                                    </td>
                                    <td>
                                        {formatPeriods(row.periods_per_week)}
                                    </td>
                                    <td>{teacherCell}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mvp-code" style={{ marginTop: 18 }}>
                Snapshot {snapshot.id} · input {snapshot.token} ·{' '}
                {snapshot.rule_version} · Dữ liệu minh họa, chưa phải quyết định
                phân công chính thức.
            </p>
        </div>
    );
}
