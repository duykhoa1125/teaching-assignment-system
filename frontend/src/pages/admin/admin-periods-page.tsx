import '@/pages/preparation/preparation-ui.css';
import { useSchoolsQuery } from '@/features/teachers/queries';
import { useMemo, useState, type FormEvent } from 'react';
import {
    buildRoundFilters,
    buildSemesterFilters,
    CATALOG_PAGE_SIZE,
    formatCatalogApiError,
    formatAcademicYearLabel,
    ROUND_STATUS_LABELS,
    sliceCatalogPage,
    toAcademicYearRequest,
    toAssignmentRoundRequest,
    toSemesterRequest,
    validateAcademicYearForm,
    validateAssignmentRoundForm,
    validateSemesterForm,
} from '@/features/catalogs/model';
import {
    useAcademicYearsQuery,
    useAssignmentRoundsQuery,
    useDeleteAcademicYearMutation,
    useDeleteAssignmentRoundMutation,
    useDeleteSemesterMutation,
    useSaveAcademicYearMutation,
    useSaveAssignmentRoundMutation,
    useSaveSemesterMutation,
    useSemestersQuery,
} from '@/features/catalogs/queries';
import type {
    AcademicYear,
    AssignmentRound,
    AssignmentRoundStatus,
    Semester,
} from '@/features/catalogs/types';
import { useRoundSelection } from '@/features/preparation/round-context';
import {
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { InputField, SelectField } from '@/shared/ui/fields';
import { Icon } from '@/shared/ui/icon';
import { DataTable, Pagination, type Column } from '@/shared/ui/table';
import { useToast } from '@/shared/ui/toast-context';

type PeriodTab = 'rounds' | 'semesters' | 'years';

type RoundDraft = {
    semester_id: string;
    round_code: string;
    status: AssignmentRoundStatus;
    opens_at: string;
    closes_at: string;
};

type SemesterDraft = {
    academic_year_id: string;
    semester_no: string;
    starts_on: string;
    ends_on: string;
};

type YearDraft = {
    school_id: string;
    year_code: string;
    starts_on: string;
    ends_on: string;
};

type DeleteTarget =
    | { kind: 'round'; row: AssignmentRound }
    | { kind: 'semester'; row: Semester }
    | { kind: 'year'; row: AcademicYear };

export function AdminPeriodsPage() {
    const toast = useToast();
    const { contextId, activeContext } = useSession();
    const [tab, setTab] = useState<PeriodTab>('rounds');

    const [roundSemesterFilter, setRoundSemesterFilter] = useState('');
    const [roundStatusFilter, setRoundStatusFilter] = useState<
        AssignmentRoundStatus | ''
    >('');
    const [roundOffset, setRoundOffset] = useState(0);

    const [semesterYearFilter, setSemesterYearFilter] = useState('');
    const [semesterOffset, setSemesterOffset] = useState(0);
    const [yearOffset, setYearOffset] = useState(0);

    const allYearsQuery = useAcademicYearsQuery({ limit: 100, offset: 0 });
    const allSemestersQuery = useSemestersQuery({ limit: 100, offset: 0 });
    const allRoundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });

    const roundFilters = useMemo(
        () =>
            buildRoundFilters({
                semesterId: roundSemesterFilter
                    ? Number(roundSemesterFilter)
                    : null,
                status: roundStatusFilter,
                offset: roundOffset,
                limit: CATALOG_PAGE_SIZE,
            }),
        [roundSemesterFilter, roundStatusFilter, roundOffset],
    );
    const roundsQuery = useAssignmentRoundsQuery(roundFilters);

    const semesterFilters = useMemo(
        () =>
            buildSemesterFilters(
                semesterYearFilter ? Number(semesterYearFilter) : null,
                semesterOffset,
                CATALOG_PAGE_SIZE,
            ),
        [semesterYearFilter, semesterOffset],
    );
    const semestersPageQuery = useSemestersQuery(semesterFilters);

    const yearsPageQuery = useAcademicYearsQuery({
        limit: CATALOG_PAGE_SIZE + 1,
        offset: yearOffset,
    });

    const saveRoundMutation = useSaveAssignmentRoundMutation();
    const deleteRoundMutation = useDeleteAssignmentRoundMutation();
    const saveSemesterMutation = useSaveSemesterMutation();
    const deleteSemesterMutation = useDeleteSemesterMutation();
    const saveYearMutation = useSaveAcademicYearMutation();
    const deleteYearMutation = useDeleteAcademicYearMutation();

    const [roundModal, setRoundModal] = useState<{
        editing: AssignmentRound | null;
        draft: RoundDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [semesterModal, setSemesterModal] = useState<{
        editing: Semester | null;
        draft: SemesterDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [yearModal, setYearModal] = useState<{
        editing: AcademicYear | null;
        draft: YearDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const schoolsQuery = useSchoolsQuery();
    const years = useMemo(() => allYearsQuery.data ?? [], [allYearsQuery.data]);
    const semesters = useMemo(
        () => allSemestersQuery.data ?? [],
        [allSemestersQuery.data],
    );
    const rounds = allRoundsQuery.data ?? [];
    const yearMap = useMemo(
        () => new Map(years.map((y) => [y.id, y])),
        [years],
    );
    const schoolNames = new Map(
        (schoolsQuery.data ?? []).map((school) => [school.id, school.name]),
    );
    const yearLabel = (id: number) => {
        const year = yearMap.get(id);
        return year
            ? formatAcademicYearLabel(year, schoolNames.get(year.school_id))
            : `Năm học #${id}`;
    };

    const semesterMap = useMemo(
        () => new Map(semesters.map((s) => [s.id, s])),
        [semesters],
    );

    const { activeRound } = useRoundSelection(
        rounds,
        contextId,
        activeContext?.round,
    );

    const roundsPage = sliceCatalogPage(
        roundsQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );
    const semestersPage = sliceCatalogPage(
        semestersPageQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );
    const yearsPage = sliceCatalogPage(
        yearsPageQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );

    const openCreateModal = () => {
        if (tab === 'rounds') {
            setRoundModal({
                editing: null,
                draft: {
                    semester_id: semesters[0] ? String(semesters[0].id) : '',
                    round_code: '',
                    status: 'DRAFT',
                    opens_at: '',
                    closes_at: '',
                },
                errors: {},
                submitError: null,
            });
            return;
        }
        if (tab === 'semesters') {
            setSemesterModal({
                editing: null,
                draft: {
                    academic_year_id: years[0] ? String(years[0].id) : '',
                    semester_no: '1',
                    starts_on: '2026-08-01',
                    ends_on: '2026-12-31',
                },
                errors: {},
                submitError: null,
            });
            return;
        }
        setYearModal({
            editing: null,
            draft: {
                school_id: '1',
                year_code: '',
                starts_on: '2027-08-01',
                ends_on: '2028-05-31',
            },
            errors: {},
            submitError: null,
        });
    };

    const handleSaveRound = async (event: FormEvent) => {
        event.preventDefault();
        if (!roundModal) return;
        const errors = validateAssignmentRoundForm(roundModal.draft);
        if (Object.keys(errors).length > 0) {
            setRoundModal({ ...roundModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveRoundMutation.mutateAsync({
                id: roundModal.editing?.id,
                payload: toAssignmentRoundRequest({
                    ...roundModal.draft,
                    scope_confirmed_by:
                        roundModal.editing?.scope_confirmed_by ?? null,
                    scope_confirmed_at:
                        roundModal.editing?.scope_confirmed_at ?? null,
                }),
            });
            setRoundModal(null);
            toast({
                title: roundModal.editing
                    ? `Đã cập nhật đợt ${saved.round_code}`
                    : `Đã tạo đợt ${saved.round_code}`,
                tone: 'success',
            });
        } catch (error) {
            setRoundModal({
                ...roundModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleSaveSemester = async (event: FormEvent) => {
        event.preventDefault();
        if (!semesterModal) return;
        const errors = validateSemesterForm(semesterModal.draft);
        if (Object.keys(errors).length > 0) {
            setSemesterModal({ ...semesterModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveSemesterMutation.mutateAsync({
                id: semesterModal.editing?.id,
                payload: toSemesterRequest(semesterModal.draft),
            });
            setSemesterModal(null);
            toast({
                title: semesterModal.editing
                    ? `Đã cập nhật Học kỳ ${saved.semester_no}`
                    : `Đã thêm Học kỳ ${saved.semester_no}`,
                tone: 'success',
            });
        } catch (error) {
            setSemesterModal({
                ...semesterModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleSaveYear = async (event: FormEvent) => {
        event.preventDefault();
        if (!yearModal) return;
        const errors = validateAcademicYearForm(yearModal.draft);
        if (Object.keys(errors).length > 0) {
            setYearModal({ ...yearModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveYearMutation.mutateAsync({
                id: yearModal.editing?.id,
                payload: toAcademicYearRequest(yearModal.draft),
            });
            setYearModal(null);
            toast({
                title: yearModal.editing
                    ? `Đã cập nhật năm học ${saved.year_code}`
                    : `Đã thêm năm học ${saved.year_code}`,
                tone: 'success',
            });
        } catch (error) {
            setYearModal({
                ...yearModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.kind === 'round') {
                await deleteRoundMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa đợt ${deleteTarget.row.round_code}`,
                    tone: 'success',
                });
            } else if (deleteTarget.kind === 'semester') {
                await deleteSemesterMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa Học kỳ ${deleteTarget.row.semester_no}`,
                    tone: 'success',
                });
            } else {
                await deleteYearMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa năm học ${deleteTarget.row.year_code}`,
                    tone: 'success',
                });
            }
            setDeleteTarget(null);
        } catch (error) {
            setDeleteTarget(null);
            toast({
                title: 'Không thể xóa bản ghi',
                description: formatCatalogApiError(error),
                tone: 'error',
            });
        }
    };

    const roundTone = (status: AssignmentRoundStatus) => {
        if (status === 'ACTIVE') return '';
        if (status === 'DRAFT') return 'amber';
        return 'gray';
    };

    const roundColumns: Column<AssignmentRound>[] = [
        {
            key: 'code',
            title: 'ĐỢT PHÂN CÔNG',
            render: (row) => (
                <div>
                    <strong>{row.round_code}</strong>
                    {activeRound?.id === row.id ? (
                        <span
                            className="muted"
                            style={{ marginLeft: 8, fontSize: 11 }}
                        >
                            Đang chọn
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'semester',
            title: 'HỌC KỲ / NĂM',
            render: (row) => {
                const sem = semesterMap.get(row.semester_id);
                const yr = sem ? yearMap.get(sem.academic_year_id) : undefined;
                return sem
                    ? `HK${sem.semester_no} · ${yr ? yearLabel(yr.id) : ''} (${sem.starts_on} → ${sem.ends_on})`
                    : `Học kỳ #${row.semester_id}`;
            },
        },
        {
            key: 'status',
            title: 'TRẠNG THÁI',
            render: (row) => (
                <PillBadge
                    tone={roundTone(row.status)}
                    dot
                    label={ROUND_STATUS_LABELS[row.status]}
                />
            ),
        },
        {
            key: 'scope',
            title: 'PHẠM VI',
            render: (row) => (
                <PillBadge
                    tone={row.scope_confirmed_at ? '' : 'amber'}
                    label={
                        row.scope_confirmed_at ? 'Đã xác nhận' : 'Chưa xác nhận'
                    }
                />
            ),
        },
        {
            key: 'revision',
            title: 'SOURCE TOKEN',
            render: (row) => (
                <span className="stack">
                    <code className="mvp-code">
                        {row.source_revision_token ?? 'Chưa phát sinh'}
                    </code>
                    <small className="muted">
                        Cập nhật:{' '}
                        {row.source_updated_at ? (
                            <time dateTime={row.source_updated_at}>
                                {new Intl.DateTimeFormat('vi-VN', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                }).format(new Date(row.source_updated_at))}
                            </time>
                        ) : (
                            'Chưa cập nhật'
                        )}
                    </small>
                </span>
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
                            setRoundModal({
                                editing: row,
                                draft: {
                                    semester_id: String(row.semester_id),
                                    round_code: row.round_code,
                                    status: row.status,
                                    opens_at: row.opens_at ?? '',
                                    closes_at: row.closes_at ?? '',
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
                        onClick={() => setDeleteTarget({ kind: 'round', row })}
                    >
                        Xóa
                    </button>
                </div>
            ),
        },
    ];

    const semesterColumns: Column<Semester>[] = [
        {
            key: 'no',
            title: 'HỌC KỲ',
            render: (row) => <strong>Học kỳ {row.semester_no}</strong>,
        },
        {
            key: 'year',
            title: 'NĂM HỌC',
            render: (row) => yearLabel(row.academic_year_id),
        },
        {
            key: 'range',
            title: 'KHOẢNG THỜI GIAN',
            render: (row) => `${row.starts_on} → ${row.ends_on}`,
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
                            setSemesterModal({
                                editing: row,
                                draft: {
                                    academic_year_id: String(
                                        row.academic_year_id,
                                    ),
                                    semester_no: String(row.semester_no),
                                    starts_on: row.starts_on,
                                    ends_on: row.ends_on,
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
                            setDeleteTarget({ kind: 'semester', row })
                        }
                    >
                        Xóa
                    </button>
                </div>
            ),
        },
    ];

    const yearColumns: Column<AcademicYear>[] = [
        {
            key: 'code',
            title: 'NĂM HỌC',
            render: (row) => <strong>{row.year_code}</strong>,
        },
        {
            key: 'school',
            title: 'ĐƠN VỊ',
            render: (row) =>
                schoolNames.get(row.school_id) ?? `Trường #${row.school_id}`,
        },
        {
            key: 'range',
            title: 'KHOẢNG THỜI GIAN',
            render: (row) => `${row.starts_on} → ${row.ends_on}`,
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
                            setYearModal({
                                editing: row,
                                draft: {
                                    school_id: String(row.school_id),
                                    year_code: row.year_code,
                                    starts_on: row.starts_on,
                                    ends_on: row.ends_on,
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
                        onClick={() => setDeleteTarget({ kind: 'year', row })}
                    >
                        Xóa
                    </button>
                </div>
            ),
        },
    ];

    const activeQuery =
        tab === 'rounds'
            ? roundsQuery
            : tab === 'semesters'
              ? semestersPageQuery
              : yearsPageQuery;

    return (
        <div className="admin-overview fe05-page">
            <RolePageHeader
                title="Thời gian là một phần của dữ liệu."
                description="Năm học, học kỳ, đợt và bộ quy tắc được ghi nhận cùng nhau."
                actions={
                    <div className="mvp-actions">
                        <button
                            type="button"
                            className="btn primary"
                            onClick={openCreateModal}
                        >
                            <Icon name="plus" />
                            {tab === 'rounds'
                                ? 'Thêm đợt phân công'
                                : tab === 'semesters'
                                  ? 'Thêm học kỳ'
                                  : 'Thêm năm học'}
                        </button>
                    </div>
                }
            />

            <div>
                <div
                    className="mvp-tabs"
                    role="tablist"
                    aria-label="Nhóm mốc thời gian"
                >
                    {(
                        [
                            ['rounds', 'Đợt phân công'],
                            ['semesters', 'Học kỳ'],
                            ['years', 'Năm học'],
                        ] as const
                    ).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            className={tab === id ? 'active' : ''}
                            onClick={() => setTab(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'rounds' ? (
                <div className="mvp-filter section-gap">
                    <select
                        aria-label="Lọc theo học kỳ"
                        value={roundSemesterFilter}
                        onChange={(e) => {
                            setRoundSemesterFilter(e.target.value);
                            setRoundOffset(0);
                        }}
                    >
                        <option value="">Tất cả học kỳ</option>
                        {semesters.map((s) => (
                            <option key={s.id} value={s.id}>
                                HK{s.semester_no} ·{' '}
                                {yearLabel(s.academic_year_id)}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Lọc theo trạng thái đợt"
                        value={roundStatusFilter}
                        onChange={(e) => {
                            setRoundStatusFilter(
                                e.target.value as AssignmentRoundStatus | '',
                            );
                            setRoundOffset(0);
                        }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Bản nháp (DRAFT)</option>
                        <option value="ACTIVE">Đang mở (ACTIVE)</option>
                        <option value="CLOSED">Đã đóng (CLOSED)</option>
                        <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                    </select>
                </div>
            ) : null}

            {tab === 'semesters' ? (
                <div className="mvp-filter section-gap">
                    <select
                        aria-label="Lọc theo năm học"
                        value={semesterYearFilter}
                        onChange={(e) => {
                            setSemesterYearFilter(e.target.value);
                            setSemesterOffset(0);
                        }}
                    >
                        <option value="">Tất cả năm học</option>
                        {years.map((y) => (
                            <option key={y.id} value={y.id}>
                                {yearLabel(y.id)}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}

            {activeQuery.isError ? (
                <RoleStateCard
                    kind="error"
                    title="Không tải được dữ liệu chu kỳ thời gian"
                    detail={formatCatalogApiError(activeQuery.error)}
                    actions={
                        <button
                            type="button"
                            className="btn small"
                            onClick={() => void activeQuery.refetch()}
                        >
                            Thử lại
                        </button>
                    }
                />
            ) : (
                <section className="panel">
                    {tab === 'rounds' ? (
                        <>
                            {roundsQuery.isLoading ? (
                                <RoleStateCard
                                    kind="loading"
                                    title="Đang tải danh sách đợt phân công…"
                                    detail="Đang đọc dữ liệu đợt phân công."
                                />
                            ) : roundsPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách đợt phân công"
                                    columns={roundColumns}
                                    rows={roundsPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có đợt phân công nào"
                                    detail="Tạo đợt phân công mới để bắt đầu chuẩn bị dữ liệu."
                                />
                            )}
                            <Pagination
                                offset={roundOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={roundsPage.items.length}
                                hasNext={roundsPage.hasNext}
                                busy={roundsQuery.isFetching}
                                onPageChange={setRoundOffset}
                            />
                        </>
                    ) : null}

                    {tab === 'semesters' ? (
                        <>
                            {semestersPageQuery.isLoading ? (
                                <RoleStateCard
                                    kind="loading"
                                    title="Đang tải danh sách học kỳ…"
                                    detail="Đang đọc dữ liệu học kỳ."
                                />
                            ) : semestersPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách học kỳ"
                                    columns={semesterColumns}
                                    rows={semestersPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có học kỳ nào"
                                    detail="Thêm học kỳ trong năm học để gắn đợt phân công."
                                />
                            )}
                            <Pagination
                                offset={semesterOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={semestersPage.items.length}
                                hasNext={semestersPage.hasNext}
                                busy={semestersPageQuery.isFetching}
                                onPageChange={setSemesterOffset}
                            />
                        </>
                    ) : null}

                    {tab === 'years' ? (
                        <>
                            {yearsPageQuery.isLoading ? (
                                <RoleStateCard
                                    kind="loading"
                                    title="Đang tải danh sách năm học…"
                                    detail="Đang đọc dữ liệu năm học."
                                />
                            ) : yearsPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách năm học"
                                    columns={yearColumns}
                                    rows={yearsPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có năm học nào"
                                    detail="Thêm năm học mới cho nhà trường."
                                />
                            )}
                            <Pagination
                                offset={yearOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={yearsPage.items.length}
                                hasNext={yearsPage.hasNext}
                                busy={yearsPageQuery.isFetching}
                                onPageChange={setYearOffset}
                            />
                        </>
                    ) : null}
                </section>
            )}

            <Dialog
                variant="prototype"
                open={roundModal !== null}
                onOpenChange={(open) => {
                    if (!open) setRoundModal(null);
                }}
                title={
                    roundModal?.editing
                        ? 'Cập nhật đợt phân công'
                        : 'Tạo đợt phân công'
                }
                description="Mã đợt phân công là duy nhất trong cùng học kỳ. source_revision_token chỉ đọc từ backend."
                busy={saveRoundMutation.isPending}
            >
                {roundModal ? (
                    <form className="mvp-form" onSubmit={handleSaveRound}>
                        <SelectField
                            label="Học kỳ"
                            required
                            value={roundModal.draft.semester_id}
                            error={roundModal.errors.semester_id}
                            onChange={(e) =>
                                setRoundModal({
                                    ...roundModal,
                                    draft: {
                                        ...roundModal.draft,
                                        semester_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn học kỳ…</option>
                            {semesters.map((s) => (
                                <option key={s.id} value={s.id}>
                                    HK{s.semester_no} ·{' '}
                                    {yearLabel(s.academic_year_id)}
                                </option>
                            ))}
                        </SelectField>
                        <InputField
                            label="Mã đợt phân công"
                            required
                            value={roundModal.draft.round_code}
                            error={roundModal.errors.round_code}
                            onChange={(e) =>
                                setRoundModal({
                                    ...roundModal,
                                    draft: {
                                        ...roundModal.draft,
                                        round_code: e.target.value,
                                    },
                                })
                            }
                        />
                        <SelectField
                            label="Trạng thái"
                            required
                            value={roundModal.draft.status}
                            error={roundModal.errors.status}
                            onChange={(e) =>
                                setRoundModal({
                                    ...roundModal,
                                    draft: {
                                        ...roundModal.draft,
                                        status: e.target
                                            .value as AssignmentRoundStatus,
                                    },
                                })
                            }
                        >
                            <option value="DRAFT">Bản nháp (DRAFT)</option>
                            <option value="ACTIVE">Đang mở (ACTIVE)</option>
                            <option value="CLOSED">Đã đóng (CLOSED)</option>
                            <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                        </SelectField>
                        <InputField
                            label="Mở đợt lúc (ISO-8601, tùy chọn)"
                            placeholder="2026-08-01T08:00:00Z"
                            value={roundModal.draft.opens_at}
                            error={roundModal.errors.opens_at}
                            onChange={(e) =>
                                setRoundModal({
                                    ...roundModal,
                                    draft: {
                                        ...roundModal.draft,
                                        opens_at: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Đóng đợt lúc (ISO-8601, tùy chọn)"
                            className="full"
                            placeholder="2026-08-25T17:00:00Z"
                            value={roundModal.draft.closes_at}
                            error={roundModal.errors.closes_at}
                            onChange={(e) =>
                                setRoundModal({
                                    ...roundModal,
                                    draft: {
                                        ...roundModal.draft,
                                        closes_at: e.target.value,
                                    },
                                })
                            }
                        />
                        <div className="mvp-note full">
                            {roundModal.editing?.source_revision_token
                                ? `Source revision hiện tại: ${roundModal.editing.source_revision_token}. Token sẽ tự động cập nhật khi dữ liệu chuẩn bị thay đổi.`
                                : 'Token nguồn và dấu xác nhận phạm vi được quản lý tự động theo luồng chuẩn bị.'}
                        </div>
                        {roundModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {roundModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveRoundMutation.isPending}
                                onClick={() => setRoundModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveRoundMutation.isPending}
                            >
                                Lưu đợt phân công
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            <Dialog
                variant="prototype"
                open={semesterModal !== null}
                onOpenChange={(open) => {
                    if (!open) setSemesterModal(null);
                }}
                title={
                    semesterModal?.editing ? 'Cập nhật học kỳ' : 'Thêm học kỳ'
                }
                description="Ngày học kỳ phải nằm trong năm học và không chồng lấn học kỳ khác."
                busy={saveSemesterMutation.isPending}
            >
                {semesterModal ? (
                    <form className="mvp-form" onSubmit={handleSaveSemester}>
                        <SelectField
                            label="Năm học"
                            required
                            value={semesterModal.draft.academic_year_id}
                            error={semesterModal.errors.academic_year_id}
                            onChange={(e) =>
                                setSemesterModal({
                                    ...semesterModal,
                                    draft: {
                                        ...semesterModal.draft,
                                        academic_year_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn năm học…</option>
                            {years.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {yearLabel(y.id)} ({y.starts_on} →{' '}
                                    {y.ends_on})
                                </option>
                            ))}
                        </SelectField>
                        <InputField
                            label="Số thứ tự học kỳ"
                            type="number"
                            min={1}
                            max={4}
                            required
                            value={semesterModal.draft.semester_no}
                            error={semesterModal.errors.semester_no}
                            onChange={(e) =>
                                setSemesterModal({
                                    ...semesterModal,
                                    draft: {
                                        ...semesterModal.draft,
                                        semester_no: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Ngày bắt đầu"
                            type="date"
                            required
                            value={semesterModal.draft.starts_on}
                            error={semesterModal.errors.starts_on}
                            onChange={(e) =>
                                setSemesterModal({
                                    ...semesterModal,
                                    draft: {
                                        ...semesterModal.draft,
                                        starts_on: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Ngày kết thúc"
                            type="date"
                            required
                            value={semesterModal.draft.ends_on}
                            error={semesterModal.errors.ends_on}
                            onChange={(e) =>
                                setSemesterModal({
                                    ...semesterModal,
                                    draft: {
                                        ...semesterModal.draft,
                                        ends_on: e.target.value,
                                    },
                                })
                            }
                        />
                        {semesterModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {semesterModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveSemesterMutation.isPending}
                                onClick={() => setSemesterModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveSemesterMutation.isPending}
                            >
                                Lưu học kỳ
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            <Dialog
                variant="prototype"
                open={yearModal !== null}
                onOpenChange={(open) => {
                    if (!open) setYearModal(null);
                }}
                title={yearModal?.editing ? 'Cập nhật năm học' : 'Thêm năm học'}
                description="Không được chồng lấn ngày hiệu lực với năm học khác cùng trường."
                busy={saveYearMutation.isPending}
            >
                {yearModal ? (
                    <form className="mvp-form" onSubmit={handleSaveYear}>
                        <InputField
                            label="Mã năm học"
                            required
                            placeholder="2027-2028"
                            value={yearModal.draft.year_code}
                            error={yearModal.errors.year_code}
                            onChange={(e) =>
                                setYearModal({
                                    ...yearModal,
                                    draft: {
                                        ...yearModal.draft,
                                        year_code: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="ID trường"
                            type="number"
                            min={1}
                            required
                            value={yearModal.draft.school_id}
                            error={yearModal.errors.school_id}
                            onChange={(e) =>
                                setYearModal({
                                    ...yearModal,
                                    draft: {
                                        ...yearModal.draft,
                                        school_id: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Ngày bắt đầu"
                            type="date"
                            required
                            value={yearModal.draft.starts_on}
                            error={yearModal.errors.starts_on}
                            onChange={(e) =>
                                setYearModal({
                                    ...yearModal,
                                    draft: {
                                        ...yearModal.draft,
                                        starts_on: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Ngày kết thúc"
                            type="date"
                            required
                            value={yearModal.draft.ends_on}
                            error={yearModal.errors.ends_on}
                            onChange={(e) =>
                                setYearModal({
                                    ...yearModal,
                                    draft: {
                                        ...yearModal.draft,
                                        ends_on: e.target.value,
                                    },
                                })
                            }
                        />
                        {yearModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {yearModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveYearMutation.isPending}
                                onClick={() => setYearModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveYearMutation.isPending}
                            >
                                Lưu năm học
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            <ConfirmDialog
                variant="prototype"
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title="Xác nhận xóa bản ghi thời gian"
                description="Nếu đợt phân công, học kỳ hoặc năm học đã có dữ liệu phụ thuộc (lớp học, phạm vi, nhu cầu), hệ thống sẽ chặn xóa cứng với lỗi 409."
                confirmLabel="Xác nhận xóa"
                destructive
                busy={
                    deleteRoundMutation.isPending ||
                    deleteSemesterMutation.isPending ||
                    deleteYearMutation.isPending
                }
                onConfirm={() => void handleConfirmDelete()}
            />
        </div>
    );
}
