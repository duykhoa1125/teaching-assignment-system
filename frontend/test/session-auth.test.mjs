import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { after, before, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    activeHomePath,
    AUTH_IDLE_MS,
    evaluateRouteAccess,
    inferRoleForPath,
    isSessionRecordValid,
    resolveGuardedPageTitle,
    roleAllowsPath,
    roleSearchDestinations,
} from '../src/features/session/roles.ts';
import {
    clearActiveToasts,
    subscribeToastClear,
} from '../src/shared/ui/toast-bus.ts';
import {
    clearStoredSession,
    readStoredContextId,
    readStoredSession,
    resetMockClientSession,
    subscribeMockReset,
    writeStoredContextId,
    writeStoredSession,
} from '../src/features/session/storage.ts';
import { DEMO_LOGIN_PASSWORD } from '../src/mocks/fixtures/accounts.ts';
import { mockServer } from '../src/mocks/node.ts';
import { mockStore } from '../src/mocks/store.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');
const base = 'http://tass.test/api';

function createMemoryStorage() {
    const map = new Map();
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        },
        clear() {
            map.clear();
        },
    };
}

let hadWindow = false;
let previousWindow;

before(() => {
    hadWindow = 'window' in globalThis;
    previousWindow = globalThis.window;
    globalThis.window = { sessionStorage: createMemoryStorage() };
    mockServer.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
    globalThis.window.sessionStorage.clear();
    mockStore.reset();
    mockServer.resetHandlers();
});

after(() => {
    mockStore.reset();
    mockServer.close();
    if (hadWindow) {
        globalThis.window = previousWindow;
    } else {
        delete globalThis.window;
    }
});

test('session feature and role/auth pages never import src/mocks or lucide-react', () => {
    const files = [
        'src/features/session/types.ts',
        'src/features/session/roles.ts',
        'src/features/session/storage.ts',
        'src/features/session/api.ts',
        'src/features/session/queries.ts',
        'src/features/session/use-session.ts',
        'src/features/session/session-context.tsx',
        'src/features/session/role-ui.tsx',
        'src/pages/auth/login-page.tsx',
        'src/pages/access/forbidden-page.tsx',
        'src/pages/access/no-scope-page.tsx',
        'src/pages/settings/settings-page.tsx',
        'src/pages/admin/admin-pages.tsx',
        'src/pages/teacher/teacher-pages.tsx',
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
            `${rel} must not import lucide-react`,
        );
    }
});

test('session role routing helpers enforce role boundaries, scope, and search destinations', () => {
    assert.equal(roleAllowsPath('admin', '/admin'), true);
    assert.equal(roleAllowsPath('admin', '/admin/accounts'), true);
    assert.equal(roleAllowsPath('admin', '/admin/access'), true);
    assert.equal(roleAllowsPath('admin', '/'), false);
    assert.equal(roleAllowsPath('admin', '/teacher'), false);
    assert.equal(roleAllowsPath('admin', '/settings'), true);

    assert.equal(roleAllowsPath('manager', '/'), true);
    assert.equal(roleAllowsPath('manager', '/teachers'), true);
    assert.equal(roleAllowsPath('manager', '/assignment'), true);
    assert.equal(roleAllowsPath('manager', '/admin/accounts'), false);
    assert.equal(roleAllowsPath('manager', '/teacher'), false);
    assert.equal(roleAllowsPath('manager', '/settings'), true);

    assert.equal(roleAllowsPath('teacher', '/teacher'), true);
    assert.equal(roleAllowsPath('teacher', '/teacher/load'), true);
    assert.equal(roleAllowsPath('teacher', '/teacher/feedback'), true);
    assert.equal(roleAllowsPath('teacher', '/teachers'), false);
    assert.equal(roleAllowsPath('teacher', '/admin'), false);
    assert.equal(roleAllowsPath('teacher', '/settings'), true);

    assert.equal(inferRoleForPath('/admin/accounts'), 'admin');
    assert.equal(inferRoleForPath('/teachers'), 'manager');
    assert.equal(inferRoleForPath('/teacher/load'), 'teacher');
    assert.equal(inferRoleForPath('/unknown-route'), null);

    assert.equal(activeHomePath({ school: 'anhoa' }, 'admin'), '/admin');
    assert.equal(activeHomePath({ school: 'anhoa' }, 'manager'), '/');
    assert.equal(activeHomePath({ school: 'anhoa' }, 'teacher'), '/teacher');
    assert.equal(activeHomePath({ school: null }, 'manager'), '/no-scope');

    const unscopedDest = roleSearchDestinations('manager', false);
    assert.deepEqual(
        unscopedDest.map((d) => d.path),
        ['/settings'],
    );
    const adminDest = roleSearchDestinations('admin', true);
    assert.equal(
        adminDest.some((d) => d.path === '/admin/accounts'),
        true,
    );
    assert.equal(
        adminDest.some((d) => d.path === '/settings'),
        true,
    );
    assert.equal(
        adminDest.some((d) => d.path === '/teachers'),
        false,
    );

    assert.deepEqual(evaluateRouteAccess('/teachers', 'teacher', true, true), {
        status: 'forbidden',
        requestedTitle: 'Hồ sơ & năng lực',
        requiredRole: 'manager',
    });
    assert.deepEqual(evaluateRouteAccess('/teachers', 'manager', false, true), {
        status: 'no-scope',
    });
    assert.deepEqual(evaluateRouteAccess('/dev/ui', 'teacher', false, true), {
        status: 'allow',
    });
    assert.equal(
        resolveGuardedPageTitle('/teachers', 'teacher', true, true),
        'Không đủ quyền truy cập',
    );
    assert.equal(
        resolveGuardedPageTitle('/teachers', 'manager', false, true),
        'Chưa có phạm vi truy cập',
    );
    assert.equal(
        resolveGuardedPageTitle('/settings', 'manager', false, true),
        'Hồ sơ & cài đặt',
    );
    assert.equal(
        resolveGuardedPageTitle('/dev/ui', 'teacher', false, true),
        'Thư viện giao diện',
    );
});

test('clearActiveToasts notifies subscribers and fires on resetMockClientSession', () => {
    let clears = 0;
    const unsubscribe = subscribeToastClear(() => {
        clears += 1;
    });
    clearActiveToasts();
    assert.equal(clears, 1);
    resetMockClientSession();
    assert.equal(clears, 2);
    unsubscribe();
    clearActiveToasts();
    assert.equal(clears, 2);
});

test('isSessionRecordValid checks status, assigned roles, idle window, and validity dates', () => {
    const now = Date.UTC(2026, 9, 15, 10, 0, 0);
    const activeAccount = {
        id: 'manager',
        login: 'quanly@tass.demo',
        name: 'Nguyễn Minh Khoa',
        roles: ['manager'],
        status: 'active',
        school: 'anhoa',
    };

    assert.equal(
        isSessionRecordValid(
            { accountId: 'manager', role: 'manager', lastActivity: now - 1000 },
            activeAccount,
            now,
        ),
        true,
    );
    assert.equal(
        isSessionRecordValid(
            {
                accountId: 'manager',
                role: 'manager',
                lastActivity: now - AUTH_IDLE_MS,
            },
            activeAccount,
            now,
        ),
        false,
    );
    assert.equal(
        isSessionRecordValid(
            { accountId: 'manager', role: 'admin', lastActivity: now },
            activeAccount,
            now,
        ),
        false,
    );
    assert.equal(
        isSessionRecordValid(
            { accountId: 'manager', role: 'manager', lastActivity: now },
            { ...activeAccount, status: 'locked' },
            now,
        ),
        false,
    );
    assert.equal(
        isSessionRecordValid(
            { accountId: 'manager', role: 'manager', lastActivity: now },
            { ...activeAccount, from: '2026-10-20' },
            now,
        ),
        false,
    );
});

test('session storage roundtrips session, contextId, and mock reset subscription', () => {
    assert.equal(readStoredSession(), null);
    assert.equal(readStoredContextId(), 'hk1');

    const record = {
        accountId: 'dual',
        role: 'admin',
        lastActivity: 1700000000000,
    };
    assert.equal(writeStoredSession(record), true);
    assert.deepEqual(readStoredSession(), record);

    assert.equal(writeStoredContextId('thcs-demo'), true);
    assert.equal(readStoredContextId(), 'thcs-demo');

    // Invalid contextId falls back cleanly.
    globalThis.window.sessionStorage.setItem(
        'tass-demo-context-v1',
        'invalid-ctx',
    );
    assert.equal(readStoredContextId(), 'hk1');

    writeStoredContextId('hk2');
    let notified = 0;
    const unsubscribe = subscribeMockReset(() => {
        notified += 1;
    });
    resetMockClientSession();
    assert.equal(notified, 1);
    assert.equal(readStoredSession(), null);
    assert.equal(readStoredContextId(), 'hk1');

    writeStoredSession(record);
    clearStoredSession();
    assert.equal(readStoredSession(), null);
    unsubscribe();
});

test('MSW mock auth, session, admin, and teacher handlers honor contracts and scenarios', async () => {
    // 1. Wrong password -> 401
    const badLogin = await fetch(`${base}/mock/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            login: 'quanly@tass.demo',
            password: 'wrong-password',
        }),
    });
    assert.equal(badLogin.status, 401);

    // 2. Manager login -> authenticated
    const managerLogin = await fetch(`${base}/mock/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            login: 'quanly@tass.demo',
            password: DEMO_LOGIN_PASSWORD,
        }),
    });
    assert.equal(managerLogin.status, 200);
    const managerBody = await managerLogin.json();
    assert.equal(managerBody.status, 'authenticated');
    assert.equal(managerBody.session.accountId, 'manager');
    assert.equal(managerBody.session.role, 'manager');

    // 3. Dual-role login -> choose_role -> select-role
    const dualLogin = await fetch(`${base}/mock/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            login: 'kiemnhiem@tass.demo',
            password: DEMO_LOGIN_PASSWORD,
        }),
    });
    assert.equal(dualLogin.status, 200);
    const dualBody = await dualLogin.json();
    assert.equal(dualBody.status, 'choose_role');
    assert.deepEqual(dualBody.account.roles, ['admin', 'manager']);

    const selectAdmin = await fetch(`${base}/mock/auth/select-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'dual', role: 'admin' }),
    });
    assert.equal(selectAdmin.status, 200);
    const selectAdminBody = await selectAdmin.json();
    assert.equal(selectAdminBody.status, 'authenticated');
    assert.equal(selectAdminBody.session.role, 'admin');

    // Unassigned role -> 403
    const forbiddenSelect = await fetch(`${base}/mock/auth/select-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'teacher', role: 'admin' }),
    });
    assert.equal(forbiddenSelect.status, 403);

    // 4. Locked login -> 200 status locked; session check -> 401
    const lockedLogin = await fetch(`${base}/mock/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            login: 'tamkhoa@tass.demo',
            password: DEMO_LOGIN_PASSWORD,
        }),
    });
    assert.equal(lockedLogin.status, 200);
    assert.equal((await lockedLogin.json()).status, 'locked');

    const lockedSession = await fetch(
        `${base}/mock/session?account_id=locked&role=teacher&context_id=hk1`,
    );
    assert.equal(lockedSession.status, 401);

    // 5. Valid session validation
    const validSession = await fetch(
        `${base}/mock/session?account_id=manager&role=manager&context_id=hk1`,
    );
    assert.equal(validSession.status, 200);
    const validSessionBody = await validSession.json();
    assert.equal(validSessionBody.account.id, 'manager');
    assert.equal(validSessionBody.contexts.length, 3);

    // 6. Admin overview
    const adminOverview = await fetch(
        `${base}/mock/admin/overview?context_id=hk1`,
    );
    assert.equal(adminOverview.status, 200);
    const adminBody = await adminOverview.json();
    assert.equal(adminBody.accounts.length, 7);
    assert.equal(adminBody.stats.accounts_total, 7);
    assert.equal(adminBody.stats.accounts_active, 6);
    assert.equal(adminBody.stats.accounts_locked, 1);

    // 7. Teacher IDs match the directory/snapshot, scoped to the correct school.
    const missingTeacherHk1 = await fetch(
        `${base}/mock/teacher/overview?context_id=hk1&teacher_id=201`,
    );
    assert.equal(missingTeacherHk1.status, 200);
    assert.equal((await missingTeacherHk1.json()).teacher, null);

    const presentTeacherThcs = await fetch(
        `${base}/mock/teacher/overview?context_id=thcs-demo&teacher_id=201`,
    );
    assert.equal(presentTeacherThcs.status, 200);
    const thcsBody = await presentTeacherThcs.json();
    assert.equal(thcsBody.teacher.id, 201);
    assert.equal(thcsBody.context_id, 'thcs-demo');

    // 8. Logout -> 204
    const logoutRes = await fetch(`${base}/mock/auth/logout`, {
        method: 'POST',
    });
    assert.equal(logoutRes.status, 204);

    // 9. Scenario unavailable -> 503
    mockStore.setScenario('unavailable');
    const errRes = await fetch(`${base}/mock/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            login: 'quanly@tass.demo',
            password: DEMO_LOGIN_PASSWORD,
        }),
    });
    assert.equal(errRes.status, 503);

    // 10. Scenario empty -> admin teachers_count becomes 0
    mockStore.setScenario('empty');
    const emptyAdmin = await fetch(
        `${base}/mock/admin/overview?context_id=hk1`,
    );
    assert.equal(emptyAdmin.status, 200);
    assert.equal((await emptyAdmin.json()).stats.teachers_count, 0);
});
