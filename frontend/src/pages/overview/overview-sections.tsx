import { Link } from 'react-router';
import type {
    OverviewActivityItem,
    OverviewDashboard,
    OverviewPlanPhase,
} from '@/features/overview/types';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { PHASE_LABELS, clampPercent, formatPeriods } from './formatters';
import styles from './overview-page.module.css';

export type WorkflowActionKind = 'open-feedback' | 'close-feedback' | 'ready';

function deadlineLabel(
    phase: OverviewPlanPhase,
    planVersion: number,
    feedbackDueAt: string | null,
) {
    if (phase !== 'OPEN_FOR_FEEDBACK') {
        return `Phiên bản hiện hành · V${String(planVersion).padStart(2, '0')}`;
    }
    if (!feedbackDueAt) {
        return 'Đang trong đợt nhận phản hồi';
    }
    const remainingDays = Math.ceil(
        (new Date(feedbackDueAt).getTime() - Date.now()) / 86400000,
    );
    return remainingDays > 0
        ? `Còn ${Math.max(1, remainingDays)} ngày nhận phản hồi`
        : 'Đã hết hạn nhận phản hồi';
}

function MicroSegments({
    parts,
}: {
    parts: ReadonlyArray<{ key: string; value: number; color: string }>;
}) {
    const total = parts.reduce((sum, part) => sum + part.value, 0);
    return (
        <div className={styles.metricMicro} aria-hidden="true">
            {parts
                .filter((part) => part.value > 0)
                .map((part) => (
                    <i
                        key={part.key}
                        style={{
                            width: `${clampPercent(part.value, total)}%`,
                            background: part.color,
                        }}
                    />
                ))}
        </div>
    );
}

export function CompletionBanner({
    phase,
    onOpenExport,
}: {
    phase: OverviewPlanPhase;
    onOpenExport: () => void;
}) {
    if (phase !== 'READY_TO_EXPORT' && phase !== 'EXPORTED') {
        return null;
    }
    const done = phase === 'EXPORTED';
    return (
        <section className={`${styles.completionCard} completion-card`}>
            <span className={styles.completionSymbol}>
                <Icon name={done ? 'check' : 'file'} />
            </span>
            <div className={styles.grow}>
                <div className={styles.eyebrow}>
                    {done
                        ? 'HỌC KỲ ĐÃ CÓ BẢN ĐỀ XUẤT'
                        : 'SẴN SÀNG CHO BƯỚC CUỐI'}
                </div>
                <h2>
                    {done
                        ? 'Một học kỳ đã được chuẩn bị trọn vẹn.'
                        : 'Phương án đã sẵn sàng để xuất báo cáo.'}
                </h2>
                <p>
                    {done
                        ? 'Bản phân công, các phản hồi và lịch sử vẫn được lưu để tra cứu.'
                        : 'Đã rà soát phương án và xử lý các phản hồi trong demo.'}
                </p>
            </div>
            <button
                type="button"
                className="btn primary"
                onClick={onOpenExport}
            >
                <Icon name="download" />
                {done ? 'Xem lại báo cáo' : 'Xuất báo cáo'}
            </button>
        </section>
    );
}

export function ReadinessBanner({
    readiness,
    validationStatus,
    latestSolverStatus,
    latestApplyOutcome,
}: {
    readiness: OverviewDashboard['readiness'];
    validationStatus?: string | null;
    latestSolverStatus?: string | null;
    latestApplyOutcome?: string | null;
}) {
    const isReady =
        readiness.validation_fresh && readiness.validation_releasable;
    const confirmationText =
        readiness.scope_confirmed && readiness.required_confirmed
            ? 'Đã xác nhận'
            : 'Cần xác nhận phạm vi/tập bắt buộc';
    const validationText = readiness.validation_fresh
        ? readiness.validation_releasable
            ? `Đã kiểm tra hiện hành (${validationStatus ?? 'Đạt tuần'})`
            : `Đã kiểm tra (${validationStatus ?? 'Cần xử lý'})`
        : 'Chưa kiểm tra hoặc kết quả đã cũ';
    const solverText = latestSolverStatus
        ? ` · Solver: ${latestApplyOutcome ?? latestSolverStatus}`
        : '';

    return (
        <div
            className={[
                styles.banner,
                'banner',
                'mvp-app-note',
                isReady ? '' : styles.bannerAmber,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <Icon name="shield" />
            <span className={styles.grow}>
                <strong>
                    Đầu vào bắt buộc: {readiness.required_inputs_count} thành
                    phần
                </strong>
                {' · '}
                {confirmationText}
                {' · '}
                {validationText}
                {solverText}
            </span>
            <div className="mvp-actions">
                <Link to="/checks" className="btn small">
                    Kiểm tra phương án
                </Link>
                <Link to="/preparation" className="btn small">
                    Chuẩn bị dữ liệu
                </Link>
            </div>
        </div>
    );
}

const PHASE_STEPS = [
    'Chuẩn bị',
    'Phân công',
    'Lấy ý kiến',
    'Xuất đề xuất',
] as const;

export function PhaseStrip({
    dashboard,
    onOpenSolver,
    onOpenExport,
    onOpenWorkflowAction,
}: {
    dashboard: OverviewDashboard;
    onOpenSolver: () => void;
    onOpenExport: () => void;
    onOpenWorkflowAction: (action: WorkflowActionKind) => void;
}) {
    const { phase, summary, context_title, plan_version, feedback_due_at } =
        dashboard;
    const stage =
        phase === 'DRAFT'
            ? 1
            : phase === 'OPEN_FOR_FEEDBACK' || phase === 'FEEDBACK_PROCESSING'
              ? 2
              : 3;

    const renderNextAction = () => {
        if (phase === 'DRAFT') {
            if (summary.unassigned_demands > 0) {
                return (
                    <button
                        type="button"
                        className="btn"
                        onClick={onOpenSolver}
                    >
                        <Icon name="spark" />
                        Hoàn thiện phân công
                    </button>
                );
            }
            return (
                <button
                    type="button"
                    className="btn"
                    onClick={() => onOpenWorkflowAction('open-feedback')}
                >
                    <Icon name="send" />
                    Mở lấy ý kiến
                </button>
            );
        }

        if (phase === 'OPEN_FOR_FEEDBACK') {
            return (
                <button
                    type="button"
                    className="btn"
                    onClick={() => onOpenWorkflowAction('close-feedback')}
                >
                    <Icon name="clock" />
                    Đóng nhận phản hồi
                </button>
            );
        }

        if (phase === 'FEEDBACK_PROCESSING') {
            if (summary.pending_feedback_count > 0) {
                return (
                    <Link to="/feedback" className="btn">
                        <Icon name="feedback" />
                        Xử lý phản hồi
                    </Link>
                );
            }
            return (
                <button
                    type="button"
                    className="btn"
                    onClick={() => onOpenWorkflowAction('ready')}
                >
                    <Icon name="check" />
                    Hoàn tất phương án
                </button>
            );
        }

        return (
            <button type="button" className="btn" onClick={onOpenExport}>
                <Icon name="download" />
                Xuất đề xuất
            </button>
        );
    };

    return (
        <section
            className={`${styles.commandStrip} command-strip`}
            aria-label="Điều phối học kỳ"
        >
            <div>
                <div className={styles.commandKicker}>
                    KẾ HOẠCH ĐANG LÀM VIỆC
                </div>
                <h2>{`${context_title}, một bước tiến mới.`}</h2>
                <p>
                    {summary.unassigned_demands > 0
                        ? `${summary.unassigned_demands} nhu cầu chờ giáo viên phù hợp.`
                        : 'Đã phân công đủ nhu cầu giảng dạy.'}
                </p>
            </div>

            <div className={styles.phaseLine}>
                {PHASE_STEPS.map((label, index) => {
                    const isDone = index < stage;
                    const isCurrent = index === stage;
                    return (
                        <div
                            key={label}
                            className={[
                                styles.phaseNode,
                                isDone ? styles.phaseDone : '',
                                isCurrent ? styles.phaseCurrent : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-current={isCurrent ? 'step' : undefined}
                        >
                            <i>
                                {isDone ? (
                                    <Icon name="check" />
                                ) : (
                                    String(index + 1).padStart(2, '0')
                                )}
                            </i>
                            <span>{label}</span>
                        </div>
                    );
                })}
            </div>

            <div className={styles.commandStatus}>
                {renderNextAction()}
                <span>
                    {deadlineLabel(phase, plan_version, feedback_due_at)}
                </span>
            </div>
        </section>
    );
}

const GRADE_SEGMENT_COLORS = [
    'var(--fixed)',
    'var(--aqua)',
    'var(--reduced)',
] as const;

export function DashboardMetrics({
    summary,
}: {
    summary: OverviewDashboard['summary'];
}) {
    const attentionTotal =
        summary.unassigned_demands +
        summary.over_norm_teachers_count +
        summary.pending_feedback_count;

    return (
        <div className={styles.metrics}>
            <article className={`${styles.panel} ${styles.metric}`}>
                <div className={styles.metricTop}>
                    <span>Đội ngũ giáo viên</span>
                    <span className={styles.metricIcon}>
                        <Icon name="teachers" />
                    </span>
                </div>
                <div className={styles.metricValue}>
                    {summary.teachers_count}
                    <span>người</span>
                </div>
                <div className={styles.metricFoot}>
                    <span>
                        {`${summary.balanced_teachers_count} đạt · ${summary.under_norm_teachers_count} dưới · ${summary.over_norm_teachers_count} vượt định mức`}
                    </span>
                </div>
                <MicroSegments
                    parts={[
                        {
                            key: 'balanced',
                            value: summary.balanced_teachers_count,
                            color: 'var(--aqua)',
                        },
                        {
                            key: 'under',
                            value: summary.under_norm_teachers_count,
                            color: 'var(--fixed)',
                        },
                        {
                            key: 'over',
                            value: summary.over_norm_teachers_count,
                            color: 'var(--chart-over)',
                        },
                    ]}
                />
            </article>

            <article className={`${styles.panel} ${styles.metric}`}>
                <div className={styles.metricTop}>
                    <span>Nhu cầu giảng dạy</span>
                    <span className={styles.metricIcon}>
                        <Icon name="book" />
                    </span>
                </div>
                <div className={styles.metricValue}>
                    {formatPeriods(summary.total_periods)}
                    <span>tiết / tuần</span>
                </div>
                <div className={styles.metricFoot}>
                    <span>{`${summary.total_demands} thành phần · ${summary.class_count} lớp học`}</span>
                </div>
                <MicroSegments
                    parts={summary.demands_by_grade.map((gradeItem, index) => ({
                        key: gradeItem.grade,
                        value: gradeItem.periods,
                        color:
                            GRADE_SEGMENT_COLORS[
                                index % GRADE_SEGMENT_COLORS.length
                            ] ?? 'var(--fixed)',
                    }))}
                />
            </article>

            <article className={`${styles.panel} ${styles.metric}`}>
                <div className={styles.metricTop}>
                    <span>Độ phủ phân công</span>
                    <span className={styles.metricIcon}>
                        <Icon name="assignment" />
                    </span>
                </div>
                <div className={styles.metricValue}>
                    {summary.coverage_percent}
                    <span>%</span>
                </div>
                <div className={styles.metricFoot}>
                    <strong>{summary.assigned_demands}</strong>
                    <span>{`trên ${summary.total_demands} nhu cầu đã gán`}</span>
                </div>
                <MicroSegments
                    parts={[
                        {
                            key: 'assigned',
                            value: summary.assigned_demands,
                            color: 'var(--primary)',
                        },
                        {
                            key: 'unassigned',
                            value: summary.unassigned_demands,
                            color: 'var(--soft)',
                        },
                    ]}
                />
            </article>

            <article
                className={`${styles.panel} ${styles.metric} ${styles.metricAccent}`}
            >
                <div className={styles.metricTop}>
                    <span>Cần bạn xử lý</span>
                    <span className={styles.metricIcon}>
                        <Icon name="warning" />
                    </span>
                </div>
                <div className={styles.metricValue}>
                    {attentionTotal}
                    <span>mục</span>
                </div>
                <div
                    className={`${styles.metricFoot} ${styles.metricFootWarn}`}
                >
                    <span>
                        {`${summary.unassigned_demands} chưa gán · ${summary.pending_feedback_count} phản hồi`}
                    </span>
                </div>
                <MicroSegments
                    parts={[
                        {
                            key: 'unassigned',
                            value: summary.unassigned_demands,
                            color: 'var(--primary)',
                        },
                        {
                            key: 'over',
                            value: summary.over_norm_teachers_count,
                            color: 'var(--chart-over)',
                        },
                        {
                            key: 'pending',
                            value: summary.pending_feedback_count,
                            color: 'var(--aqua)',
                        },
                    ]}
                />
            </article>
        </div>
    );
}

const DONUT_CIRCUMFERENCE = 345.575;

export function CoveragePanel({
    phase,
    summary,
}: {
    phase: OverviewPlanPhase;
    summary: OverviewDashboard['summary'];
}) {
    const dashOffset =
        DONUT_CIRCUMFERENCE * (1 - summary.coverage_percent / 100);
    const unassigned = summary.unassigned_demands;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <div>
                    <div className={styles.eyebrow}>
                        <span className={styles.sectionIndex}>
                            02 / COVERAGE
                        </span>
                    </div>
                    <h2>Tiến độ phân công</h2>
                </div>
                <span
                    className={[
                        styles.pill,
                        phase === 'DRAFT' ? styles.pillAmber : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    <i />
                    {PHASE_LABELS[phase]}
                </span>
            </div>

            <div className={styles.panelBody}>
                <div className={styles.donutLayout}>
                    <div className={styles.donut}>
                        <svg viewBox="0 0 140 140" aria-hidden="true">
                            <circle
                                className={styles.trackRing}
                                cx="70"
                                cy="70"
                                r="55"
                            />
                            <circle
                                className={styles.valueRing}
                                cx="70"
                                cy="70"
                                r="55"
                                strokeDasharray={DONUT_CIRCUMFERENCE}
                                strokeDashoffset={dashOffset}
                            />
                        </svg>
                        <div className={styles.donutLabel}>
                            <strong>{`${summary.coverage_percent}%`}</strong>
                            <span>đã hoàn thành</span>
                        </div>
                    </div>

                    <div className={styles.coverageDetail}>
                        <div>
                            <span>
                                <i
                                    className={styles.legendDot}
                                    style={{ background: 'var(--primary)' }}
                                />
                                Đã phân công
                            </span>
                            <b>{summary.assigned_demands}</b>
                        </div>
                        <div>
                            <span>
                                <i
                                    className={styles.legendDot}
                                    style={{ background: 'var(--line)' }}
                                />
                                Chưa phân công
                            </span>
                            <b>{unassigned}</b>
                        </div>
                        <div>
                            <span>
                                <i
                                    className={styles.legendDot}
                                    style={{ background: 'var(--aqua)' }}
                                />
                                Đã khóa gán
                            </span>
                            <b>{summary.locked_demands}</b>
                        </div>
                    </div>
                </div>

                <div className={styles.progressInsight}>
                    <Icon name={unassigned > 0 ? 'assignment' : 'check'} />
                    <span>
                        {unassigned > 0 ? (
                            <>
                                Còn <b>{`${unassigned} nhu cầu`}</b> để hoàn
                                thiện phương án.
                            </>
                        ) : (
                            'Nhu cầu đã đủ. Sẵn sàng rà soát và lấy ý kiến.'
                        )}
                    </span>
                </div>

                <Link
                    to={
                        unassigned > 0
                            ? '/assignment?filter=unassigned'
                            : '/assignment'
                    }
                    className={`btn ghost small ${styles.coverageLink}`}
                >
                    {unassigned > 0
                        ? 'Tiếp tục phân công'
                        : 'Rà soát phương án'}
                    <Icon name="arrow" />
                </Link>
            </div>
        </section>
    );
}

export function ActionIssuesPanel({
    summary,
}: {
    summary: OverviewDashboard['summary'];
}) {
    const totalIssues =
        summary.unassigned_demands +
        summary.over_norm_teachers_count +
        summary.pending_feedback_count;

    const issues = [
        {
            icon: 'assignment' as const,
            title:
                summary.unassigned_demands > 0
                    ? `${summary.unassigned_demands} nhu cầu đang chờ giáo viên`
                    : 'Nhu cầu đã được phân công đầy đủ',
            subtitle:
                summary.unassigned_demands > 0
                    ? 'Xem ứng viên phù hợp và hoàn thiện từng lớp.'
                    : 'Rà soát lần cuối trước khi mở lấy ý kiến.',
            to:
                summary.unassigned_demands > 0
                    ? '/assignment?filter=unassigned'
                    : '/assignment',
        },
        {
            icon: 'balance' as const,
            title: `${summary.over_norm_teachers_count} giáo viên cần rà soát tải`,
            subtitle: 'Đối chiếu định mức và từng thành phần công tác.',
            to: '/workload',
        },
        {
            icon: 'feedback' as const,
            title: `${summary.pending_feedback_count} phản hồi chờ ghi nhận`,
            subtitle: 'Lắng nghe đội ngũ, hoàn thiện phương án.',
            to: '/feedback',
        },
    ];

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <div className={styles.flex}>
                    <h2>Việc cần bạn xử lý</h2>
                    <span className={`${styles.pill} ${styles.pillAmber}`}>
                        {totalIssues}
                    </span>
                </div>
                <span className={styles.sectionIndex}>03</span>
            </div>

            <div className={styles.panelBody}>
                {issues.map((item) => (
                    <div key={item.to} className={`${styles.issue} issue`}>
                        <span className={`${styles.issueSymbol} issue-symbol`}>
                            <Icon name={item.icon} />
                        </span>
                        <div className={styles.grow}>
                            <strong>{item.title}</strong>
                            <p>{item.subtitle}</p>
                        </div>
                        <Link
                            to={item.to}
                            className="icon-btn"
                            aria-label={item.title}
                        >
                            <Icon name="chevron" />
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function RecentActivityPanel({
    items,
}: {
    items: OverviewActivityItem[];
}) {
    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <div>
                    <h2>Dấu vết công việc</h2>
                    <p>Mỗi thay đổi đều được ghi nhận</p>
                </div>
                <Link to="/history" className="btn ghost small">
                    Lịch sử <Icon name="arrow" />
                </Link>
            </div>

            <div className={styles.panelBody}>
                {items.length > 0 ? (
                    items.slice(0, 3).map((item) => (
                        <div key={item.id} className={styles.activity}>
                            <i className={styles.activityDot} />
                            <strong>{item.title}</strong>
                            <p className={styles.activityDetail}>
                                {item.actor_name &&
                                item.actor_portrait_key !== null ? (
                                    <>
                                        <span className="person-identity person-identity-compact">
                                            <PortraitAvatar
                                                portraitKey={
                                                    item.actor_portrait_key
                                                }
                                                colorIndex={
                                                    item.actor_color_index
                                                }
                                            />
                                            <span className="person-identity-copy">
                                                <strong>
                                                    {item.actor_name}
                                                </strong>
                                            </span>
                                        </span>
                                        <span>{item.detail}</span>
                                    </>
                                ) : (
                                    item.detail
                                )}
                            </p>
                            <time>{item.time_label}</time>
                        </div>
                    ))
                ) : (
                    <p className={styles.muted}>Chưa có hoạt động gần đây.</p>
                )}
            </div>
        </section>
    );
}
