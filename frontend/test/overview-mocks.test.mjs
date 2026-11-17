import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { setupServer } from 'msw/node';
import {
    overviewByContext,
    readOverviewFixture,
} from '../src/mocks/fixtures/overview.ts';
import { handlers } from '../src/mocks/handlers/index.ts';
import { mockStore } from '../src/mocks/store.ts';

const server = setupServer(...handlers);

before(() => {
    server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
    mockStore.reset();
});

after(() => {
    mockStore.reset();
    server.close();
});

test('overview fixtures obey exact teacher load and period invariants', () => {
    for (const [contextId, overview] of Object.entries(overviewByContext)) {
        assert.equal(overview.context_id, contextId);
        for (const teacher of overview.teachers) {
            const assignedSum = teacher.assignments.reduce(
                (sum, item) => sum + item.periods,
                0,
            );
            assert.equal(
                teacher.assigned_periods,
                assignedSum,
                `${contextId}:${teacher.teacher_code}`,
            );
            assert.equal(
                teacher.working_periods,
                teacher.fixed_periods +
                    teacher.assigned_periods +
                    teacher.converted_periods,
            );
            assert.equal(
                teacher.total_periods,
                teacher.working_periods + teacher.reduction_periods,
            );
            assert.equal(
                teacher.delta,
                teacher.total_periods - teacher.base_norm,
            );
            assert.equal(
                teacher.quota_remaining,
                Math.max(0, teacher.base_norm - teacher.reduction_periods),
            );
        }
        const gradeSum = overview.summary.demands_by_grade.reduce(
            (sum, item) => sum + item.periods,
            0,
        );
        assert.equal(gradeSum, overview.summary.total_periods);
        assert.equal(
            overview.summary.assigned_demands +
                overview.summary.unassigned_demands,
            overview.summary.total_demands,
        );
    }

    const hk1 = overviewByContext.hk1;
    assert.equal(hk1.summary.teachers_count, 6);
    assert.equal(hk1.summary.balanced_teachers_count, 0);
    assert.equal(hk1.summary.under_norm_teachers_count, 5);
    assert.equal(hk1.summary.over_norm_teachers_count, 1);
    assert.equal(hk1.summary.total_periods, 26);
    assert.equal(hk1.summary.total_demands, 9);
    assert.equal(hk1.summary.assigned_demands, 7);
    assert.equal(hk1.summary.unassigned_demands, 2);
    assert.equal(hk1.summary.locked_demands, 2);
    assert.equal(hk1.summary.coverage_percent, 78);
    assert.equal(hk1.summary.pending_feedback_count, 2);
    assert.deepEqual(hk1.summary.demands_by_grade, [
        { grade: '10', periods: 20 },
        { grade: '11', periods: 6 },
    ]);

    const hk2 = overviewByContext.hk2;
    assert.equal(hk2.summary.teachers_count, 6);
    assert.equal(hk2.summary.assigned_demands, 0);
    assert.equal(hk2.summary.coverage_percent, 0);
    assert.equal(hk2.summary.total_demands, 1);
    assert.equal(hk2.summary.total_periods, 4);
    assert.equal(hk2.summary.pending_feedback_count, 0);

    const thcs = overviewByContext['thcs-demo'];
    assert.equal(thcs.summary.teachers_count, 2);
    assert.equal(thcs.summary.total_demands, 1);
    assert.equal(thcs.summary.total_periods, 4);
    assert.equal(thcs.summary.assigned_demands, 0);
});

test('GET /api/mock/overview serves hk1, hk2, thcs-demo and rejects unknown context_id', async () => {
    for (const id of ['hk1', 'hk2', 'thcs-demo']) {
        const res = await fetch(
            `http://localhost/api/mock/overview?context_id=${id}`,
        );
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.context_id, id);
        assert.equal(
            body.teachers.length,
            overviewByContext[id].teachers.length,
        );
    }

    const missingRes = await fetch(
        'http://localhost/api/mock/overview?context_id=unknown-term',
    );
    assert.equal(missingRes.status, 400);
    const errBody = await missingRes.json();
    assert.equal(errBody.code, 'INVALID_QUERY');
});

test('GET /api/mock/overview respects empty, error, and slow cancellation scenarios', async () => {
    mockStore.setScenario('empty');
    const emptyRes = await fetch(
        'http://localhost/api/mock/overview?context_id=hk1',
    );
    assert.equal(emptyRes.status, 200);
    const emptyBody = await emptyRes.json();
    assert.equal(emptyBody.teachers.length, 0);
    assert.equal(emptyBody.summary.total_demands, 0);
    assert.equal(readOverviewFixture('hk1', true).teachers.length, 0);

    mockStore.setScenario('unavailable');
    const errRes = await fetch(
        'http://localhost/api/mock/overview?context_id=hk1',
    );
    assert.equal(errRes.status, 503);
    const errJson = await errRes.json();
    assert.equal(errJson.code, 'SOLVER_QUEUE_FULL');

    mockStore.setScenario('slow');
    const controller = new AbortController();
    const slowPromise = fetch(
        'http://localhost/api/mock/overview?context_id=hk1',
        {
            signal: controller.signal,
        },
    );
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(slowPromise, { name: 'AbortError' });
});
