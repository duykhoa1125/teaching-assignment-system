import { retainScopedList } from '@/shared/query/retain-scoped-list';
import { invalidatePlanQueries } from '../workspace/invalidate-plan-queries';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogsApi } from './api';
import type {
    AcademicYearFilters,
    AcademicYearRequest,
    AssignmentRoundFilters,
    AssignmentRoundRequest,
    EducationLevelRequest,
    GradeFilters,
    GradeRequest,
    SchoolClassFilters,
    SchoolClassRequest,
    SemesterFilters,
    SemesterRequest,
    SubjectFilters,
    SubjectRequest,
} from './types';

export const catalogKeys = {
    all: ['catalogs'] as const,
    academicYears: (filters: AcademicYearFilters = {}) =>
        ['catalogs', 'academic-years', filters] as const,
    semesters: (filters: SemesterFilters = {}) =>
        ['catalogs', 'semesters', filters] as const,
    educationLevels: (filters: { limit?: number; offset?: number } = {}) =>
        ['catalogs', 'education-levels', filters] as const,
    grades: (filters: GradeFilters = {}) =>
        ['catalogs', 'grades', filters] as const,
    classes: (filters: SchoolClassFilters = {}) =>
        ['catalogs', 'classes', filters] as const,
    subjects: (filters: SubjectFilters = {}) =>
        ['catalogs', 'subjects', filters] as const,
    rounds: (filters: AssignmentRoundFilters = {}) =>
        ['catalogs', 'rounds', filters] as const,
};

export function useAcademicYearsQuery(filters: AcademicYearFilters = {}) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.academicYears(filters),
        queryFn: ({ signal }) => catalogsApi.listAcademicYears(filters, signal),
    });
}

export function useSemestersQuery(filters: SemesterFilters = {}) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.semesters(filters),
        queryFn: ({ signal }) => catalogsApi.listSemesters(filters, signal),
    });
}

export function useEducationLevelsQuery(
    filters: { limit?: number; offset?: number } = { limit: 50, offset: 0 },
) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.educationLevels(filters),
        queryFn: ({ signal }) =>
            catalogsApi.listEducationLevels(filters, signal),
    });
}

export function useGradesQuery(filters: GradeFilters = {}) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.grades(filters),
        queryFn: ({ signal }) => catalogsApi.listGrades(filters, signal),
    });
}

export function useClassesQuery(filters: SchoolClassFilters = {}) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.classes(filters),
        queryFn: ({ signal }) => catalogsApi.listClasses(filters, signal),
    });
}

export function useSubjectsQuery(filters: SubjectFilters = {}) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.subjects(filters),
        queryFn: ({ signal }) => catalogsApi.listSubjects(filters, signal),
    });
}

export function useAssignmentRoundsQuery(filters: AssignmentRoundFilters = {}) {
    return useQuery({
        placeholderData: retainScopedList(filters, [
            'school_id',
            'academic_year_id',
            'semester_id',
        ]),
        queryKey: catalogKeys.rounds(filters),
        queryFn: ({ signal }) => catalogsApi.listRounds(filters, signal),
    });
}

export function useSaveSubjectMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: SubjectRequest;
        }) =>
            id === undefined
                ? catalogsApi.createSubject(payload)
                : catalogsApi.updateSubject(id, payload),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteSubjectMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteSubject(id),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
            ]);
        },
    });
}

export function useSaveClassMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: SchoolClassRequest;
        }) =>
            id === undefined
                ? catalogsApi.createClass(payload)
                : catalogsApi.updateClass(id, payload),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteClassMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteClass(id),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
            ]);
        },
    });
}

export function useSaveGradeMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: GradeRequest;
        }) =>
            id === undefined
                ? catalogsApi.createGrade(payload)
                : catalogsApi.updateGrade(id, payload),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
            ]);
        },
    });
}

export function useDeleteGradeMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteGrade(id),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: catalogKeys.all });
        },
    });
}

export function useSaveEducationLevelMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: EducationLevelRequest;
        }) =>
            id === undefined
                ? catalogsApi.createEducationLevel(payload)
                : catalogsApi.updateEducationLevel(id, payload),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: catalogKeys.all });
        },
    });
}

export function useDeleteEducationLevelMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteEducationLevel(id),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: catalogKeys.all });
        },
    });
}

export function useSaveAcademicYearMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: AcademicYearRequest;
        }) =>
            id === undefined
                ? catalogsApi.createAcademicYear(payload)
                : catalogsApi.updateAcademicYear(id, payload),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: catalogKeys.all });
        },
    });
}

export function useDeleteAcademicYearMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteAcademicYear(id),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: catalogKeys.all });
        },
    });
}

export function useSaveSemesterMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: SemesterRequest;
        }) =>
            id === undefined
                ? catalogsApi.createSemester(payload)
                : catalogsApi.updateSemester(id, payload),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
            ]);
        },
    });
}

export function useDeleteSemesterMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteSemester(id),
        onSuccess: async () => {
            await client.invalidateQueries({ queryKey: catalogKeys.all });
        },
    });
}

export function useSaveAssignmentRoundMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id?: number;
            payload: AssignmentRoundRequest;
        }) =>
            id === undefined
                ? catalogsApi.createRound(payload)
                : catalogsApi.updateRound(id, payload),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
                client.invalidateQueries({ queryKey: ['overview'] }),
            ]);
        },
    });
}

export function useDeleteAssignmentRoundMutation() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => catalogsApi.deleteRound(id),
        onSuccess: async () => {
            await Promise.all([
                client.invalidateQueries({ queryKey: catalogKeys.all }),
                invalidatePlanQueries(client),
            ]);
        },
    });
}
