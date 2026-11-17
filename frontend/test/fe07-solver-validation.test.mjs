import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    extractAnnualLoad,
    extractWeeklyCap,
    interpretSolverRun,
    isReportReleasable,
    summarizeWorkloadItems,
} from '../src/features/results/model.ts';
import { parseSolverRunLocation } from '../src/shared/api/http.ts';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');
const base = 'http://tass.test/api';

async function jsonFetch(path, init = {}) {
    const res = await fetch(`${base}${path}`, {
        headers: {
            Accept: 'application/json',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init.headers ?? {}),
        },
        ...init,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return { status: res.status, headers: res.headers, data };
}

before(() => {
    mockServer.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
    mockStore.reset();
    mockServer.resetHandlers();
});

after(() => {
    mockStore.reset();
    mockServer.close();
});

test('FE-07 feature and page modules never import src/mocks or lucide-react', () => {
    const files = [
        'src/features/results/model.ts',
        'src/pages/solver-runs/solver-runs-page.tsx',
        'src/pages/workload/workload-page.tsx',
        'src/pages/statistics/statistics-page.tsx',
        'src/pages/checks/checks-page.tsx',
    ];
    for (const rel of files) {
        const src = readFileSync(resolve(frontendDir, rel), 'utf8');
        assert.ok(!src.includes('mocks/'), `${rel} must not import mocks`);
        assert.ok(
            !src.includes('lucide-react'),
            `${rel} must not import lucide-react`,
        );
    }
});

test('workloads compute Q = max(0, B - R), read weekly cap dynamically from checks, and preserve null annual load', async () => {
    const plan = await jsonFetch('/assignment-rounds/1/plan');
    assert.equal(plan.status, 200);
    const versionId = plan.data.version_id;

    const loads = await jsonFetch(
        `/plan-versions/${versionId}/workloads?limit=50&offset=0`,
    );
    assert.equal(loads.status, 200);
    assert.equal(loads.data.items.length, 6);

    for (const row of loads.data.items) {
        const round2 = (v) => Math.round(v * 100) / 100;
        assert.equal(row.w, round2(row.f + row.a + row.c));
        assert.equal(row.t, round2(row.w + row.r));
        assert.equal(row.q, Math.max(0, round2(row.b - row.r)));
        assert.equal(row.delta_t, round2(row.t - row.b));

        const cap = extractWeeklyCap(row);
        assert.equal(cap.limit, 24);
        assert.ok(cap.source);

        const annual = extractAnnualLoad(row);
        assert.equal(annual.status, 'INSUFFICIENT_DATA');
        assert.equal(annual.current, null);
        assert.equal(annual.limit, null);
    }

    const summary = summarizeWorkloadItems(loads.data.items);
    assert.deepEqual(summary.weeklyCaps, [24]);
});

test('solver run lifecycle: 202 + Location, poll -> APPLIED, optimization matches_version, no-op second run, and dashboard sync', async () => {
    // Boot check: overview & layout immediately match unified fixture before visiting /assignment
    const initialLayout = await jsonFetch('/mock/layout');
    assert.equal(initialLayout.data.contexts[0].total, 9);
    assert.equal(initialLayout.data.contexts[0].assigned, 7);

    const initialOverview = await jsonFetch('/mock/overview?context_id=hk1');
    assert.equal(initialOverview.data.teachers.length, 6);
    assert.equal(initialOverview.data.summary.total_demands, 9);
    assert.equal(initialOverview.data.summary.assigned_demands, 7);
    assert.equal(initialOverview.data.readiness.validation_fresh, false);

    const planRes = await jsonFetch('/assignment-rounds/1/plan');
    const plan = planRes.data;

    // Submit solver run
    const submit = await jsonFetch(
        `/plan-versions/${plan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: plan.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    assert.equal(submit.status, 202);
    const loc = submit.headers.get('Location');
    const runId = parseSolverRunLocation(loc);
    assert.equal(runId, submit.data.id);
    assert.equal(submit.data.status, 'QUEUED');

    // Poll until terminal
    let poll = await jsonFetch(`/solver-runs/${runId}`);
    assert.equal(poll.status, 200);
    assert.equal(poll.data.status, 'RUNNING');

    poll = await jsonFetch(`/solver-runs/${runId}`);
    assert.equal(poll.status, 200);
    assert.equal(poll.data.status, 'SUCCEEDED');
    assert.equal(poll.data.summary.apply_outcome, 'APPLIED');
    assert.equal(poll.data.applied_revision_no, plan.revision_no + 1);
    assert.equal(interpretSolverRun(poll.data).applied, true);
    assert.equal(interpretSolverRun(poll.data).noOpApplied, false);

    // Reload rows, optimization, validation, overview, layout
    const afterRows = await jsonFetch(
        `/plan-versions/${plan.version_id}/assignments?limit=50`,
    );
    assert.equal(afterRows.data.version.revision_no, plan.revision_no + 1);
    assert.equal(
        afterRows.data.items.filter((r) => r.teacher_id === null).length,
        0,
    );

    const opt = await jsonFetch(
        `/plan-versions/${plan.version_id}/optimization`,
    );
    assert.equal(opt.status, 200);
    assert.equal(opt.data.matches_version, true);
    assert.equal(opt.data.objective_vector.length, 5);
    assert.equal(opt.data.configuration.preserve_policy, 'PENALIZE_CHANGES');

    const afterOverview = await jsonFetch('/mock/overview?context_id=hk1');
    assert.equal(afterOverview.data.summary.assigned_demands, 9);
    assert.equal(afterOverview.data.summary.coverage_percent, 100);
    assert.equal(afterOverview.data.readiness.validation_fresh, true);
    // Solver fills existing rows; the missing required demand still blocks publication.
    assert.equal(afterOverview.data.readiness.validation_releasable, false);
    assert.equal(afterOverview.data.latest_solver_status, 'SUCCEEDED');

    // Second run with no changes -> no-op APPLIED keeps revision unchanged
    const submitNoOp = await jsonFetch(
        `/plan-versions/${plan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: plan.revision_no + 1,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    assert.equal(submitNoOp.status, 202);
    await jsonFetch(`/solver-runs/${submitNoOp.data.id}`);
    const noOpTerminal = await jsonFetch(`/solver-runs/${submitNoOp.data.id}`);
    assert.equal(noOpTerminal.data.summary.apply_outcome, 'APPLIED');
    assert.equal(noOpTerminal.data.applied_revision_no, plan.revision_no + 1);
    assert.equal(interpretSolverRun(noOpTerminal.data).noOpApplied, true);
});

test('solver error/recovery paths: 409 SOLVER_RUN_ACTIVE + Location, cancel, STALE, INFEASIBLE, FAILED, and 503 queue full', async () => {
    // 409 SOLVER_RUN_ACTIVE follows Location without retry loop
    mockStore.setScenario('solverActiveRun');
    const plan = (await jsonFetch('/assignment-rounds/1/plan')).data;
    const conflict = await jsonFetch(
        `/plan-versions/${plan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: plan.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    assert.equal(conflict.status, 409);
    assert.equal(conflict.data.code, 'SOLVER_RUN_ACTIVE');
    const activeId = parseSolverRunLocation(conflict.headers.get('Location'));
    assert.ok(activeId);

    // Seeded RUNNING run remains RUNNING on polls until cancelled
    const stillRunning = await jsonFetch(`/solver-runs/${activeId}`);
    assert.equal(stillRunning.status, 200);
    assert.equal(stillRunning.data.status, 'RUNNING');

    // Cancel active run -> CANCEL_REQUESTED -> CANCELLED
    const cancelling = await jsonFetch(`/solver-runs/${activeId}/cancel`, {
        method: 'POST',
    });
    assert.equal(cancelling.status, 200);
    assert.equal(cancelling.data.status, 'CANCEL_REQUESTED');
    const cancelled = await jsonFetch(`/solver-runs/${activeId}`);
    assert.equal(cancelled.data.status, 'CANCELLED');
    assert.equal(cancelled.data.summary.apply_outcome, 'CANCELLED');

    // Idempotent cancel after terminal
    const cancelAgain = await jsonFetch(`/solver-runs/${activeId}/cancel`, {
        method: 'POST',
    });
    assert.equal(cancelAgain.status, 200);
    assert.equal(cancelAgain.data.status, 'CANCELLED');

    // STALE outcome leaves plan unchanged
    mockStore.setScenario('solverStale');
    const stalePlan = (await jsonFetch('/assignment-rounds/1/plan')).data;
    const staleSubmit = await jsonFetch(
        `/plan-versions/${stalePlan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: stalePlan.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    await jsonFetch(`/solver-runs/${staleSubmit.data.id}`);
    const staleDone = await jsonFetch(`/solver-runs/${staleSubmit.data.id}`);
    assert.equal(staleDone.data.status, 'COMPLETED');
    assert.equal(staleDone.data.summary.apply_outcome, 'STALE');
    assert.equal(interpretSolverRun(staleDone.data).applied, false);
    assert.equal(
        (await jsonFetch(`/assignment-rounds/1/plan`)).data.revision_no,
        stalePlan.revision_no,
    );

    // INFEASIBLE outcome
    mockStore.setScenario('solverInfeasible');
    const infPlan = (await jsonFetch('/assignment-rounds/1/plan')).data;
    const infSubmit = await jsonFetch(
        `/plan-versions/${infPlan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: infPlan.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    await jsonFetch(`/solver-runs/${infSubmit.data.id}`);
    const infDone = await jsonFetch(`/solver-runs/${infSubmit.data.id}`);
    assert.equal(infDone.data.status, 'COMPLETED');
    assert.equal(infDone.data.summary.cp_sat_status, 'INFEASIBLE');
    assert.equal(infDone.data.summary.apply_outcome, 'NO_CANDIDATE');

    // FAILED outcome
    mockStore.setScenario('solverFailed');
    const failPlan = (await jsonFetch('/assignment-rounds/1/plan')).data;
    const failSubmit = await jsonFetch(
        `/plan-versions/${failPlan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: failPlan.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    await jsonFetch(`/solver-runs/${failSubmit.data.id}`);
    const failDone = await jsonFetch(`/solver-runs/${failSubmit.data.id}`);
    assert.equal(failDone.data.status, 'FAILED');
    assert.equal(failDone.data.failure_code, 'SOLVER_INTERNAL_ERROR');

    // 503 SOLVER_QUEUE_FULL
    mockStore.setScenario('solverQueueFull');
    const qPlan = (await jsonFetch('/assignment-rounds/1/plan')).data;
    const qRes = await jsonFetch(
        `/plan-versions/${qPlan.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: qPlan.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    assert.equal(qRes.status, 503);
    assert.equal(qRes.data.code, 'SOLVER_QUEUE_FULL');
});

test('plan validation: 404 before run, 201 on VIOLATION, fresh -> stale after mutation, and releasable PASS weekly', async () => {
    const plan = (await jsonFetch('/assignment-rounds/1/plan')).data;

    // 404 before validation run
    const missing = await jsonFetch(
        `/plan-versions/${plan.version_id}/validation`,
    );
    assert.equal(missing.status, 404);

    // POST validation returns 201 even when VIOLATION
    const runVal = await jsonFetch(
        `/plan-versions/${plan.version_id}/validation`,
        {
            method: 'POST',
            body: JSON.stringify({ expected_revision: plan.revision_no }),
        },
    );
    assert.equal(runVal.status, 201);
    assert.ok(runVal.headers.get('Location'));
    assert.equal(runVal.data.overall_status, 'VIOLATION');
    assert.equal(runVal.data.fresh, true);
    assert.equal(isReportReleasable(runVal.data), false);

    // Editing a row turns report stale (fresh = false)
    const rows = (
        await jsonFetch(
            `/plan-versions/${plan.version_id}/assignments?limit=50`,
        )
    ).data.items;
    const unassigned = rows.find((r) => r.teacher_id === null);
    assert.ok(unassigned);
    await jsonFetch(
        `/plan-versions/${plan.version_id}/assignments/${unassigned.id}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                expected_revision: plan.revision_no,
                teacher_id: 105,
                change_reason: 'Gán bổ sung để kiểm tra staleness',
            }),
        },
    );

    const staleReport = await jsonFetch(
        `/plan-versions/${plan.version_id}/validation`,
    );
    assert.equal(staleReport.status, 200);
    assert.equal(staleReport.data.fresh, false);

    // validationPass scenario yields weekly PASS with non-blocking annual warning
    mockStore.setScenario('validationPass');
    const passPlan = (await jsonFetch('/assignment-rounds/1/plan')).data;
    const passReport = await jsonFetch(
        `/plan-versions/${passPlan.version_id}/validation`,
    );
    assert.equal(passReport.status, 200);
    assert.equal(passReport.data.fresh, true);
    assert.equal(isReportReleasable(passReport.data), true);
});
