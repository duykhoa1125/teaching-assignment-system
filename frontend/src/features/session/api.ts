import { apiRequest } from '@/shared/api/http';
import type {
    AdminOverviewResponse,
    AuthRole,
    LoginRequest,
    LoginResponse,
    SessionInfoResponse,
    TeacherPersonalOverviewResponse,
} from './types';

// Mock-only session and workspace contracts. Backend endpoints for auth are out of scope for FE-04.
export const sessionApi = {
    login: (payload: LoginRequest, signal?: AbortSignal) =>
        apiRequest<LoginResponse>('/mock/auth/login', {
            method: 'POST',
            json: payload,
            signal,
        }),
    selectRole: (
        payload: { accountId: string; role: AuthRole },
        signal?: AbortSignal,
    ) =>
        apiRequest<LoginResponse>('/mock/auth/select-role', {
            method: 'POST',
            json: payload,
            signal,
        }),
    logout: (signal?: AbortSignal) =>
        apiRequest<void>('/mock/auth/logout', {
            method: 'POST',
            signal,
        }),
    readSession: (
        query: { account_id: string; role: AuthRole; context_id: string },
        signal?: AbortSignal,
    ) =>
        apiRequest<SessionInfoResponse>('/mock/session', {
            query,
            signal,
        }),
    readAdminOverview: (contextId: string, signal?: AbortSignal) =>
        apiRequest<AdminOverviewResponse>('/mock/admin/overview', {
            query: { context_id: contextId },
            signal,
        }),
    readTeacherOverview: (
        query: {
            context_id: string;
            teacher_id: number;
            release_id?: string;
        },
        signal?: AbortSignal,
    ) =>
        apiRequest<TeacherPersonalOverviewResponse>('/mock/teacher/overview', {
            query,
            signal,
        }),
};
