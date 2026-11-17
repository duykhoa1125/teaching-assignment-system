import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { after, before, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    canCompletePlanReady,
    validateAliasDraft,
    validateFeedbackSubmission,
    validateRuleDraft,
} from '../src/features/governance/model.ts';
import {
    base64ToUint8,
    buildPdfFromJpegPages,
    uint8ToBase64,
} from '../src/features/results/pdf.ts';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';
import { completeRoundDemands } from '../src/mocks/fixtures/complete-round.ts';
import { sha256Hex } from '../src/features/results/pdf.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');
const base = 'http://tass.test/api';

async function jsonFetch(path, init) {
    const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    const text = await res.text();
    return {
        status: res.status,
        data: text ? JSON.parse(text) : null,
        headers: res.headers,
    };
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

test('FE-08 governance, result PDF and admin pages never import src/mocks or lucide-react', () => {
    const files = [
        'src/features/governance/types.ts',
        'src/features/governance/model.ts',
        'src/features/governance/api.ts',
        'src/features/governance/queries.ts',
        'src/features/governance/document-markup.tsx',
        'src/features/results/pdf.ts',
        'src/pages/feedback/feedback-page.tsx',
        'src/pages/history/history-page.tsx',
        'src/pages/documents/documents-page.tsx',
        'src/pages/sources/sources-page.tsx',
        'src/pages/admin/admin-rules-page.tsx',
        'src/pages/admin/admin-audit-page.tsx',
        'src/pages/teacher/teacher-pages.tsx',
    ];
    for (const rel of files) {
        const content = readFileSync(resolve(frontendDir, rel), 'utf8');
        assert.equal(
            content.includes('mocks/'),
            false,
            `${rel} must not import src/mocks`,
        );
        assert.equal(
            content.includes('lucide-react'),
            false,
            `${rel} must not import lucide-react`,
        );
    }
});

test('FE-08 pure governance validators and multi-page PDF byte builder work deterministically', () => {
    const sampleRows = [
        {
            id: 1,
            class_name: '10A1',
            subject_name: 'Toán',
            component_type: 'STANDARD',
            periods: 4,
            locked: true,
        },
        {
            id: 2,
            class_name: '11A1',
            subject_name: 'Toán',
            component_type: 'STANDARD',
            periods: 4,
            locked: false,
        },
    ];

    assert.equal(
        validateFeedbackSubmission(
            {
                type: 'ASSIGNMENT',
                title: 'Kiểm tra lớp 10A1',
                text: 'Chi tiết',
                demandId: 99,
                subject: null,
                desiredTotal: '',
            },
            sampleRows,
        ),
        'Chọn một phân công cá nhân liên quan.',
    );

    assert.equal(
        validateFeedbackSubmission(
            {
                type: 'REQUEST_SUBJECT_TOTAL',
                title: 'Nhận thêm Toán',
                text: 'Nhận 8 tiết',
                demandId: null,
                subject: 'Toán',
                desiredTotal: '8',
            },
            sampleRows,
        ),
        'Tổng mong muốn phải lớn hơn tổng tiết môn hiện có; không nhập riêng phần tăng.',
    );

    assert.equal(
        validateFeedbackSubmission(
            {
                type: 'REQUEST_SUBJECT_TOTAL',
                title: 'Nhận thêm Toán',
                text: 'Nhận 12 tiết',
                demandId: null,
                subject: 'Toán',
                desiredTotal: '12',
            },
            sampleRows,
        ),
        null,
    );

    assert.equal(
        canCompletePlanReady('DRAFT', null, 0, 'Lý do rất dài'),
        false,
    );
    assert.equal(canCompletePlanReady('DRAFT', 1, 0, 'Ngắn'), false);
    assert.equal(
        canCompletePlanReady('DRAFT', 1, 0, 'Không cần mở lại vì đã ổn định'),
        true,
    );
    assert.equal(canCompletePlanReady('FEEDBACK_PROCESSING', 1, 1, ''), false);
    assert.equal(canCompletePlanReady('FEEDBACK_PROCESSING', 1, 0, ''), true);

    assert.equal(
        validateRuleDraft(
            {
                code: 'B-THPT',
                name: 'Định mức',
                expression: 'B = 17',
                source: 'E3',
                clause: 'BR-04',
                audience: 'GV',
                version: 'RULE_V1',
                from: '2026-08-01',
                to: '2027-07-31',
                value: 17,
            },
            [
                {
                    id: 'r1',
                    code: 'B-THPT',
                    name: 'Định mức',
                    expression: 'B = 17',
                    source: 'E3',
                    clause: 'BR-04',
                    audience: 'GV',
                    version: 'RULE_V1',
                    from: '2026-08-01',
                    to: '2027-07-31',
                    value: 17,
                },
            ],
            'r1',
        ),
        'Dùng mã phiên bản mới khi cập nhật quy tắc.',
    );

    assert.equal(
        validateAliasDraft(
            {
                kind: 'SUBJECT',
                alias: 'toán học',
                canonical: 'Toán',
                source: 'Bảng A',
            },
            [
                {
                    id: 'a1',
                    kind: 'SUBJECT',
                    alias: 'Toán học',
                    canonical: 'Toán',
                    source: 'Bảng A',
                    by: 'An',
                    at: '2026-08-01T00:00:00Z',
                },
            ],
            ['Toán'],
        ),
        'Bí danh đã có ánh xạ; không tạo ánh xạ mơ hồ.',
    );

    const fakeJpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdfBytes = buildPdfFromJpegPages([fakeJpg]);
    const pdfText = new TextDecoder().decode(pdfBytes);
    assert.ok(pdfText.startsWith('%PDF-1.4\n'));
    assert.ok(pdfText.endsWith('%%EOF'));
    assert.deepEqual(base64ToUint8(uint8ToBase64(fakeJpg)), fakeJpg);
});

test('FE-08 end-to-end lifecycle: validate -> open feedback -> teacher submit -> close -> resolve -> next draft -> ready -> issue PDF -> restore snapshot', async () => {
    completeRoundDemands(1);
    // 1. Initial governance overview matches layout badge
    const initGov = await jsonFetch('/mock/governance/overview?context_id=hk1');
    assert.equal(initGov.status, 200);
    assert.equal(initGov.data.phase, 'DRAFT');
    assert.equal(initGov.data.pending_count, 2);
    assert.equal(initGov.data.snapshots.length, 1);
    assert.equal(initGov.data.snapshots[0].is_full, false);

    // Cannot open feedback before fresh validation
    const futureDue = new Date(Date.now() + 86_400_000).toISOString();
    const openBlocked = await jsonFetch('/mock/governance/feedback/open', {
        method: 'POST',
        body: JSON.stringify({ context_id: 'hk1', due: futureDue }),
    });
    assert.equal(openBlocked.status, 422);
    assert.equal(openBlocked.data.code, 'VALIDATION_REQUIRED');

    // Run solver so unassigned rows get filled and fresh PASS validation is saved
    const planRes = await jsonFetch('/assignment-rounds/1/plan');
    const runStart = await jsonFetch(
        `/plan-versions/${planRes.data.version_id}/solver-runs`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: planRes.data.revision_no,
                optimization_config_id: 1,
                rule_set_version_id: 1,
            }),
        },
    );
    assert.equal(runStart.status, 202);
    await jsonFetch(`/solver-runs/${runStart.data.id}`);
    const settled = await jsonFetch(`/solver-runs/${runStart.data.id}`);
    assert.equal(settled.data.summary.apply_outcome, 'APPLIED');

    // 2. Open feedback -> creates frozen full snapshot and switches phase
    const opened = await jsonFetch('/mock/governance/feedback/open', {
        method: 'POST',
        body: JSON.stringify({ context_id: 'hk1', due: futureDue }),
    });
    assert.equal(opened.status, 200);
    assert.equal(opened.data.phase, 'OPEN_FOR_FEEDBACK');
    assert.equal(
        opened.data.snapshots.some((s) => s.is_full === true),
        true,
    );

    // 3. Teacher portal sees open version + submits feedback -> manager pending count becomes 3
    const teacherView = await jsonFetch(
        '/mock/teacher/overview?context_id=hk1&teacher_id=101',
    );
    assert.equal(teacherView.data.phase, 'OPEN_FOR_FEEDBACK');
    assert.ok(teacherView.data.released_versions.length >= 1);

    const badFeedback = await jsonFetch('/mock/teacher/feedback', {
        method: 'POST',
        body: JSON.stringify({
            context_id: 'hk1',
            teacher_id: 101,
            type: 'REQUEST_SUBJECT_TOTAL',
            title: 'Nhận thêm Toán',
            text: 'Tổng tiết thấp hơn hiện có',
            subject: 'Toán',
            desired_total: 6,
        }),
    });
    assert.equal(badFeedback.status, 422);

    const goodFeedback = await jsonFetch('/mock/teacher/feedback', {
        method: 'POST',
        body: JSON.stringify({
            context_id: 'hk1',
            teacher_id: 101,
            type: 'REQUEST_SUBJECT_TOTAL',
            title: 'Đề nghị dạy 12 tiết Toán',
            text: 'Có thể nhận thêm 1 lớp khối 10.',
            subject: 'Toán',
            desired_total: 12,
        }),
    });
    assert.equal(goodFeedback.status, 201);

    const layoutAfterSubmit = await jsonFetch('/mock/layout');
    assert.equal(
        layoutAfterSubmit.data.contexts.find((c) => c.id === 'hk1').feedback,
        3,
    );

    // 4. Close feedback -> FEEDBACK_PROCESSING, resolve all pending items
    const closed = await jsonFetch('/mock/governance/feedback/close', {
        method: 'POST',
        body: JSON.stringify({ context_id: 'hk1', reason: 'Hết hạn rà soát.' }),
    });
    assert.equal(closed.status, 200);
    assert.equal(closed.data.phase, 'FEEDBACK_PROCESSING');

    for (const item of closed.data.feedback.filter(
        (f) => f.status === 'pending',
    )) {
        const res = await jsonFetch(
            `/mock/governance/feedback/${item.id}/resolve`,
            {
                method: 'POST',
                body: JSON.stringify({
                    context_id: 'hk1',
                    decision: 'ACCEPTED',
                    result: 'Đã ghi nhận điều chỉnh vào đợt.',
                }),
            },
        );
        assert.equal(res.status, 200);
    }

    // 5. Create next DRAFT V03 -> mark READY_TO_EXPORT -> issue immutable PDF
    const nextDraft = await jsonFetch('/mock/governance/versions/next', {
        method: 'POST',
        body: JSON.stringify({ context_id: 'hk1' }),
    });
    assert.equal(nextDraft.status, 200);
    assert.equal(nextDraft.data.phase, 'DRAFT');
    assert.equal(nextDraft.data.version_no, 3);
    assert.equal(nextDraft.data.source_version_no, 2);

    const freshPlan = await jsonFetch('/assignment-rounds/1/plan');
    const revalidate = await jsonFetch(
        `/plan-versions/${freshPlan.data.version_id}/validation`,
        {
            method: 'POST',
            body: JSON.stringify({
                expected_revision: freshPlan.data.revision_no,
            }),
        },
    );
    assert.equal(revalidate.status, 201);

    const readyRes = await jsonFetch('/mock/governance/versions/ready', {
        method: 'POST',
        body: JSON.stringify({
            context_id: 'hk1',
            reason: 'Phương án sau rà soát không cần mở lại lấy ý kiến.',
        }),
    });
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.data.phase, 'READY_TO_EXPORT');

    const pdfBytes = buildPdfFromJpegPages([
        new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
    ]);
    const issued = await jsonFetch('/mock/governance/documents/issue', {
        method: 'POST',
        body: JSON.stringify({
            context_id: 'hk1',
            mode: 'teachers',
            filename: 'TASS-PC-01-V3-teachers.pdf',
            bytes: pdfBytes.length,
            sha256: await sha256Hex(pdfBytes),
            source_token: readyRes.data.source_token,
            base_revision: readyRes.data.revision_no,
            validation_id: readyRes.data.validation_id ?? 'VAL-1',
            pdf_base64: uint8ToBase64(pdfBytes),
            snapshot: readyRes.data.preview_snapshot,
        }),
    });
    assert.equal(issued.status, 201);

    // 6. Legacy snapshot blocks restore; manual full snapshot restores cleanly to DRAFT V04
    const legacyRestore = await jsonFetch(
        '/mock/governance/snapshots/SNAP-HK1-V1/restore',
        {
            method: 'POST',
            body: JSON.stringify({ context_id: 'hk1' }),
        },
    );
    assert.equal(legacyRestore.status, 422);

    const savedSnap = await jsonFetch('/mock/governance/snapshots', {
        method: 'POST',
        body: JSON.stringify({
            context_id: 'hk1',
            title: 'Mốc trước khôi phục',
        }),
    });
    assert.equal(savedSnap.status, 201);
    const restored = await jsonFetch(
        `/mock/governance/snapshots/${savedSnap.data.id}/restore`,
        {
            method: 'POST',
            body: JSON.stringify({ context_id: 'hk1' }),
        },
    );
    assert.equal(restored.status, 200);
    assert.equal(restored.data.phase, 'DRAFT');
    assert.equal(restored.data.version_no, 4);

    // Released versions stay deduplicated per (version_no, revision_no) and remain viewable by teacher
    const teacherAfterRestore = await jsonFetch(
        '/mock/teacher/overview?context_id=hk1&teacher_id=101',
    );
    assert.equal(teacherAfterRestore.status, 200);
    const seenPairs = new Set(
        teacherAfterRestore.data.released_versions.map(
            (v) => `${v.version_no}:${v.revision_no}`,
        ),
    );
    assert.equal(
        seenPairs.size,
        teacherAfterRestore.data.released_versions.length,
    );
    assert.ok(seenPairs.size >= 2);
});

test('FE-08 admin rules, sources/aliases, audit trail, and mock reset work via HTTP', async () => {
    const ruleErr = await jsonFetch('/mock/governance/rules/rule-base-thpt', {
        method: 'POST',
        body: JSON.stringify({
            code: 'B-THPT',
            name: 'Định mức THPT',
            expression: 'B = 17',
            source: 'E3',
            clause: 'BR-04',
            audience: 'GV THPT',
            version: 'RULE_THPT_2026_V1',
            from: '2026-08-01',
            to: '2027-07-31',
            value: 17,
        }),
    });
    assert.equal(ruleErr.status, 422);

    const ruleOk = await jsonFetch('/mock/governance/rules/rule-base-thpt', {
        method: 'POST',
        body: JSON.stringify({
            code: 'B-THPT',
            name: 'Định mức THPT mới',
            expression: 'B = 17',
            source: 'E3',
            clause: 'BR-04',
            audience: 'GV THPT',
            version: 'RULE_THPT_2026_V2',
            from: '2026-08-01',
            to: '2027-07-31',
            value: 17,
        }),
    });
    assert.equal(ruleOk.status, 201);

    const sourceCreated = await jsonFetch('/mock/governance/sources', {
        method: 'POST',
        body: JSON.stringify({
            file: 'phan-cong-hk1.xlsx',
            sheet: 'Sheet1',
            cell: 'C4:C10',
            raw: 'Toan hoc',
            canonical: 'Toán',
            evidence: 'Tổ Toán xác nhận',
            status: 'CONFIRMED',
        }),
    });
    assert.equal(sourceCreated.status, 201);

    const aliasCreated = await jsonFetch('/mock/governance/aliases', {
        method: 'POST',
        body: JSON.stringify({
            kind: 'SUBJECT',
            alias: 'Toan hoc',
            canonical: 'Toán',
            source: 'phan-cong-hk1.xlsx',
        }),
    });
    assert.equal(aliasCreated.status, 201);

    const auditFiltered = await jsonFetch('/mock/governance/audit?q=bi%20danh');
    assert.equal(auditFiltered.status, 200);
    assert.ok(auditFiltered.data.length >= 1);

    mockStore.reset();
    const afterReset = await jsonFetch(
        '/mock/governance/overview?context_id=hk1',
    );
    assert.equal(afterReset.data.phase, 'DRAFT');
    assert.equal(afterReset.data.pending_count, 2);
});
