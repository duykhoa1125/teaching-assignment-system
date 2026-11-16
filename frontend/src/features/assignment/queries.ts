import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentApi, readAssignmentRows } from './api';
import { ApiError } from '@/shared/api/http';
import type {
    AssignmentBatchLock,
    AssignmentChange,
    AssignmentFilters,
    AssignmentLock,
    AssignmentMutation,
    PlanConfiguration,
    PlanVersion,
    RefreshPlanRequest,
} from './types';

export const assignmentKeys = {
    all: ['assignment-workspace'] as const,
    plan: (round: number) => ['assignment-workspace', 'plan', round] as const,
    version: (version: number) =>
        ['assignment-workspace', 'version', version] as const,
    rows: (version: number, filters: AssignmentFilters) =>
        ['assignment-workspace', 'rows', version, filters] as const,
    loads: (version: number) =>
        ['assignment-workspace', 'loads', version] as const,
    workspace: (version: number) =>
        ['assignment-workspace', 'workspace', version] as const,
};
export function useCurrentPlan(round: number | null) {
    const client = useQueryClient();
    const query = useQuery({
        queryKey: assignmentKeys.plan(round ?? 0),
        queryFn: ({ signal }) => assignmentApi.current(round!, signal),
        enabled: round !== null,
        retry: (count, error) =>
            count < 1 && !(error instanceof ApiError && error.status < 500),
    });
    useEffect(() => {
        if (!query.dataUpdatedAt) return;
        void client.invalidateQueries({ queryKey: ['mock-layout'] });
        void client.invalidateQueries({ queryKey: ['mock-session'] });
        void client.invalidateQueries({ queryKey: ['overview'] });
    }, [client, query.dataUpdatedAt]);
    return query;
}
export function usePlanVersion(id: number | null) {
    return useQuery({
        queryKey: assignmentKeys.version(id ?? 0),
        queryFn: ({ signal }) => assignmentApi.version(id!, signal),
        enabled: id !== null,
    });
}
export function useAssignmentRows(
    version: number | null,
    filters: AssignmentFilters,
) {
    return useQuery({
        queryKey: assignmentKeys.rows(version ?? 0, filters),
        queryFn: ({ signal }) => readAssignmentRows(version!, filters, signal),
        enabled: version !== null,
    });
}
export function useAssignmentLoads(version: number | null) {
    return useQuery({
        queryKey: assignmentKeys.loads(version ?? 0),
        queryFn: ({ signal }) => assignmentApi.workloads(version!, signal),
        enabled: version !== null,
    });
}
export function usePlanWorkspace(version: number | null) {
    return useQuery({
        queryKey: assignmentKeys.workspace(version ?? 0),
        queryFn: ({ signal }) => assignmentApi.workspace(version!, signal),
        enabled:
            version !== null && import.meta.env.VITE_DATA_SOURCE === 'mock',
    });
}
export type PlanOperation =
    | { kind: 'create'; round: number; input: PlanConfiguration }
    | { kind: 'refresh'; version: number; input: RefreshPlanRequest }
    | { kind: 'change'; version: number; row: number; input: AssignmentChange }
    | {
          kind: 'lock';
          version: number;
          row: number;
          locked: boolean;
          input: AssignmentLock;
      }
    | {
          kind: 'batch';
          version: number;
          locked: boolean;
          input: AssignmentBatchLock;
      };

export function usePlanOperation() {
    const client = useQueryClient();
    return useMutation({
        retry: false,
        mutationFn: (
            operation: PlanOperation,
        ): Promise<PlanVersion | AssignmentMutation> => {
            switch (operation.kind) {
                case 'create':
                    return assignmentApi.create(
                        operation.round,
                        operation.input,
                    );
                case 'refresh':
                    return assignmentApi.refresh(
                        operation.version,
                        operation.input,
                    );
                case 'change':
                    return assignmentApi.change(
                        operation.version,
                        operation.row,
                        operation.input,
                    );
                case 'lock':
                    return assignmentApi.lock(
                        operation.version,
                        operation.row,
                        operation.locked,
                        operation.input,
                    );
                case 'batch':
                    return assignmentApi.batch(
                        operation.version,
                        operation.locked,
                        operation.input,
                    );
            }
        },
        onSuccess: async (result) => {
            // Only server-returned revision metadata is accepted. No optimistic browser increments.
            if ('version' in result) {
                client.setQueriesData<PlanVersion>(
                    { queryKey: assignmentKeys.all },
                    (previous) => {
                        if (
                            !previous ||
                            previous.version_id !== result.version.version_id ||
                            !('plan_id' in previous)
                        )
                            return previous;
                        return {
                            ...previous,
                            revision_no: result.version.revision_no,
                            input_snapshot_id: result.version.input_snapshot_id,
                            source_revision_token:
                                result.version.source_revision_token,
                            snapshot_fresh: result.version.snapshot_fresh,
                            is_current: result.version.current_version,
                        };
                    },
                );
            } else
                client.setQueryData(
                    assignmentKeys.plan(result.round_id),
                    result,
                );
            await Promise.all([
                client.invalidateQueries({ queryKey: assignmentKeys.all }),
                client.invalidateQueries({ queryKey: ['preparation'] }),
                client.invalidateQueries({ queryKey: ['mock-layout'] }),
                client.invalidateQueries({ queryKey: ['mock-session'] }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}
