import {
    ApiError,
    apiRequest,
    apiRequestWithMeta,
} from '../../shared/api/http.ts';
import type {
    AssignmentBatchLock,
    AssignmentChange,
    AssignmentFilters,
    AssignmentLock,
    AssignmentMutation,
    AssignmentPage,
    OptimizationView,
    PlanConfiguration,
    PlanVersion,
    PlanWorkspace,
    RefreshPlanRequest,
    SolverRunAccepted,
    SolverRunDto,
    StartSolverRunRequest,
    ValidatePlanRequest,
    ValidationReport,
    WorkloadFilters,
    WorkloadPage,
} from './types';

export const assignmentApi = {
    current: (round: number, signal?: AbortSignal) =>
        apiRequest<PlanVersion>(`/assignment-rounds/${round}/plan`, { signal }),
    version: (id: number, signal?: AbortSignal) =>
        apiRequest<PlanVersion>(`/plan-versions/${id}`, { signal }),
    create: (round: number, json: PlanConfiguration) =>
        apiRequest<PlanVersion>(`/assignment-rounds/${round}/plan`, {
            method: 'POST',
            json,
        }),
    refresh: (id: number, json: RefreshPlanRequest) =>
        apiRequest<PlanVersion>(`/plan-versions/${id}/refresh-snapshot`, {
            method: 'POST',
            json,
        }),
    rows: (id: number, query: AssignmentFilters, signal?: AbortSignal) =>
        apiRequest<AssignmentPage>(`/plan-versions/${id}/assignments`, {
            query,
            signal,
        }),
    workloads: (
        id: number,
        query: WorkloadFilters = { limit: 200, offset: 0 },
        signal?: AbortSignal,
    ) =>
        apiRequest<WorkloadPage>(`/plan-versions/${id}/workloads`, {
            query: { limit: 200, offset: 0, ...query },
            signal,
        }),
    optimization: (id: number, signal?: AbortSignal) =>
        apiRequest<OptimizationView>(`/plan-versions/${id}/optimization`, {
            signal,
        }),
    startSolverRun: async (
        id: number,
        json: StartSolverRunRequest,
    ): Promise<SolverRunAccepted> => {
        const response = await apiRequestWithMeta<SolverRunDto>(
            `/plan-versions/${id}/solver-runs`,
            { method: 'POST', json },
        );
        return { ...response.data, location: response.location };
    },
    solverRun: (runId: number, signal?: AbortSignal) =>
        apiRequest<SolverRunDto>(`/solver-runs/${runId}`, { signal }),
    cancelSolverRun: (runId: number) =>
        apiRequest<SolverRunDto>(`/solver-runs/${runId}/cancel`, {
            method: 'POST',
        }),
    validation: (
        id: number,
        validationRunId?: number | null,
        signal?: AbortSignal,
    ) =>
        apiRequest<ValidationReport>(`/plan-versions/${id}/validation`, {
            query: validationRunId
                ? { validation_run_id: validationRunId }
                : undefined,
            signal,
        }),
    runValidation: async (
        id: number,
        json: ValidatePlanRequest,
    ): Promise<ValidationReport> => {
        const response = await apiRequestWithMeta<ValidationReport>(
            `/plan-versions/${id}/validation`,
            { method: 'POST', json },
        );
        return response.data;
    },
    change: (version: number, row: number, json: AssignmentChange) =>
        apiRequest<AssignmentMutation>(
            `/plan-versions/${version}/assignments/${row}`,
            { method: 'PATCH', json },
        ),
    lock: (
        version: number,
        row: number,
        locked: boolean,
        json: AssignmentLock,
    ) =>
        apiRequest<AssignmentMutation>(
            `/plan-versions/${version}/assignments/${row}/${locked ? 'lock' : 'unlock'}`,
            { method: 'POST', json },
        ),
    batch: (version: number, locked: boolean, json: AssignmentBatchLock) =>
        apiRequest<AssignmentMutation>(
            `/plan-versions/${version}/assignments/${locked ? 'locks' : 'unlocks'}`,
            { method: 'POST', json },
        ),
    workspace: (version: number, signal?: AbortSignal) =>
        apiRequest<PlanWorkspace>(`/mock/plan-versions/${version}/workspace`, {
            signal,
        }),
};

/** Read all workload pages for reporting/statistics without mixing snapshots/revisions. */
export async function readWorkloads(
    version: number,
    filters: Omit<WorkloadFilters, 'limit' | 'offset'> = {},
    signal?: AbortSignal,
): Promise<WorkloadPage> {
    const first = await assignmentApi.workloads(
        version,
        { ...filters, offset: 0, limit: 200 },
        signal,
    );
    const items = [...first.items];
    while (items.length < first.total) {
        const page = await assignmentApi.workloads(
            version,
            { ...filters, offset: items.length, limit: 200 },
            signal,
        );
        if (
            !page.items.length ||
            page.total !== first.total ||
            page.version.revision_no !== first.version.revision_no ||
            page.version.input_snapshot_id !==
                first.version.input_snapshot_id ||
            page.version.snapshot_fresh !== first.version.snapshot_fresh
        )
            throw new ApiError(
                409,
                'CONCURRENT_MODIFICATION',
                'Bảng tải đổi trong lúc tải trang; tải lại để có dữ liệu nhất quán.',
            );
        items.push(...page.items);
    }
    return { ...first, items, limit: items.length, offset: 0 };
}

/** Read all filtered pages for matrix/search without mixing revisions or inventing a subject/q backend filter. */
export async function readAssignmentRows(
    version: number,
    filters: AssignmentFilters,
    signal?: AbortSignal,
): Promise<AssignmentPage> {
    const first = await assignmentApi.rows(
        version,
        { ...filters, offset: 0, limit: 200 },
        signal,
    );
    const items = [...first.items];
    while (items.length < first.total) {
        const page = await assignmentApi.rows(
            version,
            { ...filters, offset: items.length, limit: 200 },
            signal,
        );
        if (
            !page.items.length ||
            page.total !== first.total ||
            page.version.revision_no !== first.version.revision_no ||
            page.version.input_snapshot_id !==
                first.version.input_snapshot_id ||
            page.version.snapshot_fresh !== first.version.snapshot_fresh
        )
            throw new ApiError(
                409,
                'CONCURRENT_MODIFICATION',
                'Phương án đổi trong lúc tải các trang; tải lại để có dữ liệu nhất quán.',
            );
        items.push(...page.items);
    }
    return { ...first, items, limit: items.length, offset: 0 };
}
