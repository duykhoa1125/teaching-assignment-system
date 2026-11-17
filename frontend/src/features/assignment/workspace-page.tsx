import { roundPath } from '@/features/preparation/round-navigation';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/http';
import { Icon } from '@/shared/ui/icon';
import { useToast } from '@/shared/ui/toast-context';
import { RolePageHeader, RoleStateCard } from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { useAssignmentRoundsQuery } from '@/features/catalogs/queries';
import { resolveDefaultRound } from '@/features/preparation/round-context';
import { useRoundReadinessQuery } from '@/features/preparation/queries';
import { ReadinessIssue } from '@/features/preparation/readiness-issue';
import type { AssignmentRound } from '@/features/catalogs/types';
import {
    AssignmentEditor,
    type AssignmentEditorState,
} from './assignment-editor';
import { AssignmentMatrix, AssignmentTable } from './assignment-views';
import {
    WorkspaceDialogs,
    type ConfigurationAction,
    type LockAction,
} from './workspace-dialogs';
import {
    ASSIGNMENT_PAGE_SIZE,
    assignmentChange,
    canEditPlan,
    canWritePlan,
    filterAssignmentRows,
    planError,
} from './model';
import {
    assignmentKeys,
    useAssignmentLoads,
    useAssignmentRows,
    useCurrentPlan,
    usePlanOperation,
    usePlanValidation,
    usePlanVersion,
    usePlanWorkspace,
    type PlanOperation,
} from './queries';
import type { AssignmentRow } from './types';
import './workspace.css';
import '@/pages/preparation/preparation-ui.css';

const paramId = (raw: string | null) =>
    raw === null
        ? null
        : /^\d+$/.test(raw) &&
            Number.isSafeInteger(Number(raw)) &&
            Number(raw) > 0
          ? Number(raw)
          : NaN;
export function AssignmentWorkspacePage() {
    const { contextId, activeContext } = useSession();
    const [params, setParams] = useSearchParams();
    const urlContext = params.get('context_id');
    const changingContext = urlContext !== null && urlContext !== contextId;
    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const rounds = roundsQuery.data ?? [];
    const explicitRound = changingContext
        ? null
        : paramId(params.get('round_id'));
    const versionId = changingContext
        ? null
        : paramId(params.get('version_id'));
    const round =
        explicitRound === null
            ? resolveDefaultRound(rounds, contextId, activeContext?.round)
            : (rounds.find((item) => item.id === explicitRound) ?? null);
    useEffect(() => {
        if (changingContext) setParams({}, { replace: true });
        else if (
            urlContext === null &&
            (params.has('round_id') || params.has('version_id'))
        ) {
            const next = new URLSearchParams(params);
            next.set('context_id', contextId);
            setParams(next, { replace: true });
        }
    }, [changingContext, urlContext, contextId, params, setParams]);

    if (
        Number.isNaN(explicitRound) ||
        Number.isNaN(versionId) ||
        (explicitRound !== null && !roundsQuery.isPending && !round)
    )
        return (
            <RoleStateCard
                kind="error"
                title="Đợt hoặc phiên bản không hợp lệ"
                detail="Chọn lại đợt hiện hành để tiếp tục."
                actions={
                    <button className="btn" onClick={() => setParams({})}>
                        Mở đợt hiện hành
                    </button>
                }
            />
        );
    if (roundsQuery.isError)
        return (
            <RoleStateCard
                kind="error"
                title="Không tải được đợt phân công"
                detail={planError(roundsQuery.error)}
                actions={
                    <button
                        className="btn"
                        onClick={() => void roundsQuery.refetch()}
                    >
                        Thử lại
                    </button>
                }
            />
        );
    if (!round)
        return (
            <RoleStateCard
                kind={roundsQuery.isPending ? 'loading' : 'empty'}
                title={
                    roundsQuery.isPending
                        ? 'Đang tải đợt phân công…'
                        : 'Chưa có đợt phân công'
                }
                detail="Cần có đợt và dữ liệu chuẩn bị trước khi xây dựng phương án."
            />
        );
    return (
        <Workspace
            key={`${contextId}:${round.id}:${versionId ?? 'current'}`}
            round={round}
            rounds={rounds}
            versionId={versionId}
            contextId={contextId}
            chooseRound={(id) =>
                setParams({ round_id: String(id), context_id: contextId })
            }
            chooseVersion={(id) =>
                setParams({
                    round_id: String(round.id),
                    context_id: contextId,
                    ...(id ? { version_id: String(id) } : {}),
                })
            }
        />
    );
}

function Workspace({
    round,
    rounds,
    versionId,
    contextId,
    chooseRound,
    chooseVersion,
}: {
    round: AssignmentRound;
    rounds: AssignmentRound[];
    versionId: number | null;
    contextId: string;
    chooseRound: (id: number) => void;
    chooseVersion: (id: number | null) => void;
}) {
    const client = useQueryClient(),
        toast = useToast();
    const [params, setParams] = useSearchParams();
    const currentQuery = useCurrentPlan(round.id),
        historyQuery = usePlanVersion(versionId);
    const planQuery = versionId === null ? currentQuery : historyQuery,
        plan = planQuery.data;
    const correctRound = plan?.round_id === round.id,
        id = correctRound ? plan.version_id : null;
    const rowsQuery = useAssignmentRows(id, {}),
        loadsQuery = useAssignmentLoads(id),
        validationQuery = usePlanValidation(id),
        workspaceQuery = usePlanWorkspace(id);
    const operation = usePlanOperation();
    const [view, setView] = useState<'matrix' | 'table'>('matrix');
    const urlFilter = params.get('filter');
    const [filter, setFilter] = useState<'all' | 'unassigned' | 'locked'>(
        urlFilter === 'unassigned' || urlFilter === 'locked'
            ? urlFilter
            : 'all',
    );
    const [search, setSearch] = useState(''),
        [subject, setSubject] = useState('');
    const [teacherFocus, setTeacherFocus] = useState(''),
        [hover, setHover] = useState<number | null>(null);
    const [selected, setSelected] = useState<Set<number>>(new Set()),
        [offset, setOffset] = useState(0);
    const [editor, setEditor] = useState<AssignmentEditorState | null>(null);
    const [lockAction, setLockAction] = useState<LockAction | null>(null);
    const [configuration, setConfiguration] =
        useState<ConfigurationAction | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const missingPlan =
        planQuery.error instanceof ApiError &&
        planQuery.error.status === 404 &&
        versionId === null;
    const readiness = useRoundReadinessQuery(
        round.id,
        {
            optimization_config_id: configuration?.config ?? 1,
            rule_set_version_id:
                configuration?.rule ?? (contextId === 'thcs-demo' ? 2 : 1),
        },
        missingPlan || configuration !== null,
    );
    const rows = useMemo(() => rowsQuery.data?.items ?? [], [rowsQuery.data]);
    const demandTarget = paramId(params.get('demand'));
    const demandMatch = useMemo(
        () =>
            demandTarget
                ? (rows.find(
                      (r) =>
                          r.id === demandTarget || r.demand_id === demandTarget,
                  ) ?? null)
                : null,
        [demandTarget, rows],
    );
    const activeEditor =
        editor ??
        (demandMatch && plan
            ? {
                  row: demandMatch,
                  revision: plan.revision_no,
                  anchor: document.body,
                  mode: 'drawer' as const,
              }
            : null);
    const teachers = workspaceQuery.data?.teachers ?? [],
        loads = loadsQuery.data?.items ?? [];
    const filtered = useMemo(
        () =>
            filterAssignmentRows(rows, search, subject).filter(
                (row) =>
                    filter === 'all' ||
                    (filter === 'unassigned' && row.teacher_id === null) ||
                    (filter === 'locked' && row.locked),
            ),
        [rows, search, subject, filter],
    );
    const pageOffset = offset >= filtered.length && offset > 0 ? 0 : offset;
    const displayedRows = filtered.slice(
        pageOffset,
        pageOffset + ASSIGNMENT_PAGE_SIZE,
    );
    const assigned = rows.filter((row) => row.teacher_id !== null).length,
        unassigned = rows.length - assigned;
    const consistent = Boolean(
        plan &&
        rowsQuery.data &&
        rowsQuery.data.version.revision_no === plan.revision_no &&
        rowsQuery.data.version.input_snapshot_id === plan.input_snapshot_id &&
        (!loadsQuery.data ||
            (loadsQuery.data.version.revision_no === plan.revision_no &&
                loadsQuery.data.version.input_snapshot_id ===
                    plan.input_snapshot_id)),
    );
    const editable = correctRound && canEditPlan(plan) && consistent,
        writable = editable && canWritePlan(plan),
        busy = operation.isPending;
    function clearSelection() {
        setSelected(new Set());
        setOffset(0);
    }
    function closeEditor() {
        const anchor = editor?.anchor;
        setEditor(null);
        if (params.has('demand')) {
            const next = new URLSearchParams(params);
            next.delete('demand');
            setParams(next, { replace: true });
        }
        requestAnimationFrame(() => {
            if (anchor?.isConnected) anchor.focus();
        });
    }
    async function reload() {
        closeEditor();
        setLockAction(null);
        setConfiguration(null);
        setFailure(null);
        clearSelection();
        await client.invalidateQueries({ queryKey: assignmentKeys.all });
    }
    async function run(input: PlanOperation) {
        setFailure(null);
        try {
            const result = await operation.mutateAsync(input);
            if ('changed_count' in result)
                toast({
                    title: result.changed_count
                        ? input.kind === 'change'
                            ? 'Đã lưu phân công'
                            : `Đã ${'locked' in input && input.locked ? 'khóa' : 'mở khóa'} ${result.changed_count} thành phần`
                        : 'Không có thay đổi',
                    description: `Revision hiện tại: ${result.version.revision_no}.`,
                    tone: 'success',
                });
            else
                toast({
                    title:
                        input.kind === 'create'
                            ? 'Đã tạo phương án nháp'
                            : 'Đã làm mới snapshot',
                    description: `V${String(result.version_no).padStart(2, '0')} / r${result.revision_no}`,
                    tone: 'success',
                });
            closeEditor();
            setLockAction(null);
            setConfiguration(null);
            setSelected(new Set());
        } catch (error) {
            setFailure(planError(error));
        }
    }
    function open(row: AssignmentRow, anchor: HTMLElement, detail = false) {
        setFailure(null);
        setEditor({
            row,
            anchor,
            revision: plan!.revision_no,
            mode: detail || row.locked || !writable ? 'drawer' : 'quick',
        });
    }
    function lockRow(row: AssignmentRow, locked: boolean, group = false) {
        setFailure(null);
        if (locked && !writable) {
            setFailure('Làm mới snapshot trước khi khóa phân công.');
            return;
        }
        setLockAction({
            row,
            locked,
            group,
            reason: '',
            revision:
                activeEditor?.row.id === row.id
                    ? activeEditor.revision
                    : plan!.revision_no,
        });
    }
    function submitLock() {
        if (!lockAction) return;
        if (!lockAction.reason.trim()) {
            setFailure('Nhập lý do trước khi xác nhận.');
            return;
        }
        const base = {
            expected_revision: lockAction.revision,
            reason: lockAction.reason.trim(),
        };
        void run(
            lockAction.selected
                ? {
                      kind: 'batch',
                      version: id!,
                      locked: lockAction.locked,
                      input: { ...base, assignment_ids: lockAction.selected },
                  }
                : lockAction.group
                  ? {
                        kind: 'batch',
                        version: id!,
                        locked: lockAction.locked,
                        input: {
                            ...base,
                            class_id: lockAction.row!.class_id,
                            subject_id: lockAction.row!.subject_id,
                        },
                    }
                  : {
                        kind: 'lock',
                        version: id!,
                        row: lockAction.row!.id,
                        locked: lockAction.locked,
                        input: base,
                    },
        );
    }
    function submitConfiguration() {
        if (!configuration) return;
        const input = {
            optimization_config_id: configuration.config,
            rule_set_version_id: configuration.rule,
        };
        void run(
            configuration.kind === 'create'
                ? { kind: 'create', round: round.id, input }
                : {
                      kind: 'refresh',
                      version: id!,
                      input: {
                          ...input,
                          expected_revision: configuration.revision,
                      },
                  },
        );
    }
    return (
        <div className="assignment-workspace fe05-page">
            <div className="page-control-row">
                <RolePageHeader
                    roundLabel={round.round_code}
                    contextLabel={workspaceQuery.data?.context_label}
                    title="Phân công giảng dạy"
                    description="Kết nối đúng chuyên môn với từng nhu cầu của nhà trường."
                    actions={
                        <>
                            <button
                                className="btn"
                                type="button"
                                disabled
                                title="Chỉ xuất tài liệu đã phát hành"
                            >
                                <Icon name="download" />
                                Xuất PDF
                            </button>
                            <Link
                                to={roundPath(
                                    '/solver-runs',
                                    round.id,
                                    contextId,
                                )}
                                className="btn primary"
                            >
                                <Icon name="spark" />
                                Sinh đề xuất
                            </Link>
                        </>
                    }
                />
                <div className="mvp-filter assignment-context">
                    <label>
                        Đợt phân công
                        <select
                            aria-label="Chọn đợt phân công"
                            value={round.id}
                            onChange={(event) =>
                                chooseRound(Number(event.target.value))
                            }
                        >
                            {rounds.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.round_code}
                                </option>
                            ))}
                        </select>
                    </label>
                    {plan && workspaceQuery.data && (
                        <label>
                            Phiên bản
                            <select
                                aria-label="Chọn phiên bản phương án"
                                value={plan.version_id}
                                onChange={(event) =>
                                    chooseVersion(Number(event.target.value))
                                }
                            >
                                {workspaceQuery.data.versions.map((item) => (
                                    <option
                                        key={item.version_id}
                                        value={item.version_id}
                                    >
                                        V
                                        {String(item.version_no).padStart(
                                            2,
                                            '0',
                                        )}
                                        {item.is_current
                                            ? ' · Hiện hành'
                                            : ' · Lưu trữ'}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>
            {planQuery.isPending ? (
                <RoleStateCard
                    kind="loading"
                    title="Đang tải phương án…"
                    detail="Đang đọc phiên bản và snapshot đã lưu."
                />
            ) : missingPlan ? (
                <section className="panel">
                    <RoleStateCard
                        kind="empty"
                        title="Đợt chưa có phương án"
                        detail="Tạo bản nháp từ dữ liệu nguồn và cặp cấu hình/bộ quy tắc đã chọn."
                        actions={
                            <button
                                className="btn primary"
                                type="button"
                                onClick={() => {
                                    setFailure(null);
                                    setConfiguration({
                                        kind: 'create',
                                        config: 1,
                                        rule: contextId === 'thcs-demo' ? 2 : 1,
                                        revision: 0,
                                    });
                                }}
                            >
                                <Icon name="plus" />
                                Tạo phương án nháp
                            </button>
                        }
                    />
                    {readiness.data?.issues.map((issue, index) => (
                        <ReadinessIssue
                            key={`${issue.code}-${index}`}
                            issue={issue}
                            roundId={round?.id}
                            contextId={contextId}
                        />
                    ))}
                </section>
            ) : planQuery.isError ? (
                <RoleStateCard
                    kind="error"
                    title="Không tải được phương án"
                    detail={planError(planQuery.error)}
                    actions={
                        <button className="btn" onClick={() => void reload()}>
                            Tải lại phương án
                        </button>
                    }
                />
            ) : plan && !correctRound ? (
                <RoleStateCard
                    kind="error"
                    title="Phiên bản không thuộc đợt đang chọn"
                    detail="Mở lại bản hiện hành của đợt để tiếp tục."
                    actions={
                        <button
                            className="btn"
                            onClick={() => chooseVersion(null)}
                        >
                            Mở bản hiện hành
                        </button>
                    }
                />
            ) : plan ? (
                <>
                    <div className="banner">
                        <span className="school-symbol">
                            <Icon name="layers" />
                        </span>
                        <div className="grow">
                            <strong>
                                {round.round_code} ·{' '}
                                {plan.is_current
                                    ? 'Phương án hiện hành'
                                    : 'Phiên bản lưu trữ'}
                            </strong>
                            <span className="muted">
                                {' '}
                                &nbsp; V
                                {String(plan.version_no).padStart(2, '0')} / r
                                {plan.revision_no}
                            </span>
                        </div>
                        <span
                            className={`pill ${canEditPlan(plan) ? 'amber' : ''}`}
                        >
                            {plan.status === 'DRAFT'
                                ? 'Bản nháp'
                                : plan.status === 'OPEN_FOR_FEEDBACK'
                                  ? 'Đang lấy ý kiến'
                                  : plan.status}
                        </span>
                        <span className="muted">
                            {assigned}/{rows.length} đã gán
                        </span>
                        {canEditPlan(plan) && (
                            <button
                                className="btn small"
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                    setFailure(null);
                                    setConfiguration({
                                        kind: 'refresh',
                                        config: plan.optimization_config_id,
                                        rule: plan.rule_set_version_id,
                                        revision: plan.revision_no,
                                    });
                                }}
                            >
                                <Icon name="reset" />
                                Làm mới snapshot
                            </button>
                        )}
                    </div>
                    {!canEditPlan(plan) && (
                        <div className="banner amber">
                            <Icon name="lock" />
                            <span className="grow">
                                Phiên bản này chỉ đọc. Các dòng và tên hiển thị
                                theo snapshot đã lưu.
                            </span>
                            {!plan.is_current && (
                                <button
                                    type="button"
                                    className="btn small"
                                    onClick={() => chooseVersion(null)}
                                >
                                    Mở bản hiện hành
                                </button>
                            )}
                        </div>
                    )}
                    {!plan.snapshot_fresh && (
                        <div className="banner amber" role="status">
                            <Icon name="warning" />
                            <span>
                                Snapshot đã cũ. Làm mới để sửa/khóa; vẫn có thể
                                mở khóa bản nháp hiện hành.
                            </span>
                        </div>
                    )}
                    {!consistent &&
                        !busy &&
                        !planQuery.isFetching &&
                        !rowsQuery.isFetching &&
                        !loadsQuery.isFetching &&
                        !rowsQuery.isPending &&
                        !rowsQuery.isError && (
                            <div className="banner amber">
                                <Icon name="warning" />
                                <span className="grow">
                                    Dữ liệu giữa các lần đọc chưa cùng revision.
                                </span>
                                <button
                                    className="btn small"
                                    onClick={() => void reload()}
                                >
                                    Tải lại phương án
                                </button>
                            </div>
                        )}
                    <div className="toolbar">
                        <div className="tabs" aria-label="Lọc phân công">
                            {(['all', 'unassigned', 'locked'] as const).map(
                                (value) => (
                                    <button
                                        type="button"
                                        key={value}
                                        aria-pressed={filter === value}
                                        className={
                                            filter === value ? 'active' : ''
                                        }
                                        onClick={() => {
                                            setFilter(value);
                                            clearSelection();
                                        }}
                                    >
                                        {value === 'all'
                                            ? 'Tất cả'
                                            : value === 'locked'
                                              ? 'Đã khóa'
                                              : `Chưa phân công · ${unassigned}`}
                                    </button>
                                ),
                            )}
                        </div>
                        <div className="flex">
                            <div className="input-wrap">
                                <Icon name="search" />
                                <input
                                    aria-label="Tìm lớp, môn hoặc giáo viên"
                                    placeholder="Tìm lớp, môn, giáo viên…"
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        clearSelection();
                                    }}
                                />
                            </div>
                            <select
                                aria-label="Lọc môn học"
                                value={subject}
                                onChange={(event) => {
                                    setSubject(event.target.value);
                                    clearSelection();
                                }}
                            >
                                <option value="">Tất cả môn</option>
                                {[
                                    ...new Map(
                                        rows.map((row) => [
                                            row.subject_id,
                                            row.subject_name,
                                        ]),
                                    ).entries(),
                                ].map(([value, name]) => (
                                    <option key={value} value={value}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {rowsQuery.isError ? (
                        <RoleStateCard
                            kind="error"
                            title="Không tải được phân công"
                            detail={planError(rowsQuery.error)}
                            actions={
                                <button
                                    className="btn"
                                    onClick={() => void reload()}
                                >
                                    Tải lại phương án
                                </button>
                            }
                        />
                    ) : rowsQuery.isPending ? (
                        <RoleStateCard
                            kind="loading"
                            title="Đang tải các thành phần phân công…"
                            detail="Đọc dữ liệu theo cùng snapshot và revision."
                        />
                    ) : (
                        <section className="panel">
                            <div
                                className="panel-head"
                                style={{ paddingBlock: 15 }}
                            >
                                <div className="flex">
                                    <span className="section-index">
                                        {filtered.length} THÀNH PHẦN
                                    </span>
                                    <span
                                        className="muted"
                                        style={{ fontSize: 11 }}
                                    >
                                        · Chọn ô để gán nhanh
                                    </span>
                                </div>
                                <div
                                    className="tabs view-switch"
                                    aria-label="Cách xem phân công"
                                >
                                    <button
                                        type="button"
                                        className={
                                            view === 'matrix' ? 'active' : ''
                                        }
                                        aria-pressed={view === 'matrix'}
                                        onClick={() => setView('matrix')}
                                    >
                                        <Icon name="matrix" />
                                        Ma trận
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            view === 'table' ? 'active' : ''
                                        }
                                        aria-pressed={view === 'table'}
                                        onClick={() => setView('table')}
                                    >
                                        <Icon name="list" />
                                        Chi tiết
                                    </button>
                                </div>
                            </div>
                            {!filtered.length ? (
                                <RoleStateCard
                                    kind="empty"
                                    title="Không có nhu cầu phù hợp"
                                    detail="Thử đổi bộ lọc hoặc bổ sung đầu vào trong Chuẩn bị dữ liệu."
                                />
                            ) : view === 'matrix' ? (
                                <AssignmentMatrix
                                    rows={filtered}
                                    teachers={teachers}
                                    loads={loads}
                                    focus={teacherFocus}
                                    hover={hover}
                                    setFocus={setTeacherFocus}
                                    setHover={setHover}
                                    open={open}
                                />
                            ) : (
                                <AssignmentTable
                                    rows={displayedRows}
                                    filteredRows={filtered}
                                    teachers={teachers}
                                    selected={selected}
                                    editable={editable}
                                    fresh={writable}
                                    busy={busy}
                                    select={(row, checked) =>
                                        setSelected((previous) => {
                                            const next = new Set(previous);
                                            if (checked) next.add(row);
                                            else next.delete(row);
                                            return next;
                                        })
                                    }
                                    selectAll={(checked) =>
                                        setSelected(
                                            checked
                                                ? new Set(
                                                      filtered.map(
                                                          (row) => row.id,
                                                      ),
                                                  )
                                                : new Set(),
                                        )
                                    }
                                    open={open}
                                    lock={lockRow}
                                />
                            )}
                            <div className="table-bottom">
                                <span>
                                    {view === 'matrix'
                                        ? 'CK · Chính khóa / CĐ · Chuyên đề / TT · Tăng tiết'
                                        : 'Chọn nhiều dòng để khóa hoặc mở khóa nhanh'}
                                </span>
                                <span>
                                    {filtered.length} nhu cầu ·{' '}
                                    {
                                        filtered.filter(
                                            (row) => row.teacher_id !== null,
                                        ).length
                                    }{' '}
                                    đã gán
                                </span>
                            </div>
                            {view === 'table' &&
                                filtered.length > ASSIGNMENT_PAGE_SIZE && (
                                    <div className="table-bottom">
                                        <span>
                                            Trang{' '}
                                            {Math.floor(
                                                pageOffset /
                                                    ASSIGNMENT_PAGE_SIZE,
                                            ) + 1}{' '}
                                            /{' '}
                                            {Math.ceil(
                                                filtered.length /
                                                    ASSIGNMENT_PAGE_SIZE,
                                            )}
                                        </span>
                                        <div className="mvp-actions">
                                            <button
                                                className="icon-btn"
                                                aria-label="Trang trước"
                                                title="Trang trước"
                                                disabled={!pageOffset}
                                                onClick={() =>
                                                    setOffset(
                                                        Math.max(
                                                            0,
                                                            pageOffset -
                                                                ASSIGNMENT_PAGE_SIZE,
                                                        ),
                                                    )
                                                }
                                            >
                                                <span
                                                    style={{
                                                        transform:
                                                            'rotate(180deg)',
                                                        display: 'inline-flex',
                                                    }}
                                                >
                                                    <Icon name="chevron" />
                                                </span>
                                            </button>
                                            <button
                                                className="icon-btn"
                                                aria-label="Trang sau"
                                                title="Trang sau"
                                                disabled={
                                                    pageOffset +
                                                        ASSIGNMENT_PAGE_SIZE >=
                                                    filtered.length
                                                }
                                                onClick={() =>
                                                    setOffset(
                                                        pageOffset +
                                                            ASSIGNMENT_PAGE_SIZE,
                                                    )
                                                }
                                            >
                                                <Icon name="chevron" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                        </section>
                    )}
                    {loadsQuery.isError && (
                        <div className="banner amber">
                            <Icon name="warning" />
                            <span className="grow">
                                Chưa đọc được tải theo snapshot:{' '}
                                {planError(loadsQuery.error)}
                            </span>
                            <button
                                className="btn small"
                                onClick={() => void loadsQuery.refetch()}
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                    <div className="between section-gap assignment-footer">
                        <span className="flex muted">
                            <Icon name="shield" />
                            <span>
                                Phân công đã khóa luôn được giữ nguyên ·{' '}
                                {validationQuery.data
                                    ? validationQuery.data.fresh
                                        ? validationQuery.data
                                              .overall_status === 'VIOLATION'
                                            ? 'Kiểm tra có vi phạm'
                                            : 'Kiểm tra hiện hành'
                                        : 'Kết quả kiểm tra đã cũ'
                                    : 'Chưa có báo cáo kiểm tra phương án'}
                            </span>
                        </span>
                        <div className="mvp-actions">
                            <Link
                                to={roundPath('/workload', round.id, contextId)}
                                className="btn"
                            >
                                <Icon name="balance" />
                                Xem tải
                            </Link>
                            <Link
                                to={roundPath('/checks', round.id, contextId)}
                                className="btn"
                            >
                                <Icon name="check" />
                                Kiểm tra phương án
                            </Link>
                            {plan?.is_current &&
                            plan.status === 'DRAFT' &&
                            validationQuery.data?.fresh &&
                            validationQuery.data.overall_status !==
                                'VIOLATION' ? (
                                <Link to="/feedback" className="btn primary">
                                    <Icon name="send" />
                                    Mở lấy ý kiến
                                </Link>
                            ) : plan && plan.status !== 'DRAFT' ? (
                                <Link
                                    to={
                                        plan.status === 'READY_TO_EXPORT' ||
                                        plan.status === 'EXPORTED'
                                            ? '/documents'
                                            : '/feedback'
                                    }
                                    className="btn"
                                >
                                    <Icon name="feedback" />
                                    {plan.status === 'READY_TO_EXPORT' ||
                                    plan.status === 'EXPORTED'
                                        ? 'Mở Tài liệu phát hành'
                                        : 'Xem phản hồi & giai đoạn'}
                                </Link>
                            ) : (
                                <button
                                    className="btn primary"
                                    disabled
                                    title="Hoàn thiện và chạy kiểm tra phương án trước khi mở lấy ý kiến"
                                >
                                    <Icon name="send" />
                                    Mở lấy ý kiến
                                </button>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
            {failure && !activeEditor && !lockAction && !configuration && (
                <div className="banner red" role="alert">
                    <Icon name="warning" />
                    <span className="grow">{failure}</span>
                    <button className="btn small" onClick={() => void reload()}>
                        Tải lại phương án
                    </button>
                </div>
            )}
            {selected.size > 0 && editable && (
                <div
                    className="bulk-bar"
                    aria-label="Thao tác trên dòng đã chọn"
                >
                    <span className="bulk-count">{selected.size}</span>
                    <span>đã chọn</span>
                    <span className="bulk-divider" />
                    <button
                        type="button"
                        className="btn small"
                        disabled={!writable || busy}
                        onClick={() => {
                            setFailure(null);
                            setLockAction({
                                locked: true,
                                selected: [...selected],
                                reason: '',
                                revision: plan!.revision_no,
                            });
                        }}
                    >
                        <Icon name="lock" />
                        Khóa phân công
                    </button>
                    <button
                        type="button"
                        className="btn small"
                        disabled={busy}
                        onClick={() => {
                            setFailure(null);
                            setLockAction({
                                locked: false,
                                selected: [...selected],
                                reason: '',
                                revision: plan!.revision_no,
                            });
                        }}
                    >
                        <Icon name="unlock" />
                        Mở khóa
                    </button>
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Bỏ chọn tất cả"
                        onClick={() => setSelected(new Set())}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            )}
            {activeEditor && (
                <AssignmentEditor
                    key={`${activeEditor.row.id}:${activeEditor.mode}`}
                    editor={activeEditor}
                    teachers={teachers}
                    loads={loads}
                    editable={writable && !activeEditor.row.locked}
                    coverage={{ assigned, total: rows.length }}
                    canUnlock={editable}
                    canLock={writable}
                    onReload={() => void reload()}
                    busy={busy}
                    error={failure}
                    onClose={() => {
                        if (activeEditor.mode === 'quick' || !busy)
                            closeEditor();
                    }}
                    onDetail={() =>
                        setEditor((previous) =>
                            previous ? { ...previous, mode: 'drawer' } : null,
                        )
                    }
                    onSave={(teacher, reason) => {
                        try {
                            void run({
                                kind: 'change',
                                version: id!,
                                row: activeEditor.row.id,
                                input: assignmentChange(
                                    activeEditor.revision,
                                    teacher,
                                    reason,
                                    reason,
                                ),
                            });
                        } catch (error) {
                            setFailure(planError(error));
                        }
                    }}
                    onLock={(locked, group) =>
                        lockRow(activeEditor.row, locked, group)
                    }
                />
            )}
            <WorkspaceDialogs
                lock={lockAction}
                configuration={configuration}
                error={failure}
                busy={busy}
                checking={readiness.isFetching}
                checkError={
                    readiness.isError ? planError(readiness.error) : null
                }
                setLock={setLockAction}
                setConfiguration={setConfiguration}
                submitLock={submitLock}
                submitConfiguration={submitConfiguration}
                reload={() => void reload()}
            />
        </div>
    );
}
