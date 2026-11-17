import type { OverviewTeacherLoad } from '@/features/overview/types';
import type { WorkspaceContext } from '@/features/workspace/types';

export type AuthRole = 'admin' | 'manager' | 'teacher';

export type AccountStatus = 'active' | 'locked';

export type AuthAccount = {
    id: string;
    login: string;
    name: string;
    roles: AuthRole[];
    status: AccountStatus;
    school: string | null;
    portraitId?: 'manager' | number;
    teacherId?: number;
    grades?: string[];
    from?: string;
    to?: string;
};

export type MockSessionRecord = {
    accountId: string;
    role: AuthRole;
    lastActivity: number;
};

export type LoginRequest = {
    login: string;
    password: string;
};

export type LoginResponse =
    | {
          status: 'authenticated';
          account: AuthAccount;
          session: MockSessionRecord;
      }
    | {
          status: 'choose_role';
          account: AuthAccount;
      }
    | {
          status: 'locked';
          account: AuthAccount;
      };

export type SessionInfoResponse = {
    account: AuthAccount;
    role: AuthRole;
    contexts: WorkspaceContext[];
};

export type AdminAuditPreview = {
    id: string;
    at: string;
    actor: string;
    role: string;
    action: string;
    object: string;
    result: string;
};

export type AdminOverviewResponse = {
    context_id: string;
    context_title: string;
    round: string;
    academic_year: string;
    phase: string;
    plan_version: number;
    accounts: AuthAccount[];
    stats: {
        accounts_total: number;
        accounts_active: number;
        accounts_locked: number;
        teachers_count: number;
        subjects_count: number;
        departments_count: number;
        classes_count: number;
        periods_count: number;
    };
    role_counts: Record<AuthRole, number>;
    recent_audit: AdminAuditPreview[];
};

export type TeacherFeedbackSummary = {
    id: string;
    title: string;
    detail: string;
    status: 'PENDING' | 'RESOLVED';
    updated_at: string;
    feedback_type?: 'GENERAL' | 'ASSIGNMENT' | 'REQUEST_SUBJECT_TOTAL';
    version_no?: number;
    subject?: string | null;
    desired_total?: number | null;
    demand_id?: number | null;
    source_id?: string | null;
    decision?: 'ACCEPTED' | 'DECLINED' | null;
    result?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    result_version?: number | null;
};

export type TeacherReleasedVersionOption = {
    id: string;
    version_no: number;
    revision_no: number;
    at: string;
    phase: string;
    annual_warning: string | null;
};

export type TeacherPersonalOverviewResponse = {
    context_id: string;
    context_title: string;
    round: string;
    academic_year: string;
    phase:
        | 'DRAFT'
        | 'OPEN_FOR_FEEDBACK'
        | 'FEEDBACK_PROCESSING'
        | 'READY_TO_EXPORT'
        | 'EXPORTED';
    feedback_due_at: string | null;
    version_no?: number;
    revision_no?: number;
    released_versions?: TeacherReleasedVersionOption[];
    selected_release_id?: string | null;
    annual_warning?: string | null;
    teacher: OverviewTeacherLoad | null;
    feedback_items: TeacherFeedbackSummary[];
    resolved_feedback_count: number;
};

export type ForbiddenTarget = {
    title: string;
    requestedRole?: AuthRole | null;
    targetPath?: string | null;
};
