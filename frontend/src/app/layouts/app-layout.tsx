import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react';
import { flushSync } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/shared/ui/icon';
import { useToast } from '@/shared/ui/toast-context';
import { readWorkspacePreview } from '@/features/workspace/api';
import { navigation, pageTitle } from './navigation';
import { ShellModal } from './shell-modal';
import { ShellSearch } from './shell-search';
import managerPortrait from '@/assets/demo/manager.svg';
import './shell-interactions.css';

type QuickState = {
    left: number;
    top: number;
};

export function AppLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const client = useQueryClient();
    const notify = useToast();
    const preview = useQuery({
        queryKey: ['mock-layout'],
        queryFn: ({ signal }) => readWorkspacePreview(signal),
        enabled: import.meta.env.VITE_DATA_SOURCE === 'mock',
        retry: false,
    });
    const [contextId, setContextId] = useState('hk1');
    const context = preview.data?.contexts.find(
        (item) => item.id === contextId,
    );
    const account = preview.data?.account;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [quick, setQuick] = useState<QuickState | null>(null);
    const [modal, setModal] = useState<
        'profile' | 'session' | 'search' | 'notifications' | null
    >(null);
    const menuRef = useRef<HTMLButtonElement>(null);
    const workspaceRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLButtonElement>(null);
    const quickRef = useRef<HTMLDivElement>(null);
    const transitionRunning = useRef(false);
    const progress = context?.total
        ? Math.round((context.assigned / context.total) * 100)
        : 0;
    const unassigned = context ? context.total - context.assigned : 0;

    function closeMobile() {
        setMobileOpen(false);
        requestAnimationFrame(() => menuRef.current?.focus());
    }
    function openQuick(anchor: HTMLElement) {
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
            if (
                event.key === 'Escape' &&
                quick &&
                typeof quickRef.current?.hidePopover !== 'function'
            ) {
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
                );
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
    }, [mobileOpen, quick, modal]);

    return (
        <div className={`tass-shell${mobileOpen ? ' mobile-nav-open' : ''}`}>
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
                        <Icon name="brand" size={27} />
                    </div>
                    <div>
                        <div className="brandword">
                            tass<span>.</span>
                        </div>
                        <div className="brand-caption">THE ART OF BALANCE</div>
                    </div>
                </div>
                <button
                    ref={workspaceRef}
                    className="workspace"
                    type="button"
                    aria-label="Chọn học kỳ và đợt phân công"
                    aria-haspopup="dialog"
                    disabled={!context}
                    onClick={(event) => openQuick(event.currentTarget)}
                >
                    <span className="school-symbol">
                        <Icon name="school" />
                    </span>
                    <span className="grow stack">
                        <strong>{context?.school ?? 'Chưa có đơn vị'}</strong>
                        <small>
                            {context?.label ??
                                (preview.isFetching
                                    ? 'Đang tải ngữ cảnh…'
                                    : 'Chưa chọn học kỳ')}
                        </small>
                    </span>
                    <Icon name="down" />
                </button>
                <div className="nav-label">Không gian điều phối</div>
                <nav className="nav" aria-label="Các màn hình điều phối">
                    {navigation.map((item) => (
                        <Fragment key={item.path}>
                            {item.group && (
                                <div className="mvp-nav-group">
                                    {item.group}
                                </div>
                            )}
                            <button
                                type="button"
                                className={
                                    pathname === item.path ? 'active' : ''
                                }
                                aria-current={
                                    pathname === item.path ? 'page' : undefined
                                }
                                onClick={() => go(item.path)}
                            >
                                <Icon name={item.icon} />
                                <span>{item.label}</span>
                                {item.count === 'unassigned' &&
                                    unassigned > 0 && (
                                        <span className="count">
                                            {unassigned}
                                        </span>
                                    )}
                                {item.count === 'feedback' &&
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
                    {context && context.total > 0 && (
                        <div className="semester-box">
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
                    )}
                    <button
                        type="button"
                        className="profile account-control"
                        aria-label="Tài khoản cá nhân"
                        aria-haspopup="dialog"
                        title="Hồ sơ, cài đặt và vai trò"
                        onClick={() => {
                            setMobileOpen(false);
                            setModal('profile');
                        }}
                        disabled={!account}
                    >
                        <span className="avatar portrait c0" aria-hidden="true">
                            <img
                                src={managerPortrait}
                                alt=""
                                width={80}
                                height={80}
                                decoding="async"
                            />
                        </span>
                        <span className="grow stack account-identity">
                            <strong>{account?.name ?? 'Chưa đăng nhập'}</strong>
                            <small>
                                {account?.role ?? 'Chưa có phiên làm việc'}
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
                    <div className="flex">
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
                        <div className="breadcrumb">
                            <Icon name="assignment" />
                            <span>/</span>
                            <span>Không gian điều phối</span>
                            <span>/</span>
                            <b id="breadcrumb">{pageTitle(pathname)}</b>
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
                            onClick={() => setModal('notifications')}
                        >
                            <Icon name="bell" />
                        </button>
                    </div>
                </header>
                <main id="main-content" className="main" tabIndex={-1}>
                    <Outlet context={context} />
                    <footer className="footer role-footer">
                        <span className="flex">
                            <i className="live-dot" />
                            {account?.role ?? 'Chưa đăng nhập'}
                            <span>·</span>
                            {context?.school ?? 'Chưa có phạm vi'}
                        </span>
                        <span>Trải nghiệm HTML · Quyền mô phỏng</span>
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
                            {preview.data?.contexts.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={`context-option${item.id === contextId ? ' active' : ''}`}
                                    onClick={() => {
                                        void client.cancelQueries();
                                        client.removeQueries({
                                            predicate: (query) =>
                                                query.queryKey[0] !==
                                                'mock-layout',
                                        });
                                        setContextId(item.id);
                                        setQuick(null);
                                        setMobileOpen(false);
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
                subtitle={account?.role}
            >
                {modal === 'search' && <ShellSearch onNavigate={go} />}
            </ShellModal>
            <ShellModal
                open={modal === 'notifications'}
                onClose={() => setModal(null)}
                title="Điều cần bạn lưu tâm"
                subtitle="Phương án đang làm việc"
            >
                <div className="modal-body">
                    <div className="issue">
                        <span className="issue-symbol">
                            <Icon name="assignment" />
                        </span>
                        <div className="grow">
                            <strong>{unassigned} nhu cầu chưa phân công</strong>
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
            </ShellModal>
            <ShellModal
                open={modal === 'profile' || modal === 'session'}
                onClose={() => setModal(null)}
                title={
                    modal === 'session'
                        ? 'Phiên & quyền'
                        : (account?.name ?? '')
                }
                subtitle={account?.role}
            >
                <div className="modal-body">
                    <div className="account-portrait">
                        <span className="avatar portrait c0" aria-hidden="true">
                            <img
                                src={managerPortrait}
                                alt=""
                                width={80}
                                height={80}
                            />
                        </span>
                        <div>
                            <h3>{account?.email}</h3>
                            <p>{context?.school}</p>
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
                            {account?.roleCode}
                        </div>
                        <div>
                            <small>Vai trò được cấp</small>
                            {account?.role}
                        </div>
                    </div>
                    {modal === 'session' && (
                        <p className="shell-preview-note">
                            Đây là ngữ cảnh xem thử giao diện, chưa phải phiên
                            xác thực.
                        </p>
                    )}
                </div>
                <div className="modal-footer">
                    <button
                        className="btn primary"
                        type="button"
                        onClick={() => {
                            setModal(null);
                            go('/settings');
                        }}
                    >
                        Hồ sơ & cài đặt
                    </button>
                    <button
                        className="btn"
                        type="button"
                        onClick={() => setModal('session')}
                    >
                        Phiên & quyền
                    </button>
                    <button
                        className="btn danger"
                        type="button"
                        onClick={() => {
                            setModal(null);
                            notify({
                                title: 'Đã đóng thông tin tài khoản mẫu',
                                description:
                                    'Chưa có phiên đăng nhập cần kết thúc.',
                            });
                        }}
                    >
                        Đăng xuất
                    </button>
                </div>
            </ShellModal>
        </div>
    );
}
