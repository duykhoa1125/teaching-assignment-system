import { ReadinessIssue } from '@/features/preparation/readiness-issue';
import '@/pages/preparation/preparation-ui.css';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
    useAssignmentRoundsQuery,
    useClassesQuery,
    useGradesQuery,
    useSemestersQuery,
    useSubjectsQuery,
    useSaveAssignmentRoundMutation,
} from '@/features/catalogs/queries';
import {
    APPLICABILITY_STATUS_LABELS,
    buildReadinessQuery,
    DEMAND_TYPE_LABELS,
    formatPreparationApiError,
    validateApplicabilityForm,
    validateRequiredComponentForm,
} from '@/features/preparation/model';
import {
    useApplicabilitiesQuery,
    useDeleteApplicabilityMutation,
    useDeleteRequiredComponentMutation,
    useDeleteScopeMutation,
    useDemandsQuery,
    useRequiredComponentsQuery,
    useRoundReadinessQuery,
    useSaveApplicabilityMutation,
    useSaveRequiredComponentMutation,
    useSaveScopeMutation,
    useScopesQuery,
} from '@/features/preparation/queries';
import {
    resolveSemesterForRound,
    useRoundSelection,
} from '@/features/preparation/round-context';
import type {
    ApplicabilityStatus,
    ClassSubjectApplicability,
    DemandType,
    RequiredDemandComponent,
    RoundSubjectScope,
} from '@/features/preparation/types';
import {
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { InputField, SelectField, TextareaField } from '@/shared/ui/fields';
import { Icon } from '@/shared/ui/icon';
import { SubjectIdentity } from '@/shared/ui/subject-identity';
import { DataTable, type Column } from '@/shared/ui/table';
import { useToast } from '@/shared/ui/toast-context';

type PrepStep = 1 | 2 | 3 | 4;

type ScopeDraft = {
    grade_id: string;
    subject_id: string;
};

type ApplicabilityDraft = {
    scope_id: string;
    class_id: string;
    status: ApplicabilityStatus;
    reason: string;
    confirmNow: boolean;
};

type ComponentDraft = {
    applicability_id: string;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
};

type DeletePrepTarget =
    | { kind: 'scope'; id: number; label: string }
    | { kind: 'applicability'; id: number; label: string }
    | { kind: 'component'; id: number; label: string };

function parseStepParam(raw: string | null): PrepStep {
    if (raw === '2' || raw === '3' || raw === '4') {
        return Number(raw) as PrepStep;
    }
    return 1;
}

export function PreparationPage() {
    const toast = useToast();
    const { account, contextId, activeContext } = useSession();
    const actorId = account?.id === 'manager' ? 2 : 1;
    const [searchParams, setSearchParams] = useSearchParams();
    const step = parseStepParam(searchParams.get('step'));

    const setStep = (next: PrepStep) => {
        setSearchParams({ step: String(next) });
    };

    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const semestersQuery = useSemestersQuery({ limit: 100, offset: 0 });
    const gradesQuery = useGradesQuery({ limit: 100, offset: 0 });
    const classesQuery = useClassesQuery({ limit: 100, offset: 0 });
    const subjectsQuery = useSubjectsQuery({ limit: 100, offset: 0 });

    const rounds = roundsQuery.data ?? [];
    const semesters = semestersQuery.data ?? [];
    const grades = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
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

    const scopesQuery = useScopesQuery(
        { round_id: activeRound?.id, limit: 100, offset: 0 },
        Boolean(activeRound),
    );
    const allAppsQuery = useApplicabilitiesQuery(
        { limit: 100, offset: 0 },
        Boolean(activeRound),
    );
    const allComponentsQuery = useRequiredComponentsQuery(
        { limit: 100, offset: 0 },
        Boolean(activeRound),
    );
    const semesterDemandsQuery = useDemandsQuery(
        { semester_id: activeSemester?.id, limit: 100, offset: 0 },
        Boolean(activeSemester),
    );

    const defaultRuleSetId = activeRound?.round_code === 'PC-THCS' ? 2 : 1;
    const readinessQuery = useRoundReadinessQuery(
        activeRound?.id ?? null,
        buildReadinessQuery(1, defaultRuleSetId),
        Boolean(activeRound),
    );

    // Mutations
    const saveRoundMutation = useSaveAssignmentRoundMutation();
    const saveScopeMutation = useSaveScopeMutation();
    const deleteScopeMutation = useDeleteScopeMutation();
    const saveAppMutation = useSaveApplicabilityMutation();
    const deleteAppMutation = useDeleteApplicabilityMutation();
    const saveComponentMutation = useSaveRequiredComponentMutation();
    const deleteComponentMutation = useDeleteRequiredComponentMutation();

    // Filters per step
    const [scopeGradeFilter, setScopeGradeFilter] = useState('');
    const [appScopeFilter, setAppScopeFilter] = useState('');
    const [appStatusFilter, setAppStatusFilter] = useState<
        ApplicabilityStatus | ''
    >('');
    const [componentAppFilter, setComponentAppFilter] = useState('');

    // Modals
    const [scopeModal, setScopeModal] = useState<{
        draft: ScopeDraft;
        error: string | null;
    } | null>(null);

    const [appModal, setAppModal] = useState<{
        editing: ClassSubjectApplicability | null;
        draft: ApplicabilityDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [componentModal, setComponentModal] = useState<{
        editing: RequiredDemandComponent | null;
        draft: ComponentDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DeletePrepTarget | null>(
        null,
    );

    const gradeMap = useMemo(
        () => new Map(grades.map((g) => [g.id, g])),
        [grades],
    );
    const classMap = useMemo(
        () => new Map(classes.map((c) => [c.id, c])),
        [classes],
    );
    const subjectMap = useMemo(
        () => new Map(subjects.map((s) => [s.id, s])),
        [subjects],
    );

    const scopes = useMemo(() => scopesQuery.data ?? [], [scopesQuery.data]);
    const scopeMap = useMemo(
        () => new Map(scopes.map((s) => [s.id, s])),
        [scopes],
    );

    const roundApps = useMemo(
        () => (allAppsQuery.data ?? []).filter((a) => scopeMap.has(a.scope_id)),
        [allAppsQuery.data, scopeMap],
    );
    const appMap = useMemo(
        () => new Map(roundApps.map((a) => [a.id, a])),
        [roundApps],
    );

    const roundComponents = useMemo(
        () =>
            (allComponentsQuery.data ?? []).filter((c) =>
                appMap.has(c.applicability_id),
            ),
        [allComponentsQuery.data, appMap],
    );

    const semesterDemands = useMemo(
        () => semesterDemandsQuery.data ?? [],
        [semesterDemandsQuery.data],
    );

    const filteredScopes = useMemo(
        () =>
            scopes.filter((s) =>
                scopeGradeFilter
                    ? s.grade_id === Number(scopeGradeFilter)
                    : true,
            ),
        [scopes, scopeGradeFilter],
    );

    const filteredApps = useMemo(
        () =>
            roundApps.filter((a) => {
                if (appScopeFilter && a.scope_id !== Number(appScopeFilter))
                    return false;
                if (appStatusFilter && a.status !== appStatusFilter)
                    return false;
                return true;
            }),
        [roundApps, appScopeFilter, appStatusFilter],
    );

    const applicableApps = useMemo(
        () => roundApps.filter((a) => a.status === 'APPLICABLE'),
        [roundApps],
    );

    const filteredComponents = useMemo(
        () =>
            roundComponents.filter((c) =>
                componentAppFilter
                    ? c.applicability_id === Number(componentAppFilter)
                    : true,
            ),
        [roundComponents, componentAppFilter],
    );

    const undeterminedCount = roundApps.filter(
        (a) => a.status === 'UNDETERMINED',
    ).length;
    const missingDemandCount = roundComponents.filter(
        (c) => c.demand_id === null,
    ).length;

    const formatScopeLabel = (scope: RoundSubjectScope) => {
        const gradeName =
            gradeMap.get(scope.grade_id)?.name ?? `Khối #${scope.grade_id}`;
        const subjectName =
            subjectMap.get(scope.subject_id)?.name ??
            `Môn #${scope.subject_id}`;
        return `${gradeName} · ${subjectName}`;
    };

    const formatAppLabel = (app: ClassSubjectApplicability) => {
        const scope = scopeMap.get(app.scope_id);
        const clsCode =
            classMap.get(app.class_id)?.class_code ?? `Lớp #${app.class_id}`;
        const subName = scope
            ? (subjectMap.get(scope.subject_id)?.name ??
              `Môn #${scope.subject_id}`)
            : 'Môn';
        return `${clsCode} · ${subName}`;
    };

    const handleConfirmRoundScope = async () => {
        if (!activeRound) return;
        const now = new Date().toISOString();
        try {
            await saveRoundMutation.mutateAsync({
                id: activeRound.id,
                payload: {
                    semester_id: activeRound.semester_id,
                    round_code: activeRound.round_code,
                    status: activeRound.status,
                    scope_confirmed_by: actorId,
                    scope_confirmed_at: now,
                    opens_at: activeRound.opens_at,
                    closes_at: activeRound.closes_at,
                },
            });
            toast({
                title: `Đã xác nhận phạm vi cho đợt ${activeRound.round_code}`,
                tone: 'success',
            });
        } catch (error) {
            toast({
                title: 'Không thể xác nhận phạm vi đợt',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    const handleSaveScope = async (event: FormEvent) => {
        event.preventDefault();
        if (!scopeModal || !activeRound) return;
        const gradeId = Number(scopeModal.draft.grade_id);
        const subjectId = Number(scopeModal.draft.subject_id);
        if (!gradeId || !subjectId) {
            setScopeModal({
                ...scopeModal,
                error: 'Vui lòng chọn đầy đủ khối lớp và môn học.',
            });
            return;
        }
        try {
            await saveScopeMutation.mutateAsync({
                payload: {
                    round_id: activeRound.id,
                    grade_id: gradeId,
                    subject_id: subjectId,
                    confirmed_by: actorId,
                    confirmed_at: new Date().toISOString(),
                },
            });
            setScopeModal(null);
            toast({ title: 'Đã thêm môn vào phạm vi khối', tone: 'success' });
        } catch (error) {
            setScopeModal({
                ...scopeModal,
                error: formatPreparationApiError(error),
            });
        }
    };

    const handleToggleScopeConfirm = async (row: RoundSubjectScope) => {
        const confirming = !row.confirmed_at;
        try {
            await saveScopeMutation.mutateAsync({
                id: row.id,
                payload: {
                    round_id: row.round_id,
                    grade_id: row.grade_id,
                    subject_id: row.subject_id,
                    confirmed_by: confirming ? actorId : null,
                    confirmed_at: confirming ? new Date().toISOString() : null,
                },
            });
            toast({
                title: confirming
                    ? 'Đã xác nhận dòng phạm vi khối–môn'
                    : 'Đã bỏ xác nhận dòng phạm vi',
                tone: 'info',
            });
        } catch (error) {
            toast({
                title: 'Cập nhật thất bại',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    const handleSaveApplicability = async (event: FormEvent) => {
        event.preventDefault();
        if (!appModal) return;
        const scope = scopeMap.get(Number(appModal.draft.scope_id));
        const hasActiveDemand =
            Boolean(activeSemester && scope) &&
            semesterDemands.some(
                (d) =>
                    d.semester_id === activeSemester!.id &&
                    d.class_id === Number(appModal.draft.class_id) &&
                    d.subject_id === scope!.subject_id &&
                    d.status === 'ACTIVE',
            );

        const errors = validateApplicabilityForm({
            scope_id: appModal.draft.scope_id,
            class_id: appModal.draft.class_id,
            status: appModal.draft.status,
            reason: appModal.draft.reason,
            hasActiveDemand,
        });
        if (Object.keys(errors).length > 0) {
            setAppModal({ ...appModal, errors, submitError: null });
            return;
        }
        const now = new Date().toISOString();
        const editing = appModal.editing;
        try {
            await saveAppMutation.mutateAsync({
                id: editing?.id,
                payload: {
                    scope_id: Number(appModal.draft.scope_id),
                    class_id: Number(appModal.draft.class_id),
                    status: appModal.draft.status,
                    reason:
                        appModal.draft.status === 'NOT_APPLICABLE'
                            ? appModal.draft.reason.trim()
                            : appModal.draft.reason.trim() || null,
                    updated_by: actorId,
                    confirmed_by: appModal.draft.confirmNow ? actorId : null,
                    confirmed_at: appModal.draft.confirmNow ? now : null,
                    components_confirmed_by:
                        editing?.components_confirmed_by ?? null,
                    components_confirmed_at:
                        editing?.components_confirmed_at ?? null,
                },
            });
            setAppModal(null);
            toast({
                title: editing
                    ? 'Đã cập nhật trạng thái áp dụng lớp–môn'
                    : 'Đã khai báo cặp lớp–môn mới',
                tone: 'success',
            });
        } catch (error) {
            setAppModal({
                ...appModal,
                submitError: formatPreparationApiError(error),
            });
        }
    };

    const handleConfirmComponentsForApp = async (
        app: ClassSubjectApplicability,
    ) => {
        try {
            await saveAppMutation.mutateAsync({
                id: app.id,
                payload: {
                    scope_id: app.scope_id,
                    class_id: app.class_id,
                    status: app.status,
                    reason: app.reason,
                    updated_by: actorId,
                    confirmed_by: app.confirmed_by ?? actorId,
                    confirmed_at: app.confirmed_at ?? new Date().toISOString(),
                    components_confirmed_by: actorId,
                    components_confirmed_at: new Date().toISOString(),
                },
            });
            toast({
                title: `Đã xác nhận tập thành phần cho ${formatAppLabel(app)}`,
                tone: 'success',
            });
        } catch (error) {
            toast({
                title: 'Không thể xác nhận tập thành phần',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    const handleSaveComponent = async (event: FormEvent) => {
        event.preventDefault();
        if (!componentModal) return;
        const errors = validateRequiredComponentForm(componentModal.draft);
        if (Object.keys(errors).length > 0) {
            setComponentModal({ ...componentModal, errors, submitError: null });
            return;
        }
        try {
            await saveComponentMutation.mutateAsync({
                id: componentModal.editing?.id,
                payload: {
                    applicability_id: Number(
                        componentModal.draft.applicability_id,
                    ),
                    demand_type: componentModal.draft.demand_type,
                    valid_from: componentModal.draft.valid_from,
                    valid_to: componentModal.draft.valid_to,
                    confirmed_by: componentModal.editing?.confirmed_by ?? null,
                    confirmed_at: componentModal.editing?.confirmed_at ?? null,
                },
            });
            setComponentModal(null);
            toast({
                title: componentModal.editing
                    ? 'Đã cập nhật thành phần bắt buộc'
                    : 'Đã thêm thành phần bắt buộc',
                description:
                    'Xác nhận tập thành phần của cặp lớp–môn đã được đặt lại để rà soát trước khi chốt.',
                tone: 'info',
            });
        } catch (error) {
            setComponentModal({
                ...componentModal,
                submitError: formatPreparationApiError(error),
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.kind === 'scope') {
                await deleteScopeMutation.mutateAsync(deleteTarget.id);
            } else if (deleteTarget.kind === 'applicability') {
                await deleteAppMutation.mutateAsync(deleteTarget.id);
            } else {
                await deleteComponentMutation.mutateAsync(deleteTarget.id);
            }
            toast({ title: `Đã xóa ${deleteTarget.label}`, tone: 'success' });
            setDeleteTarget(null);
        } catch (error) {
            setDeleteTarget(null);
            toast({
                title: 'Không thể xóa bản ghi',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

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
                    className="mvp-actions"
                    style={{ justifyContent: 'flex-end' }}
                >
                    <button
                        type="button"
                        className="btn small"
                        onClick={() => void handleToggleScopeConfirm(row)}
                    >
                        {row.confirmed_at ? 'Bỏ xác nhận' : 'Xác nhận'}
                    </button>
                    <button
                        type="button"
                        className="btn small danger"
                        onClick={() =>
                            setDeleteTarget({
                                kind: 'scope',
                                id: row.id,
                                label: formatScopeLabel(row),
                            })
                        }
                    >
                        Gỡ phạm vi
                    </button>
                </div>
            ),
        },
    ];

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
                                onClick={() =>
                                    void handleConfirmComponentsForApp(app)
                                }
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

    const availableClassesForSelectedScope = useMemo(() => {
        if (!appModal) return [];
        const scope = scopeMap.get(Number(appModal.draft.scope_id));
        if (!scope) return classes;
        return classes.filter(
            (c) =>
                c.grade_id === scope.grade_id &&
                (!activeSemester ||
                    c.academic_year_id === activeSemester.academic_year_id),
        );
    }, [appModal, scopeMap, classes, activeSemester]);

    const readiness = readinessQuery.data;

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Chuẩn bị rõ, phân công vững."
                description="Bốn bước xác nhận đầu vào trước khi mở lấy ý kiến."
            />

            <div className="banner">
                <span className="school-symbol">
                    <Icon name="layers" />
                </span>
                <div className="grow">
                    <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {activeRound?.round_code ?? 'Đang tải đợt'} ·{' '}
                        {activeSemester
                            ? `Học kỳ ${activeSemester.semester_no} (${activeSemester.starts_on} → ${activeSemester.ends_on})`
                            : 'Chọn đợt phân công'}
                    </strong>
                    {activeRound?.source_revision_token ? (
                        <div style={{ marginTop: 4 }}>
                            <code className="mvp-code">
                                {activeRound.source_revision_token}
                            </code>
                        </div>
                    ) : null}
                </div>
                <select
                    aria-label="Chọn đợt phân công chuẩn bị"
                    value={activeRound?.id ?? ''}
                    onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) selectRoundId(id);
                    }}
                >
                    {rounds.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.round_code} ({r.status})
                        </option>
                    ))}
                </select>
                {activeRound ? (
                    <PillBadge
                        tone={activeRound.scope_confirmed_at ? '' : 'amber'}
                        dot
                        label={
                            activeRound.scope_confirmed_at
                                ? 'Đã xác nhận phạm vi'
                                : 'Chưa xác nhận phạm vi'
                        }
                    />
                ) : null}
            </div>

            <div className="mvp-kpis">
                <div className="mvp-kpi kpi-sage">
                    <span className="mvp-kpi-label">
                        Cặp lớp–môn
                        <i>
                            <Icon name="layers" />
                        </i>
                    </span>
                    <strong>{roundApps.length}</strong>
                    <small>{undeterminedCount} chưa xác định</small>
                </div>
                <div className="mvp-kpi">
                    <span className="mvp-kpi-label">
                        Tập bắt buộc
                        <i>
                            <Icon name="book" />
                        </i>
                    </span>
                    <strong>{roundComponents.length}</strong>
                    <small>Độc lập với số dòng nhu cầu</small>
                </div>
                <div className="mvp-kpi kpi-brass">
                    <span className="mvp-kpi-label">
                        Thiếu đầu vào
                        <i>
                            <Icon name="warning" />
                        </i>
                    </span>
                    <strong>{missingDemandCount}</strong>
                    <small>Thành phần chưa được nhập</small>
                </div>
                <div
                    className={`mvp-kpi ${readiness?.can_run_solver ? 'kpi-sage' : 'kpi-clay'}`}
                >
                    <span className="mvp-kpi-label">
                        Tiền kiểm sẵn sàng
                        <i>
                            <Icon name="shield" />
                        </i>
                    </span>
                    <strong>
                        {readiness?.can_run_solver ? 'Sẵn sàng' : 'Chưa đạt'}
                    </strong>
                    <small>
                        {readiness
                            ? `${readiness.issues.filter((issue) => issue.severity === 'ERROR').length} lỗi chặn`
                            : 'Đang tính…'}
                    </small>
                </div>
            </div>

            <nav className="mvp-stepper" aria-label="Bốn bước chuẩn bị dữ liệu">
                {(
                    [
                        [1, 'Phạm vi'],
                        [2, 'Áp dụng'],
                        [3, 'Tập bắt buộc'],
                        [4, 'Sẵn sàng'],
                    ] as const
                ).map(([stepNo, label]) => (
                    <button
                        key={stepNo}
                        type="button"
                        className={step === stepNo ? 'active' : ''}
                        aria-current={step === stepNo ? 'step' : undefined}
                        onClick={() => setStep(stepNo)}
                    >
                        <b>0{stepNo}</b>
                        {label}
                    </button>
                ))}
            </nav>

            {roundsQuery.isError ? (
                <RoleStateCard
                    kind="error"
                    title="Không tải được đợt phân công"
                    detail={formatPreparationApiError(roundsQuery.error)}
                />
            ) : null}

            {step === 1 ? (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>Bước 1 · Phạm vi khối–môn áp dụng trong đợt</h2>
                            <p>
                                Chỉ những môn thuộc phạm vi đã xác nhận mới tiếp
                                tục xuống lớp ở bước 2.
                            </p>
                        </div>
                        <div className="mvp-actions">
                            <button
                                type="button"
                                className="btn"
                                disabled={
                                    !activeRound || saveRoundMutation.isPending
                                }
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
                            <select
                                aria-label="Lọc phạm vi theo khối"
                                value={scopeGradeFilter}
                                onChange={(e) =>
                                    setScopeGradeFilter(e.target.value)
                                }
                            >
                                <option value="">Tất cả khối lớp</option>
                                {grades.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {scopesQuery.isLoading ? (
                            <RoleStateCard
                                kind="loading"
                                title="Đang tải phạm vi khối–môn…"
                                detail="Đang đọc dữ liệu phạm vi của đợt."
                            />
                        ) : filteredScopes.length > 0 ? (
                            <DataTable
                                variant="prototype"
                                caption="Phạm vi khối–môn của đợt"
                                columns={scopeColumns}
                                rows={filteredScopes}
                                rowKey={(row) => row.id}
                            />
                        ) : (
                            <RoleStateCard
                                kind="empty"
                                title="Chưa có phạm vi khối–môn"
                                detail="Thêm môn học vào phạm vi khối cho đợt phân công này."
                            />
                        )}
                    </div>
                </section>
            ) : null}

            {step === 2 ? (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>Bước 2 · Phân loại áp dụng từng cặp lớp–môn</h2>
                            <p>
                                Mọi cặp lớp–môn phải ở trạng thái Áp dụng hoặc
                                Không áp dụng (có lý do).
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
                                          (c) =>
                                              c.grade_id ===
                                              firstScope.grade_id,
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
                            <select
                                aria-label="Lọc theo phạm vi khối–môn"
                                value={appScopeFilter}
                                onChange={(e) =>
                                    setAppScopeFilter(e.target.value)
                                }
                            >
                                <option value="">
                                    Tất cả phạm vi khối–môn
                                </option>
                                {scopes.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {formatScopeLabel(s)}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label="Lọc theo trạng thái áp dụng"
                                value={appStatusFilter}
                                onChange={(e) =>
                                    setAppStatusFilter(
                                        e.target.value as
                                            ApplicabilityStatus | '',
                                    )
                                }
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="APPLICABLE">Áp dụng</option>
                                <option value="NOT_APPLICABLE">
                                    Không áp dụng
                                </option>
                                <option value="UNDETERMINED">
                                    Chưa xác định
                                </option>
                            </select>
                        </div>
                        {allAppsQuery.isLoading ? (
                            <RoleStateCard
                                kind="loading"
                                title="Đang tải cặp lớp–môn…"
                                detail="Đang đọc trạng thái áp dụng của từng lớp."
                            />
                        ) : filteredApps.length > 0 ? (
                            <DataTable
                                variant="prototype"
                                caption="Phân loại áp dụng lớp–môn"
                                columns={appColumns}
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
            ) : null}

            {step === 3 ? (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>Bước 3 · Tập thành phần nhu cầu bắt buộc</h2>
                            <p>
                                Chỉ lớp–môn ÁP DỤNG mới khai báo Chính khóa,
                                Chuyên đề hoặc Tăng cường.
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
                                                  a.id ===
                                                  Number(componentAppFilter),
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
                                            activeSemester?.starts_on ??
                                            '2026-08-01',
                                        valid_to:
                                            activeSemester?.ends_on ??
                                            '2026-12-31',
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
                            Lưu ý đồng bộ: Khi thêm, sửa hoặc xóa thành phần bắt
                            buộc, dấu xác nhận tập thành phần của cặp lớp–môn
                            cha sẽ tự động đặt lại để rà soát trước khi chốt
                            lại.
                        </div>
                        <div className="mvp-filter">
                            <select
                                aria-label="Lọc theo cặp lớp–môn áp dụng"
                                value={componentAppFilter}
                                onChange={(e) =>
                                    setComponentAppFilter(e.target.value)
                                }
                            >
                                <option value="">
                                    Tất cả cặp lớp–môn áp dụng
                                </option>
                                {applicableApps.map((app) => (
                                    <option key={app.id} value={app.id}>
                                        {formatAppLabel(app)}
                                        {app.components_confirmed_at
                                            ? ' (Đã chốt)'
                                            : ' (Chưa chốt)'}
                                    </option>
                                ))}
                            </select>
                            {componentAppFilter ? (
                                <button
                                    type="button"
                                    className="btn small"
                                    onClick={() => {
                                        const app = appMap.get(
                                            Number(componentAppFilter),
                                        );
                                        if (app)
                                            void handleConfirmComponentsForApp(
                                                app,
                                            );
                                    }}
                                >
                                    <Icon name="check" />
                                    Chốt tập cho cặp đang chọn
                                </button>
                            ) : null}
                        </div>
                        {allComponentsQuery.isLoading ? (
                            <RoleStateCard
                                kind="loading"
                                title="Đang tải thành phần bắt buộc…"
                                detail="Đang đọc tập thành phần bắt buộc."
                            />
                        ) : filteredComponents.length > 0 ? (
                            <DataTable
                                variant="prototype"
                                caption="Tập thành phần bắt buộc"
                                columns={componentColumns}
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
            ) : null}

            {step === 4 ? (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>Bước 4 · Xác nhận & tiền kiểm sẵn sàng</h2>
                            <p>
                                Kiểm tra dữ liệu đầu vào theo lần cập nhật mới
                                nhất của đợt.
                            </p>
                        </div>
                        <Link to="/checks" className="btn primary">
                            <Icon name="arrow" />
                            Xem chi tiết tại Trung tâm kiểm tra
                        </Link>
                    </div>
                    <div className="panel-body">
                        {readiness ? (
                            <>
                                <div className="detail-grid">
                                    <div>
                                        <small>Thành phần bắt buộc</small>
                                        <b>
                                            {
                                                readiness.coverage
                                                    .required_components
                                            }
                                        </b>
                                    </div>
                                    <div>
                                        <small>Đã có nhu cầu</small>
                                        <b>
                                            {readiness.coverage
                                                .required_components -
                                                readiness.coverage
                                                    .missing_demand}
                                        </b>
                                    </div>
                                    <div>
                                        <small>Thiếu nhu cầu giảng dạy</small>
                                        <b>
                                            {readiness.coverage.missing_demand}
                                        </b>
                                    </div>
                                    <div>
                                        <small>
                                            Quyết định điều kiện solver
                                        </small>
                                        <PillBadge
                                            tone={
                                                readiness.can_run_solver
                                                    ? ''
                                                    : 'red'
                                            }
                                            dot
                                            label={
                                                readiness.can_run_solver
                                                    ? 'Sẵn sàng'
                                                    : 'Bị chặn'
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="section-gap">
                                    {readiness.issues.map((issue, idx) => (
                                        <ReadinessIssue
                                            key={`${issue.code}-${idx}`}
                                            issue={issue}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <RoleStateCard
                                kind="loading"
                                title="Đang chạy tiền kiểm readiness…"
                                detail="Đang đối chiếu phạm vi, áp dụng, thành phần bắt buộc và nhu cầu."
                            />
                        )}
                    </div>
                </section>
            ) : null}

            {/* Step 1 Modal */}
            <Dialog
                variant="prototype"
                open={scopeModal !== null}
                onOpenChange={(open) => {
                    if (!open) setScopeModal(null);
                }}
                title="Thêm môn học vào phạm vi khối"
                description="Mỗi cặp khối–môn chỉ xuất hiện một lần trong đợt phân công."
                busy={saveScopeMutation.isPending}
            >
                {scopeModal ? (
                    <form className="mvp-form" onSubmit={handleSaveScope}>
                        <SelectField
                            label="Khối lớp"
                            required
                            value={scopeModal.draft.grade_id}
                            onChange={(e) =>
                                setScopeModal({
                                    ...scopeModal,
                                    draft: {
                                        ...scopeModal.draft,
                                        grade_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn khối lớp…</option>
                            {grades.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Môn học"
                            required
                            value={scopeModal.draft.subject_id}
                            onChange={(e) =>
                                setScopeModal({
                                    ...scopeModal,
                                    draft: {
                                        ...scopeModal.draft,
                                        subject_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn môn học…</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.subject_code})
                                </option>
                            ))}
                        </SelectField>
                        {scopeModal.error ? (
                            <p className="mvp-error full" role="alert">
                                {scopeModal.error}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setScopeModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveScopeMutation.isPending}
                            >
                                Lưu phạm vi
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            {/* Step 2 Modal */}
            <Dialog
                variant="prototype"
                open={appModal !== null}
                onOpenChange={(open) => {
                    if (!open) setAppModal(null);
                }}
                title={
                    appModal?.editing
                        ? 'Phân loại cặp lớp–môn'
                        : 'Khai báo cặp lớp–môn'
                }
                description="Chọn Áp dụng hoặc Không áp dụng kèm lý do bắt buộc."
                busy={saveAppMutation.isPending}
            >
                {appModal ? (
                    <form
                        className="mvp-form"
                        onSubmit={handleSaveApplicability}
                    >
                        <SelectField
                            label="Phạm vi khối–môn"
                            required
                            disabled={Boolean(appModal.editing)}
                            value={appModal.draft.scope_id}
                            error={appModal.errors.scope_id}
                            onChange={(e) => {
                                const nextScope = scopeMap.get(
                                    Number(e.target.value),
                                );
                                const nextClass = nextScope
                                    ? classes.find(
                                          (c) =>
                                              c.grade_id === nextScope.grade_id,
                                      )
                                    : undefined;
                                setAppModal({
                                    ...appModal,
                                    draft: {
                                        ...appModal.draft,
                                        scope_id: e.target.value,
                                        class_id: nextClass
                                            ? String(nextClass.id)
                                            : '',
                                    },
                                });
                            }}
                        >
                            <option value="">Chọn phạm vi…</option>
                            {scopes.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {formatScopeLabel(s)}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Lớp học"
                            required
                            disabled={Boolean(appModal.editing)}
                            value={appModal.draft.class_id}
                            error={appModal.errors.class_id}
                            onChange={(e) =>
                                setAppModal({
                                    ...appModal,
                                    draft: {
                                        ...appModal.draft,
                                        class_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn lớp…</option>
                            {availableClassesForSelectedScope.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.class_code}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Trạng thái áp dụng"
                            className="full"
                            required
                            value={appModal.draft.status}
                            error={appModal.errors.status}
                            onChange={(e) =>
                                setAppModal({
                                    ...appModal,
                                    draft: {
                                        ...appModal.draft,
                                        status: e.target
                                            .value as ApplicabilityStatus,
                                    },
                                })
                            }
                        >
                            <option value="APPLICABLE">
                                Áp dụng (APPLICABLE)
                            </option>
                            <option value="NOT_APPLICABLE">
                                Không áp dụng (NOT_APPLICABLE)
                            </option>
                            <option value="UNDETERMINED">
                                Chưa xác định (UNDETERMINED)
                            </option>
                        </SelectField>
                        <TextareaField
                            label={
                                appModal.draft.status === 'NOT_APPLICABLE'
                                    ? 'Lý do không áp dụng (bắt buộc)'
                                    : 'Ghi chú (tùy chọn)'
                            }
                            className="full"
                            value={appModal.draft.reason}
                            error={appModal.errors.reason}
                            onChange={(e) =>
                                setAppModal({
                                    ...appModal,
                                    draft: {
                                        ...appModal.draft,
                                        reason: e.target.value,
                                    },
                                })
                            }
                        />
                        <label className="mvp-checks full">
                            <span>
                                <input
                                    type="checkbox"
                                    checked={appModal.draft.confirmNow}
                                    onChange={(e) =>
                                        setAppModal({
                                            ...appModal,
                                            draft: {
                                                ...appModal.draft,
                                                confirmNow: e.target.checked,
                                            },
                                        })
                                    }
                                />{' '}
                                Xác nhận trạng thái phân loại này
                            </span>
                        </label>
                        {appModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {appModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setAppModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveAppMutation.isPending}
                            >
                                Lưu phân loại
                            </button>
                        </div>
                    </form>
                ) : null}
            </Dialog>

            {/* Step 3 Modal */}
            <Dialog
                variant="prototype"
                open={componentModal !== null}
                onOpenChange={(open) => {
                    if (!open) setComponentModal(null);
                }}
                title={
                    componentModal?.editing
                        ? 'Cập nhật thành phần bắt buộc'
                        : 'Thêm thành phần bắt buộc'
                }
                description="Lưu ý: khi thay đổi danh sách thành phần, trạng thái xác nhận tập của cặp lớp–môn sẽ được đặt lại."
                busy={saveComponentMutation.isPending}
            >
                {componentModal ? (
                    <form className="mvp-form" onSubmit={handleSaveComponent}>
                        <SelectField
                            label="Cặp lớp–môn áp dụng"
                            required
                            disabled={Boolean(componentModal.editing)}
                            value={componentModal.draft.applicability_id}
                            error={componentModal.errors.applicability_id}
                            onChange={(e) =>
                                setComponentModal({
                                    ...componentModal,
                                    draft: {
                                        ...componentModal.draft,
                                        applicability_id: e.target.value,
                                    },
                                })
                            }
                        >
                            <option value="">Chọn cặp lớp–môn…</option>
                            {applicableApps.map((app) => (
                                <option key={app.id} value={app.id}>
                                    {formatAppLabel(app)}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Loại thành phần"
                            required
                            value={componentModal.draft.demand_type}
                            error={componentModal.errors.demand_type}
                            onChange={(e) =>
                                setComponentModal({
                                    ...componentModal,
                                    draft: {
                                        ...componentModal.draft,
                                        demand_type: e.target
                                            .value as DemandType,
                                    },
                                })
                            }
                        >
                            <option value="STANDARD">
                                Giảng dạy chuẩn (STANDARD)
                            </option>
                            <option value="SPECIALIZED_TOPIC">
                                Chuyên đề lựa chọn (SPECIALIZED_TOPIC)
                            </option>
                            <option value="ENRICHMENT">
                                Tăng cường / hoạt động (ENRICHMENT)
                            </option>
                        </SelectField>
                        <InputField
                            label="Hiệu lực từ ngày"
                            type="date"
                            required
                            value={componentModal.draft.valid_from}
                            error={componentModal.errors.valid_from}
                            onChange={(e) =>
                                setComponentModal({
                                    ...componentModal,
                                    draft: {
                                        ...componentModal.draft,
                                        valid_from: e.target.value,
                                    },
                                })
                            }
                        />
                        <InputField
                            label="Hiệu lực đến ngày"
                            type="date"
                            required
                            value={componentModal.draft.valid_to}
                            error={componentModal.errors.valid_to}
                            onChange={(e) =>
                                setComponentModal({
                                    ...componentModal,
                                    draft: {
                                        ...componentModal.draft,
                                        valid_to: e.target.value,
                                    },
                                })
                            }
                        />
                        {componentModal.submitError ? (
                            <p className="mvp-error full" role="alert">
                                {componentModal.submitError}
                            </p>
                        ) : null}
                        <div className="modal-footer full">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setComponentModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={saveComponentMutation.isPending}
                            >
                                Lưu thành phần
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
                title="Xác nhận xóa bản ghi chuẩn bị"
                description={
                    deleteTarget?.kind === 'component'
                        ? 'Xóa thành phần bắt buộc sẽ tự động đặt lại trạng thái xác nhận tập thành phần của cặp lớp–môn cha.'
                        : 'Nếu đã có dữ liệu bước sau tham chiếu bản ghi này, hệ thống sẽ từ chối xóa cứng (409 REFERENCE_CONFLICT).'
                }
                confirmLabel="Xác nhận xóa"
                destructive
                busy={
                    deleteScopeMutation.isPending ||
                    deleteAppMutation.isPending ||
                    deleteComponentMutation.isPending
                }
                onConfirm={() => void handleConfirmDelete()}
            />
        </div>
    );
}
