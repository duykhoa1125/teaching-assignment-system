import assert from 'node:assert/strict';
import { before, after, beforeEach, test } from 'node:test';
import { delay } from 'msw';
import { http, HttpResponse } from 'msw/http';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';
import { assignmentStore } from '../src/mocks/assignment-store.ts';
import { readAssignmentRows } from '../src/features/assignment/api.ts';
import {
    assignmentChange,
    candidateState,
    canEditPlan,
    canWritePlan,
    filterAssignmentRows,
} from '../src/features/assignment/model.ts';

const origin = 'http://tass.test';
let interceptedFetch;
before(() => {
    mockServer.listen({ onUnhandledFrame: 'error' });
    interceptedFetch = globalThis.fetch;
    globalThis.fetch = (input, init) =>
        interceptedFetch(
            typeof input === 'string' && input.startsWith('/')
                ? origin + input
                : input,
            init,
        );
});
after(() => {
    globalThis.fetch = interceptedFetch;
    mockServer.close();
});
beforeEach(() => {
    mockStore.reset();
    mockServer.resetHandlers();
});
async function request(path, method = 'GET', json, signal) {
    const response = await fetch(`${origin}/api${path}`, {
        method,
        ...(json === undefined
            ? {}
            : {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(json),
              }),
        signal,
    });
    return {
        status: response.status,
        location: response.headers.get('Location'),
        body: response.status === 204 ? null : await response.json(),
    };
}
const current = async () => (await request('/assignment-rounds/1/plan')).body;
const rows = async (id) =>
    (await request(`/plan-versions/${id}/assignments?limit=200`)).body;
const mutation = (id, path, json, method = 'POST', signal) =>
    request(`/plan-versions/${id}/assignments${path}`, method, json, signal);
const configuration = { optimization_config_id: 1, rule_set_version_id: 1 };
const lockInput = (revision) => ({
    expected_revision: revision,
    reason: 'Giữ nguyên quyết định đã thống nhất',
});

test('layout and overview share the loaded plan coverage and revision after a change', async () => {
    const plan = await current();
    const page = await rows(plan.version_id);
    const row = page.items.find((item) => item.teacher_id === null);
    const changed = await mutation(
        plan.version_id,
        `/${row.id}`,
        {
            expected_revision: plan.revision_no,
            teacher_id: 105,
            change_reason: 'Bổ sung phân công từ workspace',
        },
        'PATCH',
    );
    assert.equal(changed.status, 200);
    const assigned =
        page.items.filter((item) => item.teacher_id !== null).length + 1;
    const layout = (await request('/mock/layout')).body;
    assert.equal(
        layout.contexts.find((item) => item.id === 'hk1').assigned,
        assigned,
    );
    assert.equal(
        layout.contexts.find((item) => item.id === 'hk1').total,
        page.total,
    );
    const overview = (await request('/mock/overview?context_id=hk1')).body;
    assert.equal(overview.summary.assigned_demands, assigned);
    assert.equal(overview.summary.total_demands, page.total);
    assert.equal(overview.plan_revision, changed.body.version.revision_no);
    assert.equal(
        overview.teachers.flatMap((item) => item.assignments).length,
        assigned,
    );
    assert.equal(overview.readiness.validation_releasable, false);
});

test('create absent plan returns Location, a DRAFT and distinct plan-demand IDs; duplicate create is rejected', async () => {
    mockStore.setScenario('planEmpty');
    assert.equal((await request('/assignment-rounds/1/plan')).status, 404);
    const created = await request(
        '/assignment-rounds/1/plan',
        'POST',
        configuration,
    );
    assert.equal(created.status, 201);
    assert.equal(
        created.location,
        `/api/plan-versions/${created.body.version_id}`,
    );
    assert.equal(created.body.version_no, 1);
    assert.equal(created.body.status, 'DRAFT');
    const page = await rows(created.body.version_id);
    assert.ok(page.items.length > 0);
    assert.equal(created.body.revision_no, page.items.length);
    assert.ok(
        page.items.every(
            (row) =>
                row.id !== row.demand_id &&
                row.teacher_id === null &&
                !row.locked,
        ),
    );
    assert.equal(
        (await request('/assignment-rounds/1/plan', 'POST', configuration)).body
            .code,
        'PLAN_ALREADY_EXISTS',
    );
    assert.equal(
        (
            await request('/assignment-rounds/1/plan', 'POST', {
                ...configuration,
                actor_id: 1,
            })
        ).status,
        400,
    );
});

test('historical and non-DRAFT versions remain readable but reject changes', async () => {
    const plan = await current(),
        history = (
            await request(`/mock/plan-versions/${plan.version_id}/workspace`)
        ).body.versions.find((version) => !version.is_current);
    assert.ok(history);
    const page = await rows(history.version_id);
    assert.equal(page.version.current_version, false);
    const result = await mutation(
        history.version_id,
        `/${page.items[0].id}`,
        {
            expected_revision: history.revision_no,
            teacher_id: 101,
            change_reason: 'Thử phiên bản cũ',
        },
        'PATCH',
    );
    assert.equal(result.body.code, 'CURRENT_DRAFT_REQUIRED');
    mockStore.setScenario('planReadOnly');
    const readonly = await current();
    assert.equal(readonly.status, 'OPEN_FOR_FEEDBACK');
    assert.equal(
        (
            await request(
                `/plan-versions/${readonly.version_id}/refresh-snapshot`,
                'POST',
                { ...configuration, expected_revision: readonly.revision_no },
            )
        ).body.code,
        'CURRENT_DRAFT_REQUIRED',
    );
});

test('assignment filters compose, total is filtered and pagination/order are stable', async () => {
    const plan = await current(),
        all = await rows(plan.version_id),
        example = all.items.find((row) => row.teacher_id !== null);
    const filtered = await request(
        `/plan-versions/${plan.version_id}/assignments?teacher_id=${example.teacher_id}&class_id=${example.class_id}&unassigned=false&limit=1&offset=0`,
    );
    const expected = all.items.filter(
        (row) =>
            row.teacher_id === example.teacher_id &&
            row.class_id === example.class_id,
    );
    assert.equal(filtered.body.total, expected.length);
    assert.deepEqual(filtered.body.items, [expected[0]]);
    for (const filter of [
        'limit=201',
        'offset=-1',
        'is_locked=maybe',
        'valid_on=2026-02-30',
        'teacher_id=0',
    ])
        assert.equal(
            (
                await request(
                    `/plan-versions/${plan.version_id}/assignments?${filter}`,
                )
            ).status,
            400,
        );
});

test('PATCH no-op preserves revision/audit; explicit unassignment reasons roundtrip and reassignment clears them', async () => {
    const plan = await current(),
        row = (await rows(plan.version_id)).items.find(
            (item) => item.teacher_id !== null && !item.locked,
        );
    const auditBefore = assignmentStore.audit().length;
    const noop = await mutation(
        plan.version_id,
        `/${row.id}`,
        {
            expected_revision: plan.revision_no,
            teacher_id: row.teacher_id,
            change_reason: 'Xác nhận lại cùng giáo viên',
        },
        'PATCH',
    );
    assert.equal(noop.body.changed_count, 0);
    assert.equal(noop.body.version.revision_no, plan.revision_no);
    assert.equal(assignmentStore.audit().length, auditBefore);
    const removed = await mutation(
        plan.version_id,
        `/${row.id}`,
        assignmentChange(
            plan.revision_no,
            '',
            'Điều chỉnh phân công',
            'Chờ bố trí giáo viên',
        ),
        'PATCH',
    );
    assert.equal(removed.body.changed_count, 1);
    assert.equal(removed.body.items[0].teacher_id, null);
    assert.equal(
        removed.body.items[0].unassigned_reason_text,
        'Chờ bố trí giáo viên',
    );
    const restored = await mutation(
        plan.version_id,
        `/${row.id}`,
        assignmentChange(
            removed.body.version.revision_no,
            String(row.teacher_id),
            'Phân công lại hợp lệ',
            '',
        ),
        'PATCH',
    );
    assert.equal(restored.status, 200);
    assert.equal(restored.body.items[0].teacher_name, row.teacher_name);
    assert.equal(restored.body.items[0].unassigned_reason_code, null);
    assert.equal(
        (
            await mutation(
                plan.version_id,
                `/${row.demand_id}`,
                assignmentChange(
                    restored.body.version.revision_no,
                    String(row.teacher_id),
                    'Nhầm ID nguồn',
                    '',
                ),
                'PATCH',
            )
        ).status,
        404,
    );
});

test('locked edits, missing/null teacher fields, unknown body fields and ineligible teachers do not mutate rows', async () => {
    const plan = await current(),
        before = await rows(plan.version_id),
        locked = before.items.find((row) => row.locked),
        unlocked = before.items.find(
            (row) => !row.locked && row.subject_id === 1,
        );
    assert.equal(
        (
            await mutation(
                plan.version_id,
                `/${locked.id}`,
                assignmentChange(
                    plan.revision_no,
                    String(locked.teacher_id),
                    'Không được đổi khóa',
                    '',
                ),
                'PATCH',
            )
        ).body.code,
        'ASSIGNMENT_LOCKED',
    );
    for (const input of [
        {
            expected_revision: plan.revision_no,
            change_reason: 'Thiếu giáo viên',
        },
        {
            expected_revision: plan.revision_no,
            teacher_id: null,
            change_reason: 'Thiếu lý do bỏ gán',
        },
        {
            ...assignmentChange(plan.revision_no, '101', 'Đổi giáo viên', ''),
            periods_per_week: 3,
        },
    ])
        assert.equal(
            (await mutation(plan.version_id, `/${unlocked.id}`, input, 'PATCH'))
                .status,
            400,
        );
    assert.equal(
        (
            await mutation(
                plan.version_id,
                `/${unlocked.id}`,
                assignmentChange(
                    plan.revision_no,
                    '103',
                    'Không có chuyên môn phù hợp',
                    '',
                ),
                'PATCH',
            )
        ).body.code,
        'ASSIGNMENT_INELIGIBLE',
    );
    assert.deepEqual((await rows(plan.version_id)).items, before.items);
});

test('group locks are atomic, keep different teachers, increment per changed row, and preserve metadata on no-op', async () => {
    const plan = await current(),
        all = await rows(plan.version_id),
        first = all.items[0],
        group = all.items.filter(
            (row) =>
                row.class_id === first.class_id &&
                row.subject_id === first.subject_id,
        );
    assert.ok(group.length >= 2);
    assert.ok(new Set(group.map((row) => row.teacher_id)).size > 1);
    const selector = { class_id: first.class_id, subject_id: first.subject_id };
    const unlocked = await mutation(plan.version_id, '/unlocks', {
        ...lockInput(plan.revision_no),
        ...selector,
    });
    assert.equal(unlocked.body.changed_count, group.length);
    assert.equal(
        unlocked.body.version.revision_no,
        plan.revision_no + group.length,
    );
    const locked = await mutation(plan.version_id, '/locks', {
        ...lockInput(unlocked.body.version.revision_no),
        ...selector,
    });
    assert.equal(locked.body.changed_count, group.length);
    assert.deepEqual(
        locked.body.items.map((row) => row.teacher_id),
        group.map((row) => row.teacher_id),
    );
    const auditBefore = assignmentStore.audit().length;
    const noop = await mutation(plan.version_id, '/locks', {
        ...lockInput(locked.body.version.revision_no),
        ...selector,
    });
    assert.equal(noop.body.changed_count, 0);
    assert.equal(
        noop.body.version.revision_no,
        locked.body.version.revision_no,
    );
    assert.deepEqual(noop.body.items, locked.body.items);
    assert.equal(assignmentStore.audit().length, auditBefore);
});

test('batch selectors reject duplicates/mixed selection and roll back every row if one cannot be locked', async () => {
    const plan = await current(),
        all = await rows(plan.version_id),
        selected = all.items.filter((row) => !row.locked),
        unassigned = selected.find((row) => row.teacher_id === null),
        assigned = selected.find((row) => row.teacher_id !== null);
    assert.ok(unassigned && assigned);
    for (const selector of [
        { assignment_ids: [assigned.id, assigned.id] },
        { assignment_ids: [] },
        {
            assignment_ids: [assigned.id],
            class_id: assigned.class_id,
            subject_id: assigned.subject_id,
        },
        { class_id: assigned.class_id },
    ])
        assert.equal(
            (
                await mutation(plan.version_id, '/locks', {
                    ...lockInput(plan.revision_no),
                    ...selector,
                })
            ).status,
            400,
        );
    const blocked = await mutation(plan.version_id, '/locks', {
        ...lockInput(plan.revision_no),
        assignment_ids: [assigned.id, unassigned.id],
    });
    assert.equal(blocked.body.code, 'ASSIGNMENT_NOT_ASSIGNED');
    assert.deepEqual(await rows(plan.version_id), all);
    assert.equal(
        (
            await mutation(plan.version_id, '/locks', {
                ...lockInput(plan.revision_no),
                assignment_ids: [assigned.id, 999999],
            })
        ).status,
        404,
    );
    assert.deepEqual(await rows(plan.version_id), all);
});

test('stale locked input rejects refresh atomically, permits pure unlock, then refresh reconciles and returns server revision', async () => {
    const plan = await current(),
        before = await rows(plan.version_id),
        row = before.items.find((item) => item.locked);
    const loadsBefore = (
        await request(`/plan-versions/${plan.version_id}/workloads`)
    ).body.items;
    const demand = (await request(`/teaching-demands/${row.demand_id}`)).body;
    const { id: _id, updated_at: _at, ...payload } = demand;
    assert.equal(
        (
            await request(`/teaching-demands/${row.demand_id}`, 'PUT', {
                ...payload,
                periods_per_week: demand.periods_per_week + 1,
            })
        ).status,
        200,
    );
    const stale = await current();
    assert.equal(stale.snapshot_fresh, false);
    assert.deepEqual((await rows(plan.version_id)).items, before.items);
    assert.deepEqual(
        (await request(`/plan-versions/${plan.version_id}/workloads`)).body
            .items,
        loadsBefore,
    );
    assert.equal(
        (
            await mutation(
                plan.version_id,
                `/${row.id}/lock`,
                lockInput(plan.revision_no),
            )
        ).body.code,
        'STALE_INPUT',
    );
    const failed = await request(
        `/plan-versions/${plan.version_id}/refresh-snapshot`,
        'POST',
        { ...configuration, expected_revision: plan.revision_no },
    );
    assert.equal(failed.body.code, 'LOCK_CONFLICT');
    assert.equal((await current()).input_snapshot_id, plan.input_snapshot_id);
    assert.equal((await current()).revision_no, plan.revision_no);
    const unlock = await mutation(
        plan.version_id,
        `/${row.id}/unlock`,
        lockInput(plan.revision_no),
    );
    assert.equal(unlock.status, 200);
    assert.equal(unlock.body.version.snapshot_fresh, false);
    const refreshed = await request(
        `/plan-versions/${plan.version_id}/refresh-snapshot`,
        'POST',
        {
            ...configuration,
            expected_revision: unlock.body.version.revision_no,
        },
    );
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.body.snapshot_fresh, true);
    assert.notEqual(refreshed.body.input_snapshot_id, plan.input_snapshot_id);
    assert.ok(refreshed.body.revision_no > unlock.body.version.revision_no);
    const after = (await rows(plan.version_id)).items.find(
        (item) => item.id === row.id,
    );
    assert.equal(after.periods_per_week, row.periods_per_week + 1);
    assert.equal(after.teacher_id, row.teacher_id);
});

test('snapshot labels stay frozen after live teacher/catalog changes and historical labels survive refresh', async () => {
    const plan = await current(),
        before = await rows(plan.version_id),
        row = before.items[0];
    const cls = (await request(`/classes/${row.class_id}`)).body;
    const { id: _class, ...classInput } = cls;
    assert.equal(
        (
            await request(`/classes/${row.class_id}`, 'PUT', {
                ...classInput,
                class_code: '10A1-MOI',
            })
        ).status,
        200,
    );
    const teacher = (await request(`/teachers/${row.teacher_id}`)).body;
    const { id: _teacher, ...teacherInput } = teacher;
    assert.equal(
        (
            await request(`/teachers/${row.teacher_id}`, 'PUT', {
                ...teacherInput,
                full_name: 'Giáo viên đổi tên',
            })
        ).status,
        200,
    );
    assert.equal((await current()).snapshot_fresh, false);
    assert.equal(
        (await rows(plan.version_id)).items[0].class_name,
        row.class_name,
    );
    assert.equal(
        (await rows(plan.version_id)).items[0].teacher_name,
        row.teacher_name,
    );
    assert.equal(
        (
            await request(
                `/plan-versions/${plan.version_id}/refresh-snapshot`,
                'POST',
                { ...configuration, expected_revision: plan.revision_no },
            )
        ).status,
        200,
    );
    const fresh = (await rows(plan.version_id)).items[0];
    assert.equal(fresh.class_name, '10A1-MOI');
    assert.equal(fresh.teacher_name, 'Giáo viên đổi tên');
    const history = (
        await request(`/mock/plan-versions/${plan.version_id}/workspace`)
    ).body.versions.find((item) => !item.is_current);
    assert.equal(
        (await rows(history.version_id)).items[0].class_name,
        row.class_name,
    );
});

test('hard weekly cap is checked against the proposed whole plan before any assignment is saved', async () => {
    const plan = await current();
    const demand = await request('/teaching-demands', 'POST', {
        semester_id: 1,
        class_id: 14,
        subject_id: 1,
        demand_type: 'ENRICHMENT',
        periods_per_week: 100,
        status: 'ACTIVE',
        updated_by: 1,
        valid_from: '2026-08-01',
        valid_to: '2026-12-31',
        unit: 'PERIOD_PER_WEEK',
    });
    assert.equal(demand.status, 201);
    const refreshed = (
        await request(
            `/plan-versions/${plan.version_id}/refresh-snapshot`,
            'POST',
            { ...configuration, expected_revision: plan.revision_no },
        )
    ).body;
    const row = (await rows(plan.version_id)).items.find(
        (item) => item.demand_id === demand.body.id,
    );
    const rejected = await mutation(
        plan.version_id,
        `/${row.id}`,
        assignmentChange(refreshed.revision_no, '101', 'Thử tải vượt trần', ''),
        'PATCH',
    );
    assert.equal(rejected.body.code, 'ASSIGNMENT_HARD_VIOLATION');
    assert.equal((await current()).revision_no, refreshed.revision_no);
    assert.equal(
        (await rows(plan.version_id)).items.find((item) => item.id === row.id)
            .teacher_id,
        null,
    );
});

test('stale revision is never automatically replayed; explicit reload obtains the revision needed for retry', async () => {
    mockStore.setScenario('planRevisionConflict');
    const plan = await current(),
        row = (await rows(plan.version_id)).items.find(
            (item) => !item.locked && item.teacher_id !== null,
        );
    const failed = await mutation(
        plan.version_id,
        `/${row.id}/lock`,
        lockInput(plan.revision_no),
    );
    assert.equal(failed.body.code, 'REVISION_CONFLICT');
    const fresh = await current();
    assert.ok(fresh.revision_no > plan.revision_no);
    const retried = await mutation(
        plan.version_id,
        `/${row.id}/lock`,
        lockInput(fresh.revision_no),
    );
    assert.equal(retried.status, 200);
    assert.equal(retried.body.changed_count, 1);
});

test('reset and cancellation prevent delayed writes from changing the restored fixture', async () => {
    const plan = await current(),
        row = (await rows(plan.version_id)).items.find(
            (item) => !item.locked && item.teacher_id !== null,
        );
    mockStore.setScenario('slow');
    const pending = mutation(
        plan.version_id,
        `/${row.id}/lock`,
        lockInput(plan.revision_no),
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    mockStore.reset();
    assert.equal((await pending).body.code, 'MOCK_STATE_CHANGED');
    assert.equal((await current()).revision_no, plan.revision_no);
    mockStore.setScenario('slow');
    const controller = new AbortController();
    const aborted = mutation(
        plan.version_id,
        `/${row.id}/lock`,
        lockInput(plan.revision_no),
        'POST',
        controller.signal,
    );
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(aborted, { name: 'AbortError' });
    await new Promise((resolve) => setTimeout(resolve, 1250));
    assert.equal(
        assignmentStore.version(plan.version_id).revision_no,
        plan.revision_no,
    );
});

test('readiness follows plan revisions and marks source staleness after a live edit', async () => {
    const plan = await current();
    const before = (
        await request(
            '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
        )
    ).body;
    assert.equal(before.current_version_id, plan.version_id);
    assert.equal(before.revision_no, plan.revision_no);
    const source = (await request('/teachers/101')).body;
    const { id: _id, ...input } = source;
    await request('/teachers/101', 'PUT', { ...input, full_name: 'Đổi nguồn' });
    const after = (
        await request(
            '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
        )
    ).body;
    assert.equal(after.can_run_solver, false);
    assert.ok(after.issues.some((issue) => issue.code === 'STALE_INPUT'));
});

test('payload builders keep explicit null/reasons and candidate previews use snapshot policy without inventing missing loads', () => {
    const payload = assignmentChange(
        9,
        '',
        ' Thu hồi phân công ',
        ' Chờ bổ sung ',
    );
    assert.equal(payload.teacher_id, null);
    assert.equal(payload.unassigned_reason_text, 'Chờ bổ sung');
    assert.equal(payload.expected_revision, 9);
    assert.throws(() => assignmentChange(9, '103', '', ''));
    assert.throws(() => assignmentChange(9, '', 'Có lý do', ''));
    const teacher = {
        id: 1,
        subjects: [{ id: 1, name: 'Toán' }],
        base_norm: 17,
        weekly_limit: 12,
        valid_from: '2026-01-01',
        valid_to: '2026-12-31',
        fixed: 5,
        converted: 0,
        reduced: 0,
    };
    const row = {
        teacher_id: null,
        subject_id: 1,
        periods_per_week: 4,
        valid_from: '2026-08-01',
        valid_to: '2026-12-31',
    };
    assert.equal(candidateState(teacher, row, { t: 10 }).reason, 'Vượt trần');
    assert.equal(candidateState(teacher, row).projected, null);
    assert.equal(canEditPlan({ is_current: false, status: 'DRAFT' }), false);
    assert.equal(
        canWritePlan({
            is_current: true,
            status: 'DRAFT',
            snapshot_fresh: false,
        }),
        false,
    );
    assert.equal(
        filterAssignmentRows(
            [
                {
                    ...row,
                    class_name: '10A1',
                    subject_name: 'Ngữ văn',
                    subject_id: 2,
                    teacher_name: 'Nguyễn Minh An',
                },
            ],
            'ngu van',
            '2',
        ).length,
        1,
    );
});

test('matrix reads every assignment page and rejects a revision change between pages', async () => {
    const plan = await current(),
        base = await rows(plan.version_id);
    const items = Array.from({ length: 230 }, (_, index) => ({
        ...base.items[index % base.items.length],
        id: 90000 + index,
        demand_id: 80000 + index,
    }));
    const offsets = [];
    mockServer.use(
        http.get(
            `${origin}/api/plan-versions/${plan.version_id}/assignments`,
            ({ request: req }) => {
                const offset = Number(
                    new URL(req.url).searchParams.get('offset'),
                );
                offsets.push(offset);
                return HttpResponse.json({
                    ...base,
                    total: items.length,
                    offset,
                    limit: 200,
                    items: items.slice(offset, offset + 200),
                });
            },
        ),
    );
    const all = await readAssignmentRows(plan.version_id, {});
    assert.equal(all.items.length, 230);
    assert.deepEqual(offsets, [0, 200]);
    mockServer.use(
        http.get(
            `${origin}/api/plan-versions/${plan.version_id}/assignments`,
            ({ request: req }) => {
                const offset = Number(
                    new URL(req.url).searchParams.get('offset'),
                );
                return HttpResponse.json({
                    ...base,
                    version: {
                        ...base.version,
                        revision_no:
                            base.version.revision_no + (offset ? 1 : 0),
                    },
                    total: 230,
                    offset,
                    limit: 200,
                    items: items.slice(offset, offset + 200),
                });
            },
        ),
    );
    await assert.rejects(readAssignmentRows(plan.version_id, {}), {
        code: 'CONCURRENT_MODIFICATION',
    });
    mockServer.use(
        http.get(
            `${origin}/api/plan-versions/${plan.version_id}/assignments`,
            async () => {
                await delay(500);
                return HttpResponse.json(base);
            },
        ),
    );
    const controller = new AbortController();
    const pending = readAssignmentRows(plan.version_id, {}, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
});
