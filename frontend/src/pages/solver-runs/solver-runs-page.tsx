import { roundPath } from '@/features/preparation/round-navigation';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
    assignmentKeys,
    useCancelSolverRun,
    useCurrentPlan,
    useOptimization,
    usePlanWorkspace,
    useSolverRun,
    useStartSolverRun,
} from '@/features/assignment/queries';
import type { SolverRunDto } from '@/features/assignment/types';
import { useAssignmentRoundsQuery } from '@/features/catalogs/queries';
import {
    DEMAND_TYPE_LABELS,
    OPTIMIZATION_CONFIG_OPTIONS,
    RULE_SET_VERSION_OPTIONS,
    formatPeriods,
} from '@/features/preparation/model';
import { useRoundSelection } from '@/features/preparation/round-context';
import {
    SOLVER_STAGE_META,
    formatDateTimeShort,
    formatRunDuration,
    interpretSolverRun,
    isSolverRunActive,
} from '@/features/results/model';
import { RolePageHeader, RoleStateCard } from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ApiError, parseSolverRunLocation } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/icon';
import { useToast } from '@/shared/ui/toast-context';
import '../results/results.css';

function positiveRunId(raw: string | null): number | null {
    if (!raw) return null;
    if (!/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function readSolverErrorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return 'Yêu cầu tới bộ giải đề xuất thất bại.';
}

export function SolverRunsPage() {
    const client = useQueryClient();
    const toast = useToast();
    const isMockMode = import.meta.env.VITE_DATA_SOURCE === 'mock';
    const { contextId, activeContext } = useSession();
    const [params, setParams] = useSearchParams();
    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const rounds = roundsQuery.data ?? [];
    const { activeRound, selectRoundId } = useRoundSelection(
        rounds,
        contextId,
        activeContext?.round,
    );

    const planQuery = useCurrentPlan(activeRound?.id ?? null);
    const plan = planQuery.data ?? null;
    const optimizationQuery = useOptimization(plan?.version_id ?? null);
    const workspaceQuery = usePlanWorkspace(plan?.version_id ?? null);

    const [overrideConfigId, setOverrideConfigId] = useState<number | null>(
        null,
    );
    const [overrideRuleId, setOverrideRuleId] = useState<number | null>(null);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [inspectedRunId, setInspectedRunId] = useState<number | null>(null);
    const [submitAlert, setSubmitAlert] = useState<{
        tone: 'amber' | 'red';
        message: string;
    } | null>(null);

    const selectedConfigId =
        overrideConfigId ?? plan?.optimization_config_id ?? 1;
    const selectedRuleId = overrideRuleId ?? plan?.rule_set_version_id ?? 1;

    const urlRunId = positiveRunId(params.get('run_id'));
    const latestOptRunId = optimizationQuery.data?.latest_run_id ?? null;
    const trackedRunId = urlRunId ?? latestOptRunId;

    const runQuery = useSolverRun(trackedRunId, (settled) => {
        const outcome = interpretSolverRun(settled);
        if (outcome.applied) {
            toast({
                title: 'Đã áp dụng đề xuất vào bản nháp',
                description: outcome.noOpApplied
                    ? 'Không phát sinh thay đổi mới; revision giữ nguyên.'
                    : `Cập nhật lên revision r${settled.applied_revision_no ?? settled.base_revision}.`,
                tone: 'success',
            });
        } else if (outcome.badge === 'STALE') {
            toast({
                title: 'Đề xuất không được áp dụng (STALE)',
                description: 'Bản nháp hoặc nguồn đã thay đổi trong lúc chạy.',
                tone: 'error',
            });
        }
    });

    const startMutation = useStartSolverRun();
    const cancelMutation = useCancelSolverRun();

    const currentRun: SolverRunDto | null =
        runQuery.data ?? optimizationQuery.data?.run ?? null;
    const activeInterpretation = currentRun
        ? interpretSolverRun(currentRun)
        : null;

    const setRunIdParam = (id: number | null) => {
        const next = new URLSearchParams(params);
        if (id === null) next.delete('run_id');
        else next.set('run_id', String(id));
        setParams(next, { replace: true });
    };

    const canSubmit = Boolean(
        plan &&
        plan.is_current &&
        plan.status === 'DRAFT' &&
        plan.snapshot_fresh &&
        !(currentRun && isSolverRunActive(currentRun.status)) &&
        !startMutation.isPending,
    );

    async function handleStartSolver() {
        if (!plan) return;
        setSubmitAlert(null);
        try {
            const accepted = await startMutation.mutateAsync({
                version: plan.version_id,
                input: {
                    expected_revision: plan.revision_no,
                    optimization_config_id: selectedConfigId,
                    rule_set_version_id: selectedRuleId,
                },
            });
            const locRunId = parseSolverRunLocation(accepted.location);
            setRunIdParam(locRunId ?? accepted.id);
            toast({
                title: `Đã gửi lượt chạy #${accepted.id}`,
                description: 'Hệ thống đang theo dõi tiến trình xử lý.',
                tone: 'info',
            });
        } catch (error) {
            if (error instanceof ApiError) {
                if (
                    error.status === 409 &&
                    error.code === 'SOLVER_RUN_ACTIVE'
                ) {
                    const activeId =
                        parseSolverRunLocation(error.location) ??
                        (typeof error.details === 'object' &&
                        error.details !== null &&
                        'solver_run_id' in error.details &&
                        typeof error.details.solver_run_id === 'number'
                            ? error.details.solver_run_id
                            : null);
                    if (activeId) {
                        setRunIdParam(activeId);
                    }
                    setSubmitAlert({
                        tone: 'amber',
                        message: activeId
                            ? `Đợt này đã có lượt sinh đề xuất hoạt động (#${activeId}). Đang tự động theo dõi lượt chạy đó.`
                            : error.message,
                    });
                    return;
                }
                if (
                    error.status === 503 &&
                    error.code === 'SOLVER_QUEUE_FULL'
                ) {
                    setSubmitAlert({
                        tone: 'amber',
                        message:
                            'Hàng đợi sinh đề xuất hiện đang đầy (503). Bản nháp hiện tại được giữ nguyên; vui lòng thử lại sau.',
                    });
                    return;
                }
                setSubmitAlert({ tone: 'red', message: error.message });
                return;
            }
            setSubmitAlert({
                tone: 'red',
                message: readSolverErrorMessage(error),
            });
        }
    }

    async function handleCancelRun(runId: number) {
        setSubmitAlert(null);
        try {
            const updated = await cancelMutation.mutateAsync(runId);
            toast({
                title:
                    updated.status === 'CANCELLED'
                        ? `Đã hủy lượt #${runId}`
                        : `Đã gửi yêu cầu hủy lượt #${runId}`,
                description: 'Bản nháp đang lưu vẫn nguyên vẹn.',
                tone: 'info',
            });
        } catch (error) {
            setSubmitAlert({
                tone: 'red',
                message: readSolverErrorMessage(error),
            });
        }
    }

    if (roundsQuery.isPending) {
        return (
            <RoleStateCard
                kind="loading"
                title="Đang tải danh sách đợt phân công…"
                detail="Đang đồng bộ thông tin phiên bản và trạng thái bộ giải."
            />
        );
    }

    if (roundsQuery.isError || !activeRound) {
        return (
            <RoleStateCard
                kind={roundsQuery.isError ? 'error' : 'empty'}
                title={
                    roundsQuery.isError
                        ? 'Không tải được đợt phân công'
                        : 'Chưa có đợt phân công'
                }
                detail={
                    roundsQuery.isError
                        ? readSolverErrorMessage(roundsQuery.error)
                        : 'Tạo đợt phân công và chuẩn bị dữ liệu trước khi chạy bộ giải.'
                }
                actions={
                    <Link
                        to={roundPath(
                            '/preparation',
                            activeRound?.id,
                            contextId,
                        )}
                        className="btn small"
                    >
                        Mở Chuẩn bị dữ liệu
                    </Link>
                }
            />
        );
    }

    const opt = optimizationQuery.data ?? null;
    const config = (opt?.configuration ?? null) as Record<
        string,
        unknown
    > | null;
    const stageSeconds = (
        typeof config?.stage_seconds === 'object' &&
        config?.stage_seconds !== null
            ? config.stage_seconds
            : { Z: 8, L1: 8, M: 6, experience: 4, change: 4 }
    ) as Record<string, unknown>;
    const gradeWeights = (
        typeof config?.grade_weights === 'object' &&
        config?.grade_weights !== null
            ? config.grade_weights
            : { '9': 3, '12': 4, other: 1 }
    ) as Record<string, unknown>;

    const historyRuns: SolverRunDto[] = (() => {
        const list = isMockMode
            ? [...(workspaceQuery.data?.solver_runs ?? [])]
            : [];
        if (currentRun && !list.some((r) => r.id === currentRun.id)) {
            list.unshift(currentRun);
        }
        if (opt?.run && !list.some((r) => r.id === opt.run!.id)) {
            list.push(opt.run);
        }
        return list.sort((a, b) => b.id - a.id);
    })();

    const inspectedRun =
        inspectedRunId !== null
            ? (historyRuns.find((item) => item.id === inspectedRunId) ??
              (currentRun?.id === inspectedRunId ? currentRun : null))
            : null;
    const inspectedDiff =
        inspectedRun && isMockMode
            ? (workspaceQuery.data?.solver_diffs?.[inspectedRun.id] ?? [])
            : [];

    const stageKeys = ['Z', 'L1', 'M', 'experience', 'change'] as const;
    const vectorValues =
        currentRun?.summary?.coverage?.metrics?.objectiveVector ??
        opt?.objective_vector ??
        null;

    return (
        <div>
            <RolePageHeader
                roundLabel={activeRound.round_code}
                contextLabel={
                    plan
                        ? `V${String(plan.version_no).padStart(2, '0')} · r${plan.revision_no}`
                        : 'Chưa có phương án'
                }
                title="Đề xuất có thể kiểm tra lại."
                description="Cấu hình năm mục tiêu và theo dõi từng lượt giải."
                actions={
                    <div className="mvp-actions">
                        <Link
                            to={roundPath(
                                '/assignment',
                                activeRound?.id,
                                contextId,
                            )}
                            className="btn"
                        >
                            <Icon name="matrix" />
                            Bảng phân công
                        </Link>
                        {plan ? (
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setConfigModalOpen(true)}
                            >
                                <Icon name="rules" />
                                Cấu hình
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="btn primary"
                            disabled={!canSubmit}
                            title={
                                currentRun &&
                                isSolverRunActive(currentRun.status)
                                    ? 'Đang có lượt chạy hoạt động — có thể hủy lượt hiện tại trước khi chạy mới.'
                                    : undefined
                            }
                            onClick={() => void handleStartSolver()}
                        >
                            <Icon name="spark" />
                            {startMutation.isPending
                                ? 'Đang gửi lượt…'
                                : 'Sinh đề xuất'}
                        </button>
                    </div>
                }
            />

            <div className="results-round-strip">
                <label>
                    Đợt phân công
                    <select
                        id="solver-round-select"
                        name="round_id"
                        aria-label="Chọn đợt phân công chạy solver"
                        value={activeRound.id}
                        onChange={(e) => {
                            setRunIdParam(null);
                            setOverrideConfigId(null);
                            setOverrideRuleId(null);
                            selectRoundId(Number(e.target.value));
                        }}
                    >
                        {rounds.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.round_code} ({item.status})
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Cấu hình tối ưu
                    <select
                        id="solver-config-select"
                        name="optimization_config_id"
                        aria-label="Chọn cấu hình tối ưu để chạy"
                        value={selectedConfigId}
                        onChange={(e) =>
                            setOverrideConfigId(Number(e.target.value))
                        }
                    >
                        {OPTIMIZATION_CONFIG_OPTIONS.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.code} · {item.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Bộ quy tắc tải
                    <select
                        id="solver-rule-select"
                        name="rule_set_version_id"
                        aria-label="Chọn bộ quy tắc để chạy"
                        value={selectedRuleId}
                        onChange={(e) =>
                            setOverrideRuleId(Number(e.target.value))
                        }
                    >
                        {RULE_SET_VERSION_OPTIONS.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.code} · {item.name}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {planQuery.isPending ? (
                <RoleStateCard
                    kind="loading"
                    title="Đang tải phiên bản phương án…"
                    detail="Đang kiểm tra trạng thái bản nháp và lần tối ưu gần nhất."
                />
            ) : planQuery.isError ? (
                <RoleStateCard
                    kind={
                        planQuery.error instanceof ApiError &&
                        planQuery.error.status === 404
                            ? 'empty'
                            : 'error'
                    }
                    title={
                        planQuery.error instanceof ApiError &&
                        planQuery.error.status === 404
                            ? 'Đợt này chưa có phương án phân công'
                            : 'Không đọc được phiên bản phương án'
                    }
                    detail={readSolverErrorMessage(planQuery.error)}
                    actions={
                        <Link
                            to={roundPath(
                                '/assignment',
                                activeRound?.id,
                                contextId,
                            )}
                            className="btn primary small"
                        >
                            Tạo bản nháp trong Phân công
                        </Link>
                    }
                />
            ) : plan ? (
                <>
                    {!plan.snapshot_fresh ? (
                        <div className="banner amber" role="alert">
                            <Icon name="warning" />
                            <span className="grow">
                                Snapshot đầu vào của phiên bản V
                                {String(plan.version_no).padStart(2, '0')} đã cũ
                                so với nguồn chuẩn bị. Hãy làm mới snapshot
                                trong Phân công trước khi chạy solver.
                            </span>
                            <Link
                                to={roundPath(
                                    '/assignment',
                                    activeRound?.id,
                                    contextId,
                                )}
                                className="btn small"
                            >
                                Tới Phân công
                            </Link>
                        </div>
                    ) : null}

                    {plan.status !== 'DRAFT' || !plan.is_current ? (
                        <div className="banner amber" role="alert">
                            <Icon name="lock" />
                            <span className="grow">
                                Phiên bản đang ở trạng thái{' '}
                                <strong>{plan.status}</strong> (không phải bản
                                nháp hiện hành) nên chỉ cho xem lịch sử tối ưu.
                            </span>
                        </div>
                    ) : null}

                    {submitAlert ? (
                        <div
                            className={`banner ${submitAlert.tone === 'red' ? 'red' : 'amber'}`}
                            role="alert"
                        >
                            <Icon name="warning" />
                            <span className="grow">{submitAlert.message}</span>
                            <button
                                type="button"
                                className="btn small"
                                onClick={() => setSubmitAlert(null)}
                            >
                                Đóng
                            </button>
                        </div>
                    ) : null}

                    <div className="mvp-note">
                        <Icon name="spark" />
                        <span>
                            Thứ tự tối ưu từ điển cố định{' '}
                            <strong>Z → L1 → M → kinh nghiệm → thay đổi</strong>
                            .
                            {currentRun?.summary?.demo_only
                                ? ' Kết quả từ engine hiện tại dùng cho thử nghiệm (demo_only); chứng minh tối ưu hoặc từ bỏ chỉ dựa trên cờ exactOptimalityProven từ solver.'
                                : ' Các phân công đã khóa luôn giữ cứng; bản nháp chỉ thay đổi khi backend báo apply_outcome = APPLIED.'}
                        </span>
                    </div>

                    <div className="mvp-vector">
                        {stageKeys.map((key, idx) => {
                            const meta = SOLVER_STAGE_META[key]!;
                            const budget = stageSeconds[key];
                            const val = vectorValues?.[idx];
                            const stageSummary =
                                currentRun?.summary?.stages.find(
                                    (s) => s.name === key,
                                );
                            return (
                                <div key={key}>
                                    <small>{meta.shortLabel}</small>
                                    <strong>
                                        {val !== undefined && val !== null
                                            ? val
                                            : budget !== undefined
                                              ? `${String(budget)}s`
                                              : '—'}
                                    </strong>
                                    <p>
                                        {meta.label}
                                        {stageSummary ? (
                                            <>
                                                <br />
                                                <span className="mvp-code">
                                                    {stageSummary.status} ·{' '}
                                                    {stageSummary.exactOptimalityProven
                                                        ? 'exact'
                                                        : 'no proof'}
                                                </span>
                                            </>
                                        ) : null}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mvp-page-meta">
                        <span>
                            Ngân sách tổng {String(config?.total_seconds ?? 30)}
                            s · Khối 9/12: {String(gradeWeights['9'] ?? 3)}/
                            {String(gradeWeights['12'] ?? 4)} · Khối khác:{' '}
                            {String(gradeWeights.other ?? 1)} ·{' '}
                            {config?.preserve_policy === 'REOPTIMIZE'
                                ? 'Tối ưu lại toàn bộ dòng mở'
                                : 'Giữ mềm phân công hiện hành'}
                        </span>
                        <span
                            className={`mvp-status ${
                                opt?.matches_version
                                    ? 'PASS'
                                    : 'INSUFFICIENT_DATA'
                            }`}
                        >
                            {opt?.matches_version
                                ? 'Khớp revision hiện hành'
                                : opt?.latest_run_id
                                  ? 'Chưa khớp bản đang lưu'
                                  : 'Chưa có lượt chạy'}
                        </span>
                    </div>

                    {urlRunId !== null && runQuery.isError ? (
                        <div className="banner amber" role="alert">
                            <Icon name="warning" />
                            <span className="grow">
                                Không tìm thấy lượt chạy #{urlRunId} (có thể dữ
                                liệu mô phỏng đã khởi tạo lại hoặc ID không hợp
                                lệ).
                            </span>
                            <button
                                type="button"
                                className="btn small"
                                onClick={() => setRunIdParam(null)}
                            >
                                Quay lại phiên bản hiện tại
                            </button>
                        </div>
                    ) : null}

                    {currentRun && activeInterpretation ? (
                        <section className="panel results-solver-panel">
                            <div className="results-solver-head">
                                <div>
                                    <div className="eyebrow">
                                        <span>Lượt #{currentRun.id}</span>
                                        <span>·</span>
                                        <span>
                                            V
                                            {String(plan.version_no).padStart(
                                                2,
                                                '0',
                                            )}
                                            /r{currentRun.base_revision}
                                        </span>
                                        {currentRun.applied_revision_no !==
                                        null ? (
                                            <>
                                                <span>→</span>
                                                <span>
                                                    r
                                                    {
                                                        currentRun.applied_revision_no
                                                    }
                                                </span>
                                            </>
                                        ) : null}
                                    </div>
                                    <h2>{activeInterpretation.title}</h2>
                                    <p
                                        className="muted"
                                        style={{ fontSize: 12, marginTop: 4 }}
                                    >
                                        {activeInterpretation.description}
                                    </p>
                                </div>
                                <div className="mvp-actions">
                                    <span
                                        className={`mvp-status ${activeInterpretation.tone}`}
                                    >
                                        {activeInterpretation.badge}
                                    </span>
                                    {currentRun.summary?.cp_sat_status ? (
                                        <span className="mvp-status">
                                            {currentRun.summary.demo_only &&
                                            !currentRun.summary.coverage
                                                ?.optimality_proven &&
                                            currentRun.summary.cp_sat_status !==
                                                'INFEASIBLE'
                                                ? `${currentRun.summary.cp_sat_status} (HEURISTIC)`
                                                : currentRun.summary
                                                      .cp_sat_status}
                                        </span>
                                    ) : null}
                                    {activeInterpretation.active ? (
                                        <button
                                            type="button"
                                            className="btn danger"
                                            disabled={
                                                cancelMutation.isPending ||
                                                currentRun.status ===
                                                    'CANCEL_REQUESTED'
                                            }
                                            onClick={() =>
                                                void handleCancelRun(
                                                    currentRun.id,
                                                )
                                            }
                                        >
                                            <Icon name="close" />
                                            {currentRun.status ===
                                            'CANCEL_REQUESTED'
                                                ? 'Đang hủy…'
                                                : 'Hủy lượt chạy'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() =>
                                                setInspectedRunId(currentRun.id)
                                            }
                                        >
                                            Chi tiết lượt chạy
                                        </button>
                                    )}
                                </div>
                            </div>

                            {activeInterpretation.active ? (
                                <div className="results-solver-steps">
                                    <div
                                        className={`run-step ${
                                            currentRun.status === 'QUEUED'
                                                ? 'running'
                                                : 'complete'
                                        }`}
                                    >
                                        <Icon
                                            name={
                                                currentRun.status === 'QUEUED'
                                                    ? 'clock'
                                                    : 'check'
                                            }
                                        />
                                        <span>1. Xếp hàng & chuẩn bị</span>
                                    </div>
                                    <div
                                        className={`run-step ${
                                            currentRun.status === 'RUNNING' ||
                                            currentRun.status ===
                                                'CANCEL_REQUESTED'
                                                ? 'running'
                                                : ''
                                        }`}
                                    >
                                        <Icon name="spark" />
                                        <span>2. Giải bài toán 5 mục tiêu</span>
                                    </div>
                                    <div className="run-step">
                                        <Icon name="shield" />
                                        <span>
                                            3. Kiểm tra & áp dụng bản nháp
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="results-config-grid">
                                    <div className="results-config-item">
                                        <small>Thời gian giải / Áp dụng</small>
                                        <strong>
                                            {formatRunDuration(
                                                currentRun.solve_ms,
                                            )}{' '}
                                            /{' '}
                                            {formatRunDuration(
                                                currentRun.apply_ms,
                                            )}
                                        </strong>
                                    </div>
                                    <div className="results-config-item">
                                        <small>Tình trạng kết thúc</small>
                                        <strong>
                                            {currentRun.summary
                                                ?.termination_reason ??
                                                currentRun.failure_code ??
                                                currentRun.status}
                                        </strong>
                                    </div>
                                    <div className="results-config-item">
                                        <small>Hậu kiểm sau áp dụng</small>
                                        <strong>
                                            {currentRun.summary
                                                ?.post_validation_status ??
                                                (activeInterpretation.applied
                                                    ? 'Đã đồng bộ'
                                                    : 'Chưa áp dụng')}
                                        </strong>
                                    </div>
                                </div>
                            )}

                            {!activeInterpretation.active &&
                            !activeInterpretation.applied ? (
                                <div
                                    className="mvp-note warning"
                                    style={{ marginBottom: 0 }}
                                >
                                    <Icon name="warning" />
                                    <span className="grow">
                                        Kết quả của lượt #{currentRun.id} chưa
                                        được áp dụng vào phương án đang lưu.
                                        Bảng phân công và bảng tải hiện tại vẫn
                                        giữ nguyên từ revision r
                                        {plan.revision_no}.
                                    </span>
                                    {activeInterpretation.badge === 'STALE' ? (
                                        <button
                                            type="button"
                                            className="btn small"
                                            onClick={() =>
                                                void client.invalidateQueries({
                                                    queryKey:
                                                        assignmentKeys.all,
                                                })
                                            }
                                        >
                                            Tải lại bản hiện hành
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}

                            {activeInterpretation.applied ? (
                                <div className="mvp-actions section-gap">
                                    <Link
                                        to={roundPath(
                                            '/assignment',
                                            activeRound?.id,
                                            contextId,
                                        )}
                                        className="btn primary small"
                                    >
                                        <Icon name="matrix" />
                                        Xem bảng phân công đã lưu
                                    </Link>
                                    <Link
                                        to={roundPath(
                                            '/checks',
                                            activeRound?.id,
                                            contextId,
                                        )}
                                        className="btn small"
                                    >
                                        <Icon name="check" />
                                        Kiểm tra phương án
                                    </Link>
                                    <Link
                                        to={roundPath(
                                            '/workload',
                                            activeRound?.id,
                                            contextId,
                                        )}
                                        className="btn small"
                                    >
                                        <Icon name="balance" />
                                        Đối chiếu tải
                                    </Link>
                                </div>
                            ) : null}
                        </section>
                    ) : null}

                    <section className="panel">
                        <div className="panel-head">
                            <div>
                                <h2>Lịch sử lượt sinh đề xuất</h2>
                                <p>
                                    Theo dõi trạng thái backend, chứng minh tối
                                    ưu và kết quả áp dụng từng lượt
                                </p>
                            </div>
                        </div>
                        {historyRuns.length > 0 ? (
                            <div className="table-scroll">
                                <table className="data-table mvp-table">
                                    <thead>
                                        <tr>
                                            <th>LƯỢT / THỜI GIAN</th>
                                            <th>NGUỒN</th>
                                            <th>TRẠNG THÁI</th>
                                            <th>KẾT QUẢ ÁP DỤNG</th>
                                            <th>VECTOR</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyRuns.map((run) => {
                                            const interp =
                                                interpretSolverRun(run);
                                            const vec =
                                                run.summary?.coverage?.metrics
                                                    ?.objectiveVector;
                                            return (
                                                <tr key={run.id}>
                                                    <td>
                                                        <strong>
                                                            #{run.id}
                                                        </strong>
                                                        <small>
                                                            {formatDateTimeShort(
                                                                run.queued_at,
                                                            )}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        V
                                                        {String(
                                                            plan.version_no,
                                                        ).padStart(2, '0')}
                                                        /r{run.base_revision}
                                                        <small>
                                                            {run.applied_revision_no !==
                                                            null
                                                                ? `→ r${run.applied_revision_no}`
                                                                : 'Không đổi revision'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`mvp-status ${interp.tone}`}
                                                        >
                                                            {run.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`mvp-status ${
                                                                run.summary
                                                                    ?.apply_outcome ===
                                                                'APPLIED'
                                                                    ? 'PASS'
                                                                    : interp.tone
                                                            }`}
                                                        >
                                                            {run.summary
                                                                ?.apply_outcome ??
                                                                interp.badge}
                                                        </span>
                                                    </td>
                                                    <td className="mono">
                                                        {vec
                                                            ? vec.join(' / ')
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        <div className="mvp-actions">
                                                            <button
                                                                type="button"
                                                                className="btn small"
                                                                onClick={() => {
                                                                    setRunIdParam(
                                                                        run.id,
                                                                    );
                                                                    setInspectedRunId(
                                                                        run.id,
                                                                    );
                                                                }}
                                                            >
                                                                Xem lượt
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="mvp-empty">
                                Chưa có lượt chạy đề xuất nào cho phiên bản V
                                {String(plan.version_no).padStart(2, '0')}. Bấm
                                “Sinh đề xuất” để chạy thử với cấu hình đang
                                chọn.
                            </div>
                        )}
                    </section>
                </>
            ) : null}

            <Dialog
                open={configModalOpen}
                variant="prototype"
                onOpenChange={setConfigModalOpen}
                title="Cấu hình năm mục tiêu đang dùng"
                description="Thứ tự từ điển cố định Z → L1 → M → kinh nghiệm → thay đổi; không gộp trọng số."
            >
                <div className="mvp-note">
                    <Icon name="rules" />
                    <span>
                        Để đổi cấu hình tối ưu hoặc bộ quy tắc của lượt kế tiếp,
                        chọn trực tiếp ở thanh tham số phía trên trước khi bấm{' '}
                        <strong>Sinh đề xuất</strong>.
                    </span>
                </div>
                <pre className="mvp-json">
                    {JSON.stringify(
                        {
                            optimization_config_id: selectedConfigId,
                            rule_set_version_id: selectedRuleId,
                            ...(config ?? {}),
                        },
                        null,
                        2,
                    )}
                </pre>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn primary"
                        onClick={() => setConfigModalOpen(false)}
                    >
                        Đóng
                    </button>
                </div>
            </Dialog>

            <Dialog
                open={Boolean(inspectedRun)}
                variant="prototype"
                wide
                onOpenChange={(open) => {
                    if (!open) setInspectedRunId(null);
                }}
                title={
                    inspectedRun
                        ? `Chi tiết lượt sinh đề xuất #${inspectedRun.id}`
                        : 'Chi tiết lượt chạy'
                }
                description={
                    inspectedRun
                        ? `${interpretSolverRun(inspectedRun).title} · Thời gian giải ${formatRunDuration(inspectedRun.solve_ms)}`
                        : ''
                }
            >
                {inspectedRun ? (
                    <>
                        <div className="mvp-page-meta" style={{ marginTop: 0 }}>
                            <span>
                                Revision gốc: r{inspectedRun.base_revision} ·
                                Hash:{' '}
                                <code className="mvp-code">
                                    {inspectedRun.input_hash ?? '—'}
                                </code>
                            </span>
                            <span
                                className={`mvp-status ${interpretSolverRun(inspectedRun).tone}`}
                            >
                                {interpretSolverRun(inspectedRun).badge}
                            </span>
                        </div>

                        {inspectedRun.summary?.stages.length ? (
                            <div className="mvp-vector">
                                {inspectedRun.summary.stages.map((s) => (
                                    <div key={s.name}>
                                        <small>{s.name}</small>
                                        <strong>
                                            {s.objective !== null
                                                ? s.objective
                                                : '—'}
                                        </strong>
                                        <p>
                                            {s.status} · exact:{' '}
                                            {String(s.exactOptimalityProven)}
                                            <br />
                                            bound: {s.best_bound ?? '—'} ·{' '}
                                            {formatRunDuration(s.elapsed_ms)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {inspectedDiff.length > 0 ? (
                            <div className="section-gap">
                                <h3 style={{ marginBottom: 10 }}>
                                    Thay đổi so với bản gốc (
                                    {inspectedDiff.length})
                                </h3>
                                <div className="table-scroll">
                                    <table className="data-table mvp-table">
                                        <thead>
                                            <tr>
                                                <th>LỚP / MÔN</th>
                                                <th>TRƯỚC</th>
                                                <th>SAU</th>
                                                <th>GHI CHÚ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inspectedDiff.map((item) => (
                                                <tr
                                                    key={item.row_id}
                                                    className={
                                                        item.before_teacher_id !==
                                                        item.after_teacher_id
                                                            ? 'diff-changed'
                                                            : ''
                                                    }
                                                >
                                                    <td>
                                                        <strong>
                                                            {item.class_name}
                                                        </strong>
                                                        <small>
                                                            {item.subject_name}{' '}
                                                            ·{' '}
                                                            {
                                                                DEMAND_TYPE_LABELS[
                                                                    item
                                                                        .demand_type
                                                                ]
                                                            }{' '}
                                                            ·{' '}
                                                            {formatPeriods(
                                                                item.periods_per_week,
                                                            )}{' '}
                                                            tiết
                                                        </small>
                                                    </td>
                                                    <td className="diff-before">
                                                        {item.before_teacher_name ??
                                                            'Chưa gán'}
                                                    </td>
                                                    <td className="diff-after">
                                                        {item.after_teacher_name ??
                                                            'Chưa gán'}
                                                    </td>
                                                    <td>
                                                        <span className="mvp-reason">
                                                            {item.reason_text ??
                                                                item.reason_code ??
                                                                '—'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}

                        <div className="mvp-note">
                            <Icon name="shield" />
                            <span>
                                {inspectedRun.summary?.apply_outcome ===
                                'APPLIED'
                                    ? 'Kết quả đã được áp dụng lên bản nháp hiện hành. Các dòng khóa giữ nguyên không đổi.'
                                    : 'Kết quả này chưa áp dụng vào bản nháp; phân công hiện tại của bạn vẫn giữ nguyên.'}
                            </span>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => setInspectedRunId(null)}
                            >
                                Đóng
                            </button>
                        </div>
                    </>
                ) : null}
            </Dialog>
        </div>
    );
}
