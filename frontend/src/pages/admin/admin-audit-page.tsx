import '@/pages/results/results.css';
import { useState } from 'react';
import { formatGovernanceDateTime } from '@/features/governance/model';
import { useGovernanceAuditQuery } from '@/features/governance/queries';
import type { GovernanceAuditRecord } from '@/features/governance/types';
import {
    ActorIdentity,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';

export function AdminAuditPage() {
    const { isMockMode } = useSession();
    const [searchText, setSearchText] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedEntry, setSelectedEntry] =
        useState<GovernanceAuditRecord | null>(null);

    const auditQuery = useGovernanceAuditQuery(
        {
            q: searchText.trim() || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
        },
        isMockMode,
    );

    if (!isMockMode) {
        return (
            <>
                <RolePageHeader
                    title="Biết ai đã đổi điều gì."
                    description="Nhật ký chỉ đọc: tác nhân, vai trò, đối tượng, kết quả và trước/sau."
                />
                <EmptyState title="Nhật ký quản trị chưa nối API thật">
                    Nhật ký kiểm toán trước/sau hoạt động trong mô phỏng FE-08 (
                    <code>VITE_DATA_SOURCE=mock</code>).
                </EmptyState>
            </>
        );
    }

    const rows = auditQuery.data ?? [];

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Biết ai đã đổi điều gì."
                description="Nhật ký chỉ đọc: tác nhân, vai trò, đối tượng, kết quả và trước/sau."
            />

            <div className="mvp-toolbar">
                <div className="mvp-filter">
                    <input
                        name="audit_search"
                        aria-label="Tìm nhật ký"
                        placeholder="Tìm người, hành động, đối tượng…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <input
                        name="audit_from"
                        type="date"
                        aria-label="Nhật ký từ ngày"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                    <input
                        name="audit_to"
                        type="date"
                        aria-label="Nhật ký đến ngày"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>
            </div>

            {auditQuery.isPending ? (
                <section className="panel">
                    <RoleStateCard
                        kind="loading"
                        title="Đang tải nhật ký…"
                        detail="Đang tổng hợp dấu vết thao tác quản trị và phân công."
                    />
                </section>
            ) : auditQuery.isError ? (
                <section className="panel">
                    <RoleStateCard
                        kind="error"
                        title="Không thể tải nhật ký"
                        detail={auditQuery.error.message}
                        actions={
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => void auditQuery.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </section>
            ) : (
                <section className="panel">
                    {rows.length > 0 ? (
                        <div className="table-scroll">
                            <table className="data-table mvp-table">
                                <thead>
                                    <tr>
                                        <th>THỜI ĐIỂM</th>
                                        <th>NGƯỜI THAO TÁC</th>
                                        <th>HÀNH ĐỘNG / ĐỐI TƯỢNG</th>
                                        <th>KẾT QUẢ</th>
                                        <th aria-label="Chi tiết" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                {formatGovernanceDateTime(
                                                    item.at,
                                                )}
                                            </td>
                                            <td>
                                                <ActorIdentity
                                                    actor={item.actor}
                                                />
                                            </td>
                                            <td>
                                                {item.action}
                                                <small>{item.object}</small>
                                            </td>
                                            <td>
                                                <span
                                                    className={`mvp-status ${item.result === 'SUCCESS' ? 'PASS' : 'VIOLATION'}`}
                                                >
                                                    {item.result}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn small"
                                                    onClick={() =>
                                                        setSelectedEntry(item)
                                                    }
                                                >
                                                    Trước / sau
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="mvp-empty">
                            Không có nhật ký phù hợp bộ lọc.
                        </div>
                    )}
                </section>
            )}

            <div className="mvp-note">
                <Icon name="shield" />
                <span>
                    Nhật ký trình duyệt phục vụ demo. Nhật ký bất biến và bảo vệ
                    truy cập trong sản phẩm cần lưu trên máy chủ.
                </span>
            </div>

            <Dialog
                open={selectedEntry !== null}
                variant="prototype"
                onOpenChange={(next) => {
                    if (!next) setSelectedEntry(null);
                }}
                title={selectedEntry?.action ?? 'Chi tiết nhật ký'}
                description={
                    selectedEntry
                        ? `${selectedEntry.actor} · ${formatGovernanceDateTime(selectedEntry.at)}`
                        : undefined
                }
                wide
            >
                {selectedEntry ? (
                    <>
                        <div className="mvp-grid">
                            <section>
                                <h3>Trước thay đổi</h3>
                                <pre className="mvp-json">
                                    {JSON.stringify(
                                        selectedEntry.before,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </section>
                            <section>
                                <h3>Sau thay đổi</h3>
                                <pre className="mvp-json">
                                    {JSON.stringify(
                                        selectedEntry.after,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </section>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => setSelectedEntry(null)}
                            >
                                Đóng
                            </button>
                        </div>
                    </>
                ) : null}
            </Dialog>
        </div>
    );
}
