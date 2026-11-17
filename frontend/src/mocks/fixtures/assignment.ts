import type { WorkspaceTeacher } from '../../features/assignment/types.ts';
import type { Subject } from '../../features/catalogs/types.ts';
import type { Teacher } from '../../features/teachers/types.ts';

// Explicit UI fixture, not a reimplementation of verified backend eligibility/policy.
const qualificationIds: Record<number, number[]> = {
    101: [1, 9],
    102: [2],
    103: [3],
    104: [4],
    105: [1, 9],
    106: [2],
    201: [1, 14],
    202: [1, 14],
};
export const assignmentPolicies = {
    1: { base: 17, limit: 24 },
    2: { base: 19, limit: 25 },
} as const;

export function captureWorkspaceTeachers(
    teachers: Teacher[],
    schoolId: number,
    subjects: Subject[],
    from: string,
    to: string,
    rule: number,
): WorkspaceTeacher[] {
    const policy =
        assignmentPolicies[rule as keyof typeof assignmentPolicies] ??
        assignmentPolicies[1];
    return teachers
        .filter((teacher) => teacher.school_id === schoolId)
        .map((teacher, index) => ({
            id: teacher.id,
            full_name: teacher.full_name,
            teacher_code: teacher.teacher_code,
            subjects: subjects
                .filter((subject) =>
                    (qualificationIds[teacher.id] ?? []).includes(subject.id),
                )
                .map((subject) => ({ id: subject.id, name: subject.name })),
            portrait_key: index + 1,
            color_index: index % 6,
            base_norm: policy.base,
            weekly_limit: policy.limit,
            fixed: 8 + (index % 3),
            converted: 0,
            reduced: index % 3 === 0 ? 1 : 0,
            valid_from: from,
            valid_to: to,
        }));
}
