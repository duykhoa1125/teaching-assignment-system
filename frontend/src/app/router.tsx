import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { AppLayout } from '@/app/layouts/app-layout';
import { OverviewPage } from '@/pages/overview/overview-page';
import { TeachersPage } from '@/pages/teachers/teachers-page';
import { AssignmentWorkspacePage } from '@/pages/assignment-workspace/assignment-workspace-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';

const titles: Record<string, string> = {
    '/': 'Tổng quan',
    '/teachers': 'Giáo viên',
    '/assignment': 'Phân công giảng dạy',
};

function RouteEffects() {
    const { pathname } = useLocation();
    useEffect(() => {
        document.title = `${titles[pathname] ?? 'Không tìm thấy trang'} · TASS Studio`;
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
                    <Route path="teachers" element={<TeachersPage />} />
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
