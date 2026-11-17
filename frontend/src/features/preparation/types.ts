export type RoundSubjectScope = {
    id: number;
    round_id: number;
    grade_id: number;
    subject_id: number;
    confirmed_by: number | null;
    confirmed_at: string | null;
};

export type RoundSubjectScopeRequest = Omit<RoundSubjectScope, 'id'>;

export type RoundSubjectScopeFilters = {
    round_id?: number;
    grade_id?: number;
    subject_id?: number;
    limit?: number;
    offset?: number;
};

export type ApplicabilityStatus =
    'APPLICABLE' | 'NOT_APPLICABLE' | 'UNDETERMINED';

export type ClassSubjectApplicability = {
    id: number;
    scope_id: number;
    class_id: number;
    status: ApplicabilityStatus;
    reason: string | null;
    updated_by: number | null;
    updated_at: string | null;
    confirmed_by: number | null;
    confirmed_at: string | null;
    components_confirmed_by: number | null;
    components_confirmed_at: string | null;
};

export type ClassSubjectApplicabilityRequest = {
    scope_id: number;
    class_id: number;
    status: ApplicabilityStatus;
    reason: string | null;
    updated_by: number | null;
    confirmed_by: number | null;
    confirmed_at: string | null;
    components_confirmed_by: number | null;
    components_confirmed_at: string | null;
};

export type ClassSubjectApplicabilityFilters = {
    scope_id?: number;
    class_id?: number;
    status?: ApplicabilityStatus | '';
    limit?: number;
    offset?: number;
};

export type DemandType = 'STANDARD' | 'SPECIALIZED_TOPIC' | 'ENRICHMENT';

export type RequiredDemandComponent = {
    id: number;
    applicability_id: number;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
    demand_id: number | null;
    confirmed_by: number | null;
    confirmed_at: string | null;
};

export type RequiredDemandComponentRequest = {
    applicability_id: number;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
    confirmed_by: number | null;
    confirmed_at: string | null;
};

export type RequiredDemandComponentFilters = {
    applicability_id?: number;
    demand_type?: DemandType | '';
    as_of?: string;
    limit?: number;
    offset?: number;
};

export type DemandStatus = 'ACTIVE' | 'INACTIVE';

export type DemandUnit = 'PERIOD_PER_WEEK';

export type TeachingDemand = {
    id: number;
    semester_id: number;
    class_id: number;
    subject_id: number;
    periods_per_week: number;
    status: DemandStatus;
    updated_by: number | null;
    updated_at: string | null;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
    unit: DemandUnit;
};

export type TeachingDemandRequest = {
    semester_id: number;
    class_id: number;
    subject_id: number;
    periods_per_week: number;
    status: DemandStatus;
    updated_by: number | null;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
    unit: DemandUnit;
};

export type TeachingDemandFilters = {
    semester_id?: number;
    class_id?: number;
    subject_id?: number;
    demand_type?: DemandType | '';
    status?: DemandStatus | '';
    as_of?: string;
    limit?: number;
    offset?: number;
};

export type ReadinessSeverity = 'ERROR' | 'WARNING' | 'INFO';

export type ReadinessIssue = {
    code: string;
    severity: ReadinessSeverity;
    category: string;
    entity_type: string | null;
    entity_id: number | null;
    related_id: number | null;
    message: string;
    suggestion: string;
};

export type ReadinessCoverage = {
    required_components: number;
    assigned: number;
    unassigned: number;
    missing_demand: number;
    missing_plan_row: number;
};

export type RoundReadinessDto = {
    round_id: number;
    source_revision_token: string;
    optimization_config_id: number | null;
    rule_set_version_id: number | null;
    starts_on: string;
    ends_on: string;
    current_version_id: number | null;
    revision_no: number | null;
    can_run_solver: boolean;
    can_open_feedback: boolean;
    can_export: boolean;
    preflight_only: boolean;
    solver_input_validated: boolean;
    coverage: ReadinessCoverage;
    issues: ReadinessIssue[];
};

export type ReadinessQueryParams = {
    optimization_config_id?: number;
    rule_set_version_id?: number;
};

export type ConfigOption = {
    id: number;
    code: string;
    name: string;
    detail: string;
};
