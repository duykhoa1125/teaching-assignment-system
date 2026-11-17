import { PageHeadingContent } from '@/shared/ui/page-heading-content';
import { useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router';
import { useOverviewQuery } from '@/features/overview/queries';
import type { OverviewTeacherLoad } from '@/features/overview/types';
import type { WorkspacePreview } from '@/features/workspace/types';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import {
    ActionIssuesPanel,
    CompletionBanner,
    CoveragePanel,
    DashboardMetrics,
    PhaseStrip,
    ReadinessBanner,
    RecentActivityPanel,
    type WorkflowActionKind,
} from './overview-sections';
import { TeacherDrawer } from './teacher-drawer';
import { WorkloadChart } from './workload-chart';
import styles from './overview-page.module.css';

type OutletWorkspaceContext = WorkspacePreview['contexts'][number] | undefined;

type OverviewModalKind = 'export' | 'solver' | WorkflowActionKind | null;

const MODAL_CONTENT: Record<
    Exclude<OverviewModalKind, null>,
    {
        title: string;
        description: string;
        body: string;
        ctaLabel: string;
        ctaTo: string;
    }
> = {
    export: {
        title: 'Báo cáo phân công hiện hành',
        description:
            'Xem trước bản chụp và phát hành PDF đề xuất tại màn hình Tài liệu.',
        body: 'Chuyển tới màn hình Tài liệu đã phát hành để xem trước phương án hoặc tải PDF có mã kiểm tra SHA-256.',
        ctaLabel: 'Mở Tài liệu',
        ctaTo: '/documents',
    },
    solver: {
        title: 'Sinh đề xuất phân công',
        description:
            'Luồng chạy thuật toán đề xuất được điều phối tại màn hình Lượt chạy đề xuất.',
        body: 'Phương án hiện hành và các phân công đã khóa sẽ được giữ nguyên cho tới khi bạn xem trước và xác nhận áp dụng.',
        ctaLabel: 'Tới Lượt chạy đề xuất',
        ctaTo: '/solver-runs',
    },
    'open-feedback': {
        title: 'Mở đợt lấy ý kiến đội ngũ',
        description:
            'Thiết lập thời hạn và đóng băng bản nguồn cho giáo viên phản hồi.',
        body: 'Thao tác mở lấy ý kiến thực hiện tại màn hình Phản hồi sau khi phương án đạt kiểm tra hiện hành.',
        ctaLabel: 'Mở Phản hồi',
        ctaTo: '/feedback',
    },
    'close-feedback': {
        title: 'Đóng nhận phản hồi',
        description:
            'Tổng hợp và xử lý ý kiến giáo viên được thực hiện tại màn hình Phản hồi.',
        body: 'Chuyển tới màn hình Phản hồi để xem các ý kiến đang chờ ghi nhận trong đợt phân công này.',
        ctaLabel: 'Mở Phản hồi',
        ctaTo: '/feedback',
    },
    ready: {
        title: 'Hoàn tất phương án',
        description:
            'Xác nhận kết thúc rà soát trước khi phát hành PDF đề xuất.',
        body: 'Mở màn hình Phản hồi để kiểm tra các ý kiến còn chờ và chốt chuyển sang Sẵn sàng phát hành.',
        ctaLabel: 'Mở Phản hồi',
        ctaTo: '/feedback',
    },
};

export function OverviewPage() {
    const outletContext = useOutletContext<OutletWorkspaceContext>();
    const contextId = outletContext?.id ?? 'hk1';
    const roundLabel = outletContext?.round ?? 'PC-01';
    const contextTitle = outletContext?.label?.split(' · ')[0] ?? 'Học kỳ I';
    const isMockMode = import.meta.env.VITE_DATA_SOURCE === 'mock';

    const navigate = useNavigate();
    const query = useOverviewQuery(contextId, isMockMode);

    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
        null,
    );
    const [modalKind, setModalKind] = useState<OverviewModalKind>(null);
    const drawerTriggerRef = useRef<HTMLElement | null>(null);

    const dashboard = query.data;
    const activeRound = dashboard?.round ?? roundLabel;
    const activeTitle = dashboard?.context_title ?? contextTitle;
    const activeYear = dashboard?.academic_year ?? '2026–2027';

    const selectedTeacher: OverviewTeacherLoad | null =
        selectedTeacherId !== null && dashboard
            ? (dashboard.teachers.find(
                  (item) => item.id === selectedTeacherId,
              ) ?? null)
            : null;

    const canRunSolver = dashboard?.phase === 'DRAFT';

    const renderPageHeader = (withActions: boolean) => (
        <div className={`${styles.pageHeading} page-heading`}>
            <PageHeadingContent>
                <div>
                    <div className={`${styles.eyebrow} eyebrow`}>
                        <span className={styles.sectionIndex}>
                            {activeRound}
                        </span>
                        <span className={styles.eyebrowDivider}>/</span>
                        <span>{`${activeTitle} · ${activeYear}`}</span>
                    </div>
                    <h1>Một góc nhìn. Cả học kỳ.</h1>
                    <p className={styles.subtitle}>
                        Những điều quan trọng cho kế hoạch giảng dạy, ở cùng một
                        nơi.
                    </p>
                </div>
            </PageHeadingContent>
            {withActions ? (
                <div className={`${styles.headingActions} flex`}>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => void navigate('/statistics')}
                    >
                        <Icon name="chart" />
                        Thống kê
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={!canRunSolver}
                        onClick={() => void navigate('/solver-runs')}
                    >
                        <Icon name="spark" />
                        Sinh đề xuất
                    </button>
                </div>
            ) : null}
        </div>
    );

    if (!isMockMode) {
        return (
            <div className={styles.overviewRoot}>
                {renderPageHeader(false)}
                <EmptyState
                    title="Tổng quan chưa nối API thật"
                    action={
                        <Link to="/teachers" className="button">
                            Mở Đội ngũ giáo viên
                        </Link>
                    }
                >
                    Màn hình Tổng quan hiện sử dụng dữ liệu minh họa tạm thời
                    (`VITE_DATA_SOURCE=mock`) và chưa gọi API backend chính
                    thức.
                </EmptyState>
            </div>
        );
    }

    if (query.isPending) {
        return (
            <div className={styles.overviewRoot}>
                {renderPageHeader(false)}
                <section className={styles.panel}>
                    <div
                        className={`${styles.stateCard} ${styles.stateLoading}`}
                        role="status"
                    >
                        <span className={`${styles.stateSymbol} icon-surface`}>
                            <Icon name="spark" />
                        </span>
                        <h3>Đang tải dữ liệu tổng quan</h3>
                        <p>
                            Đang tổng hợp nhịp tải đội ngũ, tiến độ phân công và
                            các mục cần xử lý…
                        </p>
                    </div>
                </section>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className={styles.overviewRoot}>
                {renderPageHeader(false)}
                <section className={styles.panel}>
                    <div
                        className={`${styles.stateCard} ${styles.stateError}`}
                        role="alert"
                    >
                        <span className={`${styles.stateSymbol} icon-surface`}>
                            <Icon name="warning" />
                        </span>
                        <h3>Không thể tải dữ liệu tổng quan</h3>
                        <p>
                            {query.error.message ||
                                'Yêu cầu dữ liệu tạm thời chưa thành công.'}
                        </p>
                        <div className={styles.stateActions}>
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void query.refetch()}
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    const isEmpty =
        !dashboard ||
        (dashboard.teachers.length === 0 &&
            dashboard.summary.total_demands === 0);

    if (isEmpty) {
        return (
            <div className={styles.overviewRoot}>
                {renderPageHeader(false)}
                <section className={styles.panel}>
                    <div className={styles.stateCard}>
                        <span className={`${styles.stateSymbol} icon-surface`}>
                            <Icon name="book" />
                        </span>
                        <h3>Một khoảng trống để bắt đầu</h3>
                        <p>
                            Chưa có dữ liệu đội ngũ hoặc nhu cầu giảng dạy cho
                            đợt phân công này.
                        </p>
                        <div className={styles.stateActions}>
                            <Link to="/preparation" className="btn small">
                                Chuẩn bị dữ liệu
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    const modalConfig = modalKind ? MODAL_CONTENT[modalKind] : null;

    return (
        <div className={styles.overviewRoot}>
            <CompletionBanner
                phase={dashboard.phase}
                onOpenExport={() => setModalKind('export')}
            />

            {renderPageHeader(true)}

            <ReadinessBanner
                readiness={dashboard.readiness}
                validationStatus={dashboard.validation_status}
                latestSolverStatus={dashboard.latest_solver_status}
                latestApplyOutcome={dashboard.latest_apply_outcome}
            />

            <PhaseStrip
                dashboard={dashboard}
                onOpenSolver={() => void navigate('/solver-runs')}
                onOpenExport={() => setModalKind('export')}
                onOpenWorkflowAction={(action) => setModalKind(action)}
            />

            <DashboardMetrics summary={dashboard.summary} />

            <div className={styles.dashboardGrid}>
                <section className={styles.panel}>
                    <div className={styles.panelHead}>
                        <div>
                            <div className={`${styles.eyebrow} eyebrow`}>
                                <span className={styles.sectionIndex}>
                                    01 / WORKLOAD
                                </span>
                            </div>
                            <h2>Nhịp tải giảng dạy</h2>
                            <p>{`Đủ ${dashboard.teachers.length} giáo viên · tiết / tuần`}</p>
                        </div>
                        <Link to="/workload" className="btn small">
                            Xem chi tiết <Icon name="arrow" />
                        </Link>
                    </div>
                    <div className={styles.panelBody}>
                        <WorkloadChart
                            teachers={dashboard.teachers}
                            onSelectTeacher={(teacher, trigger) => {
                                drawerTriggerRef.current = trigger;
                                setSelectedTeacherId(teacher.id);
                            }}
                        />
                    </div>
                </section>

                <CoveragePanel
                    phase={dashboard.phase}
                    summary={dashboard.summary}
                />
            </div>

            <div className={styles.dashboardLower}>
                <ActionIssuesPanel summary={dashboard.summary} />
                <RecentActivityPanel items={dashboard.recent_activity} />
            </div>

            <TeacherDrawer
                teacher={selectedTeacher}
                returnFocusRef={drawerTriggerRef}
                onClose={() => setSelectedTeacherId(null)}
                onInspectAssignment={(assignmentId) => {
                    setSelectedTeacherId(null);
                    void navigate(`/assignment?demand=${assignmentId}`);
                }}
            />

            <Dialog
                open={modalConfig !== null}
                onOpenChange={(open) => {
                    if (!open) setModalKind(null);
                }}
                title={modalConfig?.title ?? ''}
                description={modalConfig?.description}
            >
                <p className={styles.noticeText}>{modalConfig?.body}</p>
                <div className={styles.noticeActions}>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setModalKind(null)}
                    >
                        Đóng
                    </button>
                    {modalConfig ? (
                        <Link
                            to={modalConfig.ctaTo}
                            className="btn primary"
                            onClick={() => setModalKind(null)}
                        >
                            {modalConfig.ctaLabel}
                        </Link>
                    ) : null}
                </div>
            </Dialog>
        </div>
    );
}
