import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test, { before, beforeEach, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { QueryClient } from '@tanstack/react-query';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';
import { preparationStore } from '../src/mocks/preparation-store.ts';
import { governanceStore } from '../src/mocks/governance-store.ts';
import { completeRoundDemands } from '../src/mocks/fixtures/complete-round.ts';
import {
    roundFromUrl,
    roundPath,
    parsePreparationStep,
    preparationStepParams,
} from '../src/features/preparation/round-navigation.ts';
import { invalidatePlanQueries } from '../src/features/workspace/invalidate-plan-queries.ts';
import {
    buildPdfFromJpegPages,
    sha256Hex,
    uint8ToBase64,
} from '../src/features/results/pdf.ts';

test('preparation step changes retain a non-default round, context and other URL parameters', () => {
    const original = new URLSearchParams(
        'round_id=3&context_id=thcs-demo&step=1&version_id=22',
    );
    let params = original;
    for (const step of [2, 3, 4, 1]) {
        params = preparationStepParams(params, step);
        assert.equal(params.get('step'), String(step));
        assert.equal(params.get('round_id'), '3');
        assert.equal(params.get('context_id'), 'thcs-demo');
        assert.equal(params.get('version_id'), '22');
    }
    assert.equal(original.get('step'), '1');
    for (const value of [null, '', '0', '5', '-1', '2junk']) {
        assert.equal(parsePreparationStep(value), 1);
    }
    for (const value of ['1', '2', '3', '4']) {
        assert.equal(parsePreparationStep(value), Number(value));
    }
});

before(() => mockServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mockStore.reset());
after(() => {
    mockStore.reset();
    mockServer.close();
});
async function api(path, body) {
    const res = await fetch(
        'http://tass.test/api' + path,
        body === undefined
            ? {}
            : {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
              },
    );
    const data = await res.json();
    return { status: res.status, data };
}
const gov = () => api('/mock/governance/overview?context_id=hk1');
const plan = () => api('/assignment-rounds/1/plan');
async function solve() {
    const { data: p } = await plan();
    const start = await api(`/plan-versions/${p.version_id}/solver-runs`, {
        expected_revision: p.revision_no,
        optimization_config_id: 1,
        rule_set_version_id: 1,
    });
    assert.equal(start.status, 202);
    await api(`/solver-runs/${start.data.id}`);
    const done = await api(`/solver-runs/${start.data.id}`);
    assert.equal(done.data.summary.apply_outcome, 'APPLIED');
}
async function open() {
    return api('/mock/governance/feedback/open', {
        context_id: 'hk1',
        due: new Date(Date.now() + 86400000).toISOString(),
    });
}
async function closeAndResolve() {
    const closed = await api('/mock/governance/feedback/close', {
        context_id: 'hk1',
        reason: 'Đã rà soát xong.',
    });
    assert.equal(closed.status, 200);
    for (const item of closed.data.feedback.filter(
        (f) => f.status === 'pending',
    )) {
        assert.equal(
            (
                await api(`/mock/governance/feedback/${item.id}/resolve`, {
                    context_id: 'hk1',
                    decision: 'ACCEPTED',
                    result: 'Đã rà soát và ghi nhận.',
                })
            ).status,
            200,
        );
    }
}
async function validate() {
    const { data: p } = await plan();
    assert.equal(
        (
            await api(`/plan-versions/${p.version_id}/validation`, {
                expected_revision: p.revision_no,
            })
        ).status,
        201,
    );
}
async function ready() {
    completeRoundDemands(1);
    await solve();
    assert.equal((await open()).status, 200);
    await closeAndResolve();
    assert.equal(
        (await api('/mock/governance/versions/next', { context_id: 'hk1' }))
            .status,
        200,
    );
    await validate();
    const res = await api('/mock/governance/versions/ready', {
        context_id: 'hk1',
        reason: 'Đã rà soát, phương án không cần lấy ý kiến lại.',
    });
    assert.equal(res.status, 200);
    const bytes = buildPdfFromJpegPages([new Uint8Array([255, 216, 255, 217])]);
    return {
        context_id: 'hk1',
        mode: 'teachers',
        filename: 'TASS.pdf',
        bytes: bytes.length,
        sha256: await sha256Hex(bytes),
        pdf_base64: uint8ToBase64(bytes),
        base_revision: res.data.revision_no,
        source_token: res.data.source_token,
        validation_id: res.data.validation_id,
        snapshot: res.data.preview_snapshot,
    };
}

test('mandatory component with no demand remains uncovered and blocks feedback, until source is completed and recaptured', async () => {
    await solve();
    const { data: p } = await plan();
    const report = await api(`/plan-versions/${p.version_id}/validation`, {
        expected_revision: p.revision_no,
    });
    assert.deepEqual(report.data.summary.coverage, {
        required: 10,
        assigned: 9,
        unassigned: 1,
    });
    assert.equal(
        report.data.results.find((r) => r.br_code === 'REQUIRED_COVERAGE')
            .result_status,
        'VIOLATION',
    );
    assert.equal((await open()).status, 422);
    completeRoundDemands(1);
    assert.equal(
        (await open()).status,
        422,
        'a stale snapshot must still block publication',
    );
    const refreshed = await api(
        `/plan-versions/${p.version_id}/refresh-snapshot`,
        {
            expected_revision: p.revision_no,
            optimization_config_id: 1,
            rule_set_version_id: 1,
        },
    );
    assert.equal(refreshed.status, 200);
    await solve();
    assert.equal((await open()).status, 200);
});

test('source, directory, plan and governance survive a fresh process; later edits cannot reuse a source token', () => {
    const helper = fileURLToPath(
        new URL('./helpers/mock-reload.mjs', import.meta.url),
    );
    const first = spawnSync(process.execPath, [helper, 'save'], {
        encoding: 'utf8',
    });
    assert.equal(first.status, 0, first.stderr);
    const second = spawnSync(process.execPath, [helper, 'restore'], {
        encoding: 'utf8',
        input: first.stdout,
    });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(second.stdout, 'restored');
});

test('teacher portal selects frozen rows and loads from each published revision and validates feedback against it', async () => {
    completeRoundDemands(1);
    const unpublished = await api(
        '/mock/teacher/overview?context_id=hk1&teacher_id=101',
    );
    assert.deepEqual(unpublished.data.teacher.assignments, []);
    await solve();
    const v2 = (await open()).data;
    const release2 = v2.snapshots.find(
        (s) => s.is_full && s.phase === 'OPEN_FOR_FEEDBACK',
    );
    const teacher2 = (
        await api(
            `/mock/teacher/overview?context_id=hk1&teacher_id=101&release_id=${release2.id}`,
        )
    ).data.teacher;
    assert.equal(teacher2.id, 101);
    assert.equal(
        teacher2.assigned_periods,
        release2.teachers.find((t) => t.id === 101).a,
    );
    assert.deepEqual(
        teacher2.assignments.map((r) => r.id),
        release2.rows
            .filter((r) => r.teacher_id === 101)
            .map((r) => r.demand_id),
    );
    await closeAndResolve();
    await api('/mock/governance/versions/next', { context_id: 'hk1' });
    const { data: p } = await plan();
    const rows = await api(
        `/plan-versions/${p.version_id}/assignments?limit=200`,
    );
    const row = rows.data.items.find(
        (r) => r.teacher_id === 101 && !r.locked && r.subject_name === 'Toán',
    );
    assert.ok(row, 'fixture must contain an editable personal assignment');
    const updated = await fetch(
        `http://tass.test/api/plan-versions/${p.version_id}/assignments/${row.id}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                expected_revision: p.revision_no,
                teacher_id: 105,
                change_reason: 'Đổi giáo viên để kiểm thử bản phát hành.',
            }),
        },
    );
    assert.equal(updated.status, 200, await updated.text());
    await validate();
    const v3 = await open();
    assert.equal(v3.status, 200);
    const latest = (
        await api('/mock/teacher/overview?context_id=hk1&teacher_id=101')
    ).data;
    assert.equal(latest.version_no, 3);
    assert.equal(
        latest.teacher.assignments.some((r) => r.id === row.demand_id),
        false,
    );
    assert.notDeepEqual(latest.teacher, teacher2);
    const liveTeacher = mockStore.detail(101);
    mockStore.save(
        { ...liveTeacher, full_name: 'Tên nguồn mới chưa phát hành' },
        101,
    );
    assert.equal(
        (await api('/mock/teacher/overview?context_id=hk1&teacher_id=101')).data
            .teacher.full_name,
        teacher2.full_name,
    );
    assert.deepEqual(
        (
            await api(
                `/mock/teacher/overview?context_id=hk1&teacher_id=101&release_id=${release2.id}`,
            )
        ).data.teacher,
        teacher2,
    );
    assert.equal(
        (
            await api(
                '/mock/teacher/overview?context_id=hk1&teacher_id=101&release_id=missing',
            )
        ).status,
        404,
    );
    const stale = await api('/mock/teacher/feedback', {
        context_id: 'hk1',
        teacher_id: 101,
        release_id: release2.id,
        type: 'ASSIGNMENT',
        title: 'Rà soát phân công cũ',
        text: 'Chi tiết đề nghị rà soát',
        demand_id: row.demand_id,
    });
    assert.equal(stale.status, 409);
    const foreign = await api('/mock/teacher/feedback', {
        context_id: 'hk1',
        teacher_id: 101,
        release_id: latest.selected_release_id,
        type: 'ASSIGNMENT',
        title: 'Rà soát phân công',
        text: 'Chi tiết đề nghị rà soát',
        demand_id: row.demand_id,
    });
    assert.equal(foreign.status, 400);
    const own = await api('/mock/teacher/feedback', {
        context_id: 'hk1',
        teacher_id: 101,
        release_id: latest.selected_release_id,
        type: 'ASSIGNMENT',
        title: 'Rà soát phân công hiện hành',
        text: 'Giữ phân công đang xem trong bản phát hành.',
        demand_id: latest.teacher.assignments[0].id,
    });
    assert.equal(own.status, 201);
    assert.equal(own.data.version_no, 3);
    assert.equal(own.data.source_revision, latest.revision_no);
});

test('round links preserve scope, query and hash; malformed or unknown round never becomes PC-01', () => {
    const rounds = [{ id: 1 }, { id: 2 }];
    const path = roundPath('/solver-runs?filter=done#results', 2, 'hk1');
    const url = new URL(path, 'http://test');
    assert.equal(url.searchParams.get('round_id'), '2');
    assert.equal(url.searchParams.get('context_id'), 'hk1');
    assert.equal(url.searchParams.get('filter'), 'done');
    assert.equal(url.hash, '#results');
    assert.equal(
        roundFromUrl(rounds, url.searchParams.get('round_id'), rounds[0]),
        rounds[1],
    );
    for (const invalid of ['0', '-1', 'abc', '99', '1.5', '9007199254740993'])
        assert.equal(roundFromUrl(rounds, invalid, rounds[0]), null);
});

test('plan/source mutations invalidate cached governance and personal releases as well as result views', async () => {
    const client = new QueryClient({
        defaultOptions: { queries: { staleTime: 30000 } },
    });
    const affected = [
        'assignment-workspace',
        'preparation',
        'governance',
        'overview',
        'teacher-overview',
        'admin-overview',
        'mock-layout',
        'mock-session',
    ];
    for (const key of [...affected, 'unrelated'])
        client.setQueryData([key, 'hk1'], { cached: true });
    await invalidatePlanQueries(client);
    for (const key of affected)
        assert.equal(
            client.getQueryState([key, 'hk1']).isInvalidated,
            true,
            key,
        );
    assert.equal(
        client.getQueryState(['unrelated', 'hk1']).isInvalidated,
        false,
    );
    client.clear();
});

test('PDF publication rejects stale metadata, altered snapshots and corrupt bytes without changing READY state', async () => {
    const valid = await ready();
    const invalid = [
        [{ base_revision: 0 }, 409],
        [{ source_token: 'STALE-TOKEN' }, 409],
        [{ validation_id: 'OLD-REPORT' }, 409],
        [{ snapshot: { ...valid.snapshot, version_no: 1 } }, 409],
        [{ snapshot: { ...valid.snapshot, rows: [] } }, 409],
        [{ sha256: '0'.repeat(64) }, 422],
        [{ bytes: valid.bytes + 1 }, 422],
        [{ pdf_base64: '***' }, 422],
        [
            {
                pdf_base64: uint8ToBase64(
                    new TextEncoder().encode('not a PDF'),
                ),
                bytes: 9,
            },
            422,
        ],
    ];
    for (const [patch, status] of invalid) {
        const res = await api('/mock/governance/documents/issue', {
            ...valid,
            ...patch,
        });
        assert.equal(res.status, status, JSON.stringify(res.data));
        const state = (await gov()).data;
        assert.equal(state.phase, 'READY_TO_EXPORT');
        assert.equal(state.documents.length, 0);
    }
    const issued = await api('/mock/governance/documents/issue', valid);
    assert.equal(issued.status, 201, JSON.stringify(issued.data));
    assert.equal(issued.data.sha256, valid.sha256);
    assert.equal(issued.data.pdf_base64, valid.pdf_base64);
    assert.equal((await gov()).data.phase, 'EXPORTED');
});

test('concurrent PDF publication records exactly one document', async () => {
    const valid = await ready();
    const results = await Promise.all([
        api('/mock/governance/documents/issue', valid),
        api('/mock/governance/documents/issue', valid),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await gov()).data.documents.length, 1);
});

test('reset, cancellation and source changes during PDF hashing cannot publish a document', async () => {
    for (const action of ['reset', 'abort', 'source']) {
        mockStore.reset();
        const valid = await ready();
        const controller = new AbortController();
        const pending = governanceStore.issueDocument(
            valid,
            mockStore.list(),
            controller.signal,
        );
        if (action === 'reset') mockStore.reset();
        if (action === 'abort') controller.abort();
        if (action === 'source') preparationStore.touchSchoolSource(1);
        await assert.rejects(pending);
        const state = (await gov()).data;
        assert.notEqual(state.phase, 'EXPORTED');
        assert.equal(state.documents.length, 0);
    }
});
