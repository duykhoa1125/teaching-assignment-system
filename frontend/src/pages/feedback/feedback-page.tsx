import '@/pages/results/results.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    useCloseFeedbackMutation,
    useCreateNextDraftMutation,
    useGovernanceOverviewQuery,
    useMarkPlanReadyMutation,
    useOpenFeedbackMutation,
    useResolveFeedbackMutation,
} from '@/features/governance/queries';
import {
    FEEDBACK_TYPE_LABELS,
    formatGovernanceDateTime,
} from '@/features/governance/model';
import type {
    FeedbackDecision,
    FeedbackItem,
} from '@/features/governance/types';
import { formatPeriods } from '@/features/preparation/model';
import {
    ActorIdentity,
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { phaseDisplayLabels } from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { useToast } from '@/shared/ui/toast-context';

function defaultFutureDue(): string {
    const dt = new Date(Date.now() + 72 * 3600 * 1000);
    dt.setMinutes(0, 0, 0);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:00`;
}

export function FeedbackPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { isMockMode, contextId, account } = useSession();
    const govQuery = useGovernanceOverviewQuery(contextId, isMockMode);

    const openMutation = useOpenFeedbackMutation();
    const closeMutation = useCloseFeedbackMutation();
    const resolveMutation = useResolveFeedbackMutation();
    const nextDraftMutation = useCreateNextDraftMutation();
    const readyMutation = useMarkPlanReadyMutation();

    const [openModal, setOpenModal] = useState(false);
    const [dueInput, setDueInput] = useState(defaultFutureDue);

    const [closeModal, setCloseModal] = useState(false);
    const [closeReason, setCloseReason] = useState(
        'Đã kết thúc thời gian rà soát.',
    );

    const [resolveTarget, setResolveTarget] = useState<FeedbackItem | null>(
        null,
    );
    const [decision, setDecision] = useState<FeedbackDecision>('ACCEPTED');
    const [resolveResult, setResolveResult] = useState('');

    const [readyModal, setReadyModal] = useState(false);
    const [readyReason, setReadyReason] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Lắng nghe, rồi hoàn thiện phương án."
                    description="Nội dung nguồn giữ nguyên; quyết định và phiên bản kết quả được ghi riêng."
                />
                <EmptyState title="Phản hồi theo phiên bản chưa nối API thật">
                    Chức năng mở/đóng lấy ý kiến và xử lý phản hồi hiện hoạt
                    động trên mô phỏng UI (<code>VITE_DATA_SOURCE=mock</code>)
                    theo hợp đồng dự kiến FE-08.
                </EmptyState>
            </>
        );
    }

    if (govQuery.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Lắng nghe, rồi hoàn thiện phương án."
                    description="Nội dung nguồn giữ nguyên; quyết định và phiên bản kết quả được ghi riêng."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải phản hồi và trạng thái vòng đời…"
                        detail="Đang đồng bộ danh sách ý kiến theo phiên bản."
                    />
                </section>
            </>
        );
    }

    if (govQuery.isError) {
        return (
            <>
                <RolePageHeader
                    title="Lắng nghe, rồi hoàn thiện phương án."
                    description="Nội dung nguồn giữ nguyên; quyết định và phiên bản kết quả được ghi riêng."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải dữ liệu phản hồi"
                        detail={govQuery.error.message}
                        actions={
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void govQuery.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </section>
            </>
        );
    }

    const gov = govQuery.data;
    const actorName = account?.name ?? 'Nguyễn Minh Khoa';
    const canResolvePhase =
        gov.phase === 'FEEDBACK_PROCESSING' ||
        (gov.phase === 'DRAFT' && gov.source_version_no !== null);
    const canReadyPhase =
        gov.phase === 'FEEDBACK_PROCESSING' ||
        (gov.phase === 'DRAFT' && gov.source_version_no !== null);

    async function handleOpenFeedbackSubmit() {
        setFormError(null);
        if (!dueInput || new Date(dueInput) <= new Date()) {
            setFormError('Hạn phản hồi cần ở tương lai.');
            return;
        }
        try {
            await openMutation.mutateAsync({
                contextId,
                due: dueInput,
                actorName,
            });
            setOpenModal(false);
            toast({
                title: 'Đã mở lấy ý kiến giáo viên',
                description: `Phiên bản V${gov.version_no} đã được đóng băng để giáo viên xem.`,
                tone: 'success',
            });
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Không mở được đợt lấy ý kiến.',
            );
        }
    }

    async function handleCloseFeedbackSubmit() {
        setFormError(null);
        if (!closeReason.trim()) {
            setFormError('Ghi lý do đóng nhận phản hồi.');
            return;
        }
        try {
            await closeMutation.mutateAsync({
                contextId,
                reason: closeReason.trim(),
                actorName,
            });
            setCloseModal(false);
            toast({
                title: 'Đã đóng nhận phản hồi',
                description: 'Chuyển sang trạng thái xử lý ý kiến giáo viên.',
                tone: 'info',
            });
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Không đóng được đợt lấy ý kiến.',
            );
        }
    }

    async function handleResolveSubmit() {
        if (!resolveTarget) return;
        setFormError(null);
        if (!resolveResult.trim()) {
            setFormError('Ghi rõ quyết định và lý do.');
            return;
        }
        try {
            await resolveMutation.mutateAsync({
                feedbackId: resolveTarget.id,
                contextId,
                decision,
                result: resolveResult.trim(),
                actorName,
            });
            setResolveTarget(null);
            setResolveResult('');
            toast({
                title: `Đã ghi nhận quyết định phản hồi #${resolveTarget.id}`,
                tone: 'success',
            });
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Không thể lưu quyết định.',
            );
        }
    }

    async function handleCreateNextDraft() {
        try {
            const next = await nextDraftMutation.mutateAsync({
                contextId,
                actorName,
            });
            toast({
                title: `Đã tạo bản nháp V${next.version_no}`,
                description: `Kế thừa phương án từ V${next.source_version_no ?? next.version_no - 1}.`,
                tone: 'success',
            });
            void navigate('/assignment');
        } catch (error) {
            toast({
                title:
                    error instanceof ApiError
                        ? error.message
                        : 'Chưa thể tạo bản nháp mới.',
                tone: 'error',
            });
        }
    }

    async function handleReadySubmit() {
        setFormError(null);
        if (gov.pending_count > 0) {
            setFormError('Cần xử lý hết các phản hồi đang chờ trước khi chốt.');
            return;
        }
        if (gov.phase === 'DRAFT' && readyReason.trim().length < 8) {
            setFormError(
                'Bản nháp sau phản hồi cần lý do không mở lại tối thiểu 8 ký tự.',
            );
            return;
        }
        try {
            await readyMutation.mutateAsync({
                contextId,
                reason:
                    readyReason.trim() || 'Đã xử lý xong các ý kiến rà soát.',
                actorName,
            });
            setReadyModal(false);
            toast({
                title: 'Phương án đã sẵn sàng phát hành',
                description:
                    'Bạn có thể xem trước và lưu tài liệu PDF ở màn Tài liệu.',
                tone: 'success',
            });
            void navigate('/documents');
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Chưa thể chốt phương án.',
            );
        }
    }

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Lắng nghe, rồi hoàn thiện phương án."
                description="Nội dung nguồn giữ nguyên; quyết định và phiên bản kết quả được ghi riêng."
                roundLabel={gov.round_code}
                actions={
                    gov.phase === 'OPEN_FOR_FEEDBACK' ? (
                        <button
                            type="button"
                            className="btn primary"
                            onClick={() => {
                                setFormError(null);
                                setCloseModal(true);
                            }}
                        >
                            <Icon name="lock" />
                            Đóng nhận phản hồi
                        </button>
                    ) : gov.phase === 'DRAFT' && gov.has_plan ? (
                        <button
                            type="button"
                            className="btn primary"
                            onClick={() => {
                                if (
                                    !gov.validation_fresh ||
                                    !gov.validation_releasable
                                ) {
                                    toast({
                                        title: 'Cần kiểm tra phương án đạt chuẩn trước khi mở',
                                        description:
                                            'Chạy kiểm tra hiện hành và xử lý các điều kiện chặn tại Trung tâm kiểm tra.',
                                        tone: 'info',
                                    });
                                    void navigate('/checks');
                                    return;
                                }
                                setFormError(null);
                                setDueInput(defaultFutureDue());
                                setOpenModal(true);
                            }}
                        >
                            <Icon name="send" />
                            Mở lấy ý kiến
                        </button>
                    ) : null
                }
            />

            <div className="mvp-kpis">
                <div className="mvp-kpi">
                    <span className="mvp-kpi-label">
                        Ý kiến
                        <i aria-hidden="true">
                            <Icon name="feedback" />
                        </i>
                    </span>
                    <strong>{gov.feedback.length}</strong>
                    <small>Tất cả phiên bản</small>
                </div>
                <div
                    className={`mvp-kpi ${gov.pending_count > 0 ? 'kpi-clay' : 'kpi-sage'}`}
                >
                    <span className="mvp-kpi-label">
                        Chờ xử lý
                        <i aria-hidden="true">
                            <Icon name="clock" />
                        </i>
                    </span>
                    <strong>{gov.pending_count}</strong>
                    <small>Nội dung gốc chỉ đọc</small>
                </div>
                <div className="mvp-kpi kpi-sage">
                    <span className="mvp-kpi-label">
                        Hiện hành
                        <i aria-hidden="true">
                            <Icon name="assignment" />
                        </i>
                    </span>
                    <strong>V{gov.version_no}</strong>
                    <small>{phaseDisplayLabels[gov.phase] ?? gov.phase}</small>
                </div>
                <div className="mvp-kpi kpi-brass">
                    <span className="mvp-kpi-label">
                        Nguồn trước
                        <i aria-hidden="true">
                            <Icon name="history" />
                        </i>
                    </span>
                    <strong>
                        {gov.source_version_no !== null
                            ? `V${gov.source_version_no}`
                            : '—'}
                    </strong>
                    <small>Liên kết bản nháp kế tiếp</small>
                </div>
            </div>

            {gov.phase === 'OPEN_FOR_FEEDBACK' && gov.feedback_due_at ? (
                <div className="banner">
                    <Icon name="feedback" />
                    <span className="grow">
                        Đang mở lấy ý kiến trên bản đóng băng V{gov.version_no}{' '}
                        · Hạn phản hồi:{' '}
                        <strong>
                            {formatGovernanceDateTime(gov.feedback_due_at)}
                        </strong>
                        {gov.validation_annual_warning
                            ? ` · ${gov.validation_annual_warning}`
                            : ''}
                    </span>
                </div>
            ) : null}

            <div className="mvp-actions" style={{ marginBottom: 20 }}>
                {canReadyPhase ? (
                    <button
                        type="button"
                        className={
                            gov.phase === 'FEEDBACK_PROCESSING'
                                ? 'btn primary'
                                : 'btn'
                        }
                        onClick={() => {
                            setFormError(null);
                            setReadyReason(gov.no_reopen_reason || '');
                            setReadyModal(true);
                        }}
                    >
                        <Icon name="check" />
                        Hoàn tất / không mở lại
                    </button>
                ) : null}
                {gov.phase === 'FEEDBACK_PROCESSING' &&
                gov.pending_count === 0 ? (
                    <button
                        type="button"
                        className="btn"
                        disabled={nextDraftMutation.isPending}
                        onClick={() => void handleCreateNextDraft()}
                    >
                        <Icon name="edit" />
                        {nextDraftMutation.isPending
                            ? 'Đang tạo bản nháp…'
                            : 'Tạo bản nháp điều chỉnh'}
                    </button>
                ) : null}
                {gov.phase === 'READY_TO_EXPORT' || gov.phase === 'EXPORTED' ? (
                    <Link to="/documents" className="btn primary">
                        <Icon name="file" />
                        Mở Tài liệu phát hành
                    </Link>
                ) : null}
                <Link to="/checks" className="btn">
                    <Icon name="shield" />
                    Trung tâm kiểm tra
                </Link>
            </div>

            <div className="feedback-list">
                {gov.feedback.length > 0 ? (
                    gov.feedback.map((item) => {
                        const pending = item.status === 'pending';
                        return (
                            <article
                                key={item.id}
                                className="panel feedback-card"
                            >
                                <div className="between">
                                    <div className="flex">
                                        <PortraitAvatar
                                            portraitKey={item.portrait_key}
                                            colorIndex={item.color_index}
                                        />
                                        <div>
                                            <h3>{item.title}</h3>
                                            <div className="feedback-meta">
                                                {item.teacher_name} ·{' '}
                                                {item.created_label} · V
                                                {item.version_no}
                                            </div>
                                        </div>
                                    </div>
                                    <PillBadge
                                        label={
                                            pending
                                                ? 'Chờ xử lý'
                                                : item.decision === 'DECLINED'
                                                  ? 'Không chấp thuận'
                                                  : 'Đã xử lý'
                                        }
                                        tone={
                                            pending
                                                ? 'amber'
                                                : item.decision === 'DECLINED'
                                                  ? 'red'
                                                  : ''
                                        }
                                        dot
                                    />
                                </div>
                                <div className="mvp-feedback-detail">
                                    <PillBadge
                                        label={FEEDBACK_TYPE_LABELS[item.type]}
                                        tone="gray"
                                    />
                                    {item.subject ? (
                                        <PillBadge
                                            label={
                                                item.desired_total !== null
                                                    ? `${item.subject} · Tổng mong muốn ${formatPeriods(item.desired_total)}`
                                                    : item.subject
                                            }
                                            tone="gray"
                                        />
                                    ) : null}
                                    {item.demand_id !== null ? (
                                        <PillBadge
                                            label={`Nhu cầu #${item.demand_id}`}
                                            tone="gray"
                                        />
                                    ) : null}
                                </div>
                                <p className="feedback-text">{item.text}</p>
                                {item.result ? (
                                    <div className="mvp-note">
                                        <Icon name="shield" />
                                        <span>
                                            <b>Kết quả:</b> {item.result}
                                            <span className="identity-subline">
                                                <ActorIdentity
                                                    actor={
                                                        item.resolved_by ??
                                                        'Dữ liệu trước nâng cấp'
                                                    }
                                                />
                                                <span>
                                                    ·{' '}
                                                    {formatGovernanceDateTime(
                                                        item.resolved_at,
                                                    )}
                                                    {item.result_version
                                                        ? ` · Phiên bản kết quả V${item.result_version}`
                                                        : ''}
                                                </span>
                                            </span>
                                        </span>
                                    </div>
                                ) : pending && canResolvePhase ? (
                                    <div className="mvp-actions">
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() => {
                                                setFormError(null);
                                                setDecision('ACCEPTED');
                                                setResolveResult('');
                                                setResolveTarget(item);
                                            }}
                                        >
                                            Ghi nhận quyết định
                                        </button>
                                    </div>
                                ) : null}
                                <p className="mvp-code">
                                    Nguồn: {item.source_id} / r
                                    {item.source_revision}
                                </p>
                            </article>
                        );
                    })
                ) : (
                    <div className="panel mvp-empty">
                        Chưa có phản hồi trong đợt này.
                    </div>
                )}
            </div>

            <Dialog
                open={openModal}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setOpenModal(false);
                }}
                busy={openMutation.isPending}
                title="Mở lấy ý kiến giáo viên"
                description="Đóng băng dữ liệu phân công và tải trên phiên bản nguồn."
            >
                <div className="mvp-form">
                    <label className="field full">
                        Hạn phản hồi
                        <input
                            name="feedback_due"
                            type="datetime-local"
                            value={dueInput}
                            onChange={(e) => setDueInput(e.target.value)}
                        />
                    </label>
                    <div
                        className={
                            gov.validation_annual_warning
                                ? 'mvp-note warning full'
                                : 'mvp-note full'
                        }
                    >
                        <Icon
                            name={
                                gov.validation_annual_warning
                                    ? 'warning'
                                    : 'shield'
                            }
                        />
                        <span>
                            {gov.validation_annual_warning
                                ? 'Chưa đủ dữ liệu năm. Giáo viên và tài liệu sẽ thấy cảnh báo; đây không phải xác nhận tải năm.'
                                : 'Các dữ liệu tuần/năm được kiểm tra theo nguồn hiện hành.'}
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
                        disabled={openMutation.isPending}
                        onClick={() => setOpenModal(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={openMutation.isPending}
                        onClick={() => void handleOpenFeedbackSubmit()}
                    >
                        {openMutation.isPending ? 'Đang mở…' : 'Mở lấy ý kiến'}
                    </button>
                </div>
            </Dialog>

            <Dialog
                open={closeModal}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setCloseModal(false);
                }}
                busy={closeMutation.isPending}
                title="Đóng nhận phản hồi"
                description="Ngừng nhận ý kiến mới và chuyển sang xử lý."
            >
                <div className="mvp-form">
                    <label className="field full">
                        Lý do đóng đợt
                        <textarea
                            name="close_reason"
                            value={closeReason}
                            onChange={(e) => setCloseReason(e.target.value)}
                        />
                    </label>
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
                        disabled={closeMutation.isPending}
                        onClick={() => setCloseModal(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={closeMutation.isPending}
                        onClick={() => void handleCloseFeedbackSubmit()}
                    >
                        {closeMutation.isPending
                            ? 'Đang đóng…'
                            : 'Xác nhận đóng'}
                    </button>
                </div>
            </Dialog>

            <Dialog
                open={resolveTarget !== null}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setResolveTarget(null);
                }}
                busy={resolveMutation.isPending}
                title="Ghi nhận quyết định xử lý"
                description={resolveTarget?.title}
            >
                <div className="mvp-form">
                    {resolveTarget ? (
                        <div className="mvp-note full">
                            <Icon name="feedback" />
                            <span>{resolveTarget.text}</span>
                        </div>
                    ) : null}
                    <label className="field full">
                        Quyết định
                        <select
                            name="decision"
                            value={decision}
                            onChange={(e) =>
                                setDecision(e.target.value as FeedbackDecision)
                            }
                        >
                            <option value="ACCEPTED">
                                Chấp thuận / ghi nhận
                            </option>
                            <option value="DECLINED">Không chấp thuận</option>
                        </select>
                    </label>
                    <label className="field full">
                        Kết quả và lý do (bắt buộc)
                        <textarea
                            name="resolve_result"
                            value={resolveResult}
                            onChange={(e) => setResolveResult(e.target.value)}
                            placeholder="Nêu rõ hướng điều chỉnh hoặc lý do không chấp thuận…"
                        />
                    </label>
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
                        disabled={resolveMutation.isPending}
                        onClick={() => setResolveTarget(null)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={resolveMutation.isPending}
                        onClick={() => void handleResolveSubmit()}
                    >
                        {resolveMutation.isPending
                            ? 'Đang lưu…'
                            : 'Lưu quyết định'}
                    </button>
                </div>
            </Dialog>

            <Dialog
                open={readyModal}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setReadyModal(false);
                }}
                busy={readyMutation.isPending}
                title="Hoàn tất phương án đề xuất"
                description={
                    gov.phase === 'DRAFT'
                        ? 'Quyết định không mở lại lấy ý kiến cho bản nháp sau phản hồi.'
                        : 'Giữ nguyên gán và hoàn tất xử lý phản hồi.'
                }
            >
                <div className="mvp-form">
                    <label className="field full">
                        Lý do / quyết định
                        <textarea
                            name="ready_reason"
                            value={readyReason}
                            onChange={(e) => setReadyReason(e.target.value)}
                            placeholder="Tối thiểu 8 ký tự khi bỏ qua mở lại lấy ý kiến trên bản nháp…"
                        />
                    </label>
                    <div className="mvp-note full">
                        <Icon name="shield" />
                        <span>
                            Cần xử lý xong mọi phản hồi và có kết quả kiểm tra
                            còn hiệu lực.
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
                        disabled={readyMutation.isPending}
                        onClick={() => setReadyModal(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={readyMutation.isPending}
                        onClick={() => void handleReadySubmit()}
                    >
                        {readyMutation.isPending
                            ? 'Đang hoàn tất…'
                            : 'Hoàn tất & chuyển Tài liệu'}
                    </button>
                </div>
            </Dialog>
        </div>
    );
}
