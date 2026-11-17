import { Select } from '@/shared/ui/select';
import { PillBadge, RoleStateCard } from '@/features/session/role-ui';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { DataTable, type Column } from '@/shared/ui/table';
import type { RoundSubjectScope } from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
import type { ScopeEditor } from './use-scope-editor';
import type { PreparationDeletion } from './use-preparation-deletion';

export function ScopeStep({
    data,
    editor,
    deletion,
}: {
    data: PreparationData;
    editor: ScopeEditor;
    deletion: PreparationDeletion;
}) {
    const {
        activeRound,
        grades,
        subjects,
        scopesQuery,
        gradeMap,
        subjectMap,
        formatScopeLabel,
    } = data;
    const {
        scopeGradeFilter,
        setScopeGradeFilter,
        setScopeModal,
        filteredScopes,
        saveRoundMutation,
        handleConfirmRoundScope,
        handleToggleScopeConfirm,
    } = editor;
    const { setDeleteTarget } = deletion;
    const scopeColumns: Column<RoundSubjectScope>[] = [
        {
            key: 'grade',
            title: 'KHỐI LỚP',
            render: (row) => (
                <strong>
                    {gradeMap.get(row.grade_id)?.name ??
                        `Khối #${row.grade_id}`}
                </strong>
            ),
        },
        {
            key: 'subject',
            title: 'MÔN HỌC',
            render: (row) => {
                const sub = subjectMap.get(row.subject_id);
                return (
                    <SubjectIdentity
                        name={sub?.name ?? `Môn #${row.subject_id}`}
                        detail={sub?.subject_code}
                        compact
                    />
                );
            },
        },
        {
            key: 'status',
            title: 'XÁC NHẬN',
            render: (row) => (
                <PillBadge
                    tone={row.confirmed_at ? '' : 'amber'}
                    dot
                    label={row.confirmed_at ? 'Đã xác nhận' : 'Chưa xác nhận'}
                />
            ),
        },
        {
            key: 'actions',
            title: 'THAO TÁC',
            align: 'right',
            render: (row) => (
                <div
                    className="catalog-row-actions"
                    style={{ justifyContent: 'flex-end' }}
                >
                    <button
                        type="button"
                        className="icon-btn"
                        title={row.confirmed_at ? 'Bỏ xác nhận' : 'Xác nhận'}
                        aria-label={
                            row.confirmed_at ? 'Bỏ xác nhận' : 'Xác nhận'
                        }
                        onClick={() => void handleToggleScopeConfirm(row)}
                    >
                        {row.confirmed_at ? (
                            <Icon name="unconfirm" />
                        ) : (
                            <Icon name="check" />
                        )}
                    </button>
                    <button
                        type="button"
                        aria-label="Gỡ phạm vi"
                        title="Gỡ phạm vi"
                        className="icon-btn catalog-delete-action"
                        onClick={() =>
                            setDeleteTarget({
                                kind: 'scope',
                                id: row.id,
                                label: formatScopeLabel(row),
                            })
                        }
                    >
                        <Icon name="unlink" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <section className="panel">
            <div className="panel-head">
                <div>
                    <h2>Bước 1 · Phạm vi khối–môn áp dụng trong đợt</h2>
                    <p>
                        Chỉ những môn thuộc phạm vi đã xác nhận mới tiếp tục
                        xuống lớp ở bước 2.
                    </p>
                </div>
                <div className="mvp-actions">
                    <button
                        type="button"
                        className="btn"
                        disabled={!activeRound || saveRoundMutation.isPending}
                        onClick={() => void handleConfirmRoundScope()}
                    >
                        <Icon name="check" />
                        Xác nhận phạm vi đợt
                    </button>
                    <button
                        type="button"
                        className="btn primary"
                        disabled={!activeRound}
                        onClick={() =>
                            setScopeModal({
                                draft: {
                                    grade_id: grades[0]
                                        ? String(grades[0].id)
                                        : '',
                                    subject_id: subjects[0]
                                        ? String(subjects[0].id)
                                        : '',
                                },
                                error: null,
                            })
                        }
                    >
                        <Icon name="plus" />
                        Thêm môn vào phạm vi
                    </button>
                </div>
            </div>
            <div className="panel-body">
                <div className="mvp-filter">
                    <Select
                        aria-label="Lọc phạm vi theo khối"
                        value={scopeGradeFilter}
                        onChange={(e) => setScopeGradeFilter(e.target.value)}
                    >
                        <option value="">Tất cả khối lớp</option>
                        {grades.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </Select>
                </div>
                {scopesQuery.isLoading ? (
                    <DataTable
                        variant="prototype"
                        caption="Phạm vi khối–môn của đợt"
                        columns={scopeColumns}
                        updating={scopesQuery.isFetching}
                        rows={[]}
                        rowKey={() => 0}
                        loading
                    />
                ) : filteredScopes.length > 0 ? (
                    <DataTable
                        variant="prototype"
                        caption="Phạm vi khối–môn của đợt"
                        columns={scopeColumns}
                        updating={scopesQuery.isFetching}
                        rows={filteredScopes}
                        rowKey={(row) => row.id}
                    />
                ) : (
                    <RoleStateCard
                        kind="empty"
                        illustration={
                            scopesQuery.data?.length === 0
                                ? 'preparation'
                                : undefined
                        }
                        title="Chưa có phạm vi khối–môn"
                        detail="Thêm môn học vào phạm vi khối cho đợt phân công này."
                    />
                )}
            </div>
        </section>
    );
}
