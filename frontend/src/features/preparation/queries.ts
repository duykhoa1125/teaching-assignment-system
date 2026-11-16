import { invalidatePlanQueries } from '../workspace/invalidate-plan-queries';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/features/catalogs/queries';
import { preparationApi } from './api';
import type {
    ClassSubjectApplicabilityFilters,
    ClassSubjectApplicabilityRequest,
    ReadinessQueryParams,
    RequiredDemandComponentFilters,
    RequiredDemandComponentRequest,
    RoundSubjectScopeFilters,
    RoundSubjectScopeRequest,
    TeachingDemandFilters,
    TeachingDemandRequest,
} from './types';

export const preparationKeys = {
    all: ['preparation'] as const,
    scopes: (filters: RoundSubjectScopeFilters = {}) =>
        ['preparation', 'scopes', filters] as const,
    applicabilities: (filters: ClassSubjectApplicabilityFilters = {}) =>
        ['preparation', 'applicabilities', filters] as const,
    requiredComponents: (filters: RequiredDemandComponentFilters = {}) =>
        ['preparation', 'required-components', filters] as const,
    demands: (filters: TeachingDemandFilters = {}) =>
        ['preparation', 'demands', filters] as const,
    readiness: (roundId: number | null, query: ReadinessQueryParams = {}) =>
        ['preparation', 'readiness', roundId, query] as const,
};

export function useScopesQuery(
    filters: RoundSubjectScopeFilters = {},
    enabled = true,
) {
    return useQuery({
        queryKey: preparationKeys.scopes(filters),
        queryFn: ({ signal }) => preparationApi.listScopes(filters, signal),
        enabled,
    });
}

export function useApplicabilitiesQuery(
    filters: ClassSubjectApplicabilityFilters = {},
    enabled = true,
) {
    return useQuery({
        queryKey: preparationKeys.applicabilities(filters),
        queryFn: ({ signal }) =>
            preparationApi.listApplicabilities(filters, signal),
        enabled,
    });
}

export function useRequiredComponentsQuery(
    filters: RequiredDemandComponentFilters = {},
    enabled = true,
) {
    return useQuery({
        queryKey: preparationKeys.requiredComponents(filters),
        queryFn: ({ signal }) =>
            preparationApi.listRequiredComponents(filters, signal),
        enabled,
    });
}

export function useDemandsQuery(
    filters: TeachingDemandFilters = {},
    enabled = true,
) {
    return useQuery({
        queryKey: preparationKeys.demands(filters),
        queryFn: ({ signal }) => preparationApi.listDemands(filters, signal),
        enabled,
    });
}

export function useRoundReadinessQuery(
    roundId: number | null,
    query: ReadinessQueryParams = {},
    enabled = true,
) {
    return useQuery({
        queryKey: preparationKeys.readiness(roundId, query),
        queryFn: ({ signal }) =>
            preparationApi.readRoundReadiness(roundId!, query, signal),
        enabled: enabled && roundId !== null && roundId > 0,
    });
}

export function useSaveScopeMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: RoundSubjectScopeRequest;
        }) =>
            id === undefined
                ? preparationApi.createScope(payload)
                : preparationApi.updateScope(id, payload),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteScopeMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => preparationApi.deleteScope(id),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useSaveApplicabilityMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: ClassSubjectApplicabilityRequest;
        }) =>
            id === undefined
                ? preparationApi.createApplicability(payload)
                : preparationApi.updateApplicability(id, payload),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteApplicabilityMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => preparationApi.deleteApplicability(id),
        onSuccess: async () => {
            await invalidatePlanQueries(client);
        },
    });
}

export function useSaveRequiredComponentMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: RequiredDemandComponentRequest;
        }) =>
            id === undefined
                ? preparationApi.createRequiredComponent(payload)
                : preparationApi.updateRequiredComponent(id, payload),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteRequiredComponentMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => preparationApi.deleteRequiredComponent(id),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useSaveDemandMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: TeachingDemandRequest;
        }) =>
            id === undefined
                ? preparationApi.createDemand(payload)
                : preparationApi.updateDemand(id, payload),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteDemandMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => preparationApi.deleteDemand(id),
        onSuccess: async () => {
            await Promise.all([
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: catalogKeys.rounds() }),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}
