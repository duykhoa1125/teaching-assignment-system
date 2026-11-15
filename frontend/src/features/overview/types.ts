export type OverviewPlanPhase =
    | 'DRAFT'
    | 'OPEN_FOR_FEEDBACK'
    | 'FEEDBACK_PROCESSING'
    | 'READY_TO_EXPORT'
    | 'EXPORTED';

export type OverviewComponentType =
    'STANDARD' | 'SPECIALIZED_TOPIC' | 'ENRICHMENT';

export type OverviewAssignmentItem = {
    id: number;
    class_name: string;
    subject_name: string;
    component_type: OverviewComponentType;
    periods: number;
    locked: boolean;
};

export type OverviewTeacherLoad = {
    id: number;
    teacher_code: string;
    full_name: string;
    department_name: string;
    subjects: string[];
    color_index: number;
    portrait_key: number;
    fixed_periods: number;
    assigned_periods: number;
    converted_periods: number;
    reduction_periods: number;
    working_periods: number;
    quota_remaining: number;
    total_periods: number;
    base_norm: number;
    weekly_limit: number;
    delta: number;
    assignments: OverviewAssignmentItem[];
};

export type OverviewGradeBreakdown = {
    grade: string;
    periods: number;
};

export type OverviewActivityItem = {
    id: string;
    title: string;
    detail: string;
    actor_name: string | null;
    actor_portrait_key: 'manager' | number | null;
    actor_color_index: number;
    time_label: string;
};

/** Mock-only UI aggregate for the Overview dashboard; not a real backend DTO. */
export type OverviewDashboard = {
    context_id: string;
    round: string;
    context_title: string;
    academic_year: string;
    school_name: string;
    phase: OverviewPlanPhase;
    plan_version: number;
    plan_revision: number;
    feedback_due_at: string | null;
    readiness: {
        required_inputs_count: number;
        scope_confirmed: boolean;
        required_confirmed: boolean;
        validation_fresh: boolean;
        validation_releasable: boolean;
    };
    summary: {
        teachers_count: number;
        balanced_teachers_count: number;
        under_norm_teachers_count: number;
        over_norm_teachers_count: number;
        total_periods: number;
        total_demands: number;
        assigned_demands: number;
        unassigned_demands: number;
        locked_demands: number;
        class_count: number;
        coverage_percent: number;
        pending_feedback_count: number;
        demands_by_grade: OverviewGradeBreakdown[];
    };
    teachers: OverviewTeacherLoad[];
    recent_activity: OverviewActivityItem[];
};
