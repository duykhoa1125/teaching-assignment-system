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
import { navigation, pageTitle } from '@/app/layouts/navigation';
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
import { AssignmentWorkspacePage } from '@/pages/assignment-workspace/assignment-workspace-page';
import { LayoutPlaceholder } from '@/pages/layout-placeholder';
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { OverviewPage } from '@/pages/overview/overview-page';
import { SettingsPage } from '@/pages/settings/settings-page';
import {
    TeacherFeedbackPage,
    TeacherHomePage,
    TeacherLoadPage,
} from '@/pages/teacher/teacher-pages';
import { TeachersPage } from '@/pages/teachers/teachers-page';
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

const adminPlaceholderPaths = [
    'admin/teachers',
    'admin/catalogs',
    'admin/periods',
    'admin/rules',
    'admin/sources',
    'admin/audit',
] as const;

const titles: Record<string, string> = {
    '/': 'Tổng quan',
    '/teachers': 'Giáo viên',
    '/assignment': 'Phân công giảng dạy',
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
    return <Outlet context={context} />;
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
                                {navigation
                                    .filter(
                                        (item) =>
                                            ![
                                                '/',
                                                '/teachers',
                                                '/assignment',
                                            ].includes(item.path),
                                    )
                                    .map((item) => (
                                        <Route
                                            key={item.path}
                                            path={item.path.slice(1)}
                                            element={<LayoutPlaceholder />}
                                        />
                                    ))}
                                <Route
                                    path="assignment"
                                    element={<AssignmentWorkspacePage />}
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
                                {adminPlaceholderPaths.map((path) => (
                                    <Route
                                        key={path}
                                        path={path}
                                        element={<LayoutPlaceholder />}
                                    />
                                ))}
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
