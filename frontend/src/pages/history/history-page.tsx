import '@/pages/results/results.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    DEMAND_TYPE_LABELS,
    formatPeriods,
} from '@/features/preparation/model';
import { SnapshotDocumentMarkup } from '@/features/governance/document-markup';
import { formatGovernanceDateTime } from '@/features/governance/model';
import {
    useGovernanceOverviewQuery,
    useRestoreSnapshotMutation,
    useSaveSnapshotMutation,
} from '@/features/governance/queries';
import type { PlanSnapshot } from '@/features/governance/types';
import {
    ActorIdentity,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { phaseDisplayLabels } from '@/features/session/roles';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { useToast } from '@/shared/ui/toast-context';

export function HistoryPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { isMockMode, contextId, account } = useSession();
    const govQuery = useGovernanceOverviewQuery(contextId, isMockMode);
    const saveMutation = useSaveSnapshotMutation();
    const restoreMutation = useRestoreSnapshotMutation();

    const [selectedSnapshot, setSelectedSnapshot] =
        useState<PlanSnapshot | null>(null);

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Một phương án hiện hành. Đầy đủ dấu vết."
                    description="Snapshot giữ hồ sơ, nhu cầu, quy tắc, cấu hình, tải và phản hồi nguồn."
                />
                <EmptyState title="Lịch sử snapshot chưa nối API thật">
                    Chức năng xem bản lưu và khôi phục bản nháp hoạt động trong
                    chế độ mock FE-08 (<code>VITE_DATA_SOURCE=mock</code>).
                </EmptyState>
            </>
        );
    }

    if (govQuery.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Một phương án hiện hành. Đầy đủ dấu vết."
                    description="Snapshot giữ hồ sơ, nhu cầu, quy tắc, cấu hình, tải và phản hồi nguồn."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải lịch sử phiên bản…"
                        detail="Đang tổng hợp các bản lưu đã chụp theo đợt."
                    />
                </section>
            </>
        );
    }

    if (govQuery.isError) {
        return (
            <>
                <RolePageHeader
                    title="Một phương án hiện hành. Đầy đủ dấu vết."
                    description="Snapshot giữ hồ sơ, nhu cầu, quy tắc, cấu hình, tải và phản hồi nguồn."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải lịch sử phiên bản"
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
    const orderedSnapshots = gov.snapshots.slice().reverse();

    async function handleSaveSnapshot() {
        try {
            const snap = await saveMutation.mutateAsync({
                contextId,
                title: 'Mốc rà soát đầy đủ',
                actorName,
            });
            toast({
                title: `Đã lưu mốc ${snap.id}`,
                description: `V${snap.version_no}/r${snap.revision_no} đã được đóng băng đầy đủ.`,
                tone: 'success',
            });
        } catch (error) {
            toast({
                title:
                    error instanceof ApiError
                        ? error.message
                        : 'Không lưu được bản chụp.',
                tone: 'error',
            });
        }
    }

    async function handleRestoreSnapshot(snapshot: PlanSnapshot) {
        try {
            const next = await restoreMutation.mutateAsync({
                contextId,
                snapshotId: snapshot.id,
                actorName,
            });
            setSelectedSnapshot(null);
            toast({
                title: `Đã khôi phục thành DRAFT V${next.version_no}`,
                description: `Nguồn từ ${snapshot.id}.`,
                tone: 'success',
            });
            void navigate('/assignment');
        } catch (error) {
            toast({
                title:
                    error instanceof ApiError
                        ? error.message
                        : 'Chưa thể khôi phục bản lưu.',
                tone: 'error',
            });
        }
    }

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Một phương án hiện hành. Đầy đủ dấu vết."
                description="Snapshot giữ hồ sơ, nhu cầu, quy tắc, cấu hình, tải và phản hồi nguồn."
                roundLabel={gov.round_code}
                actions={
                    <button
                        type="button"
                        className="btn"
                        disabled={!gov.has_plan || saveMutation.isPending}
                        onClick={() => void handleSaveSnapshot()}
                    >
                        <Icon name="history" />
                        {saveMutation.isPending
                            ? 'Đang lưu mốc…'
                            : 'Lưu mốc đầy đủ'}
                    </button>
                }
            />

            <section className="panel">
                {gov.has_plan ? (
                    <div className="history-row">
                        <span className="school-symbol">
                            <Icon name="assignment" />
                        </span>
                        <div className="grow">
                            <strong>
                                V{gov.version_no}/r{gov.revision_no} · Hiện hành
                            </strong>
                            <p>
                                {phaseDisplayLabels[gov.phase] ?? gov.phase} ·{' '}
                                {gov.source_version_no !== null
                                    ? `Nguồn V${gov.source_version_no}`
                                    : 'Bản nháp đầu vào'}
                            </p>
                        </div>
                        <Link className="btn small" to="/assignment">
                            Mở phương án
                        </Link>
                    </div>
                ) : (
                    <div className="history-row">
                        <span className="school-symbol">
                            <Icon name="assignment" />
                        </span>
                        <div className="grow">
                            <strong>Chưa tạo phương án nháp</strong>
                            <p>
                                Vào Phân công giảng dạy để khởi tạo bản nháp đầu
                                tiên cho đợt {gov.round_code}.
                            </p>
                        </div>
                        <Link className="btn small" to="/assignment">
                            Tới Phân công
                        </Link>
                    </div>
                )}

                {orderedSnapshots.map((snap) => (
                    <div key={snap.id} className="history-row">
                        <span className="school-symbol">
                            <Icon name="history" />
                        </span>
                        <div className="grow">
                            <strong>
                                V{snap.version_no}/r{snap.revision_no} ·{' '}
                                {snap.title}
                            </strong>
                            <p>
                                {formatGovernanceDateTime(snap.at)} ·{' '}
                                {snap.is_full
                                    ? 'Snapshot đầy đủ'
                                    : 'Bản lưu cũ · chỉ có nhu cầu'}
                            </p>
                        </div>
                        <ActorIdentity actor={snap.by} />
                        <button
                            type="button"
                            className="btn small"
                            onClick={() => setSelectedSnapshot(snap)}
                        >
                            Xem bản lưu
                        </button>
                    </div>
                ))}
            </section>

            <div className="mvp-note">
                <Icon name="shield" />
                <span>
                    Bản lưu cũ không có hồ sơ đóng băng được đánh dấu rõ. Không
                    lấy tên/hồ sơ hiện tại để giả thành dữ liệu lịch sử.
                </span>
            </div>

            <Dialog
                open={selectedSnapshot !== null}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setSelectedSnapshot(null);
                }}
                busy={restoreMutation.isPending}
                title={
                    selectedSnapshot
                        ? `Snapshot · V${selectedSnapshot.version_no}/r${selectedSnapshot.revision_no}`
                        : 'Snapshot'
                }
                description={selectedSnapshot?.title}
                wide
            >
                {selectedSnapshot ? (
                    <>
                        {selectedSnapshot.is_full ? (
                            <SnapshotDocumentMarkup
                                snapshot={selectedSnapshot}
                            />
                        ) : (
                            <>
                                <div className="mvp-note warning">
                                    <Icon name="warning" />
                                    <span>
                                        Bản lưu trước nâng cấp chỉ có nhu cầu;
                                        không có hồ sơ, bộ quy tắc và nguồn tải
                                        đóng băng.
                                    </span>
                                </div>
                                <div className="table-scroll">
                                    <table className="data-table mvp-table">
                                        <thead>
                                            <tr>
                                                <th>LỚP</th>
                                                <th>MÔN / LOẠI</th>
                                                <th>TIẾT</th>
                                                <th>GIÁO VIÊN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSnapshot.rows.map(
                                                (row) => (
                                                    <tr key={row.id}>
                                                        <td>
                                                            {row.class_name}
                                                        </td>
                                                        <td>
                                                            <SubjectIdentity
                                                                name={
                                                                    row.subject_name
                                                                }
                                                                detail={
                                                                    DEMAND_TYPE_LABELS[
                                                                        row
                                                                            .demand_type
                                                                    ] ??
                                                                    row.demand_type
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            {formatPeriods(
                                                                row.periods_per_week,
                                                            )}
                                                        </td>
                                                        <td>
                                                            {row.teacher_name ??
                                                                (row.teacher_id
                                                                    ? `#${row.teacher_id}`
                                                                    : 'Chưa gán')}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn"
                                disabled={restoreMutation.isPending}
                                onClick={() => setSelectedSnapshot(null)}
                            >
                                Đóng
                            </button>
                            {selectedSnapshot.is_full ? (
                                <button
                                    type="button"
                                    className="btn primary"
                                    disabled={restoreMutation.isPending}
                                    onClick={() =>
                                        void handleRestoreSnapshot(
                                            selectedSnapshot,
                                        )
                                    }
                                >
                                    {restoreMutation.isPending
                                        ? 'Đang khôi phục…'
                                        : 'Khôi phục thành DRAFT mới'}
                                </button>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </Dialog>
        </div>
    );
}
