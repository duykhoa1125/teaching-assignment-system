import { Select } from '@/shared/ui/select';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    FEEDBACK_TYPE_LABELS,
    formatGovernanceDateTime,
    validateFeedbackSubmission,
} from '@/features/governance/model';
import { useSubmitTeacherFeedbackMutation } from '@/features/governance/queries';
import type { FeedbackKind } from '@/features/governance/types';
import { useTeacherPersonalQuery } from '@/features/session/queries';
import {
    ActorIdentity,
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { phaseDisplayLabels } from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import type { TeacherPersonalOverviewResponse } from '@/features/session/types';
import { NoScopePage } from '@/pages/access/no-scope-page';
import { ApiError } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
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

function ReleaseVersionSelect({
    data,
    releaseId,
    onChange,
}: {
    data: TeacherPersonalOverviewResponse;
    releaseId: string | null;
    onChange: (nextId: string) => void;
}) {
    const releases = data.released_versions ?? [];
    if (releases.length === 0) return null;
    return (
        <div className="mvp-release-select">
            <span>Phiên bản được phép xem</span>
            <Select
                name="release_id"
                aria-label="Phiên bản phân công cá nhân"
                value={
                    data.selected_release_id ??
                    releaseId ??
                    releases.at(-1)?.id ??
                    ''
                }
                onChange={(e) => onChange(e.target.value)}
            >
                {releases
                    .slice()
                    .reverse()
                    .map((item) => (
                        <option key={item.id} value={item.id}>
                            V{item.version_no}/r{item.revision_no} ·{' '}
                            {formatGovernanceDateTime(item.at)}
                        </option>
                    ))}
            </Select>
            <PillBadge label="Chỉ dữ liệu cá nhân" tone="gray" />
        </div>
    );
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
    releaseId,
    children,
}: {
    title: string;
    description: string;
    headerActions?: ReactNode;
    releaseId?: string | null;
    children: (data: TeacherPersonalOverviewResponse) => ReactNode;
}) {
    const { isMockMode, contextId, account } = useSession();
    const query = useTeacherPersonalQuery(
        contextId,
        account?.teacherId,
        isMockMode,
        releaseId,
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
    const [releaseId, setReleaseId] = useState<string | null>(null);

    return (
        <TeacherPersonalGuard
            title="Một học kỳ, phần việc của bạn."
            description="Theo dõi phân công cá nhân trên từng phiên bản đã được mở."
            releaseId={releaseId}
        >
            {(data) => {
                const teacher = data.teacher!;
                const released =
                    (data.released_versions?.length ?? 0) > 0 ||
                    data.phase !== 'DRAFT';
                const selectedRelease =
                    data.released_versions?.find(
                        (item) =>
                            item.id === (releaseId ?? data.selected_release_id),
                    ) ?? data.released_versions?.at(-1);
                const displayPhase = selectedRelease?.phase ?? data.phase;
                return (
                    <>
                        <RolePageHeader
                            title="Một học kỳ, phần việc của bạn."
                            description={`Phân công cá nhân · ${data.context_title} · ${data.academic_year}`}
                        />
                        <ReleaseVersionSelect
                            data={data}
                            releaseId={releaseId}
                            onChange={setReleaseId}
                        />
                        <section className="personal-greeting">
                            <PortraitAvatar
                                portraitKey={teacher.portrait_key}
                                colorIndex={teacher.color_index}
                            />
                            <div className="grow">
                                <div className="eyebrow">
                                    KHÔNG GIAN GIÁO VIÊN
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
                                        ? (phaseDisplayLabels[displayPhase] ??
                                          displayPhase)
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
                                            {data.version_no
                                                ? `Nguồn cố định V${data.version_no}/r${data.revision_no ?? 0} · `
                                                : ''}
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
                                        Phản hồi luôn gắn với phiên bản nguồn đã
                                        xem.
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
    const [releaseId, setReleaseId] = useState<string | null>(null);

    return (
        <TeacherPersonalGuard
            title="Tải giảng dạy của tôi."
            description="Đối chiếu công tác cá nhân trên cùng đơn vị tiết / tuần."
            releaseId={releaseId}
        >
            {(data) => {
                const teacher = data.teacher!;
                const released =
                    (data.released_versions?.length ?? 0) > 0 ||
                    data.phase !== 'DRAFT';
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
                            description="Các thay đổi ở bản nháp sau không làm đổi nguồn tải này."
                        />
                        <ReleaseVersionSelect
                            data={data}
                            releaseId={releaseId}
                            onChange={setReleaseId}
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
                            {data.annual_warning ? (
                                <div className="mvp-note warning">
                                    <Icon name="warning" />
                                    <span>
                                        Chưa đủ dữ liệu kiểm tra tải năm; không
                                        xem đây là kết luận tải năm hợp lệ.
                                    </span>
                                </div>
                            ) : null}
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
    const toast = useToast();
    const { contextId, account } = useSession();
    const submitMutation = useSubmitTeacherFeedbackMutation();
    const [mountNowMs] = useState(() => Date.now());
    const [releaseId, setReleaseId] = useState<string | null>(null);

    const [composeOpen, setComposeOpen] = useState(false);
    const [type, setType] = useState<FeedbackKind>('GENERAL');
    const [title, setTitle] = useState('');
    const [demandId, setDemandId] = useState('');
    const [subject, setSubject] = useState('');
    const [desiredTotal, setDesiredTotal] = useState('');
    const [text, setText] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    return (
        <TeacherPersonalGuard
            title="Phản hồi của tôi."
            description="Góp ý, đề nghị điều chỉnh hoặc nhận thêm tiết của môn đang dạy."
            releaseId={releaseId}
        >
            {(data) => {
                const teacher = data.teacher!;
                const open =
                    data.phase === 'OPEN_FOR_FEEDBACK' &&
                    Boolean(data.feedback_due_at) &&
                    new Date(data.feedback_due_at as string).getTime() >
                        mountNowMs;
                const subjectOptions = [
                    ...new Set(
                        teacher.assignments.map((row) => row.subject_name),
                    ),
                ];

                function openComposeDialog() {
                    setFormError(null);
                    setType('GENERAL');
                    setTitle('');
                    setDemandId('');
                    setSubject(subjectOptions[0] ?? '');
                    setDesiredTotal('');
                    setText('');
                    setComposeOpen(true);
                }

                async function handleSubmit() {
                    const numericDemand = demandId ? Number(demandId) : null;
                    const err = validateFeedbackSubmission(
                        {
                            type,
                            title,
                            text,
                            demandId: numericDemand,
                            subject: subject || null,
                            desiredTotal,
                        },
                        teacher.assignments,
                    );
                    if (err) {
                        setFormError(err);
                        return;
                    }
                    try {
                        await submitMutation.mutateAsync({
                            context_id: contextId,
                            teacher_id: account?.teacherId ?? teacher.id,
                            release_id: releaseId ?? data.selected_release_id,
                            type,
                            title: title.trim(),
                            text: text.trim(),
                            demand_id:
                                type === 'ASSIGNMENT' ? numericDemand : null,
                            subject:
                                type === 'REQUEST_SUBJECT_TOTAL'
                                    ? subject
                                    : null,
                            desired_total:
                                type === 'REQUEST_SUBJECT_TOTAL'
                                    ? Number(desiredTotal)
                                    : null,
                        });
                        setComposeOpen(false);
                        toast({
                            title: 'Đã gửi phản hồi cá nhân',
                            description:
                                'Phản hồi đã gắn với phiên bản nguồn và chuyển tới quản lý.',
                            tone: 'success',
                        });
                    } catch (error) {
                        setFormError(
                            error instanceof ApiError
                                ? error.message
                                : 'Không gửi được phản hồi.',
                        );
                    }
                }

                return (
                    <>
                        <RolePageHeader
                            title="Phản hồi của tôi."
                            description="Góp ý, đề nghị điều chỉnh hoặc nhận thêm tiết của môn đang dạy."
                            actions={
                                open ? (
                                    <button
                                        type="button"
                                        className="btn primary"
                                        onClick={openComposeDialog}
                                    >
                                        <Icon name="plus" />
                                        Gửi phản hồi
                                    </button>
                                ) : null
                            }
                        />
                        <ReleaseVersionSelect
                            data={data}
                            releaseId={releaseId}
                            onChange={setReleaseId}
                        />
                        <div className={open ? 'banner' : 'banner amber'}>
                            <Icon name={open ? 'feedback' : 'clock'} />
                            <span>
                                {open && data.feedback_due_at
                                    ? `Đang nhận phản hồi đến ${formatGovernanceDateTime(data.feedback_due_at)}`
                                    : data.phase === 'DRAFT'
                                      ? 'Phương án đang ở bản nháp. Hiện chưa nhận phản hồi mới.'
                                      : 'Đợt tiếp nhận đã đóng hoặc hết hạn. Bạn vẫn xem được các ý kiến và kết quả đã lưu.'}
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
                                                        {item.version_no
                                                            ? ` · V${item.version_no}`
                                                            : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <PillBadge
                                                label={
                                                    item.status === 'PENDING'
                                                        ? 'Chờ xử lý'
                                                        : item.decision ===
                                                            'DECLINED'
                                                          ? 'Không chấp thuận'
                                                          : 'Đã xử lý'
                                                }
                                                tone={
                                                    item.status === 'PENDING'
                                                        ? 'amber'
                                                        : item.decision ===
                                                            'DECLINED'
                                                          ? 'red'
                                                          : ''
                                                }
                                                dot
                                            />
                                        </div>
                                        {item.feedback_type ? (
                                            <div className="mvp-feedback-detail">
                                                <PillBadge
                                                    label={
                                                        FEEDBACK_TYPE_LABELS[
                                                            item.feedback_type
                                                        ]
                                                    }
                                                    tone="gray"
                                                />
                                                {item.subject ? (
                                                    <PillBadge
                                                        label={
                                                            item.desired_total !=
                                                            null
                                                                ? `${item.subject} · Tổng mong muốn ${formatPeriods(item.desired_total)}`
                                                                : item.subject
                                                        }
                                                        tone="gray"
                                                    />
                                                ) : null}
                                                {item.demand_id != null ? (
                                                    <PillBadge
                                                        label={`Nhu cầu #${item.demand_id}`}
                                                        tone="gray"
                                                    />
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <p className="feedback-text">
                                            {item.detail}
                                        </p>
                                        {item.result ? (
                                            <div className="mvp-note">
                                                <Icon name="shield" />
                                                <span>
                                                    <b>Kết quả:</b>{' '}
                                                    {item.result}
                                                    {item.resolved_by ? (
                                                        <span className="identity-subline">
                                                            <ActorIdentity
                                                                actor={
                                                                    item.resolved_by
                                                                }
                                                            />
                                                            <span>
                                                                ·{' '}
                                                                {formatGovernanceDateTime(
                                                                    item.resolved_at,
                                                                )}
                                                            </span>
                                                        </span>
                                                    ) : null}
                                                    {item.result_version
                                                        ? ` · Phiên bản kết quả V${item.result_version}`
                                                        : ''}
                                                </span>
                                            </div>
                                        ) : null}
                                        {item.source_id ? (
                                            <p className="mvp-code">
                                                Nguồn: {item.source_id}
                                            </p>
                                        ) : null}
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

                        <Dialog
                            open={composeOpen}
                            variant="prototype"
                            onOpenChange={(next) => {
                                if (!next) setComposeOpen(false);
                            }}
                            busy={submitMutation.isPending}
                            title="Chia sẻ ý kiến của bạn"
                            description={`Gắn với nguồn V${data.version_no ?? 1}/r${data.revision_no ?? 0}. Đề nghị không tự tạo nhu cầu hoặc đổi phân công.`}
                            wide
                        >
                            <div className="mvp-form">
                                <label className="field">
                                    Loại phản hồi
                                    <Select
                                        name="type"
                                        value={type}
                                        onChange={(e) =>
                                            setType(
                                                e.target.value as FeedbackKind,
                                            )
                                        }
                                    >
                                        <option value="GENERAL">
                                            Góp ý chung
                                        </option>
                                        <option value="ASSIGNMENT">
                                            Điều chỉnh phân công
                                        </option>
                                        <option value="REQUEST_SUBJECT_TOTAL">
                                            Đề nghị nhận thêm tiết
                                        </option>
                                    </Select>
                                </label>
                                <label className="field">
                                    Tiêu đề
                                    <input
                                        name="title"
                                        maxLength={100}
                                        value={title}
                                        onChange={(e) =>
                                            setTitle(e.target.value)
                                        }
                                    />
                                </label>
                                <label className="field">
                                    Phân công liên quan (nếu cần)
                                    <Select
                                        name="demand_id"
                                        value={demandId}
                                        onChange={(e) =>
                                            setDemandId(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Không gắn phân công
                                        </option>
                                        {teacher.assignments.map((row) => (
                                            <option key={row.id} value={row.id}>
                                                {row.class_name} ·{' '}
                                                {row.subject_name} ·{' '}
                                                {componentTypeLabel(
                                                    row.component_type,
                                                )}
                                            </option>
                                        ))}
                                    </Select>
                                </label>
                                <label className="field">
                                    Môn đề nghị nhận thêm
                                    <Select
                                        name="subject"
                                        value={subject}
                                        onChange={(e) =>
                                            setSubject(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Chọn môn đang dạy
                                        </option>
                                        {subjectOptions.map((sub) => (
                                            <option key={sub} value={sub}>
                                                {sub}
                                            </option>
                                        ))}
                                    </Select>
                                </label>
                                <label className="field full">
                                    Tổng tiết môn mong muốn (không phải phần
                                    tăng)
                                    <input
                                        name="desired_total"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={desiredTotal}
                                        onChange={(e) =>
                                            setDesiredTotal(e.target.value)
                                        }
                                    />
                                </label>
                                <label className="field full">
                                    Nội dung chi tiết
                                    <textarea
                                        name="text"
                                        value={text}
                                        onChange={(e) =>
                                            setText(e.target.value)
                                        }
                                    />
                                </label>
                                <div className="mvp-note full">
                                    <Icon name="shield" />
                                    <span>
                                        Với đề nghị nhận thêm, tổng mong muốn
                                        phải lớn hơn tổng tiết môn trên phiên
                                        bản nguồn. Không nới giới hạn tuần hoặc
                                        tự tăng tiết chương trình.
                                    </span>
                                </div>
                                {formError ? (
                                    <div className="mvp-error" role="alert">
                                        {formError}
                                    </div>
                                ) : null}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn"
                                    disabled={submitMutation.isPending}
                                    onClick={() => setComposeOpen(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn primary"
                                    disabled={submitMutation.isPending}
                                    onClick={() => void handleSubmit()}
                                >
                                    {submitMutation.isPending
                                        ? 'Đang gửi…'
                                        : 'Gửi phản hồi'}
                                </button>
                            </div>
                        </Dialog>
                    </>
                );
            }}
        </TeacherPersonalGuard>
    );
}
