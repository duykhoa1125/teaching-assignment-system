import type { DemandType } from '../preparation/types';

export type PlanVersion = {
    plan_id: number;
    round_id: number;
    plan_code: string;
    current_version_id: number;
    version_id: number;
    version_no: number;
    source_version_id: number | null;
    status: string;
    revision_no: number;
    is_current: boolean;
    input_snapshot_id: number;
    snapshot_schema_version: number;
    snapshot_content_hash: string;
    source_revision_token: string;
    live_source_revision_token: string;
    snapshot_fresh: boolean;
    optimization_config_id: number;
    rule_set_version_id: number;
    captured_at: string;
    created_by: number;
    created_at: string;
    demand_count: number;
    locked_count: number;
};
export type VersionContext = Pick<
    PlanVersion,
    | 'version_id'
    | 'revision_no'
    | 'input_snapshot_id'
    | 'source_revision_token'
    | 'snapshot_fresh'
> & { current_version: boolean };
export type AssignmentRow = {
    id: number;
    demand_id: number;
    class_id: number;
    class_name: string;
    subject_id: number;
    subject_name: string;
    demand_type: DemandType;
    periods_per_week: number;
    valid_from: string;
    valid_to: string;
    teacher_id: number | null;
    teacher_name: string | null;
    locked: boolean;
    locked_by: number | null;
    locked_at: string | null;
    lock_reason: string | null;
    unassigned_reason_code: string | null;
    unassigned_reason_text: string | null;
};
export type AssignmentFilters = {
    teacher_id?: number;
    class_id?: number;
    demand_type?: DemandType;
    is_locked?: boolean;
    unassigned?: boolean;
    valid_on?: string;
    limit?: number;
    offset?: number;
};
export type AssignmentPage = {
    version: VersionContext;
    total: number;
    limit: number;
    offset: number;
    items: AssignmentRow[];
};
export type WorkloadRow = {
    teacher_id: number;
    teacher_name: string;
    b: number;
    f: number;
    a: number;
    c: number;
    r: number;
    q: number | null;
    w: number;
    t: number;
    delta_t: number | null;
    under: number | null;
    over: number | null;
    target_applicable: boolean;
    checks: {
        br_code: string;
        subject_type: string;
        subject_ref: string;
        calculation_period: string;
        result_status: string;
        severity: string;
        missing_data: string[];
        message: string;
        details: Record<string, unknown>;
    }[];
};
export type WorkloadPage = {
    version: VersionContext;
    total: number;
    limit: number;
    offset: number;
    items: WorkloadRow[];
    coverage: { required: number; assigned: number; unassigned: number };
    overall_status: string;
    warnings: string[];
};
export type PlanConfiguration = {
    optimization_config_id: number;
    rule_set_version_id: number;
};
export type RefreshPlanRequest = PlanConfiguration & {
    expected_revision: number;
};
export type AssignmentChange = {
    expected_revision: number;
    teacher_id: number | null;
    change_reason: string;
    unassigned_reason_code?: string;
    unassigned_reason_text?: string;
};
export type AssignmentLock = { expected_revision: number; reason: string };
export type AssignmentBatchLock = AssignmentLock &
    (
        | { assignment_ids: number[]; class_id?: never; subject_id?: never }
        | { class_id: number; subject_id: number; assignment_ids?: never }
    );
export type AssignmentMutation = {
    version: VersionContext;
    matched_count: number;
    changed_count: number;
    items: AssignmentRow[];
};

export type WorkloadFilters = {
    teacher_id?: number;
    limit?: number;
    offset?: number;
};

export type SolverRunStatus =
    | 'QUEUED'
    | 'RUNNING'
    | 'CANCEL_REQUESTED'
    | 'SUCCEEDED'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
    | string;

export type ValidationStatus =
    'PASS' | 'VIOLATION' | 'INSUFFICIENT_DATA' | string;

export type SolverStageSummary = {
    name: 'Z' | 'L1' | 'M' | 'experience' | 'change' | string;
    status: string;
    elapsed_ms: number | null;
    stop_reason: string | null;
    exactOptimalityProven: boolean;
    gap_tolerance: number | null;
    objective: number | null;
    best_bound: number | null;
};

export type SolverCoverageMetrics = {
    totalComponents?: number;
    assignedComponents?: number;
    unassignedComponents?: number;
    totalPeriods?: number;
    assignedPeriods?: number;
    missingPeriods?: number;
    totalGroups?: number;
    completeGroups?: number;
    incompleteGroups?: number;
    loadDeviation?: number;
    experiencePenalty?: number;
    changes?: number;
    addedDemands?: number;
    removedDemands?: number;
    coverageObjective?: number;
    softObjective?: number;
    fullCoverageImpossibleProven?: boolean;
    maxLoadDeviation?: number;
    objectiveVector?: number[];
};

export type SolverRunSummary = {
    contract_version: number;
    ortools_version?: string;
    random_seed?: number;
    num_workers?: number;
    total_budget_seconds?: number;
    cp_sat_status: string | null;
    termination_reason: string | null;
    apply_outcome:
        | 'APPLIED'
        | 'STALE'
        | 'NOT_DRAFT'
        | 'REJECTED'
        | 'FAILED'
        | 'NO_CANDIDATE'
        | 'CANCELLED'
        | string
        | null;
    post_validation_status?: ValidationStatus | null;
    applied_revision_no?: number | null;
    apply_ms?: number | null;
    demo_only: boolean;
    illustrative_workload_rules: boolean;
    config_hash: string | null;
    stages: SolverStageSummary[];
    coverage?: {
        optimality_proven: boolean;
        metrics?: SolverCoverageMetrics;
    } | null;
};

export type SolverRunDto = {
    id: number;
    version_id: number;
    base_revision: number;
    requested_by: number;
    status: SolverRunStatus;
    queued_at: string;
    execution_started_at: string | null;
    finished_at: string | null;
    cancellation_requested_at: string | null;
    preparation_ms: number | null;
    solve_ms: number | null;
    archive_write_ms: number | null;
    failure_code: string | null;
    input_hash: string | null;
    input_fresh: boolean;
    applied_revision_no: number | null;
    apply_ms: number | null;
    summary: SolverRunSummary | null;
};

export type StartSolverRunRequest = {
    expected_revision: number;
    optimization_config_id: number;
    rule_set_version_id: number;
};

export type SolverRunAccepted = SolverRunDto & {
    location: string | null;
};

export type OptimizationView = {
    version: VersionContext;
    latest_run_id: number | null;
    run: SolverRunDto | null;
    matches_version: boolean;
    configuration: Record<string, unknown> | null;
    objective_vector: number[] | null;
    warnings: string[];
};

export type ValidationFinding = {
    br_code: string;
    subject_type: string;
    subject_ref: string;
    calculation_period: string;
    result_status: ValidationStatus;
    severity: 'ERROR' | 'WARNING' | 'INFO' | string;
    missing_data: string[];
    message: string;
    details: Record<string, unknown> | null;
};

export type ValidationReport = {
    id: number;
    version_id: number;
    revision_no: number;
    input_snapshot_id: number;
    source_revision_token: string;
    checked_at: string;
    checked_by: number | null;
    overall_status: ValidationStatus;
    fresh: boolean;
    validator_version: string;
    results: ValidationFinding[];
    workloads: WorkloadRow[];
    summary: {
        contract_version: number;
        illustrative_rules: boolean;
        finding_count: number;
        coverage: { required: number; assigned: number; unassigned: number };
        warnings: string[];
    };
};

export type ValidatePlanRequest = {
    expected_revision: number;
};

/** Mock-only snapshot metadata for candidates; not a backend endpoint/eligibility proof. */
export type WorkspaceTeacher = {
    id: number;
    full_name: string;
    teacher_code: string;
    subjects: { id: number; name: string }[];
    portrait_key: number;
    color_index: number;
    base_norm: number;
    weekly_limit: number;
    fixed: number;
    converted: number;
    reduced: number;
    valid_from: string;
    valid_to: string;
};
export type SolverRunDiffItem = {
    row_id: number;
    class_name: string;
    subject_name: string;
    demand_type: DemandType;
    periods_per_week: number;
    before_teacher_id: number | null;
    before_teacher_name: string | null;
    after_teacher_id: number | null;
    after_teacher_name: string | null;
    reason_code: string | null;
    reason_text: string | null;
};
export type PlanWorkspace = {
    context_label: string;
    teachers: WorkspaceTeacher[];
    versions: PlanVersion[];
    row_count: number;
    assigned_count: number;
    locked_count: number;
    starts_on: string;
    ends_on: string;
    solver_runs?: SolverRunDto[];
    solver_diffs?: Record<number, SolverRunDiffItem[]>;
};
