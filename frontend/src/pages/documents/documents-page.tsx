import { Select } from '@/shared/ui/select';
import '@/pages/results/results.css';
import { useState } from 'react';
import { SnapshotDocumentMarkup } from '@/features/governance/document-markup';
import { formatGovernanceDateTime } from '@/features/governance/model';
import {
    useGovernanceOverviewQuery,
    useIssueDocumentMutation,
} from '@/features/governance/queries';
import type { ExportDocumentRecord } from '@/features/governance/types';
import { formatPeriods } from '@/features/preparation/model';
import {
    base64ToUint8,
    downloadBytes,
    renderSnapshotPdfBytes,
    sha256Hex,
    uint8ToBase64,
} from '@/features/results/pdf';
import {
    ActorIdentity,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { useToast } from '@/shared/ui/toast-context';

export function DocumentsPage() {
    const toast = useToast();
    const { isMockMode, contextId, account } = useSession();
    const govQuery = useGovernanceOverviewQuery(contextId, isMockMode);
    const issueMutation = useIssueDocumentMutation();

    const [previewOpen, setPreviewOpen] = useState(false);
    const [exportMode, setExportMode] = useState<'teachers' | 'classes'>(
        'teachers',
    );
    const [exportBusy, setExportBusy] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [openedDoc, setOpenedDoc] = useState<ExportDocumentRecord | null>(
        null,
    );

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Tài liệu giữ nguyên nguồn đã phát hành."
                    description="Mỗi PDF có snapshot, lượt kiểm tra, SHA-256 và thời điểm lưu."
                />
                <EmptyState title="Xuất tài liệu PDF chưa nối API thật">
                    Chức năng xem trước và phát hành PDF hoạt động trong mô
                    phỏng FE-08 (<code>VITE_DATA_SOURCE=mock</code>).
                </EmptyState>
            </>
        );
    }

    if (govQuery.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Tài liệu giữ nguyên nguồn đã phát hành."
                    description="Mỗi PDF có snapshot, lượt kiểm tra, SHA-256 và thời điểm lưu."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải danh sách tài liệu đã phát hành…"
                        detail="Đang đồng bộ snapshot và mã kiểm tra SHA-256."
                    />
                </section>
            </>
        );
    }

    if (govQuery.isError) {
        return (
            <>
                <RolePageHeader
                    title="Tài liệu giữ nguyên nguồn đã phát hành."
                    description="Mỗi PDF có snapshot, lượt kiểm tra, SHA-256 và thời điểm lưu."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải dữ liệu tài liệu"
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
    const previewSnapshot = gov.preview_snapshot
        ? { ...gov.preview_snapshot, by: actorName }
        : null;
    const canIssue = Boolean(
        previewSnapshot &&
        gov.phase === 'READY_TO_EXPORT' &&
        gov.validation_fresh &&
        gov.validation_releasable &&
        gov.pending_count === 0,
    );

    async function handleGeneratePdf(asDraft: boolean) {
        if (!previewSnapshot) return;
        setExportError(null);
        setExportBusy(true);
        try {
            const bytes = await renderSnapshotPdfBytes(
                previewSnapshot,
                exportMode,
                asDraft,
            );
            const filename = `TASS-${previewSnapshot.round_code}-V${previewSnapshot.version_no}-r${previewSnapshot.revision_no}${asDraft ? '-BAN-NHAP' : ''}-${exportMode}.pdf`;
            if (asDraft) {
                downloadBytes(bytes, filename, 'application/pdf');
                setPreviewOpen(false);
                toast({
                    title: 'Đã tải PDF bản nháp rà soát',
                    description:
                        'PDF nháp không ghi thành tài liệu phát hành chính thức.',
                    tone: 'info',
                });
                return;
            }
            const hash = await sha256Hex(bytes);
            if (!hash) {
                throw new Error(
                    'Môi trường chưa hỗ trợ SHA-256. Mở bằng localhost hoặc HTTPS để phát hành có mã kiểm tra.',
                );
            }
            await issueMutation.mutateAsync({
                context_id: contextId,
                mode: exportMode,
                filename,
                bytes: bytes.length,
                sha256: hash,
                source_token: gov.source_token,
                base_revision: gov.revision_no,
                validation_id: gov.validation_id ?? 'VAL-CURRENT',
                pdf_base64: uint8ToBase64(bytes),
                snapshot: previewSnapshot,
                actor_name: actorName,
            });
            downloadBytes(bytes, filename, 'application/pdf');
            setPreviewOpen(false);
            toast({
                title: 'Đã lưu PDF bất biến trên phiên mô phỏng',
                description: 'Có thể xem nguồn và tải lại đúng tệp này.',
                tone: 'success',
            });
        } catch (error) {
            setExportError(
                error instanceof ApiError || error instanceof Error
                    ? error.message
                    : 'Không tạo được PDF.',
            );
        } finally {
            setExportBusy(false);
        }
    }

    function handleDownloadStored(doc: ExportDocumentRecord) {
        downloadBytes(
            base64ToUint8(doc.pdf_base64),
            doc.filename,
            'application/pdf',
        );
    }

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Tài liệu giữ nguyên nguồn đã phát hành."
                description="Mỗi PDF có snapshot, lượt kiểm tra, SHA-256 và thời điểm lưu."
                roundLabel={gov.round_code}
                actions={
                    <button
                        type="button"
                        className="btn primary"
                        disabled={!previewSnapshot}
                        onClick={() => {
                            setExportError(null);
                            setPreviewOpen(true);
                        }}
                    >
                        <Icon name="download" />
                        Xem trước / phát hành
                    </button>
                }
            />

            <section className="panel">
                {gov.documents.length > 0 ? (
                    gov.documents.map((doc) => (
                        <article
                            key={doc.id}
                            className="mvp-record"
                            style={{ padding: 23 }}
                        >
                            <span className="school-symbol">
                                <Icon name="file" />
                            </span>
                            <div className="grow">
                                <h3>{doc.filename}</h3>
                                <p>
                                    V{doc.snapshot.version_no}/r
                                    {doc.base_revision} ·{' '}
                                    {formatGovernanceDateTime(doc.at)}
                                </p>
                                <div className="document-author">
                                    <ActorIdentity actor={doc.by} />
                                </div>
                                <p>
                                    {formatPeriods(doc.bytes / 1024)} KB ·{' '}
                                    {doc.validation_id}
                                </p>
                                <div className="mvp-code">
                                    SHA-256 {doc.sha256}
                                </div>
                            </div>
                            <div className="mvp-actions">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setOpenedDoc(doc)}
                                >
                                    Xem nguồn
                                </button>
                                <button
                                    type="button"
                                    className="btn primary"
                                    onClick={() => handleDownloadStored(doc)}
                                >
                                    Tải lại PDF
                                </button>
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="mvp-empty">
                        Chưa có tài liệu đã phát hành. PDF nháp không được ghi
                        thành ExportRecord.
                    </div>
                )}
            </section>

            <div className="mvp-note">
                <Icon name="shield" />
                <span>
                    Tệp cũ được tải từ đúng các byte đã lưu, không dựng lại bằng
                    dữ liệu hiện hành. Dữ liệu nằm trên phiên trình duyệt; chưa
                    thay kho lưu trữ máy chủ.
                </span>
            </div>

            <Dialog
                open={previewOpen}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setPreviewOpen(false);
                }}
                busy={exportBusy}
                title="Tài liệu từ một nguồn cố định"
                description="Xem trước bản chụp; PDF được tạo và lưu trước khi ghi trạng thái phát hành."
                wide
            >
                <div className="mvp-filter" style={{ marginBottom: 16 }}>
                    <label>
                        Góc nhìn{' '}
                        <Select
                            name="export_mode"
                            value={exportMode}
                            onChange={(e) =>
                                setExportMode(
                                    e.target.value as 'teachers' | 'classes',
                                )
                            }
                        >
                            <option value="teachers">Theo giáo viên</option>
                            <option value="classes">Theo lớp</option>
                        </Select>
                    </label>
                    <span
                        className={`mvp-status ${canIssue ? 'PASS' : 'INSUFFICIENT_DATA'}`}
                    >
                        {canIssue
                            ? 'Đủ điều kiện phát hành'
                            : 'Chỉ xem bản nháp'}
                    </span>
                </div>

                {previewSnapshot ? (
                    <div className="mvp-print-preview">
                        <SnapshotDocumentMarkup
                            snapshot={previewSnapshot}
                            mode={exportMode}
                        />
                    </div>
                ) : null}

                {!canIssue ? (
                    <div className="mvp-note warning">
                        <Icon name="warning" />
                        <span>
                            Phát hành chính thức yêu cầu{' '}
                            <code>READY_TO_EXPORT</code>, mọi ý kiến đã xử lý và
                            kiểm tra hiện hành đạt chuẩn tuần. Bản nháp chỉ dùng
                            để rà soát.
                        </span>
                    </div>
                ) : null}

                {exportError ? (
                    <div
                        className="mvp-error"
                        role="alert"
                        style={{ marginTop: 12 }}
                    >
                        {exportError}
                    </div>
                ) : null}

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn"
                        disabled={exportBusy}
                        onClick={() => setPreviewOpen(false)}
                    >
                        Đóng
                    </button>
                    {canIssue ? (
                        <button
                            type="button"
                            className="btn primary"
                            disabled={exportBusy}
                            onClick={() => void handleGeneratePdf(false)}
                        >
                            {exportBusy
                                ? 'Đang tạo PDF…'
                                : 'Tạo & lưu PDF đề xuất'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn"
                            disabled={exportBusy}
                            onClick={() => void handleGeneratePdf(true)}
                        >
                            {exportBusy ? 'Đang tạo PDF…' : 'Tải PDF bản nháp'}
                        </button>
                    )}
                </div>
            </Dialog>

            <Dialog
                open={openedDoc !== null}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setOpenedDoc(null);
                }}
                title={openedDoc?.filename ?? 'Tài liệu'}
                description={
                    openedDoc
                        ? `Bản chụp phát hành chỉ đọc · ${openedDoc.sha256}`
                        : undefined
                }
                wide
            >
                {openedDoc ? (
                    <>
                        <div className="mvp-print-preview">
                            <SnapshotDocumentMarkup
                                snapshot={openedDoc.snapshot}
                                mode={openedDoc.mode}
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setOpenedDoc(null)}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => handleDownloadStored(openedDoc)}
                            >
                                Tải đúng tệp đã lưu
                            </button>
                        </div>
                    </>
                ) : null}
            </Dialog>
        </div>
    );
}
