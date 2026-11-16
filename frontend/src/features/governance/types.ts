import type { DemandType } from '../preparation/types';

export type PlanLifecyclePhase =
    | 'DRAFT'
    | 'OPEN_FOR_FEEDBACK'
    | 'FEEDBACK_PROCESSING'
    | 'READY_TO_EXPORT'
    | 'EXPORTED';

export type FeedbackKind = 'GENERAL' | 'ASSIGNMENT' | 'REQUEST_SUBJECT_TOTAL';

export type FeedbackDecision = 'ACCEPTED' | 'DECLINED';

export type FeedbackItem = {
    id: number;
    context_id: string;
    version_no: number;
    round_id: number;
    round_code: string;
    teacher_id: number;
    teacher_name: string;
    teacher_code: string;
    portrait_key: 'manager' | number;
    color_index: number;
    type: FeedbackKind;
    title: string;
    text: string;
    demand_id: number | null;
    subject: string | null;
    desired_total: number | null;
    source_id: string;
    source_revision: number;
    status: 'pending' | 'resolved';
    decision: FeedbackDecision | null;
    result: string;
    resolved_by: string | null;
    resolved_at: string | null;
    result_version: number | null;
    created_at: string;
    created_label: string;
};

export type TeacherFeedbackSubmitRequest = {
    context_id: string;
    teacher_id: number;
    release_id?: string | null;
    type: FeedbackKind;
    title: string;
    text: string;
    demand_id?: number | null;
    subject?: string | null;
    desired_total?: number | null;
};

export type PlanSnapshotTeacherLoad = {
    id: number;
    teacher_code: string;
    full_name: string;
    color_index: number;
    portrait_key: 'manager' | number;
    f: number;
    a: number;
    c: number;
    r: number;
    w: number;
    q: number;
    t: number;
    b: number;
    delta: number;
};

export type PlanSnapshotRow = {
    id: number;
    demand_id: number;
    class_name: string;
    subject_name: string;
    demand_type: DemandType;
    periods_per_week: number;
    valid_from: string;
    valid_to: string;
    teacher_id: number | null;
    teacher_name: string | null;
    locked: boolean;
};

export type PlanSnapshot = {
    id: string;
    context_id: string;
    title: string;
    at: string;
    by: string;
    version_no: number;
    revision_no: number;
    phase: PlanLifecyclePhase;
    round_code: string;
    context_title: string;
    academic_year: string;
    rule_version: string;
    token: string;
    interval: { from: string; to: string };
    is_full: boolean;
    teachers: PlanSnapshotTeacherLoad[];
    rows: PlanSnapshotRow[];
    annual_warning: string | null;
};

export type ExportDocumentRecord = {
    id: string;
    context_id: string;
    at: string;
    by: string;
    filename: string;
    mode: 'teachers' | 'classes';
    bytes: number;
    sha256: string;
    validation_id: string;
    source_token: string;
    base_revision: number;
    pdf_base64: string;
    snapshot: PlanSnapshot;
};

export type GovernanceOverviewResponse = {
    context_id: string;
    round_id: number;
    round_code: string;
    context_title: string;
    academic_year: string;
    phase: PlanLifecyclePhase;
    has_plan: boolean;
    version_id: number | null;
    version_no: number;
    revision_no: number;
    source_version_no: number | null;
    feedback_due_at: string | null;
    no_reopen_reason: string;
    validation_fresh: boolean;
    validation_releasable: boolean;
    validation_annual_warning: string | null;
    validation_id: string | null;
    source_token: string;
    pending_count: number;
    feedback: FeedbackItem[];
    snapshots: PlanSnapshot[];
    documents: ExportDocumentRecord[];
    preview_snapshot: PlanSnapshot | null;
};

export type RuleRecord = {
    id: string;
    code: string;
    name: string;
    expression: string;
    source: string;
    clause: string;
    audience: string;
    version: string;
    from: string;
    to: string;
    value: number;
};

export type SaveRuleRequest = {
    code: string;
    name: string;
    expression: string;
    source: string;
    clause: string;
    audience: string;
    version: string;
    from: string;
    to: string;
    value: number;
};

export type SourceEvidenceStatus = 'PENDING' | 'CONFIRMED';

export type SourceEvidenceRecord = {
    id: string;
    file: string;
    sheet: string;
    cell: string;
    raw: string;
    canonical: string;
    evidence: string;
    status: SourceEvidenceStatus;
    confirmed_by: string | null;
    confirmed_at: string | null;
};

export type SaveSourceRequest = {
    file: string;
    sheet: string;
    cell: string;
    raw: string;
    canonical: string;
    evidence: string;
    status: SourceEvidenceStatus;
    actor_name?: string;
};

export type AliasKind = 'TEACHER' | 'CLASS' | 'SUBJECT';

export type AliasRecord = {
    id: string;
    kind: AliasKind;
    alias: string;
    canonical: string;
    source: string;
    by: string;
    at: string;
};

export type SaveAliasRequest = {
    kind: AliasKind;
    alias: string;
    canonical: string;
    source: string;
    actor_name?: string;
};

export type SourcesBundleResponse = {
    sources: SourceEvidenceRecord[];
    aliases: AliasRecord[];
    canonical_options: {
        teachers: { value: string; label: string }[];
        classes: { value: string; label: string }[];
        subjects: { value: string; label: string }[];
    };
};

export type GovernanceAuditRecord = {
    id: string;
    at: string;
    actor: string;
    role: string;
    action: string;
    object: string;
    result: 'SUCCESS' | 'REJECTED';
    before: unknown;
    after: unknown;
};
