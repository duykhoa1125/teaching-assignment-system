import { apiRequest } from '@/shared/api/http';
import type { OverviewDashboard } from './types';

// Mock-only overview aggregate contract. Not a backend endpoint.
export const readOverviewDashboard = (
    contextId: string,
    signal?: AbortSignal,
) =>
    apiRequest<OverviewDashboard>('/mock/overview', {
        query: { context_id: contextId },
        signal,
    });
