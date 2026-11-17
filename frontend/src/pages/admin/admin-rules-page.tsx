import '@/pages/results/results.css';
import { useState } from 'react';
import { validateRuleDraft } from '@/features/governance/model';
import {
    useRulesQuery,
    useSaveRuleMutation,
} from '@/features/governance/queries';
import type { RuleRecord } from '@/features/governance/types';
import { RolePageHeader, RoleStateCard } from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { useToast } from '@/shared/ui/toast-context';

export function AdminRulesPage() {
    const toast = useToast();
    const { isMockMode, account } = useSession();
    const rulesQuery = useRulesQuery(isMockMode);
    const saveMutation = useSaveRuleMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [expression, setExpression] = useState('');
    const [valueInput, setValueInput] = useState('0');
    const [source, setSource] = useState('');
    const [clause, setClause] = useState('');
    const [audience, setAudience] = useState('');
    const [version, setVersion] = useState('RULE_THPT_2026_V2');
    const [from, setFrom] = useState('2026-08-01');
    const [to, setTo] = useState('2027-07-31');
    const [formError, setFormError] = useState<string | null>(null);

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi phép tính có một căn cứ."
                    description="Quy tắc minh họa, phiên bản, đối tượng và hiệu lực."
                />
                <EmptyState title="Quản trị bộ quy tắc chưa nối API thật">
                    Danh sách quy tắc và versioning hoạt động trên chế độ mock
                    FE-08 (<code>VITE_DATA_SOURCE=mock</code>).
                </EmptyState>
            </>
        );
    }

    if (rulesQuery.isPending) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi phép tính có một căn cứ."
                    description="Quy tắc minh họa, phiên bản, đối tượng và hiệu lực."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải bộ quy tắc…"
                        detail="Đang đồng bộ danh sách quy tắc định mức và nguồn."
                    />
                </section>
            </>
        );
    }

    if (rulesQuery.isError) {
        return (
            <>
                <RolePageHeader
                    title="Mỗi phép tính có một căn cứ."
                    description="Quy tắc minh họa, phiên bản, đối tượng và hiệu lực."
                />
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải bộ quy tắc"
                        detail={rulesQuery.error.message}
                        actions={
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void rulesQuery.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </section>
            </>
        );
    }

    const rules = rulesQuery.data;

    function openForm(rule?: RuleRecord) {
        setFormError(null);
        setEditingId(rule?.id ?? null);
        setCode(rule?.code ?? '');
        setName(rule?.name ?? '');
        setExpression(rule?.expression ?? '');
        setValueInput(String(rule?.value ?? 0));
        setSource(rule?.source ?? '');
        setClause(rule?.clause ?? '');
        setAudience(rule?.audience ?? '');
        setVersion(rule ? `${rule.version}-r2` : 'RULE_THPT_2026_V2');
        setFrom(rule?.from ?? '2026-08-01');
        setTo(rule?.to ?? '2027-07-31');
        setModalOpen(true);
    }

    async function handleSave() {
        const payload = {
            code,
            name,
            expression,
            value: Number(valueInput),
            source,
            clause,
            audience,
            version,
            from,
            to,
            actor_name: account?.name ?? 'Lê Hải An',
        };
        const err = validateRuleDraft(payload, rules, editingId);
        if (err) {
            setFormError(err);
            return;
        }
        try {
            await saveMutation.mutateAsync({ id: editingId, payload });
            setModalOpen(false);
            toast({ title: 'Đã ghi phiên bản quy tắc', tone: 'success' });
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Không lưu được quy tắc.',
            );
        }
    }

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Mỗi phép tính có một căn cứ."
                description="Quy tắc minh họa, phiên bản, đối tượng và hiệu lực."
                actions={
                    <button
                        type="button"
                        className="btn primary"
                        onClick={() => openForm()}
                    >
                        <Icon name="plus" />
                        Thêm quy tắc
                    </button>
                }
            />

            <section className="panel">
                <div className="table-scroll">
                    <table className="data-table mvp-table">
                        <thead>
                            <tr>
                                <th>QUY TẮC</th>
                                <th>BIỂU THỨC / ĐỐI TƯỢNG</th>
                                <th>NGUỒN / ĐIỀU KHOẢN</th>
                                <th>PHIÊN BẢN / HIỆU LỰC</th>
                                <th aria-label="Thao tác" />
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        {item.code}
                                        <small>{item.name}</small>
                                    </td>
                                    <td>
                                        {item.expression}
                                        <small>{item.audience}</small>
                                    </td>
                                    <td>
                                        {item.source}
                                        <small>{item.clause}</small>
                                    </td>
                                    <td>
                                        {item.version}
                                        <small>
                                            {item.from} → {item.to}
                                        </small>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="icon-btn"
                                            title="Chỉnh sửa"
                                            aria-label={`Chỉnh sửa ${item.code}`}
                                            onClick={() => openForm(item)}
                                        >
                                            <Icon name="edit" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="mvp-note warning">
                <Icon name="warning" />
                <span>
                    Các giá trị minh họa không thay thế thẩm định quy định.
                    Snapshot giữ nguyên bộ quy tắc tại thời điểm mở/phát hành.
                </span>
            </div>

            <Dialog
                open={modalOpen}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setModalOpen(false);
                }}
                busy={saveMutation.isPending}
                title="Quy tắc có nguồn"
                description="Sửa quy tắc cần phiên bản mới để giữ dấu vết."
                wide
            >
                <div className="mvp-form">
                    <label className="field">
                        Mã
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Tên
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Biểu thức / mô tả
                        <input
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Giá trị mẫu
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueInput}
                            onChange={(e) => setValueInput(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Nguồn
                        <input
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Điều / khoản / BR
                        <input
                            value={clause}
                            onChange={(e) => setClause(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Đối tượng
                        <input
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Phiên bản
                        <input
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Từ ngày
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </label>
                    <label className="field">
                        Đến ngày
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
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
                        disabled={saveMutation.isPending}
                        onClick={() => setModalOpen(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={saveMutation.isPending}
                        onClick={() => void handleSave()}
                    >
                        {saveMutation.isPending
                            ? 'Đang lưu…'
                            : 'Ghi phiên bản quy tắc'}
                    </button>
                </div>
            </Dialog>
        </div>
    );
}
