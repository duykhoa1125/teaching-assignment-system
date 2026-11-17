import {
    navigation,
    type NavigationItem,
} from '../../app/layouts/navigation.ts';
import type { PrototypeIconName } from '../../shared/ui/prototype-glyphs.ts';
import type { AuthAccount, AuthRole, MockSessionRecord } from './types.ts';

export const AUTH_IDLE_MS = 30 * 60 * 1000;
export const AUTH_TOUCH_THROTTLE_MS = 15_000;
export const AUTH_CHECK_INTERVAL_MS = 10_000;

export type RoleDefinition = {
    name: string;
    label: string;
    space: string;
    home: string;
    icon: PrototypeIconName;
    description: string;
    nav: NavigationItem[];
};

const adminNav: NavigationItem[] = [
    { path: '/admin', label: 'Tổng quan quản trị', icon: 'dashboard' },
    { path: '/admin/accounts', label: 'Tài khoản & vai trò', icon: 'user' },
    { path: '/admin/teachers', label: 'Hồ sơ giáo viên', icon: 'teachers' },
    { path: '/admin/catalogs', label: 'Danh mục nhà trường', icon: 'book' },
    { path: '/admin/periods', label: 'Năm học & đợt', icon: 'calendar' },
    { path: '/admin/rules', label: 'Bộ quy tắc', icon: 'rules' },
    { path: '/admin/access', label: 'Phạm vi & quyền', icon: 'access' },
    { path: '/admin/sources', label: 'Nguồn & bí danh', icon: 'compare' },
    { path: '/admin/audit', label: 'Nhật ký quản trị', icon: 'history' },
];

const teacherNav: NavigationItem[] = [
    { path: '/teacher', label: 'Phân công của tôi', icon: 'assignment' },
    { path: '/teacher/load', label: 'Tải giảng dạy', icon: 'balance' },
    { path: '/teacher/feedback', label: 'Phản hồi của tôi', icon: 'feedback' },
];

export const roleDefinitions: Record<AuthRole, RoleDefinition> = {
    admin: {
        name: 'Administrator',
        label: 'Quản trị viên',
        space: 'Không gian quản trị',
        home: '/admin',
        icon: 'shield',
        description: 'Tài khoản, danh mục và phạm vi truy cập.',
        nav: adminNav,
    },
    manager: {
        name: 'Academic Manager',
        label: 'Quản lý đào tạo',
        space: 'Không gian điều phối',
        home: '/',
        icon: 'assignment',
        description: 'Chuẩn bị, phân công và hoàn thiện phương án.',
        nav: navigation,
    },
    teacher: {
        name: 'Teacher',
        label: 'Giáo viên',
        space: 'Không gian cá nhân',
        home: '/teacher',
        icon: 'user',
        description: 'Phân công, tải công tác và phản hồi của bạn.',
        nav: teacherNav,
    },
};

export const specialPageTitles: Record<string, string> = {
    '/login': 'Đăng nhập',
    '/settings': 'Hồ sơ & cài đặt',
    '/forbidden': 'Không đủ quyền truy cập',
    '/no-scope': 'Chưa có phạm vi truy cập',
    '/dev/ui': 'Thư viện giao diện',
    '/teacher/load': 'Tải giảng dạy cá nhân',
};

export const permissionMatrixRows: readonly [
    string,
    boolean,
    boolean,
    boolean,
][] = [
    ['Quản trị tài khoản và vai trò', true, false, false],
    ['Quản trị danh mục và học kỳ', true, false, false],
    ['Chuẩn bị và chỉnh phương án', false, true, false],
    ['Sinh đề xuất và xem tải đội ngũ', false, true, false],
    ['Mở, xử lý phản hồi và xuất đề xuất', false, true, false],
    ['Xem phân công và tải cá nhân', false, false, true],
    ['Gửi và theo dõi phản hồi cá nhân', false, false, true],
];

export const phaseDisplayLabels: Record<string, string> = {
    DRAFT: 'Bản nháp',
    OPEN_FOR_FEEDBACK: 'Đang lấy ý kiến',
    FEEDBACK_PROCESSING: 'Đang xử lý phản hồi',
    READY_TO_EXPORT: 'Sẵn sàng xuất',
    EXPORTED: 'Đã xuất báo cáo',
};

export function isAuthRole(value: unknown): value is AuthRole {
    return value === 'admin' || value === 'manager' || value === 'teacher';
}

export function isSessionRecordValid(
    session: MockSessionRecord | null | undefined,
    account: AuthAccount | null | undefined,
    now = Date.now(),
): boolean {
    if (!session || !account) return false;
    if (account.status !== 'active' || !account.roles.includes(session.role)) {
        return false;
    }
    if (
        !Number.isFinite(session.lastActivity) ||
        session.lastActivity > now + 5000 ||
        now - session.lastActivity >= AUTH_IDLE_MS
    ) {
        return false;
    }
    const today = new Date(now).toISOString().slice(0, 10);
    if (account.from && account.from > today) return false;
    if (account.to && account.to < today) return false;
    return true;
}

export function roleAllowsPath(role: AuthRole, pathname: string): boolean {
    if (pathname === '/settings') return true;
    return roleDefinitions[role].nav.some((item) => item.path === pathname);
}

export function activeHomePath(
    account: AuthAccount | null | undefined,
    role: AuthRole,
): string {
    if (account && !account.school) return '/no-scope';
    return roleDefinitions[role].home;
}

export function inferRoleForPath(pathname: string): AuthRole | null {
    for (const role of ['admin', 'manager', 'teacher'] as const) {
        if (roleDefinitions[role].nav.some((item) => item.path === pathname)) {
            return role;
        }
    }
    return null;
}

export function rolePageTitle(pathname: string): string {
    if (specialPageTitles[pathname]) return specialPageTitles[pathname];
    for (const role of ['admin', 'manager', 'teacher'] as const) {
        const match = roleDefinitions[role].nav.find(
            (item) => item.path === pathname,
        );
        if (match) return match.label;
    }
    return 'Không tìm thấy trang';
}

export type RouteAccessOutcome =
    | { status: 'allow' }
    | { status: 'no-scope' }
    | { status: 'forbidden'; requestedTitle: string; requiredRole: AuthRole };

export function evaluateRouteAccess(
    pathname: string,
    role: AuthRole,
    hasSchoolScope: boolean,
    isMockMode: boolean,
): RouteAccessOutcome {
    if (
        !isMockMode ||
        ['/login', '/dev/ui', '/settings', '/forbidden', '/no-scope'].includes(
            pathname,
        )
    ) {
        return { status: 'allow' };
    }
    if (!hasSchoolScope) {
        return { status: 'no-scope' };
    }
    if (!roleAllowsPath(role, pathname)) {
        const requiredRole = inferRoleForPath(pathname);
        if (requiredRole) {
            return {
                status: 'forbidden',
                requestedTitle: rolePageTitle(pathname),
                requiredRole,
            };
        }
    }
    return { status: 'allow' };
}

export function resolveGuardedPageTitle(
    pathname: string,
    role: AuthRole,
    hasSchoolScope: boolean,
    isMockMode: boolean,
): string {
    const access = evaluateRouteAccess(
        pathname,
        role,
        hasSchoolScope,
        isMockMode,
    );
    if (access.status === 'no-scope') {
        return rolePageTitle('/no-scope');
    }
    if (access.status === 'forbidden') {
        return rolePageTitle('/forbidden');
    }
    return rolePageTitle(pathname);
}

export function roleSearchDestinations(
    role: AuthRole,
    hasSchoolScope: boolean,
): NavigationItem[] {
    const settingsItem: NavigationItem = {
        path: '/settings',
        label: 'Cài đặt cá nhân',
        icon: 'settings',
    };
    if (!hasSchoolScope) return [settingsItem];
    return [...roleDefinitions[role].nav, settingsItem];
}

export function accountPortraitSpec(account: AuthAccount | null | undefined): {
    portraitKey: 'manager' | number;
    colorIndex: number;
} {
    if (!account) {
        return { portraitKey: 'manager', colorIndex: 0 };
    }
    if (account.portraitId === 'manager') {
        return { portraitKey: 'manager', colorIndex: 0 };
    }
    if (account.teacherId !== undefined) {
        const portrait =
            typeof account.portraitId === 'number'
                ? account.portraitId
                : account.teacherId;
        return {
            portraitKey: portrait,
            colorIndex: (Math.abs(portrait) - 1) % 6,
        };
    }
    const id = account.portraitId ?? 1;
    return { portraitKey: id, colorIndex: 1 };
}
