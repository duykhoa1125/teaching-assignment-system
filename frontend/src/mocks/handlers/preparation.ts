import { delay, http, HttpResponse } from 'msw';
import type {
    AcademicYearRequest,
    AssignmentRoundRequest,
    AssignmentRoundStatus,
    ClassStatus,
    EducationLevelRequest,
    GradeRequest,
    SchoolClassRequest,
    SemesterRequest,
    SubjectRequest,
} from '../../features/catalogs/types.ts';
import type {
    ApplicabilityStatus,
    ClassSubjectApplicabilityRequest,
    DemandStatus,
    DemandType,
    RequiredDemandComponentRequest,
    RoundSubjectScopeRequest,
    TeachingDemandRequest,
} from '../../features/preparation/types.ts';
import { MockError } from '../mock-error.ts';
import { preparationStore } from '../preparation-store.ts';
import { assignmentStore } from '../assignment-store.ts';
import { scenarios, type MockScenario } from '../scenarios/index.ts';
import { mockStore } from '../store.ts';

function errorJson(status: number, code: string, message: string) {
    return HttpResponse.json({ error: code, code, message }, { status });
}

function isErrorScenario(
    scenario: MockScenario,
): scenario is keyof typeof scenarios &
    (
        | 'badRequest'
        | 'unauthorized'
        | 'forbidden'
        | 'conflict'
        | 'invalid'
        | 'unavailable'
    ) {
    return 'status' in scenarios[scenario];
}

async function guarded(
    runner: (scenario: MockScenario) => Response | Promise<Response>,
) {
    const gen = mockStore.generation;
    const scenario = mockStore.scenario;
    await delay(scenario === 'slow' ? 1200 : 100);
    if (mockStore.generation !== gen) {
        return errorJson(
            409,
            'MOCK_STATE_CHANGED',
            'Trạng thái mock vừa được thay đổi.',
        );
    }
    if (isErrorScenario(scenario)) {
        const entry = scenarios[scenario];
        return errorJson(entry.status, entry.code, entry.message);
    }
    try {
        return await runner(scenario);
    } catch (error) {
        if (error instanceof MockError) {
            return errorJson(error.status, error.code, error.message);
        }
        throw error;
    }
}

function parsePositiveInt(
    raw: string | undefined | null,
    label: string,
): number {
    if (!raw || !/^[1-9]\d*$/.test(raw)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${label} phải là số nguyên dương.`,
        );
    }
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${label} vượt quá giới hạn số nguyên.`,
        );
    }
    return parsed;
}

function parseOptionalPositiveInt(
    searchParams: URLSearchParams,
    name: string,
): number | undefined {
    if (!searchParams.has(name)) return undefined;
    const raw = searchParams.get(name);
    if (raw === null || raw === '') return undefined;
    return parsePositiveInt(raw, name);
}

function parsePagination(searchParams: URLSearchParams): {
    limit: number;
    offset: number;
} {
    let limit = 20;
    let offset = 0;
    if (searchParams.has('limit')) {
        const raw = searchParams.get('limit');
        if (raw === null || !/^\d+$/.test(raw)) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'limit phải là số nguyên trong khoảng 1..100.',
            );
        }
        const parsed = Number(raw);
        if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'limit phải nằm trong khoảng 1..100.',
            );
        }
        limit = parsed;
    }
    if (searchParams.has('offset')) {
        const raw = searchParams.get('offset');
        if (raw === null || !/^\d+$/.test(raw)) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'offset phải là số nguyên >= 0.',
            );
        }
        const parsed = Number(raw);
        if (!Number.isSafeInteger(parsed) || parsed < 0) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'offset phải là số nguyên >= 0.',
            );
        }
        offset = parsed;
    }
    return { limit, offset };
}

function isIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    return (
        !Number.isNaN(utc.getTime()) && utc.toISOString().slice(0, 10) === value
    );
}

function isIsoDateTime(value: unknown): value is string {
    if (typeof value !== 'string' || !value.trim() || !value.includes('T')) {
        return false;
    }
    return !Number.isNaN(Date.parse(value));
}

function parseOptionalIsoDate(
    searchParams: URLSearchParams,
    name: string,
): string | undefined {
    const raw = searchParams.get(name)?.trim() ?? '';
    if (!raw) return undefined;
    if (!isIsoDate(raw)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${name} phải có định dạng ngày YYYY-MM-DD.`,
        );
    }
    return raw;
}

function parseOptionalEnum<T extends string>(
    searchParams: URLSearchParams,
    name: string,
    allowed: readonly T[],
): T | undefined {
    const raw = searchParams.get(name)?.trim() ?? '';
    if (!raw) return undefined;
    if (!(allowed as readonly string[]).includes(raw)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `Giá trị ${name} không hợp lệ: ${raw}.`,
        );
    }
    return raw as T;
}

async function readJsonObject(
    request: Request,
    expectedKeys: readonly string[],
): Promise<Record<string, unknown>> {
    let parsed: unknown;
    try {
        parsed = await request.json();
    } catch {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'Payload JSON không hợp lệ.',
        );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'Payload phải là đối tượng JSON.',
        );
    }
    const record = parsed as Record<string, unknown>;
    const expectedSet = new Set(expectedKeys);
    for (const key of Object.keys(record)) {
        if (!expectedSet.has(key)) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                `Trường không được phép hoặc chỉ đọc: ${key}.`,
            );
        }
    }
    for (const key of expectedKeys) {
        if (!Object.hasOwn(record, key)) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                `Thiếu trường bắt buộc: ${key}.`,
            );
        }
    }
    return record;
}

function reqPositiveInt(obj: Record<string, unknown>, key: string): number {
    const val = obj[key];
    if (typeof val !== 'number' || !Number.isSafeInteger(val) || val <= 0) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} phải là số nguyên dương.`,
        );
    }
    return val;
}

function optPositiveInt(
    obj: Record<string, unknown>,
    key: string,
): number | null {
    const val = obj[key];
    if (val === null) return null;
    return reqPositiveInt(obj, key);
}

function reqNonEmptyString(obj: Record<string, unknown>, key: string): string {
    const val = obj[key];
    if (typeof val !== 'string' || !val.trim()) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} không được để trống.`,
        );
    }
    return val.trim();
}

function optNullableString(
    obj: Record<string, unknown>,
    key: string,
): string | null {
    const val = obj[key];
    if (val === null) return null;
    if (typeof val !== 'string') {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} phải là chuỗi hoặc null.`,
        );
    }
    return val;
}

function reqIsoDate(obj: Record<string, unknown>, key: string): string {
    const val = obj[key];
    if (!isIsoDate(val)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} phải theo định dạng YYYY-MM-DD.`,
        );
    }
    return val;
}

function optIsoDate(obj: Record<string, unknown>, key: string): string | null {
    const val = obj[key];
    if (val === null) return null;
    if (!isIsoDate(val)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} phải là ngày YYYY-MM-DD hoặc null.`,
        );
    }
    return val;
}

function optIsoDateTime(
    obj: Record<string, unknown>,
    key: string,
): string | null {
    const val = obj[key];
    if (val === null) return null;
    if (!isIsoDateTime(val)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} phải là mốc thời gian ISO-8601 hoặc null.`,
        );
    }
    return val;
}

function reqEnum<T extends string>(
    obj: Record<string, unknown>,
    key: string,
    allowed: readonly T[],
): T {
    const val = obj[key];
    if (
        typeof val !== 'string' ||
        !(allowed as readonly string[]).includes(val)
    ) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} chứa giá trị không hợp lệ.`,
        );
    }
    return val as T;
}

function parseAcademicYearBody(
    raw: Record<string, unknown>,
): AcademicYearRequest {
    return {
        school_id: reqPositiveInt(raw, 'school_id'),
        year_code: reqNonEmptyString(raw, 'year_code'),
        starts_on: reqIsoDate(raw, 'starts_on'),
        ends_on: reqIsoDate(raw, 'ends_on'),
    };
}

function parseSemesterBody(raw: Record<string, unknown>): SemesterRequest {
    return {
        academic_year_id: reqPositiveInt(raw, 'academic_year_id'),
        semester_no: reqPositiveInt(raw, 'semester_no'),
        starts_on: reqIsoDate(raw, 'starts_on'),
        ends_on: reqIsoDate(raw, 'ends_on'),
    };
}

function parseEducationLevelBody(
    raw: Record<string, unknown>,
): EducationLevelRequest {
    return {
        level_code: reqNonEmptyString(raw, 'level_code'),
        name: reqNonEmptyString(raw, 'name'),
    };
}

function parseGradeBody(raw: Record<string, unknown>): GradeRequest {
    return {
        education_level_id: reqPositiveInt(raw, 'education_level_id'),
        grade_code: reqNonEmptyString(raw, 'grade_code'),
        name: reqNonEmptyString(raw, 'name'),
    };
}

const CLASS_STATUSES: readonly ClassStatus[] = ['ACTIVE', 'INACTIVE'];
function parseClassBody(raw: Record<string, unknown>): SchoolClassRequest {
    return {
        academic_year_id: reqPositiveInt(raw, 'academic_year_id'),
        grade_id: reqPositiveInt(raw, 'grade_id'),
        class_code: reqNonEmptyString(raw, 'class_code'),
        status: reqEnum(raw, 'status', CLASS_STATUSES),
    };
}

function parseSubjectBody(raw: Record<string, unknown>): SubjectRequest {
    return {
        subject_code: reqNonEmptyString(raw, 'subject_code'),
        name: reqNonEmptyString(raw, 'name'),
        valid_from: reqIsoDate(raw, 'valid_from'),
        valid_to: optIsoDate(raw, 'valid_to'),
    };
}

const ROUND_STATUSES: readonly AssignmentRoundStatus[] = [
    'DRAFT',
    'ACTIVE',
    'CLOSED',
    'ARCHIVED',
];
function parseRoundBody(raw: Record<string, unknown>): AssignmentRoundRequest {
    return {
        semester_id: reqPositiveInt(raw, 'semester_id'),
        round_code: reqNonEmptyString(raw, 'round_code'),
        status: reqEnum(raw, 'status', ROUND_STATUSES),
        scope_confirmed_by: optPositiveInt(raw, 'scope_confirmed_by'),
        scope_confirmed_at: optIsoDateTime(raw, 'scope_confirmed_at'),
        opens_at: optIsoDateTime(raw, 'opens_at'),
        closes_at: optIsoDateTime(raw, 'closes_at'),
    };
}

function parseScopeBody(
    raw: Record<string, unknown>,
): RoundSubjectScopeRequest {
    return {
        round_id: reqPositiveInt(raw, 'round_id'),
        grade_id: reqPositiveInt(raw, 'grade_id'),
        subject_id: reqPositiveInt(raw, 'subject_id'),
        confirmed_by: optPositiveInt(raw, 'confirmed_by'),
        confirmed_at: optIsoDateTime(raw, 'confirmed_at'),
    };
}

const APPLICABILITY_STATUSES: readonly ApplicabilityStatus[] = [
    'APPLICABLE',
    'NOT_APPLICABLE',
    'UNDETERMINED',
];
function parseApplicabilityBody(
    raw: Record<string, unknown>,
): ClassSubjectApplicabilityRequest {
    return {
        scope_id: reqPositiveInt(raw, 'scope_id'),
        class_id: reqPositiveInt(raw, 'class_id'),
        status: reqEnum(raw, 'status', APPLICABILITY_STATUSES),
        reason: optNullableString(raw, 'reason'),
        updated_by: optPositiveInt(raw, 'updated_by'),
        confirmed_by: optPositiveInt(raw, 'confirmed_by'),
        confirmed_at: optIsoDateTime(raw, 'confirmed_at'),
        components_confirmed_by: optPositiveInt(raw, 'components_confirmed_by'),
        components_confirmed_at: optIsoDateTime(raw, 'components_confirmed_at'),
    };
}

const DEMAND_TYPES: readonly DemandType[] = [
    'STANDARD',
    'SPECIALIZED_TOPIC',
    'ENRICHMENT',
];
function parseRequiredComponentBody(
    raw: Record<string, unknown>,
): RequiredDemandComponentRequest {
    return {
        applicability_id: reqPositiveInt(raw, 'applicability_id'),
        demand_type: reqEnum(raw, 'demand_type', DEMAND_TYPES),
        valid_from: reqIsoDate(raw, 'valid_from'),
        valid_to: reqIsoDate(raw, 'valid_to'),
        confirmed_by: optPositiveInt(raw, 'confirmed_by'),
        confirmed_at: optIsoDateTime(raw, 'confirmed_at'),
    };
}

const DEMAND_STATUSES: readonly DemandStatus[] = ['ACTIVE', 'INACTIVE'];
function parseDemandBody(raw: Record<string, unknown>): TeachingDemandRequest {
    const periods = raw['periods_per_week'];
    if (typeof periods !== 'number' || !Number.isFinite(periods)) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'periods_per_week phải là số hợp lệ.',
        );
    }
    if (raw['unit'] !== 'PERIOD_PER_WEEK') {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'unit phải là PERIOD_PER_WEEK.',
        );
    }
    return {
        semester_id: reqPositiveInt(raw, 'semester_id'),
        class_id: reqPositiveInt(raw, 'class_id'),
        subject_id: reqPositiveInt(raw, 'subject_id'),
        periods_per_week: periods,
        status: reqEnum(raw, 'status', DEMAND_STATUSES),
        updated_by: optPositiveInt(raw, 'updated_by'),
        demand_type: reqEnum(raw, 'demand_type', DEMAND_TYPES),
        valid_from: reqIsoDate(raw, 'valid_from'),
        valid_to: reqIsoDate(raw, 'valid_to'),
        unit: 'PERIOD_PER_WEEK',
    };
}

function createdJson<T extends { id: number }>(basePath: string, row: T) {
    return HttpResponse.json(row, {
        status: 201,
        headers: { Location: `${basePath}/${row.id}` },
    });
}

export const preparationHandlers = [
    // Academic years
    http.get('*/api/academic-years', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const school_id = parseOptionalPositiveInt(
                url.searchParams,
                'school_id',
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listAcademicYears({
                    school_id,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/academic-years/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'academic_year_id');
            return HttpResponse.json(preparationStore.detailAcademicYear(id));
        }),
    ),
    http.post('*/api/academic-years', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'school_id',
                'year_code',
                'starts_on',
                'ends_on',
            ]);
            return createdJson(
                '/api/academic-years',
                preparationStore.saveAcademicYear(parseAcademicYearBody(raw)),
            );
        }),
    ),
    http.put('*/api/academic-years/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'academic_year_id');
            const raw = await readJsonObject(request, [
                'school_id',
                'year_code',
                'starts_on',
                'ends_on',
            ]);
            return HttpResponse.json(
                preparationStore.saveAcademicYear(
                    parseAcademicYearBody(raw),
                    id,
                ),
            );
        }),
    ),
    http.delete('*/api/academic-years/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'academic_year_id');
            preparationStore.removeAcademicYear(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Semesters
    http.get('*/api/semesters', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const academic_year_id = parseOptionalPositiveInt(
                url.searchParams,
                'academic_year_id',
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listSemesters({
                    academic_year_id,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/semesters/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'semester_id');
            return HttpResponse.json(preparationStore.detailSemester(id));
        }),
    ),
    http.post('*/api/semesters', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'academic_year_id',
                'semester_no',
                'starts_on',
                'ends_on',
            ]);
            return createdJson(
                '/api/semesters',
                preparationStore.saveSemester(parseSemesterBody(raw)),
            );
        }),
    ),
    http.put('*/api/semesters/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'semester_id');
            const raw = await readJsonObject(request, [
                'academic_year_id',
                'semester_no',
                'starts_on',
                'ends_on',
            ]);
            return HttpResponse.json(
                preparationStore.saveSemester(parseSemesterBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/semesters/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'semester_id');
            preparationStore.removeSemester(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Education levels
    http.get('*/api/education-levels', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listEducationLevels(offset, limit),
            );
        }),
    ),
    http.get('*/api/education-levels/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(
                String(params.id),
                'education_level_id',
            );
            return HttpResponse.json(preparationStore.detailEducationLevel(id));
        }),
    ),
    http.post('*/api/education-levels', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, ['level_code', 'name']);
            return createdJson(
                '/api/education-levels',
                preparationStore.saveEducationLevel(
                    parseEducationLevelBody(raw),
                ),
            );
        }),
    ),
    http.put('*/api/education-levels/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(
                String(params.id),
                'education_level_id',
            );
            const raw = await readJsonObject(request, ['level_code', 'name']);
            return HttpResponse.json(
                preparationStore.saveEducationLevel(
                    parseEducationLevelBody(raw),
                    id,
                ),
            );
        }),
    ),
    http.delete('*/api/education-levels/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(
                String(params.id),
                'education_level_id',
            );
            preparationStore.removeEducationLevel(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Grades
    http.get('*/api/grades', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const education_level_id = parseOptionalPositiveInt(
                url.searchParams,
                'education_level_id',
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listGrades({
                    education_level_id,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/grades/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'grade_id');
            return HttpResponse.json(preparationStore.detailGrade(id));
        }),
    ),
    http.post('*/api/grades', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'education_level_id',
                'grade_code',
                'name',
            ]);
            return createdJson(
                '/api/grades',
                preparationStore.saveGrade(parseGradeBody(raw)),
            );
        }),
    ),
    http.put('*/api/grades/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'grade_id');
            const raw = await readJsonObject(request, [
                'education_level_id',
                'grade_code',
                'name',
            ]);
            return HttpResponse.json(
                preparationStore.saveGrade(parseGradeBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/grades/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'grade_id');
            preparationStore.removeGrade(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Classes
    http.get('*/api/classes', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const academic_year_id = parseOptionalPositiveInt(
                url.searchParams,
                'academic_year_id',
            );
            const grade_id = parseOptionalPositiveInt(
                url.searchParams,
                'grade_id',
            );
            const status = parseOptionalEnum(
                url.searchParams,
                'status',
                CLASS_STATUSES,
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listClasses({
                    academic_year_id,
                    grade_id,
                    status,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/classes/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'class_id');
            return HttpResponse.json(preparationStore.detailClass(id));
        }),
    ),
    http.post('*/api/classes', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'academic_year_id',
                'grade_id',
                'class_code',
                'status',
            ]);
            return createdJson(
                '/api/classes',
                preparationStore.saveClass(parseClassBody(raw)),
            );
        }),
    ),
    http.put('*/api/classes/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'class_id');
            const raw = await readJsonObject(request, [
                'academic_year_id',
                'grade_id',
                'class_code',
                'status',
            ]);
            return HttpResponse.json(
                preparationStore.saveClass(parseClassBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/classes/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'class_id');
            preparationStore.removeClass(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Subjects
    http.get('*/api/subjects', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const subject_code =
                url.searchParams.get('subject_code')?.trim() || undefined;
            const q = url.searchParams.get('q')?.trim() || undefined;
            const as_of = parseOptionalIsoDate(url.searchParams, 'as_of');
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listSubjects({
                    subject_code,
                    q,
                    as_of,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/subjects/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'subject_id');
            return HttpResponse.json(preparationStore.detailSubject(id));
        }),
    ),
    http.post('*/api/subjects', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'subject_code',
                'name',
                'valid_from',
                'valid_to',
            ]);
            return createdJson(
                '/api/subjects',
                preparationStore.saveSubject(parseSubjectBody(raw)),
            );
        }),
    ),
    http.put('*/api/subjects/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'subject_id');
            const raw = await readJsonObject(request, [
                'subject_code',
                'name',
                'valid_from',
                'valid_to',
            ]);
            return HttpResponse.json(
                preparationStore.saveSubject(parseSubjectBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/subjects/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'subject_id');
            preparationStore.removeSubject(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Assignment rounds + readiness
    http.get('*/api/assignment-rounds', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const semester_id = parseOptionalPositiveInt(
                url.searchParams,
                'semester_id',
            );
            const status = parseOptionalEnum(
                url.searchParams,
                'status',
                ROUND_STATUSES,
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listRounds({
                    semester_id,
                    status,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/assignment-rounds/:id/readiness', ({ params, request }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'round_id');
            const url = new URL(request.url);
            const optimization_config_id = parseOptionalPositiveInt(
                url.searchParams,
                'optimization_config_id',
            );
            const rule_set_version_id = parseOptionalPositiveInt(
                url.searchParams,
                'rule_set_version_id',
            );
            const hasConfig = optimization_config_id !== undefined;
            const hasRule = rule_set_version_id !== undefined;
            if (hasConfig !== hasRule) {
                throw new MockError(
                    400,
                    'INVALID_REQUEST',
                    'optimization_config_id và rule_set_version_id phải được truyền cùng nhau hoặc bỏ trống cùng nhau.',
                );
            }
            return HttpResponse.json(
                assignmentStore.decorateReadiness(
                    preparationStore.evaluateReadiness(
                        id,
                        { optimization_config_id, rule_set_version_id },
                        scenario,
                    ),
                ),
            );
        }),
    ),
    http.get('*/api/assignment-rounds/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'round_id');
            return HttpResponse.json(preparationStore.detailRound(id));
        }),
    ),
    http.post('*/api/assignment-rounds', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'semester_id',
                'round_code',
                'status',
                'scope_confirmed_by',
                'scope_confirmed_at',
                'opens_at',
                'closes_at',
            ]);
            return createdJson(
                '/api/assignment-rounds',
                preparationStore.saveRound(parseRoundBody(raw)),
            );
        }),
    ),
    http.put('*/api/assignment-rounds/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'round_id');
            const raw = await readJsonObject(request, [
                'semester_id',
                'round_code',
                'status',
                'scope_confirmed_by',
                'scope_confirmed_at',
                'opens_at',
                'closes_at',
            ]);
            return HttpResponse.json(
                preparationStore.saveRound(parseRoundBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/assignment-rounds/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'round_id');
            preparationStore.removeRound(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Round subject scopes
    http.get('*/api/round-subject-scopes', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const round_id = parseOptionalPositiveInt(
                url.searchParams,
                'round_id',
            );
            const grade_id = parseOptionalPositiveInt(
                url.searchParams,
                'grade_id',
            );
            const subject_id = parseOptionalPositiveInt(
                url.searchParams,
                'subject_id',
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listScopes({
                    round_id,
                    grade_id,
                    subject_id,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/round-subject-scopes/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'scope_id');
            return HttpResponse.json(preparationStore.detailScope(id));
        }),
    ),
    http.post('*/api/round-subject-scopes', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'round_id',
                'grade_id',
                'subject_id',
                'confirmed_by',
                'confirmed_at',
            ]);
            return createdJson(
                '/api/round-subject-scopes',
                preparationStore.saveScope(parseScopeBody(raw)),
            );
        }),
    ),
    http.put('*/api/round-subject-scopes/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'scope_id');
            const raw = await readJsonObject(request, [
                'round_id',
                'grade_id',
                'subject_id',
                'confirmed_by',
                'confirmed_at',
            ]);
            return HttpResponse.json(
                preparationStore.saveScope(parseScopeBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/round-subject-scopes/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'scope_id');
            preparationStore.removeScope(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Class subject applicabilities
    http.get('*/api/class-subject-applicabilities', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const scope_id = parseOptionalPositiveInt(
                url.searchParams,
                'scope_id',
            );
            const class_id = parseOptionalPositiveInt(
                url.searchParams,
                'class_id',
            );
            const status = parseOptionalEnum(
                url.searchParams,
                'status',
                APPLICABILITY_STATUSES,
            );
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listApplicabilities({
                    scope_id,
                    class_id,
                    status,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/class-subject-applicabilities/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'applicability_id');
            return HttpResponse.json(preparationStore.detailApplicability(id));
        }),
    ),
    http.post('*/api/class-subject-applicabilities', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'scope_id',
                'class_id',
                'status',
                'reason',
                'updated_by',
                'confirmed_by',
                'confirmed_at',
                'components_confirmed_by',
                'components_confirmed_at',
            ]);
            return createdJson(
                '/api/class-subject-applicabilities',
                preparationStore.saveApplicability(parseApplicabilityBody(raw)),
            );
        }),
    ),
    http.put('*/api/class-subject-applicabilities/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'applicability_id');
            const raw = await readJsonObject(request, [
                'scope_id',
                'class_id',
                'status',
                'reason',
                'updated_by',
                'confirmed_by',
                'confirmed_at',
                'components_confirmed_by',
                'components_confirmed_at',
            ]);
            return HttpResponse.json(
                preparationStore.saveApplicability(
                    parseApplicabilityBody(raw),
                    id,
                ),
            );
        }),
    ),
    http.delete('*/api/class-subject-applicabilities/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'applicability_id');
            preparationStore.removeApplicability(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Required demand components
    http.get('*/api/required-demand-components', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const applicability_id = parseOptionalPositiveInt(
                url.searchParams,
                'applicability_id',
            );
            const demand_type = parseOptionalEnum(
                url.searchParams,
                'demand_type',
                DEMAND_TYPES,
            );
            const as_of = parseOptionalIsoDate(url.searchParams, 'as_of');
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listRequiredComponents({
                    applicability_id,
                    demand_type,
                    as_of,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/required-demand-components/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(
                String(params.id),
                'required_component_id',
            );
            return HttpResponse.json(
                preparationStore.detailRequiredComponent(id),
            );
        }),
    ),
    http.post('*/api/required-demand-components', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'applicability_id',
                'demand_type',
                'valid_from',
                'valid_to',
                'confirmed_by',
                'confirmed_at',
            ]);
            return createdJson(
                '/api/required-demand-components',
                preparationStore.saveRequiredComponent(
                    parseRequiredComponentBody(raw),
                ),
            );
        }),
    ),
    http.put('*/api/required-demand-components/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(
                String(params.id),
                'required_component_id',
            );
            const raw = await readJsonObject(request, [
                'applicability_id',
                'demand_type',
                'valid_from',
                'valid_to',
                'confirmed_by',
                'confirmed_at',
            ]);
            return HttpResponse.json(
                preparationStore.saveRequiredComponent(
                    parseRequiredComponentBody(raw),
                    id,
                ),
            );
        }),
    ),
    http.delete('*/api/required-demand-components/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(
                String(params.id),
                'required_component_id',
            );
            preparationStore.removeRequiredComponent(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),

    // Teaching demands
    http.get('*/api/teaching-demands', ({ request }) =>
        guarded((scenario) => {
            const url = new URL(request.url);
            const semester_id = parseOptionalPositiveInt(
                url.searchParams,
                'semester_id',
            );
            const class_id = parseOptionalPositiveInt(
                url.searchParams,
                'class_id',
            );
            const subject_id = parseOptionalPositiveInt(
                url.searchParams,
                'subject_id',
            );
            const demand_type = parseOptionalEnum(
                url.searchParams,
                'demand_type',
                DEMAND_TYPES,
            );
            const status = parseOptionalEnum(
                url.searchParams,
                'status',
                DEMAND_STATUSES,
            );
            const as_of = parseOptionalIsoDate(url.searchParams, 'as_of');
            const { limit, offset } = parsePagination(url.searchParams);
            if (scenario === 'empty') return HttpResponse.json([]);
            return HttpResponse.json(
                preparationStore.listDemands({
                    semester_id,
                    class_id,
                    subject_id,
                    demand_type,
                    status,
                    as_of,
                    limit,
                    offset,
                }),
            );
        }),
    ),
    http.get('*/api/teaching-demands/:id', ({ params }) =>
        guarded(() => {
            const id = parsePositiveInt(String(params.id), 'demand_id');
            return HttpResponse.json(preparationStore.detailDemand(id));
        }),
    ),
    http.post('*/api/teaching-demands', ({ request }) =>
        guarded(async () => {
            const raw = await readJsonObject(request, [
                'semester_id',
                'class_id',
                'subject_id',
                'periods_per_week',
                'status',
                'updated_by',
                'demand_type',
                'valid_from',
                'valid_to',
                'unit',
            ]);
            return createdJson(
                '/api/teaching-demands',
                preparationStore.saveDemand(parseDemandBody(raw)),
            );
        }),
    ),
    http.put('*/api/teaching-demands/:id', ({ params, request }) =>
        guarded(async () => {
            const id = parsePositiveInt(String(params.id), 'demand_id');
            const raw = await readJsonObject(request, [
                'semester_id',
                'class_id',
                'subject_id',
                'periods_per_week',
                'status',
                'updated_by',
                'demand_type',
                'valid_from',
                'valid_to',
                'unit',
            ]);
            return HttpResponse.json(
                preparationStore.saveDemand(parseDemandBody(raw), id),
            );
        }),
    ),
    http.delete('*/api/teaching-demands/:id', ({ params }) =>
        guarded((scenario) => {
            const id = parsePositiveInt(String(params.id), 'demand_id');
            preparationStore.removeDemand(id, scenario);
            return new HttpResponse(null, { status: 204 });
        }),
    ),
];
