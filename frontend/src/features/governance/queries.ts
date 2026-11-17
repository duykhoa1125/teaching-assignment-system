import { keepPreviousData } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { governanceApi } from './api';
import { invalidatePlanQueries } from '../workspace/invalidate-plan-queries';
import type {
    ExportDocumentRecord,
    FeedbackDecision,
    PlanSnapshot,
    SaveAliasRequest,
    SaveRuleRequest,
    SaveSourceRequest,
    TeacherFeedbackSubmitRequest,
} from './types';

export const governanceKeys = {
    all: ['governance'] as const,
    overview: (contextId: string) =>
        ['governance', 'overview', contextId] as const,
    rules: ['governance', 'rules'] as const,
    sources: ['governance', 'sources'] as const,
    audit: (filters?: { q?: string; from?: string; to?: string }) =>
        ['governance', 'audit', filters ?? {}] as const,
};

function useInvalidateGovernance() {
    const client = useQueryClient();
    return () => invalidatePlanQueries(client);
}

export function useGovernanceOverviewQuery(contextId: string, enabled = true) {
    return useQuery({
        queryKey: governanceKeys.overview(contextId),
        queryFn: ({ signal }) => governanceApi.overview(contextId, signal),
        enabled,
    });
}

export function useOpenFeedbackMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            contextId: string;
            due: string;
            actorName?: string;
        }) =>
            governanceApi.openFeedback(vars.contextId, {
                due: vars.due,
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useCloseFeedbackMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            contextId: string;
            reason: string;
            actorName?: string;
        }) =>
            governanceApi.closeFeedback(vars.contextId, {
                reason: vars.reason,
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useResolveFeedbackMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            feedbackId: number;
            contextId: string;
            decision: FeedbackDecision;
            result: string;
            actorName?: string;
        }) =>
            governanceApi.resolveFeedback(vars.feedbackId, {
                context_id: vars.contextId,
                decision: vars.decision,
                result: vars.result,
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useSubmitTeacherFeedbackMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (payload: TeacherFeedbackSubmitRequest) =>
            governanceApi.submitTeacherFeedback(payload),
        onSuccess: invalidate,
    });
}

export function useCreateNextDraftMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: { contextId: string; actorName?: string }) =>
            governanceApi.createNextDraft(vars.contextId, {
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useMarkPlanReadyMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            contextId: string;
            reason: string;
            actorName?: string;
        }) =>
            governanceApi.markReady(vars.contextId, {
                reason: vars.reason,
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useSaveSnapshotMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            contextId: string;
            title?: string;
            actorName?: string;
        }) =>
            governanceApi.saveSnapshot(vars.contextId, {
                title: vars.title,
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useRestoreSnapshotMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            contextId: string;
            snapshotId: string;
            actorName?: string;
        }) =>
            governanceApi.restoreSnapshot(vars.contextId, vars.snapshotId, {
                actor_name: vars.actorName,
            }),
        onSuccess: invalidate,
    });
}

export function useIssueDocumentMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation<
        ExportDocumentRecord,
        Error,
        {
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
        }
    >({
        mutationFn: (payload) => governanceApi.issueDocument(payload),
        onSuccess: invalidate,
    });
}

export function useRulesQuery(enabled = true) {
    return useQuery({
        queryKey: governanceKeys.rules,
        queryFn: ({ signal }) => governanceApi.rules(signal),
        enabled,
    });
}

export function useSaveRuleMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            id?: string | null;
            payload: SaveRuleRequest & { actor_name?: string };
        }) => governanceApi.saveRule(vars.payload, vars.id),
        onSuccess: invalidate,
    });
}

export function useSourcesQuery(enabled = true) {
    return useQuery({
        queryKey: governanceKeys.sources,
        queryFn: ({ signal }) => governanceApi.sources(signal),
        enabled,
    });
}

export function useSaveSourceMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (vars: {
            id?: string | null;
            payload: SaveSourceRequest;
        }) => governanceApi.saveSource(vars.payload, vars.id),
        onSuccess: invalidate,
    });
}

export function useSaveAliasMutation() {
    const invalidate = useInvalidateGovernance();
    return useMutation({
        mutationFn: (payload: SaveAliasRequest) =>
            governanceApi.saveAlias(payload),
        onSuccess: invalidate,
    });
}

export function useGovernanceAuditQuery(
    filters?: { q?: string; from?: string; to?: string },
    enabled = true,
) {
    return useQuery({
        placeholderData: keepPreviousData,
        queryKey: governanceKeys.audit(filters),
        queryFn: ({ signal }) => governanceApi.audit(filters, signal),
        enabled,
    });
}
