import type {
    OverviewActivityItem,
    OverviewDashboard,
} from '../features/overview/types.ts';
import type { Teacher } from '../features/teachers/types.ts';
import { assignmentStore } from './assignment-store.ts';
import { layoutPreview } from './fixtures/layout.ts';
import { preparationStore } from './preparation-store.ts';

function isValidationReportReleasable(
    report: ReturnType<typeof assignmentStore.latestValidation>,
): boolean {
    if (!report || !report.fresh) return false;
    return !report.results.some((finding) => {
        if (finding.result_status === 'VIOLATION') return true;
        if (finding.result_status === 'INSUFFICIENT_DATA') {
            return finding.calculation_period !== 'ANNUAL';
        }
        return false;
    });
}

function formatAuditTime(iso: string): string {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return 'Vừa xong';
    return parsed.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
    });
}

/** Unified layout preview powered by live assignment/preparation stores from initial load. */
export function readPlanLayout(teachers: Teacher[] = [], empty = false) {
    const preview = structuredClone(layoutPreview);
    if (empty) {
        for (const context of preview.contexts) {
            context.assigned = 0;
            context.total = 0;
            context.feedback = 0;
        }
        return preview;
    }
    if (teachers.length > 0) {
        assignmentStore.ensure(teachers);
    }
    const rounds = preparationStore.listRounds({ limit: 100 });
    for (const context of preview.contexts) {
        const plan = assignmentStore.preview(context.round);
        if (plan) {
            context.total = plan.rows.length;
            context.assigned = plan.rows.filter(
                (row) => row.teacher_id !== null,
            ).length;
            continue;
        }
        const round = rounds.find((item) => item.round_code === context.round);
        if (!round) continue;
        const demands = preparationStore.listDemands({
            semester_id: round.semester_id,
            status: 'ACTIVE',
            limit: 1000,
        });
        context.total = demands.length;
        context.assigned = 0;
    }
    return preview;
}

export function readPlanOverview(
    base: OverviewDashboard | null,
    teachers: Teacher[] = [],
    empty = false,
): OverviewDashboard | null {
    if (!base) return null;
    if (empty) return base;
    if (teachers.length > 0) {
        assignmentStore.ensure(teachers);
    }
    const plan = assignmentStore.preview(base.round);
    if (!plan) return base;
    const rows = plan.rows;
    const readiness = assignmentStore.decorateReadiness(
        preparationStore.evaluateReadiness(
            plan.meta.round_id,
            {
                optimization_config_id: plan.meta.optimization_config_id,
                rule_set_version_id: plan.meta.rule_set_version_id,
            },
            'normal',
        ),
    );
    const teacherLoads = plan.teachers.map((teacher) => {
        const load = plan.loads.find((item) => item.teacher_id === teacher.id)!;
        return {
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            full_name: teacher.full_name,
            department_name:
                teacher.subjects.map((item) => item.name).join(' · ') ||
                base.school_name,
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
        grades.set(
            grade,
            Math.round(
                ((grades.get(grade) ?? 0) + row.periods_per_week) * 100,
            ) / 100,
        );
    }
    const validation = assignmentStore.latestValidation(plan.meta.version_id);
    const latestRun = assignmentStore.latestSolverRun(plan.meta.version_id);
    const liveAudit: OverviewActivityItem[] = assignmentStore
        .audit(plan.meta.version_id)
        .slice()
        .reverse()
        .slice(0, 4)
        .map((entry, idx) => ({
            id: `audit-${plan.meta.version_id}-${idx}`,
            title: entry.reason,
            detail:
                entry.row_ids.length > 0
                    ? `${entry.action} · ${entry.row_ids.length} dòng phân công`
                    : `${entry.action} · V${String(plan.meta.version_no).padStart(2, '0')}/r${plan.meta.revision_no}`,
            actor_name: 'Nguyễn Minh Khoa',
            actor_portrait_key: 'manager',
            actor_color_index: 0,
            time_label: formatAuditTime(entry.at),
        }));

    return {
        ...base,
        context_title: plan.context_label.split(' · ')[0] ?? plan.context_label,
        round_id: plan.meta.round_id,
        plan_version: plan.meta.version_no,
        plan_version_id: plan.meta.version_id,
        plan_revision: plan.meta.revision_no,
        phase: plan.meta.status === 'DRAFT' ? 'DRAFT' : base.phase,
        validation_status: validation?.overall_status ?? null,
        latest_solver_status: latestRun?.status ?? null,
        latest_apply_outcome: latestRun?.summary?.apply_outcome ?? null,
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
            validation_fresh: validation?.fresh ?? false,
            validation_releasable: isValidationReportReleasable(validation),
        },
        summary: {
            ...base.summary,
            teachers_count: teacherLoads.length,
            balanced_teachers_count: teacherLoads.filter(
                (item) => item.delta === 0,
            ).length,
            under_norm_teachers_count: teacherLoads.filter(
                (item) => item.delta < 0,
            ).length,
            over_norm_teachers_count: teacherLoads.filter(
                (item) => item.delta > 0,
            ).length,
            total_periods:
                Math.round(
                    rows.reduce(
                        (total, row) => total + row.periods_per_week,
                        0,
                    ) * 100,
                ) / 100,
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
        teachers: teacherLoads,
        recent_activity:
            liveAudit.length > 0
                ? [...liveAudit, ...base.recent_activity].slice(0, 5)
                : base.recent_activity,
    };
}
