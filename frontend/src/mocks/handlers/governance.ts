import { delay } from 'msw';
import { http, HttpResponse, type HttpResponseResolver } from 'msw/http';
import { governanceStore } from '../governance-store.ts';
import { MockError } from '../mock-error.ts';
import { scenarios } from '../scenarios/index.ts';
import { mockStore } from '../store.ts';
import type {
    FeedbackDecision,
    PlanSnapshot,
    SaveAliasRequest,
    SaveRuleRequest,
    SaveSourceRequest,
    TeacherFeedbackSubmitRequest,
} from '../../features/governance/types.ts';

function errorResponse(status: number, code: string, message: string) {
    return HttpResponse.json({ code, message }, { status });
}

const guarded =
    (resolver: HttpResponseResolver): HttpResponseResolver =>
    async (info) => {
        const generation = mockStore.generation;
        const scenario = scenarios[mockStore.scenario];
        await delay(mockStore.scenario === 'slow' ? 1200 : 80);
        if (info.request.signal.aborted) return HttpResponse.error();
        if (generation !== mockStore.generation) {
            return errorResponse(
                409,
                'MOCK_STATE_CHANGED',
                'Bộ dữ liệu hoặc scenario vừa được đặt lại.',
            );
        }
        if ('status' in scenario) {
            return errorResponse(
                scenario.status,
                scenario.code,
                scenario.message,
            );
        }
        try {
            return await resolver(info);
        } catch (error) {
            if (error instanceof MockError) {
                return errorResponse(error.status, error.code, error.message);
            }
            throw error;
        }
    };

async function bodyObject(request: Request): Promise<Record<string, unknown>> {
    try {
        const value = await request.json();
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
        }
    } catch {
        // Fall through
    }
    throw new MockError(
        400,
        'INVALID_REQUEST',
        'Body phải là một JSON object.',
    );
}

export const governanceHandlers = [
    http.get(
        '*/api/mock/governance/overview',
        guarded(({ request }) => {
            const url = new URL(request.url);
            const contextId = url.searchParams.get('context_id') || 'hk1';
            return HttpResponse.json(
                governanceStore.overview(contextId, mockStore.list()),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/feedback/open',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.openFeedback(
                    String(body.context_id ?? 'hk1'),
                    String(body.due ?? ''),
                    String(body.actor_name ?? 'Nguyễn Minh Khoa'),
                    mockStore.list(),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/feedback/close',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.closeFeedback(
                    String(body.context_id ?? 'hk1'),
                    String(body.reason ?? ''),
                    String(body.actor_name ?? 'Nguyễn Minh Khoa'),
                    mockStore.list(),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/feedback/:id/resolve',
        guarded(async ({ params, request }) => {
            const body = await bodyObject(request);
            const feedbackId = Number(params.id);
            return HttpResponse.json(
                governanceStore.resolveFeedback(
                    feedbackId,
                    {
                        context_id: String(body.context_id ?? 'hk1'),
                        decision: (body.decision ??
                            'ACCEPTED') as FeedbackDecision,
                        result: String(body.result ?? ''),
                        actor_name:
                            typeof body.actor_name === 'string'
                                ? body.actor_name
                                : undefined,
                    },
                    mockStore.list(),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/teacher/feedback',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.submitTeacherFeedback(
                    body as unknown as TeacherFeedbackSubmitRequest,
                    mockStore.list(),
                ),
                { status: 201 },
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/versions/next',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.createNextDraft(
                    String(body.context_id ?? 'hk1'),
                    String(body.actor_name ?? 'Nguyễn Minh Khoa'),
                    mockStore.list(),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/versions/ready',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.markReady(
                    String(body.context_id ?? 'hk1'),
                    String(body.reason ?? ''),
                    String(body.actor_name ?? 'Nguyễn Minh Khoa'),
                    mockStore.list(),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/snapshots',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.saveSnapshot(
                    String(body.context_id ?? 'hk1'),
                    typeof body.title === 'string' ? body.title : undefined,
                    String(body.actor_name ?? 'Nguyễn Minh Khoa'),
                    mockStore.list(),
                ),
                { status: 201 },
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/snapshots/:id/restore',
        guarded(async ({ params, request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.restoreSnapshot(
                    String(body.context_id ?? 'hk1'),
                    String(params.id ?? ''),
                    String(body.actor_name ?? 'Nguyễn Minh Khoa'),
                    mockStore.list(),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/documents/issue',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.issueDocument(
                    body as unknown as {
                        context_id: string;
                        mode: 'teachers' | 'classes';
                        filename: string;
                        bytes: number;
                        sha256: string;
                        source_token: string;
                        base_revision: number;
                        validation_id: string;
                        pdf_base64: string;
                        snapshot: PlanSnapshot;
                        actor_name?: string;
                    },
                    mockStore.list(),
                ),
                { status: 201 },
            );
        }),
    ),
    http.get(
        '*/api/mock/governance/rules',
        guarded(() => HttpResponse.json(governanceStore.listRules())),
    ),
    http.post(
        '*/api/mock/governance/rules',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.saveRule(
                    body as unknown as SaveRuleRequest & {
                        actor_name?: string;
                    },
                ),
                { status: 201 },
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/rules/:id',
        guarded(async ({ params, request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.saveRule(
                    body as unknown as SaveRuleRequest & {
                        actor_name?: string;
                    },
                    String(params.id ?? ''),
                ),
                { status: 201 },
            );
        }),
    ),
    http.get(
        '*/api/mock/governance/sources',
        guarded(() => HttpResponse.json(governanceStore.listSources())),
    ),
    http.post(
        '*/api/mock/governance/sources',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.saveSource(
                    body as unknown as SaveSourceRequest,
                ),
                { status: 201 },
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/sources/:id',
        guarded(async ({ params, request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.saveSource(
                    body as unknown as SaveSourceRequest,
                    String(params.id ?? ''),
                ),
            );
        }),
    ),
    http.post(
        '*/api/mock/governance/aliases',
        guarded(async ({ request }) => {
            const body = await bodyObject(request);
            return HttpResponse.json(
                governanceStore.saveAlias(body as unknown as SaveAliasRequest),
                { status: 201 },
            );
        }),
    ),
    http.get(
        '*/api/mock/governance/audit',
        guarded(({ request }) => {
            const url = new URL(request.url);
            return HttpResponse.json(
                governanceStore.listAudit({
                    q: url.searchParams.get('q') ?? undefined,
                    from: url.searchParams.get('from') ?? undefined,
                    to: url.searchParams.get('to') ?? undefined,
                }),
            );
        }),
    ),
];
