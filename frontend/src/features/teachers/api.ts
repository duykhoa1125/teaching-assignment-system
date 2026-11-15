import { apiRequest } from '@/shared/api/http';
import type { School, Teacher, TeacherFilters, TeacherRequest } from './types';

export const teachersApi = {
    list: (filters: TeacherFilters = {}, signal?: AbortSignal) =>
        apiRequest<Teacher[]>('/teachers', { query: filters, signal }),
    detail: (id: number, signal?: AbortSignal) =>
        apiRequest<Teacher>(`/teachers/${id}`, { signal }),
    create: (json: TeacherRequest) =>
        apiRequest<Teacher>('/teachers', { method: 'POST', json }),
    update: (id: number, json: TeacherRequest) =>
        apiRequest<Teacher>(`/teachers/${id}`, { method: 'PUT', json }),
    remove: (id: number) =>
        apiRequest<void>(`/teachers/${id}`, { method: 'DELETE' }),
    schools: (signal?: AbortSignal) =>
        apiRequest<School[]>('/schools', { signal }),
};
