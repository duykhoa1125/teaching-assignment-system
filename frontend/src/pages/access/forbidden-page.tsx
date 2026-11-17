import { useNavigate } from 'react-router';
import { useSession } from '@/features/session/use-session';
import { activeHomePath, roleDefinitions } from '@/features/session/roles';
import type { AuthRole } from '@/features/session/types';
import { Icon } from '@/shared/ui/icon';

export function ForbiddenPage({
    requestedTitle,
    requestedRole,
}: {
    requestedTitle?: string;
    requestedRole?: AuthRole | null;
}) {
    const navigate = useNavigate();
    const { account, role, deniedTarget, switchRole, setModal } = useSession();

    const targetTitle =
        requestedTitle ?? deniedTarget?.title ?? 'Màn hình được yêu cầu';
    const targetRole = requestedRole ?? deniedTarget?.requestedRole ?? null;
    const switchable =
        Boolean(targetRole) &&
        targetRole !== role &&
        Boolean(account?.roles.includes(targetRole as AuthRole));

    return (
        <section className="access-state">
            <span className="access-code">403 / QUYỀN TRUY CẬP</span>
            <span className="access-symbol">
                <Icon name="shield" />
            </span>
            <h1>
                Không gian này chưa thuộc <br />
                vai trò đang chọn.
            </h1>
            <p>
                Bạn đang làm việc với vai trò{' '}
                <strong>{roleDefinitions[role].label}</strong>. Không thể mở{' '}
                <strong>{targetTitle}</strong> trong không gian này.
            </p>
            <div className="access-actions">
                {switchable && targetRole ? (
                    <button
                        type="button"
                        className="btn primary"
                        onClick={() => void switchRole(targetRole)}
                    >
                        Chuyển sang {roleDefinitions[targetRole].label}
                    </button>
                ) : null}
                <button
                    type="button"
                    className={switchable ? 'btn' : 'btn primary'}
                    onClick={() => navigate(activeHomePath(account, role))}
                >
                    Về không gian của tôi <Icon name="arrow" />
                </button>
                <button
                    type="button"
                    className="btn"
                    onClick={() => setModal('permissions')}
                >
                    Xem quyền của tôi
                </button>
            </div>
            <small>Dữ liệu của màn hình được yêu cầu chưa được mở.</small>
        </section>
    );
}
