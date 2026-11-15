import { Link } from 'react-router';
import { RolePageHeader, PillBadge } from '@/features/session/role-ui';
import { accountPortraitSpec, roleDefinitions } from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { useToast } from '@/shared/ui/toast-context';

export function SettingsPage() {
    const { isMockMode, account, role, setModal, logout } = useSession();
    const notify = useToast();

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Một không gian mang dấu ấn của bạn."
                    description="Ảnh đại diện và phiên làm việc hiện tại."
                />
                <EmptyState
                    title="Hồ sơ & cài đặt chưa nối API thật"
                    action={
                        <Link to="/teachers" className="button">
                            Mở Đội ngũ giáo viên
                        </Link>
                    }
                >
                    Phiên làm việc mô phỏng chỉ bật trong chế độ minh họa
                    (`VITE_DATA_SOURCE=mock`).
                </EmptyState>
            </>
        );
    }

    const spec = accountPortraitSpec(account);
    const hasMultiRole = Boolean(account && account.roles.length > 1);

    return (
        <>
            <RolePageHeader
                title="Một không gian mang dấu ấn của bạn."
                description="Ảnh đại diện và phiên làm việc hiện tại."
            />
            <div className="role-module-grid">
                <section className="panel role-module account-settings">
                    <h2>Hồ sơ cá nhân</h2>
                    <div className="account-portrait">
                        <PortraitAvatar
                            portraitKey={spec.portraitKey}
                            colorIndex={spec.colorIndex}
                        />
                        <div>
                            <h3>{account?.name ?? 'Chưa đăng nhập'}</h3>
                            <p>{account?.login ?? '—'}</p>
                            <button
                                type="button"
                                className="btn small"
                                onClick={() =>
                                    notify({
                                        title: 'Cập nhật ảnh đại diện cá nhân sẽ được bổ sung ở bước tiếp theo.',
                                        tone: 'info',
                                    })
                                }
                            >
                                <Icon name="edit" />
                                Đổi ảnh đại diện
                            </button>
                        </div>
                    </div>
                    <div className="setting-row">
                        <span>Vai trò đang dùng</span>
                        <PillBadge
                            label={roleDefinitions[role].label}
                            tone="gray"
                        />
                    </div>
                    <div className="setting-row">
                        <span>Phạm vi</span>
                        <strong>
                            {account?.school ? 'THPT An Hòa' : 'Chưa được gán'}
                        </strong>
                    </div>
                </section>

                <section className="panel role-module">
                    <h2>Phiên làm việc</h2>
                    <div className="setting-row">
                        <span>Hết phiên khi không hoạt động</span>
                        <strong>30 phút</strong>
                    </div>
                    <div className="role-settings-actions">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setModal('session')}
                        >
                            <Icon name="shield" />
                            Phiên &amp; quyền truy cập
                        </button>
                        {hasMultiRole ? (
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setModal('switcher')}
                            >
                                Chuyển vai trò
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="btn danger"
                            onClick={() => void logout('logout')}
                        >
                            <Icon name="logout" />
                            Đăng xuất
                        </button>
                    </div>
                </section>
            </div>
        </>
    );
}
