import { roundPath } from '@/features/preparation/round-navigation';
import '@/pages/preparation/preparation-ui.css';
import '../results/results.css';
import { ReadinessIssue } from '@/features/preparation/readiness-issue';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
    useCurrentPlan,
    usePlanValidation,
    useRunValidation,
} from '@/features/assignment/queries';
import { useAssignmentRoundsQuery } from '@/features/catalogs/queries';
import {
    buildReadinessQuery,
    formatPreparationApiError,
    OPTIMIZATION_CONFIG_OPTIONS,
    RULE_SET_VERSION_OPTIONS,
} from '@/features/preparation/model';
import { useRoundReadinessQuery } from '@/features/preparation/queries';
import { useRoundSelection } from '@/features/preparation/round-context';
import type { ReadinessSeverity } from '@/features/preparation/types';
import {
    formatDateTimeShort,
    isReportReleasable,
    validationFindingRoute,
    validationStatusLabel,
} from '@/features/results/model';
import {
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Icon } from '@/shared/ui/icon';
import { useToast } from '@/shared/ui/toast-context';

type SeverityTab = 'ALL' | ReadinessSeverity;
type ChecksTab = 'validation' | 'readiness';
type ValidationFilter = 'ALL' | 'VIOLATION' | 'INSUFFICIENT_DATA' | 'PASS';

export function ChecksPage() {
    const toast = useToast();
    const { contextId, activeContext } = useSession();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab: ChecksTab =
        searchParams.get('tab') === 'readiness' ? 'readiness' : 'validation';

    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const rounds = roundsQuery.data ?? [];

    const { activeRound, selectRoundId } = useRoundSelection(
        rounds,
        contextId,
        activeContext?.round,
    );

    const planQuery = useCurrentPlan(activeRound?.id ?? null);
    const plan = planQuery.data ?? null;
    const validationQuery = usePlanValidation(plan?.version_id ?? null);
    const runValidationMutation = useRunValidation();
    const [validationFilter, setValidationFilter] =
        useState<ValidationFilter>('ALL');

    const [configIdInput, setConfigIdInput] = useState<string>('1');
    const [ruleSetIdInput, setRuleSetIdInput] = useState<string>(() =>
        contextId === 'thcs-demo' ? '2' : '1',
    );
    const [severityTab, setSeverityTab] = useState<SeverityTab>('ALL');

    const hasConfig = Boolean(configIdInput);
    const hasRuleSet = Boolean(ruleSetIdInput);
    const isPairedValid = hasConfig === hasRuleSet;

    const readinessParams = useMemo(() => {
        if (!isPairedValid) return {};
        return buildReadinessQuery(
            configIdInput ? Number(configIdInput) : null,
            ruleSetIdInput ? Number(ruleSetIdInput) : null,
        );
    }, [isPairedValid, configIdInput, ruleSetIdInput]);

    const readinessQuery = useRoundReadinessQuery(
        activeRound?.id ?? null,
        readinessParams,
        Boolean(activeRound) && isPairedValid,
    );

    const readiness = readinessQuery.data;
    const issues = useMemo(() => readiness?.issues ?? [], [readiness?.issues]);

    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = issues.filter((i) => i.severity === 'INFO').length;

    const filteredIssues = useMemo(
        () =>
            severityTab === 'ALL'
                ? issues
                : issues.filter((issue) => issue.severity === severityTab),
        [issues, severityTab],
    );

    const report = validationQuery.data ?? null;
    const validationNotFound =
        validationQuery.isError &&
        validationQuery.error instanceof ApiError &&
        validationQuery.error.status === 404;
    const findings = report?.results ?? [];
    const passFindings = findings.filter(
        (item) => item.result_status === 'PASS',
    ).length;
    const violationFindings = findings.filter(
        (item) => item.result_status === 'VIOLATION',
    ).length;
    const insufficientFindings = findings.filter(
        (item) => item.result_status === 'INSUFFICIENT_DATA',
    ).length;
    const filteredFindings =
        validationFilter === 'ALL'
            ? findings
            : findings.filter(
                  (item) => item.result_status === validationFilter,
              );
    const releasable = isReportReleasable(report);

    const setTab = (tab: ChecksTab) => {
        const next = new URLSearchParams(searchParams);
        if (tab === 'validation') next.delete('tab');
        else next.set('tab', tab);
        setSearchParams(next, { replace: true });
    };

    async function handleRunValidation() {
        if (!plan) return;
        try {
            const nextReport = await runValidationMutation.mutateAsync({
                version: plan.version_id,
                input: { expected_revision: plan.revision_no },
            });
            toast({
                title: `Đã chạy kiểm tra phương án (${validationStatusLabel(nextReport.overall_status)})`,
                description: `V${String(plan.version_no).padStart(2, '0')} · r${nextReport.revision_no}`,
                tone:
                    nextReport.overall_status === 'VIOLATION'
                        ? 'error'
                        : 'success',
            });
        } catch (error) {
            toast({
                title: 'Không chạy được kiểm tra phương án',
                description:
                    error instanceof Error
                        ? error.message
                        : 'Thử tải lại phương án trước khi kiểm tra.',
                tone: 'error',
            });
        }
    }

    return (
        <div className="fe05-page">
            <div className="page-control-row">
                <RolePageHeader
                    roundLabel={activeRound?.round_code}
                    contextLabel={
                        plan
                            ? `V${String(plan.version_no).padStart(2, '0')} · r${plan.revision_no}`
                            : undefined
                    }
                    title="Kiểm tra có căn cứ. Quyết định rõ ràng."
                    description="Kết quả gắn với phiên bản, revision, snapshot nguồn và bộ quy tắc đang chọn."
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
                            {activeTab === 'validation' ? (
                                <button
                                    type="button"
                                    className="btn primary"
                                    disabled={
                                        !plan || runValidationMutation.isPending
                                    }
                                    onClick={() => void handleRunValidation()}
                                >
                                    <Icon name="check" />
                                    {runValidationMutation.isPending
                                        ? 'Đang kiểm tra…'
                                        : 'Chạy kiểm tra phương án'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn primary"
                                    disabled={
                                        !activeRound ||
                                        !isPairedValid ||
                                        readinessQuery.isFetching
                                    }
                                    onClick={() =>
                                        void readinessQuery.refetch()
                                    }
                                >
                                    <Icon name="reset" />
                                    {readinessQuery.isFetching
                                        ? 'Đang kiểm tra…'
                                        : 'Chạy tiền kiểm lại'}
                                </button>
                            )}
                        </div>
                    }
                />

                <div className="mvp-toolbar">
                    <div
                        className="mvp-tabs"
                        role="tablist"
                        aria-label="Loại kiểm tra"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'validation'}
                            className={
                                activeTab === 'validation' ? 'active' : ''
                            }
                            onClick={() => setTab('validation')}
                        >
                            Kiểm tra phương án
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'readiness'}
                            className={
                                activeTab === 'readiness' ? 'active' : ''
                            }
                            onClick={() => setTab('readiness')}
                        >
                            Tiền kiểm nguồn ({issues.length})
                        </button>
                    </div>
                    <select
                        id="checks-round-select"
                        name="round_id"
                        aria-label="Chọn đợt phân công"
                        value={activeRound?.id ?? ''}
                        onChange={(e) => {
                            const id = Number(e.target.value);
                            if (id) selectRoundId(id);
                        }}
                    >
                        {rounds.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.round_code} ({r.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {activeTab === 'validation' ? (
                <>
                    {planQuery.isPending ? (
                        <RoleStateCard
                            kind="loading"
                            title="Đang đọc phiên bản phương án…"
                            detail="Đang tải thông tin revision và báo cáo kiểm tra gần nhất."
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
                                    ? 'Đợt này chưa có phiên bản phương án'
                                    : 'Không tải được phiên bản phương án'
                            }
                            detail={
                                planQuery.error instanceof Error
                                    ? planQuery.error.message
                                    : 'Tạo phương án ở Phân công trước khi chạy kiểm tra.'
                            }
                            actions={
                                <Link
                                    to={roundPath(
                                        '/assignment',
                                        activeRound?.id,
                                        contextId,
                                    )}
                                    className="btn primary small"
                                >
                                    Mở Phân công
                                </Link>
                            }
                        />
                    ) : plan ? (
                        <>
                            {validationQuery.isPending ? (
                                <RoleStateCard
                                    kind="loading"
                                    title="Đang tải báo cáo kiểm tra phương án…"
                                    detail="Đang đối chiếu báo cáo gần nhất với revision và snapshot hiện tại."
                                />
                            ) : validationNotFound ? (
                                <div className="mvp-note warning">
                                    <Icon name="warning" />
                                    <span className="grow">
                                        Phiên bản V
                                        {String(plan.version_no).padStart(
                                            2,
                                            '0',
                                        )}
                                        /r{plan.revision_no} chưa có báo cáo
                                        kiểm tra phương án. Chạy kiểm tra mới để
                                        xác nhận điều kiện mở đợt hoặc phát
                                        hành.
                                    </span>
                                    <button
                                        type="button"
                                        className="btn primary small"
                                        disabled={
                                            runValidationMutation.isPending
                                        }
                                        onClick={() =>
                                            void handleRunValidation()
                                        }
                                    >
                                        Chạy kiểm tra ngay
                                    </button>
                                </div>
                            ) : validationQuery.isError ? (
                                <RoleStateCard
                                    kind="error"
                                    title="Không đọc được báo cáo kiểm tra phương án"
                                    detail={
                                        validationQuery.error instanceof Error
                                            ? validationQuery.error.message
                                            : 'Lỗi kết nối.'
                                    }
                                    actions={
                                        <button
                                            type="button"
                                            className="btn small"
                                            onClick={() =>
                                                void validationQuery.refetch()
                                            }
                                        >
                                            Thử lại
                                        </button>
                                    }
                                />
                            ) : report ? (
                                <>
                                    <div className="mvp-page-meta">
                                        <span>
                                            #{report.id} · V
                                            {String(plan.version_no).padStart(
                                                2,
                                                '0',
                                            )}
                                            /r{report.revision_no} ·{' '}
                                            {formatDateTimeShort(
                                                report.checked_at,
                                            )}{' '}
                                            · {report.validator_version}
                                        </span>
                                        <div className="mvp-actions">
                                            <span
                                                className={`mvp-status ${report.overall_status}`}
                                            >
                                                {validationStatusLabel(
                                                    report.overall_status,
                                                )}
                                            </span>
                                            <span
                                                className={`mvp-status ${
                                                    report.fresh &&
                                                    plan.snapshot_fresh
                                                        ? 'PASS'
                                                        : 'INSUFFICIENT_DATA'
                                                }`}
                                            >
                                                {report.fresh &&
                                                plan.snapshot_fresh
                                                    ? 'Kết quả hiện hành'
                                                    : 'Đã cũ · cần kiểm tra lại'}
                                            </span>
                                        </div>
                                    </div>

                                    {!report.fresh || !plan.snapshot_fresh ? (
                                        <div
                                            className="banner amber"
                                            role="alert"
                                        >
                                            <Icon name="warning" />
                                            <span className="grow">
                                                Phân công hoặc dữ liệu nguồn đã
                                                thay đổi sau lượt kiểm tra này
                                                (r{report.revision_no} vs r
                                                {plan.revision_no}). Cần chạy
                                                kiểm tra lại trước khi mở lấy ý
                                                kiến.
                                            </span>
                                            <button
                                                type="button"
                                                className="btn primary small"
                                                disabled={
                                                    runValidationMutation.isPending
                                                }
                                                onClick={() =>
                                                    void handleRunValidation()
                                                }
                                            >
                                                Kiểm tra lại
                                            </button>
                                        </div>
                                    ) : null}

                                    <div className="mvp-kpis">
                                        <div className="mvp-kpi kpi-sage">
                                            <span className="mvp-kpi-label">
                                                ĐẠT
                                                <i>
                                                    <Icon name="check" />
                                                </i>
                                            </span>
                                            <strong>{passFindings}</strong>
                                            <small>PASS</small>
                                        </div>
                                        <div
                                            className={`mvp-kpi ${violationFindings > 0 ? 'kpi-clay' : 'kpi-sage'}`}
                                        >
                                            <span className="mvp-kpi-label">
                                                VI PHẠM
                                                <i>
                                                    <Icon name="warning" />
                                                </i>
                                            </span>
                                            <strong>{violationFindings}</strong>
                                            <small>VIOLATION</small>
                                        </div>
                                        <div
                                            className={`mvp-kpi ${insufficientFindings > 0 ? 'kpi-brass' : ''}`}
                                        >
                                            <span className="mvp-kpi-label">
                                                THIẾU DỮ LIỆU
                                                <i>
                                                    <Icon name="help" />
                                                </i>
                                            </span>
                                            <strong>
                                                {insufficientFindings}
                                            </strong>
                                            <small>INSUFFICIENT_DATA</small>
                                        </div>
                                        <div className="mvp-kpi">
                                            <span className="mvp-kpi-label">
                                                ĐIỀU KIỆN MỞ
                                                <i>
                                                    <Icon name="shield" />
                                                </i>
                                            </span>
                                            <strong>
                                                {releasable
                                                    ? 'Đạt'
                                                    : 'Chưa đạt'}
                                            </strong>
                                            <small>
                                                {
                                                    report.summary.coverage
                                                        .assigned
                                                }
                                                /
                                                {
                                                    report.summary.coverage
                                                        .required
                                                }{' '}
                                                đã phân công
                                            </small>
                                        </div>
                                    </div>

                                    <div className="mvp-toolbar">
                                        <div
                                            className="mvp-tabs"
                                            role="tablist"
                                            aria-label="Lọc kết quả kiểm tra phương án"
                                        >
                                            {(
                                                [
                                                    [
                                                        'ALL',
                                                        `Tất cả (${findings.length})`,
                                                    ],
                                                    [
                                                        'VIOLATION',
                                                        `Vi phạm (${violationFindings})`,
                                                    ],
                                                    [
                                                        'INSUFFICIENT_DATA',
                                                        `Thiếu dữ liệu (${insufficientFindings})`,
                                                    ],
                                                    [
                                                        'PASS',
                                                        `Đạt (${passFindings})`,
                                                    ],
                                                ] as const
                                            ).map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={
                                                        validationFilter === key
                                                    }
                                                    className={
                                                        validationFilter === key
                                                            ? 'active'
                                                            : ''
                                                    }
                                                    onClick={() =>
                                                        setValidationFilter(key)
                                                    }
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        <span className="mvp-code">
                                            {report.source_revision_token}
                                        </span>
                                    </div>

                                    <section className="panel">
                                        {filteredFindings.length > 0 ? (
                                            filteredFindings.map((item, i) => {
                                                const target =
                                                    validationFindingRoute(
                                                        item,
                                                    );
                                                return (
                                                    <article
                                                        key={`${item.br_code}-${item.subject_ref}-${i}`}
                                                        className="mvp-check-result"
                                                    >
                                                        <div>
                                                            <span className="mvp-code">
                                                                {item.br_code}
                                                            </span>
                                                            <div
                                                                style={{
                                                                    marginTop: 4,
                                                                }}
                                                            >
                                                                <span
                                                                    className={`mvp-status ${item.result_status}`}
                                                                >
                                                                    {validationStatusLabel(
                                                                        item.result_status,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3>
                                                                {
                                                                    item.subject_ref
                                                                }{' '}
                                                                ·{' '}
                                                                {
                                                                    item.calculation_period
                                                                }
                                                            </h3>
                                                            <p>
                                                                {item.message}
                                                            </p>
                                                        </div>
                                                        <Link
                                                            to={roundPath(
                                                                target.path,
                                                                activeRound?.id,
                                                                contextId,
                                                            )}
                                                            className="btn small"
                                                        >
                                                            {target.label}
                                                            <Icon name="arrow" />
                                                        </Link>
                                                    </article>
                                                );
                                            })
                                        ) : (
                                            <div className="mvp-empty">
                                                Không có mục nào thuộc bộ lọc.
                                            </div>
                                        )}
                                    </section>

                                    <div className="mvp-note">
                                        <Icon name="help" />
                                        <span>
                                            Thiếu riêng tải năm không ngăn
                                            mở/phát hành đề xuất nếu mọi kiểm
                                            tra tuần đã đạt; cảnh báo này luôn
                                            được ghi vào báo cáo. Vi phạm năm đã
                                            xác định vẫn chặn.
                                        </span>
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : null}
                </>
            ) : (
                <>
                    <section className="panel">
                        <div className="panel-head">
                            <div>
                                <h2>Tham số đánh giá sẵn sàng (Readiness)</h2>
                                <p>
                                    Chọn cấu hình tối ưu cùng bộ quy tắc, hoặc
                                    để trống cả hai để chỉ kiểm tra dữ liệu nền.
                                </p>
                            </div>
                            {readiness ? (
                                <code className="mvp-code">
                                    {readiness.source_revision_token}
                                </code>
                            ) : null}
                        </div>
                        <div className="panel-body">
                            <div className="mvp-filter">
                                <select
                                    id="checks-config-select"
                                    name="optimization_config_id"
                                    aria-label="Chọn cấu hình tối ưu"
                                    value={configIdInput}
                                    onChange={(e) =>
                                        setConfigIdInput(e.target.value)
                                    }
                                >
                                    <option value="">
                                        Chưa chọn cấu hình tối ưu
                                    </option>
                                    {OPTIMIZATION_CONFIG_OPTIONS.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.code} · {opt.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    id="checks-rule-select"
                                    name="rule_set_version_id"
                                    aria-label="Chọn bộ quy tắc"
                                    value={ruleSetIdInput}
                                    onChange={(e) =>
                                        setRuleSetIdInput(e.target.value)
                                    }
                                >
                                    <option value="">
                                        Chưa chọn bộ quy tắc
                                    </option>
                                    {RULE_SET_VERSION_OPTIONS.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.code} · {opt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!isPairedValid ? (
                                <div className="mvp-note warning" role="alert">
                                    Cần chọn đồng thời cả Cấu hình tối ưu và Bộ
                                    quy tắc, hoặc đặt cả hai về “Chưa chọn” để
                                    xem trạng thái tiền kiểm trước cấu hình.
                                </div>
                            ) : null}
                        </div>
                    </section>

                    {readinessQuery.isError ? (
                        <div className="section-gap">
                            <RoleStateCard
                                kind="error"
                                title="Không thể đánh giá tiền kiểm readiness"
                                detail={formatPreparationApiError(
                                    readinessQuery.error,
                                )}
                                actions={
                                    <button
                                        type="button"
                                        className="btn small"
                                        onClick={() =>
                                            void readinessQuery.refetch()
                                        }
                                    >
                                        Thử lại
                                    </button>
                                }
                            />
                        </div>
                    ) : null}

                    {readiness ? (
                        <>
                            <div
                                className={`banner section-gap ${
                                    readiness.can_run_solver
                                        ? ''
                                        : errorCount > 0
                                          ? 'red'
                                          : 'amber'
                                }`}
                            >
                                <span className="school-symbol">
                                    <Icon
                                        name={
                                            readiness.can_run_solver
                                                ? 'check'
                                                : 'warning'
                                        }
                                    />
                                </span>
                                <div className="grow">
                                    <strong
                                        style={{
                                            color: 'var(--ink)',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {readiness.can_run_solver
                                            ? `Đợt ${activeRound?.round_code ?? ''} đủ điều kiện chạy bộ giải tối ưu`
                                            : `Đợt ${activeRound?.round_code ?? ''} chưa thể chạy bộ giải tối ưu`}
                                    </strong>
                                    <div
                                        className="muted"
                                        style={{ fontSize: 12, marginTop: 3 }}
                                    >
                                        Hiệu lực {readiness.starts_on} →{' '}
                                        {readiness.ends_on} ·{' '}
                                        {readiness.preflight_only
                                            ? 'Chỉ kiểm tra dữ liệu nguồn'
                                            : 'Đã kiểm tra đủ dữ liệu tối ưu'}
                                    </div>
                                </div>
                                <div className="mvp-actions">
                                    <PillBadge
                                        tone={
                                            readiness.can_run_solver
                                                ? ''
                                                : 'red'
                                        }
                                        dot
                                        label={
                                            readiness.can_run_solver
                                                ? 'Sẵn sàng chạy tối ưu'
                                                : 'Chưa sẵn sàng'
                                        }
                                    />
                                    {readiness.can_run_solver ? (
                                        <Link
                                            to={roundPath(
                                                '/solver-runs',
                                                activeRound?.id,
                                                contextId,
                                            )}
                                            className="btn small primary"
                                        >
                                            Mở Bộ giải đề xuất
                                        </Link>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mvp-kpis">
                                <div className="mvp-kpi kpi-sage">
                                    <span className="mvp-kpi-label">
                                        ĐẠT / THÔNG TIN
                                        <i>
                                            <Icon name="check" />
                                        </i>
                                    </span>
                                    <strong>{infoCount}</strong>
                                    <small>Mục thông tin & đạt chuẩn</small>
                                </div>
                                <div
                                    className={`mvp-kpi ${errorCount > 0 ? 'kpi-clay' : 'kpi-sage'}`}
                                >
                                    <span className="mvp-kpi-label">
                                        LỖI CHẶN (ERROR)
                                        <i>
                                            <Icon name="shield" />
                                        </i>
                                    </span>
                                    <strong>{errorCount}</strong>
                                    <small>Chặn chạy tối ưu / công bố</small>
                                </div>
                                <div
                                    className={`mvp-kpi ${warningCount > 0 ? 'kpi-brass' : ''}`}
                                >
                                    <span className="mvp-kpi-label">
                                        CẢNH BÁO (WARNING)
                                        <i>
                                            <Icon name="warning" />
                                        </i>
                                    </span>
                                    <strong>{warningCount}</strong>
                                    <small>Nên rà soát trước khi chốt</small>
                                </div>
                                <div className="mvp-kpi">
                                    <span className="mvp-kpi-label">
                                        ĐỘ PHỦ NHU CẦU
                                        <i>
                                            <Icon name="layers" />
                                        </i>
                                    </span>
                                    <strong>
                                        {readiness.coverage
                                            .required_components -
                                            readiness.coverage.missing_demand}
                                        /
                                        {readiness.coverage.required_components}
                                    </strong>
                                    <small>
                                        {readiness.coverage.missing_demand}{' '}
                                        thiếu nhu cầu
                                    </small>
                                </div>
                            </div>

                            <section className="panel">
                                <div className="panel-head">
                                    <div>
                                        <h2>
                                            Tổng hợp độ phủ & điều kiện cổng
                                        </h2>
                                        <p>
                                            Thành phần bắt buộc và các điều kiện
                                            cần hoàn thiện
                                        </p>
                                    </div>
                                    <PillBadge
                                        tone={
                                            readiness.can_open_feedback
                                                ? ''
                                                : 'amber'
                                        }
                                        label={
                                            readiness.can_open_feedback
                                                ? 'Cho phép mở phản hồi'
                                                : 'Chưa mở phản hồi'
                                        }
                                    />
                                </div>
                                <div className="panel-body">
                                    <div className="detail-grid">
                                        <div>
                                            <small>Thành phần bắt buộc</small>
                                            <b>
                                                {
                                                    readiness.coverage
                                                        .required_components
                                                }
                                            </b>
                                        </div>
                                        <div>
                                            <small>Đã phân công</small>
                                            <b>{readiness.coverage.assigned}</b>
                                        </div>
                                        <div>
                                            <small>Chưa phân công</small>
                                            <b>
                                                {readiness.coverage.unassigned}
                                            </b>
                                        </div>
                                        <div>
                                            <small>Thiếu nhu cầu</small>
                                            <b>
                                                {
                                                    readiness.coverage
                                                        .missing_demand
                                                }
                                            </b>
                                        </div>
                                        <div>
                                            <small>Thiếu dòng kế hoạch</small>
                                            <b>
                                                {
                                                    readiness.coverage
                                                        .missing_plan_row
                                                }
                                            </b>
                                        </div>
                                        <div>
                                            <small>
                                                Đã kiểm tra dữ liệu tối ưu
                                            </small>
                                            <b>
                                                {readiness.solver_input_validated
                                                    ? 'Đã kiểm tra'
                                                    : 'Chưa kiểm tra'}
                                            </b>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="mvp-toolbar section-gap">
                                <div
                                    className="mvp-tabs"
                                    role="tablist"
                                    aria-label="Lọc mức độ issue"
                                >
                                    {(
                                        [
                                            [
                                                'ALL',
                                                `Tất cả · ${issues.length}`,
                                            ],
                                            [
                                                'ERROR',
                                                `Lỗi chặn · ${errorCount}`,
                                            ],
                                            [
                                                'WARNING',
                                                `Cảnh báo · ${warningCount}`,
                                            ],
                                            [
                                                'INFO',
                                                `Thông tin · ${infoCount}`,
                                            ],
                                        ] as const
                                    ).map(([id, label]) => (
                                        <button
                                            key={id}
                                            type="button"
                                            role="tab"
                                            aria-selected={severityTab === id}
                                            className={
                                                severityTab === id
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() => setSeverityTab(id)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <section className="section-gap">
                                {filteredIssues.length > 0 ? (
                                    filteredIssues.map((issue, idx) => (
                                        <ReadinessIssue
                                            key={`${issue.code}-${idx}`}
                                            issue={issue}
                                            roundId={activeRound?.id}
                                            contextId={contextId}
                                        />
                                    ))
                                ) : (
                                    <RoleStateCard
                                        kind="empty"
                                        title="Không có issue nào ở nhóm mức độ đang chọn"
                                        detail="Chọn tab Tất cả để xem toàn bộ báo cáo kiểm tra của đợt."
                                    />
                                )}
                            </section>
                        </>
                    ) : isPairedValid && readinessQuery.isLoading ? (
                        <div className="section-gap">
                            <RoleStateCard
                                kind="loading"
                                title="Đang đánh giá mức độ sẵn sàng…"
                                detail="Hệ thống đang kiểm tra phạm vi, cặp lớp–môn, thành phần bắt buộc và nhu cầu."
                            />
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
