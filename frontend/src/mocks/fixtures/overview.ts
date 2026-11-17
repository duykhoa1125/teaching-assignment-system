import type {
    OverviewActivityItem,
    OverviewAssignmentItem,
    OverviewComponentType,
    OverviewDashboard,
    OverviewTeacherLoad,
} from '../../features/overview/types.ts';
import { assignmentPolicies, captureWorkspaceTeachers } from './assignment.ts';
import { schools, teachers as baseTeachers } from './index.ts';
import {
    preparationAcademicYears,
    preparationApplicabilities,
    preparationClasses,
    preparationDemands,
    preparationRounds,
    preparationScopes,
    preparationSemesters,
    preparationSubjects,
} from './preparation.ts';

type PortalDemand = OverviewAssignmentItem & {
    teacher_id: number | null;
};

export const CONTEXT_OVERVIEW_CONFIG: Record<
    string,
    { roundId: number; roundCode: string; ruleSetId: number; label: string }
> = {
    hk1: { roundId: 1, roundCode: 'PC-01', ruleSetId: 1, label: 'Học kỳ I' },
    hk2: { roundId: 2, roundCode: 'PC-02', ruleSetId: 1, label: 'Học kỳ II' },
    'thcs-demo': {
        roundId: 3,
        roundCode: 'PC-THCS',
        ruleSetId: 2,
        label: 'THCS · Trải nghiệm',
    },
};
const roundContextMap = CONTEXT_OVERVIEW_CONFIG;

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function buildUnifiedContextOverview(
    contextId: string,
    seedActivity: OverviewActivityItem[],
): OverviewDashboard {
    const cfg = roundContextMap[contextId] ?? {
        roundId: 1,
        ruleSetId: 1,
        label: 'Học kỳ I',
    };
    const round = preparationRounds.find((item) => item.id === cfg.roundId)!;
    const semester = preparationSemesters.find(
        (item) => item.id === round.semester_id,
    )!;
    const year = preparationAcademicYears.find(
        (item) => item.id === semester.academic_year_id,
    )!;
    const school = schools.find((item) => item.id === year.school_id)!;
    const scopes = preparationScopes.filter((s) => s.round_id === round.id);
    const applicablePairs = new Set(
        preparationApplicabilities
            .filter(
                (app) =>
                    app.status === 'APPLICABLE' &&
                    scopes.some((s) => s.id === app.scope_id),
            )
            .map((app) => {
                const scope = scopes.find((s) => s.id === app.scope_id)!;
                return `${app.class_id}:${scope.subject_id}`;
            }),
    );
    const activeDemands = preparationDemands
        .filter(
            (d) =>
                d.semester_id === semester.id &&
                d.status === 'ACTIVE' &&
                d.valid_from <= semester.ends_on &&
                d.valid_to >= semester.starts_on &&
                applicablePairs.has(`${d.class_id}:${d.subject_id}`),
        )
        .sort((a, b) => a.id - b.id);

    const workspaceTeachers = captureWorkspaceTeachers(
        baseTeachers,
        school.id,
        preparationSubjects,
        semester.starts_on,
        semester.ends_on,
        cfg.ruleSetId,
    );

    const rows: PortalDemand[] = activeDemands.map((demand, index) => {
        const cls = preparationClasses.find((c) => c.id === demand.class_id);
        const sub = preparationSubjects.find((s) => s.id === demand.subject_id);
        let teacherId: number | null = null;
        let locked = false;
        if (contextId === 'hk1' && index % 4 !== 3) {
            const candidates = workspaceTeachers.filter((teacher) =>
                teacher.subjects.some((s) => s.id === demand.subject_id),
            );
            const picked =
                candidates[index % Math.max(1, candidates.length)] ?? null;
            if (picked) {
                teacherId = picked.id;
                locked = index < 2;
            }
        }
        return {
            id: 50000 + demand.id,
            class_name: cls?.class_code ?? `#${demand.class_id}`,
            subject_name: sub?.name ?? `#${demand.subject_id}`,
            component_type: demand.demand_type as OverviewComponentType,
            periods: demand.periods_per_week,
            locked,
            teacher_id: teacherId,
        };
    });

    const teacherLoads: OverviewTeacherLoad[] = workspaceTeachers.map(
        (teacher) => {
            const assignments = rows
                .filter((r) => r.teacher_id === teacher.id)
                .map(({ teacher_id: _unused, ...rest }) => ({ ...rest }));
            const assignedPeriods = round2(
                assignments.reduce((sum, item) => sum + item.periods, 0),
            );
            const workingPeriods = round2(
                teacher.fixed + assignedPeriods + teacher.converted,
            );
            const totalPeriods = round2(workingPeriods + teacher.reduced);
            const policy =
                assignmentPolicies[
                    cfg.ruleSetId as keyof typeof assignmentPolicies
                ] ?? assignmentPolicies[1];
            return {
                id: teacher.id,
                teacher_code: teacher.teacher_code,
                full_name: teacher.full_name,
                department_name:
                    teacher.subjects.map((s) => s.name).join(' · ') ||
                    school.name,
                subjects: teacher.subjects.map((s) => s.name),
                color_index: teacher.color_index,
                portrait_key: teacher.portrait_key,
                fixed_periods: teacher.fixed,
                assigned_periods: assignedPeriods,
                converted_periods: teacher.converted,
                reduction_periods: teacher.reduced,
                working_periods: workingPeriods,
                quota_remaining: Math.max(
                    0,
                    round2(policy.base - teacher.reduced),
                ),
                total_periods: totalPeriods,
                base_norm: teacher.base_norm,
                weekly_limit: teacher.weekly_limit,
                delta: round2(totalPeriods - teacher.base_norm),
                assignments,
            };
        },
    );

    const assignedCount = rows.filter((r) => r.teacher_id !== null).length;
    const totalCount = rows.length;
    const gradeTotals = new Map<string, number>();
    const classSet = new Set<string>();
    for (const row of rows) {
        classSet.add(row.class_name);
        const grade = row.class_name.match(/^\d+/)?.[0] ?? '';
        if (grade) {
            gradeTotals.set(
                grade,
                round2((gradeTotals.get(grade) ?? 0) + row.periods),
            );
        }
    }
    const balanced = teacherLoads.filter((t) => t.delta === 0).length;
    const under = teacherLoads.filter((t) => t.delta < 0).length;
    const over = teacherLoads.filter((t) => t.delta > 0).length;
    const roundApps = preparationApplicabilities.filter((app) =>
        scopes.some((s) => s.id === app.scope_id),
    );
    const applicableCount = roundApps.filter(
        (a) => a.status === 'APPLICABLE',
    ).length;
    const requiredConfirmed =
        applicableCount > 0 &&
        roundApps
            .filter((a) => a.status === 'APPLICABLE')
            .every((a) => Boolean(a.components_confirmed_at));

    return {
        context_id: contextId,
        round: round.round_code,
        round_id: round.id,
        context_title: cfg.label,
        academic_year: year.year_code.replace('-', '–'),
        school_name: school.name.replace(' (mẫu)', ''),
        phase: 'DRAFT',
        plan_version: contextId === 'hk1' ? 2 : 1,
        plan_version_id: null,
        plan_revision: contextId === 'hk1' ? rows.length : 0,
        feedback_due_at: contextId === 'hk1' ? '2026-11-15T17:00' : null,
        validation_status: null,
        latest_solver_status: null,
        latest_apply_outcome: null,
        readiness: {
            required_inputs_count: totalCount,
            scope_confirmed: Boolean(round.scope_confirmed_at),
            required_confirmed: requiredConfirmed,
            validation_fresh: false,
            validation_releasable: false,
        },
        summary: {
            teachers_count: teacherLoads.length,
            balanced_teachers_count: balanced,
            under_norm_teachers_count: under,
            over_norm_teachers_count: over,
            total_periods: round2(
                rows.reduce((sum, item) => sum + item.periods, 0),
            ),
            total_demands: totalCount,
            assigned_demands: assignedCount,
            unassigned_demands: totalCount - assignedCount,
            locked_demands: rows.filter((item) => item.locked).length,
            class_count: classSet.size,
            coverage_percent: totalCount
                ? Math.round((assignedCount / totalCount) * 100)
                : 0,
            pending_feedback_count: contextId === 'hk1' ? 2 : 0,
            demands_by_grade: [...gradeTotals.entries()].map(
                ([grade, periods]) => ({ grade, periods }),
            ),
        },
        teachers: teacherLoads,
        recent_activity: seedActivity,
    };
}

export const overviewByContext: Record<string, OverviewDashboard> = {
    hk1: buildUnifiedContextOverview('hk1', [
        {
            id: 'act-hk1-1',
            title: 'Khởi tạo bản nháp V02 · PC-01',
            detail: 'Đồng bộ từ bộ dữ liệu trường THPT An Hòa (mẫu)',
            actor_name: 'Nguyễn Minh Khoa',
            actor_portrait_key: 'manager',
            actor_color_index: 0,
            time_label: 'Hôm nay, 08:45',
        },
        {
            id: 'act-hk1-2',
            title: 'Xác nhận phạm vi học kỳ I',
            detail: 'Dữ liệu chuẩn bị chia sẻ với Chuẩn bị, Nhu cầu & Phân công',
            actor_name: null,
            actor_portrait_key: null,
            actor_color_index: 0,
            time_label: 'Hôm qua, 15:30',
        },
    ]),
    hk2: buildUnifiedContextOverview('hk2', [
        {
            id: 'act-hk2-1',
            title: 'Khởi tạo không gian học kỳ II · PC-02',
            detail: 'Chia sẻ danh mục và giáo viên từ cùng nguồn chuẩn bị',
            actor_name: null,
            actor_portrait_key: null,
            actor_color_index: 0,
            time_label: 'Vừa xong',
        },
    ]),
    'thcs-demo': buildUnifiedContextOverview('thcs-demo', []),
};

export function readOverviewFixture(
    contextId: string,
    empty: boolean,
): OverviewDashboard | null {
    const base = overviewByContext[contextId];
    if (!base) return null;
    if (!empty) return structuredClone(base);
    return {
        ...structuredClone(base),
        readiness: {
            required_inputs_count: 0,
            scope_confirmed: false,
            required_confirmed: false,
            validation_fresh: false,
            validation_releasable: false,
        },
        summary: {
            teachers_count: 0,
            balanced_teachers_count: 0,
            under_norm_teachers_count: 0,
            over_norm_teachers_count: 0,
            total_periods: 0,
            total_demands: 0,
            assigned_demands: 0,
            unassigned_demands: 0,
            locked_demands: 0,
            class_count: 0,
            coverage_percent: 0,
            pending_feedback_count: 0,
            demands_by_grade: [],
        },
        teachers: [],
        recent_activity: [],
    };
}
