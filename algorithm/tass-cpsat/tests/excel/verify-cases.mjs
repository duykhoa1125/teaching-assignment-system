// Independent exhaustive oracle for the tiny fixtures in cases.json.
// This verifies expected outcomes; it does not invoke the application solver.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('./cases.json', import.meta.url)), 'utf8'));
const units = (n) => {
  assert.ok(Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-7, `invalid period count: ${n}`);
  return Math.round(n * 100);
};
const pair = (teacherId, demandId) => `${teacherId}:${demandId}`;
const compare = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

function solve(testCase) {
  const eligible = new Set(testCase.eligible);
  const banned = new Set(testCase.banned ?? []);
  const locked = new Set(testCase.locked ?? []);
  const demands = testCase.demands;
  const teachers = testCase.teachers;
  const choices = demands.map((d) => [null, ...teachers
    .filter((t) => t.active !== false && eligible.has(pair(t.id, d.id)) && !banned.has(pair(t.id, d.id)))
    .map((t) => t.id)]);
  let best = null;
  const current = {};

  function visit(index) {
    if (index < demands.length) {
      const d = demands[index];
      for (const teacherId of choices[index]) {
        current[d.id] = teacherId;
        visit(index + 1);
      }
      return;
    }
    if ([...locked].some((entry) => {
      const [teacherId, demandId] = entry.split(':');
      return current[demandId] !== teacherId;
    })) return;

    const assignedPeriods = new Map(teachers.map((t) => [t.id, 0]));
    for (const d of demands) if (current[d.id] !== null) {
      assignedPeriods.set(current[d.id], assignedPeriods.get(current[d.id]) + units(d.h));
    }
    const loads = {};
    let deviation = 0;
    for (const t of teachers) {
      const Q = Math.max(0, units(t.B) - units(t.R));
      const W = assignedPeriods.get(t.id) + units(t.C);
      if (W > units(t.U)) return;
      loads[t.id] = { Q: Q / 100, W: W / 100 };
      if (t.active !== false) deviation += Math.abs(W - Q);
    }
    const unassignedCount = demands.filter((d) => current[d.id] === null).length;
    const experiencePenalty = demands.reduce((sum, d) => sum +
      (current[d.id] === null ? 0 : (testCase.penalties?.[pair(current[d.id], d.id)] ?? 0)), 0);
    const changedAssignments = demands.reduce((sum, d) => sum +
      (Object.hasOwn(testCase.previous ?? {}, d.id) && testCase.previous[d.id] !== current[d.id] ? 1 : 0), 0);
    const score = [unassignedCount, deviation, experiencePenalty, changedAssignments];
    if (!best || compare(score, best.score) < 0) {
      best = { score, assignments: { ...current }, unassignedCount,
        totalAbsoluteDeviation: deviation / 100, experiencePenalty, changedAssignments, loads };
    }
  }
  visit(0);
  return best;
}

let checked = 0;
for (const testCase of fixture.cases) {
  const actual = solve(testCase);
  const expected = testCase.expected;
  if (expected.status === 'INFEASIBLE') {
    assert.equal(actual, null, `${testCase.id}: expected infeasible`);
  } else {
    assert.ok(actual, `${testCase.id}: expected a feasible solution`);
    for (const key of ['unassignedCount', 'totalAbsoluteDeviation', 'experiencePenalty', 'changedAssignments']) {
      if (Object.hasOwn(expected, key)) assert.equal(actual[key], expected[key], `${testCase.id}: ${key}`);
    }
    if (expected.assignments) assert.deepEqual(actual.assignments, expected.assignments, `${testCase.id}: assignments`);
    if (expected.loads) for (const [teacherId, load] of Object.entries(expected.loads)) {
      assert.ok(teacherByIdIsPresent(testCase, teacherId), `${testCase.id}: unknown teacher ${teacherId}`);
      assert.deepEqual(actual.loads[teacherId], load, `${testCase.id}: load ${teacherId}`);
    }
  }
  checked++;
  process.stdout.write(`PASS ${testCase.id}\n`);
}
process.stdout.write(`Verified ${checked} fixture oracles. Application solver was not run.\n`);

function teacherByIdIsPresent(testCase, teacherId) {
  return testCase.teachers.some((t) => t.id === teacherId);
}
