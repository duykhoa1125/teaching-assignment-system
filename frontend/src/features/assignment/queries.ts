import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentApi, readAssignmentRows, readWorkloads } from './api';
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
    SolverRunDto,
    SolverRunStatus,
    StartSolverRunRequest,
    ValidatePlanRequest,
    WorkloadFilters,
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
    loadsFiltered: (
        version: number,
        filters: Omit<WorkloadFilters, 'limit' | 'offset'>,
    ) => ['assignment-workspace', 'loads', version, 'all', filters] as const,
    optimization: (version: number) =>
        ['assignment-workspace', 'optimization', version] as const,
    solverRun: (runId: number) =>
        ['assignment-workspace', 'solver-run', runId] as const,
    validation: (version: number, runId?: number | null) =>
        [
            'assignment-workspace',
            'validation',
            version,
            runId ?? 'latest',
        ] as const,
    workspace: (version: number) =>
        ['assignment-workspace', 'workspace', version] as const,
};

export function isSolverRunActiveStatus(
    status: SolverRunStatus | null | undefined,
): boolean {
    return (
        status === 'QUEUED' ||
        status === 'RUNNING' ||
        status === 'CANCEL_REQUESTED'
    );
}
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
        queryFn: ({ signal }) =>
            assignmentApi.workloads(
                version!,
                { limit: 200, offset: 0 },
                signal,
            ),
        enabled: version !== null,
    });
}
export function useWorkloads(
    version: number | null,
    filters: Omit<WorkloadFilters, 'limit' | 'offset'> = {},
) {
    return useQuery({
        queryKey: assignmentKeys.loadsFiltered(version ?? 0, filters),
        queryFn: ({ signal }) => readWorkloads(version!, filters, signal),
        enabled: version !== null,
    });
}
export function useOptimization(version: number | null) {
    return useQuery({
        queryKey: assignmentKeys.optimization(version ?? 0),
        queryFn: ({ signal }) => assignmentApi.optimization(version!, signal),
        enabled: version !== null,
        retry: (count, error) =>
            count < 1 && !(error instanceof ApiError && error.status < 500),
    });
}
export function usePlanValidation(
    version: number | null,
    validationRunId?: number | null,
) {
    return useQuery({
        queryKey: assignmentKeys.validation(version ?? 0, validationRunId),
        queryFn: ({ signal }) =>
            assignmentApi.validation(version!, validationRunId, signal),
        enabled: version !== null,
        retry: (count, error) =>
            count < 1 && !(error instanceof ApiError && error.status < 500),
    });
}
export function useSolverRun(
    runId: number | null,
    onTerminal?: (run: SolverRunDto) => void,
) {
    const client = useQueryClient();
    const settledRef = useRef<string | null>(null);
    const callbackRef = useRef(onTerminal);
    useEffect(() => {
        callbackRef.current = onTerminal;
    }, [onTerminal]);

    const query = useQuery({
        queryKey: assignmentKeys.solverRun(runId ?? 0),
        queryFn: ({ signal }) => assignmentApi.solverRun(runId!, signal),
        enabled: runId !== null,
        retry: (count, error) =>
            count < 1 && !(error instanceof ApiError && error.status < 500),
        refetchIntervalInBackground: false,
        refetchInterval: (current) => {
            if (current.state.error) return false;
            const status = current.state.data?.status;
            if (!status || isSolverRunActiveStatus(status)) {
                return import.meta.env.VITE_DATA_SOURCE === 'mock' ? 500 : 1200;
            }
            return false;
        },
    });

    const data = query.data;
    useEffect(() => {
        if (!data || isSolverRunActiveStatus(data.status)) return;
        const signature = `${data.id}:${data.status}:${data.summary?.apply_outcome ?? ''}:${data.applied_revision_no ?? ''}`;
        if (settledRef.current === signature) return;
        settledRef.current = signature;
        if (data.summary?.apply_outcome === 'APPLIED') {
            void Promise.all([
                client.invalidateQueries({ queryKey: assignmentKeys.all }),
                client.invalidateQueries({ queryKey: ['preparation'] }),
                client.invalidateQueries({ queryKey: ['mock-layout'] }),
                client.invalidateQueries({ queryKey: ['mock-session'] }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        } else {
            void client.invalidateQueries({
                queryKey: assignmentKeys.optimization(data.version_id),
            });
            void client.invalidateQueries({
                queryKey: assignmentKeys.workspace(data.version_id),
            });
        }
        callbackRef.current?.(data);
    }, [client, data]);

    return query;
}
export function useStartSolverRun() {
    const client = useQueryClient();
    return useMutation({
        retry: false,
        mutationFn: ({
            version,
            input,
        }: {
            version: number;
            input: StartSolverRunRequest;
        }) => assignmentApi.startSolverRun(version, input),
        onSuccess: (accepted) => {
            client.setQueryData(
                assignmentKeys.solverRun(accepted.id),
                accepted,
            );
            void client.invalidateQueries({
                queryKey: assignmentKeys.optimization(accepted.version_id),
            });
            void client.invalidateQueries({
                queryKey: assignmentKeys.workspace(accepted.version_id),
            });
        },
    });
}
export function useCancelSolverRun() {
    const client = useQueryClient();
    return useMutation({
        retry: false,
        mutationFn: (runId: number) => assignmentApi.cancelSolverRun(runId),
        onSuccess: (updated) => {
            client.setQueryData(assignmentKeys.solverRun(updated.id), updated);
            void client.invalidateQueries({
                queryKey: assignmentKeys.optimization(updated.version_id),
            });
            void client.invalidateQueries({
                queryKey: assignmentKeys.workspace(updated.version_id),
            });
        },
    });
}
export function useRunValidation() {
    const client = useQueryClient();
    return useMutation({
        retry: false,
        mutationFn: ({
            version,
            input,
        }: {
            version: number;
            input: ValidatePlanRequest;
        }) => assignmentApi.runValidation(version, input),
        onSuccess: async (report) => {
            client.setQueryData(
                assignmentKeys.validation(report.version_id, null),
                report,
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
