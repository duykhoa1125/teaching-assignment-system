import type { OverviewDashboard } from '../features/overview/types.ts';
import { assignmentStore } from './assignment-store.ts';
import { layoutPreview } from './fixtures/layout.ts';
import { preparationStore } from './preparation-store.ts';

/** Existing preview fixtures remain available until a round's mock plan is loaded. */
export function readPlanLayout() {
    const preview = structuredClone(layoutPreview);
    for (const context of preview.contexts) {
        const plan = assignmentStore.preview(context.round);
        if (!plan) continue;
        context.total = plan.rows.length;
        context.assigned = plan.rows.filter(
            (row) => row.teacher_id !== null,
        ).length;
    }
    return preview;
}

export function readPlanOverview(
    base: OverviewDashboard | null,
): OverviewDashboard | null {
    if (!base) return null;
    const plan = assignmentStore.preview(base.round);
    if (!plan) return base;
    const rows = plan.rows;
    const readiness = preparationStore.evaluateReadiness(
        plan.meta.round_id,
        {
            optimization_config_id: plan.meta.optimization_config_id,
            rule_set_version_id: plan.meta.rule_set_version_id,
        },
        'normal',
    );
    const teachers = plan.teachers.map((teacher) => {
        const load = plan.loads.find((item) => item.teacher_id === teacher.id)!;
        return {
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            full_name: teacher.full_name,
            department_name: teacher.subjects
                .map((item) => item.name)
                .join(' · '),
            subjects: teacher.subjects.map((item) => item.name),
            color_index: teacher.color_index,
            portrait_key: teacher.portrait_key,
            fixed_periods: load.f,
            assigned_periods: load.a,
            converted_periods: load.c,
            reduction_periods: load.r,
            working_periods: load.w,
            quota_remaining: load.q ?? 0,
            total_periods: load.t,
            base_norm: load.b,
            weekly_limit: teacher.weekly_limit,
            delta: load.delta_t ?? 0,
            assignments: rows
                .filter((row) => row.teacher_id === teacher.id)
                .map((row) => ({
                    id: row.id,
                    class_name: row.class_name,
                    subject_name: row.subject_name,
                    component_type: row.demand_type,
                    periods: row.periods_per_week,
                    locked: row.locked,
                })),
        };
    });
    const assigned = rows.filter((row) => row.teacher_id !== null).length;
    const grades = new Map<string, number>();
    for (const row of rows) {
        const grade = row.class_name.match(/^\d+/)?.[0] ?? row.class_name;
        grades.set(grade, (grades.get(grade) ?? 0) + row.periods_per_week);
    }
    return {
        ...base,
        context_title: plan.context_label,
        plan_version: plan.meta.version_no,
        plan_revision: plan.meta.revision_no,
        phase: plan.meta.status === 'DRAFT' ? 'DRAFT' : base.phase,
        readiness: {
            ...base.readiness,
            required_inputs_count: readiness.coverage.required_components,
            scope_confirmed: Boolean(
                preparationStore.detailRound(plan.meta.round_id)
                    .scope_confirmed_at,
            ),
            required_confirmed: !readiness.issues.some(
                (issue) =>
                    issue.code === 'APPLICABILITY_COMPONENTS_UNCONFIRMED',
            ),
            validation_fresh: false,
            validation_releasable: false,
        },
        summary: {
            ...base.summary,
            teachers_count: teachers.length,
            balanced_teachers_count: teachers.filter((item) => item.delta === 0)
                .length,
            under_norm_teachers_count: teachers.filter((item) => item.delta < 0)
                .length,
            over_norm_teachers_count: teachers.filter((item) => item.delta > 0)
                .length,
            total_periods: rows.reduce(
                (total, row) => total + row.periods_per_week,
                0,
            ),
            total_demands: rows.length,
            assigned_demands: assigned,
            unassigned_demands: rows.length - assigned,
            locked_demands: rows.filter((row) => row.locked).length,
            class_count: new Set(rows.map((row) => row.class_id)).size,
            coverage_percent: rows.length
                ? Math.round((assigned / rows.length) * 100)
                : 0,
            demands_by_grade: [...grades].map(([grade, periods]) => ({
                grade,
                periods,
            })),
        },
        teachers,
        recent_activity: [],
    };
}
