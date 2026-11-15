import { NavLink, Outlet } from 'react-router';
import styles from './app-layout.module.css';

const navigation = [
    { to: '/', label: 'Tổng quan', symbol: '◫' },
    { to: '/teachers', label: 'Giáo viên', symbol: '♧' },
    { to: '/assignment', label: 'Phân công giảng dạy', symbol: '▦' },
];

export function AppLayout() {
    return (
        <div className={styles.shell}>
            <a className="skip-link" href="#main-content">
                Đến nội dung chính
            </a>
            <aside className={styles.sidebar}>
                <NavLink
                    to="/"
                    className={styles.brand}
                    aria-label="TASS Studio — Tổng quan"
                >
                    <span className={styles.brandmark} aria-hidden="true">
                        t.
                    </span>
                    <span>
                        <strong>
                            TASS <span>Studio</span>
                        </strong>
                        <small>Teaching in balance</small>
                    </span>
                </NavLink>
                <div className={styles.workspace}>
                    <span className={styles.workspaceIcon} aria-hidden="true">
                        ⌂
                    </span>
                    <div>
                        <strong>Không gian nhà trường</strong>
                        <small>Điều phối giảng dạy</small>
                    </div>
                </div>
                <p className={styles.navLabel}>KHÔNG GIAN LÀM VIỆC</p>
                <nav
                    className={styles.navigation}
                    aria-label="Điều hướng chính"
                >
                    {navigation.map(({ to, label, symbol }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `${styles.navLink} ${isActive ? styles.active : ''}`
                            }
                        >
                            <span className={styles.navIcon} aria-hidden="true">
                                {symbol}
                            </span>
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className={styles.sidebarFooter}>
                    <span className={styles.footerDot} aria-hidden="true" />
                    <span>Bản phát triển ban đầu</span>
                </div>
            </aside>
            <div className={styles.content}>
                <header className={styles.topbar}>
                    <span>
                        Nhà trường <span className={styles.separator}>/</span>{' '}
                        Không gian làm việc
                    </span>
                    <span className={styles.session}>Chưa đăng nhập</span>
                </header>
                <main id="main-content" tabIndex={-1} className={styles.main}>
                    <Outlet />
                </main>
                <footer className={styles.footer}>
                    TASS Studio{' '}
                    <span>Phân công hợp lý. Giảng dạy hiệu quả.</span>
                </footer>
            </div>
        </div>
    );
}
