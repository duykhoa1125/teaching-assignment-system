import { Select } from '@/shared/ui/select';
import '@/pages/results/results.css';
import { useState } from 'react';
import {
    ALIAS_KIND_LABELS,
    validateAliasDraft,
    validateSourceDraft,
} from '@/features/governance/model';
import {
    useSaveAliasMutation,
    useSaveSourceMutation,
    useSourcesQuery,
} from '@/features/governance/queries';
import type {
    AliasKind,
    SourceEvidenceRecord,
    SourceEvidenceStatus,
} from '@/features/governance/types';
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

export function SourcesPage() {
    const toast = useToast();
    const { isMockMode, account } = useSession();
    const sourcesQuery = useSourcesQuery(isMockMode);
    const saveSourceMutation = useSaveSourceMutation();
    const saveAliasMutation = useSaveAliasMutation();

    const [detailSource, setDetailSource] =
        useState<SourceEvidenceRecord | null>(null);
    const [sourceModalOpen, setSourceModalOpen] = useState(false);
    const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
    const [fileInput, setFileInput] = useState('');
    const [sheetInput, setSheetInput] = useState('');
    const [cellInput, setCellInput] = useState('');
    const [statusInput, setStatusInput] =
        useState<SourceEvidenceStatus>('PENDING');
    const [rawInput, setRawInput] = useState('');
    const [canonicalInput, setCanonicalInput] = useState('');
    const [evidenceInput, setEvidenceInput] = useState('');
    const [sourceError, setSourceError] = useState<string | null>(null);

    const [aliasModalOpen, setAliasModalOpen] = useState(false);
    const [aliasKind, setAliasKind] = useState<AliasKind>('SUBJECT');
    const [aliasValue, setAliasValue] = useState('');
    const [aliasCanonical, setAliasCanonical] = useState('');
    const [aliasSource, setAliasSource] = useState('');
    const [aliasError, setAliasError] = useState<string | null>(null);

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi dữ liệu, một đường về nguồn."
                    description="Đối soát bằng chứng và bí danh; không phải import Excel tự động."
                />
                <EmptyState title="Nguồn & đối soát chưa nối API thật">
                    Chức năng ghi nhận bằng chứng nguồn và ánh xạ bí danh hoạt
                    động trên mock FE-08 (<code>VITE_DATA_SOURCE=mock</code>).
                </EmptyState>
            </>
        );
    }

    if (sourcesQuery.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi dữ liệu, một đường về nguồn."
                    description="Đối soát bằng chứng và bí danh; không phải import Excel tự động."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải nguồn và ánh xạ bí danh…"
                        detail="Đang đồng bộ danh sách bằng chứng đối soát."
                    />
                </section>
            </>
        );
    }

    if (sourcesQuery.isError) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi dữ liệu, một đường về nguồn."
                    description="Đối soát bằng chứng và bí danh; không phải import Excel tự động."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải nguồn và bí danh"
                        detail={sourcesQuery.error.message}
                        actions={
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void sourcesQuery.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </section>
            </>
        );
    }

    const { sources, aliases, canonical_options: options } = sourcesQuery.data;
    const actorName = account?.name ?? 'Lê Hải An';

    const aliasCanonicalList =
        aliasKind === 'TEACHER'
            ? options.teachers
            : aliasKind === 'CLASS'
              ? options.classes
              : options.subjects;

    function openSourceEditor(record?: SourceEvidenceRecord) {
        setSourceError(null);
        setEditingSourceId(record?.id ?? null);
        setFileInput(record?.file ?? '');
        setSheetInput(record?.sheet ?? '');
        setCellInput(record?.cell ?? '');
        setStatusInput(record?.status ?? 'PENDING');
        setRawInput(record?.raw ?? '');
        setCanonicalInput(record?.canonical ?? '');
        setEvidenceInput(record?.evidence ?? '');
        setDetailSource(null);
        setSourceModalOpen(true);
    }

    function openAliasCreator() {
        setAliasError(null);
        setAliasKind('SUBJECT');
        setAliasValue('');
        setAliasCanonical(options.subjects[0]?.value ?? '');
        setAliasSource('');
        setAliasModalOpen(true);
    }

    async function handleSaveSource() {
        const payload = {
            file: fileInput,
            sheet: sheetInput,
            cell: cellInput,
            raw: rawInput,
            canonical: canonicalInput,
            evidence: evidenceInput,
            status: statusInput,
            actor_name: actorName,
        };
        const err = validateSourceDraft(payload);
        if (err) {
            setSourceError(err);
            return;
        }
        try {
            await saveSourceMutation.mutateAsync({
                id: editingSourceId,
                payload,
            });
            setSourceModalOpen(false);
            toast({ title: 'Đã lưu đối soát nguồn', tone: 'success' });
        } catch (error) {
            setSourceError(
                error instanceof ApiError
                    ? error.message
                    : 'Không lưu được bản ghi nguồn.',
            );
        }
    }

    async function handleSaveAlias() {
        const payload = {
            kind: aliasKind,
            alias: aliasValue,
            canonical: aliasCanonical,
            source: aliasSource,
            actor_name: actorName,
        };
        const validValues = aliasCanonicalList.map((item) => item.value);
        const err = validateAliasDraft(payload, aliases, validValues);
        if (err) {
            setAliasError(err);
            return;
        }
        try {
            await saveAliasMutation.mutateAsync(payload);
            setAliasModalOpen(false);
            toast({ title: 'Đã ghi ánh xạ bí danh', tone: 'success' });
        } catch (error) {
            setAliasError(
                error instanceof ApiError
                    ? error.message
                    : 'Không lưu được ánh xạ bí danh.',
            );
        }
    }

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Mỗi dữ liệu, một đường về nguồn."
                description="Đối soát bằng chứng và bí danh; không phải import Excel tự động."
                actions={
                    <div className="mvp-actions">
                        <button
                            type="button"
                            className="btn primary"
                            onClick={() => openSourceEditor()}
                        >
                            <Icon name="plus" />
                            Thêm nguồn
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={openAliasCreator}
                        >
                            Thêm bí danh
                        </button>
                    </div>
                }
            />

            <section className="panel">
                <div className="panel-head">
                    <h2>Nguồn và bằng chứng</h2>
                </div>
                <div className="table-scroll">
                    <table className="data-table mvp-table">
                        <thead>
                            <tr>
                                <th>TỆP / NGUỒN</th>
                                <th>SHEET / Ô</th>
                                <th>GIÁ TRỊ GỐC → CHUẨN</th>
                                <th>XÁC NHẬN</th>
                                <th aria-label="Thao tác" />
                            </tr>
                        </thead>
                        <tbody>
                            {sources.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.file}</td>
                                    <td>
                                        {item.sheet}
                                        <small>{item.cell}</small>
                                    </td>
                                    <td>
                                        <span className="mvp-source-cell">
                                            {item.raw}
                                            <small>→ {item.canonical}</small>
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`mvp-status ${item.status === 'CONFIRMED' ? 'PASS' : 'INSUFFICIENT_DATA'}`}
                                        >
                                            {item.status === 'CONFIRMED'
                                                ? 'Đã đối soát'
                                                : 'Chưa xác nhận'}
                                        </span>
                                        {item.confirmed_by ? (
                                            <div className="identity-subline">
                                                <ActorIdentity
                                                    actor={item.confirmed_by}
                                                />
                                            </div>
                                        ) : null}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn small"
                                            onClick={() =>
                                                setDetailSource(item)
                                            }
                                        >
                                            Bằng chứng
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="panel section-gap">
                <div className="panel-head">
                    <h2>Ánh xạ bí danh</h2>
                </div>
                {aliases.length > 0 ? (
                    <div className="table-scroll">
                        <table className="data-table mvp-table">
                            <thead>
                                <tr>
                                    <th>LOẠI</th>
                                    <th>GIÁ TRỊ GỐC</th>
                                    <th>ID / GIÁ TRỊ CHUẨN</th>
                                    <th>NGUỒN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aliases.map((item) => (
                                    <tr key={item.id}>
                                        <td>{ALIAS_KIND_LABELS[item.kind]}</td>
                                        <td>{item.alias}</td>
                                        <td>{item.canonical}</td>
                                        <td>{item.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mvp-empty">Chưa có ánh xạ bí danh nào.</div>
                )}
            </section>

            <div className="mvp-note">
                <Icon name="shield" />
                <span>
                    Ghi lại file/sheet/ô và giá trị nguồn giúp truy vết. Bản
                    demo không đọc hay tự gửi tệp của bạn lên dịch vụ bên ngoài.
                </span>
            </div>

            <Dialog
                open={detailSource !== null}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setDetailSource(null);
                }}
                title="Bằng chứng nguồn"
                description={detailSource?.file}
            >
                {detailSource ? (
                    <>
                        <div className="detail-grid">
                            <div>
                                <small>Sheet / vị trí</small>
                                {detailSource.sheet} · {detailSource.cell}
                            </div>
                            <div>
                                <small>Xác nhận</small>
                                {detailSource.confirmed_by ? (
                                    <ActorIdentity
                                        actor={detailSource.confirmed_by}
                                    />
                                ) : (
                                    'Chưa xác nhận'
                                )}
                            </div>
                        </div>
                        <h3 style={{ marginTop: 20 }}>Giá trị gốc</h3>
                        <pre className="mvp-json">{detailSource.raw}</pre>
                        <h3 style={{ marginTop: 20 }}>Giá trị chuẩn</h3>
                        <pre className="mvp-json">{detailSource.canonical}</pre>
                        <div className="mvp-note">
                            <Icon name="shield" />
                            <span>{detailSource.evidence}</span>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setDetailSource(null)}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => openSourceEditor(detailSource)}
                            >
                                Cập nhật đối soát
                            </button>
                        </div>
                    </>
                ) : null}
            </Dialog>

            <Dialog
                open={sourceModalOpen}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setSourceModalOpen(false);
                }}
                busy={saveSourceMutation.isPending}
                title="Nguồn dữ liệu và bằng chứng"
                description="Ghi nhận vị trí nguồn, giá trị gốc và kết quả ánh xạ."
                wide
            >
                <div className="mvp-form">
                    <label className="field">
                        Tên file / tài liệu nguồn
                        <input
                            value={fileInput}
                            onChange={(e) => setFileInput(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Sheet / mục
                        <input
                            value={sheetInput}
                            onChange={(e) => setSheetInput(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Ô / trang / dòng
                        <input
                            value={cellInput}
                            onChange={(e) => setCellInput(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Trạng thái
                        <Select
                            value={statusInput}
                            onChange={(e) =>
                                setStatusInput(
                                    e.target.value as SourceEvidenceStatus,
                                )
                            }
                        >
                            <option value="PENDING">Chưa xác nhận</option>
                            <option value="CONFIRMED">Đã đối soát</option>
                        </Select>
                    </label>
                    <label className="field full">
                        Giá trị gốc
                        <textarea
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                        />
                    </label>
                    <label className="field full">
                        Ánh xạ ID / giá trị chuẩn
                        <textarea
                            value={canonicalInput}
                            onChange={(e) => setCanonicalInput(e.target.value)}
                        />
                    </label>
                    <label className="field full">
                        Bằng chứng / ghi chú
                        <textarea
                            value={evidenceInput}
                            onChange={(e) => setEvidenceInput(e.target.value)}
                        />
                    </label>
                    {sourceError ? (
                        <div className="mvp-error" role="alert">
                            {sourceError}
                        </div>
                    ) : null}
                </div>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn"
                        disabled={saveSourceMutation.isPending}
                        onClick={() => setSourceModalOpen(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={saveSourceMutation.isPending}
                        onClick={() => void handleSaveSource()}
                    >
                        {saveSourceMutation.isPending
                            ? 'Đang lưu…'
                            : 'Lưu nguồn'}
                    </button>
                </div>
            </Dialog>

            <Dialog
                open={aliasModalOpen}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setAliasModalOpen(false);
                }}
                busy={saveAliasMutation.isPending}
                title="Ánh xạ một bí danh"
                description="Không thay đổi ID chuẩn trong các snapshot đã lưu."
            >
                <div className="mvp-form">
                    <label className="field">
                        Loại đối tượng
                        <Select
                            value={aliasKind}
                            onChange={(e) => {
                                const nextKind = e.target.value as AliasKind;
                                setAliasKind(nextKind);
                                const nextOpts =
                                    nextKind === 'TEACHER'
                                        ? options.teachers
                                        : nextKind === 'CLASS'
                                          ? options.classes
                                          : options.subjects;
                                setAliasCanonical(nextOpts[0]?.value ?? '');
                            }}
                        >
                            <option value="TEACHER">Giáo viên</option>
                            <option value="CLASS">Lớp</option>
                            <option value="SUBJECT">Môn</option>
                        </Select>
                    </label>
                    <label className="field">
                        Bí danh trong nguồn
                        <input
                            value={aliasValue}
                            onChange={(e) => setAliasValue(e.target.value)}
                            placeholder="VD: Văn, Toan 10..."
                        />
                    </label>
                    <label className="field full">
                        Mã / tên chuẩn trong danh mục
                        <Select
                            value={aliasCanonical}
                            onChange={(e) => setAliasCanonical(e.target.value)}
                        >
                            {aliasCanonicalList.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </label>
                    <label className="field full">
                        Nguồn chứng cứ
                        <input
                            value={aliasSource}
                            onChange={(e) => setAliasSource(e.target.value)}
                            placeholder="VD: Bảng tổng hợp tổ Ngữ văn..."
                        />
                    </label>
                    {aliasError ? (
                        <div className="mvp-error" role="alert">
                            {aliasError}
                        </div>
                    ) : null}
                </div>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn"
                        disabled={saveAliasMutation.isPending}
                        onClick={() => setAliasModalOpen(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={saveAliasMutation.isPending}
                        onClick={() => void handleSaveAlias()}
                    >
                        {saveAliasMutation.isPending
                            ? 'Đang lưu…'
                            : 'Lưu bí danh'}
                    </button>
                </div>
            </Dialog>
        </div>
    );
}
