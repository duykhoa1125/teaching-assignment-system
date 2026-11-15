import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTeacherPersonalQuery } from '@/features/session/queries';
import {
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { phaseDisplayLabels } from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import type { TeacherPersonalOverviewResponse } from '@/features/session/types';
import { NoScopePage } from '@/pages/access/no-scope-page';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { useToast } from '@/shared/ui/toast-context';

function formatPeriods(value: number): string {
    return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function clampPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
}

function componentTypeLabel(
    type: 'STANDARD' | 'SPECIALIZED_TOPIC' | 'ENRICHMENT',
): string {
    if (type === 'STANDARD') return 'Chính khóa';
    if (type === 'SPECIALIZED_TOPIC') return 'Chuyên đề';
    return 'Tăng tiết';
}

function PersonalUnreleasedPanel({
    contextTitle,
    round,
}: {
    contextTitle: string;
    round: string;
}) {
    return (
        <section className="panel personal-unreleased">
            <span className="state-symbol">
                <Icon name="lock" />
            </span>
            <div>
                <div className="eyebrow">
                    {contextTitle.toUpperCase()} / {round}
                </div>
                <h2>Phân công chưa được mở.</h2>
                <p>
                    Quản lý đang hoàn thiện bản nháp. Bạn sẽ xem được phân công
                    và tải cá nhân khi phương án được mở lấy ý kiến.
                </p>
            </div>
        </section>
    );
}

function TeacherPersonalGuard({
    title,
    description,
    headerActions,
    children,
}: {
    title: string;
    description: string;
    headerActions?: ReactNode;
    children: (data: TeacherPersonalOverviewResponse) => ReactNode;
}) {
    const { isMockMode, contextId, account } = useSession();
    const query = useTeacherPersonalQuery(
        contextId,
        account?.teacherId,
        isMockMode,
    );

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader title={title} description={description} />
                <EmptyState
                    title="Không gian giáo viên chưa nối API thật"
                    action={
                        <Link to="/teachers" className="button">
                            Mở Đội ngũ giáo viên
                        </Link>
                    }
                >
                    Phân công cá nhân mô phỏng chỉ khả dụng trong chế độ
                    `VITE_DATA_SOURCE=mock`.
                </EmptyState>
            </>
        );
    }

    if (account?.teacherId === undefined) {
        return <NoScopePage />;
    }

    if (query.isPending) {
        return (
            <>
                <RolePageHeader
                    title={title}
                    description={description}
                    actions={headerActions}
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải dữ liệu cá nhân"
                        detail="Đang lấy phân công, tải công tác và phản hồi của bạn…"
                    />
                </section>
            </>
        );
    }

    if (query.isError) {
        return (
            <>
                <RolePageHeader
                    title={title}
                    description={description}
                    actions={headerActions}
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải dữ liệu cá nhân"
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

    if (!query.data.teacher) {
        return <NoScopePage />;
    }

    return <>{children(query.data)}</>;
}

export function TeacherHomePage() {
    const navigate = useNavigate();

    return (
        <TeacherPersonalGuard
            title="Một học kỳ, phần việc của bạn."
            description="Phân công cá nhân trong học kỳ hiện tại."
        >
            {(data) => {
                const teacher = data.teacher!;
                const released = data.phase !== 'DRAFT';
                return (
                    <>
                        <RolePageHeader
                            title="Một học kỳ, phần việc của bạn."
                            description={`Phân công cá nhân · ${data.context_title} · ${data.academic_year}`}
                        />
                        <section className="personal-greeting">
                            <PortraitAvatar
                                portraitKey={teacher.portrait_key}
                                colorIndex={teacher.color_index}
                            />
                            <div className="grow">
                                <div className="eyebrow">
                                    KHÔNG GIAN TEACHER
                                </div>
                                <h2>Chào {teacher.full_name}.</h2>
                                <p>
                                    {teacher.department_name} ·{' '}
                                    {teacher.teacher_code}
                                </p>
                            </div>
                            <PillBadge
                                label={
                                    released
                                        ? (phaseDisplayLabels[data.phase] ??
                                          data.phase)
                                        : 'Chưa mở phân công'
                                }
                                tone={released ? '' : 'amber'}
                                dot
                            />
                        </section>

                        {released ? (
                            <section className="panel">
                                <div className="panel-head">
                                    <div>
                                        <h2>Phân công của tôi</h2>
                                        <p>
                                            {teacher.assignments.length} thành
                                            phần ·{' '}
                                            {formatPeriods(
                                                teacher.assigned_periods,
                                            )}{' '}
                                            tiết / tuần
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn small"
                                        onClick={() =>
                                            navigate('/teacher/load')
                                        }
                                    >
                                        Xem tải <Icon name="arrow" />
                                    </button>
                                </div>
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>LỚP</th>
                                                <th>MÔN</th>
                                                <th>THÀNH PHẦN</th>
                                                <th>TIẾT / TUẦN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teacher.assignments.length > 0 ? (
                                                teacher.assignments.map(
                                                    (row) => (
                                                        <tr key={row.id}>
                                                            <td>
                                                                <strong className="class-tag">
                                                                    {
                                                                        row.class_name
                                                                    }
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                {
                                                                    row.subject_name
                                                                }
                                                            </td>
                                                            <td>
                                                                {componentTypeLabel(
                                                                    row.component_type,
                                                                )}
                                                            </td>
                                                            <td className="mono">
                                                                {formatPeriods(
                                                                    row.periods,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            ) : (
                                                <tr>
                                                    <td colSpan={4}>
                                                        Chưa có phân công cá
                                                        nhân trong đợt này.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ) : (
                            <PersonalUnreleasedPanel
                                contextTitle={data.context_title}
                                round={data.round}
                            />
                        )}

                        <section className="personal-next">
                            <div>
                                <Icon name="feedback" />
                                <span>
                                    <strong>
                                        Ý kiến của bạn luôn có một nơi để theo
                                        dõi.
                                    </strong>
                                    <small>
                                        Xem trạng thái và kết quả các phản hồi
                                        cá nhân đã gửi.
                                    </small>
                                </span>
                            </div>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => navigate('/teacher/feedback')}
                            >
                                Phản hồi của tôi <Icon name="arrow" />
                            </button>
                        </section>
                    </>
                );
            }}
        </TeacherPersonalGuard>
    );
}

export function TeacherLoadPage() {
    const navigate = useNavigate();

    return (
        <TeacherPersonalGuard
            title="Tải giảng dạy của tôi."
            description="Đối chiếu công tác cá nhân trên cùng đơn vị tiết / tuần."
        >
            {(data) => {
                const teacher = data.teacher!;
                const released = data.phase !== 'DRAFT';
                if (!released) {
                    return (
                        <>
                            <RolePageHeader
                                title="Tải giảng dạy của tôi."
                                description="Số liệu cá nhân được hiển thị khi phương án được mở."
                            />
                            <PersonalUnreleasedPanel
                                contextTitle={data.context_title}
                                round={data.round}
                            />
                        </>
                    );
                }

                const deltaBadge =
                    teacher.delta > 0
                        ? `Vượt ${formatPeriods(teacher.delta)} tiết`
                        : teacher.delta < 0
                          ? `Còn ${formatPeriods(-teacher.delta)} tiết`
                          : 'Đạt định mức';
                const breakdown: readonly [string, string, number][] = [
                    ['F', 'Tải cố định', teacher.fixed_periods],
                    ['A', 'Gán trong đợt', teacher.assigned_periods],
                    ['C', 'Công tác quy đổi', teacher.converted_periods],
                    ['R', 'Giảm trừ', teacher.reduction_periods],
                ];

                return (
                    <>
                        <RolePageHeader
                            title="Tải giảng dạy của tôi."
                            description="Đối chiếu công tác cá nhân trên cùng đơn vị tiết / tuần."
                        />
                        <section className="panel personal-load">
                            <div className="personal-load-top">
                                <div>
                                    <div className="eyebrow">
                                        TỔNG CÔNG TÁC / ĐỊNH MỨC
                                    </div>
                                    <div className="personal-total">
                                        {formatPeriods(teacher.total_periods)}
                                        <span>/ {teacher.base_norm} tiết</span>
                                    </div>
                                    <p>
                                        {teacher.full_name} ·{' '}
                                        {data.context_title}
                                    </p>
                                </div>
                                <PillBadge
                                    label={deltaBadge}
                                    tone={teacher.delta > 0 ? 'amber' : ''}
                                    dot
                                />
                            </div>
                            <div className="track">
                                <i
                                    style={{
                                        width: `${clampPercent(
                                            teacher.total_periods,
                                            teacher.weekly_limit,
                                        )}%`,
                                    }}
                                />
                            </div>
                            <div className="personal-breakdown">
                                {breakdown.map(([letter, label, val]) => (
                                    <div key={letter}>
                                        <span>{letter}</span>
                                        <strong>{formatPeriods(val)}</strong>
                                        <small>{label}</small>
                                    </div>
                                ))}
                            </div>
                            <p className="personal-formula">
                                T = F + A + C + R · W ={' '}
                                {formatPeriods(teacher.working_periods)} · Q ={' '}
                                {formatPeriods(teacher.quota_remaining)} · T − B
                                = {teacher.delta > 0 ? '+' : ''}
                                {formatPeriods(teacher.delta)}
                            </p>
                        </section>

                        <div className="personal-next">
                            <div>
                                <Icon name="feedback" />
                                <span>
                                    <strong>
                                        Cần làm rõ khối lượng công tác?
                                    </strong>
                                    <small>
                                        Gửi ý kiến trong thời hạn tiếp nhận phản
                                        hồi.
                                    </small>
                                </span>
                            </div>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => navigate('/teacher/feedback')}
                            >
                                Xem phản hồi <Icon name="arrow" />
                            </button>
                        </div>
                    </>
                );
            }}
        </TeacherPersonalGuard>
    );
}

export function TeacherFeedbackPage() {
    const notify = useToast();
    const [mountNowMs] = useState(() => Date.now());

    return (
        <TeacherPersonalGuard
            title="Phản hồi của tôi."
            description="Nội dung đã gửi được giữ nguyên; kết quả được quản lý cập nhật."
        >
            {(data) => {
                const teacher = data.teacher!;
                const open =
                    data.phase === 'OPEN_FOR_FEEDBACK' &&
                    Boolean(data.feedback_due_at) &&
                    new Date(data.feedback_due_at as string).getTime() >
                        mountNowMs;

                return (
                    <>
                        <RolePageHeader
                            title="Phản hồi của tôi."
                            description="Nội dung đã gửi được giữ nguyên; kết quả được quản lý cập nhật."
                            actions={
                                <button
                                    type="button"
                                    className="btn primary"
                                    disabled={!open}
                                    onClick={() =>
                                        notify({
                                            title: 'Gửi phản hồi sẽ được bổ sung ở bước tiếp theo.',
                                            tone: 'info',
                                        })
                                    }
                                >
                                    <Icon name="plus" />
                                    Gửi phản hồi
                                </button>
                            }
                        />
                        <div className={open ? 'banner' : 'banner amber'}>
                            <Icon name={open ? 'feedback' : 'clock'} />
                            <span>
                                {open && data.feedback_due_at
                                    ? `Đang nhận phản hồi đến ${new Date(data.feedback_due_at).toLocaleString('vi-VN')}`
                                    : data.phase === 'DRAFT'
                                      ? 'Phương án đang ở bản nháp. Hiện chưa nhận phản hồi mới.'
                                      : 'Đợt tiếp nhận đã đóng hoặc hết hạn. Bạn vẫn xem được kết quả của mình.'}
                            </span>
                        </div>
                        <div className="feedback-list">
                            {data.feedback_items.length > 0 ? (
                                data.feedback_items.map((item) => (
                                    <article
                                        key={item.id}
                                        className="panel feedback-card"
                                    >
                                        <div className="between">
                                            <div className="flex">
                                                <PortraitAvatar
                                                    portraitKey={
                                                        teacher.portrait_key
                                                    }
                                                    colorIndex={
                                                        teacher.color_index
                                                    }
                                                />
                                                <div>
                                                    <h3>{item.title}</h3>
                                                    <div className="feedback-meta">
                                                        {teacher.full_name} ·{' '}
                                                        {item.updated_at}
                                                    </div>
                                                </div>
                                            </div>
                                            <PillBadge
                                                label={
                                                    item.status === 'PENDING'
                                                        ? 'Chờ xử lý'
                                                        : 'Đã xử lý'
                                                }
                                                tone={
                                                    item.status === 'PENDING'
                                                        ? 'amber'
                                                        : ''
                                                }
                                                dot
                                            />
                                        </div>
                                        <p className="feedback-text">
                                            {item.detail}
                                        </p>
                                    </article>
                                ))
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có phản hồi cá nhân"
                                    detail="Các phản hồi bạn gửi và kết quả xử lý sẽ xuất hiện tại đây."
                                />
                            )}
                        </div>
                    </>
                );
            }}
        </TeacherPersonalGuard>
    );
}
