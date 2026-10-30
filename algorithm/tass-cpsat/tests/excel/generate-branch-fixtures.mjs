// Builds small, anonymized tass-solver/1 snapshots from verified E26 cell values.
// The Excel files lack approved qualifications, B/R/C policy, caps, and semester dates.
// Those fields are explicit toy assumptions below; never use these snapshots as school plans.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fixtureDir = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const template = JSON.parse(readFileSync(`${fixtureDir}greedy-trap.json`, 'utf8'));
const clone = (value) => structuredClone(value);

function scope(classId, subjectId, gradeId, levelId, type) {
  return { classId, className: `Lớp ${classId}`, subjectId,
    subjectName: subjectId === 'PHYSICS' ? 'Vật lý' : 'Khoa học tự nhiên',
    gradeId, levelId, status: 'APPLICABLE', requiredTypes: [type],
    confirmationSource: 'E26 cell references; applicability is a toy assumption pending school confirmation' };
}
function demand(id, classId, subjectId, semesterId, type, periods, source) {
  return { id, classId, subjectId, semesterId, type, periods, source };
}
function teacher(base, { id, subjectId, levelId, semesterId, dates, B, R, F, C, limit, coefficients, source }) {
  const t = clone(base);
  t.id = id; t.name = id; // no teacher names copied from Excel
  t.employments = [{ schoolId: 'DEMO-SCHOOL', semesterId, startsOn: dates[0], endsOn: dates[1],
    status: 'ACTIVE', source: `${source}; ACTIVE is unverified toy assumption` }];
  t.qualifications = [{ subjectId, levelId, startsOn: dates[0], endsOn: dates[1],
    verified: true, source: `${source}; qualification is unverified toy assumption` }];
  t.workload = { base: B, reduction: R, fixedOutside: F, converted: C,
    targetApplicable: true, source: `${source}; B/R/F/C mapping is a toy assumption`,
    selectedBaseline: `${id}-DEMO-BASELINE`, outsideDemandIds: F ? [`${id}-OTHER-CLASSES`] : [] };
  t.experiencePenalties = Object.fromEntries(Object.keys(coefficients).map((d) => [d, 0]));
  t.hardChecks[0] = { id: 'WEEKLY-DEMO', ruleId: 'BR-06', period: 'WEEKLY',
    calculationPeriod: `each teaching week in ${semesterId}`, unit: 'PERIODS_PER_WEEK',
    dataStatus: 'PASS', fixed: F, converted: C, coefficients, limit,
    missingData: [], source: `${source}; limit ${limit} is an unapproved toy cap` };
  t.hardChecks[1].source = 'Annual rule is unknown in source Excel; no zero substitution';
  return t;
}
function base(semesterId, dates, snapshotId) {
  const s = clone(template);
  s.identity.semesterId = semesterId;
  s.identity.snapshotId = snapshotId;
  s.identity.sourceRevisionToken = 'E26-VERIFIED-CELLS-2026-10-30';
  s.identity.ruleSetVersion = 'EXCEL-DEMO-NOT-APPROVED';
  s.identity.optimizationConfigVersion = 'EXCEL-DEMO-1';
  s.period = { startsOn: dates[0], endsOn: dates[1] };
  s.config.decisionSource = 'Toy solver test using E26 cells. Qualifications, semester dates, B/R/C mapping and caps are unapproved assumptions.';
  s.config.experienceWeight = 0;
  s.config.changeWeight = 0;
  s.config.demoAssumptions = true;
  s.previousAssignments = [];
  s.previousSource = null;
  for (const p of s.prechecks) {
    p.source = 'EXCEL-DEMO-NOT-APPROVED';
    p.explanation = 'Synthetic test only; no verified school policy or legal evidence is claimed';
  }
  s.hardCheckInventorySource = 'Toy inventory: one weekly demo cap and unknown annual rule per teacher';
  return s;
}

const hk1Dates = ['2026-09-01', '2027-01-15']; // test dates, not school calendar evidence
const hk1 = base('2026-HK1', hk1Dates, 'E26-HK1-ANON-10-DEMANDS');
const hk1Rows = [
  ['6A3', 'SCIENCE', '6', 'THCS', 4, 'E26 teacher sheet D8/E8/G8/H8'],
  ...['8A5', '8A6', '8A8', '8A9'].map((id) => [id, 'SCIENCE', '8', 'THCS', 1.25, 'E26 teacher sheet D10/E10/F10/G10/H10']),
  ...['9A2', '9A3', '9A4'].map((id) => [id, 'SCIENCE', '9', 'THCS', 1.4, 'E26 teacher sheet D12/E12/F12/G12/H12']),
  ...['12A1', '12A4'].map((id) => [id, 'PHYSICS', '12', 'THPT', 2, 'E26 teacher sheet D64/E64/F64/G64/H64'])
];
hk1.scopes = hk1Rows.map(([classId, subjectId, gradeId, levelId]) =>
  scope(classId, subjectId, gradeId, levelId, 'STANDARD'));
hk1.demands = hk1Rows.map(([classId, subjectId, , , periods, source]) =>
  demand(`D-${classId}`, classId, subjectId, '2026-HK1', 'STANDARD', periods, source));
const scienceCoefficients = Object.fromEntries(hk1Rows.map(([classId, subjectId, , , periods]) =>
  [`D-${classId}`, subjectId === 'SCIENCE' ? periods : 0]));
const physicsCoefficients = Object.fromEntries(hk1Rows.map(([classId, subjectId, , , periods]) =>
  [`D-${classId}`, subjectId === 'PHYSICS' ? periods : 0]));
hk1.teachers = [
  teacher(template.teachers[0], { id: 'E26-T1', subjectId: 'SCIENCE', levelId: 'THCS',
    semesterId: '2026-HK1', dates: hk1Dates, B: 19, R: 0, F: 0, C: 4, limit: 25,
    coefficients: scienceCoefficients,
    source: 'E26 teacher sheet F7=8,H7=13.2,H8=4,H10=5,H12=4.2,J7=4,N7=17.2,S7=19' }),
  teacher(template.teachers[0], { id: 'E26-T7', subjectId: 'PHYSICS', levelId: 'THPT',
    semesterId: '2026-HK1', dates: hk1Dates, B: 17, R: 0, F: 8, C: 8, limit: 25,
    coefficients: physicsCoefficients,
    source: 'E26 teacher sheet H57=12,H64=4,J57=4,L57=4,N57=20,S57=17' })
];

const hk2Dates = ['2027-01-16', '2027-05-31']; // test dates, not school calendar evidence
const hk2 = base('2026-HK2', hk2Dates, 'E26-HK2-ANON-STALE-U65');
hk2.scopes = [
  scope('12A3', 'PHYSICS', '12', 'THPT', 'SPECIALIZED_TOPIC'),
  scope('12TH', 'PHYSICS', '12', 'THPT', 'SPECIALIZED_TOPIC')
];
hk2.demands = [
  demand('D-12A3-TOPIC', '12A3', 'PHYSICS', '2026-HK2', 'SPECIALIZED_TOPIC', 3, 'E26 teacher sheet T71/U71/V71/W71'),
  demand('D-12TH-TOPIC', '12TH', 'PHYSICS', '2026-HK2', 'SPECIALIZED_TOPIC', 3, 'E26 teacher sheet T72/U72/V72/W72')
];
hk2.teachers = [
  teacher(template.teachers[0], { id: 'E26-T8', subjectId: 'PHYSICS', levelId: 'THPT',
    semesterId: '2026-HK2', dates: hk2Dates, B: 10, R: 0, F: 0, C: 4, limit: 10,
    coefficients: { 'D-12A3-TOPIC': 3, 'D-12TH-TOPIC': 3 },
    source: 'E26 teacher sheet U65=0 stale,W65=6,Y65=4,AC65=10,U71=1,U72=1; B=10 toy' })
];

for (const [name, snapshot] of [
  ['excel-derived-hk1.json', hk1], ['excel-derived-hk2-stale-summary.json', hk2]
]) {
  writeFileSync(`${fixtureDir}${name}`, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${name}\n`);
}
