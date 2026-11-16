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
} from '../features/catalogs/types.ts';
import {
    OPTIMIZATION_CONFIG_OPTIONS,
    RULE_SET_VERSION_OPTIONS,
    intervalsOverlap,
    validatePeriodsPerWeek,
} from '../features/preparation/model.ts';
import type {
    ClassSubjectApplicability,
    ClassSubjectApplicabilityFilters,
    ClassSubjectApplicabilityRequest,
    ReadinessIssue,
    ReadinessQueryParams,
    RequiredDemandComponent,
    RequiredDemandComponentFilters,
    RequiredDemandComponentRequest,
    RoundReadinessDto,
    RoundSubjectScope,
    RoundSubjectScopeFilters,
    RoundSubjectScopeRequest,
    TeachingDemand,
    TeachingDemandFilters,
    TeachingDemandRequest,
} from '../features/preparation/types.ts';
import { schools } from './fixtures/index.ts';
import {
    preparationAcademicYears,
    preparationApplicabilities,
    preparationClasses,
    preparationDemands,
    preparationEducationLevels,
    preparationGrades,
    preparationRequiredComponents,
    preparationRounds,
    preparationScopes,
    preparationSemesters,
    preparationSubjects,
} from './fixtures/preparation.ts';
import { MockError } from './mock-error.ts';
import { readMockSection, writeMockSection } from './persistence.ts';
import type { MockScenario } from './scenarios/index.ts';

type PreparationState = {
    academicYears: AcademicYear[];
    semesters: Semester[];
    educationLevels: EducationLevel[];
    grades: Grade[];
    classes: SchoolClass[];
    subjects: Subject[];
    rounds: AssignmentRound[];
    scopes: RoundSubjectScope[];
    applicabilities: ClassSubjectApplicability[];
    requiredComponents: RequiredDemandComponent[];
    demands: TeachingDemand[];
    nextIds: {
        academicYear: number;
        semester: number;
        educationLevel: number;
        grade: number;
        schoolClass: number;
        subject: number;
        round: number;
        scope: number;
        applicability: number;
        requiredComponent: number;
        demand: number;
    };
    revisionCounter: number;
};

function maxIdPlusOne(rows: ReadonlyArray<{ id: number }>): number {
    return rows.length > 0 ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}

function createInitialState(): PreparationState {
    const academicYears = structuredClone(preparationAcademicYears);
    const semesters = structuredClone(preparationSemesters);
    const educationLevels = structuredClone(preparationEducationLevels);
    const grades = structuredClone(preparationGrades);
    const classes = structuredClone(preparationClasses);
    const subjects = structuredClone(preparationSubjects);
    const rounds = structuredClone(preparationRounds);
    const scopes = structuredClone(preparationScopes);
    const applicabilities = structuredClone(preparationApplicabilities);
    const requiredComponents = structuredClone(preparationRequiredComponents);
    const demands = structuredClone(preparationDemands);

    return {
        academicYears,
        semesters,
        educationLevels,
        grades,
        classes,
        subjects,
        rounds,
        scopes,
        applicabilities,
        requiredComponents,
        demands,
        nextIds: {
            academicYear: maxIdPlusOne(academicYears),
            semester: maxIdPlusOne(semesters),
            educationLevel: maxIdPlusOne(educationLevels),
            grade: maxIdPlusOne(grades),
            schoolClass: maxIdPlusOne(classes),
            subject: maxIdPlusOne(subjects),
            round: maxIdPlusOne(rounds),
            scope: maxIdPlusOne(scopes),
            applicability: maxIdPlusOne(applicabilities),
            requiredComponent: maxIdPlusOne(requiredComponents),
            demand: maxIdPlusOne(demands),
        },
        revisionCounter: 10,
    };
}

let state =
    readMockSection<PreparationState>('preparation') ?? createInitialState();

function nowIso(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function bumpRoundRevision(roundId: number) {
    const round = state.rounds.find((item) => item.id === roundId);
    if (!round) return;
    state.revisionCounter += 1;
    round.source_revision_token = `rev-r${round.id}-live-${state.revisionCounter}`;
    round.source_updated_at = nowIso();
}

function bumpRoundsForSemester(semesterId: number) {
    for (const round of state.rounds) {
        if (round.semester_id === semesterId) {
            bumpRoundRevision(round.id);
        }
    }
}

function assertPaired(
    by: number | null,
    at: string | null,
    fieldLabel: string,
) {
    const hasBy = by !== null;
    const hasAt = at !== null;
    if (hasBy !== hasAt) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${fieldLabel}: cặp actor và timestamp phải cùng có giá trị hoặc cùng null.`,
        );
    }
    if (hasBy && (!Number.isInteger(by) || by! <= 0)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${fieldLabel}: ID người xác nhận phải là số nguyên dương.`,
        );
    }
    if (hasAt && Number.isNaN(Date.parse(at!))) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${fieldLabel}: thời điểm xác nhận phải là ISO-8601 hợp lệ.`,
        );
    }
}

function syncRequiredLinks() {
    for (const req of state.requiredComponents) {
        const app = state.applicabilities.find(
            (a) => a.id === req.applicability_id,
        );
        if (!app) continue;
        const scope = state.scopes.find((s) => s.id === app.scope_id);
        if (!scope) continue;
        const round = state.rounds.find((r) => r.id === scope.round_id);
        if (!round) continue;
        const matched = state.demands.find(
            (d) =>
                d.semester_id === round.semester_id &&
                d.class_id === app.class_id &&
                d.subject_id === scope.subject_id &&
                d.demand_type === req.demand_type &&
                d.status === 'ACTIVE' &&
                intervalsOverlap(
                    d.valid_from,
                    d.valid_to,
                    req.valid_from,
                    req.valid_to,
                ),
        );
        req.demand_id = matched ? matched.id : null;
    }
}

function paginate<Row extends { id: number }>(
    rows: readonly Row[],
    offset = 0,
    limit = 20,
): Row[] {
    const sorted = [...rows].sort((a, b) => a.id - b.id);
    return structuredClone(sorted.slice(offset, offset + limit));
}

const preparationMethods = {
    touchRoundSource(id: number) {
        this.detailRound(id);
        bumpRoundRevision(id);
    },
    touchSchoolSource(schoolId?: number) {
        for (const round of state.rounds) {
            const semester = state.semesters.find(
                (item) => item.id === round.semester_id,
            );
            const year = state.academicYears.find(
                (item) => item.id === semester?.academic_year_id,
            );
            if (schoolId === undefined || year?.school_id === schoolId)
                bumpRoundRevision(round.id);
        }
    },
    reset() {
        state = createInitialState();
    },

    // ---- Academic Years ----
    listAcademicYears(filters: AcademicYearFilters = {}): AcademicYear[] {
        const filtered = filters.school_id
            ? state.academicYears.filter(
                  (y) => y.school_id === filters.school_id,
              )
            : state.academicYears;
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailAcademicYear(id: number): AcademicYear {
        const found = state.academicYears.find((y) => y.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy năm học.',
            );
        return structuredClone(found);
    },
    saveAcademicYear(input: AcademicYearRequest, id?: number): AcademicYear {
        if (id !== undefined) this.detailAcademicYear(id);
        if (!schools.some((s) => s.id === input.school_id)) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Trường được chọn không tồn tại.',
            );
        }
        if (input.ends_on < input.starts_on) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Ngày kết thúc năm học không được trước ngày bắt đầu.',
            );
        }
        if (
            state.academicYears.some(
                (y) =>
                    y.id !== id &&
                    y.school_id === input.school_id &&
                    y.year_code === input.year_code,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã năm học đã tồn tại trong trường.',
            );
        }
        if (
            state.academicYears.some(
                (y) =>
                    y.id !== id &&
                    y.school_id === input.school_id &&
                    intervalsOverlap(
                        input.starts_on,
                        input.ends_on,
                        y.starts_on,
                        y.ends_on,
                    ),
            )
        ) {
            throw new MockError(
                409,
                'OVERLAPPING_PERIOD',
                'Thời gian năm học chồng lấn với năm học đã có.',
            );
        }
        const record: AcademicYear = {
            id: id ?? state.nextIds.academicYear++,
            ...input,
        };
        if (id === undefined) state.academicYears.push(record);
        else
            state.academicYears = state.academicYears.map((y) =>
                y.id === id ? record : y,
            );
        this.touchSchoolSource();
        return structuredClone(record);
    },
    removeAcademicYear(id: number, scenario: MockScenario) {
        this.detailAcademicYear(id);
        if (
            scenario === 'reference' ||
            state.semesters.some((s) => s.academic_year_id === id) ||
            state.classes.some((c) => c.academic_year_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Năm học đang có học kỳ hoặc lớp học tham chiếu.',
            );
        }
        state.academicYears = state.academicYears.filter((y) => y.id !== id);
    },

    // ---- Semesters ----
    listSemesters(filters: SemesterFilters = {}): Semester[] {
        const filtered = filters.academic_year_id
            ? state.semesters.filter(
                  (s) => s.academic_year_id === filters.academic_year_id,
              )
            : state.semesters;
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailSemester(id: number): Semester {
        const found = state.semesters.find((s) => s.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy học kỳ.',
            );
        return structuredClone(found);
    },
    saveSemester(input: SemesterRequest, id?: number): Semester {
        if (id !== undefined) this.detailSemester(id);
        const year = state.academicYears.find(
            (y) => y.id === input.academic_year_id,
        );
        if (!year) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Năm học được chọn không tồn tại.',
            );
        }
        if (input.ends_on < input.starts_on) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Ngày kết thúc học kỳ không được trước ngày bắt đầu.',
            );
        }
        if (input.starts_on < year.starts_on || input.ends_on > year.ends_on) {
            throw new MockError(
                422,
                'DATA_CONSTRAINT',
                'Khoảng thời gian học kỳ phải nằm trong năm học tương ứng.',
            );
        }
        if (
            state.semesters.some(
                (s) =>
                    s.id !== id &&
                    s.academic_year_id === input.academic_year_id &&
                    s.semester_no === input.semester_no,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Học kỳ này đã tồn tại trong năm học.',
            );
        }
        if (
            state.semesters.some(
                (s) =>
                    s.id !== id &&
                    s.academic_year_id === input.academic_year_id &&
                    intervalsOverlap(
                        input.starts_on,
                        input.ends_on,
                        s.starts_on,
                        s.ends_on,
                    ),
            )
        ) {
            throw new MockError(
                409,
                'OVERLAPPING_PERIOD',
                'Thời gian học kỳ chồng lấn với học kỳ khác.',
            );
        }
        const record: Semester = {
            id: id ?? state.nextIds.semester++,
            ...input,
        };
        if (id === undefined) state.semesters.push(record);
        else
            state.semesters = state.semesters.map((s) =>
                s.id === id ? record : s,
            );
        this.touchSchoolSource();
        return structuredClone(record);
    },
    removeSemester(id: number, scenario: MockScenario) {
        this.detailSemester(id);
        if (
            scenario === 'reference' ||
            state.rounds.some((r) => r.semester_id === id) ||
            state.demands.some((d) => d.semester_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Học kỳ đang có đợt phân công hoặc nhu cầu tham chiếu.',
            );
        }
        state.semesters = state.semesters.filter((s) => s.id !== id);
    },

    // ---- Education Levels ----
    listEducationLevels(offset = 0, limit = 20): EducationLevel[] {
        return paginate(state.educationLevels, offset, limit);
    },
    detailEducationLevel(id: number): EducationLevel {
        const found = state.educationLevels.find((l) => l.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy cấp học.',
            );
        return structuredClone(found);
    },
    saveEducationLevel(
        input: EducationLevelRequest,
        id?: number,
    ): EducationLevel {
        if (id !== undefined) this.detailEducationLevel(id);
        if (
            state.educationLevels.some(
                (l) => l.id !== id && l.level_code === input.level_code,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã cấp học đã tồn tại.',
            );
        }
        const record: EducationLevel = {
            id: id ?? state.nextIds.educationLevel++,
            ...input,
        };
        if (id === undefined) state.educationLevels.push(record);
        else
            state.educationLevels = state.educationLevels.map((l) =>
                l.id === id ? record : l,
            );
        this.touchSchoolSource();
        return structuredClone(record);
    },
    removeEducationLevel(id: number, scenario: MockScenario) {
        this.detailEducationLevel(id);
        if (
            scenario === 'reference' ||
            state.grades.some((g) => g.education_level_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Cấp học đang được khối lớp tham chiếu.',
            );
        }
        state.educationLevels = state.educationLevels.filter(
            (l) => l.id !== id,
        );
    },

    // ---- Grades ----
    listGrades(filters: GradeFilters = {}): Grade[] {
        const filtered = filters.education_level_id
            ? state.grades.filter(
                  (g) => g.education_level_id === filters.education_level_id,
              )
            : state.grades;
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailGrade(id: number): Grade {
        const found = state.grades.find((g) => g.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy khối lớp.',
            );
        return structuredClone(found);
    },
    saveGrade(input: GradeRequest, id?: number): Grade {
        if (id !== undefined) this.detailGrade(id);
        if (
            !state.educationLevels.some(
                (l) => l.id === input.education_level_id,
            )
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Cấp học không tồn tại.',
            );
        }
        if (
            state.grades.some(
                (g) =>
                    g.id !== id &&
                    g.education_level_id === input.education_level_id &&
                    g.grade_code === input.grade_code,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã khối đã tồn tại trong cấp học.',
            );
        }
        const record: Grade = { id: id ?? state.nextIds.grade++, ...input };
        if (id === undefined) state.grades.push(record);
        else state.grades = state.grades.map((g) => (g.id === id ? record : g));
        this.touchSchoolSource();
        return structuredClone(record);
    },
    removeGrade(id: number, scenario: MockScenario) {
        this.detailGrade(id);
        if (
            scenario === 'reference' ||
            state.classes.some((c) => c.grade_id === id) ||
            state.scopes.some((s) => s.grade_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Khối đang có lớp học hoặc phạm vi đợt tham chiếu.',
            );
        }
        state.grades = state.grades.filter((g) => g.id !== id);
    },

    // ---- Classes ----
    listClasses(filters: SchoolClassFilters = {}): SchoolClass[] {
        const filtered = state.classes.filter((c) => {
            if (
                filters.academic_year_id &&
                c.academic_year_id !== filters.academic_year_id
            )
                return false;
            if (filters.grade_id && c.grade_id !== filters.grade_id)
                return false;
            if (filters.status && c.status !== filters.status) return false;
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailClass(id: number): SchoolClass {
        const found = state.classes.find((c) => c.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy lớp học.',
            );
        return structuredClone(found);
    },
    saveClass(input: SchoolClassRequest, id?: number): SchoolClass {
        if (id !== undefined) this.detailClass(id);
        if (!state.academicYears.some((y) => y.id === input.academic_year_id)) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Năm học không tồn tại.',
            );
        }
        if (!state.grades.some((g) => g.id === input.grade_id)) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Khối lớp không tồn tại.',
            );
        }
        if (
            state.classes.some(
                (c) =>
                    c.id !== id &&
                    c.academic_year_id === input.academic_year_id &&
                    c.class_code === input.class_code,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã lớp đã tồn tại trong năm học.',
            );
        }
        const record: SchoolClass = {
            id: id ?? state.nextIds.schoolClass++,
            ...input,
        };
        if (id === undefined) state.classes.push(record);
        else
            state.classes = state.classes.map((c) =>
                c.id === id ? record : c,
            );
        this.touchSchoolSource();
        return structuredClone(record);
    },
    removeClass(id: number, scenario: MockScenario) {
        this.detailClass(id);
        if (
            scenario === 'reference' ||
            state.applicabilities.some((a) => a.class_id === id) ||
            state.demands.some((d) => d.class_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Lớp đang được áp dụng môn hoặc nhu cầu giảng dạy tham chiếu.',
            );
        }
        state.classes = state.classes.filter((c) => c.id !== id);
    },

    // ---- Subjects ----
    listSubjects(filters: SubjectFilters = {}): Subject[] {
        const q = filters.q?.trim().toLowerCase();
        const filtered = state.subjects.filter((s) => {
            if (filters.subject_code && s.subject_code !== filters.subject_code)
                return false;
            if (q && !`${s.subject_code} ${s.name}`.toLowerCase().includes(q))
                return false;
            if (filters.as_of) {
                if (s.valid_from > filters.as_of) return false;
                if (s.valid_to && s.valid_to < filters.as_of) return false;
            }
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailSubject(id: number): Subject {
        const found = state.subjects.find((s) => s.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy môn học.',
            );
        return structuredClone(found);
    },
    saveSubject(input: SubjectRequest, id?: number): Subject {
        if (id !== undefined) this.detailSubject(id);
        if (input.valid_to && input.valid_to < input.valid_from) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'valid_to không được trước valid_from.',
            );
        }
        if (
            state.subjects.some(
                (s) => s.id !== id && s.subject_code === input.subject_code,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã môn học đã tồn tại.',
            );
        }
        const record: Subject = { id: id ?? state.nextIds.subject++, ...input };
        if (id === undefined) state.subjects.push(record);
        else
            state.subjects = state.subjects.map((s) =>
                s.id === id ? record : s,
            );
        this.touchSchoolSource();
        return structuredClone(record);
    },
    removeSubject(id: number, scenario: MockScenario) {
        this.detailSubject(id);
        if (
            scenario === 'reference' ||
            state.scopes.some((s) => s.subject_id === id) ||
            state.demands.some((d) => d.subject_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Môn học đang được phạm vi đợt hoặc nhu cầu giảng dạy tham chiếu.',
            );
        }
        state.subjects = state.subjects.filter((s) => s.id !== id);
    },

    // ---- Assignment Rounds ----
    listRounds(filters: AssignmentRoundFilters = {}): AssignmentRound[] {
        const filtered = state.rounds.filter((r) => {
            if (filters.semester_id && r.semester_id !== filters.semester_id)
                return false;
            if (filters.status && r.status !== filters.status) return false;
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailRound(id: number): AssignmentRound {
        const found = state.rounds.find((r) => r.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy đợt phân công.',
            );
        return structuredClone(found);
    },
    saveRound(input: AssignmentRoundRequest, id?: number): AssignmentRound {
        const existing = id !== undefined ? this.detailRound(id) : null;
        if (!state.semesters.some((s) => s.id === input.semester_id)) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Học kỳ không tồn tại.',
            );
        }
        assertPaired(
            input.scope_confirmed_by,
            input.scope_confirmed_at,
            'scope_confirmed',
        );
        if (
            input.opens_at &&
            input.closes_at &&
            Date.parse(input.closes_at) < Date.parse(input.opens_at)
        ) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'closes_at không được trước opens_at.',
            );
        }
        if (
            state.rounds.some(
                (r) =>
                    r.id !== id &&
                    r.semester_id === input.semester_id &&
                    r.round_code === input.round_code,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã đợt phân công đã tồn tại trong học kỳ.',
            );
        }
        state.revisionCounter += 1;
        const roundId = id ?? state.nextIds.round++;
        const record: AssignmentRound = {
            id: roundId,
            ...input,
            source_revision_token:
                existing &&
                existing.scope_confirmed_at === input.scope_confirmed_at &&
                existing.status === input.status
                    ? existing.source_revision_token
                    : `rev-r${roundId}-live-${state.revisionCounter}`,
            source_updated_at: nowIso(),
        };
        if (id === undefined) state.rounds.push(record);
        else state.rounds = state.rounds.map((r) => (r.id === id ? record : r));
        return structuredClone(record);
    },
    removeRound(id: number, scenario: MockScenario) {
        this.detailRound(id);
        if (
            scenario === 'reference' ||
            state.scopes.some((s) => s.round_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Đợt phân công đang có phạm vi khối–môn tham chiếu.',
            );
        }
        state.rounds = state.rounds.filter((r) => r.id !== id);
    },

    // ---- Round Subject Scopes ----
    listScopes(filters: RoundSubjectScopeFilters = {}): RoundSubjectScope[] {
        const filtered = state.scopes.filter((s) => {
            if (filters.round_id && s.round_id !== filters.round_id)
                return false;
            if (filters.grade_id && s.grade_id !== filters.grade_id)
                return false;
            if (filters.subject_id && s.subject_id !== filters.subject_id)
                return false;
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailScope(id: number): RoundSubjectScope {
        const found = state.scopes.find((s) => s.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy phạm vi khối–môn.',
            );
        return structuredClone(found);
    },
    saveScope(input: RoundSubjectScopeRequest, id?: number): RoundSubjectScope {
        if (id !== undefined) this.detailScope(id);
        if (!state.rounds.some((r) => r.id === input.round_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Đợt phân công không tồn tại.',
            );
        if (!state.grades.some((g) => g.id === input.grade_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Khối lớp không tồn tại.',
            );
        if (!state.subjects.some((s) => s.id === input.subject_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Môn học không tồn tại.',
            );
        assertPaired(input.confirmed_by, input.confirmed_at, 'scope.confirmed');
        if (
            state.scopes.some(
                (s) =>
                    s.id !== id &&
                    s.round_id === input.round_id &&
                    s.grade_id === input.grade_id &&
                    s.subject_id === input.subject_id,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Phạm vi khối–môn này đã tồn tại trong đợt.',
            );
        }
        const record: RoundSubjectScope = {
            id: id ?? state.nextIds.scope++,
            ...input,
        };
        if (id === undefined) state.scopes.push(record);
        else state.scopes = state.scopes.map((s) => (s.id === id ? record : s));
        bumpRoundRevision(record.round_id);
        syncRequiredLinks();
        return structuredClone(record);
    },
    removeScope(id: number, scenario: MockScenario) {
        const existing = this.detailScope(id);
        if (
            scenario === 'reference' ||
            state.applicabilities.some((a) => a.scope_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Phạm vi đang có bản ghi áp dụng lớp–môn tham chiếu.',
            );
        }
        state.scopes = state.scopes.filter((s) => s.id !== id);
        bumpRoundRevision(existing.round_id);
    },

    // ---- Class Subject Applicabilities ----
    listApplicabilities(
        filters: ClassSubjectApplicabilityFilters = {},
    ): ClassSubjectApplicability[] {
        const filtered = state.applicabilities.filter((a) => {
            if (filters.scope_id && a.scope_id !== filters.scope_id)
                return false;
            if (filters.class_id && a.class_id !== filters.class_id)
                return false;
            if (filters.status && a.status !== filters.status) return false;
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailApplicability(id: number): ClassSubjectApplicability {
        const found = state.applicabilities.find((a) => a.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy trạng thái áp dụng lớp–môn.',
            );
        return structuredClone(found);
    },
    saveApplicability(
        input: ClassSubjectApplicabilityRequest,
        id?: number,
    ): ClassSubjectApplicability {
        if (id !== undefined) this.detailApplicability(id);
        const scope = state.scopes.find((s) => s.id === input.scope_id);
        if (!scope)
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Phạm vi khối–môn không tồn tại.',
            );
        const cls = state.classes.find((c) => c.id === input.class_id);
        if (!cls)
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Lớp học không tồn tại.',
            );
        if (cls.grade_id !== scope.grade_id) {
            throw new MockError(
                422,
                'DATA_CONSTRAINT',
                'Lớp học được chọn không thuộc khối của phạm vi khối–môn.',
            );
        }
        assertPaired(
            input.confirmed_by,
            input.confirmed_at,
            'applicability.confirmed',
        );
        assertPaired(
            input.components_confirmed_by,
            input.components_confirmed_at,
            'applicability.components_confirmed',
        );
        if (input.status === 'NOT_APPLICABLE' && !(input.reason ?? '').trim()) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Trạng thái NOT_APPLICABLE yêu cầu nhập lý do.',
            );
        }
        if (
            state.applicabilities.some(
                (a) =>
                    a.id !== id &&
                    a.scope_id === input.scope_id &&
                    a.class_id === input.class_id,
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Lớp và phạm vi môn này đã được khai báo áp dụng.',
            );
        }
        const round = state.rounds.find((r) => r.id === scope.round_id);
        if (
            round &&
            (input.status === 'NOT_APPLICABLE' ||
                input.status === 'UNDETERMINED') &&
            state.demands.some(
                (d) =>
                    d.semester_id === round.semester_id &&
                    d.class_id === input.class_id &&
                    d.subject_id === scope.subject_id &&
                    d.status === 'ACTIVE',
            )
        ) {
            throw new MockError(
                409,
                'DATA_CONSTRAINT',
                'Đang có nhu cầu ACTIVE cho cặp lớp–môn này; hãy tạm ngưng hoặc xóa nhu cầu trước khi đổi trạng thái.',
            );
        }
        const record: ClassSubjectApplicability = {
            id: id ?? state.nextIds.applicability++,
            scope_id: input.scope_id,
            class_id: input.class_id,
            status: input.status,
            reason: input.reason?.trim() || null,
            updated_by: input.updated_by,
            updated_at: nowIso(),
            confirmed_by: input.confirmed_by,
            confirmed_at: input.confirmed_at,
            components_confirmed_by: input.components_confirmed_by,
            components_confirmed_at: input.components_confirmed_at,
        };
        if (id === undefined) state.applicabilities.push(record);
        else
            state.applicabilities = state.applicabilities.map((a) =>
                a.id === id ? record : a,
            );
        bumpRoundRevision(scope.round_id);
        syncRequiredLinks();
        return structuredClone(record);
    },
    removeApplicability(id: number, scenario: MockScenario) {
        const existing = this.detailApplicability(id);
        if (
            scenario === 'reference' ||
            state.requiredComponents.some((r) => r.applicability_id === id)
        ) {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Cặp lớp–môn đang có thành phần nhu cầu bắt buộc.',
            );
        }
        const scope = state.scopes.find((s) => s.id === existing.scope_id);
        state.applicabilities = state.applicabilities.filter(
            (a) => a.id !== id,
        );
        if (scope) bumpRoundRevision(scope.round_id);
    },

    // ---- Required Demand Components ----
    listRequiredComponents(
        filters: RequiredDemandComponentFilters = {},
    ): RequiredDemandComponent[] {
        const filtered = state.requiredComponents.filter((r) => {
            if (
                filters.applicability_id &&
                r.applicability_id !== filters.applicability_id
            )
                return false;
            if (filters.demand_type && r.demand_type !== filters.demand_type)
                return false;
            if (
                filters.as_of &&
                (r.valid_from > filters.as_of || r.valid_to < filters.as_of)
            )
                return false;
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailRequiredComponent(id: number): RequiredDemandComponent {
        const found = state.requiredComponents.find((r) => r.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy thành phần bắt buộc.',
            );
        return structuredClone(found);
    },
    saveRequiredComponent(
        input: RequiredDemandComponentRequest,
        id?: number,
    ): RequiredDemandComponent {
        if (id !== undefined) this.detailRequiredComponent(id);
        const app = state.applicabilities.find(
            (a) => a.id === input.applicability_id,
        );
        if (!app)
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Cặp áp dụng lớp–môn không tồn tại.',
            );
        if (app.status !== 'APPLICABLE') {
            throw new MockError(
                422,
                'DATA_CONSTRAINT',
                'Chỉ có thể khai báo thành phần bắt buộc khi cặp lớp–môn ở trạng thái APPLICABLE.',
            );
        }
        if (input.valid_to < input.valid_from) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'valid_to không được trước valid_from.',
            );
        }
        assertPaired(
            input.confirmed_by,
            input.confirmed_at,
            'component.confirmed',
        );
        if (
            state.requiredComponents.some(
                (r) =>
                    r.id !== id &&
                    r.applicability_id === input.applicability_id &&
                    r.demand_type === input.demand_type &&
                    intervalsOverlap(
                        input.valid_from,
                        input.valid_to,
                        r.valid_from,
                        r.valid_to,
                    ),
            )
        ) {
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Thành phần bắt buộc cùng loại đã tồn tại trong khoảng thời gian này.',
            );
        }
        const record: RequiredDemandComponent = {
            id: id ?? state.nextIds.requiredComponent++,
            applicability_id: input.applicability_id,
            demand_type: input.demand_type,
            valid_from: input.valid_from,
            valid_to: input.valid_to,
            demand_id: null,
            confirmed_by: input.confirmed_by,
            confirmed_at: input.confirmed_at,
        };
        if (id === undefined) state.requiredComponents.push(record);
        else
            state.requiredComponents = state.requiredComponents.map((r) =>
                r.id === id ? record : r,
            );

        // Backend side effect (API.md:483): clears parent applicability components confirmation
        app.components_confirmed_by = null;
        app.components_confirmed_at = null;
        app.updated_at = nowIso();
        const scope = state.scopes.find((s) => s.id === app.scope_id);
        if (scope) bumpRoundRevision(scope.round_id);

        syncRequiredLinks();
        return this.detailRequiredComponent(record.id);
    },
    removeRequiredComponent(id: number, scenario: MockScenario) {
        const existing = this.detailRequiredComponent(id);
        if (scenario === 'reference') {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Kịch bản mẫu: thành phần bắt buộc đang được tham chiếu.',
            );
        }
        const app = state.applicabilities.find(
            (a) => a.id === existing.applicability_id,
        );
        state.requiredComponents = state.requiredComponents.filter(
            (r) => r.id !== id,
        );
        if (app) {
            app.components_confirmed_by = null;
            app.components_confirmed_at = null;
            app.updated_at = nowIso();
            const scope = state.scopes.find((s) => s.id === app.scope_id);
            if (scope) bumpRoundRevision(scope.round_id);
        }
    },

    // ---- Teaching Demands ----
    listDemands(filters: TeachingDemandFilters = {}): TeachingDemand[] {
        const filtered = state.demands.filter((d) => {
            if (filters.semester_id && d.semester_id !== filters.semester_id)
                return false;
            if (filters.class_id && d.class_id !== filters.class_id)
                return false;
            if (filters.subject_id && d.subject_id !== filters.subject_id)
                return false;
            if (filters.demand_type && d.demand_type !== filters.demand_type)
                return false;
            if (filters.status && d.status !== filters.status) return false;
            if (
                filters.as_of &&
                (d.valid_from > filters.as_of || d.valid_to < filters.as_of)
            )
                return false;
            return true;
        });
        return paginate(filtered, filters.offset, filters.limit);
    },
    detailDemand(id: number): TeachingDemand {
        const found = state.demands.find((d) => d.id === id);
        if (!found)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy nhu cầu giảng dạy.',
            );
        return structuredClone(found);
    },
    saveDemand(input: TeachingDemandRequest, id?: number): TeachingDemand {
        if (id !== undefined) this.detailDemand(id);
        if (!state.semesters.some((s) => s.id === input.semester_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Học kỳ không tồn tại.',
            );
        if (!state.classes.some((c) => c.id === input.class_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Lớp học không tồn tại.',
            );
        if (!state.subjects.some((s) => s.id === input.subject_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Môn học không tồn tại.',
            );

        const pErr = validatePeriodsPerWeek(input.periods_per_week);
        if (pErr) throw new MockError(400, 'INVALID_REQUEST', pErr);
        if (input.valid_to < input.valid_from)
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'valid_to không được trước valid_from.',
            );

        if (
            input.status === 'ACTIVE' &&
            state.demands.some(
                (d) =>
                    d.id !== id &&
                    d.semester_id === input.semester_id &&
                    d.class_id === input.class_id &&
                    d.subject_id === input.subject_id &&
                    d.demand_type === input.demand_type &&
                    d.status === 'ACTIVE' &&
                    intervalsOverlap(
                        input.valid_from,
                        input.valid_to,
                        d.valid_from,
                        d.valid_to,
                    ),
            )
        ) {
            throw new MockError(
                409,
                'OVERLAPPING_PERIOD',
                'Đã có nhu cầu ACTIVE cùng lớp, môn và thành phần giao nhau trong khoảng hiệu lực.',
            );
        }

        const record: TeachingDemand = {
            id: id ?? state.nextIds.demand++,
            semester_id: input.semester_id,
            class_id: input.class_id,
            subject_id: input.subject_id,
            periods_per_week: Number(Number(input.periods_per_week).toFixed(2)),
            status: input.status,
            updated_by: input.updated_by,
            updated_at: nowIso(),
            demand_type: input.demand_type,
            valid_from: input.valid_from,
            valid_to: input.valid_to,
            unit: input.unit,
        };
        if (id === undefined) state.demands.push(record);
        else
            state.demands = state.demands.map((d) =>
                d.id === id ? record : d,
            );
        syncRequiredLinks();
        bumpRoundsForSemester(record.semester_id);
        return structuredClone(record);
    },
    removeDemand(id: number, scenario: MockScenario) {
        const existing = this.detailDemand(id);
        if (scenario === 'reference') {
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Kịch bản mẫu: nhu cầu đang được dòng phân công khóa tham chiếu.',
            );
        }
        state.demands = state.demands.filter((d) => d.id !== id);
        // API.md:483: removing demand clears matching demand_id on required components without deleting them
        for (const req of state.requiredComponents) {
            if (req.demand_id === id) req.demand_id = null;
        }
        syncRequiredLinks();
        bumpRoundsForSemester(existing.semester_id);
    },

    // ---- Readiness Evaluation ----
    evaluateReadiness(
        roundId: number,
        query: ReadinessQueryParams,
        scenario: MockScenario,
    ): RoundReadinessDto {
        const round = state.rounds.find((r) => r.id === roundId);
        if (!round) {
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy đợt phân công.',
            );
        }
        const semester = state.semesters.find(
            (s) => s.id === round.semester_id,
        );
        const startsOn = semester?.starts_on ?? '2026-08-01';
        const endsOn = semester?.ends_on ?? '2026-12-31';

        const configId = query.optimization_config_id ?? null;
        const ruleSetId = query.rule_set_version_id ?? null;

        if (configId !== null) {
            if (!OPTIMIZATION_CONFIG_OPTIONS.some((o) => o.id === configId)) {
                throw new MockError(
                    404,
                    'RESOURCE_NOT_FOUND',
                    'Không tìm thấy cấu hình tối ưu.',
                );
            }
        }
        if (ruleSetId !== null) {
            if (!RULE_SET_VERSION_OPTIONS.some((o) => o.id === ruleSetId)) {
                throw new MockError(
                    404,
                    'RESOURCE_NOT_FOUND',
                    'Không tìm thấy phiên bản bộ quy tắc.',
                );
            }
        }

        const configSelected = configId !== null && ruleSetId !== null;
        const token =
            round.source_revision_token ?? `rev-r${round.id}-unversioned`;

        // Explicit deterministic readiness scenarios
        if (scenario === 'readinessReady') {
            const issues: ReadinessIssue[] = configSelected
                ? [
                      {
                          code: 'PRECHECK_SUMMARY_READY',
                          severity: 'INFO',
                          category: 'READINESS',
                          entity_type: 'assignment_round',
                          entity_id: round.id,
                          related_id: configId,
                          message:
                              'Đầy đủ phạm vi, tập bắt buộc, nhu cầu giảng dạy và hồ sơ giáo viên. Đạt điều kiện chạy giải thuật.',
                          suggestion:
                              'Mở không gian phân công để chạy tối ưu hoặc tinh chỉnh phân công thủ công.',
                      },
                  ]
                : [
                      {
                          code: 'CONFIGURATION_SELECTION_REQUIRED',
                          severity: 'ERROR',
                          category: 'CONFIG',
                          entity_type: 'assignment_round',
                          entity_id: round.id,
                          related_id: null,
                          message:
                              'Chưa chọn cặp optimization_config_id và rule_set_version_id để khóa ngữ cảnh kiểm tra.',
                          suggestion:
                              'Chọn đồng thời Cấu hình tối ưu và Bộ quy tắc trên thanh bộ lọc rồi kiểm tra lại.',
                      },
                  ];

            return {
                round_id: round.id,
                source_revision_token: token,
                optimization_config_id: configId,
                rule_set_version_id: ruleSetId,
                starts_on: startsOn,
                ends_on: endsOn,
                current_version_id: round.id * 10,
                revision_no: 4,
                can_run_solver: configSelected,
                can_open_feedback: true,
                can_export: false,
                preflight_only: true,
                solver_input_validated: false,
                coverage: {
                    required_components: 18,
                    assigned: 18,
                    unassigned: 0,
                    missing_demand: 0,
                    missing_plan_row: 0,
                },
                issues,
            };
        }

        if (scenario === 'readinessMissing') {
            const issues: ReadinessIssue[] = [
                ...(!configSelected
                    ? [
                          {
                              code: 'CONFIGURATION_SELECTION_REQUIRED',
                              severity: 'ERROR' as const,
                              category: 'CONFIG',
                              entity_type: 'assignment_round',
                              entity_id: round.id,
                              related_id: null,
                              message:
                                  'Chưa chọn cấu hình tối ưu và phiên bản bộ quy tắc.',
                              suggestion:
                                  'Chọn cấu hình tối ưu và bộ quy tắc trước khi chạy tiền kiểm solver.',
                          },
                      ]
                    : []),
                {
                    code: 'ROUND_SCOPE_UNCONFIRMED',
                    severity: 'ERROR',
                    category: 'SCOPE',
                    entity_type: 'assignment_round',
                    entity_id: round.id,
                    related_id: null,
                    message:
                        'Đợt phân công chưa xác nhận chốt phạm vi khối–môn (scope_confirmed_at đang trống).',
                    suggestion:
                        'Vào Chuẩn bị dữ liệu · Bước 01 để rà soát và bấm Xác nhận phạm vi đợt.',
                },
                {
                    code: 'REQUIRED_COMPONENT_DEMAND_MISSING',
                    severity: 'ERROR',
                    category: 'DEMAND',
                    entity_type: 'required_demand_component',
                    entity_id: 6,
                    related_id: 13,
                    message:
                        'Lớp 10A2 · Ngữ văn (STANDARD) có trong tập bắt buộc nhưng chưa có nhu cầu ACTIVE.',
                    suggestion:
                        'Mở Nhu cầu giảng dạy để nhập số tiết/tuần cho cặp lớp–môn còn thiếu.',
                },
                {
                    code: 'APPLICABILITY_COMPONENTS_UNCONFIRMED',
                    severity: 'WARNING',
                    category: 'PREPARATION',
                    entity_type: 'class_subject_applicability',
                    entity_id: 11,
                    related_id: 11,
                    message:
                        'Còn 2 cặp lớp–môn APPLICABLE chưa xác nhận danh sách thành phần bắt buộc.',
                    suggestion:
                        'Kiểm tra Bước 03 Tập bắt buộc và bấm Xác nhận tập thành phần.',
                },
                {
                    code: 'UNASSIGNED_DEMAND',
                    severity: 'WARNING',
                    category: 'PLAN',
                    entity_type: 'teaching_demand',
                    entity_id: 109,
                    related_id: 15,
                    message:
                        'Còn 3 thành phần nhu cầu hợp lệ chưa có giáo viên được gán trong phương án nháp.',
                    suggestion:
                        'Hoàn tất nguồn đầu vào để kích hoạt phân công tự động hoặc gán tay.',
                },
            ];

            return {
                round_id: round.id,
                source_revision_token: token,
                optimization_config_id: configId,
                rule_set_version_id: ruleSetId,
                starts_on: startsOn,
                ends_on: endsOn,
                current_version_id: round.id * 10,
                revision_no: 2,
                can_run_solver: false,
                can_open_feedback: false,
                can_export: false,
                preflight_only: true,
                solver_input_validated: false,
                coverage: {
                    required_components: 18,
                    assigned: 11,
                    unassigned: 3,
                    missing_demand: 3,
                    missing_plan_row: 1,
                },
                issues,
            };
        }

        if (scenario === 'readinessBlocked') {
            return {
                round_id: round.id,
                source_revision_token: token,
                optimization_config_id: configId,
                rule_set_version_id: ruleSetId,
                starts_on: startsOn,
                ends_on: endsOn,
                current_version_id: round.id * 10,
                revision_no: 3,
                can_run_solver: false,
                can_open_feedback: false,
                can_export: false,
                preflight_only: true,
                solver_input_validated: false,
                coverage: {
                    required_components: 14,
                    assigned: 6,
                    unassigned: 5,
                    missing_demand: 2,
                    missing_plan_row: 1,
                },
                issues: [
                    {
                        code: 'CLASS_SUBJECT_UNDETERMINED',
                        severity: 'ERROR',
                        category: 'PREPARATION',
                        entity_type: 'class_subject_applicability',
                        entity_id: 14,
                        related_id: 22,
                        message:
                            'Cặp lớp 6A1 · Khoa học tự nhiên vẫn ở trạng thái UNDETERMINED chưa phân loại.',
                        suggestion:
                            'Vào Chuẩn bị dữ liệu · Bước 02 để chọn Áp dụng hoặc Không áp dụng (kèm lý do).',
                    },
                    {
                        code: 'DEMAND_ON_NOT_APPLICABLE',
                        severity: 'ERROR',
                        category: 'DEMAND',
                        entity_type: 'class_subject_applicability',
                        entity_id: 8,
                        related_id: 14,
                        message:
                            'Phát hiện nhu cầu ACTIVE xung đột với cặp lớp 10A3 · Vật lí đã đánh dấu NOT_APPLICABLE.',
                        suggestion:
                            'Ngưng hiệu lực hoặc xóa nhu cầu xung đột trước khi chạy giải thuật.',
                    },
                    {
                        code: 'LOCKED_ASSIGNMENT_OUTSIDE_ROUND_SCOPE',
                        severity: 'ERROR',
                        category: 'LOCK',
                        entity_type: 'assignment_lock',
                        entity_id: 401,
                        related_id: 14,
                        message:
                            'Có dòng phân công đang khóa (LOCK) nằm ngoài phạm vi khối–môn của đợt hiện tại.',
                        suggestion:
                            'Mở không gian phân công để gỡ khóa dòng lệch phạm vi.',
                    },
                    {
                        code: 'WORKLOAD_BASIS_MISSING_OR_AMBIGUOUS',
                        severity: 'ERROR',
                        category: 'WORKLOAD',
                        entity_type: 'teacher_period_workload',
                        entity_id: 105,
                        related_id: round.id,
                        message:
                            'Giáo viên Võ Thanh Bình (GV005) chưa xác nhận inventory nguồn tải kỳ tính hoặc thiếu định mức VERIFIED.',
                        suggestion:
                            'Rà soát hồ sơ giáo viên và xác nhận inventory tải kỳ tính trước khi chạy solver.',
                    },
                    {
                        code: 'SUBJECT_QUALIFICATION_GAP',
                        severity: 'ERROR',
                        category: 'QUALIFICATION',
                        entity_type: 'subject',
                        entity_id: 9,
                        related_id: 10,
                        message:
                            'Không có giáo viên nào đủ chuyên môn VERIFIED phủ toàn khoảng cho môn Tin học Khối 11.',
                        suggestion:
                            'Bổ sung hoặc xác minh hồ sơ chuyên môn cho giáo viên phụ trách môn Tin học.',
                    },
                ],
            };
        }

        // ---- Live computation from current mockStore state ----
        syncRequiredLinks();
        const issues: ReadinessIssue[] = [];

        if (!configSelected) {
            issues.push({
                code: 'CONFIGURATION_SELECTION_REQUIRED',
                severity: 'ERROR',
                category: 'CONFIG',
                entity_type: 'assignment_round',
                entity_id: round.id,
                related_id: null,
                message:
                    'Cần chọn cặp optimization_config_id và rule_set_version_id để đối chiếu bộ quy tắc.',
                suggestion:
                    'Chọn Cấu hình tối ưu và Bộ quy tắc ở thanh kiểm tra phía trên.',
            });
        }

        if (!round.scope_confirmed_at) {
            issues.push({
                code: 'ROUND_SCOPE_UNCONFIRMED',
                severity: 'ERROR',
                category: 'SCOPE',
                entity_type: 'assignment_round',
                entity_id: round.id,
                related_id: null,
                message: `Đợt ${round.round_code} chưa xác nhận chốt phạm vi khối–môn.`,
                suggestion:
                    'Vào Bước 01 Phạm vi đợt để kiểm tra khối–môn và bấm Xác nhận phạm vi.',
            });
        }

        const roundScopes = state.scopes.filter((s) => s.round_id === round.id);
        if (roundScopes.length === 0) {
            issues.push({
                code: 'NO_ROUND_SUBJECT_SCOPE',
                severity: 'ERROR',
                category: 'SCOPE',
                entity_type: 'assignment_round',
                entity_id: round.id,
                related_id: null,
                message: `Đợt ${round.round_code} chưa khai báo cặp khối–môn nào trong phạm vi.`,
                suggestion:
                    'Thêm ít nhất một cặp khối–môn ở Bước 01 Chuẩn bị dữ liệu.',
            });
        }

        for (const scope of roundScopes) {
            if (!scope.confirmed_at) {
                const gradeName =
                    state.grades.find((g) => g.id === scope.grade_id)?.name ??
                    `Khối #${scope.grade_id}`;
                const subjectName =
                    state.subjects.find((s) => s.id === scope.subject_id)
                        ?.name ?? `Môn #${scope.subject_id}`;
                issues.push({
                    code: 'ROUND_SCOPE_ITEM_UNCONFIRMED',
                    severity: 'WARNING',
                    category: 'SCOPE',
                    entity_type: 'round_subject_scope',
                    entity_id: scope.id,
                    related_id: round.id,
                    message: `Phạm vi ${gradeName} · ${subjectName} chưa có xác nhận từng dòng.`,
                    suggestion:
                        'Kiểm tra lại phạm vi khối–môn và chốt xác nhận phạm vi đợt.',
                });
            }
        }

        const scopeIds = new Set(roundScopes.map((s) => s.id));
        const roundApps = state.applicabilities.filter((a) =>
            scopeIds.has(a.scope_id),
        );
        const applicableAppIds = new Set(
            roundApps.filter((a) => a.status === 'APPLICABLE').map((a) => a.id),
        );

        for (const app of roundApps) {
            const scope = roundScopes.find((s) => s.id === app.scope_id);
            const clsCode =
                state.classes.find((c) => c.id === app.class_id)?.class_code ??
                `Lớp #${app.class_id}`;
            const subjectName = scope
                ? (state.subjects.find((s) => s.id === scope.subject_id)
                      ?.name ?? `Môn #${scope.subject_id}`)
                : 'Môn';

            if (app.status === 'UNDETERMINED') {
                issues.push({
                    code: 'CLASS_SUBJECT_UNDETERMINED',
                    severity: 'ERROR',
                    category: 'PREPARATION',
                    entity_type: 'class_subject_applicability',
                    entity_id: app.id,
                    related_id: app.class_id,
                    message: `Cặp ${clsCode} · ${subjectName} còn ở trạng thái Chưa xác định (UNDETERMINED).`,
                    suggestion:
                        'Chuyển sang Áp dụng hoặc Không áp dụng (có lý do) ở Bước 02.',
                });
            }

            if (app.status === 'NOT_APPLICABLE' && scope) {
                const conflictingDemand = state.demands.find(
                    (d) =>
                        d.semester_id === round.semester_id &&
                        d.class_id === app.class_id &&
                        d.subject_id === scope.subject_id &&
                        d.status === 'ACTIVE',
                );
                if (conflictingDemand) {
                    issues.push({
                        code: 'DEMAND_ON_NOT_APPLICABLE',
                        severity: 'ERROR',
                        category: 'DEMAND',
                        entity_type: 'teaching_demand',
                        entity_id: conflictingDemand.id,
                        related_id: app.id,
                        message: `${clsCode} · ${subjectName} đang đánh dấu Không áp dụng nhưng vẫn có nhu cầu ACTIVE.`,
                        suggestion:
                            'Tạm ngưng hoặc bỏ nhu cầu giảng dạy xung đột.',
                    });
                }
            }

            if (app.status === 'APPLICABLE') {
                const comps = state.requiredComponents.filter(
                    (r) => r.applicability_id === app.id,
                );
                if (comps.length === 0) {
                    issues.push({
                        code: 'NO_REQUIRED_COMPONENTS',
                        severity: 'WARNING',
                        category: 'PREPARATION',
                        entity_type: 'class_subject_applicability',
                        entity_id: app.id,
                        related_id: app.class_id,
                        message: `Cặp ${clsCode} · ${subjectName} đang Áp dụng nhưng chưa khai báo thành phần nhu cầu bắt buộc.`,
                        suggestion:
                            'Thêm ít nhất 1 thành phần bắt buộc (STANDARD/SPECIALIZED_TOPIC/ENRICHMENT) ở Bước 03.',
                    });
                }
                if (!app.components_confirmed_at) {
                    issues.push({
                        code: 'APPLICABILITY_COMPONENTS_UNCONFIRMED',
                        severity: 'WARNING',
                        category: 'PREPARATION',
                        entity_type: 'class_subject_applicability',
                        entity_id: app.id,
                        related_id: app.class_id,
                        message: `Tập bắt buộc của ${clsCode} · ${subjectName} chưa được xác nhận lại sau chỉnh sửa.`,
                        suggestion:
                            'Vào Bước 03 Tập bắt buộc và bấm Xác nhận tập thành phần.',
                    });
                }
            }
        }

        const roundRequired = state.requiredComponents.filter((r) =>
            applicableAppIds.has(r.applicability_id),
        );
        let missingDemandCount = 0;

        for (const req of roundRequired) {
            if (!req.demand_id) {
                missingDemandCount += 1;
                const app = roundApps.find(
                    (a) => a.id === req.applicability_id,
                );
                const scope = app
                    ? roundScopes.find((s) => s.id === app.scope_id)
                    : undefined;
                const clsCode = app
                    ? (state.classes.find((c) => c.id === app.class_id)
                          ?.class_code ?? `Lớp #${app.class_id}`)
                    : 'Lớp';
                const subjectName = scope
                    ? (state.subjects.find((s) => s.id === scope.subject_id)
                          ?.name ?? `Môn #${scope.subject_id}`)
                    : 'Môn';
                issues.push({
                    code: 'REQUIRED_COMPONENT_DEMAND_MISSING',
                    severity: 'ERROR',
                    category: 'DEMAND',
                    entity_type: 'required_demand_component',
                    entity_id: req.id,
                    related_id: app?.class_id ?? null,
                    message: `${clsCode} · ${subjectName} (${req.demand_type}) nằm trong tập bắt buộc nhưng chưa có nhu cầu ACTIVE phủ khoảng ${req.valid_from} → ${req.valid_to}.`,
                    suggestion:
                        'Vào Nhu cầu giảng dạy để thêm nhu cầu tương ứng cho cặp lớp–môn này.',
                });
            }
        }

        // Round 3 (THCS demo) includes a deterministic teacher/workload gap unless scenario overrides
        if (round.id === 3) {
            issues.push({
                code: 'WORKLOAD_BASIS_MISSING_OR_AMBIGUOUS',
                severity: 'ERROR',
                category: 'WORKLOAD',
                entity_type: 'teacher_period_workload',
                entity_id: 201,
                related_id: round.id,
                message:
                    'Hồ sơ tải kỳ tính cho giáo viên THCS mẫu chưa xác nhận nguồn B/F/C/R theo cấu hình T.',
                suggestion:
                    'Hoàn thiện định mức & inventory nguồn tải tại Hồ sơ giáo viên.',
            });
        }

        const hasError = issues.some((i) => i.severity === 'ERROR');
        if (!hasError) {
            issues.push({
                code: 'PRECHECK_SUMMARY_READY',
                severity: 'INFO',
                category: 'READINESS',
                entity_type: 'assignment_round',
                entity_id: round.id,
                related_id: configId,
                message:
                    'Tất cả điều kiện phạm vi, áp dụng, tập bắt buộc và nhu cầu đều hợp lệ.',
                suggestion:
                    'Có thể chuyển sang bước chạy giải thuật hoặc chỉnh sửa phương án phân công.',
            });
        }

        const totalRequired = roundRequired.length;
        const presentDemand = totalRequired - missingDemandCount;
        // Simulated draft coverage: in PC-01 (round 1), 1 demand awaits assignment if present; plan rows match present demands
        const unassigned =
            round.id === 1
                ? Math.min(presentDemand, 1)
                : Math.min(presentDemand, 1);
        const assigned = Math.max(0, presentDemand - unassigned);

        return {
            round_id: round.id,
            source_revision_token: token,
            optimization_config_id: configId,
            rule_set_version_id: ruleSetId,
            starts_on: startsOn,
            ends_on: endsOn,
            current_version_id: round.id * 10,
            revision_no: 1,
            can_run_solver: !hasError && configSelected,
            can_open_feedback: !hasError,
            can_export: false,
            preflight_only: true,
            solver_input_validated: false,
            coverage: {
                required_components: totalRequired,
                assigned,
                unassigned,
                missing_demand: missingDemandCount,
                missing_plan_row: 0,
            },
            issues,
        };
    },
};

// Persist successful outer source mutations, including nested token/confirmation updates.
let mutationDepth = 0;
export const preparationStore = new Proxy(preparationMethods, {
    get(target, key, receiver) {
        const method = Reflect.get(target, key, receiver);
        if (
            typeof method !== 'function' ||
            !/^(save|remove|touch|reset)/.test(String(key))
        )
            return method;
        return (...args: unknown[]) => {
            mutationDepth++;
            let succeeded = false;
            try {
                const result: unknown = Reflect.apply(method, receiver, args);
                succeeded = true;
                return result;
            } finally {
                mutationDepth--;
                if (succeeded && mutationDepth === 0)
                    writeMockSection('preparation', state);
            }
        };
    },
});
