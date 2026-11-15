import { useQuery } from '@tanstack/react-query';
import { readOverviewDashboard } from './api';

export const overviewQueryKey = (contextId: string) =>
    ['overview', contextId] as const;

export function useOverviewQuery(contextId: string, enabled = true) {
    return useQuery({
        queryKey: overviewQueryKey(contextId),
        queryFn: ({ signal }) => readOverviewDashboard(contextId, signal),
        enabled,
    });
}
