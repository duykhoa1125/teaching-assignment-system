import type {
    PlanSnapshot,
    PlanSnapshotTeacherLoad,
} from '../features/governance/types.ts';
import type { OverviewTeacherLoad } from '../features/overview/types.ts';
import type { WorkspaceTeacher } from '../features/assignment/types.ts';
import { MockError } from './mock-error.ts';

export function selectTeacherRelease(
    snapshots: PlanSnapshot[],
    releaseId?: string | null,
) {
    const published = snapshots.filter(
        (snap) =>
            snap.is_full &&
            ['OPEN_FOR_FEEDBACK', 'READY_TO_EXPORT', 'EXPORTED'].includes(
                snap.phase,
            ),
    );
    const byRevision = new Map<string, PlanSnapshot>();
    for (const snap of published)
        byRevision.set(`${snap.version_no}:${snap.revision_no}`, snap);
    const releases = [...byRevision.values()].sort(
        (a, b) => a.version_no - b.version_no || a.revision_no - b.revision_no,
    );
    const requested = releaseId
        ? published.find((snap) => snap.id === releaseId)
        : undefined;
    if (releaseId && !requested)
        throw new MockError(
            404,
            'RELEASE_NOT_FOUND',
            'Bản phát hành được chọn không tồn tại trong đợt này.',
        );
    const selected = requested
        ? byRevision.get(`${requested.version_no}:${requested.revision_no}`)!
        : (releases.at(-1) ?? null);
    return { releases, selected };
}

function projectTeacher(
    teacher: PlanSnapshotTeacherLoad,
    rows: PlanSnapshot['rows'],
): OverviewTeacherLoad {
    return {
        id: teacher.id,
        teacher_code: teacher.teacher_code,
        full_name: teacher.full_name,
        department_name: teacher.subjects.join(' · '),
        subjects: teacher.subjects,
        color_index: teacher.color_index,
        portrait_key:
            teacher.portrait_key === 'manager' ? 1 : teacher.portrait_key,
        fixed_periods: teacher.f,
        assigned_periods: teacher.a,
        converted_periods: teacher.c,
        reduction_periods: teacher.r,
        working_periods: teacher.w,
        quota_remaining: teacher.q,
        total_periods: teacher.t,
        base_norm: teacher.b,
        weekly_limit: teacher.weekly_limit,
        delta: teacher.delta,
        assignments: rows
            .filter((row) => row.teacher_id === teacher.id)
            .map((row) => ({
                id: row.demand_id,
                class_name: row.class_name,
                subject_name: row.subject_name,
                component_type: row.demand_type,
                periods: row.periods_per_week,
                locked: row.locked,
            })),
    };
}
export function teacherFromRelease(snapshot: PlanSnapshot, teacherId: number) {
    const teacher = snapshot.teachers.find((item) => item.id === teacherId);
    return teacher ? projectTeacher(teacher, snapshot.rows) : null;
}
export function unreleasedTeacher(teacher: WorkspaceTeacher | undefined) {
    if (!teacher) return null;
    // Identity/profile only. Never expose assignments from an unpublished draft.
    const total = teacher.fixed + teacher.converted + teacher.reduced;
    return projectTeacher(
        {
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            full_name: teacher.full_name,
            color_index: teacher.color_index,
            portrait_key: teacher.portrait_key,
            subjects: teacher.subjects.map((item) => item.name),
            weekly_limit: teacher.weekly_limit,
            f: teacher.fixed,
            a: 0,
            c: teacher.converted,
            r: teacher.reduced,
            w: total - teacher.reduced,
            q: Math.max(0, teacher.base_norm - teacher.reduced),
            t: total,
            b: teacher.base_norm,
            delta: total - teacher.base_norm,
        },
        [],
    );
}
