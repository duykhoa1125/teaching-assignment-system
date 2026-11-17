import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const saved =
    process.argv[2] === 'restore' ? JSON.parse(readFileSync(0, 'utf8')) : {};
const entries = new Map(Object.entries(saved));
globalThis.document = {};
globalThis.window = {
    sessionStorage: {
        getItem: (key) => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, value),
        removeItem: (key) => entries.delete(key),
    },
};
const { mockStore } = await import('../../src/mocks/store.ts');
const { preparationStore } =
    await import('../../src/mocks/preparation-store.ts');
const { assignmentStore } = await import('../../src/mocks/assignment-store.ts');
const { governanceStore } = await import('../../src/mocks/governance-store.ts');
if (process.argv[2] === 'restore') {
    assignmentStore.ensure(mockStore.list());
    const plan = assignmentStore.preview('PC-01');
    assert.equal(preparationStore.detailDemand(104).periods_per_week, 3.5);
    assert.equal(mockStore.detail(101).full_name, 'Giáo viên đã sửa');
    assert.equal(
        plan.rows.find((row) => row.demand_id === 104).periods_per_week,
        3.5,
    );
    assert.equal(plan.meta.snapshot_fresh, true);
    assert.ok(
        governanceStore
            .overview('hk1', mockStore.list())
            .snapshots.some((s) => s.title === 'Reload checkpoint'),
    );
    const oldToken = plan.meta.source_revision_token;
    const another = preparationStore.detailDemand(106);
    preparationStore.saveDemand(
        { ...another, periods_per_week: another.periods_per_week + 0.5 },
        another.id,
    );
    assert.notEqual(
        assignmentStore.preview('PC-01').meta.live_source_revision_token,
        oldToken,
    );
    assert.equal(assignmentStore.preview('PC-01').meta.snapshot_fresh, false);
    mockStore.reset();
    assert.equal(preparationStore.detailDemand(104).periods_per_week, 3);
    assert.notEqual(mockStore.detail(101).full_name, 'Giáo viên đã sửa');
    assert.equal(
        governanceStore.overview('hk1', mockStore.list()).snapshots.length,
        1,
    );
    process.stdout.write('restored');
} else {
    entries.set('tass-mock-assignment-v1', JSON.stringify({ corrupt: true }));
    entries.set('tass-mock-governance-v1', JSON.stringify({ corrupt: true }));
    mockStore.reset();
    assignmentStore.ensure(mockStore.list());
    const source = preparationStore.detailDemand(104);
    preparationStore.saveDemand(
        { ...source, periods_per_week: 3.5 },
        source.id,
    );
    const teacher = mockStore.detail(101);
    mockStore.save({ ...teacher, full_name: 'Giáo viên đã sửa' }, teacher.id);
    const plan = assignmentStore.preview('PC-01');
    assignmentStore.refresh(
        plan.meta.version_id,
        {
            expected_revision: plan.meta.revision_no,
            optimization_config_id: 1,
            rule_set_version_id: 1,
        },
        mockStore.list(),
    );
    governanceStore.saveSnapshot(
        'hk1',
        'Reload checkpoint',
        'Reviewer',
        mockStore.list(),
    );
    assert.equal(entries.has('tass-mock-assignment-v1'), false);
    assert.equal(entries.has('tass-mock-governance-v1'), false);
    process.stdout.write(JSON.stringify(Object.fromEntries(entries)));
}
