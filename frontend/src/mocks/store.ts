import { teachers as fixtureTeachers, schools } from './fixtures/index.ts';
import { isMockScenario, type MockScenario } from './scenarios/index.ts';
import type { Teacher, TeacherRequest } from '../features/teachers/types.ts';

export class MockError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
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
        generation++;
    },
    reset() {
        data = structuredClone(fixtureTeachers);
        nextId = Math.max(...data.map((teacher) => teacher.id)) + 1;
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
        if (id !== undefined) this.detail(id);
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
    },
};
