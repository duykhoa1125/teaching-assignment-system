import { apiRequest } from '@/shared/api/http';
import type { WorkspacePreview } from './types';

// Mock-only layout preview contract. Not a backend endpoint.
export const readWorkspacePreview = (signal?: AbortSignal) =>
    apiRequest<WorkspacePreview>('/mock/layout', { signal });
