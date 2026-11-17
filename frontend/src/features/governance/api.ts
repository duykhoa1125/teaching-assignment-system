import { apiRequest } from '@/shared/api/http';
import type {
    AliasRecord,
    ExportDocumentRecord,
    FeedbackDecision,
    FeedbackItem,
    GovernanceAuditRecord,
    GovernanceOverviewResponse,
    PlanSnapshot,
    RuleRecord,
    SaveAliasRequest,
    SaveRuleRequest,
    SaveSourceRequest,
    SourceEvidenceRecord,
    SourcesBundleResponse,
    TeacherFeedbackSubmitRequest,
} from './types';

// Mock-only FE-08 lifecycle, feedback, snapshot history, export documents, rules, sources & audit APIs.
// Planned endpoints under /mock/governance/* replace LayoutPlaceholder cleanly without claiming backend support.
export const governanceApi = {
    overview: (contextId: string, signal?: AbortSignal) =>
        apiRequest<GovernanceOverviewResponse>('/mock/governance/overview', {
            query: { context_id: contextId },
            signal,
        }),
    openFeedback: (
        contextId: string,
        payload: { due: string; actor_name?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<GovernanceOverviewResponse>(
            '/mock/governance/feedback/open',
            {
                method: 'POST',
                json: { context_id: contextId, ...payload },
                signal,
            },
        ),
    closeFeedback: (
        contextId: string,
        payload: { reason: string; actor_name?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<GovernanceOverviewResponse>(
            '/mock/governance/feedback/close',
            {
                method: 'POST',
                json: { context_id: contextId, ...payload },
                signal,
            },
        ),
    resolveFeedback: (
        feedbackId: number,
        payload: {
            context_id: string;
            decision: FeedbackDecision;
            result: string;
            actor_name?: string;
        },
        signal?: AbortSignal,
    ) =>
        apiRequest<FeedbackItem>(
            `/mock/governance/feedback/${feedbackId}/resolve`,
            {
                method: 'POST',
                json: payload,
                signal,
            },
        ),
    submitTeacherFeedback: (
        payload: TeacherFeedbackSubmitRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<FeedbackItem>('/mock/teacher/feedback', {
            method: 'POST',
            json: payload,
            signal,
        }),
    createNextDraft: (
        contextId: string,
        payload?: { actor_name?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<GovernanceOverviewResponse>(
            '/mock/governance/versions/next',
            {
                method: 'POST',
                json: { context_id: contextId, ...(payload ?? {}) },
                signal,
            },
        ),
    markReady: (
        contextId: string,
        payload: { reason: string; actor_name?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<GovernanceOverviewResponse>(
            '/mock/governance/versions/ready',
            {
                method: 'POST',
                json: { context_id: contextId, ...payload },
                signal,
            },
        ),
    saveSnapshot: (
        contextId: string,
        payload?: { title?: string; actor_name?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<PlanSnapshot>('/mock/governance/snapshots', {
            method: 'POST',
            json: { context_id: contextId, ...(payload ?? {}) },
            signal,
        }),
    restoreSnapshot: (
        contextId: string,
        snapshotId: string,
        payload?: { actor_name?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<GovernanceOverviewResponse>(
            `/mock/governance/snapshots/${snapshotId}/restore`,
            {
                method: 'POST',
                json: { context_id: contextId, ...(payload ?? {}) },
                signal,
            },
        ),
    issueDocument: (
        payload: {
            context_id: string;
            mode: 'teachers' | 'classes';
            filename: string;
            bytes: number;
            sha256: string;
            source_token: string;
            base_revision: number;
            validation_id: string;
            pdf_base64: string;
            snapshot: PlanSnapshot;
            actor_name?: string;
        },
        signal?: AbortSignal,
    ) =>
        apiRequest<ExportDocumentRecord>('/mock/governance/documents/issue', {
            method: 'POST',
            json: payload,
            signal,
        }),
    rules: (signal?: AbortSignal) =>
        apiRequest<RuleRecord[]>('/mock/governance/rules', { signal }),
    saveRule: (
        payload: SaveRuleRequest & { actor_name?: string },
        id?: string | null,
        signal?: AbortSignal,
    ) =>
        apiRequest<RuleRecord>(
            id ? `/mock/governance/rules/${id}` : '/mock/governance/rules',
            {
                method: 'POST',
                json: payload,
                signal,
            },
        ),
    sources: (signal?: AbortSignal) =>
        apiRequest<SourcesBundleResponse>('/mock/governance/sources', {
            signal,
        }),
    saveSource: (
        payload: SaveSourceRequest,
        id?: string | null,
        signal?: AbortSignal,
    ) =>
        apiRequest<SourceEvidenceRecord>(
            id ? `/mock/governance/sources/${id}` : '/mock/governance/sources',
            {
                method: 'POST',
                json: payload,
                signal,
            },
        ),
    saveAlias: (payload: SaveAliasRequest, signal?: AbortSignal) =>
        apiRequest<AliasRecord>('/mock/governance/aliases', {
            method: 'POST',
            json: payload,
            signal,
        }),
    audit: (
        filters?: { q?: string; from?: string; to?: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<GovernanceAuditRecord[]>('/mock/governance/audit', {
            query: filters,
            signal,
        }),
};
