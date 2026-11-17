import { Select } from '@/shared/ui/select';
import { Link } from 'react-router';
import { DEMAND_TYPE_LABELS } from '@/features/preparation/model';
import { PillBadge, RoleStateCard } from '@/features/session/role-ui';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { DataTable, type Column } from '@/shared/ui/table';
import type {
    ClassSubjectApplicability,
    RequiredDemandComponent,
} from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
import type { RequiredComponentEditor } from './use-required-component-editor';
import type { PreparationDeletion } from './use-preparation-deletion';

export function RequiredComponentsStep({
    data,
    editor,
    deletion,
    onConfirmComponents,
}: {
    data: PreparationData;
    editor: RequiredComponentEditor;
    deletion: PreparationDeletion;
    onConfirmComponents: (app: ClassSubjectApplicability) => Promise<void>;
}) {
    const {
        activeSemester,
        allComponentsQuery,
        classMap,
        subjectMap,
        scopeMap,
        appMap,
        applicableApps,
        formatAppLabel,
    } = data;
    const {
        componentAppFilter,
        setComponentAppFilter,
        setComponentModal,
        filteredComponents,
    } = editor;
    const { setDeleteTarget } = deletion;
    const componentColumns: Column<RequiredDemandComponent>[] = [
        {
            key: 'pair',
            title: 'LỚP · MÔN',
            render: (row) => {
                const app = appMap.get(row.applicability_id);
                const scope = app ? scopeMap.get(app.scope_id) : undefined;
                const cls = app ? classMap.get(app.class_id) : undefined;
                const sub = scope
                    ? subjectMap.get(scope.subject_id)
                    : undefined;
                return (
                    <SubjectIdentity
                        name={`${cls?.class_code ?? '?'} · ${sub?.name ?? '?'}`}
                        detail={
                            app?.components_confirmed_at
                                ? 'Tập đã xác nhận'
                                : 'Chưa xác nhận tập'
                        }
                        compact
                    />
                );
            },
        },
        {
            key: 'type',
            title: 'THÀNH PHẦN',
            render: (row) => (
                <PillBadge
                    tone={row.demand_type === 'STANDARD' ? 'gray' : 'purple'}
                    label={DEMAND_TYPE_LABELS[row.demand_type]}
                />
            ),
        },
        {
            key: 'range',
            title: 'HIỆU LỰC',
            render: (row) => `${row.valid_from} → ${row.valid_to}`,
        },
        {
            key: 'demand',
            title: 'LIÊN KẾT NHU CẦU',
            render: (row) =>
                row.demand_id ? (
                    <PillBadge dot label={`Đã khớp #${row.demand_id}`} />
                ) : (
                    <Link to="/demands" className="btn small">
                        <Icon name="plus" />
                        Thiếu nhu cầu
                    </Link>
                ),
        },
        {
            key: 'actions',
            title: 'THAO TÁC',
            align: 'right',
            render: (row) => {
                const app = appMap.get(row.applicability_id);
                return (
                    <div
                        className="mvp-actions"
                        style={{ justifyContent: 'flex-end' }}
                    >
                        {app && !app.components_confirmed_at ? (
                            <button
                                type="button"
                                className="btn small"
                                onClick={() => void onConfirmComponents(app)}
                            >
                                Chốt tập
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="btn small"
                            onClick={() =>
                                setComponentModal({
                                    editing: row,
                                    draft: {
                                        applicability_id: String(
                                            row.applicability_id,
                                        ),
                                        demand_type: row.demand_type,
                                        valid_from: row.valid_from,
                                        valid_to: row.valid_to,
                                    },
                                    errors: {},
                                    submitError: null,
                                })
                            }
                        >
                            <Icon name="edit" />
                            Sửa
                        </button>
                        <button
                            type="button"
                            className="btn small danger"
                            onClick={() =>
                                setDeleteTarget({
                                    kind: 'component',
                                    id: row.id,
                                    label: `${DEMAND_TYPE_LABELS[row.demand_type]} #${row.id}`,
                                })
                            }
                        >
                            Xóa
                        </button>
                    </div>
                );
            },
        },
    ];

    return (
        <section className="panel">
            <div className="panel-head">
                <div>
                    <h2>Bước 3 · Tập thành phần nhu cầu bắt buộc</h2>
                    <p>
                        Chỉ lớp–môn ÁP DỤNG mới khai báo Chính khóa, Chuyên đề
                        hoặc Tăng cường.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn primary"
                    disabled={applicableApps.length === 0}
                    onClick={() => {
                        const targetApp =
                            (componentAppFilter
                                ? applicableApps.find(
                                      (a) =>
                                          a.id === Number(componentAppFilter),
                                  )
                                : undefined) ?? applicableApps[0];
                        setComponentModal({
                            editing: null,
                            draft: {
                                applicability_id: targetApp
                                    ? String(targetApp.id)
                                    : '',
                                demand_type: 'STANDARD',
                                valid_from:
                                    activeSemester?.starts_on ?? '2026-08-01',
                                valid_to:
                                    activeSemester?.ends_on ?? '2026-12-31',
                            },
                            errors: {},
                            submitError: null,
                        });
                    }}
                >
                    <Icon name="plus" />
                    Thêm thành phần bắt buộc
                </button>
            </div>
            <div className="panel-body">
                <div className="mvp-note warning">
                    Lưu ý đồng bộ: Khi thêm, sửa hoặc xóa thành phần bắt buộc,
                    dấu xác nhận tập thành phần của cặp lớp–môn cha sẽ tự động
                    đặt lại để rà soát trước khi chốt lại.
                </div>
                <div className="mvp-filter">
                    <Select
                        aria-label="Lọc theo cặp lớp–môn áp dụng"
                        value={componentAppFilter}
                        onChange={(e) => setComponentAppFilter(e.target.value)}
                    >
                        <option value="">Tất cả cặp lớp–môn áp dụng</option>
                        {applicableApps.map((app) => (
                            <option key={app.id} value={app.id}>
                                {formatAppLabel(app)}
                                {app.components_confirmed_at
                                    ? ' (Đã chốt)'
                                    : ' (Chưa chốt)'}
                            </option>
                        ))}
                    </Select>
                    {componentAppFilter ? (
                        <button
                            type="button"
                            className="btn small"
                            onClick={() => {
                                const app = appMap.get(
                                    Number(componentAppFilter),
                                );
                                if (app) void onConfirmComponents(app);
                            }}
                        >
                            <Icon name="check" />
                            Chốt tập cho cặp đang chọn
                        </button>
                    ) : null}
                </div>
                {allComponentsQuery.isLoading ? (
                    <DataTable
                        variant="prototype"
                        caption="Tập thành phần bắt buộc"
                        columns={componentColumns}
                        updating={allComponentsQuery.isFetching}
                        rows={[]}
                        rowKey={() => 0}
                        loading
                    />
                ) : filteredComponents.length > 0 ? (
                    <DataTable
                        variant="prototype"
                        caption="Tập thành phần bắt buộc"
                        columns={componentColumns}
                        updating={allComponentsQuery.isFetching}
                        rows={filteredComponents}
                        rowKey={(row) => row.id}
                    />
                ) : (
                    <RoleStateCard
                        kind="empty"
                        title="Chưa có thành phần bắt buộc"
                        detail="Thêm thành phần Chính khóa, Chuyên đề hoặc Tăng cường cho các cặp Áp dụng."
                    />
                )}
            </div>
        </section>
    );
}
