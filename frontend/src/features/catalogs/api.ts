import { apiRequest } from '@/shared/api/http';
import type {
    AcademicYear,
    AcademicYearFilters,
    AcademicYearRequest,
    AssignmentRound,
    AssignmentRoundFilters,
    AssignmentRoundRequest,
    EducationLevel,
    EducationLevelRequest,
    Grade,
    GradeFilters,
    GradeRequest,
    SchoolClass,
    SchoolClassFilters,
    SchoolClassRequest,
    Semester,
    SemesterFilters,
    SemesterRequest,
    Subject,
    SubjectFilters,
    SubjectRequest,
} from './types';

export const catalogsApi = {
    listAcademicYears: (
        filters: AcademicYearFilters = {},
        signal?: AbortSignal,
    ) =>
        apiRequest<AcademicYear[]>('/academic-years', {
            query: filters,
            signal,
        }),
    createAcademicYear: (payload: AcademicYearRequest, signal?: AbortSignal) =>
        apiRequest<AcademicYear>('/academic-years', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateAcademicYear: (
        id: number,
        payload: AcademicYearRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<AcademicYear>(`/academic-years/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteAcademicYear: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/academic-years/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listSemesters: (filters: SemesterFilters = {}, signal?: AbortSignal) =>
        apiRequest<Semester[]>('/semesters', { query: filters, signal }),
    createSemester: (payload: SemesterRequest, signal?: AbortSignal) =>
        apiRequest<Semester>('/semesters', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateSemester: (
        id: number,
        payload: SemesterRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<Semester>(`/semesters/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteSemester: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/semesters/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listEducationLevels: (
        filters: { limit?: number; offset?: number } = {},
        signal?: AbortSignal,
    ) =>
        apiRequest<EducationLevel[]>('/education-levels', {
            query: filters,
            signal,
        }),
    createEducationLevel: (
        payload: EducationLevelRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<EducationLevel>('/education-levels', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateEducationLevel: (
        id: number,
        payload: EducationLevelRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<EducationLevel>(`/education-levels/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteEducationLevel: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/education-levels/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listGrades: (filters: GradeFilters = {}, signal?: AbortSignal) =>
        apiRequest<Grade[]>('/grades', { query: filters, signal }),
    createGrade: (payload: GradeRequest, signal?: AbortSignal) =>
        apiRequest<Grade>('/grades', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateGrade: (id: number, payload: GradeRequest, signal?: AbortSignal) =>
        apiRequest<Grade>(`/grades/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteGrade: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/grades/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listClasses: (filters: SchoolClassFilters = {}, signal?: AbortSignal) =>
        apiRequest<SchoolClass[]>('/classes', { query: filters, signal }),
    createClass: (payload: SchoolClassRequest, signal?: AbortSignal) =>
        apiRequest<SchoolClass>('/classes', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateClass: (
        id: number,
        payload: SchoolClassRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<SchoolClass>(`/classes/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteClass: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/classes/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listSubjects: (filters: SubjectFilters = {}, signal?: AbortSignal) =>
        apiRequest<Subject[]>('/subjects', { query: filters, signal }),
    createSubject: (payload: SubjectRequest, signal?: AbortSignal) =>
        apiRequest<Subject>('/subjects', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateSubject: (
        id: number,
        payload: SubjectRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<Subject>(`/subjects/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteSubject: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/subjects/${id}`, {
            method: 'DELETE',
            signal,
        }),

    listRounds: (filters: AssignmentRoundFilters = {}, signal?: AbortSignal) =>
        apiRequest<AssignmentRound[]>('/assignment-rounds', {
            query: filters,
            signal,
        }),
    createRound: (payload: AssignmentRoundRequest, signal?: AbortSignal) =>
        apiRequest<AssignmentRound>('/assignment-rounds', {
            method: 'POST',
            json: payload,
            signal,
        }),
    updateRound: (
        id: number,
        payload: AssignmentRoundRequest,
        signal?: AbortSignal,
    ) =>
        apiRequest<AssignmentRound>(`/assignment-rounds/${id}`, {
            method: 'PUT',
            json: payload,
            signal,
        }),
    deleteRound: (id: number, signal?: AbortSignal) =>
        apiRequest<void>(`/assignment-rounds/${id}`, {
            method: 'DELETE',
            signal,
        }),
};
