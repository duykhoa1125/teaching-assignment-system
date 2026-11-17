import { useMemo } from 'react';
import {
    useAssignmentRoundsQuery,
    useClassesQuery,
    useGradesQuery,
    useSemestersQuery,
    useSubjectsQuery,
} from '@/features/catalogs/queries';
import { buildReadinessQuery } from '@/features/preparation/model';
import {
    useApplicabilitiesQuery,
    useDemandsQuery,
    useRequiredComponentsQuery,
    useRoundReadinessQuery,
    useScopesQuery,
} from '@/features/preparation/queries';
import {
    resolveSemesterForRound,
    useRoundSelection,
} from '@/features/preparation/round-context';
import { useSession } from '@/features/session/use-session';
import type {
    ClassSubjectApplicability,
    RoundSubjectScope,
} from '@/features/preparation/types';

export function usePreparationData() {
    const { account, contextId, activeContext } = useSession();
    const actorId = account?.id === 'manager' ? 2 : 1;
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

    const applicableApps = useMemo(
        () => roundApps.filter((a) => a.status === 'APPLICABLE'),
        [roundApps],
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

    const readiness = readinessQuery.data;
    return {
        actorId,
        contextId,
        activeRound,
        selectRoundId,
        activeSemester,
        rounds,
        grades,
        classes,
        subjects,
        roundsQuery,
        scopesQuery,
        allAppsQuery,
        allComponentsQuery,
        readinessQuery,
        gradeMap,
        classMap,
        subjectMap,
        scopes,
        scopeMap,
        roundApps,
        appMap,
        roundComponents,
        semesterDemands,
        applicableApps,
        undeterminedCount,
        missingDemandCount,
        formatScopeLabel,
        formatAppLabel,
        readiness,
    };
}
export type PreparationData = ReturnType<typeof usePreparationData>;
