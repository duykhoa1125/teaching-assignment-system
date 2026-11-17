import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react';
import { flushSync } from 'react-dom';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon } from '@/shared/ui/icon';
import { BrandMark } from '@/shared/ui/brand-mark';
import { PageHeadingTarget } from '@/shared/ui/page-heading-context';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { useToast } from '@/shared/ui/toast-context';
import { useTeacherPersonalQuery } from '@/features/session/queries';
import { PillBadge, RoleStateCard } from '@/features/session/role-ui';
import {
    accountPortraitSpec,
    resolveGuardedPageTitle,
    roleDefinitions,
    roleSearchDestinations,
} from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import type { AuthRole } from '@/features/session/types';
import { ShellModal } from './shell-modal';
import { ShellSearch } from './shell-search';
import './shell-interactions.css';
import './sidebar-collapse.css';
import './compact-page-header.css';

type QuickState = {
    left: number;
    top: number;
};

export function AppLayout() {
    const [headingTarget, setHeadingTarget] = useState<HTMLDivElement | null>(
        null,
    );
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const notify = useToast();
    const {
        isMockMode,
        account,
        role,
        contexts,
        contextId,
        activeContext: context,
        isAuthenticated,
        logout,
        switchRole,
        switchContext,
        triggerForbidden,
        modal,
        setModal,
    } = useSession();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            return (
                window.localStorage.getItem('tass-sidebar-collapsed') === 'true'
            );
        } catch {
            return false;
        }
    });
    const [quick, setQuick] = useState<QuickState | null>(null);
    const menuRef = useRef<HTMLButtonElement>(null);
    const workspaceRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLButtonElement>(null);
    const quickRef = useRef<HTMLDivElement>(null);
    const transitionRunning = useRef(false);
    const contentSlide = useRef<Animation | null>(null);

    function toggleSidebar() {
        const content = document.querySelector<HTMLElement>('.tass-shell .app');
        const previousLeft = content?.getBoundingClientRect().left;
        contentSlide.current?.cancel();
        flushSync(() => setSidebarCollapsed((value) => !value));
        if (
            !content ||
            previousLeft === undefined ||
            typeof content.animate !== 'function' ||
            typeof CSS.registerProperty !== 'function' ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
        )
            return;
        const delta = previousLeft - content.getBoundingClientRect().left;
        contentSlide.current = content.animate(
            [{ transform: `translateX(${delta}px)` }, { transform: 'none' }],
            { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
    }

    useEffect(() => () => contentSlide.current?.cancel(), []);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                'tass-sidebar-collapsed',
                String(sidebarCollapsed),
            );
        } catch {
            // The sidebar remains usable when browser storage is unavailable.
        }
    }, [sidebarCollapsed]);

    const teacherNotificationsQuery = useTeacherPersonalQuery(
        contextId,
        account?.teacherId,
        isMockMode && role === 'teacher' && modal === 'notifications',
    );

    const roleDef = roleDefinitions[role];
    const hasSchoolScope = !isMockMode || Boolean(account?.school);
    const progress = context?.total
        ? Math.round((context.assigned / context.total) * 100)
        : 0;
    const unassigned = context ? context.total - context.assigned : 0;
    const portraitSpec = accountPortraitSpec(account);
    const hasMultiRole = Boolean(account && account.roles.length > 1);
    const roleListLabel = account
        ? account.roles.map((item) => roleDefinitions[item].label).join(', ')
        : roleDef.label;

    function closeMobile() {
        setMobileOpen(false);
        requestAnimationFrame(() => menuRef.current?.focus());
    }
    function openQuick(anchor: HTMLElement) {
        if (quick) {
            quickRef.current?.hidePopover?.();
            setQuick(null);
            workspaceRef.current?.focus();
            return;
        }
        const rect = anchor.getBoundingClientRect();
        setQuick({
            left: Math.max(14, Math.min(rect.left, innerWidth - 338)),
            top: Math.min(rect.bottom + 8, innerHeight - 260),
        });
    }
    function go(to: string) {
        quickRef.current?.hidePopover?.();
        setQuick(null);
        setModal(null);
        setMobileOpen(false);
        if (pathname === to) return;
        if (
            !document.startViewTransition ||
            matchMedia('(prefers-reduced-motion: reduce)').matches ||
            transitionRunning.current
        ) {
            navigate(to);
            return;
        }
        transitionRunning.current = true;
        try {
            const transition = document.startViewTransition(() =>
                flushSync(() => navigate(to)),
            );
            void transition.finished
                .catch(() => {})
                .finally(() => {
                    transitionRunning.current = false;
                });
        } catch {
            transitionRunning.current = false;
            navigate(to);
        }
    }
    useEffect(() => {
        if (!quick) return;
        const element = quickRef.current;
        if (!element) return;
        if (typeof element.showPopover === 'function') element.showPopover();
        else element.classList.add('popover-fallback');
        const rect = workspaceRef.current?.getBoundingClientRect();
        const height = element.getBoundingClientRect().height;
        if (rect)
            element.style.setProperty(
                '--quick-top',
                `${rect.bottom + height + 12 > innerHeight ? Math.max(12, rect.top - height - 8) : rect.bottom + 8}px`,
            );
        element.querySelector<HTMLElement>('button')?.focus();
        const dismiss = (event: PointerEvent) => {
            if (
                !element.contains(event.target as Node) &&
                !workspaceRef.current?.contains(event.target as Node)
            )
                setQuick(null);
        };
        document.addEventListener('pointerdown', dismiss);
        return () => document.removeEventListener('pointerdown', dismiss);
    }, [quick]);
    useEffect(() => {
        if (mobileOpen) workspaceRef.current?.focus();
        const previous = document.body.style.overflow;
        if (mobileOpen || modal) document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [mobileOpen, modal]);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k' &&
                !modal
            ) {
                event.preventDefault();
                setMobileOpen(false);
                setModal('search');
            }
            if (event.key === 'Escape' && quick) {
                event.preventDefault();
                quickRef.current?.hidePopover?.();
                setQuick(null);
                workspaceRef.current?.focus();
            }
            if (event.key === 'Escape' && mobileOpen && !quick && !modal)
                closeMobile();
            if (event.key === 'Tab' && mobileOpen && !quick && !modal) {
                const buttons = Array.from(
                    document.querySelectorAll<HTMLButtonElement>(
                        '#sidebar button:not(:disabled)',
                    ),
                ).filter((button) => button.getClientRects().length > 0);
                const first = buttons[0],
                    last = buttons.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        const onResize = () => {
            if (innerWidth > 700) setMobileOpen(false);
            quickRef.current?.hidePopover?.();
            setQuick(null);
        };
        addEventListener('keydown', onKey);
        addEventListener('resize', onResize);
        return () => {
            removeEventListener('keydown', onKey);
            removeEventListener('resize', onResize);
        };
    }, [mobileOpen, quick, modal, setModal]);

    return (
        <div
            className={`tass-shell${mobileOpen ? ' mobile-nav-open' : ''}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
        >
            <a className="sr-only" href="#main-content">
                Đi tới nội dung chính
            </a>
            <aside
                className={`sidebar${mobileOpen ? ' open' : ''}`}
                id="sidebar"
                aria-label="Điều hướng chính"
            >
                <div className="brand">
                    <div className="brandmark">
                        <BrandMark size={27} />
                    </div>
                    <div className="brand-copy">
                        <div className="brandword">
                            tass<span>.</span>
                        </div>
                        <div className="brand-caption">THE ART OF BALANCE</div>
                    </div>
                    <button
                        type="button"
                        className="icon-btn sidebar-toggle"
                        aria-controls="sidebar"
                        aria-expanded={!sidebarCollapsed}
                        aria-label={
                            sidebarCollapsed
                                ? 'Mở rộng sidebar'
                                : 'Thu gọn sidebar'
                        }
                        title={
                            sidebarCollapsed
                                ? 'Mở rộng sidebar'
                                : 'Thu gọn sidebar'
                        }
                        onClick={() => {
                            quickRef.current?.hidePopover?.();
                            setQuick(null);
                            toggleSidebar();
                        }}
                    >
                        <Icon name="chevron" />
                    </button>
                </div>
                <button
                    ref={workspaceRef}
                    className="workspace"
                    type="button"
                    aria-label="Chọn học kỳ và đợt phân công"
                    title={`${context?.school ?? 'THPT An Hòa'} · ${context?.label ?? 'Chọn học kỳ và đợt phân công'}`}
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(quick)}
                    disabled={
                        contexts.length === 0 ||
                        (isMockMode && Boolean(account && !account.school))
                    }
                    onClick={(event) => openQuick(event.currentTarget)}
                >
                    <span className="school-symbol">
                        <Icon name="school" />
                    </span>
                    <span className="grow stack">
                        <strong>
                            {isMockMode && account && !account.school
                                ? 'Chưa có đơn vị'
                                : (context?.school ?? 'THPT An Hòa')}
                        </strong>
                        <small>
                            {isMockMode && account && !account.school
                                ? 'Liên hệ quản trị viên'
                                : (context?.label ??
                                  (isMockMode
                                      ? 'Đang tải học kỳ…'
                                      : 'Năm học 2026–2027'))}
                        </small>
                    </span>
                    <Icon name="down" />
                </button>
                <div className="nav-label">{roleDef.space}</div>
                <nav className="nav" aria-label={roleDef.space}>
                    {roleDef.nav.map((item) => (
                        <Fragment key={item.path}>
                            {item.group && (
                                <div className="mvp-nav-group">
                                    {item.group}
                                </div>
                            )}
                            <button
                                type="button"
                                aria-label={item.label}
                                title={item.label}
                                className={
                                    pathname === item.path ? 'active' : ''
                                }
                                aria-current={
                                    pathname === item.path ? 'page' : undefined
                                }
                                disabled={
                                    isMockMode &&
                                    Boolean(account && !account.school)
                                }
                                onClick={() => go(item.path)}
                            >
                                <Icon name={item.icon} />
                                <span>{item.label}</span>
                                {role === 'manager' &&
                                    hasSchoolScope &&
                                    item.count === 'unassigned' &&
                                    unassigned > 0 && (
                                        <span className="count">
                                            {unassigned}
                                        </span>
                                    )}
                                {role === 'manager' &&
                                    hasSchoolScope &&
                                    item.count === 'feedback' &&
                                    Boolean(context?.feedback) && (
                                        <span className="count">
                                            {context?.feedback}
                                        </span>
                                    )}
                            </button>
                        </Fragment>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    {role === 'manager' && hasSchoolScope && context ? (
                        <div
                            className="semester-box"
                            title={`${context.round} · Tiến độ phân công ${progress}%`}
                        >
                            <div className="between">
                                <strong>
                                    {context.round} · Tiến độ phân công
                                </strong>
                                <span className="mono">{progress}%</span>
                            </div>
                            <div
                                className="track"
                                role="progressbar"
                                aria-label="Tiến độ phân công"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <i style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    ) : isMockMode ? (
                        <div className="role-boundary">
                            <Icon name="shield" />
                            <span>
                                {role === 'teacher'
                                    ? 'Chỉ dữ liệu cá nhân'
                                    : 'Phạm vi theo vai trò đang chọn'}
                            </span>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        className="profile account-control"
                        aria-label="Tài khoản cá nhân"
                        aria-haspopup="dialog"
                        title={
                            sidebarCollapsed
                                ? `${account?.name ?? 'Nguyễn Minh Khoa'} · ${roleDef.label}`
                                : 'Hồ sơ, cài đặt và vai trò'
                        }
                        onClick={() => {
                            setMobileOpen(false);
                            if (isMockMode && !isAuthenticated) {
                                navigate('/login');
                                return;
                            }
                            setModal('profile');
                        }}
                    >
                        <PortraitAvatar
                            portraitKey={portraitSpec.portraitKey}
                            colorIndex={portraitSpec.colorIndex}
                        />
                        <span className="grow stack account-identity">
                            <strong>
                                {isMockMode
                                    ? (account?.name ?? 'Chưa đăng nhập')
                                    : 'Nguyễn Minh Khoa'}
                            </strong>
                            <small>
                                {isMockMode
                                    ? account
                                        ? roleDef.label
                                        : 'Mở trang đăng nhập'
                                    : roleDef.label}
                            </small>
                        </span>
                        <Icon name="down" />
                    </button>
                </div>
            </aside>
            <button
                type="button"
                className="nav-backdrop"
                aria-label="Đóng điều hướng"
                tabIndex={mobileOpen ? 0 : -1}
                onClick={closeMobile}
            />
            <div className="app" inert={mobileOpen || undefined}>
                <header className="topbar">
                    <div className="header-page-main">
                        <button
                            ref={menuRef}
                            type="button"
                            className="icon-btn mobile-menu"
                            aria-expanded={mobileOpen}
                            aria-controls="sidebar"
                            aria-label="Mở điều hướng"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            <Icon name="menu" />
                        </button>
                        <div className="header-page-stack">
                            <div
                                ref={setHeadingTarget}
                                className="header-page-title"
                            />
                            <nav
                                className="breadcrumb header-breadcrumb"
                                aria-label="Đường dẫn trang"
                            >
                                <Link
                                    to={roleDef.home}
                                    aria-label={`Tổng quan ${roleDef.label}`}
                                    title={roleDef.label}
                                >
                                    <Icon name={roleDef.icon} />
                                </Link>
                                <span aria-hidden="true">/</span>
                                <b id="breadcrumb" aria-current="page">
                                    {resolveGuardedPageTitle(
                                        pathname,
                                        role,
                                        hasSchoolScope,
                                        isMockMode,
                                    )}
                                </b>
                            </nav>
                        </div>
                    </div>
                    <div className="top-actions">
                        <button
                            ref={searchRef}
                            type="button"
                            className="global-search"
                            aria-label="Tìm kiếm nhanh"
                            onClick={() => setModal('search')}
                        >
                            <Icon name="search" />
                            <span>Tìm trong không gian này...</span>
                            <kbd>Ctrl K</kbd>
                        </button>
                        <button
                            type="button"
                            className="icon-btn"
                            aria-label="Thông báo"
                            disabled={
                                isMockMode &&
                                Boolean(account && !account.school)
                            }
                            onClick={() => setModal('notifications')}
                        >
                            <Icon name="bell" />
                        </button>
                    </div>
                </header>

                <main id="main-content" className="main" tabIndex={-1}>
                    <PageHeadingTarget.Provider value={headingTarget}>
                        <Outlet context={context} />
                    </PageHeadingTarget.Provider>
                    <footer className="footer role-footer">
                        <span className="flex">
                            <i className="live-dot" />
                            {roleDef.label}
                            <span>·</span>
                            {hasSchoolScope ? 'THPT An Hòa' : 'Chưa có phạm vi'}
                        </span>
                        <span>
                            {isMockMode
                                ? 'Trải nghiệm HTML · Quyền mô phỏng'
                                : 'TASS Studio · Chế độ API'}
                        </span>
                    </footer>
                </main>
            </div>
            {quick && (
                <div
                    ref={quickRef}
                    popover="auto"
                    className="quick-popover workspace-popover"
                    role="dialog"
                    aria-label="Chọn học kỳ và đợt phân công"
                    style={
                        {
                            '--quick-left': `${quick.left}px`,
                            '--quick-top': `${quick.top}px`,
                        } as CSSProperties
                    }
                    onToggle={(event) => {
                        if (
                            (event.nativeEvent as ToggleEvent).newState ===
                            'closed'
                        )
                            setQuick(null);
                    }}
                >
                    <div className="quick-head">
                        <div>
                            <h3>Học kỳ & đợt phân công</h3>
                            <p>Chọn không gian dữ liệu được cấp.</p>
                        </div>
                        <button
                            type="button"
                            className="icon-btn"
                            aria-label="Đóng chọn học kỳ"
                            onClick={() => setQuick(null)}
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                    <div className="quick-body">
                        <>
                            {contexts.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={`context-option${item.id === contextId ? ' active' : ''}`}
                                    onClick={() => {
                                        setQuick(null);
                                        setMobileOpen(false);
                                        void switchContext(item.id);
                                    }}
                                >
                                    <span className="school-symbol">
                                        <Icon name="calendar" />
                                    </span>
                                    <span className="grow stack">
                                        <strong>{item.label}</strong>
                                        <small>
                                            {item.round} ·{' '}
                                            {item.id === contextId
                                                ? 'Đang làm việc'
                                                : 'Không gian dữ liệu riêng'}
                                        </small>
                                    </span>
                                    <Icon
                                        name={
                                            item.id === contextId
                                                ? 'check'
                                                : 'chevron'
                                        }
                                    />
                                </button>
                            ))}
                            <div className="mvp-note">
                                <Icon name="shield" />
                                <span>
                                    Mỗi không gian giữ dữ liệu đã lưu riêng. Các
                                    phiên bản chỉ đọc và PDF được giữ trong đúng
                                    đợt nguồn.
                                </span>
                            </div>
                        </>
                    </div>
                </div>
            )}
            <ShellModal
                open={modal === 'search'}
                onClose={() => setModal(null)}
                title="Tìm trong không gian của bạn."
                subtitle={roleDef.label}
            >
                {modal === 'search' && (
                    <ShellSearch
                        onNavigate={go}
                        destinations={roleSearchDestinations(
                            role,
                            hasSchoolScope,
                        )}
                    />
                )}
            </ShellModal>
            <ShellModal
                open={modal === 'notifications'}
                onClose={() => setModal(null)}
                title={
                    role === 'teacher'
                        ? 'Cập nhật dành cho bạn'
                        : role === 'admin'
                          ? 'Thông tin quản trị'
                          : 'Điều cần bạn lưu tâm'
                }
                subtitle={
                    role === 'teacher'
                        ? (context?.label ?? 'Học kỳ hiện tại')
                        : role === 'admin'
                          ? 'THPT An Hòa'
                          : 'Phương án đang làm việc'
                }
            >
                {role === 'teacher' ? (
                    <>
                        <div className="modal-body">
                            <RoleStateCard
                                kind="success"
                                title={`${teacherNotificationsQuery.data?.resolved_feedback_count ?? 0} phản hồi đã có kết quả`}
                                detail="Chỉ hiển thị thông tin thuộc hồ sơ của bạn."
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => go('/teacher/feedback')}
                            >
                                Xem phản hồi của tôi
                            </button>
                        </div>
                    </>
                ) : role === 'admin' ? (
                    <>
                        <div className="modal-body">
                            <RoleStateCard
                                kind="empty"
                                title="Không có thông báo quản trị mới"
                                detail="Bạn có thể kiểm tra trạng thái tài khoản trong không gian quản trị."
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => go('/admin/accounts')}
                            >
                                Xem tài khoản
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="modal-body">
                        <div className="issue">
                            <span className="issue-symbol">
                                <Icon name="assignment" />
                            </span>
                            <div className="grow">
                                <strong>
                                    {unassigned} nhu cầu chưa phân công
                                </strong>
                                <p>Rà soát trong bảng phân công.</p>
                            </div>
                            <button
                                className="icon-btn"
                                type="button"
                                aria-label={`${unassigned} nhu cầu chưa phân công`}
                                onClick={() => go('/assignment')}
                            >
                                <Icon name="chevron" />
                            </button>
                        </div>
                        <div className="issue">
                            <span className="issue-symbol">
                                <Icon name="feedback" />
                            </span>
                            <div className="grow">
                                <strong>
                                    {context?.feedback ?? 0} phản hồi chờ xử lý
                                </strong>
                                <p>Ghi nhận kết quả từng ý kiến.</p>
                            </div>
                            <button
                                className="icon-btn"
                                type="button"
                                aria-label={`${context?.feedback ?? 0} phản hồi chờ xử lý`}
                                onClick={() => go('/feedback')}
                            >
                                <Icon name="chevron" />
                            </button>
                        </div>
                    </div>
                )}
            </ShellModal>
            <ShellModal
                open={modal === 'profile'}
                onClose={() => setModal(null)}
                title={account?.name ?? 'Nguyễn Minh Khoa'}
                subtitle={roleDef.label}
            >
                <div className="modal-body">
                    <div className="account-portrait">
                        <PortraitAvatar
                            portraitKey={portraitSpec.portraitKey}
                            colorIndex={portraitSpec.colorIndex}
                        />
                        <div>
                            <h3>{account?.login ?? 'Chế độ API'}</h3>
                            <p>
                                {hasSchoolScope
                                    ? 'THPT An Hòa'
                                    : 'Chưa có phạm vi truy cập'}
                            </p>
                            <button
                                className="btn small"
                                type="button"
                                onClick={() =>
                                    notify({
                                        title: 'Ảnh đại diện mẫu',
                                        description:
                                            'Thay ảnh sẽ được bổ sung ở màn hình hồ sơ.',
                                    })
                                }
                            >
                                <Icon name="edit" />
                                Đổi ảnh đại diện
                            </button>
                        </div>
                    </div>
                    <div className="detail-grid">
                        <div>
                            <small>Vai trò đang dùng</small>
                            {roleDef.name}
                        </div>
                        <div>
                            <small>Vai trò được cấp</small>
                            {roleListLabel}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn primary"
                        type="button"
                        onClick={() => go('/settings')}
                    >
                        Hồ sơ &amp; cài đặt
                    </button>
                    <button
                        className="btn"
                        type="button"
                        onClick={() => setModal('session')}
                    >
                        Phiên &amp; quyền
                    </button>
                    {hasMultiRole ? (
                        <button
                            className="btn"
                            type="button"
                            onClick={() => setModal('switcher')}
                        >
                            Chuyển vai trò
                        </button>
                    ) : null}
                    {isMockMode ? (
                        <button
                            className="btn danger"
                            type="button"
                            onClick={() => void logout('logout')}
                        >
                            Đăng xuất
                        </button>
                    ) : null}
                </div>
            </ShellModal>
            <ShellModal
                open={modal === 'session'}
                onClose={() => setModal(null)}
                title="Phiên làm việc & quyền truy cập"
                subtitle={account?.login ?? 'Chế độ API'}
            >
                <div className="modal-body">
                    <div className="detail-grid">
                        <div>
                            <small>Tài khoản</small>
                            {account?.name ?? 'Nguyễn Minh Khoa'}
                        </div>
                        <div>
                            <small>Vai trò đang dùng</small>
                            {roleDef.label}
                        </div>
                        <div>
                            <small>Phạm vi</small>
                            {hasSchoolScope ? 'THPT An Hòa' : 'Chưa được gán'}
                        </div>
                        <div>
                            <small>Không hoạt động tối đa</small>
                            30 phút
                        </div>
                    </div>
                    <p className="modal-note">
                        Đăng xuất sẽ kết thúc phiên ở tab này. Các thay đổi đã
                        lưu trong bản demo được giữ nguyên.
                    </p>
                    {isMockMode ? (
                        <div className="session-simulation">
                            <span>Trải nghiệm trạng thái phiên</span>
                            <button
                                type="button"
                                className="btn small"
                                onClick={() => void logout('expired')}
                            >
                                <Icon name="clock" />
                                Giả lập hết phiên
                            </button>
                            <button
                                type="button"
                                className="btn small"
                                onClick={() =>
                                    triggerForbidden({
                                        title:
                                            role === 'manager'
                                                ? 'Tài khoản & vai trò'
                                                : 'Phân công toàn trường',
                                        requestedRole:
                                            role === 'manager'
                                                ? 'admin'
                                                : 'manager',
                                        targetPath:
                                            role === 'manager'
                                                ? '/admin/accounts'
                                                : '/assignment',
                                    })
                                }
                            >
                                <Icon name="shield" />
                                Thử màn hình ngoài quyền
                            </button>
                        </div>
                    ) : null}
                </div>
                <div className="modal-footer">
                    <button
                        className="btn"
                        type="button"
                        onClick={() => setModal(null)}
                    >
                        Đóng
                    </button>
                    {isMockMode ? (
                        <button
                            className="btn danger"
                            type="button"
                            onClick={() => void logout('logout')}
                        >
                            Đăng xuất
                        </button>
                    ) : null}
                </div>
            </ShellModal>
            <ShellModal
                open={modal === 'permissions'}
                onClose={() => setModal(null)}
                title="Quyền trong không gian hiện tại"
                subtitle={roleDef.name}
            >
                <div className="modal-body">
                    <div className="scope-account">
                        <PortraitAvatar
                            portraitKey={portraitSpec.portraitKey}
                            colorIndex={portraitSpec.colorIndex}
                        />
                        <div>
                            <strong>
                                {account?.name ?? 'Nguyễn Minh Khoa'}
                            </strong>
                            <p>
                                {hasSchoolScope
                                    ? 'THPT An Hòa'
                                    : 'Chưa được cấp đơn vị'}
                            </p>
                        </div>
                    </div>
                    <div className="permission-list">
                        {roleDef.nav.map((item) => (
                            <div key={item.path}>
                                <Icon name={item.icon} />
                                <span>{item.label}</span>
                                <PillBadge
                                    label={
                                        hasSchoolScope
                                            ? 'Được truy cập'
                                            : 'Chưa có phạm vi'
                                    }
                                    tone={hasSchoolScope ? '' : 'amber'}
                                />
                            </div>
                        ))}
                    </div>
                    <p className="modal-note">
                        Chế độ HTML đang mô phỏng quyền giao diện. Xác thực và
                        bảo vệ dữ liệu thực sẽ được thực hiện tại máy chủ khi
                        tích hợp.
                    </p>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn primary"
                        type="button"
                        onClick={() => setModal(null)}
                    >
                        Đã hiểu
                    </button>
                </div>
            </ShellModal>
            <ShellModal
                open={modal === 'switcher'}
                onClose={() => setModal(null)}
                title="Chọn không gian làm việc"
                subtitle={`Các vai trò được cấp cho ${account?.name ?? ''}`}
            >
                <div className="modal-body">
                    <div className="auth-role-choices">
                        {(account?.roles ?? []).map((roleKey: AuthRole) => {
                            const r = roleDefinitions[roleKey];
                            return (
                                <button
                                    key={roleKey}
                                    type="button"
                                    onClick={() => void switchRole(roleKey)}
                                >
                                    <span className="auth-role-symbol">
                                        <Icon name={r.icon} />
                                    </span>
                                    <span className="grow">
                                        <strong>{r.label}</strong>
                                        <p>{r.description}</p>
                                    </span>
                                    {role === roleKey ? (
                                        <PillBadge
                                            label="Đang dùng"
                                            tone="gray"
                                        />
                                    ) : (
                                        <Icon name="arrow" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn"
                        type="button"
                        onClick={() => setModal(null)}
                    >
                        Đóng
                    </button>
                </div>
            </ShellModal>
        </div>
    );
}
