import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { after, before, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    formatAcademicYearLabel,
    sliceCatalogPage,
} from '../src/features/catalogs/model.ts';
import { resolveSubjectVisual } from '../src/features/catalogs/subject-visual.ts';
import {
    buildReadinessQuery,
    resolveIssueTarget,
    validateApplicabilityForm,
    validateBatchDemands,
    validatePeriodsPerWeek,
} from '../src/features/preparation/model.ts';
import { mockServer } from '../src/mocks/node.ts';
import { preparationDemands } from '../src/mocks/fixtures/preparation.ts';
import { mockStore } from '../src/mocks/store.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');
const base = 'http://tass.test/api';

before(() => mockServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
    mockStore.reset();
    mockServer.resetHandlers();
});
after(() => mockServer.close());

test('readiness actions lead to the task needed to resolve each issue', () => {
    const cases = [
        ['APPLICABILITY_COMPONENTS_UNCONFIRMED', '/preparation?step=3'],
        ['APPLICABILITY_UNDETERMINED', '/preparation?step=2'],
        ['REQUIRED_COMPONENT_DEMAND_MISSING', '/demands'],
        ['UNASSIGNED_DEMAND', '/assignment'],
        ['CONFIGURATION_SELECTION_REQUIRED', '/checks'],
    ];
    for (const [code, path] of cases)
        assert.equal(
            resolveIssueTarget({
                code,
                category: 'PREPARATION',
                severity: 'ERROR',
            }).path,
            path,
        );
});

test('same academic year codes remain distinguishable across schools', () => {
    const year = { id: 1, school_id: 1, year_code: '2026-2027' };
    assert.equal(
        formatAcademicYearLabel(year, 'THPT An Hòa'),
        '2026-2027 · THPT An Hòa',
    );
    assert.notEqual(
        formatAcademicYearLabel(year, 'THPT An Hòa'),
        formatAcademicYearLabel({ ...year, school_id: 2 }, 'THPT Bình Minh'),
    );
    assert.equal(
        formatAcademicYearLabel({ ...year, school_id: 2 }),
        '2026-2027 · Trường #2',
    );
});

async function apiJson(path, init) {
    const response = await fetch(`${base}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    return { status: response.status, body };
}

test('FE-05 features, shared UI and pages never import src/mocks or lucide-react', () => {
    const files = [
        'src/features/catalogs/types.ts',
        'src/features/catalogs/model.ts',
        'src/features/catalogs/api.ts',
        'src/features/catalogs/queries.ts',
        'src/features/catalogs/subject-visual.ts',
        'src/features/preparation/types.ts',
        'src/features/preparation/model.ts',
        'src/features/preparation/api.ts',
        'src/features/preparation/queries.ts',
        'src/features/preparation/round-context.ts',
        'src/shared/ui/drawer.tsx',
        'src/shared/ui/subject-identity.tsx',
        'src/pages/admin/admin-catalogs-page.tsx',
        'src/pages/admin/admin-periods-page.tsx',
        'src/pages/preparation/preparation-page.tsx',
        'src/pages/demands/demands-page.tsx',
        'src/pages/checks/checks-page.tsx',
    ];

    for (const rel of files) {
        const source = readFileSync(resolve(frontendDir, rel), 'utf8');
        assert.equal(
            source.includes('mocks/'),
            false,
            `${rel} must not import src/mocks`,
        );
        assert.equal(
            source.includes('lucide-react'),
            false,
            `${rel} must use original Icon glyphs instead of lucide-react`,
        );
    }
});

test('validatePeriodsPerWeek accepts positive 2-decimal numbers up to 999.99 and rejects invalid input', () => {
    assert.equal(validatePeriodsPerWeek('4'), null);
    assert.equal(validatePeriodsPerWeek('3.5'), null);
    assert.equal(validatePeriodsPerWeek('999.99'), null);

    assert.ok(validatePeriodsPerWeek(''));
    assert.ok(validatePeriodsPerWeek('0'));
    assert.ok(validatePeriodsPerWeek('-2'));
    assert.ok(validatePeriodsPerWeek('2.345'));
    assert.ok(validatePeriodsPerWeek('1000'));
});

test('validateBatchDemands flags missing selection, duplicates, invalid periods, and ACTIVE overlap', () => {
    const missingSubject = validateBatchDemands({
        semesterId: 1,
        subjectId: null,
        demandType: 'STANDARD',
        validFrom: '2026-08-01',
        validTo: '2026-12-31',
        rows: [{ class_id: 13, class_code: '10A2', periods_text: '3' }],
        existingDemands: preparationDemands,
    });
    assert.ok(missingSubject.formError);
    assert.equal(missingSubject.preview.length, 0);

    const previewResult = validateBatchDemands({
        semesterId: 1,
        subjectId: 1, // Toán (class 11 10A1 already has ACTIVE demand id=101 in 2026-08-01..12-31)
        demandType: 'STANDARD',
        validFrom: '2026-08-01',
        validTo: '2026-12-31',
        rows: [
            { class_id: 11, class_code: '10A1', periods_text: '4' },
            { class_id: 11, class_code: '10A1', periods_text: '4' },
            { class_id: 15, class_code: '11A2', periods_text: 'abc' },
            { class_id: 16, class_code: '12A1', periods_text: '4.5' },
        ],
        existingDemands: preparationDemands,
    });

    assert.ok(previewResult.formError);
    assert.equal(previewResult.preview[0].status, 'ERROR');
    assert.match(previewResult.preview[0].message, /#101/);
    assert.equal(previewResult.preview[1].status, 'ERROR');
    assert.match(previewResult.preview[1].message, /trùng/);
    assert.equal(previewResult.preview[2].status, 'ERROR');
    assert.equal(previewResult.preview[3].status, 'OK');
    assert.equal(previewResult.preview[3].periods_per_week, 4.5);

    const cleanResult = validateBatchDemands({
        semesterId: 1,
        subjectId: 2, // Ngữ văn on 10A2 (missing demand)
        demandType: 'STANDARD',
        validFrom: '2026-08-01',
        validTo: '2026-12-31',
        rows: [{ class_id: 13, class_code: '10A2', periods_text: '4' }],
        existingDemands: preparationDemands,
    });
    assert.equal(cleanResult.formError, null);
    assert.equal(cleanResult.preview[0].status, 'OK');
});

test('validateApplicabilityForm enforces reason on NOT_APPLICABLE and blocks switching with active demand', () => {
    const missingReason = validateApplicabilityForm({
        scope_id: '1',
        class_id: '11',
        status: 'NOT_APPLICABLE',
        reason: '   ',
        hasActiveDemand: false,
    });
    assert.ok(missingReason.reason);

    const conflictDemand = validateApplicabilityForm({
        scope_id: '1',
        class_id: '11',
        status: 'UNDETERMINED',
        reason: 'Tạm hoãn',
        hasActiveDemand: true,
    });
    assert.ok(conflictDemand.status);

    const valid = validateApplicabilityForm({
        scope_id: '4',
        class_id: '14',
        status: 'NOT_APPLICABLE',
        reason: 'Tổ hợp KHXH không học tự chọn Vật lí',
        hasActiveDemand: false,
    });
    assert.deepEqual(valid, {});
});

test('buildReadinessQuery enforces paired config/rule-set params', () => {
    assert.deepEqual(buildReadinessQuery(null, null), {});
    assert.deepEqual(buildReadinessQuery(1, 2), {
        optimization_config_id: 1,
        rule_set_version_id: 2,
    });
    assert.throws(() => buildReadinessQuery(1, null));
    assert.throws(() => buildReadinessQuery(null, 2));
});

test('resolveSubjectVisual and sliceCatalogPage map subjects and detect lookahead pages', () => {
    assert.deepEqual(resolveSubjectVisual('Toán học'), {
        glyph: 'subject-math',
        tone: 'slate',
    });
    assert.deepEqual(resolveSubjectVisual('Ngữ văn'), {
        glyph: 'subject-literature',
        tone: 'clay',
    });
    assert.deepEqual(resolveSubjectVisual('Tiếng Anh'), {
        glyph: 'subject-language',
        tone: 'slate',
    });
    assert.deepEqual(resolveSubjectVisual('Khoa học tự nhiên'), {
        glyph: 'subject-science',
        tone: 'sage',
    });
    assert.deepEqual(resolveSubjectVisual('Kỹ năng sống'), {
        glyph: 'book',
        tone: '',
    });

    const over = sliceCatalogPage([1, 2, 3, 4], 3);
    assert.deepEqual(over, { items: [1, 2, 3], hasNext: true });
    const exact = sliceCatalogPage([1, 2, 3], 3);
    assert.deepEqual(exact, { items: [1, 2, 3], hasNext: false });
});

test('MSW catalog and period endpoints support filters, limit+1 lookahead pagination, and CRUD', async () => {
    // Subjects filter + pagination
    const pagedSubjects = await apiJson('/subjects?limit=5&offset=0');
    assert.equal(pagedSubjects.status, 200);
    assert.equal(pagedSubjects.body.length, 5);

    const searchSubjects = await apiJson('/subjects?q=To%C3%A1n');
    assert.equal(searchSubjects.status, 200);
    assert.ok(searchSubjects.body.some((s) => s.subject_code === 'TOAN'));

    // Create -> Update -> Delete Subject
    const createdSub = await apiJson('/subjects', {
        method: 'POST',
        body: JSON.stringify({
            subject_code: 'STEM_TEST',
            name: 'STEM Thực hành',
            valid_from: '2026-08-01',
            valid_to: null,
        }),
    });
    assert.equal(createdSub.status, 201);
    const subjectId = createdSub.body.id;

    const updatedSub = await apiJson(`/subjects/${subjectId}`, {
        method: 'PUT',
        body: JSON.stringify({
            subject_code: 'STEM_TEST',
            name: 'STEM Nâng cao',
            valid_from: '2026-08-01',
            valid_to: '2027-05-31',
        }),
    });
    assert.equal(updatedSub.status, 200);
    assert.equal(updatedSub.body.name, 'STEM Nâng cao');

    const delSub = await apiJson(`/subjects/${subjectId}`, {
        method: 'DELETE',
    });
    assert.equal(delSub.status, 204);

    // Filter checks across grades, classes, levels, academic years, semesters, rounds, scopes, applicabilities, components, demands
    const [
        levelsRes,
        gradesRes,
        classesRes,
        yearsRes,
        semRes,
        roundsRes,
        scopesRes,
        appsRes,
        reqRes,
        demandsRes,
    ] = await Promise.all([
        apiJson('/education-levels?limit=20&offset=0'),
        apiJson('/grades?education_level_id=1&limit=20&offset=0'),
        apiJson('/classes?grade_id=10&status=ACTIVE&limit=20&offset=0'),
        apiJson('/academic-years?limit=20&offset=0'),
        apiJson('/semesters?academic_year_id=1&limit=20&offset=0'),
        apiJson(
            '/assignment-rounds?semester_id=1&status=ACTIVE&limit=20&offset=0',
        ),
        apiJson('/round-subject-scopes?round_id=1&limit=20&offset=0'),
        apiJson(
            '/class-subject-applicabilities?scope_id=1&status=APPLICABLE&limit=20&offset=0',
        ),
        apiJson(
            '/required-demand-components?applicability_id=1&limit=20&offset=0',
        ),
        apiJson(
            '/teaching-demands?semester_id=1&demand_type=STANDARD&as_of=2026-10-01&limit=20&offset=0',
        ),
    ]);

    assert.equal(levelsRes.status, 200);
    assert.ok(levelsRes.body.length >= 2);
    assert.equal(gradesRes.status, 200);
    assert.ok(gradesRes.body.every((g) => g.education_level_id === 1));
    assert.equal(classesRes.status, 200);
    assert.ok(
        classesRes.body.every(
            (c) => c.grade_id === 10 && c.status === 'ACTIVE',
        ),
    );
    assert.equal(yearsRes.status, 200);
    assert.ok(yearsRes.body.length >= 1);
    assert.equal(semRes.status, 200);
    assert.ok(semRes.body.every((s) => s.academic_year_id === 1));
    assert.equal(roundsRes.status, 200);
    assert.ok(
        roundsRes.body.every(
            (r) => r.semester_id === 1 && r.status === 'ACTIVE',
        ),
    );
    assert.equal(scopesRes.status, 200);
    assert.ok(scopesRes.body.every((s) => s.round_id === 1));
    assert.equal(appsRes.status, 200);
    assert.ok(
        appsRes.body.every(
            (a) => a.scope_id === 1 && a.status === 'APPLICABLE',
        ),
    );
    assert.equal(reqRes.status, 200);
    assert.ok(reqRes.body.length >= 2);
    assert.equal(demandsRes.status, 200);
    assert.ok(demandsRes.body.every((d) => d.demand_type === 'STANDARD'));

    // Round CRUD lifecycle
    const newRound = await apiJson('/assignment-rounds', {
        method: 'POST',
        body: JSON.stringify({
            semester_id: 3,
            round_code: 'PC-TEST-01',
            status: 'DRAFT',
            scope_confirmed_by: null,
            scope_confirmed_at: null,
            opens_at: '2027-01-05T00:00:00Z',
            closes_at: '2027-01-20T17:00:00Z',
        }),
    });
    assert.equal(newRound.status, 201);
    assert.ok(newRound.body.source_revision_token);
    const delRound = await apiJson(`/assignment-rounds/${newRound.body.id}`, {
        method: 'DELETE',
    });
    assert.equal(delRound.status, 204);
});

test('MSW handlers return deterministic 400, 409, and 422 errors for invalid payloads and conflicts', async () => {
    // 400 invalid pagination / missing field / unpaired readiness / read-only fields
    const badLimit = await apiJson('/subjects?limit=0');
    assert.equal(badLimit.status, 400);
    assert.equal(badLimit.body.code, 'INVALID_REQUEST');

    const badReadiness = await apiJson(
        '/assignment-rounds/1/readiness?optimization_config_id=1',
    );
    assert.equal(badReadiness.status, 400);
    assert.equal(badReadiness.body.code, 'INVALID_REQUEST');

    const readOnlyId = await apiJson('/subjects', {
        method: 'POST',
        body: JSON.stringify({
            id: 999,
            subject_code: 'X_SUB',
            name: 'Môn X',
            valid_from: '2026-08-01',
            valid_to: null,
        }),
    });
    assert.equal(readOnlyId.status, 400);

    const readOnlyRoundToken = await apiJson('/assignment-rounds', {
        method: 'POST',
        body: JSON.stringify({
            semester_id: 1,
            round_code: 'PC-99',
            status: 'DRAFT',
            scope_confirmed_by: null,
            scope_confirmed_at: null,
            opens_at: '2026-08-10T00:00:00Z',
            closes_at: '2026-08-20T17:00:00Z',
            source_revision_token: 'tampered',
        }),
    });
    assert.equal(readOnlyRoundToken.status, 400);

    const readOnlyDemandId = await apiJson('/required-demand-components', {
        method: 'POST',
        body: JSON.stringify({
            applicability_id: 1,
            demand_type: 'ENRICHMENT',
            valid_from: '2026-08-01',
            valid_to: '2026-12-31',
            confirmed_by: null,
            confirmed_at: null,
            demand_id: 101,
        }),
    });
    assert.equal(readOnlyDemandId.status, 400);

    // 409 duplicate subject code
    const dupSub = await apiJson('/subjects', {
        method: 'POST',
        body: JSON.stringify({
            subject_code: 'TOAN',
            name: 'Toán trùng',
            valid_from: '2026-08-01',
            valid_to: null,
        }),
    });
    assert.equal(dupSub.status, 409);
    assert.equal(dupSub.body.code, 'DUPLICATE_RESOURCE');

    // 409 overlapping active TeachingDemand (10A1 Toán already has id=101 STANDARD 2026-08-01..2026-12-31)
    const overlapDemand = await apiJson('/teaching-demands', {
        method: 'POST',
        body: JSON.stringify({
            semester_id: 1,
            class_id: 11,
            subject_id: 1,
            periods_per_week: 3,
            status: 'ACTIVE',
            updated_by: 1,
            demand_type: 'STANDARD',
            valid_from: '2026-09-01',
            valid_to: '2026-11-30',
            unit: 'PERIOD_PER_WEEK',
        }),
    });
    assert.equal(overlapDemand.status, 409);
    assert.equal(overlapDemand.body.code, 'OVERLAPPING_PERIOD');

    // 409 REFERENCE_CONFLICT naturally (Subject #1 Toán) & via `reference` scenario
    const refNatural = await apiJson('/subjects/1', { method: 'DELETE' });
    assert.equal(refNatural.status, 409);
    assert.equal(refNatural.body.code, 'REFERENCE_CONFLICT');

    mockStore.setScenario('reference');
    const refScenario = await apiJson('/subjects/14', { method: 'DELETE' });
    assert.equal(refScenario.status, 409);
    assert.equal(refScenario.body.code, 'REFERENCE_CONFLICT');
    mockStore.setScenario('normal');

    // 422 DATA_CONSTRAINT: class 12 (11A1) on scope 1 (grade 10)
    const wrongGradeApp = await apiJson('/class-subject-applicabilities', {
        method: 'POST',
        body: JSON.stringify({
            scope_id: 1,
            class_id: 12,
            status: 'APPLICABLE',
            reason: null,
            updated_by: 1,
            confirmed_by: null,
            confirmed_at: null,
            components_confirmed_by: null,
            components_confirmed_at: null,
        }),
    });
    assert.equal(wrongGradeApp.status, 422);
    assert.equal(wrongGradeApp.body.code, 'DATA_CONSTRAINT');

    // 422 DATA_CONSTRAINT: semester outside parent academic year (year 1 is 2026-08-01..2027-05-31)
    const outOfRangeSemester = await apiJson('/semesters', {
        method: 'POST',
        body: JSON.stringify({
            academic_year_id: 1,
            semester_no: 3,
            starts_on: '2025-01-01',
            ends_on: '2025-05-31',
        }),
    });
    assert.equal(outOfRangeSemester.status, 422);
    assert.equal(outOfRangeSemester.body.code, 'DATA_CONSTRAINT');
});

test('preparation invariants: component change resets parent confirmation & bumps token; deleting demand unlinks component cleanly', async () => {
    const initialRound = await apiJson('/assignment-rounds/1');
    const initialToken = initialRound.body.source_revision_token;

    // 1. Add an ENRICHMENT component under applicability #1 -> resets components_confirmed_* on app #1 & bumps round #1 token
    const newComp = await apiJson('/required-demand-components', {
        method: 'POST',
        body: JSON.stringify({
            applicability_id: 1,
            demand_type: 'ENRICHMENT',
            valid_from: '2026-08-01',
            valid_to: '2026-12-31',
            confirmed_by: null,
            confirmed_at: null,
        }),
    });
    assert.equal(newComp.status, 201);

    const appAfterAdd = await apiJson('/class-subject-applicabilities/1');
    assert.equal(appAfterAdd.body.components_confirmed_by, null);
    assert.equal(appAfterAdd.body.components_confirmed_at, null);

    const roundAfterAdd = await apiJson('/assignment-rounds/1');
    assert.notEqual(roundAfterAdd.body.source_revision_token, initialToken);

    // 2. Delete added component cleanly
    const delComp = await apiJson(
        `/required-demand-components/${newComp.body.id}`,
        {
            method: 'DELETE',
        },
    );
    assert.equal(delComp.status, 204);

    // 3. Delete linked TeachingDemand #101 (10A1 Toán STANDARD) -> 204 No Content & sets component #1 demand_id = null
    const delDemand = await apiJson('/teaching-demands/101', {
        method: 'DELETE',
    });
    assert.equal(delDemand.status, 204);

    const comp1After = await apiJson('/required-demand-components/1');
    assert.equal(comp1After.status, 200);
    assert.equal(comp1After.body.demand_id, null);
});

test('live readiness reacts to fixing missing 10A2 Ngữ văn demand, supports readiness scenarios, and resets cleanly', async () => {
    // Initially Round 1 misses 10A2 (class 13) Ngữ văn (subject 2) STANDARD demand
    const beforeFix = await apiJson(
        '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
    );
    assert.equal(beforeFix.status, 200);
    assert.equal(beforeFix.body.can_run_solver, false);
    assert.equal(beforeFix.body.coverage.missing_demand, 1);
    assert.ok(
        beforeFix.body.issues.some(
            (i) => i.code === 'REQUIRED_COMPONENT_DEMAND_MISSING',
        ),
    );

    // Create the missing ACTIVE demand for 10A2 · Ngữ văn (STANDARD)
    const addMissingDemand = await apiJson('/teaching-demands', {
        method: 'POST',
        body: JSON.stringify({
            semester_id: 1,
            class_id: 13,
            subject_id: 2,
            periods_per_week: 4,
            status: 'ACTIVE',
            updated_by: 1,
            demand_type: 'STANDARD',
            valid_from: '2026-08-01',
            valid_to: '2026-12-31',
            unit: 'PERIOD_PER_WEEK',
        }),
    });
    assert.equal(addMissingDemand.status, 201);

    // Component #6 is now linked and Round 1 becomes ready
    const comp6 = await apiJson('/required-demand-components/6');
    assert.equal(comp6.body.demand_id, addMissingDemand.body.id);

    const afterFix = await apiJson(
        '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
    );
    assert.equal(afterFix.status, 200);
    assert.equal(afterFix.body.can_run_solver, true);
    assert.equal(afterFix.body.coverage.missing_demand, 0);
    assert.equal(
        afterFix.body.issues.some(
            (i) => i.code === 'REQUIRED_COMPONENT_DEMAND_MISSING',
        ),
        false,
    );

    // Deterministic readiness scenarios
    mockStore.setScenario('readinessReady');
    const readyRes = await apiJson(
        '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
    );
    assert.equal(readyRes.body.can_run_solver, true);
    assert.equal(readyRes.body.coverage.missing_demand, 0);

    mockStore.setScenario('readinessMissing');
    const missingRes = await apiJson('/assignment-rounds/1/readiness');
    assert.equal(missingRes.body.can_run_solver, false);
    assert.equal(missingRes.body.coverage.missing_demand, 3);
    assert.ok(
        missingRes.body.issues.some(
            (i) => i.code === 'CONFIGURATION_SELECTION_REQUIRED',
        ),
    );

    mockStore.setScenario('readinessBlocked');
    const blockedRes = await apiJson(
        '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
    );
    assert.equal(blockedRes.body.can_run_solver, false);
    assert.ok(
        blockedRes.body.issues.some(
            (i) => i.code === 'LOCKED_ASSIGNMENT_OUTSIDE_ROUND_SCOPE',
        ),
    );

    // mockStore.reset() restores clean state
    mockStore.reset();
    const resetRound = await apiJson('/assignment-rounds/1');
    assert.equal(resetRound.body.source_revision_token, 'rev-pc01-20260818-04');
    const resetReadiness = await apiJson(
        '/assignment-rounds/1/readiness?optimization_config_id=1&rule_set_version_id=1',
    );
    assert.equal(resetReadiness.body.can_run_solver, false);
    assert.equal(resetReadiness.body.coverage.missing_demand, 1);
});
