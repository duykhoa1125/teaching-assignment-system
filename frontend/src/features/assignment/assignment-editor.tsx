import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
    type ReactNode,
} from 'react';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { Drawer } from '@/shared/ui/drawer';
import {
    DEMAND_TYPE_LABELS,
    formatPeriods,
} from '@/features/preparation/model';
import { candidateState } from './model';
import { AssignmentImpact } from './assignment-impact';
import type { AssignmentRow, WorkloadRow, WorkspaceTeacher } from './types';

export type AssignmentEditorState = {
    row: AssignmentRow;
    revision: number;
    anchor: HTMLElement;
    mode: 'quick' | 'drawer';
};

export function AssignmentPopover({
    anchor,
    label,
    children,
    onClose,
}: {
    anchor: HTMLElement;
    label: string;
    children: ReactNode;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);
    const [rect] = useState(() => anchor.getBoundingClientRect());
    const style = {
        '--quick-left': `${Math.max(14, Math.min(rect.left, innerWidth - 448))}px`,
        '--quick-top': `${Math.min(rect.bottom + 8, innerHeight - 260)}px`,
    } as CSSProperties;
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (typeof element.showPopover === 'function') element.showPopover();
        else element.classList.add('popover-fallback');
        const height = element.getBoundingClientRect().height;
        element.style.setProperty(
            '--quick-top',
            `${rect.bottom + height + 12 > innerHeight ? Math.max(12, rect.top - height - 8) : rect.bottom + 8}px`,
        );
        const frame = requestAnimationFrame(() =>
            element
                .querySelector<HTMLElement>(
                    'input:not(:disabled),button:not(:disabled)',
                )
                ?.focus(),
        );
        const dismiss = (event: PointerEvent) => {
            if (
                !element.contains(event.target as Node) &&
                !anchor.contains(event.target as Node)
            )
                closeRef.current();
        };
        const key = (event: KeyboardEvent) => {
            if (
                event.key === 'Escape' &&
                typeof element.hidePopover !== 'function'
            ) {
                closeRef.current();
                anchor.focus();
            }
        };
        const resize = () => closeRef.current();
        document.addEventListener('pointerdown', dismiss);
        document.addEventListener('keydown', key);
        window.addEventListener('resize', resize);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('pointerdown', dismiss);
            document.removeEventListener('keydown', key);
            window.removeEventListener('resize', resize);
        };
        // Anchor geometry is captured once, as in the original popover; edits must not refocus the form.
    }, [anchor, rect.bottom, rect.top]);
    return (
        <div
            ref={ref}
            popover="auto"
            className="quick-popover"
            role="dialog"
            aria-label={label}
            style={style}
            onToggle={(event) => {
                if ((event.nativeEvent as ToggleEvent).newState === 'closed')
                    closeRef.current();
            }}
        >
            {children}
        </div>
    );
}

export function AssignmentEditor({
    editor,
    teachers,
    loads,
    coverage,
    editable,
    canUnlock,
    canLock,
    busy,
    error,
    onClose,
    onDetail,
    onSave,
    onLock,
    onReload,
}: {
    editor: AssignmentEditorState;
    teachers: WorkspaceTeacher[];
    loads: WorkloadRow[];
    coverage: { assigned: number; total: number };
    editable: boolean;
    canUnlock: boolean;
    canLock: boolean;
    busy: boolean;
    error: string | null;
    onClose: () => void;
    onDetail: () => void;
    onSave: (teacher: string, reason: string) => void;
    onLock: (locked: boolean, group: boolean) => void;
    onReload: () => void;
}) {
    const row = editor.row;
    const [teacherId, setTeacherId] = useState(
        row.teacher_id === null ? '' : String(row.teacher_id),
    );
    const [note, setNote] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const selected = teachers.find(
        (teacher) => String(teacher.id) === teacherId,
    );
    const selectedLoad = loads.find((load) => load.teacher_id === selected?.id);
    const preview = selected
        ? candidateState(selected, row, selectedLoad)
        : null;
    const submit = (event?: FormEvent) => {
        event?.preventDefault();
        if (!note.trim() || note.trim().length > 2000) {
            setLocalError('Nhập lý do thay đổi từ 1 đến 2000 ký tự.');
            return;
        }
        setLocalError(null);
        onSave(teacherId, note);
    };
    const content = (
        <form
            id="assignment-form"
            onSubmit={submit}
            aria-busy={busy || undefined}
        >
            <label className="field">
                {editor.mode === 'quick'
                    ? 'Chọn giáo viên phù hợp'
                    : 'Giáo viên có chuyên môn đã xác nhận'}
            </label>
            {teachers
                .filter((teacher) =>
                    teacher.subjects.some(
                        (subject) => subject.id === row.subject_id,
                    ),
                )
                .map((teacher) => {
                    const candidate = candidateState(
                        teacher,
                        row,
                        loads.find((load) => load.teacher_id === teacher.id),
                    );
                    return (
                        <label
                            className={`choice ${candidate.reason ? 'choice-blocked' : ''}`}
                            key={teacher.id}
                        >
                            <input
                                type="radio"
                                name="assignedTeacher"
                                value={teacher.id}
                                checked={teacherId === String(teacher.id)}
                                onChange={() =>
                                    setTeacherId(String(teacher.id))
                                }
                                disabled={
                                    !editable ||
                                    busy ||
                                    candidate.reason !== null
                                }
                            />
                            <PortraitAvatar
                                portraitKey={teacher.portrait_key}
                                colorIndex={teacher.color_index}
                            />
                            <span className="grow">
                                <strong>{teacher.full_name}</strong>
                                <p>
                                    {loads.find(
                                        (load) =>
                                            load.teacher_id === teacher.id,
                                    )?.t ?? '—'}{' '}
                                    →{' '}
                                    {candidate.projected === null
                                        ? '—'
                                        : formatPeriods(
                                              candidate.projected,
                                          )}{' '}
                                    tiết · định mức {teacher.base_norm}
                                </p>
                                {candidate.reason && (
                                    <small className="blocked-reason">
                                        {candidate.reason} · không thể chọn
                                    </small>
                                )}
                            </span>
                            <span
                                className={`pill ${candidate.reason ? 'red' : candidate.projected !== null && candidate.projected > teacher.base_norm ? 'amber' : ''}`}
                            >
                                {candidate.reason ??
                                    (candidate.projected !== null &&
                                    candidate.projected > teacher.base_norm
                                        ? `+${formatPeriods(candidate.projected - teacher.base_norm)}`
                                        : 'Phù hợp')}
                            </span>
                        </label>
                    );
                })}
            {!teachers.some((teacher) =>
                teacher.subjects.some(
                    (subject) => subject.id === row.subject_id,
                ),
            ) && (
                <div className="modal-note">
                    Chưa có danh sách giáo viên phù hợp theo snapshot. Không thể
                    suy đoán chuyên môn từ dữ liệu hiện tại.
                </div>
            )}
            <label className="choice">
                <input
                    type="radio"
                    name="assignedTeacher"
                    value=""
                    checked={teacherId === ''}
                    onChange={() => setTeacherId('')}
                    disabled={!editable || busy}
                />
                <span className="school-symbol">
                    <Icon name="clock" />
                </span>
                <span>
                    <strong>Để lại chưa phân công</strong>
                    <p>Giữ nhu cầu để tiếp tục hoàn thiện</p>
                </span>
            </label>
            <div
                className="impact-preview"
                aria-live="polite"
                aria-atomic="true"
            >
                <AssignmentImpact
                    row={row}
                    next={teacherId ? Number(teacherId) : null}
                    teachers={teachers}
                    loads={loads}
                    coverage={coverage}
                />
            </div>
            <label className="field">
                <span>
                    Lý do / ghi chú <span aria-hidden="true">*</span>
                </span>
                <textarea
                    aria-label="Lý do thay đổi phân công"
                    placeholder="Bắt buộc cho mỗi thay đổi…"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={2000}
                    disabled={!editable || busy}
                    required
                />
            </label>
            {(error || localError) && (
                <div className="form-error" role="alert">
                    {error || localError}
                    {error && (
                        <button
                            type="button"
                            className="btn small"
                            onClick={onReload}
                        >
                            Tải lại phương án
                        </button>
                    )}
                </div>
            )}
        </form>
    );
    const save = (
        <button
            type="submit"
            form="assignment-form"
            className={`btn primary${editor.mode === 'quick' ? ' small' : ''}`}
            disabled={!editable || busy || Boolean(preview?.reason)}
        >
            <Icon name="check" />
            {busy ? 'Đang lưu…' : 'Lưu phân công'}
        </button>
    );
    if (editor.mode === 'quick')
        return (
            <AssignmentPopover
                anchor={editor.anchor}
                label={`Gán nhanh ${row.class_name} · ${row.subject_name}`}
                onClose={onClose}
            >
                <div className="quick-head">
                    <div>
                        <h3>
                            {row.class_name} · {row.subject_name}
                        </h3>
                        <p>
                            {DEMAND_TYPE_LABELS[row.demand_type]} ·{' '}
                            {formatPeriods(row.periods_per_week)} tiết / tuần
                        </p>
                    </div>
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Đóng gán nhanh"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>
                <div className="quick-body">{content}</div>
                <div className="quick-foot">
                    <button
                        type="button"
                        className="btn ghost small"
                        onClick={onDetail}
                        disabled={busy}
                    >
                        <Icon name="panel" />
                        Chi tiết
                    </button>
                    {save}
                </div>
            </AssignmentPopover>
        );
    return (
        <Drawer
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title={`${row.class_name} · ${row.subject_name}`}
            eyebrow="Thông tin chi tiết"
            subtitle={DEMAND_TYPE_LABELS[row.demand_type]}
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose}>
                        Đóng
                    </button>
                    {editable ? (
                        save
                    ) : row.locked && canUnlock ? (
                        <button
                            type="button"
                            className="btn"
                            disabled={busy}
                            onClick={() => onLock(false, false)}
                        >
                            <Icon name="unlock" />
                            Mở khóa
                        </button>
                    ) : null}
                </>
            }
        >
            <div className="detail-grid">
                <div>
                    <small>Nhu cầu giảng dạy</small>
                    <b>{formatPeriods(row.periods_per_week)} tiết / tuần</b>
                </div>
                <div>
                    <small>Trạng thái</small>
                    <span className={`pill ${!row.teacher_id ? 'amber' : ''}`}>
                        {row.locked
                            ? 'Đã khóa'
                            : row.teacher_id
                              ? 'Đã phân công'
                              : 'Chờ phân công'}
                    </span>
                </div>
                <div>
                    <small>Hiệu lực</small>
                    {row.valid_from} → {row.valid_to}
                </div>
                <div>
                    <small>Lý do khóa</small>
                    {row.lock_reason ?? '—'}
                </div>
            </div>
            {!editable && (
                <div className="banner amber section-gap">
                    <Icon name="lock" />
                    <span>
                        {row.locked
                            ? 'Mở khóa để điều chỉnh phân công.'
                            : 'Phiên bản hoặc snapshot hiện tại không cho sửa phân công.'}
                    </span>
                </div>
            )}
            <div className="section-gap">{content}</div>
            <div className="mvp-actions section-gap">
                <button
                    type="button"
                    className="btn small"
                    disabled={
                        busy ||
                        !canUnlock ||
                        !row.teacher_id ||
                        (!row.locked && !canLock)
                    }
                    onClick={() => onLock(!row.locked, false)}
                >
                    <Icon name={row.locked ? 'unlock' : 'lock'} />
                    {row.locked ? 'Mở khóa dòng' : 'Khóa dòng'}
                </button>
                <button
                    type="button"
                    className="btn small"
                    disabled={busy || !canLock}
                    onClick={() => onLock(true, true)}
                >
                    Khóa toàn nhóm lớp–môn
                </button>
                <button
                    type="button"
                    className="btn small"
                    disabled={busy || !canUnlock}
                    onClick={() => onLock(false, true)}
                >
                    Mở khóa toàn nhóm
                </button>
            </div>
        </Drawer>
    );
}
