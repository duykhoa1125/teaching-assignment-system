export type AcademicYear = {
    id: number;
    school_id: number;
    year_code: string;
    starts_on: string;
    ends_on: string;
};

export type AcademicYearRequest = Omit<AcademicYear, 'id'>;

export type AcademicYearFilters = {
    school_id?: number;
    limit?: number;
    offset?: number;
};

export type Semester = {
    id: number;
    academic_year_id: number;
    semester_no: number;
    starts_on: string;
    ends_on: string;
};

export type SemesterRequest = Omit<Semester, 'id'>;

export type SemesterFilters = {
    academic_year_id?: number;
    limit?: number;
    offset?: number;
};

export type EducationLevel = {
    id: number;
    level_code: string;
    name: string;
};

export type EducationLevelRequest = Omit<EducationLevel, 'id'>;

export type Grade = {
    id: number;
    education_level_id: number;
    grade_code: string;
    name: string;
};

export type GradeRequest = Omit<Grade, 'id'>;

export type GradeFilters = {
    education_level_id?: number;
    limit?: number;
    offset?: number;
};

export type ClassStatus = 'ACTIVE' | 'INACTIVE';

export type SchoolClass = {
    id: number;
    academic_year_id: number;
    grade_id: number;
    class_code: string;
    status: ClassStatus;
};

export type SchoolClassRequest = Omit<SchoolClass, 'id'>;

export type SchoolClassFilters = {
    academic_year_id?: number;
    grade_id?: number;
    status?: ClassStatus | '';
    limit?: number;
    offset?: number;
};

export type Subject = {
    id: number;
    subject_code: string;
    name: string;
    valid_from: string;
    valid_to: string | null;
};

export type SubjectRequest = Omit<Subject, 'id'>;

export type SubjectFilters = {
    subject_code?: string;
    q?: string;
    as_of?: string;
    limit?: number;
    offset?: number;
};

export type AssignmentRoundStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export type AssignmentRound = {
    id: number;
    semester_id: number;
    round_code: string;
    status: AssignmentRoundStatus;
    scope_confirmed_by: number | null;
    scope_confirmed_at: string | null;
    opens_at: string | null;
    closes_at: string | null;
    source_revision_token: string | null;
    source_updated_at: string | null;
};

export type AssignmentRoundRequest = {
    semester_id: number;
    round_code: string;
    status: AssignmentRoundStatus;
    scope_confirmed_by: number | null;
    scope_confirmed_at: string | null;
    opens_at: string | null;
    closes_at: string | null;
};

export type AssignmentRoundFilters = {
    semester_id?: number;
    status?: AssignmentRoundStatus | '';
    limit?: number;
    offset?: number;
};
