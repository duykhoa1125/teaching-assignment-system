import { Select } from '@/shared/ui/select';
import { APPLICABILITY_STATUS_LABELS } from '@/features/preparation/model';
import { PillBadge, RoleStateCard } from '@/features/session/role-ui';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { DataTable, type Column } from '@/shared/ui/table';
import type {
    ApplicabilityStatus,
    ClassSubjectApplicability,
} from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
import type { ApplicabilityEditor } from './use-applicability-editor';
import type { PreparationDeletion } from './use-preparation-deletion';

export function ApplicabilityStep({
    data,
    editor,
    deletion,
}: {
    data: PreparationData;
    editor: ApplicabilityEditor;
    deletion: PreparationDeletion;
}) {
    const {
        classes,
        allAppsQuery,
        gradeMap,
        classMap,
        subjectMap,
        scopes,
        scopeMap,
        formatScopeLabel,
        formatAppLabel,
    } = data;
    const {
        appScopeFilter,
        setAppScopeFilter,
        appStatusFilter,
        setAppStatusFilter,
        setAppModal,
        filteredApps,
    } = editor;
    const { setDeleteTarget } = deletion;
    const appColumns: Column<ClassSubjectApplicability>[] = [
        {
            key: 'class',
            title: 'LỚP HỌC',
            render: (row) => (
                <strong className="class-tag">
                    {classMap.get(row.class_id)?.class_code ??
                        `Lớp #${row.class_id}`}
                </strong>
            ),
        },
        {
            key: 'subject',
            title: 'MÔN HỌC TRONG PHẠM VI',
            render: (row) => {
                const scope = scopeMap.get(row.scope_id);
                const sub = scope
                    ? subjectMap.get(scope.subject_id)
                    : undefined;
                const grade = scope ? gradeMap.get(scope.grade_id) : undefined;
                return (
                    <SubjectIdentity
                        name={sub?.name ?? `Môn #${scope?.subject_id ?? '?'}`}
                        detail={grade?.name}
                        compact
                    />
                );
            },
        },
        {
            key: 'status',
            title: 'ÁP DỤNG',
            render: (row) => (
                <PillBadge
                    tone={
                        row.status === 'APPLICABLE'
                            ? ''
                            : row.status === 'NOT_APPLICABLE'
                              ? 'gray'
                              : 'amber'
                    }
                    dot
                    label={APPLICABILITY_STATUS_LABELS[row.status]}
                />
            ),
        },
        {
            key: 'reason',
            title: 'LÝ DO / GHI CHÚ',
            render: (row) =>
                row.reason ? (
                    <span>{row.reason}</span>
                ) : (
                    <span className="muted">—</span>
                ),
        },
        {
            key: 'confirmed',
            title: 'TẬP BẮT BUỘC',
            render: (row) =>
                row.status === 'APPLICABLE' ? (
                    <PillBadge
                        tone={row.components_confirmed_at ? '' : 'amber'}
                        label={
                            row.components_confirmed_at
                                ? 'Đã chốt tập'
                                : 'Chưa chốt tập'
                        }
                    />
                ) : (
                    <span className="muted">Không yêu cầu</span>
                ),
        },
        {
            key: 'actions',
            title: 'THAO TÁC',
            align: 'right',
            render: (row) => (
                <div
                    className="mvp-actions"
                    style={{ justifyContent: 'flex-end' }}
                >
                    <button
                        type="button"
                        className="btn small"
                        onClick={() =>
                            setAppModal({
                                editing: row,
                                draft: {
                                    scope_id: String(row.scope_id),
                                    class_id: String(row.class_id),
                                    status: row.status,
                                    reason: row.reason ?? '',
                                    confirmNow: Boolean(row.confirmed_at),
                                },
                                errors: {},
                                submitError: null,
                            })
                        }
                    >
                        <Icon name="edit" />
                        Phân loại
                    </button>
                    <button
                        type="button"
                        className="btn small danger"
                        onClick={() =>
                            setDeleteTarget({
                                kind: 'applicability',
                                id: row.id,
                                label: formatAppLabel(row),
                            })
                        }
                    >
                        Xóa
                    </button>
                </div>
            ),
        },
    ];

    return (
        <section className="panel">
            <div className="panel-head">
                <div>
                    <h2>Bước 2 · Phân loại áp dụng từng cặp lớp–môn</h2>
                    <p>
                        Mọi cặp lớp–môn phải ở trạng thái Áp dụng hoặc Không áp
                        dụng (có lý do).
                    </p>
                </div>
                <button
                    type="button"
                    className="btn primary"
                    disabled={scopes.length === 0}
                    onClick={() => {
                        const firstScope = scopes[0];
                        const matchingClass = firstScope
                            ? classes.find(
                                  (c) => c.grade_id === firstScope.grade_id,
                              )
                            : undefined;
                        setAppModal({
                            editing: null,
                            draft: {
                                scope_id: firstScope
                                    ? String(firstScope.id)
                                    : '',
                                class_id: matchingClass
                                    ? String(matchingClass.id)
                                    : '',
                                status: 'APPLICABLE',
                                reason: '',
                                confirmNow: true,
                            },
                            errors: {},
                            submitError: null,
                        });
                    }}
                >
                    <Icon name="plus" />
                    Khai báo cặp lớp–môn
                </button>
            </div>
            <div className="panel-body">
                <div className="mvp-filter">
                    <Select
                        aria-label="Lọc theo phạm vi khối–môn"
                        value={appScopeFilter}
                        onChange={(e) => setAppScopeFilter(e.target.value)}
                    >
                        <option value="">Tất cả phạm vi khối–môn</option>
                        {scopes.map((s) => (
                            <option key={s.id} value={s.id}>
                                {formatScopeLabel(s)}
                            </option>
                        ))}
                    </Select>
                    <Select
                        aria-label="Lọc theo trạng thái áp dụng"
                        value={appStatusFilter}
                        onChange={(e) =>
                            setAppStatusFilter(
                                e.target.value as ApplicabilityStatus | '',
                            )
                        }
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="APPLICABLE">Áp dụng</option>
                        <option value="NOT_APPLICABLE">Không áp dụng</option>
                        <option value="UNDETERMINED">Chưa xác định</option>
                    </Select>
                </div>
                {allAppsQuery.isLoading ? (
                    <DataTable
                        variant="prototype"
                        caption="Phân loại áp dụng lớp–môn"
                        columns={appColumns}
                        updating={allAppsQuery.isFetching}
                        rows={[]}
                        rowKey={() => 0}
                        loading
                    />
                ) : filteredApps.length > 0 ? (
                    <DataTable
                        variant="prototype"
                        caption="Phân loại áp dụng lớp–môn"
                        columns={appColumns}
                        updating={allAppsQuery.isFetching}
                        rows={filteredApps}
                        rowKey={(row) => row.id}
                    />
                ) : (
                    <RoleStateCard
                        kind="empty"
                        title="Chưa có cặp lớp–môn phù hợp"
                        detail="Khai báo cặp lớp–môn theo phạm vi khối ở bước 1."
                    />
                )}
            </div>
        </section>
    );
}
