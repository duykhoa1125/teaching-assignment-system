export type Teacher = {
    id: number;
    school_id: number;
    teacher_code: string;
    full_name: string;
};
export type TeacherRequest = Omit<Teacher, 'id'>;
export type TeacherFilters = {
    school_id?: number;
    teacher_code?: string;
    q?: string;
    limit?: number;
    offset?: number;
};
export type School = {
    id: number;
    school_code: string;
    name: string;
    status: string;
};
