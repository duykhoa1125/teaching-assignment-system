import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAdminOverviewQuery } from '@/features/session/queries';
import {
    ActorIdentity,
    PersonIdentity,
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import {
    accountPortraitSpec,
    permissionMatrixRows,
    phaseDisplayLabels,
    roleDefinitions,
} from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import type { AuthAccount, AuthRole } from '@/features/session/types';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import type { PrototypeIconName } from '@/shared/ui/prototype-glyphs';

function AdminKpiCard({
    label,
    value,
    foot,
    iconName,
    tone,
}: {
    label: string;
    value: string | number;
    foot: string;
    iconName: PrototypeIconName;
    tone: 'sage' | 'clay' | 'brass' | 'neutral';
}) {
    return (
        <div className={`mvp-kpi kpi-${tone}`}>
            <span className="mvp-kpi-label">
                {label}
                <i aria-hidden="true">
                    <Icon name={iconName} />
                </i>
            </span>
            <strong>{value}</strong>
            <small>{foot}</small>
        </div>
    );
}

function AdminDirectoryRow({
    to,
    iconName,
    title,
    detail,
    count,
    onNavigate,
}: {
    to: string;
    iconName: PrototypeIconName;
    title: string;
    detail: string;
    count?: number | string;
    onNavigate: (to: string) => void;
}) {
    return (
        <button
            type="button"
            className="admin-link-row"
            onClick={() => onNavigate(to)}
        >
            <span className="admin-row-icon">
                <Icon name={iconName} />
            </span>
            <span className="grow">
                <strong>{title}</strong>
                <small>{detail}</small>
            </span>
            {count !== undefined ? <b>{count}</b> : null}
            <Icon name="arrow" />
        </button>
    );
}

function formatAuditTime(iso: string): string {
    if (!iso) return 'Chưa ghi nhận';
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime())
        ? iso
        : parsed.toLocaleString('vi-VN');
}

export function AdminHomePage() {
    const navigate = useNavigate();
    const { isMockMode, contextId } = useSession();
    const query = useAdminOverviewQuery(contextId, isMockMode);

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Nền tảng rõ ràng. Học kỳ sẵn sàng."
                    description="Quản trị danh tính, hồ sơ và các dữ liệu dùng chung."
                />
                <EmptyState
                    title="Không gian quản trị chưa nối API thật"
                    action={
                        <Link to="/teachers" className="button">
                            Mở Đội ngũ giáo viên
                        </Link>
                    }
                >
                    Dữ liệu quản trị mô phỏng chỉ khả dụng trong chế độ
                    `VITE_DATA_SOURCE=mock`.
                </EmptyState>
            </>
        );
    }

    if (query.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Nền tảng rõ ràng. Học kỳ sẵn sàng."
                    description="Quản trị danh tính, hồ sơ và các dữ liệu dùng chung."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải tổng quan quản trị"
                        detail="Đang tổng hợp tài khoản, cấu trúc nhà trường và nhật ký gần đây…"
                    />
                </section>
            </>
        );
    }

    if (query.isError) {
        return (
            <>
                <RolePageHeader
                    title="Nền tảng rõ ràng. Học kỳ sẵn sàng."
                    description="Quản trị danh tính, hồ sơ và các dữ liệu dùng chung."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải dữ liệu quản trị"
                        detail={
                            query.error.message ||
                            'Yêu cầu dữ liệu tạm thời chưa thành công.'
                        }
                        actions={
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void query.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </section>
            </>
        );
    }

    const data = query.data;
    const roleKeys: readonly AuthRole[] = ['admin', 'manager', 'teacher'];

    return (
        <>
            <RolePageHeader
                title="Nền tảng rõ ràng. Học kỳ sẵn sàng."
                description="Quản trị danh tính, hồ sơ và các dữ liệu dùng chung."
            />
            <div className="admin-overview">
                <div className="mvp-kpis">
                    <AdminKpiCard
                        label="Tài khoản"
                        iconName="user"
                        tone="sage"
                        value={data.stats.accounts_total}
                        foot={`${data.stats.accounts_active} hoạt động · ${data.stats.accounts_locked} tạm khóa`}
                    />
                    <AdminKpiCard
                        label="Hồ sơ giáo viên"
                        iconName="teachers"
                        tone="sage"
                        value={data.stats.teachers_count}
                        foot="Trong học kỳ đang chọn"
                    />
                    <AdminKpiCard
                        label="Môn học"
                        iconName="book"
                        tone="clay"
                        value={data.stats.subjects_count}
                        foot={`${data.stats.departments_count} tổ chuyên môn`}
                    />
                    <AdminKpiCard
                        label="Học kỳ / đợt"
                        iconName="calendar"
                        tone="brass"
                        value={data.stats.periods_count}
                        foot="Mỗi đợt có bộ quy tắc riêng"
                    />
                </div>

                <div className="admin-workspace-grid">
                    <section className="admin-identity panel">
                        <div className="admin-section-top">
                            <span className="admin-eyebrow">
                                01 / DANH TÍNH &amp; TRUY CẬP
                            </span>
                            <span className="admin-feature-icon">
                                <Icon name="shield" />
                            </span>
                        </div>
                        <div className="admin-identity-copy">
                            <h2>
                                Đúng người. <br />
                                Đúng không gian.
                            </h2>
                            <p>
                                Quản lý tài khoản, liên kết hồ sơ và cấp phạm vi
                                phù hợp cho từng vai trò.
                            </p>
                        </div>
                        <div
                            className="admin-role-distribution"
                            aria-label="Số tài khoản được cấp từng vai trò"
                        >
                            {roleKeys.map((roleKey) => {
                                const def = roleDefinitions[roleKey];
                                return (
                                    <div key={roleKey}>
                                        <span>
                                            <Icon name={def.icon} />
                                            {def.label}
                                        </span>
                                        <strong>
                                            {data.role_counts[roleKey]}
                                            <small>tài khoản</small>
                                        </strong>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="admin-role-note">
                            Một tài khoản có thể được cấp nhiều vai trò.
                        </p>
                        <div className="admin-feature-footer">
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => navigate('/admin/accounts')}
                            >
                                Quản lý tài khoản <Icon name="arrow" />
                            </button>
                            <button
                                type="button"
                                className="admin-text-link"
                                onClick={() => navigate('/admin/access')}
                            >
                                <Icon name="access" />
                                Phạm vi &amp; quyền <Icon name="arrow" />
                            </button>
                        </div>
                    </section>

                    <section className="panel admin-directory">
                        <div className="admin-section-top">
                            <div>
                                <span className="admin-eyebrow">
                                    02 / DỮ LIỆU DÙNG CHUNG
                                </span>
                                <h2>Cấu trúc nhà trường</h2>
                            </div>
                            <span className="admin-feature-icon">
                                <Icon name="school" />
                            </span>
                        </div>
                        <p>
                            Một nguồn dữ liệu nhất quán cho mọi đợt phân công.
                        </p>
                        <AdminDirectoryRow
                            to="/admin/teachers"
                            iconName="teachers"
                            title="Hồ sơ giáo viên"
                            detail="Chuyên môn, năng lực và hiệu lực"
                            count={data.stats.teachers_count}
                            onNavigate={(to) => navigate(to)}
                        />
                        <AdminDirectoryRow
                            to="/admin/catalogs"
                            iconName="book"
                            title="Danh mục nhà trường"
                            detail={`${data.stats.subjects_count} môn · ${data.stats.classes_count} lớp`}
                            onNavigate={(to) => navigate(to)}
                        />
                        <AdminDirectoryRow
                            to="/admin/rules"
                            iconName="rules"
                            title="Bộ quy tắc"
                            detail="Đối tượng áp dụng và nguồn đối chiếu"
                            onNavigate={(to) => navigate(to)}
                        />
                        <AdminDirectoryRow
                            to="/admin/sources"
                            iconName="file"
                            title="Nguồn & bí danh"
                            detail="Truy vết dữ liệu đến tài liệu gốc"
                            onNavigate={(to) => navigate(to)}
                        />
                    </section>

                    <section className="panel admin-period-card">
                        <div className="admin-section-top">
                            <div>
                                <span className="admin-eyebrow">
                                    03 / KHÔNG GIAN HIỆN TẠI
                                </span>
                                <h2>{data.context_title}</h2>
                            </div>
                            <span
                                className="admin-period-mark"
                                aria-hidden="true"
                            >
                                <Icon name="calendar" />
                            </span>
                        </div>
                        <p>
                            Năm học {data.academic_year} <span>·</span>{' '}
                            {data.round}
                        </p>
                        <div className="admin-period-detail">
                            <span>
                                <small>Đợt phân công</small>
                                <strong>{data.round}</strong>
                            </span>
                            <span>
                                <small>Phương án hiện tại</small>
                                <strong>
                                    V{data.plan_version}{' '}
                                    <em>
                                        {phaseDisplayLabels[data.phase] ??
                                            data.phase}
                                    </em>
                                </strong>
                            </span>
                        </div>
                        <button
                            type="button"
                            className="admin-card-footer"
                            onClick={() => navigate('/admin/periods')}
                        >
                            <span>Quản lý năm học &amp; đợt</span>
                            <Icon name="arrow" />
                        </button>
                    </section>

                    <section className="panel admin-activity">
                        <div className="admin-section-top">
                            <div>
                                <span className="admin-eyebrow">
                                    04 / DẤU VẾT THAY ĐỔI
                                </span>
                                <h2>Ghi nhận gần đây</h2>
                            </div>
                            <Icon name="history" />
                        </div>
                        <div className="admin-activity-list">
                            {data.recent_audit.length > 0 ? (
                                data.recent_audit.map((entry) => (
                                    <article key={entry.id}>
                                        <i aria-hidden="true" />
                                        <div>
                                            <strong>{entry.action}</strong>
                                            <div className="admin-activity-person">
                                                <ActorIdentity
                                                    actor={entry.actor}
                                                    accounts={data.accounts}
                                                />
                                            </div>
                                            <p>{entry.object}</p>
                                            <time>
                                                {formatAuditTime(entry.at)}
                                            </time>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="admin-activity-empty">
                                    <span>
                                        <Icon name="history" />
                                    </span>
                                    <strong>
                                        Mỗi thay đổi đều có dấu vết.
                                    </strong>
                                    <p>
                                        Nhật ký sẽ xuất hiện khi có thao tác
                                        quản trị hoặc cập nhật dữ liệu.
                                    </p>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="admin-card-footer"
                            onClick={() => navigate('/admin/audit')}
                        >
                            <span>Xem nhật ký đối chiếu</span>
                            <Icon name="arrow" />
                        </button>
                    </section>
                </div>
            </div>
        </>
    );
}

function linkedTeacherText(
    accountItem: AuthAccount,
    accounts: readonly AuthAccount[],
    contextId: string,
): string {
    const teacherId = accountItem.teacherId;
    if (!teacherId) return '';
    const isThcsContext = contextId === 'thcs-demo';
    const belongsInContext = isThcsContext ? teacherId === 13 : teacherId < 13;
    if (!belongsInContext) {
        return `Liên kết Hồ sơ #${teacherId} tại đợt khác`;
    }
    const matched = accounts.find((item) => item.teacherId === teacherId);
    return `Liên kết ${matched?.name ?? `Hồ sơ #${teacherId}`}`;
}

export function AdminAccountsPage() {
    const { isMockMode, contextId } = useSession();
    const query = useAdminOverviewQuery(contextId, isMockMode);
    const [searchText, setSearchText] = useState('');

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi tài khoản, một phạm vi rõ ràng."
                    description="Danh sách tài khoản và phân quyền truy cập."
                />
                <EmptyState title="Quản lý tài khoản chưa nối API thật">
                    Danh sách tài khoản trải nghiệm chỉ hiển thị ở chế độ mock.
                </EmptyState>
            </>
        );
    }

    if (query.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi tài khoản, một phạm vi rõ ràng."
                    description="Danh sách tài khoản trải nghiệm · Chỉ đọc trong phiên bản này."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải danh sách tài khoản"
                        detail="Đang đồng bộ thông tin tài khoản và phạm vi…"
                    />
                </section>
            </>
        );
    }

    if (query.isError) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi tài khoản, một phạm vi rõ ràng."
                    description="Danh sách tài khoản trải nghiệm · Chỉ đọc trong phiên bản này."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải danh sách tài khoản"
                        detail={
                            query.error.message ||
                            'Yêu cầu dữ liệu tạm thời chưa thành công.'
                        }
                        actions={
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void query.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </section>
            </>
        );
    }

    const accounts = query.data.accounts;
    const normalized = searchText.trim().toLocaleLowerCase('vi');
    const filtered = normalized
        ? accounts.filter((item) =>
              `${item.name} ${item.login}`
                  .toLocaleLowerCase('vi')
                  .includes(normalized),
          )
        : accounts;

    return (
        <>
            <RolePageHeader
                title="Mỗi tài khoản, một phạm vi rõ ràng."
                description="Danh sách tài khoản trải nghiệm · Chỉ đọc trong phiên bản này."
            />
            <div className="mvp-toolbar">
                <span className="muted">
                    {accounts.length} tài khoản · Dữ liệu demo chỉ đọc
                </span>
                <input
                    id="mvp-search"
                    placeholder="Tìm tên hoặc tài khoản…"
                    aria-label="Tìm tài khoản"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                />
            </div>
            <section className="panel">
                <div className="table-scroll">
                    <table className="data-table mvp-table">
                        <thead>
                            <tr>
                                <th>TÀI KHOẢN</th>
                                <th>VAI TRÒ</th>
                                <th>PHẠM VI / HIỆU LỰC</th>
                                <th>TRẠNG THÁI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.map((item) => {
                                    const spec = accountPortraitSpec(item);
                                    const linkNote = linkedTeacherText(
                                        item,
                                        accounts,
                                        contextId,
                                    );
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <PersonIdentity
                                                    name={item.name}
                                                    detail={item.login}
                                                    portraitKey={
                                                        spec.portraitKey
                                                    }
                                                    colorIndex={spec.colorIndex}
                                                />
                                            </td>
                                            <td>
                                                <div className="mvp-badge-group">
                                                    {item.roles.map((r) => (
                                                        <PillBadge
                                                            key={r}
                                                            label={
                                                                roleDefinitions[
                                                                    r
                                                                ].label
                                                            }
                                                            tone="gray"
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                {item.school
                                                    ? 'THPT An Hòa'
                                                    : 'Chưa cấp đơn vị'}
                                                <small>
                                                    {item.grades?.length
                                                        ? `Khối ${item.grades.join(', ')}`
                                                        : 'Tất cả khối được cấp'}{' '}
                                                    ·{' '}
                                                    {item.from ?? '2026-08-01'}{' '}
                                                    → {item.to ?? '2027-07-31'}
                                                </small>
                                                {linkNote ? (
                                                    <small>{linkNote}</small>
                                                ) : null}
                                            </td>
                                            <td>
                                                <PillBadge
                                                    label={
                                                        item.status === 'locked'
                                                            ? 'Tạm khóa'
                                                            : item.school
                                                              ? 'Hoạt động'
                                                              : 'Chưa có phạm vi'
                                                    }
                                                    tone={
                                                        item.status === 'locked'
                                                            ? 'red'
                                                            : item.school
                                                              ? ''
                                                              : 'amber'
                                                    }
                                                    dot
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4}>
                                        <div className="mvp-empty">
                                            Chưa có bản ghi phù hợp.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            <div className="scope-note">
                <Icon name="lock" />
                <span>
                    Tạo, sửa, khóa tài khoản và cấp quyền sẽ được triển khai
                    cùng phần quản trị dữ liệu nền ở bước tiếp theo. Các tài
                    khoản tại đây là dữ liệu demo chỉ đọc.
                </span>
            </div>
        </>
    );
}

export function AdminAccessPage() {
    return (
        <>
            <RolePageHeader
                title="Đúng vai trò. Đúng phạm vi."
                description="Ba vai trò nghiệp vụ hoạt động trong các không gian riêng."
            />
            <section className="panel">
                <div className="panel-head">
                    <div>
                        <h2>Ma trận trách nhiệm</h2>
                        <p>
                            Quyền theo đặc tả MVP · Phạm vi và hiệu lực được cấp
                            riêng cho từng tài khoản
                        </p>
                    </div>
                    <Icon name="shield" />
                </div>
                <div className="table-scroll">
                    <table className="data-table permission-table">
                        <thead>
                            <tr>
                                <th>NHÓM CHỨC NĂNG</th>
                                <th>ADMINISTRATOR</th>
                                <th>ACADEMIC MANAGER</th>
                                <th>TEACHER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permissionMatrixRows.map(([label, ...allowed]) => (
                                <tr key={label}>
                                    <td>{label}</td>
                                    {allowed.map((yes, index) => (
                                        <td key={index}>
                                            <span
                                                className={
                                                    yes
                                                        ? 'permission-value granted'
                                                        : 'permission-value'
                                                }
                                            >
                                                <Icon
                                                    name={
                                                        yes ? 'check' : 'lock'
                                                    }
                                                />
                                                <span>
                                                    {yes
                                                        ? 'Được cấp'
                                                        : 'Không cấp'}
                                                </span>
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <div className="role-module-grid">
                <section className="panel role-module">
                    <h3>Một người có thể kiêm nhiệm</h3>
                    <p>
                        Tài khoản được cấp nhiều vai trò sẽ chọn không gian sau
                        đăng nhập. Chuyển vai trò chỉ hiển thị các chức năng của
                        vai trò đó.
                    </p>
                </section>
                <section className="panel role-module">
                    <h3>Phạm vi dữ liệu được cấp riêng</h3>
                    <p>
                        Không có đơn vị hoặc phạm vi thì chưa được mở dữ liệu
                        nhà trường. Teacher luôn gắn với đúng hồ sơ cá nhân.
                    </p>
                </section>
            </div>
        </>
    );
}
