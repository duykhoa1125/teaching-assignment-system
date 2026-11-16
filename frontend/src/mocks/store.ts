import { teachers as fixtureTeachers, schools } from './fixtures/index.ts';
import {
    DEMO_LOGIN_PASSWORD,
    demoAccounts as fixtureAccounts,
    type MockAuthRole,
} from './fixtures/accounts.ts';
import { isMockScenario, type MockScenario } from './scenarios/index.ts';
import type { Teacher, TeacherRequest } from '../features/teachers/types.ts';
import { MockError } from './mock-error.ts';
import { preparationStore } from './preparation-store.ts';
import { assignmentStore } from './assignment-store.ts';

export { MockError };
let data = structuredClone(fixtureTeachers);
let nextId = Math.max(...fixtureTeachers.map((teacher) => teacher.id)) + 1;
let scenario: MockScenario = 'normal';
let generation = 0;

export const mockStore = {
    get generation() {
        return generation;
    },
    get scenario() {
        return scenario;
    },
    setScenario(value: string) {
        if (!isMockScenario(value))
            throw new Error(`Scenario không hợp lệ: ${value}`);
        scenario = value;
        assignmentStore.configureScenario(value);
        generation++;
    },
    reset() {
        data = structuredClone(fixtureTeachers);
        nextId = Math.max(...data.map((teacher) => teacher.id)) + 1;
        preparationStore.reset();
        assignmentStore.reset();
        scenario = 'normal';
        generation++;
    },
    list() {
        return structuredClone(data);
    },
    detail(id: number) {
        const teacher = data.find((item) => item.id === id);
        if (!teacher)
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy giáo viên.',
            );
        return structuredClone(teacher);
    },
    save(input: TeacherRequest, id?: number) {
        const previous = id === undefined ? undefined : this.detail(id);
        if (!schools.some((school) => school.id === input.school_id))
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Trường được chọn không tồn tại.',
            );
        if (
            data.some(
                (teacher) =>
                    teacher.id !== id &&
                    teacher.school_id === input.school_id &&
                    teacher.teacher_code === input.teacher_code,
            )
        )
            throw new MockError(
                409,
                'DUPLICATE_RESOURCE',
                'Mã giáo viên đã tồn tại trong trường.',
            );
        const teacher: Teacher = { id: id ?? nextId++, ...input };
        if (id === undefined) data.push(teacher);
        else data = data.map((item) => (item.id === id ? teacher : item));
        preparationStore.touchSchoolSource(input.school_id);
        if (previous && previous.school_id !== input.school_id)
            preparationStore.touchSchoolSource(previous.school_id);
        return structuredClone(teacher);
    },
    remove(id: number) {
        this.detail(id);
        if (scenario === 'reference')
            throw new MockError(
                409,
                'REFERENCE_CONFLICT',
                'Kịch bản mẫu: giáo viên đang được tham chiếu.',
            );
        data = data.filter((teacher) => teacher.id !== id);
        preparationStore.touchSchoolSource();
    },
    listAccounts() {
        return structuredClone(fixtureAccounts);
    },
    findAccount(idOrLogin: string) {
        const key = idOrLogin.trim().toLowerCase();
        const found = fixtureAccounts.find(
            (account) => account.id === key || account.login === key,
        );
        return found ? structuredClone(found) : null;
    },
    authenticate(login: string, password: string) {
        const normalized = login.trim().toLowerCase();
        if (!normalized || !password) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Nhập tài khoản và mật khẩu demo để tiếp tục.',
            );
        }
        const account = fixtureAccounts.find(
            (item) => item.login === normalized,
        );
        if (!account || password !== DEMO_LOGIN_PASSWORD) {
            throw new MockError(
                401,
                'INVALID_CREDENTIALS',
                'Thông tin đăng nhập không hợp lệ.',
            );
        }
        return structuredClone(account);
    },
    authorizeRole(accountId: string, role: MockAuthRole) {
        const account = fixtureAccounts.find((item) => item.id === accountId);
        if (!account || account.status !== 'active') {
            throw new MockError(
                401,
                'AUTHENTICATION_REQUIRED',
                'Phiên đăng nhập không hợp lệ hoặc tài khoản đang tạm khóa.',
            );
        }
        if (!account.roles.includes(role)) {
            throw new MockError(
                403,
                'ROLE_FORBIDDEN',
                'Vai trò được yêu cầu chưa được cấp cho tài khoản này.',
            );
        }
        return structuredClone(account);
    },
};
