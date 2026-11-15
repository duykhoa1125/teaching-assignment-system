import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';
import {
    schools,
    academicYears,
    semesters,
    classes,
    grades,
    teachers,
} from '../src/mocks/fixtures/index.ts';

const base = 'http://tass.test/api';
const request = (path, options) => fetch(`${base}${path}`, options);
const jsonRequest = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
const input = {
    school_id: 1,
    teacher_code: 'GV_NEW',
    full_name: 'Giáo viên thử nghiệm',
};

before(() => mockServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
    mockStore.reset();
    mockServer.resetHandlers();
});
after(() => mockServer.close());

test('layout preview exposes context summaries through HTTP without mutating teacher data', async () => {
    const baseline = mockStore.list();
    const response = await request('/mock/layout');
    assert.equal(response.status, 200);
    const preview = await response.json();
    assert.deepEqual(
        preview.contexts.map((context) => context.id),
        ['hk1', 'hk2', 'thcs-demo'],
    );
    for (const context of preview.contexts) {
        assert.ok(context.assigned >= 0 && context.assigned <= context.total);
        assert.ok(context.feedback >= 0);
    }
    assert.equal(preview.account.email, 'quanly@tass.demo');
    assert.equal(
        Math.round(
            (preview.contexts[0].assigned / preview.contexts[0].total) * 100,
        ),
        78,
    );
    preview.account.name = 'Changed by caller';
    assert.equal(
        (await (await request('/mock/layout')).json()).account.name,
        'Nguyễn Minh Khoa',
    );
    assert.deepEqual(mockStore.list(), baseline);
});

test('layout preview respects mock failure scenarios and does not expose a write API', async () => {
    mockStore.setScenario('unavailable');
    assert.equal((await request('/mock/layout')).status, 503);
    mockStore.reset();
    assert.equal(
        (await request('/mock/layout', { method: 'POST' })).status,
        501,
    );
});

test('fixtures have consistent school, year, semester, grade and class relationships', () => {
    for (const teacher of teachers)
        assert.ok(schools.some((school) => school.id === teacher.school_id));
    for (const year of academicYears)
        assert.ok(schools.some((school) => school.id === year.school_id));
    for (const semester of semesters)
        assert.ok(
            academicYears.some((year) => year.id === semester.academic_year_id),
        );
    for (const item of classes) {
        assert.ok(
            academicYears.some((year) => year.id === item.academic_year_id),
        );
        assert.ok(grades.some((grade) => grade.id === item.grade_id));
    }
});

test('teacher filters compose and pagination returns a sorted array without total', async () => {
    const response = await request('/teachers?school_id=1&limit=2&offset=2');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body));
    assert.deepEqual(
        body.map((teacher) => teacher.id),
        [103, 104],
    );
    const search = await (
        await request('/teachers?school_id=1&q=nguy%E1%BB%85n')
    ).json();
    assert.equal(search.length, 1);
    assert.equal(search[0].id, 101);
    const code = await (
        await request('/teachers?school_id=2&teacher_code=GV001')
    ).json();
    assert.deepEqual(
        code.map((teacher) => teacher.id),
        [201],
    );
    assert.deepEqual(await (await request('/teachers?offset=100')).json(), []);
});

test('CRUD preserves JSON contracts, Location, PUT completeness and DELETE 204', async () => {
    const created = await request('/teachers', jsonRequest('POST', input));
    assert.equal(created.status, 201);
    const teacher = await created.json();
    assert.equal(
        created.headers.get('Location'),
        `/api/teachers/${teacher.id}`,
    );
    assert.deepEqual(teacher, { id: teacher.id, ...input });
    const updated = await request(
        `/teachers/${teacher.id}`,
        jsonRequest('PUT', { ...input, full_name: 'Tên đã sửa' }),
    );
    assert.equal(updated.status, 200);
    assert.equal(
        (await (await request(`/teachers/${teacher.id}`)).json()).full_name,
        'Tên đã sửa',
    );
    assert.equal(
        (
            await request(
                `/teachers/${teacher.id}`,
                jsonRequest('PUT', { full_name: 'Thiếu trường' }),
            )
        ).status,
        400,
    );
    const removed = await request(`/teachers/${teacher.id}`, {
        method: 'DELETE',
    });
    assert.equal(removed.status, 204);
    assert.equal(await removed.text(), '');
    assert.equal((await request(`/teachers/${teacher.id}`)).status, 404);
});

test('school references and teacher-code uniqueness match the backend scope', async () => {
    assert.equal(
        (
            await request(
                '/teachers',
                jsonRequest('POST', { ...input, school_id: 999 }),
            )
        ).status,
        409,
    );
    const duplicate = await request(
        '/teachers',
        jsonRequest('POST', { ...input, teacher_code: 'GV001' }),
    );
    assert.equal((await duplicate.json()).code, 'DUPLICATE_RESOURCE');
    const allowed = await request(
        '/teachers',
        jsonRequest('POST', { ...input, school_id: 2, teacher_code: 'GV003' }),
    );
    assert.equal(allowed.status, 201);
});

test('malformed input, extra/read-only fields and invalid pagination are rejected', async () => {
    for (const query of [
        'limit=0',
        'limit=101',
        'limit=1.5',
        'offset=-1',
        'offset=x',
        'school_id=-1',
    ]) {
        assert.equal((await request(`/teachers?${query}`)).status, 400, query);
    }
    for (const body of [
        { ...input, id: 1 },
        { ...input, full_name: ' ' },
        { ...input, teacher_code: 'X'.repeat(51) },
        { ...input, school_id: 1.5 },
    ]) {
        assert.equal(
            (await request('/teachers', jsonRequest('POST', body))).status,
            400,
        );
    }
    assert.equal(
        (await request('/teachers', { method: 'POST', body: '{' })).status,
        400,
    );
    assert.equal((await request('/teachers/not-an-id')).status, 400);
});

test('unknown business requests are blocked locally instead of passing through', async () => {
    for (const [path, options] of [
        ['/not-supported', undefined],
        ['/teachers/101', { method: 'PATCH' }],
        ['', undefined],
    ]) {
        const response = await request(path, options);
        assert.equal(response.status, 501);
        assert.equal((await response.json()).code, 'MOCK_HANDLER_MISSING');
    }
});

test('invalid filters are still rejected when no teacher rows remain', async () => {
    for (const teacher of mockStore.list()) mockStore.remove(teacher.id);
    for (const filter of ['school_id=-1', 'q=%20', 'teacher_code=']) {
        assert.equal((await request(`/teachers?${filter}`)).status, 400);
    }
});

test('school lookup returns the shared fixture with offset/limit pagination', async () => {
    assert.equal((await (await request('/schools')).json()).length, 2);
    assert.deepEqual(
        await (await request('/schools?limit=1&offset=1')).json(),
        [schools[1]],
    );
    assert.equal((await request('/schools?offset=-1')).status, 400);
});

test('explicit error scenarios are deterministic and do not mutate the store', async () => {
    const baseline = mockStore.list();
    for (const [scenario, status] of [
        ['badRequest', 400],
        ['unauthorized', 401],
        ['forbidden', 403],
        ['conflict', 409],
        ['invalid', 422],
        ['unavailable', 503],
    ]) {
        mockStore.setScenario(scenario);
        assert.equal(
            (await request('/teachers', jsonRequest('POST', input))).status,
            status,
        );
    }
    assert.deepEqual(mockStore.list(), baseline);
    assert.throws(() => mockStore.setScenario('typo'));
});

test('empty and reference-conflict scenarios can be selected and reset', async () => {
    mockStore.setScenario('empty');
    assert.deepEqual(await (await request('/teachers')).json(), []);
    mockStore.setScenario('reference');
    const blocked = await request('/teachers/101', { method: 'DELETE' });
    assert.equal(blocked.status, 409);
    assert.equal((await blocked.json()).code, 'REFERENCE_CONFLICT');
    mockStore.reset();
    assert.equal(mockStore.scenario, 'normal');
    assert.equal(
        (await (await request('/teachers')).json()).length,
        teachers.length,
    );
});

test('reset restores data/ID allocation and cloned reads cannot mutate the store', async () => {
    const first = await (
        await request('/teachers', jsonRequest('POST', input))
    ).json();
    const copy = mockStore.list();
    copy[0].full_name = 'Changed externally';
    assert.equal(mockStore.detail(101).full_name, teachers[0].full_name);
    mockStore.reset();
    assert.deepEqual(mockStore.list(), teachers);
    const second = await (
        await request('/teachers', jsonRequest('POST', input))
    ).json();
    assert.equal(first.id, second.id);
});

test('reset prevents an in-flight mutation from writing into the fresh fixture', async () => {
    mockStore.setScenario('slow');
    const pending = request('/teachers', jsonRequest('POST', input));
    await new Promise((resolve) => setTimeout(resolve, 40));
    mockStore.reset();
    const response = await pending;
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'MOCK_STATE_CHANGED');
    assert.deepEqual(mockStore.list(), teachers);
});

test('a slow request can be cancelled without changing data', async () => {
    mockStore.setScenario('slow');
    const controller = new AbortController();
    const pending = request('/teachers', { signal: controller.signal });
    setTimeout(() => controller.abort(), 25);
    await assert.rejects(pending, { name: 'AbortError' });
    assert.deepEqual(mockStore.list(), teachers);
});
