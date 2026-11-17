import '@/pages/admin/catalog-actions.css';
import '@/pages/preparation/preparation-ui.css';
import { useMemo, useState, type FormEvent } from 'react';
import './demands-page.css';
import { sliceCatalogPage } from '@/features/catalogs/model';
import {
    useAssignmentRoundsQuery,
    useClassesQuery,
    useSemestersQuery,
    useSubjectsQuery,
} from '@/features/catalogs/queries';
import {
    buildDemandFilters,
    DEMAND_STATUS_LABELS,
    DEMAND_TYPE_LABELS,
    formatPeriods,
    formatPreparationApiError,
    PREPARATION_PAGE_SIZE,
    toDemandRequest,
    validateBatchDemands,
    validateDemandForm,
    type BatchDemandPreviewRow,
} from '@/features/preparation/model';
import { preparationApi } from '@/features/preparation/api';
import {
    useDeleteDemandMutation,
    useDemandsQuery,
    useSaveDemandMutation,
} from '@/features/preparation/queries';
import {
    resolveSemesterForRound,
    useRoundSelection,
} from '@/features/preparation/round-context';
import type {
    DemandStatus,
    DemandType,
    TeachingDemand,
} from '@/features/preparation/types';
import {
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { Drawer } from '@/shared/ui/drawer';
import { InputField, SelectField } from '@/shared/ui/fields';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { DataTable, Pagination, type Column } from '@/shared/ui/table';
import { useToast } from '@/shared/ui/toast-context';
import { useQueryClient } from '@tanstack/react-query';

type DemandDraft = {
    semester_id: string;
    class_id: string;
    subject_id: string;
    demand_type: DemandType;
    periods_per_week: string;
    status: DemandStatus;
    valid_from: string;
    valid_to: string;
};

type BatchRowState = {
    selected: boolean;
    periodsText: string;
};

type BatchDraft = {
    subject_id: string;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
    defaultPeriods: string;
    rowsByClassId: Record<number, BatchRowState>;
    preview: BatchDemandPreviewRow[] | null;
    formError: string | null;
    submitError: string | null;
};

export function DemandsPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { account, contextId, activeContext } = useSession();
    const actorId = account?.id === 'manager' ? 2 : 1;

    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const semestersQuery = useSemestersQuery({ limit: 100, offset: 0 });
    const classesQuery = useClassesQuery({ limit: 100, offset: 0 });
    const subjectsQuery = useSubjectsQuery({ limit: 100, offset: 0 });

    const rounds = roundsQuery.data ?? [];
    const semesters = semestersQuery.data ?? [];
    const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
    const subjects = useMemo(
        () => subjectsQuery.data ?? [],
        [subjectsQuery.data],
    );

    const { activeRound, selectRoundId } = useRoundSelection(
        rounds,
        contextId,
        activeContext?.round,
    );
    const activeSemester = resolveSemesterForRound(
        activeRound,
        semesters,
        contextId,
    );

    // Filters & pagination
    const [demandTypeFilter, setDemandTypeFilter] = useState<DemandType | ''>(
        '',
    );
    const [classFilter, setClassFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<DemandStatus | ''>('');
    const [asOfFilter, setAsOfFilter] = useState('');
    const [offset, setOffset] = useState(0);

    const pagedFilters = useMemo(
        () =>
            buildDemandFilters({
                semesterId: activeSemester?.id,
                classId: classFilter ? Number(classFilter) : null,
                subjectId: subjectFilter ? Number(subjectFilter) : null,
                demandType: demandTypeFilter,
                status: statusFilter,
                asOf: asOfFilter,
                offset,
                limit: PREPARATION_PAGE_SIZE,
            }),
        [
            activeSemester?.id,
            classFilter,
            subjectFilter,
            demandTypeFilter,
            statusFilter,
            asOfFilter,
            offset,
        ],
    );

    const demandsQuery = useDemandsQuery(pagedFilters, Boolean(activeSemester));
    const allSemesterDemandsQuery = useDemandsQuery(
        { semester_id: activeSemester?.id, limit: 100, offset: 0 },
        Boolean(activeSemester),
    );

    const saveDemandMutation = useSaveDemandMutation();
    const deleteDemandMutation = useDeleteDemandMutation();

    // Modals & Drawer
    const [createModal, setCreateModal] = useState<{
        draft: DemandDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [batchModal, setBatchModal] = useState<BatchDraft | null>(null);
    const [batchSubmitting, setBatchSubmitting] = useState(false);

    const [drawerState, setDrawerState] = useState<{
        row: TeachingDemand;
        draft: DemandDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<TeachingDemand | null>(
        null,
    );

    const yearClasses = useMemo(
        () =>
            activeSemester
                ? classes.filter((c) => {
                      const matchesYear =
                          c.academic_year_id ===
                          activeSemester.academic_year_id;
                      return matchesYear;
                  })
                : classes,
        [activeSemester, classes],
    );

    const classMap = useMemo(
        () => new Map(classes.map((c) => [c.id, c])),
        [classes],
    );
    const subjectMap = useMemo(
        () => new Map(subjects.map((s) => [s.id, s])),
        [subjects],
    );

    const demandsPage = sliceCatalogPage(
        demandsQuery.data ?? [],
        PREPARATION_PAGE_SIZE,
    );
    const allSemesterDemands = allSemesterDemandsQuery.data ?? [];
    const openCreateModal = () => {
        if (!activeSemester) return;
        const firstClass = yearClasses[0] ?? classes[0];
        const firstSubject = subjects[0];
        setCreateModal({
            draft: {
                semester_id: String(activeSemester.id),
                class_id: firstClass ? String(firstClass.id) : '',
                subject_id: firstSubject ? String(firstSubject.id) : '',
                demand_type: 'STANDARD',
                periods_per_week: '4',
                status: 'ACTIVE',
                valid_from: activeSemester.starts_on,
                valid_to: activeSemester.ends_on,
            },
            errors: {},
            submitError: null,
        });
    };

    const openBatchModal = () => {
        if (!activeSemester) return;
        const rowsByClassId: Record<number, BatchRowState> = {};
        yearClasses.forEach((cls, idx) => {
            rowsByClassId[cls.id] = {
                selected: idx < 2 && cls.status === 'ACTIVE',
                periodsText: '4',
            };
        });
        setBatchModal({
            subject_id: subjects[0] ? String(subjects[0].id) : '',
            demand_type: 'STANDARD',
            valid_from: activeSemester.starts_on,
            valid_to: activeSemester.ends_on,
            defaultPeriods: '4',
            rowsByClassId,
            preview: null,
            formError: null,
            submitError: null,
        });
    };

    const handleCreateSingle = async (event: FormEvent) => {
        event.preventDefault();
        if (!createModal) return;
        const errors = validateDemandForm(createModal.draft);
        if (Object.keys(errors).length > 0) {
            setCreateModal({ ...createModal, errors, submitError: null });
            return;
        }
        try {
            await saveDemandMutation.mutateAsync({
                payload: toDemandRequest(createModal.draft, actorId),
            });
            setCreateModal(null);
            toast({ title: 'Đã tạo nhu cầu giảng dạy mới', tone: 'success' });
        } catch (error) {
            setCreateModal({
                ...createModal,
                submitError: formatPreparationApiError(error),
            });
        }
    };

    const buildSelectedBatchRows = (draft: BatchDraft) =>
        yearClasses
            .filter((cls) => draft.rowsByClassId[cls.id]?.selected)
            .map((cls) => ({
                class_id: cls.id,
                class_code: cls.class_code,
                periods_text: draft.rowsByClassId[cls.id]?.periodsText ?? '',
            }));

    const handlePreviewBatch = () => {
        if (!batchModal) return;
        const result = validateBatchDemands({
            semesterId: activeSemester?.id ?? null,
            subjectId: batchModal.subject_id
                ? Number(batchModal.subject_id)
                : null,
            demandType: batchModal.demand_type,
            validFrom: batchModal.valid_from,
            validTo: batchModal.valid_to,
            rows: buildSelectedBatchRows(batchModal),
            existingDemands: allSemesterDemands,
        });
        setBatchModal({
            ...batchModal,
            preview: result.preview,
            formError: result.formError,
            submitError: null,
        });
    };

    const handleSaveBatch = async () => {
        if (!batchModal || !activeSemester) return;
        const selectedRows = buildSelectedBatchRows(batchModal);
        const result = validateBatchDemands({
            semesterId: activeSemester.id,
            subjectId: batchModal.subject_id
                ? Number(batchModal.subject_id)
                : null,
            demandType: batchModal.demand_type,
            validFrom: batchModal.valid_from,
            validTo: batchModal.valid_to,
            rows: selectedRows,
            existingDemands: allSemesterDemands,
        });
        if (result.formError || result.preview.length === 0) {
            setBatchModal({
                ...batchModal,
                preview: result.preview,
                formError: result.formError,
            });
            return;
        }
        setBatchSubmitting(true);
        try {
            let createdCount = 0;
            for (const row of result.preview) {
                if (row.periods_per_week === null) continue;
                await preparationApi.createDemand({
                    semester_id: activeSemester.id,
                    class_id: row.class_id,
                    subject_id: Number(batchModal.subject_id),
                    periods_per_week: row.periods_per_week,
                    status: 'ACTIVE',
                    updated_by: actorId,
                    demand_type: batchModal.demand_type,
                    valid_from: batchModal.valid_from.trim(),
                    valid_to: batchModal.valid_to.trim(),
                    unit: 'PERIOD_PER_WEEK',
                });
                createdCount++;
            }
            await queryClient.invalidateQueries({ queryKey: ['preparation'] });
            await queryClient.invalidateQueries({ queryKey: ['overview'] });
            setBatchModal(null);
            toast({
                title: `Đã nhập ${createdCount} nhu cầu giảng dạy`,
                tone: 'success',
            });
        } catch (error) {
            await queryClient.invalidateQueries({ queryKey: ['preparation'] });
            setBatchModal({
                ...batchModal,
                submitError: formatPreparationApiError(error),
            });
        } finally {
            setBatchSubmitting(false);
        }
    };

    const handleSaveDrawer = async (event: FormEvent) => {
        event.preventDefault();
        if (!drawerState) return;
        const errors = validateDemandForm(drawerState.draft);
        if (Object.keys(errors).length > 0) {
            setDrawerState({ ...drawerState, errors, submitError: null });
            return;
        }
        try {
            await saveDemandMutation.mutateAsync({
                id: drawerState.row.id,
                payload: toDemandRequest(drawerState.draft, actorId),
            });
            setDrawerState(null);
            toast({ title: 'Đã cập nhật nhu cầu giảng dạy', tone: 'success' });
        } catch (error) {
            setDrawerState({
                ...drawerState,
                submitError: formatPreparationApiError(error),
            });
        }
    };

    const handleDeleteDemand = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDemandMutation.mutateAsync(deleteTarget.id);
            if (drawerState?.row.id === deleteTarget.id) setDrawerState(null);
            setDeleteTarget(null);
            toast({
                title: 'Đã bỏ nhu cầu giảng dạy',
                description:
                    'Các thành phần bắt buộc liên kết (nếu có) đã tách liên kết sang trạng thái chờ.',
                tone: 'info',
            });
        } catch (error) {
            setDeleteTarget(null);
            toast({
                title: 'Không thể bỏ nhu cầu',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    const columns: Column<TeachingDemand>[] = [
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
            key: 'periods',
            title: 'TIẾT / TUẦN',
            render: (row) => (
                <span className="mono">
                    <strong>{formatPeriods(row.periods_per_week)}</strong> tiết
                </span>
            ),
        },
        {
            key: 'validity',
            title: 'HIỆU LỰC',
            render: (row) => `${row.valid_from} → ${row.valid_to}`,
        },
        {
            key: 'status',
            title: 'TRẠNG THÁI',
            render: (row) => (
                <PillBadge
                    tone={row.status === 'ACTIVE' ? '' : 'gray'}
                    dot
                    label={DEMAND_STATUS_LABELS[row.status]}
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
                        aria-label="Chi tiết"
                        title="Chi tiết"
                        className="icon-btn"
                        onClick={() =>
                            setDrawerState({
                                row,
                                draft: {
                                    semester_id: String(row.semester_id),
                                    class_id: String(row.class_id),
                                    subject_id: String(row.subject_id),
                                    demand_type: row.demand_type,
                                    periods_per_week: formatPeriods(
                                        row.periods_per_week,
                                    ),
                                    status: row.status,
                                    valid_from: row.valid_from,
                                    valid_to: row.valid_to,
                                },
                                errors: {},
                                submitError: null,
                            })
                        }
                    >
                        <Icon name="panel" />
                    </button>
                    <button
                        type="button"
                        aria-label="Bỏ nhu cầu"
                        title="Bỏ nhu cầu"
                        className="icon-btn catalog-delete-action"
                        onClick={() => setDeleteTarget(row)}
                    >
                        <Icon name="trash" />
                    </button>
                </div>
            ),
        },
    ];

    const previewHasErrors =
        !batchModal?.preview ||
        batchModal.preview.length === 0 ||
        batchModal.preview.some((row) => row.status === 'ERROR');

    return (
        <div className="fe05-page">
            <div className="page-control-row">
                <RolePageHeader
                    title="Nhu cầu, theo từng lớp và giai đoạn."
                    description="Chính khóa, chuyên đề và tăng tiết được phân công độc lập."
                    actions={
                        <div className="mvp-actions">
                            <button
                                type="button"
                                className="btn"
                                disabled={!activeSemester}
                                onClick={openBatchModal}
                            >
                                <Icon name="layers" />
                                Nhập nhiều lớp
                            </button>
                            <button
                                type="button"
                                className="btn primary"
                                disabled={!activeSemester}
                                onClick={openCreateModal}
                            >
                                <Icon name="plus" />
                                Tạo nhu cầu
                            </button>
                        </div>
                    }
                />

                <div className="banner">
                    <span className="school-symbol">
                        <Icon name="calendar" />
                    </span>
                    <div className="grow">
                        <strong
                            style={{ color: 'var(--ink)', fontWeight: 500 }}
                        >
                            {activeRound?.round_code ?? 'Đang tải'} ·{' '}
                            {activeSemester
                                ? `Học kỳ ${activeSemester.semester_no} (${activeSemester.starts_on} → ${activeSemester.ends_on})`
                                : ''}
                        </strong>
                    </div>
                    <select
                        aria-label="Chọn đợt / học kỳ xem nhu cầu"
                        value={activeRound?.id ?? ''}
                        onChange={(e) => {
                            const id = Number(e.target.value);
                            if (id) {
                                selectRoundId(id);
                                setOffset(0);
                            }
                        }}
                    >
                        {rounds.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.round_code}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mvp-toolbar">
                <div className="mvp-filter">
                    <select
                        aria-label="Lọc loại nhu cầu"
                        value={demandTypeFilter}
                        onChange={(event) => {
                            setDemandTypeFilter(
                                event.target.value as DemandType | '',
                            );
                            setOffset(0);
                        }}
                    >
                        <option value="">Tất cả thành phần</option>
                        <option value="STANDARD">Giảng dạy chuẩn</option>
                        <option value="SPECIALIZED_TOPIC">
                            Chuyên đề lựa chọn
                        </option>
                        <option value="ENRICHMENT">
                            Tăng cường / hoạt động
                        </option>
                    </select>
                </div>
            </div>

            <div className="mvp-filter section-gap demand-filters">
                <select
                    aria-label="Lọc theo lớp học"
                    value={classFilter}
                    onChange={(e) => {
                        setClassFilter(e.target.value);
                        setOffset(0);
                    }}
                >
                    <option value="">Tất cả lớp</option>
                    {yearClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.class_code}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Lọc theo môn học"
                    value={subjectFilter}
                    onChange={(e) => {
                        setSubjectFilter(e.target.value);
                        setOffset(0);
                    }}
                >
                    <option value="">Tất cả môn</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Lọc theo trạng thái nhu cầu"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value as DemandStatus | '');
                        setOffset(0);
                    }}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Hiệu lực (ACTIVE)</option>
                    <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                </select>
                <input
                    type="date"
                    aria-label="Lọc theo ngày hiệu lực as_of"
                    value={asOfFilter}
                    onChange={(e) => {
                        setAsOfFilter(e.target.value);
                        setOffset(0);
                    }}
                />
                {classFilter ||
                subjectFilter ||
                statusFilter ||
                asOfFilter ||
                demandTypeFilter ? (
                    <button
                        type="button"
                        className="btn small"
                        onClick={() => {
                            setDemandTypeFilter('');
                            setClassFilter('');
                            setSubjectFilter('');
                            setStatusFilter('');
                            setAsOfFilter('');
                            setOffset(0);
                        }}
                    >
                        Xóa lọc
                    </button>
                ) : null}
            </div>

            {demandsQuery.isError ? (
                <RoleStateCard
                    kind="error"
                    title="Không tải được danh sách nhu cầu"
                    detail={formatPreparationApiError(demandsQuery.error)}
                    actions={
                        <button
                            type="button"
                            className="btn small"
                            onClick={() => void demandsQuery.refetch()}
                        >
                            Thử lại
                        </button>
                    }
                />
            ) : (
                <section className="panel">
                    {demandsQuery.isLoading ? (
                        <RoleStateCard
                            kind="loading"
                            title="Đang tải nhu cầu giảng dạy…"
                            detail="Đang đọc danh sách nhu cầu của học kỳ."
                        />
                    ) : demandsPage.items.length > 0 ? (
                        <DataTable
                            variant="prototype"
                            caption="Danh sách nhu cầu giảng dạy"
                            columns={columns}
                            rows={demandsPage.items}
                            rowKey={(row) => row.id}
                        />
                    ) : (
                        <RoleStateCard
                            kind={
                                classFilter ||
                                subjectFilter ||
                                statusFilter ||
                                asOfFilter ||
                                demandTypeFilter
                                    ? 'search'
                                    : 'empty'
                            }
                            title="Chưa có nhu cầu giảng dạy phù hợp"
                            detail="Thử xóa bộ lọc hoặc tạo nhu cầu giảng dạy mới cho học kỳ."
                        />
                    )}
                    <Pagination
                        offset={offset}
                        limit={PREPARATION_PAGE_SIZE}
                        itemCount={demandsPage.items.length}
                        hasNext={demandsPage.hasNext}
                        busy={demandsQuery.isFetching}
                        onPageChange={setOffset}
                    />
                </section>
            )}

            {/* Single Create Dialog */}
            <Dialog
                variant="prototype"
                open={createModal !== null}
                onOpenChange={(open) => {
                    if (!open) setCreateModal(null);
                }}
                title="Tạo nhu cầu giảng dạy"
                description="Số tiết dương tối đa 999.99 và không chồng lấn khoảng ACTIVE cùng lớp, môn, thành phần."
                busy={saveDemandMutation.isPending}
            >
                {createModal ? (
                    <form className="mvp-form" onSubmit={handleCreateSingle}>
                        <SelectField
                            label="Lớp học"
                            required
                            value={createModal.draft.class_id}
                            error={createModal.errors.class_id}
                            onChange={(e) =>
                                setCreateModal({
                                    ...createModal,
                                    draft: {
                                        ...createModal.draft,
                                        class_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn lớp…</option>
                            {yearClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.class_code} ({c.status})
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Môn học"
                            required
                            value={createModal.draft.subject_id}
                            error={createModal.errors.subject_id}
                            onChange={(e) =>
                                setCreateModal({
                                    ...createModal,
                                    draft: {
                                        ...createModal.draft,
                                        subject_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn môn…</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.subject_code})
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Loại thành phần"
                            required
                            value={createModal.draft.demand_type}
                            error={createModal.errors.demand_type}
                            onChange={(e) =>
                                setCreateModal({
                                    ...createModal,
                                    draft: {
                                        ...createModal.draft,
                                        demand_type: e.target
                                            .value as DemandType,
                                    },
                                })
                            }
                        >
                            <option value="STANDARD">Giảng dạy chuẩn</option>
                            <option value="SPECIALIZED_TOPIC">
                                Chuyên đề lựa chọn
                            </option>
                            <option value="ENRICHMENT">
                                Tăng cường / hoạt động
                            </option>
                        </SelectField>
                        <InputField
                            label="Số tiết / tuần"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="999.99"
                            required
                            value={createModal.draft.periods_per_week}
                            error={createModal.errors.periods_per_week}
                            onChange={(e) =>
                                setCreateModal({
                                    ...createModal,
                                    draft: {
                                        ...createModal.draft,
                                        periods_per_week: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Hiệu lực từ ngày"
                            type="date"
                            required
                            value={createModal.draft.valid_from}
                            error={createModal.errors.valid_from}
                            onChange={(e) =>
                                setCreateModal({
                                    ...createModal,
                                    draft: {
                                        ...createModal.draft,
                                        valid_from: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Hiệu lực đến ngày"
                            type="date"
                            required
                            value={createModal.draft.valid_to}
                            error={createModal.errors.valid_to}
                            onChange={(e) =>
                                setCreateModal({
                                    ...createModal,
                                    draft: {
                                        ...createModal.draft,
                                        valid_to: e.target.value,
                                    },
                                })
                            }
                        />
                        {createModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {createModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setCreateModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveDemandMutation.isPending}
                            >
                                Lưu nhu cầu
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            {/* Batch Multi-Class Demand Dialog */}
            <Dialog
                variant="prototype"
                open={batchModal !== null}
                onOpenChange={(open) => {
                    if (!open && !batchSubmitting) setBatchModal(null);
                }}
                wide
                title="Nhập nhu cầu cho nhiều lớp"
                description="Chọn môn học, khoảng hiệu lực và điều chỉnh số tiết từng lớp trước khi xem trước dữ liệu."
                busy={batchSubmitting}
            >
                {batchModal ? (
                    <div className="mvp-form">
                        <SelectField
                            label="Môn học"
                            required
                            value={batchModal.subject_id}
                            onChange={(e) =>
                                setBatchModal({
                                    ...batchModal,
                                    subject_id: e.target.value,
                                    preview: null,
                                })
                            }
                        >
                            <option value="">Chọn môn…</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.subject_code})
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Loại thành phần"
                            required
                            value={batchModal.demand_type}
                            onChange={(e) =>
                                setBatchModal({
                                    ...batchModal,
                                    demand_type: e.target.value as DemandType,
                                    preview: null,
                                })
                            }
                        >
                            <option value="STANDARD">Giảng dạy chuẩn</option>
                            <option value="SPECIALIZED_TOPIC">
                                Chuyên đề lựa chọn
                            </option>
                            <option value="ENRICHMENT">
                                Tăng cường / hoạt động
                            </option>
                        </SelectField>
                        <InputField
                            label="Hiệu lực từ ngày"
                            type="date"
                            required
                            value={batchModal.valid_from}
                            onChange={(e) =>
                                setBatchModal({
                                    ...batchModal,
                                    valid_from: e.target.value,
                                    preview: null,
                                })
                            }
                        />
                        <InputField
                            label="Hiệu lực đến ngày"
                            type="date"
                            required
                            value={batchModal.valid_to}
                            onChange={(e) =>
                                setBatchModal({
                                    ...batchModal,
                                    valid_to: e.target.value,
                                    preview: null,
                                })
                            }
                        />
                        <div
                            className="full"
                            style={{
                                display: 'flex',
                                gap: 10,
                                alignItems: 'flex-end',
                            }}
                        >
                            <InputField
                                label="Áp nhanh số tiết chung"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="999.99"
                                value={batchModal.defaultPeriods}
                                onChange={(e) =>
                                    setBatchModal({
                                        ...batchModal,
                                        defaultPeriods: e.target.value,
                                    })
                                }
                            />
                            <button
                                type="button"
                                className="btn small"
                                onClick={() => {
                                    const nextRows = {
                                        ...batchModal.rowsByClassId,
                                    };
                                    for (const cls of yearClasses) {
                                        const cur = nextRows[cls.id];
                                        if (cur) {
                                            nextRows[cls.id] = {
                                                ...cur,
                                                periodsText:
                                                    batchModal.defaultPeriods,
                                            };
                                        }
                                    }
                                    setBatchModal({
                                        ...batchModal,
                                        rowsByClassId: nextRows,
                                        preview: null,
                                    });
                                }}
                            >
                                Áp cho tất cả lớp
                            </button>
                        </div>

                        <div className="full mvp-table">
                            <div
                                className="table-scroll"
                                style={{ maxHeight: 220 }}
                            >
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>CHỌN</th>
                                            <th>LỚP HỌC</th>
                                            <th>TIẾT / TUẦN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {yearClasses.map((cls) => {
                                            const rowState = batchModal
                                                .rowsByClassId[cls.id] ?? {
                                                selected: false,
                                                periodsText:
                                                    batchModal.defaultPeriods,
                                            };
                                            return (
                                                <tr key={cls.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            aria-label={`Chọn lớp ${cls.class_code}`}
                                                            checked={
                                                                rowState.selected
                                                            }
                                                            onChange={(e) =>
                                                                setBatchModal({
                                                                    ...batchModal,
                                                                    rowsByClassId:
                                                                        {
                                                                            ...batchModal.rowsByClassId,
                                                                            [cls.id]:
                                                                                {
                                                                                    ...rowState,
                                                                                    selected:
                                                                                        e
                                                                                            .target
                                                                                            .checked,
                                                                                },
                                                                        },
                                                                    preview:
                                                                        null,
                                                                })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>
                                                            {cls.class_code}
                                                        </strong>{' '}
                                                        <span className="muted">
                                                            ({cls.status})
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            max="999.99"
                                                            aria-label={`Số tiết lớp ${cls.class_code}`}
                                                            disabled={
                                                                !rowState.selected
                                                            }
                                                            value={
                                                                rowState.periodsText
                                                            }
                                                            onChange={(e) =>
                                                                setBatchModal({
                                                                    ...batchModal,
                                                                    rowsByClassId:
                                                                        {
                                                                            ...batchModal.rowsByClassId,
                                                                            [cls.id]:
                                                                                {
                                                                                    ...rowState,
                                                                                    periodsText:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                        },
                                                                    preview:
                                                                        null,
                                                                })
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {batchModal.preview ? (
                            <div className="full mvp-table">
                                <div
                                    className="table-scroll"
                                    style={{ maxHeight: 190 }}
                                >
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>XEM TRƯỚC LỚP</th>
                                                <th>TIẾT / TUẦN</th>
                                                <th>TRẠNG THÁI</th>
                                                <th>KIỂM TRA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batchModal.preview.map((item) => (
                                                <tr key={item.class_id}>
                                                    <td>
                                                        <strong>
                                                            {item.class_code}
                                                        </strong>
                                                    </td>
                                                    <td className="mono">
                                                        {item.periods_per_week !==
                                                        null
                                                            ? formatPeriods(
                                                                  item.periods_per_week,
                                                              )
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        <PillBadge
                                                            tone={
                                                                item.status ===
                                                                'OK'
                                                                    ? ''
                                                                    : 'red'
                                                            }
                                                            label={item.status}
                                                        />
                                                    </td>
                                                    <td className="demand-preview-message">
                                                        {item.message}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}

                        {batchModal.formError || batchModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {batchModal.submitError || batchModal.formError}
                            </p>
                        ) : null}

                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={batchSubmitting}
                                onClick={() => setBatchModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn"
                                disabled={batchSubmitting}
                                onClick={handlePreviewBatch}
                            >
                                Xem trước dữ liệu
                            </button>
                            <button
                                type="button"
                                className="btn primary"
                                disabled={batchSubmitting || previewHasErrors}
                                onClick={() => void handleSaveBatch()}
                            >
                                {batchSubmitting
                                    ? 'Đang lưu…'
                                    : 'Lưu hàng loạt'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </Dialog>

            {/* Detail & Edit Drawer */}
            <Drawer
                open={drawerState !== null}
                onOpenChange={(open) => {
                    if (!open) setDrawerState(null);
                }}
                title={
                    drawerState
                        ? `${classMap.get(drawerState.row.class_id)?.class_code ?? ''} · ${
                              subjectMap.get(drawerState.row.subject_id)
                                  ?.name ?? ''
                          }`
                        : 'Chi tiết nhu cầu'
                }
                subtitle={
                    drawerState
                        ? `${DEMAND_TYPE_LABELS[drawerState.row.demand_type]} · #${drawerState.row.id}`
                        : undefined
                }
                footer={
                    drawerState ? (
                        <>
                            <button
                                type="button"
                                className="btn danger"
                                onClick={() => setDeleteTarget(drawerState.row)}
                            >
                                Bỏ nhu cầu
                            </button>
                            <div className="mvp-actions">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setDrawerState(null)}
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    form="demand-drawer-form"
                                    className="btn primary"
                                    disabled={saveDemandMutation.isPending}
                                >
                                    Lưu nhu cầu
                                </button>
                            </div>
                        </>
                    ) : null
                }
            >
                {drawerState ? (
                    <>
                        <div className="detail-grid">
                            <div>
                                <small>Lớp học</small>
                                <b>
                                    {classMap.get(drawerState.row.class_id)
                                        ?.class_code ??
                                        `#${drawerState.row.class_id}`}
                                </b>
                            </div>
                            <div>
                                <small>Môn học</small>
                                <b>
                                    {subjectMap.get(drawerState.row.subject_id)
                                        ?.name ??
                                        `#${drawerState.row.subject_id}`}
                                </b>
                            </div>
                            <div>
                                <small>Đơn vị</small>
                                <b>{drawerState.row.unit}</b>
                            </div>
                            <div>
                                <small>Cập nhật gần nhất</small>
                                <b>
                                    {drawerState.row.updated_at?.slice(0, 10) ??
                                        '—'}
                                </b>
                            </div>
                        </div>
                        <form
                            id="demand-drawer-form"
                            className="mvp-form section-gap"
                            onSubmit={handleSaveDrawer}
                        >
                            <SelectField
                                label="Loại thành phần"
                                required
                                value={drawerState.draft.demand_type}
                                error={drawerState.errors.demand_type}
                                onChange={(e) =>
                                    setDrawerState({
                                        ...drawerState,
                                        draft: {
                                            ...drawerState.draft,
                                            demand_type: e.target
                                                .value as DemandType,
                                        },
                                    })
                                }
                            >
                                <option value="STANDARD">
                                    Giảng dạy chuẩn
                                </option>
                                <option value="SPECIALIZED_TOPIC">
                                    Chuyên đề lựa chọn
                                </option>
                                <option value="ENRICHMENT">
                                    Tăng cường / hoạt động
                                </option>
                            </SelectField>
                            <InputField
                                label="Số tiết / tuần"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="999.99"
                                required
                                value={drawerState.draft.periods_per_week}
                                error={drawerState.errors.periods_per_week}
                                onChange={(e) =>
                                    setDrawerState({
                                        ...drawerState,
                                        draft: {
                                            ...drawerState.draft,
                                            periods_per_week: e.target.value,
                                        },
                                    })
                                }
                            />
                            <SelectField
                                label="Trạng thái"
                                className="full"
                                required
                                value={drawerState.draft.status}
                                error={drawerState.errors.status}
                                onChange={(e) =>
                                    setDrawerState({
                                        ...drawerState,
                                        draft: {
                                            ...drawerState.draft,
                                            status: e.target
                                                .value as DemandStatus,
                                        },
                                    })
                                }
                            >
                                <option value="ACTIVE">
                                    Hiệu lực (ACTIVE)
                                </option>
                                <option value="INACTIVE">
                                    Tạm ngưng (INACTIVE)
                                </option>
                            </SelectField>
                            <InputField
                                label="Hiệu lực từ ngày"
                                type="date"
                                required
                                value={drawerState.draft.valid_from}
                                error={drawerState.errors.valid_from}
                                onChange={(e) =>
                                    setDrawerState({
                                        ...drawerState,
                                        draft: {
                                            ...drawerState.draft,
                                            valid_from: e.target.value,
                                        },
                                    })
                                }
                            />
                            <InputField
                                label="Hiệu lực đến ngày"
                                type="date"
                                required
                                value={drawerState.draft.valid_to}
                                error={drawerState.errors.valid_to}
                                onChange={(e) =>
                                    setDrawerState({
                                        ...drawerState,
                                        draft: {
                                            ...drawerState.draft,
                                            valid_to: e.target.value,
                                        },
                                    })
                                }
                            />
                            {drawerState.submitError ? (
                                <p className="mvp-error full" role="alert">
                                    {drawerState.submitError}
                                </p>
                            ) : null}
                        </form>
                        <div className="modal-note">
                            Thay đổi số tiết hoặc trạng thái sẽ tự động làm mới
                            token nguồn và kết quả kiểm tra sẵn sàng của đợt
                            liên quan.
                        </div>
                    </>
                ) : null}
            </Drawer>

            <ConfirmDialog
                variant="prototype"
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title="Xác nhận bỏ nhu cầu giảng dạy"
                description="Nhu cầu này sẽ bị xóa khỏi học kỳ. Nếu có thành phần bắt buộc đang liên kết, hệ thống sẽ chuyển demand_id về null để bước tiền kiểm cảnh báo bổ sung lại."
                confirmLabel="Bỏ nhu cầu"
                destructive
                busy={deleteDemandMutation.isPending}
                onConfirm={() => void handleDeleteDemand()}
            />
        </div>
    );
}
