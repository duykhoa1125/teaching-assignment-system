import { Select } from '@/shared/ui/select';
import '@/pages/preparation/preparation-ui.css';
import './catalog-actions.css';
import { useSchoolsQuery } from '@/features/teachers/queries';
import { useMemo, useState, type FormEvent } from 'react';
import {
    buildClassFilters,
    buildGradeFilters,
    buildSubjectFilters,
    CATALOG_PAGE_SIZE,
    CLASS_STATUS_LABELS,
    formatCatalogApiError,
    formatAcademicYearLabel,
    sliceCatalogPage,
    toClassRequest,
    toEducationLevelRequest,
    toGradeRequest,
    toSubjectRequest,
    validateClassForm,
    validateEducationLevelForm,
    validateGradeForm,
    validateSubjectForm,
} from '@/features/catalogs/model';
import {
    useAcademicYearsQuery,
    useClassesQuery,
    useDeleteClassMutation,
    useDeleteEducationLevelMutation,
    useDeleteGradeMutation,
    useDeleteSubjectMutation,
    useEducationLevelsQuery,
    useGradesQuery,
    useSaveClassMutation,
    useSaveEducationLevelMutation,
    useSaveGradeMutation,
    useSaveSubjectMutation,
    useSubjectsQuery,
} from '@/features/catalogs/queries';
import type {
    ClassStatus,
    EducationLevel,
    Grade,
    SchoolClass,
    Subject,
} from '@/features/catalogs/types';
import {
    RolePageHeader,
    RoleStateCard,
    PillBadge,
} from '@/features/session/role-ui';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { InputField, SelectField } from '@/shared/ui/fields';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { DataTable, Pagination, type Column } from '@/shared/ui/table';
import { useToast } from '@/shared/ui/toast-context';

type CatalogTab = 'subjects' | 'classes' | 'grades' | 'levels';

type SubjectDraft = {
    subject_code: string;
    name: string;
    valid_from: string;
    valid_to: string;
};

type ClassDraft = {
    academic_year_id: string;
    grade_id: string;
    class_code: string;
    status: ClassStatus;
};

type GradeDraft = {
    education_level_id: string;
    grade_code: string;
    name: string;
};

type LevelDraft = {
    level_code: string;
    name: string;
};

type DeleteTarget =
    | { kind: 'subject'; row: Subject }
    | { kind: 'class'; row: SchoolClass }
    | { kind: 'grade'; row: Grade }
    | { kind: 'level'; row: EducationLevel };

const EMPTY_SUBJECT_DRAFT: SubjectDraft = {
    subject_code: '',
    name: '',
    valid_from: '2026-08-01',
    valid_to: '',
};

const EMPTY_LEVEL_DRAFT: LevelDraft = {
    level_code: '',
    name: '',
};

export function AdminCatalogsPage() {
    const toast = useToast();
    const [tab, setTab] = useState<CatalogTab>('subjects');

    // Subject filters + pagination
    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjectCodeFilter, setSubjectCodeFilter] = useState('');
    const [subjectAsOf, setSubjectAsOf] = useState('');
    const [subjectOffset, setSubjectOffset] = useState(0);

    // Class filters + pagination
    const [classYearFilter, setClassYearFilter] = useState('');
    const [classGradeFilter, setClassGradeFilter] = useState('');
    const [classStatusFilter, setClassStatusFilter] = useState<
        ClassStatus | ''
    >('');
    const [classOffset, setClassOffset] = useState(0);

    // Grade & level filters/pagination
    const [gradeLevelFilter, setGradeLevelFilter] = useState('');
    const [gradeOffset, setGradeOffset] = useState(0);
    const [levelOffset, setLevelOffset] = useState(0);

    // Shared reference queries
    const yearsQuery = useAcademicYearsQuery({ limit: 100, offset: 0 });
    const allLevelsQuery = useEducationLevelsQuery({ limit: 100, offset: 0 });
    const allGradesQuery = useGradesQuery({ limit: 100, offset: 0 });

    // Tab-specific queries (with +1 lookahead pagination)
    const subjectFilters = useMemo(
        () =>
            buildSubjectFilters({
                q: subjectSearch,
                subjectCode: subjectCodeFilter,
                asOf: subjectAsOf,
                offset: subjectOffset,
                limit: CATALOG_PAGE_SIZE,
            }),
        [subjectSearch, subjectCodeFilter, subjectAsOf, subjectOffset],
    );
    const subjectsQuery = useSubjectsQuery(subjectFilters);

    const classFilters = useMemo(
        () =>
            buildClassFilters({
                academicYearId: classYearFilter
                    ? Number(classYearFilter)
                    : null,
                gradeId: classGradeFilter ? Number(classGradeFilter) : null,
                status: classStatusFilter,
                offset: classOffset,
                limit: CATALOG_PAGE_SIZE,
            }),
        [classYearFilter, classGradeFilter, classStatusFilter, classOffset],
    );
    const classesQuery = useClassesQuery(classFilters);

    const gradeFilters = useMemo(
        () =>
            buildGradeFilters(
                gradeLevelFilter ? Number(gradeLevelFilter) : null,
                gradeOffset,
                CATALOG_PAGE_SIZE,
            ),
        [gradeLevelFilter, gradeOffset],
    );
    const gradesQuery = useGradesQuery(gradeFilters);

    const levelsPageQuery = useEducationLevelsQuery({
        limit: CATALOG_PAGE_SIZE + 1,
        offset: levelOffset,
    });

    // Mutations
    const saveSubjectMutation = useSaveSubjectMutation();
    const deleteSubjectMutation = useDeleteSubjectMutation();
    const saveClassMutation = useSaveClassMutation();
    const deleteClassMutation = useDeleteClassMutation();
    const saveGradeMutation = useSaveGradeMutation();
    const deleteGradeMutation = useDeleteGradeMutation();
    const saveLevelMutation = useSaveEducationLevelMutation();
    const deleteLevelMutation = useDeleteEducationLevelMutation();

    // Form modals state
    const [subjectModal, setSubjectModal] = useState<{
        editing: Subject | null;
        draft: SubjectDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [classModal, setClassModal] = useState<{
        editing: SchoolClass | null;
        draft: ClassDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [gradeModal, setGradeModal] = useState<{
        editing: Grade | null;
        draft: GradeDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [levelModal, setLevelModal] = useState<{
        editing: EducationLevel | null;
        draft: LevelDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const schoolsQuery = useSchoolsQuery();
    const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data]);
    const levels = useMemo(
        () => allLevelsQuery.data ?? [],
        [allLevelsQuery.data],
    );
    const grades = useMemo(
        () => allGradesQuery.data ?? [],
        [allGradesQuery.data],
    );
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

    const levelMap = useMemo(
        () => new Map(levels.map((l) => [l.id, l])),
        [levels],
    );
    const gradeMap = useMemo(
        () => new Map(grades.map((g) => [g.id, g])),
        [grades],
    );

    const subjectsPage = sliceCatalogPage(
        subjectsQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );
    const classesPage = sliceCatalogPage(
        classesQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );
    const gradesPage = sliceCatalogPage(
        gradesQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );
    const levelsPage = sliceCatalogPage(
        levelsPageQuery.data ?? [],
        CATALOG_PAGE_SIZE,
    );

    const openCreateModal = () => {
        if (tab === 'subjects') {
            setSubjectModal({
                editing: null,
                draft: EMPTY_SUBJECT_DRAFT,
                errors: {},
                submitError: null,
            });
            return;
        }
        if (tab === 'classes') {
            setClassModal({
                editing: null,
                draft: {
                    academic_year_id: years[0] ? String(years[0].id) : '',
                    grade_id: grades[0] ? String(grades[0].id) : '',
                    class_code: '',
                    status: 'ACTIVE',
                },
                errors: {},
                submitError: null,
            });
            return;
        }
        if (tab === 'grades') {
            setGradeModal({
                editing: null,
                draft: {
                    education_level_id: levels[0] ? String(levels[0].id) : '',
                    grade_code: '',
                    name: '',
                },
                errors: {},
                submitError: null,
            });
            return;
        }
        setLevelModal({
            editing: null,
            draft: EMPTY_LEVEL_DRAFT,
            errors: {},
            submitError: null,
        });
    };

    const createButtonLabel = {
        subjects: 'Thêm môn học',
        classes: 'Thêm lớp học',
        grades: 'Thêm khối lớp',
        levels: 'Thêm cấp học',
    }[tab];

    const handleSaveSubject = async (event: FormEvent) => {
        event.preventDefault();
        if (!subjectModal) return;
        const errors = validateSubjectForm(subjectModal.draft);
        if (Object.keys(errors).length > 0) {
            setSubjectModal({ ...subjectModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveSubjectMutation.mutateAsync({
                id: subjectModal.editing?.id,
                payload: toSubjectRequest(subjectModal.draft),
            });
            setSubjectModal(null);
            toast({
                title: subjectModal.editing
                    ? `Đã cập nhật môn ${saved.name}`
                    : `Đã thêm môn ${saved.name}`,
                tone: 'success',
            });
        } catch (error) {
            setSubjectModal({
                ...subjectModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleSaveClass = async (event: FormEvent) => {
        event.preventDefault();
        if (!classModal) return;
        const errors = validateClassForm(classModal.draft);
        if (Object.keys(errors).length > 0) {
            setClassModal({ ...classModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveClassMutation.mutateAsync({
                id: classModal.editing?.id,
                payload: toClassRequest(classModal.draft),
            });
            setClassModal(null);
            toast({
                title: classModal.editing
                    ? `Đã cập nhật lớp ${saved.class_code}`
                    : `Đã thêm lớp ${saved.class_code}`,
                tone: 'success',
            });
        } catch (error) {
            setClassModal({
                ...classModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleSaveGrade = async (event: FormEvent) => {
        event.preventDefault();
        if (!gradeModal) return;
        const errors = validateGradeForm(gradeModal.draft);
        if (Object.keys(errors).length > 0) {
            setGradeModal({ ...gradeModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveGradeMutation.mutateAsync({
                id: gradeModal.editing?.id,
                payload: toGradeRequest(gradeModal.draft),
            });
            setGradeModal(null);
            toast({
                title: gradeModal.editing
                    ? `Đã cập nhật ${saved.name}`
                    : `Đã thêm ${saved.name}`,
                tone: 'success',
            });
        } catch (error) {
            setGradeModal({
                ...gradeModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleSaveLevel = async (event: FormEvent) => {
        event.preventDefault();
        if (!levelModal) return;
        const errors = validateEducationLevelForm(levelModal.draft);
        if (Object.keys(errors).length > 0) {
            setLevelModal({ ...levelModal, errors, submitError: null });
            return;
        }
        try {
            const saved = await saveLevelMutation.mutateAsync({
                id: levelModal.editing?.id,
                payload: toEducationLevelRequest(levelModal.draft),
            });
            setLevelModal(null);
            toast({
                title: levelModal.editing
                    ? `Đã cập nhật ${saved.name}`
                    : `Đã thêm ${saved.name}`,
                tone: 'success',
            });
        } catch (error) {
            setLevelModal({
                ...levelModal,
                submitError: formatCatalogApiError(error),
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.kind === 'subject') {
                await deleteSubjectMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa môn ${deleteTarget.row.name}`,
                    tone: 'success',
                });
            } else if (deleteTarget.kind === 'class') {
                await deleteClassMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa lớp ${deleteTarget.row.class_code}`,
                    tone: 'success',
                });
            } else if (deleteTarget.kind === 'grade') {
                await deleteGradeMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa ${deleteTarget.row.name}`,
                    tone: 'success',
                });
            } else {
                await deleteLevelMutation.mutateAsync(deleteTarget.row.id);
                toast({
                    title: `Đã xóa ${deleteTarget.row.name}`,
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

    const subjectColumns: Column<Subject>[] = [
        {
            key: 'code',
            title: 'MÃ',
            render: (row) => <span>{row.subject_code}</span>,
        },
        {
            key: 'name',
            title: 'TÊN',
            render: (row) => <SubjectIdentity name={row.name} />,
        },
        {
            key: 'validity',
            title: 'HIỆU LỰC',
            render: (row) => (
                <span>
                    {row.valid_from}
                    <small>{row.valid_to ?? 'Vô thời hạn'}</small>
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'THAO TÁC',
            align: 'right',
            render: (row) => (
                <div className="catalog-row-actions">
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Sửa môn ${row.name}`}
                        title="Sửa"
                        onClick={() =>
                            setSubjectModal({
                                editing: row,
                                draft: {
                                    subject_code: row.subject_code,
                                    name: row.name,
                                    valid_from: row.valid_from,
                                    valid_to: row.valid_to ?? '',
                                },
                                errors: {},
                                submitError: null,
                            })
                        }
                    >
                        <Icon name="edit" />
                    </button>
                    <button
                        type="button"
                        className="icon-btn catalog-delete-action"
                        aria-label={`Xóa môn ${row.name}`}
                        title="Xóa"
                        onClick={() =>
                            setDeleteTarget({ kind: 'subject', row })
                        }
                    >
                        <Icon name="trash" />
                    </button>
                </div>
            ),
        },
    ];

    const classColumns: Column<SchoolClass>[] = [
        {
            key: 'code',
            title: 'LỚP HỌC',
            render: (row) => (
                <strong className="class-tag">{row.class_code}</strong>
            ),
        },
        {
            key: 'grade',
            title: 'KHỐI LỚP',
            render: (row) =>
                gradeMap.get(row.grade_id)?.name ?? `Khối #${row.grade_id}`,
        },
        {
            key: 'year',
            title: 'NĂM HỌC',
            render: (row) => yearLabel(row.academic_year_id),
        },
        {
            key: 'status',
            title: 'TRẠNG THÁI',
            render: (row) => (
                <PillBadge
                    tone={row.status === 'ACTIVE' ? '' : 'gray'}
                    dot
                    label={CLASS_STATUS_LABELS[row.status]}
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
                        title="Sửa"
                        aria-label="Sửa"
                        className="icon-btn"
                        onClick={() =>
                            setClassModal({
                                editing: row,
                                draft: {
                                    academic_year_id: String(
                                        row.academic_year_id,
                                    ),
                                    grade_id: String(row.grade_id),
                                    class_code: row.class_code,
                                    status: row.status,
                                },
                                errors: {},
                                submitError: null,
                            })
                        }
                    >
                        <Icon name="edit" />
                    </button>
                    <button
                        type="button"
                        title="Xóa"
                        aria-label="Xóa"
                        className="icon-btn catalog-delete-action"
                        onClick={() => setDeleteTarget({ kind: 'class', row })}
                    >
                        <Icon name="trash" />
                    </button>
                </div>
            ),
        },
    ];

    const gradeColumns: Column<Grade>[] = [
        {
            key: 'name',
            title: 'KHỐI LỚP',
            render: (row) => <strong>{row.name}</strong>,
        },
        {
            key: 'code',
            title: 'MÃ KHỐI',
            render: (row) => <code className="mvp-code">{row.grade_code}</code>,
        },
        {
            key: 'level',
            title: 'CẤP HỌC',
            render: (row) =>
                levelMap.get(row.education_level_id)?.name ??
                `#${row.education_level_id}`,
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
                        title="Sửa"
                        aria-label="Sửa"
                        className="icon-btn"
                        onClick={() =>
                            setGradeModal({
                                editing: row,
                                draft: {
                                    education_level_id: String(
                                        row.education_level_id,
                                    ),
                                    grade_code: row.grade_code,
                                    name: row.name,
                                },
                                errors: {},
                                submitError: null,
                            })
                        }
                    >
                        <Icon name="edit" />
                    </button>
                    <button
                        type="button"
                        title="Xóa"
                        aria-label="Xóa"
                        className="icon-btn catalog-delete-action"
                        onClick={() => setDeleteTarget({ kind: 'grade', row })}
                    >
                        <Icon name="trash" />
                    </button>
                </div>
            ),
        },
    ];

    const levelColumns: Column<EducationLevel>[] = [
        {
            key: 'name',
            title: 'TÊN CẤP HỌC',
            render: (row) => <strong>{row.name}</strong>,
        },
        {
            key: 'code',
            title: 'MÃ CẤP HỌC',
            render: (row) => <code className="mvp-code">{row.level_code}</code>,
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
                        title="Sửa"
                        aria-label="Sửa"
                        className="icon-btn"
                        onClick={() =>
                            setLevelModal({
                                editing: row,
                                draft: {
                                    level_code: row.level_code,
                                    name: row.name,
                                },
                                errors: {},
                                submitError: null,
                            })
                        }
                    >
                        <Icon name="edit" />
                    </button>
                    <button
                        type="button"
                        title="Xóa"
                        aria-label="Xóa"
                        className="icon-btn catalog-delete-action"
                        onClick={() => setDeleteTarget({ kind: 'level', row })}
                    >
                        <Icon name="trash" />
                    </button>
                </div>
            ),
        },
    ];

    const activeQuery =
        tab === 'subjects'
            ? subjectsQuery
            : tab === 'classes'
              ? classesQuery
              : tab === 'grades'
                ? gradesQuery
                : levelsPageQuery;

    const deleteBusy =
        deleteSubjectMutation.isPending ||
        deleteClassMutation.isPending ||
        deleteGradeMutation.isPending ||
        deleteLevelMutation.isPending;

    return (
        <div className="admin-overview fe05-page">
            <div className="page-toolbar">
                <RolePageHeader
                    title="Một bộ danh mục nhất quán."
                    description="Mã duy nhất, hiệu lực rõ ràng; ngừng sử dụng thay vì xóa lịch sử."
                    actions={
                        <button
                            type="button"
                            className="btn primary"
                            onClick={openCreateModal}
                        >
                            <Icon name="plus" />
                            {createButtonLabel}
                        </button>
                    }
                />

                <div>
                    <div
                        className="mvp-tabs"
                        role="tablist"
                        aria-label="Nhóm danh mục nền"
                    >
                        {(
                            [
                                ['subjects', 'Môn học'],
                                ['classes', 'Lớp học'],
                                ['grades', 'Khối lớp'],
                                ['levels', 'Cấp học'],
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
            </div>

            {tab === 'subjects' ? (
                <div className="mvp-filter section-gap">
                    <input
                        type="search"
                        aria-label="Tìm môn học"
                        placeholder="Tìm theo tên hoặc mã môn…"
                        value={subjectSearch}
                        onChange={(e) => {
                            setSubjectSearch(e.target.value);
                            setSubjectOffset(0);
                        }}
                    />
                    <input
                        type="text"
                        aria-label="Lọc theo mã môn chính xác"
                        placeholder="Mã môn chính xác (vd: TOAN)"
                        value={subjectCodeFilter}
                        onChange={(e) => {
                            setSubjectCodeFilter(e.target.value);
                            setSubjectOffset(0);
                        }}
                    />
                    <input
                        type="date"
                        aria-label="Hiệu lực tại ngày"
                        value={subjectAsOf}
                        onChange={(e) => {
                            setSubjectAsOf(e.target.value);
                            setSubjectOffset(0);
                        }}
                    />
                    {subjectSearch || subjectCodeFilter || subjectAsOf ? (
                        <button
                            type="button"
                            className="btn small"
                            onClick={() => {
                                setSubjectSearch('');
                                setSubjectCodeFilter('');
                                setSubjectAsOf('');
                                setSubjectOffset(0);
                            }}
                        >
                            Xóa bộ lọc
                        </button>
                    ) : null}
                </div>
            ) : null}

            {tab === 'classes' ? (
                <div className="mvp-filter section-gap">
                    <Select
                        aria-label="Lọc theo năm học"
                        value={classYearFilter}
                        onChange={(e) => {
                            setClassYearFilter(e.target.value);
                            setClassOffset(0);
                        }}
                    >
                        <option value="">Tất cả năm học</option>
                        {years.map((y) => (
                            <option key={y.id} value={y.id}>
                                {yearLabel(y.id)}
                            </option>
                        ))}
                    </Select>
                    <Select
                        aria-label="Lọc theo khối"
                        value={classGradeFilter}
                        onChange={(e) => {
                            setClassGradeFilter(e.target.value);
                            setClassOffset(0);
                        }}
                    >
                        <option value="">Tất cả khối</option>
                        {grades.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </Select>
                    <Select
                        aria-label="Lọc theo trạng thái lớp"
                        value={classStatusFilter}
                        onChange={(e) => {
                            setClassStatusFilter(
                                e.target.value as ClassStatus | '',
                            );
                            setClassOffset(0);
                        }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="INACTIVE">Ngưng sử dụng</option>
                    </Select>
                </div>
            ) : null}

            {tab === 'grades' ? (
                <div className="mvp-filter section-gap">
                    <Select
                        aria-label="Lọc theo cấp học"
                        value={gradeLevelFilter}
                        onChange={(e) => {
                            setGradeLevelFilter(e.target.value);
                            setGradeOffset(0);
                        }}
                    >
                        <option value="">Tất cả cấp học</option>
                        {levels.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                    </Select>
                </div>
            ) : null}

            {activeQuery.isError ? (
                <RoleStateCard
                    kind="error"
                    title="Không tải được dữ liệu danh mục"
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
                    {tab === 'subjects' ? (
                        <>
                            {subjectsQuery.isLoading ||
                            (subjectsQuery.isPlaceholderData &&
                                subjectsPage.items.length === 0) ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh mục môn học"
                                    columns={subjectColumns}
                                    updating={subjectsQuery.isFetching}
                                    rows={[]}
                                    rowKey={() => 0}
                                    loading
                                />
                            ) : subjectsPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh mục môn học"
                                    columns={subjectColumns}
                                    updating={subjectsQuery.isFetching}
                                    rows={subjectsPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind={
                                        subjectSearch ||
                                        subjectCodeFilter ||
                                        subjectAsOf
                                            ? 'search'
                                            : 'empty'
                                    }
                                    title="Chưa có môn học phù hợp"
                                    detail="Thử điều chỉnh từ khóa, ngày hiệu lực hoặc thêm môn học mới."
                                />
                            )}
                            <Pagination
                                offset={subjectOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={subjectsPage.items.length}
                                hasNext={subjectsPage.hasNext}
                                busy={subjectsQuery.isFetching}
                                onPageChange={setSubjectOffset}
                            />
                        </>
                    ) : null}

                    {tab === 'classes' ? (
                        <>
                            {classesQuery.isLoading ||
                            (classesQuery.isPlaceholderData &&
                                classesPage.items.length === 0) ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách lớp học"
                                    columns={classColumns}
                                    updating={classesQuery.isFetching}
                                    rows={[]}
                                    rowKey={() => 0}
                                    loading
                                />
                            ) : classesPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách lớp học"
                                    columns={classColumns}
                                    updating={classesQuery.isFetching}
                                    rows={classesPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có lớp học phù hợp"
                                    detail="Chưa có lớp học nào khớp bộ lọc đang chọn."
                                />
                            )}
                            <Pagination
                                offset={classOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={classesPage.items.length}
                                hasNext={classesPage.hasNext}
                                busy={classesQuery.isFetching}
                                onPageChange={setClassOffset}
                            />
                        </>
                    ) : null}

                    {tab === 'grades' ? (
                        <>
                            {gradesQuery.isLoading ||
                            (gradesQuery.isPlaceholderData &&
                                gradesPage.items.length === 0) ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách khối lớp"
                                    columns={gradeColumns}
                                    updating={gradesQuery.isFetching}
                                    rows={[]}
                                    rowKey={() => 0}
                                    loading
                                />
                            ) : gradesPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách khối lớp"
                                    columns={gradeColumns}
                                    updating={gradesQuery.isFetching}
                                    rows={gradesPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có khối lớp nào"
                                    detail="Thêm khối lớp mới để gắn lớp học và phạm vi môn."
                                />
                            )}
                            <Pagination
                                offset={gradeOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={gradesPage.items.length}
                                hasNext={gradesPage.hasNext}
                                busy={gradesQuery.isFetching}
                                onPageChange={setGradeOffset}
                            />
                        </>
                    ) : null}

                    {tab === 'levels' ? (
                        <>
                            {levelsPageQuery.isLoading ||
                            (levelsPageQuery.isPlaceholderData &&
                                levelsPage.items.length === 0) ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách cấp học"
                                    columns={levelColumns}
                                    updating={levelsPageQuery.isFetching}
                                    rows={[]}
                                    rowKey={() => 0}
                                    loading
                                />
                            ) : levelsPage.items.length > 0 ? (
                                <DataTable
                                    variant="prototype"
                                    caption="Danh sách cấp học"
                                    columns={levelColumns}
                                    updating={levelsPageQuery.isFetching}
                                    rows={levelsPage.items}
                                    rowKey={(row) => row.id}
                                />
                            ) : (
                                <RoleStateCard
                                    kind="empty"
                                    title="Chưa có cấp học nào"
                                    detail="Thêm cấp học mới để tổ chức khối lớp."
                                />
                            )}
                            <Pagination
                                offset={levelOffset}
                                limit={CATALOG_PAGE_SIZE}
                                itemCount={levelsPage.items.length}
                                hasNext={levelsPage.hasNext}
                                busy={levelsPageQuery.isFetching}
                                onPageChange={setLevelOffset}
                            />
                        </>
                    ) : null}
                </section>
            )}

            <Dialog
                variant="prototype"
                open={subjectModal !== null}
                onOpenChange={(open) => {
                    if (!open) setSubjectModal(null);
                }}
                title={
                    subjectModal?.editing
                        ? 'Cập nhật môn học'
                        : 'Thêm môn học mới'
                }
                description="Mã môn học không trùng lặp và có khoảng ngày hiệu lực."
                busy={saveSubjectMutation.isPending}
            >
                {subjectModal ? (
                    <form className="mvp-form" onSubmit={handleSaveSubject}>
                        <InputField
                            label="Mã môn học"
                            required
                            value={subjectModal.draft.subject_code}
                            error={subjectModal.errors.subject_code}
                            onChange={(e) =>
                                setSubjectModal({
                                    ...subjectModal,
                                    draft: {
                                        ...subjectModal.draft,
                                        subject_code: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Tên môn học"
                            required
                            value={subjectModal.draft.name}
                            error={subjectModal.errors.name}
                            onChange={(e) =>
                                setSubjectModal({
                                    ...subjectModal,
                                    draft: {
                                        ...subjectModal.draft,
                                        name: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Hiệu lực từ ngày"
                            type="date"
                            required
                            value={subjectModal.draft.valid_from}
                            error={subjectModal.errors.valid_from}
                            onChange={(e) =>
                                setSubjectModal({
                                    ...subjectModal,
                                    draft: {
                                        ...subjectModal.draft,
                                        valid_from: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Hiệu lực đến ngày (bỏ trống nếu còn dùng)"
                            type="date"
                            value={subjectModal.draft.valid_to}
                            error={subjectModal.errors.valid_to}
                            onChange={(e) =>
                                setSubjectModal({
                                    ...subjectModal,
                                    draft: {
                                        ...subjectModal.draft,
                                        valid_to: e.target.value,
                                    },
                                })
                            }
                        />
                        {subjectModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {subjectModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveSubjectMutation.isPending}
                                onClick={() => setSubjectModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveSubjectMutation.isPending}
                            >
                                {saveSubjectMutation.isPending
                                    ? 'Đang lưu…'
                                    : 'Lưu môn học'}
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            <Dialog
                variant="prototype"
                open={classModal !== null}
                onOpenChange={(open) => {
                    if (!open) setClassModal(null);
                }}
                title={
                    classModal?.editing
                        ? 'Cập nhật lớp học'
                        : 'Thêm lớp học mới'
                }
                description="Mã lớp học là duy nhất trong cùng một năm học."
                busy={saveClassMutation.isPending}
            >
                {classModal ? (
                    <form className="mvp-form" onSubmit={handleSaveClass}>
                        <SelectField
                            label="Năm học"
                            required
                            value={classModal.draft.academic_year_id}
                            error={classModal.errors.academic_year_id}
                            onChange={(e) =>
                                setClassModal({
                                    ...classModal,
                                    draft: {
                                        ...classModal.draft,
                                        academic_year_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn năm học…</option>
                            {years.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {yearLabel(y.id)}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Khối lớp"
                            required
                            value={classModal.draft.grade_id}
                            error={classModal.errors.grade_id}
                            onChange={(e) =>
                                setClassModal({
                                    ...classModal,
                                    draft: {
                                        ...classModal.draft,
                                        grade_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn khối…</option>
                            {grades.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </SelectField>
                        <InputField
                            label="Tên / Mã lớp"
                            required
                            value={classModal.draft.class_code}
                            error={classModal.errors.class_code}
                            onChange={(e) =>
                                setClassModal({
                                    ...classModal,
                                    draft: {
                                        ...classModal.draft,
                                        class_code: e.target.value,
                                    },
                                })
                            }
                        />
                        <SelectField
                            label="Trạng thái"
                            required
                            value={classModal.draft.status}
                            error={classModal.errors.status}
                            onChange={(e) =>
                                setClassModal({
                                    ...classModal,
                                    draft: {
                                        ...classModal.draft,
                                        status: e.target.value as ClassStatus,
                                    },
                                })
                            }
                        >
                            <option value="ACTIVE">
                                Đang hoạt động (ACTIVE)
                            </option>
                            <option value="INACTIVE">
                                Ngưng sử dụng (INACTIVE)
                            </option>
                        </SelectField>
                        {classModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {classModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveClassMutation.isPending}
                                onClick={() => setClassModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveClassMutation.isPending}
                            >
                                {saveClassMutation.isPending
                                    ? 'Đang lưu…'
                                    : 'Lưu lớp học'}
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            <Dialog
                variant="prototype"
                open={gradeModal !== null}
                onOpenChange={(open) => {
                    if (!open) setGradeModal(null);
                }}
                title={
                    gradeModal?.editing ? 'Cập nhật khối lớp' : 'Thêm khối lớp'
                }
                busy={saveGradeMutation.isPending}
            >
                {gradeModal ? (
                    <form className="mvp-form" onSubmit={handleSaveGrade}>
                        <SelectField
                            label="Cấp học"
                            required
                            value={gradeModal.draft.education_level_id}
                            error={gradeModal.errors.education_level_id}
                            onChange={(e) =>
                                setGradeModal({
                                    ...gradeModal,
                                    draft: {
                                        ...gradeModal.draft,
                                        education_level_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn cấp học…</option>
                            {levels.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                </option>
                            ))}
                        </SelectField>
                        <InputField
                            label="Mã khối"
                            required
                            value={gradeModal.draft.grade_code}
                            error={gradeModal.errors.grade_code}
                            onChange={(e) =>
                                setGradeModal({
                                    ...gradeModal,
                                    draft: {
                                        ...gradeModal.draft,
                                        grade_code: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Tên khối"
                            className="full"
                            required
                            value={gradeModal.draft.name}
                            error={gradeModal.errors.name}
                            onChange={(e) =>
                                setGradeModal({
                                    ...gradeModal,
                                    draft: {
                                        ...gradeModal.draft,
                                        name: e.target.value,
                                    },
                                })
                            }
                        />
                        {gradeModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {gradeModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveGradeMutation.isPending}
                                onClick={() => setGradeModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveGradeMutation.isPending}
                            >
                                Lưu khối lớp
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            <Dialog
                variant="prototype"
                open={levelModal !== null}
                onOpenChange={(open) => {
                    if (!open) setLevelModal(null);
                }}
                title={
                    levelModal?.editing ? 'Cập nhật cấp học' : 'Thêm cấp học'
                }
                busy={saveLevelMutation.isPending}
            >
                {levelModal ? (
                    <form className="mvp-form" onSubmit={handleSaveLevel}>
                        <InputField
                            label="Mã cấp học"
                            required
                            value={levelModal.draft.level_code}
                            error={levelModal.errors.level_code}
                            onChange={(e) =>
                                setLevelModal({
                                    ...levelModal,
                                    draft: {
                                        ...levelModal.draft,
                                        level_code: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Tên cấp học"
                            required
                            value={levelModal.draft.name}
                            error={levelModal.errors.name}
                            onChange={(e) =>
                                setLevelModal({
                                    ...levelModal,
                                    draft: {
                                        ...levelModal.draft,
                                        name: e.target.value,
                                    },
                                })
                            }
                        />
                        {levelModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {levelModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                disabled={saveLevelMutation.isPending}
                                onClick={() => setLevelModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveLevelMutation.isPending}
                            >
                                Lưu cấp học
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
                title="Xác nhận xóa bản ghi danh mục"
                description="Nếu bản ghi đang được tham chiếu bởi dữ liệu giảng dạy hoặc phạm vi đợt, hệ thống sẽ từ chối xóa cứng (409) và bạn nên chuyển trạng thái hoặc cập nhật hiệu lực."
                confirmLabel="Xác nhận xóa"
                destructive
                busy={deleteBusy}
                onConfirm={() => void handleConfirmDelete()}
            />
        </div>
    );
}
