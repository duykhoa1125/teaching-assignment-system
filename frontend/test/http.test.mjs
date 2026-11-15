import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { ApiError, apiRequest } from '../src/shared/api/http.ts';

afterEach(() => mock.restoreAll());

test('encodes filters while keeping false and zero; omits absent filters', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
        Response.json([{ id: 1 }]),
    );
    const result = await apiRequest('/teachers', {
        query: {
            q: 'Nguyễn & An',
            offset: 0,
            active: false,
            limit: 20,
            missing: null,
            other: undefined,
            empty: '',
        },
    });
    assert.deepEqual(result, [{ id: 1 }]);
    const [url, options] = fetchMock.mock.calls[0].arguments;
    const parsed = new URL(url, 'http://localhost');
    assert.equal(parsed.pathname, '/api/teachers');
    assert.equal(parsed.searchParams.get('q'), 'Nguyễn & An');
    assert.equal(parsed.searchParams.get('offset'), '0');
    assert.equal(parsed.searchParams.get('active'), 'false');
    assert.equal(parsed.searchParams.has('missing'), false);
    assert.equal(parsed.searchParams.has('other'), false);
    assert.equal(parsed.searchParams.has('empty'), false);
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.headers.get('accept'), 'application/json');
    assert.equal(options.headers.has('content-type'), false);
});

test('sends the complete JSON body, preserving explicit null and custom headers', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
        Response.json({ id: 1 }, { status: 201 }),
    );
    const body = {
        school_id: 1,
        teacher_code: 'GV01',
        full_name: 'Nguyễn An',
        optional: null,
    };
    await apiRequest('/teachers', {
        method: 'POST',
        json: body,
        headers: { 'X-Request-Id': 'local-test' },
    });
    const options = fetchMock.mock.calls[0].arguments[1];
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), body);
    assert.equal(options.headers.get('content-type'), 'application/json');
    assert.equal(options.headers.get('x-request-id'), 'local-test');
});

test('DELETE 204 succeeds without trying to parse an empty body', async () => {
    mock.method(
        globalThis,
        'fetch',
        async () => new Response(null, { status: 204 }),
    );
    assert.equal(
        await apiRequest('/teachers/1', { method: 'DELETE' }),
        undefined,
    );
});

test('preserves backend revision conflicts and never retries a mutation', async () => {
    const body = {
        error: 'Conflict',
        code: 'REVISION_CONFLICT',
        message: 'Revision đã thay đổi.',
    };
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
        Response.json(body, { status: 409 }),
    );
    await assert.rejects(
        apiRequest('/plan-versions/1/assignments/2', {
            method: 'PATCH',
            json: { expected_revision: 3, teacher_id: 4 },
        }),
        (error) => {
            assert.ok(error instanceof ApiError);
            assert.equal(error.status, 409);
            assert.equal(error.code, 'REVISION_CONFLICT');
            assert.equal(error.message, body.message);
            assert.deepEqual(error.details, body);
            return true;
        },
    );
    assert.equal(fetchMock.mock.callCount(), 1);
});

test('preserves structured errors with a +json media type', async () => {
    mock.method(
        globalThis,
        'fetch',
        async () =>
            new Response(
                JSON.stringify({
                    code: 'SOLVER_NOT_READY',
                    message: 'Thiếu nguồn tải.',
                }),
                {
                    status: 422,
                    headers: { 'Content-Type': 'application/problem+json' },
                },
            ),
    );
    await assert.rejects(
        apiRequest('/plan-versions/1/solver-runs', { method: 'POST' }),
        { status: 422, code: 'SOLVER_NOT_READY' },
    );
});

test('exposes Location when a solver run is already active', async () => {
    mock.method(globalThis, 'fetch', async () =>
        Response.json(
            { code: 'SOLVER_RUN_ACTIVE', message: 'Đã có lượt đang chạy.' },
            { status: 409, headers: { Location: '/api/solver-runs/42' } },
        ),
    );
    await assert.rejects(
        apiRequest('/plan-versions/1/solver-runs', { method: 'POST' }),
        {
            code: 'SOLVER_RUN_ACTIVE',
            location: '/api/solver-runs/42',
        },
    );
});

test('rejects an HTML success response instead of treating the SPA fallback as data', async () => {
    mock.method(
        globalThis,
        'fetch',
        async () =>
            new Response('<!doctype html><title>TASS</title>', {
                headers: { 'Content-Type': 'text/html' },
            }),
    );
    await assert.rejects(apiRequest('/teachers'), {
        status: 200,
        code: 'INVALID_RESPONSE',
    });
});

test('rejects malformed JSON on a successful response', async () => {
    mock.method(
        globalThis,
        'fetch',
        async () =>
            new Response('{broken', {
                headers: { 'Content-Type': 'application/json' },
            }),
    );
    await assert.rejects(apiRequest('/teachers'), { code: 'INVALID_RESPONSE' });
});

test('retains HTTP status for non-JSON proxy errors without displaying HTML', async () => {
    mock.method(
        globalThis,
        'fetch',
        async () =>
            new Response('<html>upstream unavailable</html>', {
                status: 503,
                headers: { 'Content-Type': 'text/html' },
            }),
    );
    await assert.rejects(apiRequest('/teachers'), (error) => {
        assert.equal(error.status, 503);
        assert.equal(error.code, 'HTTP_ERROR');
        assert.equal(error.message.includes('<html>'), false);
        return true;
    });
});

test('keeps network failures distinct from HTTP errors', async () => {
    const failure = new TypeError('Failed to fetch');
    mock.method(globalThis, 'fetch', async () => {
        throw failure;
    });
    await assert.rejects(apiRequest('/teachers'), (error) => error === failure);
});

test('forwards AbortSignal and preserves cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    mock.method(globalThis, 'fetch', async (_url, options) => {
        assert.equal(options.signal, controller.signal);
        options.signal.throwIfAborted();
    });
    await assert.rejects(
        apiRequest('/teachers', { signal: controller.signal }),
        { name: 'AbortError' },
    );
});

test('rejects external or ambiguous API paths before making a request', async () => {
    const fetchMock = mock.method(globalThis, 'fetch');
    for (const path of [
        'https://example.com',
        '//example.com',
        '/teachers?q=an',
        '/teachers#detail',
    ]) {
        await assert.rejects(apiRequest(path), TypeError);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
});
