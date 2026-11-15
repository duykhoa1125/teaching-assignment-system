import { useQuery } from '@tanstack/react-query';
import { sessionApi } from './api';
import type { AuthRole } from './types';

export const sessionQueryKeys = {
    session: (accountId: string, role: AuthRole, contextId: string) =>
        ['mock-session', accountId, role, contextId] as const,
    adminOverview: (contextId: string) =>
        ['admin-overview', contextId] as const,
    teacherOverview: (contextId: string, teacherId: number) =>
        ['teacher-overview', contextId, teacherId] as const,
};

export function useMockSessionQuery(
    accountId: string | null,
    role: AuthRole | null,
    contextId: string,
    enabled: boolean,
) {
    return useQuery({
        queryKey: sessionQueryKeys.session(
            accountId ?? '',
            role ?? 'manager',
            contextId,
        ),
        queryFn: ({ signal }) =>
            sessionApi.readSession(
                {
                    account_id: accountId ?? '',
                    role: role ?? 'manager',
                    context_id: contextId,
                },
                signal,
            ),
        enabled: enabled && Boolean(accountId && role),
        retry: false,
    });
}

export function useAdminOverviewQuery(contextId: string, enabled = true) {
    return useQuery({
        queryKey: sessionQueryKeys.adminOverview(contextId),
        queryFn: ({ signal }) =>
            sessionApi.readAdminOverview(contextId, signal),
        enabled,
    });
}

export function useTeacherPersonalQuery(
    contextId: string,
    teacherId: number | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: sessionQueryKeys.teacherOverview(contextId, teacherId ?? 0),
        queryFn: ({ signal }) =>
            sessionApi.readTeacherOverview(
                { context_id: contextId, teacher_id: teacherId ?? 0 },
                signal,
            ),
        enabled: enabled && teacherId !== undefined,
    });
}
