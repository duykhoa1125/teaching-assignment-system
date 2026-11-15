import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { after, before, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    buildTeacherListFilters,
    formatTeacherApiError,
    sliceTeacherPage,
    TEACHERS_PAGE_SIZE,
    validateTeacherForm,
} from '../src/features/teachers/model.ts';
import { schools, teachers } from '../src/mocks/fixtures/index.ts';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');
const base = 'http://tass.test/api';

before(() => mockServer.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
    mockStore.reset();
    mockServer.resetHandlers();
});
after(() => mockServer.close());

test('teacher UI and feature modules never import src/mocks or lucide-react', () => {
    const files = [
        'src/features/teachers/types.ts',
        'src/features/teachers/model.ts',
        'src/features/teachers/api.ts',
        'src/features/teachers/queries.ts',
        'src/pages/teachers/teachers-page.tsx',
        'src/pages/teachers/teacher-form-dialog.tsx',
        'src/pages/teachers/teacher-delete-dialog.tsx',
        'src/pages/teachers/teacher-detail-drawer.tsx',
    ];

    for (const rel of files) {
        const source = readFileSync(resolve(frontendDir, rel), 'utf8');
        assert.equal(
            source.includes('mocks/'),
            false,
            `${rel} must not import mocks`,
        );
        assert.equal(
            source.includes('lucide-react'),
            false,
            `${rel} should use original Icon glyphs`,
        );
    }
});

test('buildTeacherListFilters trims whitespace and requests pageSize + 1 lookahead', () => {
    assert.deepEqual(
        buildTeacherListFilters({
            schoolId: 1,
            q: '   ',
            teacherCode: '  GV001  ',
            offset: -10,
            pageSize: TEACHERS_PAGE_SIZE,
        }),
        {
            school_id: 1,
            q: undefined,
            teacher_code: 'GV001',
            limit: TEACHERS_PAGE_SIZE + 1,
            offset: 0,
        },
    );
});

test('sliceTeacherPage detects hasNext accurately using lookahead row', () => {
    const six = teachers.slice(0, 6);
    const first = sliceTeacherPage(six, 5);
    assert.equal(first.items.length, 5);
    assert.equal(first.hasNext, true);

    const exact = sliceTeacherPage(teachers.slice(0, 5), 5);
    assert.equal(exact.items.length, 5);
    assert.equal(exact.hasNext, false);
});

test('validateTeacherForm enforces required fields, lengths, and school selection', () => {
    const invalid = validateTeacherForm(
        { schoolId: 999, teacherCode: '   ', fullName: 'X'.repeat(256) },
        schools,
    );
    assert.equal(invalid.valid, false);
    if (!invalid.valid) {
        assert.ok(invalid.errors.school_id);
        assert.ok(invalid.errors.teacher_code);
        assert.ok(invalid.errors.full_name);
    }

    const valid = validateTeacherForm(
        {
            schoolId: 1,
            teacherCode: '  GV099  ',
            fullName: '  Nguyễn Văn Mới  ',
        },
        schools,
    );
    assert.equal(valid.valid, true);
    if (valid.valid) {
        assert.deepEqual(valid.payload, {
            school_id: 1,
            teacher_code: 'GV099',
            full_name: 'Nguyễn Văn Mới',
        });
    }
});

test('formatTeacherApiError surfaces backend/MSW conflict messages clearly', () => {
    assert.equal(
        formatTeacherApiError({
            code: 'REFERENCE_CONFLICT',
            message: 'Kịch bản mẫu: giáo viên đang được tham chiếu.',
        }),
        'Kịch bản mẫu: giáo viên đang được tham chiếu.',
    );
    assert.equal(
        formatTeacherApiError({ code: 'DUPLICATE_RESOURCE', message: '' }),
        'Mã giáo viên đã tồn tại trong trường.',
    );
});

test('teachers CRUD, pagination lookahead, reference conflict, and reset stay consistent over HTTP', async () => {
    const page1Params = new URLSearchParams(
        Object.entries(
            buildTeacherListFilters({
                offset: 0,
                pageSize: TEACHERS_PAGE_SIZE,
            }),
        )
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
    );
    const page1Rows = await (
        await fetch(`${base}/teachers?${page1Params}`)
    ).json();
    const page1 = sliceTeacherPage(page1Rows, TEACHERS_PAGE_SIZE);
    assert.equal(page1.items.length, 5);
    assert.equal(page1.hasNext, true);

    const createdResp = await fetch(`${base}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            school_id: 1,
            teacher_code: 'GV999',
            full_name: 'Nguyễn Kiểm Thử',
        }),
    });
    assert.equal(createdResp.status, 201);
    const created = await createdResp.json();

    const detailResp = await fetch(`${base}/teachers/${created.id}`);
    assert.equal(detailResp.status, 200);
    assert.equal((await detailResp.json()).teacher_code, 'GV999');

    mockStore.setScenario('reference');
    const blockedDelete = await fetch(`${base}/teachers/${created.id}`, {
        method: 'DELETE',
    });
    assert.equal(blockedDelete.status, 409);
    assert.equal((await blockedDelete.json()).code, 'REFERENCE_CONFLICT');

    mockStore.reset();
    assert.equal((await fetch(`${base}/teachers/${created.id}`)).status, 404);
    assert.equal(
        (await (await fetch(`${base}/teachers`)).json()).length,
        teachers.length,
    );
});
