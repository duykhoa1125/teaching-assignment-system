import { lazy, Suspense, useEffect } from 'react';
import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
    useLocation,
    useOutletContext,
} from 'react-router';
import { AppLayout } from '@/app/layouts/app-layout';
import { pageTitle } from '@/app/layouts/navigation';
import {
    activeHomePath,
    evaluateRouteAccess,
    resolveGuardedPageTitle,
} from '@/features/session/roles';
import { SessionProvider } from '@/features/session/session-context';
import { useSession } from '@/features/session/use-session';
import type { WorkspaceContext } from '@/features/workspace/types';
import { ForbiddenPage } from '@/pages/access/forbidden-page';
import { NoScopePage } from '@/pages/access/no-scope-page';
import {
    AdminAccessPage,
    AdminAccountsPage,
    AdminHomePage,
} from '@/pages/admin/admin-pages';
const AssignmentWorkspacePage = lazy(() =>
    import('@/pages/assignment-workspace/assignment-workspace-page').then(
        (module) => ({ default: module.AssignmentWorkspacePage }),
    ),
);
const SolverRunsPage = lazy(() =>
    import('@/pages/solver-runs/solver-runs-page').then((module) => ({
        default: module.SolverRunsPage,
    })),
);
const WorkloadPage = lazy(() =>
    import('@/pages/workload/workload-page').then((module) => ({
        default: module.WorkloadPage,
    })),
);
const StatisticsPage = lazy(() =>
    import('@/pages/statistics/statistics-page').then((module) => ({
        default: module.StatisticsPage,
    })),
);
const FeedbackPage = lazy(() =>
    import('@/pages/feedback/feedback-page').then((module) => ({
        default: module.FeedbackPage,
    })),
);
const HistoryPage = lazy(() =>
    import('@/pages/history/history-page').then((module) => ({
        default: module.HistoryPage,
    })),
);
const DocumentsPage = lazy(() =>
    import('@/pages/documents/documents-page').then((module) => ({
        default: module.DocumentsPage,
    })),
);
const SourcesPage = lazy(() =>
    import('@/pages/sources/sources-page').then((module) => ({
        default: module.SourcesPage,
    })),
);
const AdminRulesPage = lazy(() =>
    import('@/pages/admin/admin-rules-page').then((module) => ({
        default: module.AdminRulesPage,
    })),
);
const AdminAuditPage = lazy(() =>
    import('@/pages/admin/admin-audit-page').then((module) => ({
        default: module.AdminAuditPage,
    })),
);
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { OverviewPage } from '@/pages/overview/overview-page';
import { SettingsPage } from '@/pages/settings/settings-page';
import {
    TeacherFeedbackPage,
    TeacherHomePage,
    TeacherLoadPage,
} from '@/pages/teacher/teacher-pages';
import { TeachersPage } from '@/pages/teachers/teachers-page';
const AdminCatalogsPage = lazy(() =>
    import('@/pages/admin/admin-catalogs-page').then((module) => ({
        default: module.AdminCatalogsPage,
    })),
);
const AdminPeriodsPage = lazy(() =>
    import('@/pages/admin/admin-periods-page').then((module) => ({
        default: module.AdminPeriodsPage,
    })),
);
const ChecksPage = lazy(() =>
    import('@/pages/checks/checks-page').then((module) => ({
        default: module.ChecksPage,
    })),
);
const DemandsPage = lazy(() =>
    import('@/pages/demands/demands-page').then((module) => ({
        default: module.DemandsPage,
    })),
);
const PreparationPage = lazy(() =>
    import('@/pages/preparation/preparation-page').then((module) => ({
        default: module.PreparationPage,
    })),
);
import { LoadingState } from '@/shared/ui/data-state';

const UiPreviewPage =
    import.meta.env.DEV || import.meta.env.VITE_DATA_SOURCE === 'mock'
        ? lazy(() =>
              import('@/pages/ui-preview/ui-preview-page').then((module) => ({
                  default: module.UiPreviewPage,
              })),
          )
        : null;

const LoginPage =
    import.meta.env.VITE_DATA_SOURCE === 'mock'
        ? lazy(() => import('@/pages/auth/login-page'))
        : null;

const titles: Record<string, string> = {
    '/': 'Tổng quan',
    '/teachers': 'Giáo viên',
    '/preparation': 'Chuẩn bị dữ liệu',
    '/demands': 'Nhu cầu giảng dạy',
    '/checks': 'Trung tâm kiểm tra',
    '/assignment': 'Phân công giảng dạy',
    '/solver-runs': 'Lượt sinh đề xuất',
    '/workload': 'Tải & định mức',
    '/statistics': 'Thống kê',
    '/feedback': 'Phản hồi',
    '/history': 'Lịch sử phiên bản',
    '/documents': 'Tài liệu đã phát hành',
    '/sources': 'Nguồn & đối soát',
    '/admin': 'Tổng quan quản trị',
    '/admin/accounts': 'Tài khoản & vai trò',
    '/admin/teachers': 'Hồ sơ giáo viên',
    '/admin/catalogs': 'Danh mục môn · lớp · khối',
    '/admin/periods': 'Năm học · học kỳ · đợt',
    '/admin/rules': 'Bộ quy tắc',
    '/admin/access': 'Phạm vi & quyền',
    '/admin/sources': 'Nguồn & bí danh',
    '/admin/audit': 'Nhật ký quản trị',
    ...(UiPreviewPage ? { '/dev/ui': 'Thư viện giao diện' } : {}),
};

function RouteEffects() {
    const { pathname } = useLocation();
    const { isMockMode, account, role } = useSession();
    const hasSchoolScope = !account || Boolean(account.school);

    useEffect(() => {
        const title = isMockMode
            ? resolveGuardedPageTitle(
                  pathname,
                  role,
                  hasSchoolScope,
                  isMockMode,
              )
            : (titles[pathname] ?? pageTitle(pathname));
        document.title = `${title} · TASS Studio`;
        document.getElementById('main-content')?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }, [hasSchoolScope, isMockMode, pathname, role]);
    return null;
}

function RequireMockSession() {
    const { pathname } = useLocation();
    const { isMockMode, isAuthenticated, isValidatingSession } = useSession();

    if (!isMockMode || pathname === '/dev/ui') {
        return <Outlet />;
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    if (isValidatingSession) {
        return <LoadingState label="Đang khôi phục phiên làm việc…" />;
    }
    return <Outlet />;
}

function RoleGuardOutlet() {
    const context = useOutletContext<WorkspaceContext | undefined>();
    const { pathname } = useLocation();
    const { isMockMode, account, role } = useSession();
    const hasSchoolScope = !account || Boolean(account.school);
    const access = evaluateRouteAccess(
        pathname,
        role,
        hasSchoolScope,
        isMockMode,
    );

    if (access.status === 'no-scope') {
        return <NoScopePage />;
    }
    if (access.status === 'forbidden') {
        return (
            <ForbiddenPage
                requestedTitle={access.requestedTitle}
                requestedRole={access.requiredRole}
            />
        );
    }
    return (
        <Suspense fallback={<LoadingState />}>
            <Outlet context={context} />
        </Suspense>
    );
}

function LoginRoute() {
    const { account, isAuthenticated, isValidatingSession, role } =
        useSession();

    if (!LoginPage) {
        return <Navigate to="/" replace />;
    }
    if (isValidatingSession) {
        return <LoadingState label="Đang khôi phục phiên làm việc…" />;
    }
    if (isAuthenticated && account) {
        return <Navigate to={activeHomePath(account, role)} replace />;
    }
    return (
        <Suspense fallback={<LoadingState />}>
            <LoginPage />
        </Suspense>
    );
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <SessionProvider>
                <RouteEffects />
                <Routes>
                    {LoginPage && (
                        <Route path="login" element={<LoginRoute />} />
                    )}
                    <Route element={<RequireMockSession />}>
                        <Route element={<AppLayout />}>
                            <Route element={<RoleGuardOutlet />}>
                                <Route index element={<OverviewPage />} />
                                {UiPreviewPage && (
                                    <Route
                                        path="dev/ui"
                                        element={
                                            <Suspense
                                                fallback={<LoadingState />}
                                            >
                                                <UiPreviewPage />
                                            </Suspense>
                                        }
                                    />
                                )}
                                <Route
                                    path="teachers"
                                    element={<TeachersPage />}
                                />
                                <Route
                                    path="preparation"
                                    element={<PreparationPage />}
                                />
                                <Route
                                    path="demands"
                                    element={<DemandsPage />}
                                />
                                <Route path="checks" element={<ChecksPage />} />
                                <Route
                                    path="assignment"
                                    element={<AssignmentWorkspacePage />}
                                />
                                <Route
                                    path="solver-runs"
                                    element={<SolverRunsPage />}
                                />
                                <Route
                                    path="workload"
                                    element={<WorkloadPage />}
                                />
                                <Route
                                    path="statistics"
                                    element={<StatisticsPage />}
                                />
                                <Route
                                    path="feedback"
                                    element={<FeedbackPage />}
                                />
                                <Route
                                    path="history"
                                    element={<HistoryPage />}
                                />
                                <Route
                                    path="documents"
                                    element={<DocumentsPage />}
                                />
                                <Route
                                    path="sources"
                                    element={<SourcesPage />}
                                />
                                <Route
                                    path="admin"
                                    element={<AdminHomePage />}
                                />
                                <Route
                                    path="admin/accounts"
                                    element={<AdminAccountsPage />}
                                />
                                <Route
                                    path="admin/access"
                                    element={<AdminAccessPage />}
                                />
                                <Route
                                    path="admin/teachers"
                                    element={<TeachersPage />}
                                />
                                <Route
                                    path="admin/catalogs"
                                    element={<AdminCatalogsPage />}
                                />
                                <Route
                                    path="admin/periods"
                                    element={<AdminPeriodsPage />}
                                />
                                <Route
                                    path="admin/rules"
                                    element={<AdminRulesPage />}
                                />
                                <Route
                                    path="admin/sources"
                                    element={<SourcesPage />}
                                />
                                <Route
                                    path="admin/audit"
                                    element={<AdminAuditPage />}
                                />
                                <Route
                                    path="teacher"
                                    element={<TeacherHomePage />}
                                />
                                <Route
                                    path="teacher/load"
                                    element={<TeacherLoadPage />}
                                />
                                <Route
                                    path="teacher/feedback"
                                    element={<TeacherFeedbackPage />}
                                />
                                <Route
                                    path="settings"
                                    element={<SettingsPage />}
                                />
                                <Route
                                    path="forbidden"
                                    element={<ForbiddenPage />}
                                />
                                <Route
                                    path="no-scope"
                                    element={<NoScopePage />}
                                />
                                <Route path="*" element={<NotFoundPage />} />
                            </Route>
                        </Route>
                    </Route>
                </Routes>
            </SessionProvider>
        </BrowserRouter>
    );
}
