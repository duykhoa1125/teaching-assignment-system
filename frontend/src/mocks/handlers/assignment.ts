import { delay } from 'msw';
import { http, HttpResponse } from 'msw/http';
import type {
    AssignmentBatchLock,
    AssignmentChange,
    AssignmentFilters,
} from '../../features/assignment/types.ts';
import { isValidIsoDate } from '../../features/catalogs/model.ts';
import { assignmentStore } from '../assignment-store.ts';
import { mockStore } from '../store.ts';
import { MockError } from '../mock-error.ts';
import { scenarios } from '../scenarios/index.ts';

const errorResponse = (status: number, code: string, message: string) =>
    HttpResponse.json({ error: code, code, message }, { status });
async function guarded(
    run: () => Response | Promise<Response>,
    request?: Request,
) {
    const generation = mockStore.generation,
        scenario = mockStore.scenario;
    await delay(scenario === 'slow' ? 1200 : 100);
    if (request?.signal.aborted)
        return errorResponse(409, 'REQUEST_ABORTED', 'Yêu cầu đã bị hủy.');
    if (generation !== mockStore.generation)
        return errorResponse(
            409,
            'MOCK_STATE_CHANGED',
            'Mock vừa được đặt lại; thao tác chưa được ghi.',
        );
    const entry = scenarios[scenario];
    if ('status' in entry)
        return errorResponse(entry.status, entry.code, entry.message);
    try {
        assignmentStore.ensure(mockStore.list());
        return await run();
    } catch (error) {
        if (error instanceof MockError)
            return errorResponse(error.status, error.code, error.message);
        throw error;
    }
}
function integer(value: unknown, name: string, min = 1): number {
    if (
        (typeof value !== 'number' && typeof value !== 'string') ||
        !/^\d+$/.test(String(value)) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < min
    )
        throw new MockError(400, 'INVALID_REQUEST', `${name} không hợp lệ.`);
    return Number(value);
}
function reason(value: unknown, name: string, max = 2000) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
        throw new MockError(
            400,
            'INVALID_REQUEST',
            `${name} cần từ 1 đến ${max} ký tự.`,
        );
    return value.trim();
}
async function body(request: Request, allowed: string[]) {
    let data: unknown;
    try {
        data = await request.json();
    } catch {
        throw new MockError(400, 'INVALID_REQUEST', 'Body phải là JSON.');
    }
    if (
        !data ||
        Array.isArray(data) ||
        typeof data !== 'object' ||
        Object.keys(data).some((key) => !allowed.includes(key))
    )
        throw new MockError(
            400,
            'INVALID_REQUEST',
            'Body chứa trường không hợp lệ.',
        );
    return data as Record<string, unknown>;
}
const config = (data: Record<string, unknown>) => ({
    optimization_config_id: integer(
        data.optimization_config_id,
        'optimization_config_id',
    ),
    rule_set_version_id: integer(
        data.rule_set_version_id,
        'rule_set_version_id',
    ),
});
const revision = (data: Record<string, unknown>) =>
    integer(data.expected_revision, 'expected_revision', 0);
function filters(request: Request): AssignmentFilters {
    const query = new URL(request.url).searchParams;
    const result: AssignmentFilters = {};
    for (const key of ['teacher_id', 'class_id', 'limit', 'offset'] as const)
        if (query.has(key))
            result[key] = integer(
                query.get(key),
                key,
                key === 'offset' ? 0 : 1,
            );
    if ((result.limit ?? 50) > 200)
        throw new MockError(400, 'INVALID_REQUEST', 'limit tối đa 200.');
    for (const key of ['is_locked', 'unassigned'] as const)
        if (query.has(key)) {
            const value = query.get(key);
            if (value !== 'true' && value !== 'false')
                throw new MockError(
                    400,
                    'INVALID_REQUEST',
                    `${key} phải là true/false.`,
                );
            result[key] = value === 'true';
        }
    if (query.has('demand_type')) {
        const value = query.get('demand_type');
        if (
            !['STANDARD', 'SPECIALIZED_TOPIC', 'ENRICHMENT'].includes(
                value ?? '',
            )
        )
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Loại thành phần không hợp lệ.',
            );
        result.demand_type = value as AssignmentFilters['demand_type'];
    }
    if (query.has('valid_on')) {
        const value = query.get('valid_on')!;
        if (!isValidIsoDate(value))
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Ngày lọc không hợp lệ.',
            );
        result.valid_on = value;
    }
    return result;
}
const versionId = (params: Record<string, unknown>) =>
    integer(params.id, 'version_id');

export const assignmentHandlers = [
    http.get('*/api/assignment-rounds/:id/plan', ({ params, request }) =>
        guarded(
            () =>
                HttpResponse.json(
                    assignmentStore.current(integer(params.id, 'round_id')),
                ),
            request,
        ),
    ),
    http.post('*/api/assignment-rounds/:id/plan', ({ params, request }) =>
        guarded(async () => {
            const data = await body(request, [
                'optimization_config_id',
                'rule_set_version_id',
            ]);
            const result = assignmentStore.create(
                integer(params.id, 'round_id'),
                config(data),
                mockStore.list(),
            );
            return HttpResponse.json(result, {
                status: 201,
                headers: {
                    Location: `/api/plan-versions/${result.version_id}`,
                },
            });
        }, request),
    ),
    http.get('*/api/plan-versions/:id', ({ params, request }) =>
        guarded(
            () => HttpResponse.json(assignmentStore.version(versionId(params))),
            request,
        ),
    ),
    http.post(
        '*/api/plan-versions/:id/refresh-snapshot',
        ({ params, request }) =>
            guarded(async () => {
                const data = await body(request, [
                    'expected_revision',
                    'optimization_config_id',
                    'rule_set_version_id',
                ]);
                return HttpResponse.json(
                    assignmentStore.refresh(
                        versionId(params),
                        { ...config(data), expected_revision: revision(data) },
                        mockStore.list(),
                    ),
                );
            }, request),
    ),
    http.get('*/api/plan-versions/:id/assignments', ({ params, request }) =>
        guarded(
            () =>
                HttpResponse.json(
                    assignmentStore.rows(versionId(params), filters(request)),
                ),
            request,
        ),
    ),
    http.get('*/api/plan-versions/:id/workloads', ({ params, request }) =>
        guarded(() => {
            const filter = filters(request);
            return HttpResponse.json(
                assignmentStore.workloads(
                    versionId(params),
                    filter.teacher_id,
                    filter.limit,
                    filter.offset,
                ),
            );
        }, request),
    ),
    http.get('*/api/mock/plan-versions/:id/workspace', ({ params, request }) =>
        guarded(
            () =>
                HttpResponse.json(assignmentStore.workspace(versionId(params))),
            request,
        ),
    ),
    http.patch(
        '*/api/plan-versions/:id/assignments/:row',
        ({ params, request }) =>
            guarded(async () => {
                const data = await body(request, [
                    'expected_revision',
                    'teacher_id',
                    'change_reason',
                    'unassigned_reason_code',
                    'unassigned_reason_text',
                ]);
                if (!Object.hasOwn(data, 'teacher_id'))
                    throw new MockError(
                        400,
                        'INVALID_REQUEST',
                        'teacher_id bắt buộc, gửi null để bỏ gán.',
                    );
                const input: AssignmentChange = {
                    expected_revision: revision(data),
                    teacher_id:
                        data.teacher_id === null
                            ? null
                            : integer(data.teacher_id, 'teacher_id'),
                    change_reason: reason(data.change_reason, 'Lý do thay đổi'),
                };
                if (input.teacher_id === null) {
                    input.unassigned_reason_code = reason(
                        data.unassigned_reason_code,
                        'Mã lý do chưa gán',
                        80,
                    );
                    input.unassigned_reason_text = reason(
                        data.unassigned_reason_text,
                        'Lý do chưa gán',
                    );
                } else if (
                    Object.hasOwn(data, 'unassigned_reason_code') ||
                    Object.hasOwn(data, 'unassigned_reason_text')
                )
                    throw new MockError(
                        400,
                        'INVALID_REQUEST',
                        'Không gửi lý do chưa gán khi chọn giáo viên.',
                    );
                return HttpResponse.json(
                    assignmentStore.change(
                        versionId(params),
                        integer(params.row, 'assignment_id'),
                        input,
                    ),
                );
            }, request),
    ),
    ...(['lock', 'unlock'] as const).map((action) =>
        http.post(
            `*/api/plan-versions/:id/assignments/:row/${action}`,
            ({ params, request }) =>
                guarded(async () => {
                    const data = await body(request, [
                        'expected_revision',
                        'reason',
                    ]);
                    return HttpResponse.json(
                        assignmentStore.lock(
                            versionId(params),
                            { rowId: integer(params.row, 'assignment_id') },
                            action === 'lock',
                            {
                                expected_revision: revision(data),
                                reason: reason(data.reason, 'Lý do'),
                            },
                        ),
                    );
                }, request),
        ),
    ),
    ...(['locks', 'unlocks'] as const).map((action) =>
        http.post(
            `*/api/plan-versions/:id/assignments/${action}`,
            ({ params, request }) =>
                guarded(async () => {
                    const data = await body(request, [
                        'expected_revision',
                        'reason',
                        'assignment_ids',
                        'class_id',
                        'subject_id',
                    ]);
                    let selector: Omit<
                        AssignmentBatchLock,
                        'expected_revision' | 'reason'
                    >;
                    if (Object.hasOwn(data, 'assignment_ids')) {
                        if (
                            Object.hasOwn(data, 'class_id') ||
                            Object.hasOwn(data, 'subject_id') ||
                            !Array.isArray(data.assignment_ids) ||
                            data.assignment_ids.length < 1 ||
                            data.assignment_ids.length > 2000
                        )
                            throw new MockError(
                                400,
                                'INVALID_REQUEST',
                                'Chọn 1–2000 dòng, không trộn selector.',
                            );
                        const ids = data.assignment_ids.map((id) =>
                            integer(id, 'assignment_id'),
                        );
                        if (new Set(ids).size !== ids.length)
                            throw new MockError(
                                400,
                                'INVALID_REQUEST',
                                'ID dòng bị trùng.',
                            );
                        selector = { assignment_ids: ids };
                    } else
                        selector = {
                            class_id: integer(data.class_id, 'class_id'),
                            subject_id: integer(data.subject_id, 'subject_id'),
                        };
                    return HttpResponse.json(
                        assignmentStore.lock(
                            versionId(params),
                            selector,
                            action === 'locks',
                            {
                                expected_revision: revision(data),
                                reason: reason(data.reason, 'Lý do'),
                            },
                        ),
                    );
                }, request),
        ),
    ),
];
