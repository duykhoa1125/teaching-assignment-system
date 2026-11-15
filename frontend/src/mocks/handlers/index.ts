import { delay } from 'msw';
import { http, HttpResponse, type HttpResponseResolver } from 'msw/http';
import { schools } from '../fixtures/index.ts';
import { layoutPreview } from '../fixtures/layout.ts';
import { readOverviewFixture } from '../fixtures/overview.ts';
import { scenarios } from '../scenarios/index.ts';
import { mockStore, MockError } from '../store.ts';
import type { TeacherRequest } from '../../features/teachers/types.ts';

function errorResponse(status: number, code: string, message: string) {
    const reason: Record<number, string> = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        501: 'Not Implemented',
        503: 'Service Unavailable',
    };
    return HttpResponse.json(
        { error: reason[status] ?? `HTTP ${status}`, code, message },
        { status },
    );
}
function positive(value: string | undefined, name: string) {
    if (
        !value ||
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < 1
    )
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${name} phải là số nguyên dương.`,
        );
    return Number(value);
}
function page(url: URL) {
    const limitText = url.searchParams.get('limit') ?? '20';
    const offsetText = url.searchParams.get('offset') ?? '0';
    const limit = positive(limitText, 'limit');
    if (
        limit > 100 ||
        !/^\d+$/.test(offsetText) ||
        !Number.isSafeInteger(Number(offsetText))
    )
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'limit phải từ 1–100, offset là số nguyên không âm.',
        );
    return { limit, offset: Number(offsetText) };
}
function optionalText(url: URL, key: string) {
    const value = url.searchParams.get(key);
    if (value === null) return undefined;
    if (!value.trim())
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${key} không được để trống.`,
        );
    return value.trim();
}
function paginate<Row>(rows: Row[], url: URL) {
    const { limit, offset } = page(url);
    return mockStore.scenario === 'empty'
        ? []
        : rows.slice(offset, offset + limit);
}
async function teacherBody(request: Request): Promise<TeacherRequest> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new MockError(400, 'INVALID_REQUEST', 'JSON không hợp lệ.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new MockError(400, 'INVALID_REQUEST', 'Body phải là một object.');
    const value = body as Record<string, unknown>;
    if (
        Object.keys(value).some(
            (key) => !['school_id', 'teacher_code', 'full_name'].includes(key),
        ) ||
        !Number.isSafeInteger(value.school_id) ||
        Number(value.school_id) <= 0 ||
        typeof value.teacher_code !== 'string' ||
        !value.teacher_code.trim() ||
        value.teacher_code.length > 50 ||
        typeof value.full_name !== 'string' ||
        !value.full_name.trim() ||
        value.full_name.length > 255
    ) {
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'Cần school_id dương, teacher_code (1–50 ký tự), full_name (1–255 ký tự); không gửi trường lạ.',
        );
    }
    return {
        school_id: Number(value.school_id),
        teacher_code: value.teacher_code,
        full_name: value.full_name,
    };
}

const guarded =
    (resolver: HttpResponseResolver): HttpResponseResolver =>
    async (info) => {
        const generation = mockStore.generation;
        const scenario = scenarios[mockStore.scenario];
        await delay(mockStore.scenario === 'slow' ? 1200 : 100);
        if (info.request.signal.aborted) return HttpResponse.error();
        if (generation !== mockStore.generation)
            return errorResponse(
                409,
                'MOCK_STATE_CHANGED',
                'Bộ dữ liệu hoặc scenario vừa được đặt lại. Hãy thử lại.',
            );
        if ('status' in scenario)
            return errorResponse(
                scenario.status,
                scenario.code,
                scenario.message,
            );
        try {
            return await resolver(info);
        } catch (error) {
            if (error instanceof MockError)
                return errorResponse(error.status, error.code, error.message);
            throw error;
        }
    };

export const handlers = [
    http.get(
        '*/api/mock/layout',
        guarded(() => HttpResponse.json(structuredClone(layoutPreview))),
    ),
    http.get(
        '*/api/mock/overview',
        guarded(({ request }) => {
            const url = new URL(request.url);
            const contextId = url.searchParams.get('context_id') || 'hk1';
            const payload = readOverviewFixture(
                contextId,
                mockStore.scenario === 'empty',
            );
            if (!payload) {
                return errorResponse(
                    400,
                    'INVALID_QUERY',
                    'Không tìm thấy không gian học kỳ được yêu cầu.',
                );
            }
            return HttpResponse.json(payload);
        }),
    ),
    http.get(
        '*/api/teachers',
        guarded(({ request }) => {
            const url = new URL(request.url);
            let rows = mockStore.list();
            const school = url.searchParams.get('school_id');
            const schoolId =
                school === null ? undefined : positive(school, 'school_id');
            if (schoolId !== undefined)
                rows = rows.filter((teacher) => teacher.school_id === schoolId);
            const code = optionalText(url, 'teacher_code');
            if (code !== undefined)
                rows = rows.filter(
                    (teacher) => teacher.teacher_code === code.trim(),
                );
            const q = optionalText(url, 'q')?.toLocaleLowerCase('vi');
            if (q)
                rows = rows.filter((teacher) =>
                    teacher.full_name.toLocaleLowerCase('vi').includes(q),
                );
            return HttpResponse.json(
                paginate(
                    rows.sort((a, b) => a.id - b.id),
                    url,
                ),
            );
        }),
    ),
    http.get(
        '*/api/teachers/:id',
        guarded(({ params }) =>
            HttpResponse.json(
                mockStore.detail(positive(String(params.id), 'id')),
            ),
        ),
    ),
    http.post(
        '*/api/teachers',
        guarded(async ({ request }) => {
            const teacher = mockStore.save(await teacherBody(request));
            return HttpResponse.json(teacher, {
                status: 201,
                headers: { Location: `/api/teachers/${teacher.id}` },
            });
        }),
    ),
    http.put(
        '*/api/teachers/:id',
        guarded(async ({ request, params }) =>
            HttpResponse.json(
                mockStore.save(
                    await teacherBody(request),
                    positive(String(params.id), 'id'),
                ),
            ),
        ),
    ),
    http.delete(
        '*/api/teachers/:id',
        guarded(({ params }) => {
            mockStore.remove(positive(String(params.id), 'id'));
            return new HttpResponse(null, { status: 204 });
        }),
    ),
    http.get(
        '*/api/schools',
        guarded(({ request }) =>
            HttpResponse.json(
                paginate(structuredClone(schools), new URL(request.url)),
            ),
        ),
    ),
    // Never forward an unsupported business request to a real backend in mock mode.
    http.all('*/api/*', () =>
        errorResponse(
            501,
            'MOCK_HANDLER_MISSING',
            'Request này chưa có mock handler. Không gửi tới backend.',
        ),
    ),
    http.all('*/api', () =>
        errorResponse(
            501,
            'MOCK_HANDLER_MISSING',
            'Request này chưa có mock handler. Không gửi tới backend.',
        ),
    ),
];
