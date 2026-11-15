import { apiRequest } from '@/shared/api/http';
import type {
    ClassSubjectApplicability,
    ClassSubjectApplicabilityFilters,
    ClassSubjectApplicabilityRequest,
    ReadinessQueryParams,
    RequiredDemandComponent,
    RequiredDemandComponentFilters,
    RequiredDemandComponentRequest,
    RoundReadinessDto,
    RoundSubjectScope,
    RoundSubjectScopeFilters,
    RoundSubjectScopeRequest,
    TeachingDemand,
    TeachingDemandFilters,
    TeachingDemandRequest,
} from './types';

export const preparationApi = {
    listScopes: (
        filters: RoundSubjectScopeFilters = {},
        signal?: AbortSignal,
    ) =>
        apiRequest<RoundSubjectScope[]>('/round-subject-scopes', {
            query: filters,
            signal,
        }),
    createScope: (payload: RoundSubjectScopeRequest, signal?: AbortSignal) =>
        apiRequest<RoundSubjectScope>('/round-subject-scopes', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateScope: (
        id: number,
        payload: RoundSubjectScopeRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<RoundSubjectScope>(`/round-subject-scopes/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteScope: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/round-subject-scopes/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listApplicabilities: (
        filters: ClassSubjectApplicabilityFilters = {},
        signal?: AbortSignal,
    ) =>
        apiRequest<ClassSubjectApplicability[]>(
            '/class-subject-applicabilities',
            { query: filters, signal },
        ),
    createApplicability: (
        payload: ClassSubjectApplicabilityRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<ClassSubjectApplicability>(
            '/class-subject-applicabilities',
            {
                method: 'POST',
                json: payload,
                signal,
            },
        ),
    updateApplicability: (
        id: number,
        payload: ClassSubjectApplicabilityRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<ClassSubjectApplicability>(
            `/class-subject-applicabilities/${id}`,
            {
                method: 'PUT',
                json: payload,
                signal,
            },
        ),
    deleteApplicability: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/class-subject-applicabilities/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listRequiredComponents: (
        filters: RequiredDemandComponentFilters = {},
        signal?: AbortSignal,
    ) =>
        apiRequest<RequiredDemandComponent[]>('/required-demand-components', {
            query: filters,
            signal,
        }),
    createRequiredComponent: (
        payload: RequiredDemandComponentRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<RequiredDemandComponent>('/required-demand-components', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateRequiredComponent: (
        id: number,
        payload: RequiredDemandComponentRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<RequiredDemandComponent>(
            `/required-demand-components/${id}`,
            {
                method: 'PUT',
                json: payload,
                signal,
            },
        ),
    deleteRequiredComponent: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/required-demand-components/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listDemands: (filters: TeachingDemandFilters = {}, signal?: AbortSignal) =>
        apiRequest<TeachingDemand[]>('/teaching-demands', {
            query: filters,
            signal,
        }),
    createDemand: (payload: TeachingDemandRequest, signal?: AbortSignal) =>
        apiRequest<TeachingDemand>('/teaching-demands', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateDemand: (
        id: number,
        payload: TeachingDemandRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<TeachingDemand>(`/teaching-demands/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteDemand: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/teaching-demands/${id}`, {
            method: 'DELETE',
            signal,
        }),

    readRoundReadiness: (
        roundId: number,
        query: ReadinessQueryParams = {},
        signal?: AbortSignal,
    ) =>
        apiRequest<RoundReadinessDto>(
            `/assignment-rounds/${roundId}/readiness`,
            { query, signal },
        ),
};
