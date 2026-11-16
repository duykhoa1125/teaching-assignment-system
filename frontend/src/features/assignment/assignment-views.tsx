import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import {
    DEMAND_TYPE_LABELS,
    formatPeriods,
} from '@/features/preparation/model';
import type { AssignmentRow, WorkloadRow, WorkspaceTeacher } from './types';

type OpenRow = (
    row: AssignmentRow,
    anchor: HTMLElement,
    detail?: boolean,
) => void;
export function AssignmentPerson({
    row,
    teachers,
}: {
    row: AssignmentRow;
    teachers: WorkspaceTeacher[];
}) {
    const teacher = teachers.find((item) => item.id === row.teacher_id);
    return (
        <>
            {teacher ? (
                <PortraitAvatar
                    portraitKey={teacher.portrait_key}
                    colorIndex={teacher.color_index}
                />
            ) : row.teacher_id ? (
                <span className="avatar">
                    {row.teacher_name?.split(' ').slice(-1)[0]?.slice(0, 1) ??
                        '?'}
                </span>
            ) : (
                <Icon name="plus" />
            )}
            <span>{row.teacher_name ?? 'Chọn giáo viên'}</span>
            {row.teacher_id && <Icon name="down" />}
        </>
    );
}

function matrixKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (
        ![
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
        ].includes(event.key)
    )
        return;
    const current = event.currentTarget,
        r = Number(current.dataset.matrixRow),
        c = Number(current.dataset.matrixCol);
    const buttons = Array.from(
        current
            .closest('.matrix-viewport')!
            .querySelectorAll<HTMLButtonElement>('.matrix-assignment'),
    );
    let next: HTMLButtonElement | undefined;
    if (event.key === 'Home' || event.key === 'End') {
        const row = buttons.filter(
            (button) => Number(button.dataset.matrixRow) === r,
        );
        next = event.key === 'Home' ? row[0] : row.at(-1);
    } else {
        const horizontal =
            event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const candidates = buttons.filter((button) =>
            horizontal
                ? Number(button.dataset.matrixRow) === r &&
                  (forward
                      ? Number(button.dataset.matrixCol) > c
                      : Number(button.dataset.matrixCol) < c)
                : Number(button.dataset.matrixCol) === c &&
                  (forward
                      ? Number(button.dataset.matrixRow) > r
                      : Number(button.dataset.matrixRow) < r),
        );
        next = forward ? candidates[0] : candidates.at(-1);
    }
    if (next) {
        event.preventDefault();
        next.focus();
    }
}

export function AssignmentMatrix({
    rows,
    teachers,
    loads,
    focus,
    hover,
    setFocus,
    setHover,
    open,
}: {
    rows: AssignmentRow[];
    teachers: WorkspaceTeacher[];
    loads: WorkloadRow[];
    focus: string;
    hover: number | null;
    setFocus: (id: string) => void;
    setHover: (id: number | null) => void;
    open: OpenRow;
}) {
    const classes = [
        ...new Map(rows.map((row) => [row.class_id, row.class_name])).entries(),
    ].sort((a, b) => a[1].localeCompare(b[1], 'vi'));
    const subjects = [
        ...new Map(
            rows.map((row) => [row.subject_id, row.subject_name]),
        ).entries(),
    ];
    const person = teachers.find((teacher) => String(teacher.id) === focus),
        load = loads.find((item) => item.teacher_id === person?.id);
    const highlighted = focus ? Number(focus) : hover;
    return (
        <>
            <div className="matrix-controls">
                <div className="matrix-focus-label">
                    <label htmlFor="matrix-teacher-focus">
                        Theo dõi giáo viên
                    </label>
                    <select
                        id="matrix-teacher-focus"
                        value={focus}
                        onChange={(event) => setFocus(event.target.value)}
                    >
                        <option value="">Toàn bộ đội ngũ</option>
                        {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                                {teacher.full_name} ·{' '}
                                {loads.find(
                                    (item) => item.teacher_id === teacher.id,
                                )?.t ?? '—'}{' '}
                                tiết
                            </option>
                        ))}
                    </select>
                </div>
                <div className="matrix-focus-summary" aria-live="polite">
                    {person ? (
                        <div className="matrix-focus-person">
                            <PortraitAvatar
                                portraitKey={person.portrait_key}
                                colorIndex={person.color_index}
                            />
                            <div className="grow">
                                <strong>{person.full_name}</strong>
                                <p>
                                    {
                                        rows.filter(
                                            (row) =>
                                                row.teacher_id === person.id,
                                        ).length
                                    }{' '}
                                    thành phần đang lọc · tổng tải{' '}
                                    {load?.t ?? '—'}/{person.base_norm} tiết
                                </p>
                            </div>
                            <Link to="/teachers" className="btn small">
                                Hồ sơ
                                <Icon name="arrow" />
                            </Link>
                            <button
                                type="button"
                                className="icon-btn"
                                aria-label="Bỏ theo dõi giáo viên"
                                onClick={() => setFocus('')}
                            >
                                <Icon name="close" />
                            </button>
                        </div>
                    ) : (
                        <div className="matrix-instruction">
                            <Icon name="panel" />
                            <span>
                                Chọn giáo viên để theo dõi các lớp đang phụ
                                trách.
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <div
                className="matrix-viewport"
                tabIndex={0}
                role="region"
                aria-label="Ma trận phân công, có thể cuộn theo hai chiều"
            >
                <table
                    className="matrix-table"
                    data-compact-columns={subjects.length < 3 || undefined}
                    style={
                        subjects.length < 3
                            ? { minWidth: 112 + subjects.length * 137 }
                            : undefined
                    }
                >
                    <caption className="sr-only">
                        Phân công theo lớp và môn học. Dùng phím mũi tên để di
                        chuyển giữa các ô, Enter để mở gán nhanh.
                    </caption>
                    {subjects.length < 3 && (
                        <colgroup>
                            <col className="assignment-class-column" />
                            {subjects.map(([id]) => (
                                <col key={id} />
                            ))}
                        </colgroup>
                    )}
                    <thead>
                        <tr>
                            <th scope="col">LỚP HỌC</th>
                            {subjects.map(([id, name]) => (
                                <th scope="col" key={id}>
                                    {name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map(([classId, name], r) => (
                            <tr key={classId}>
                                <th scope="row">
                                    <strong className="class-tag">
                                        {name}
                                    </strong>
                                    <p>
                                        {formatPeriods(
                                            rows
                                                .filter(
                                                    (row) =>
                                                        row.class_id ===
                                                        classId,
                                                )
                                                .reduce(
                                                    (sum, row) =>
                                                        sum +
                                                        row.periods_per_week,
                                                    0,
                                                ),
                                        )}{' '}
                                        tiết / tuần
                                    </p>
                                </th>
                                {subjects.map(([subjectId], c) => (
                                    <td key={subjectId}>
                                        <div className="matrix-cell">
                                            {rows
                                                .filter(
                                                    (row) =>
                                                        row.class_id ===
                                                            classId &&
                                                        row.subject_id ===
                                                            subjectId,
                                                )
                                                .map((row) => (
                                                    <button
                                                        type="button"
                                                        key={row.id}
                                                        className={`matrix-assignment${row.teacher_id === null ? ' missing' : ''}${highlighted ? (row.teacher_id === highlighted ? ' teacher-highlight' : ' teacher-dim') : ''}`}
                                                        data-matrix-row={r}
                                                        data-matrix-col={c}
                                                        data-teacher-key={
                                                            row.teacher_id ?? 0
                                                        }
                                                        aria-label={`${row.class_name} ${row.subject_name} ${DEMAND_TYPE_LABELS[row.demand_type]}: ${row.teacher_name ?? 'Chưa phân công'}`}
                                                        onMouseEnter={() =>
                                                            setHover(
                                                                row.teacher_id,
                                                            )
                                                        }
                                                        onMouseLeave={() =>
                                                            setHover(null)
                                                        }
                                                        onKeyDown={matrixKey}
                                                        onClick={(event) =>
                                                            open(
                                                                row,
                                                                event.currentTarget,
                                                            )
                                                        }
                                                    >
                                                        <span className="matrix-name">
                                                            {row.teacher_name
                                                                ?.split(' ')
                                                                .slice(-2)
                                                                .join(' ') ??
                                                                '+ Chọn giáo viên'}
                                                        </span>
                                                        <span className="matrix-meta">
                                                            <span>
                                                                {
                                                                    {
                                                                        STANDARD:
                                                                            'CK',
                                                                        SPECIALIZED_TOPIC:
                                                                            'CĐ',
                                                                        ENRICHMENT:
                                                                            'TT',
                                                                    }[
                                                                        row
                                                                            .demand_type
                                                                    ]
                                                                }{' '}
                                                                ·{' '}
                                                                {formatPeriods(
                                                                    row.periods_per_week,
                                                                )}{' '}
                                                                tiết
                                                            </span>
                                                            <Icon
                                                                name={
                                                                    row.locked
                                                                        ? 'lock'
                                                                        : row.teacher_id
                                                                          ? 'check'
                                                                          : 'plus'
                                                                }
                                                            />
                                                        </span>
                                                    </button>
                                                ))}
                                            {!rows.some(
                                                (row) =>
                                                    row.class_id === classId &&
                                                    row.subject_id ===
                                                        subjectId,
                                            ) && (
                                                <span className="muted">—</span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="matrix-hint">
                <span>
                    <Icon name="lock" />
                    Tiêu đề lớp và môn luôn được giữ khi cuộn
                </span>
                <span>↑ ↓ ← → di chuyển · Enter gán nhanh</span>
            </div>
        </>
    );
}

export function AssignmentTable({
    rows,
    filteredRows,
    teachers,
    selected,
    editable,
    fresh,
    busy,
    select,
    selectAll,
    open,
    lock,
}: {
    rows: AssignmentRow[];
    filteredRows: AssignmentRow[];
    teachers: WorkspaceTeacher[];
    selected: Set<number>;
    editable: boolean;
    fresh: boolean;
    busy: boolean;
    select: (id: number, checked: boolean) => void;
    selectAll: (checked: boolean) => void;
    open: OpenRow;
    lock: (row: AssignmentRow, locked: boolean) => void;
}) {
    const allSelected =
        filteredRows.length > 0 &&
        filteredRows.every((row) => selected.has(row.id));
    return (
        <div className="table-scroll tall">
            <table className="data-table">
                <caption className="sr-only">
                    Chi tiết các thành phần phân công
                </caption>
                <thead>
                    <tr>
                        <th className="row-checkbox">
                            <input
                                type="checkbox"
                                aria-label="Chọn tất cả dòng đang lọc"
                                checked={allSelected}
                                disabled={
                                    !editable ||
                                    busy ||
                                    !filteredRows.length ||
                                    filteredRows.length > 2000
                                }
                                onChange={(event) =>
                                    selectAll(event.target.checked)
                                }
                            />
                        </th>
                        <th>LỚP / MÔN</th>
                        <th>THÀNH PHẦN</th>
                        <th>TIẾT / TUẦN</th>
                        <th>GIÁO VIÊN PHỤ TRÁCH</th>
                        <th>TRẠNG THÁI</th>
                        <th>
                            <span className="sr-only">Thao tác</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row.id}
                            className={selected.has(row.id) ? 'selected' : ''}
                        >
                            <td>
                                <input
                                    type="checkbox"
                                    aria-label={`Chọn ${row.class_name} ${row.subject_name} ${DEMAND_TYPE_LABELS[row.demand_type]}`}
                                    checked={selected.has(row.id)}
                                    disabled={!editable || busy}
                                    onChange={(event) =>
                                        select(row.id, event.target.checked)
                                    }
                                />
                            </td>
                            <td>
                                <strong className="class-tag">
                                    {row.class_name}
                                </strong>
                                <br />
                                <small>{row.subject_name}</small>
                            </td>
                            <td>
                                <span
                                    className={`pill ${row.demand_type === 'STANDARD' ? 'gray' : 'purple'}`}
                                >
                                    {DEMAND_TYPE_LABELS[row.demand_type]}
                                </span>
                            </td>
                            <td className="mono">
                                {formatPeriods(row.periods_per_week)}{' '}
                                <small>tiết</small>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className={`assign-cell${row.teacher_id ? '' : ' unassigned'}`}
                                    aria-label={`${row.teacher_id ? 'Đổi' : 'Gán'} giáo viên cho ${row.class_name} ${row.subject_name} ${DEMAND_TYPE_LABELS[row.demand_type]}`}
                                    onClick={(event) =>
                                        open(row, event.currentTarget)
                                    }
                                >
                                    <AssignmentPerson
                                        row={row}
                                        teachers={teachers}
                                    />
                                </button>
                            </td>
                            <td>
                                <span
                                    className={`pill ${!row.teacher_id ? 'amber' : ''}`}
                                >
                                    {row.locked ? (
                                        <>
                                            <Icon name="lock" />
                                            Đã khóa
                                        </>
                                    ) : row.teacher_id ? (
                                        'Đã phân công'
                                    ) : (
                                        'Chờ phân công'
                                    )}
                                </span>
                            </td>
                            <td>
                                <div className="flex" style={{ gap: 3 }}>
                                    <button
                                        type="button"
                                        className={`icon-btn${row.locked ? ' locked-icon' : ''}`}
                                        aria-label={`${row.locked ? 'Mở khóa' : 'Khóa'} ${row.class_name} ${row.subject_name} ${DEMAND_TYPE_LABELS[row.demand_type]}`}
                                        disabled={
                                            !editable ||
                                            (!row.locked && !fresh) ||
                                            busy ||
                                            row.teacher_id === null
                                        }
                                        onClick={() => lock(row, !row.locked)}
                                    >
                                        <Icon
                                            name={
                                                row.locked ? 'lock' : 'unlock'
                                            }
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        aria-label={`Chi tiết ${row.class_name} ${row.subject_name} ${DEMAND_TYPE_LABELS[row.demand_type]}`}
                                        onClick={(event) =>
                                            open(row, event.currentTarget, true)
                                        }
                                    >
                                        <Icon name="panel" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
