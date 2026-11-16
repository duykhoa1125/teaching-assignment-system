import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { teachersApi } from './api';
import { invalidatePlanQueries } from '../workspace/invalidate-plan-queries';
import type { TeacherFilters, TeacherRequest } from './types';

export const teacherQueryKeys = {
    all: ['teachers'] as const,
    lists: () => ['teachers', 'list'] as const,
    list: (filters: TeacherFilters) => ['teachers', 'list', filters] as const,
    details: () => ['teachers', 'detail'] as const,
    detail: (id: number) => ['teachers', 'detail', id] as const,
    schools: ['schools'] as const,
};

export function useSchoolsQuery() {
    return useQuery({
        queryKey: teacherQueryKeys.schools,
        queryFn: ({ signal }) => teachersApi.schools(signal),
    });
}

export function useTeachersListQuery(filters: TeacherFilters) {
    return useQuery({
        queryKey: teacherQueryKeys.list(filters),
        queryFn: ({ signal }) => teachersApi.list(filters, signal),
        placeholderData: keepPreviousData,
    });
}

export function useTeacherDetailQuery(id: number | null) {
    return useQuery({
        queryKey: teacherQueryKeys.detail(id ?? 0),
        queryFn: ({ signal }) => teachersApi.detail(id!, signal),
        enabled: id !== null,
    });
}

export function useSaveTeacherMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: TeacherRequest;
        }) =>
            id === undefined
                ? teachersApi.create(payload)
                : teachersApi.update(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: teacherQueryKeys.all,
            });
            await invalidatePlanQueries(queryClient);
        },
    });
}

export function useDeleteTeacherMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => teachersApi.remove(id),
        onSuccess: async (_, deletedId) => {
            queryClient.removeQueries({
                queryKey: teacherQueryKeys.detail(deletedId),
            });
            await queryClient.invalidateQueries({
                queryKey: teacherQueryKeys.lists(),
            });
            await invalidatePlanQueries(queryClient);
        },
    });
}
