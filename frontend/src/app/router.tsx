import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { AppLayout } from '@/app/layouts/app-layout';
import { OverviewPage } from '@/pages/overview/overview-page';
import { TeachersPage } from '@/pages/teachers/teachers-page';
import { AssignmentWorkspacePage } from '@/pages/assignment-workspace/assignment-workspace-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { LoadingState } from '@/shared/ui/data-state';
import { navigation, pageTitle } from '@/app/layouts/navigation';
import { LayoutPlaceholder } from '@/pages/layout-placeholder';

const UiPreviewPage =
    import.meta.env.DEV || import.meta.env.VITE_DATA_SOURCE === 'mock'
        ? lazy(() =>
              import('@/pages/ui-preview/ui-preview-page').then((module) => ({
                  default: module.UiPreviewPage,
              })),
          )
        : null;

const titles: Record<string, string> = {
    '/': 'Tổng quan',
    '/teachers': 'Giáo viên',
    '/assignment': 'Phân công giảng dạy',
    ...(UiPreviewPage ? { '/dev/ui': 'Thư viện giao diện' } : {}),
};

function RouteEffects() {
    const { pathname } = useLocation();
    useEffect(() => {
        document.title = `${titles[pathname] ?? pageTitle(pathname)} · TASS Studio`;
        document.getElementById('main-content')?.focus();
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <RouteEffects />
            <Routes>
                <Route element={<AppLayout />}>
                    <Route index element={<OverviewPage />} />
                    {UiPreviewPage && (
                        <Route
                            path="dev/ui"
                            element={
                                <Suspense fallback={<LoadingState />}>
                                    <UiPreviewPage />
                                </Suspense>
                            }
                        />
                    )}
                    <Route path="teachers" element={<TeachersPage />} />
                    {navigation
                        .filter(
                            (item) =>
                                !['/', '/teachers', '/assignment'].includes(
                                    item.path,
                                ),
                        )
                        .map((item) => (
                            <Route
                                key={item.path}
                                path={item.path.slice(1)}
                                element={<LayoutPlaceholder />}
                            />
                        ))}
                    <Route path="settings" element={<LayoutPlaceholder />} />
                    <Route
                        path="assignment"
                        element={<AssignmentWorkspacePage />}
                    />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
