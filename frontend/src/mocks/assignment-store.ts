import type {
    AssignmentBatchLock,
    AssignmentChange,
    AssignmentFilters,
    AssignmentLock,
    AssignmentMutation,
    AssignmentPage,
    AssignmentRow,
    PlanConfiguration,
    PlanVersion,
    PlanWorkspace,
    RefreshPlanRequest,
    VersionContext,
    WorkloadPage,
    WorkspaceTeacher,
} from '../features/assignment/types.ts';
import type { RoundReadinessDto } from '../features/preparation/types.ts';
import type { Teacher } from '../features/teachers/types.ts';
import { preparationStore } from './preparation-store.ts';
import { MockError } from './mock-error.ts';
import { captureWorkspaceTeachers } from './fixtures/assignment.ts';

type Snapshot = {
    context_label: string;
    rows: AssignmentRow[];
    teachers: WorkspaceTeacher[];
    starts_on: string;
    ends_on: string;
};
type SavedVersion = Snapshot & { meta: PlanVersion };
type Audit = {
    version_id: number;
    action: string;
    reason: string;
    row_ids: number[];
    at: string;
};
let versions = new Map<number, SavedVersion>();
let current = new Map<number, number>();
let nextRow = 50001,
    nextVersion = 1101,
    nextSnapshot = 2101;
let initialized = false;
let setup = 'normal';
let conflictInjected = false;
let audit: Audit[] = [];
const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
function fail(status: number, code: string, message: string): never {
    throw new MockError(status, code, message);
}
function requireVersion(id: number) {
    const version = versions.get(id);
    if (!version)
        fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy phiên bản phương án.');
    return version;
}
function liveToken(round: number) {
    return (
        preparationStore.detailRound(round).source_revision_token ??
        `round-${round}`
    );
}
function context(version: SavedVersion): VersionContext {
    const meta = metadata(version);
    return {
        version_id: meta.version_id,
        revision_no: meta.revision_no,
        input_snapshot_id: meta.input_snapshot_id,
        source_revision_token: meta.source_revision_token,
        snapshot_fresh: meta.snapshot_fresh,
        current_version: meta.is_current,
    };
}
function metadata(version: SavedVersion): PlanVersion {
    const m = version.meta;
    return {
        ...m,
        current_version_id: current.get(m.round_id) ?? m.version_id,
        is_current: current.get(m.round_id) === m.version_id,
        live_source_revision_token: liveToken(m.round_id),
        snapshot_fresh: m.source_revision_token === liveToken(m.round_id),
        demand_count: version.rows.length,
        locked_count: version.rows.filter((row) => row.locked).length,
    };
}
function snapshot(
    roundId: number,
    teachers: Teacher[],
    rule: number,
): Snapshot {
    const round = preparationStore.detailRound(roundId);
    const semester = preparationStore.detailSemester(round.semester_id);
    const year = preparationStore.detailAcademicYear(semester.academic_year_id);
    const scopes = preparationStore.listScopes({
        round_id: roundId,
        limit: 100000,
    });
    const apps = preparationStore
        .listApplicabilities({ limit: 100000 })
        .filter(
            (app) =>
                app.status === 'APPLICABLE' &&
                scopes.some((scope) => scope.id === app.scope_id),
        );
    const subjects = preparationStore.listSubjects({ limit: 100000 });
    const classes = preparationStore.listClasses({ limit: 100000 });
    const eligiblePairs = new Set(
        apps.map(
            (app) =>
                `${app.class_id}:${scopes.find((scope) => scope.id === app.scope_id)!.subject_id}`,
        ),
    );
    const demands = preparationStore
        .listDemands({
            semester_id: semester.id,
            status: 'ACTIVE',
            limit: 100000,
        })
        .filter(
            (demand) =>
                demand.valid_from <= semester.ends_on &&
                demand.valid_to >= semester.starts_on &&
                eligiblePairs.has(`${demand.class_id}:${demand.subject_id}`),
        );
    return {
        context_label: `Học kỳ ${semester.semester_no === 1 ? 'I' : 'II'} · ${year.year_code.replace('-', '–')}`,
        starts_on: semester.starts_on,
        ends_on: semester.ends_on,
        teachers: captureWorkspaceTeachers(
            teachers,
            year.school_id,
            subjects,
            semester.starts_on,
            semester.ends_on,
            rule,
        ),
        rows: demands
            .sort((a, b) => a.id - b.id)
            .map((demand) => ({
                id: nextRow++,
                demand_id: demand.id,
                class_id: demand.class_id,
                class_name:
                    classes.find((row) => row.id === demand.class_id)
                        ?.class_code ?? `#${demand.class_id}`,
                subject_id: demand.subject_id,
                subject_name:
                    subjects.find((row) => row.id === demand.subject_id)
                        ?.name ?? `#${demand.subject_id}`,
                demand_type: demand.demand_type,
                periods_per_week: demand.periods_per_week,
                valid_from: demand.valid_from,
                valid_to: demand.valid_to,
                teacher_id: null,
                teacher_name: null,
                locked: false,
                locked_by: null,
                locked_at: null,
                lock_reason: null,
                unassigned_reason_code: 'NOT_ASSIGNED',
                unassigned_reason_text: null,
            })),
    };
}
function makeVersion(
    round: number,
    input: PlanConfiguration,
    teachers: Teacher[],
): SavedVersion {
    const data = snapshot(round, teachers, input.rule_set_version_id);
    const stamp = now(),
        id = nextVersion++;
    return {
        ...data,
        meta: {
            plan_id: 1000 + round,
            round_id: round,
            plan_code: `ROUND-${round}`,
            current_version_id: id,
            version_id: id,
            version_no: 1,
            source_version_id: null,
            status: 'DRAFT',
            revision_no: data.rows.length,
            is_current: true,
            input_snapshot_id: nextSnapshot++,
            snapshot_schema_version: 1,
            snapshot_content_hash: `mock-source-${id}-${liveToken(round)}`,
            source_revision_token: liveToken(round),
            live_source_revision_token: liveToken(round),
            snapshot_fresh: true,
            optimization_config_id: input.optimization_config_id,
            rule_set_version_id: input.rule_set_version_id,
            captured_at: stamp,
            created_by: 1,
            created_at: stamp,
            demand_count: data.rows.length,
            locked_count: 0,
        },
    };
}
function assigned(row: AssignmentRow, teacher: WorkspaceTeacher | undefined) {
    if (!teacher) return;
    row.teacher_id = teacher.id;
    row.teacher_name = teacher.full_name;
    row.unassigned_reason_code = null;
    row.unassigned_reason_text = null;
}
function initialize(teachers: Teacher[]) {
    if (initialized) return;
    initialized = true;
    if (setup === 'planEmpty') return;
    const old = makeVersion(
        1,
        { optimization_config_id: 1, rule_set_version_id: 1 },
        teachers,
    );
    old.meta.status = 'OPEN_FOR_FEEDBACK';
    versions.set(old.meta.version_id, old);
    const draft = makeVersion(
        1,
        { optimization_config_id: 1, rule_set_version_id: 1 },
        teachers,
    );
    draft.meta.version_no = 2;
    draft.meta.source_version_id = old.meta.version_id;
    draft.rows.forEach((row, index) => {
        if (index % 4 === 3) return;
        const candidates = draft.teachers.filter((teacher) =>
            teacher.subjects.some((subject) => subject.id === row.subject_id),
        );
        assigned(row, candidates[index % Math.max(1, candidates.length)]);
        if (row.teacher_id && index < 2) {
            row.locked = true;
            row.locked_by = 1;
            row.locked_at = draft.meta.created_at;
            row.lock_reason = 'Giữ phân công đã thống nhất';
        }
    });
    versions.set(draft.meta.version_id, draft);
    current.set(1, draft.meta.version_id);
    if (setup === 'planReadOnly') draft.meta.status = 'OPEN_FOR_FEEDBACK';
    if (setup === 'planStale' || setup === 'planLockConflict') {
        if (setup === 'planLockConflict' && draft.rows[0]) {
            const demand = preparationStore.detailDemand(
                draft.rows[0].demand_id,
            );
            const { id: _id, updated_at: _at, ...input } = demand;
            preparationStore.saveDemand(
                { ...input, periods_per_week: demand.periods_per_week + 1 },
                demand.id,
            );
        } else preparationStore.touchRoundSource(1);
    }
}
function assertDraft(version: SavedVersion, revision: number, fresh = true) {
    if (
        current.get(version.meta.round_id) !== version.meta.version_id ||
        version.meta.status !== 'DRAFT'
    )
        fail(409, 'CURRENT_DRAFT_REQUIRED', 'Chỉ sửa bản nháp hiện hành.');
    if (setup === 'planRevisionConflict' && !conflictInjected) {
        conflictInjected = true;
        const row = version.rows.find((item) => item.teacher_id !== null);
        if (row) {
            row.locked = !row.locked;
            row.locked_by = row.locked ? 1 : null;
            row.locked_at = row.locked ? now() : null;
            row.lock_reason = row.locked
                ? 'Thay đổi từ phiên làm việc khác'
                : null;
        }
        version.meta.revision_no++;
    }
    if (version.meta.revision_no !== revision)
        fail(409, 'REVISION_CONFLICT', 'Revision không còn khớp.');
    if (fresh && !metadata(version).snapshot_fresh)
        fail(409, 'STALE_INPUT', 'Nguồn đầu vào đã thay đổi.');
}
function eligible(
    teacher: WorkspaceTeacher | undefined,
    row: AssignmentRow,
): teacher is WorkspaceTeacher {
    return Boolean(
        teacher &&
        teacher.subjects.some((subject) => subject.id === row.subject_id) &&
        teacher.valid_from <= row.valid_from &&
        teacher.valid_to >= row.valid_to,
    );
}
function assertLoads(version: SavedVersion, rows: AssignmentRow[]) {
    for (const teacher of version.teachers) {
        const total = rows
            .filter((row) => row.teacher_id === teacher.id)
            .reduce(
                (sum, row) => sum + row.periods_per_week,
                teacher.fixed + teacher.converted + teacher.reduced,
            );
        if (Math.round(total * 100) > Math.round(teacher.weekly_limit * 100))
            fail(
                422,
                'ASSIGNMENT_HARD_VIOLATION',
                `${teacher.full_name} vượt trần tải tuần.`,
            );
    }
}
function log(
    version: SavedVersion,
    action: string,
    reason: string,
    rows: AssignmentRow[],
) {
    audit.push({
        version_id: version.meta.version_id,
        action,
        reason,
        row_ids: rows.map((row) => row.id),
        at: now(),
    });
}
function configuration(round: number, input: PlanConfiguration) {
    const result = preparationStore.evaluateReadiness(round, input, 'normal');
    // Plan source capture requires a supported, confirmed config/rule pair; coverage may still be incomplete.
    if (
        ![1, 2].includes(input.optimization_config_id) ||
        ![1, 2].includes(input.rule_set_version_id) ||
        result.issues.some(
            (issue) =>
                issue.code.includes('CONFIGURATION') ||
                issue.code.includes('RULE_SET'),
        )
    )
        fail(
            422,
            'CONFIGURATION_NOT_CONFIRMED',
            'Cấu hình và bộ quy tắc chưa phù hợp học kỳ.',
        );
}

export const assignmentStore = {
    reset() {
        versions = new Map();
        current = new Map();
        nextRow = 50001;
        nextVersion = 1101;
        nextSnapshot = 2101;
        initialized = false;
        setup = 'normal';
        conflictInjected = false;
        audit = [];
    },
    configureScenario(scenario: string) {
        if (!scenario.startsWith('plan')) {
            if (scenario === 'normal' && setup !== 'normal') this.reset();
            return;
        }
        this.reset();
        setup = scenario;
    },
    ensure(teachers: Teacher[]) {
        initialize(teachers);
    },
    audit() {
        return clone(audit);
    },
    preview(roundCode: string) {
        const version = [...versions.values()].find(
            (item) =>
                preparationStore.detailRound(item.meta.round_id).round_code ===
                    roundCode &&
                current.get(item.meta.round_id) === item.meta.version_id,
        );
        return version
            ? clone({
                  ...version,
                  meta: metadata(version),
                  loads: this.workloads(
                      version.meta.version_id,
                      undefined,
                      2000,
                  ).items,
              })
            : null;
    },
    current(round: number): PlanVersion {
        preparationStore.detailRound(round);
        const id = current.get(round);
        if (!id) fail(404, 'RESOURCE_NOT_FOUND', 'Đợt chưa có phương án.');
        return clone(metadata(requireVersion(id)));
    },
    version(id: number) {
        return clone(metadata(requireVersion(id)));
    },
    create(round: number, input: PlanConfiguration, teachers: Teacher[]) {
        if (current.has(round))
            fail(409, 'PLAN_ALREADY_EXISTS', 'Đợt đã có phương án.');
        configuration(round, input);
        const version = makeVersion(round, input, teachers);
        versions.set(version.meta.version_id, version);
        current.set(round, version.meta.version_id);
        return clone(metadata(version));
    },
    rows(id: number, filters: AssignmentFilters = {}): AssignmentPage {
        const version = requireVersion(id);
        const rows = version.rows.filter(
            (row) =>
                (filters.teacher_id === undefined ||
                    row.teacher_id === filters.teacher_id) &&
                (filters.class_id === undefined ||
                    row.class_id === filters.class_id) &&
                (filters.demand_type === undefined ||
                    row.demand_type === filters.demand_type) &&
                (filters.is_locked === undefined ||
                    row.locked === filters.is_locked) &&
                (filters.unassigned === undefined ||
                    (row.teacher_id === null) === filters.unassigned) &&
                (!filters.valid_on ||
                    (row.valid_from <= filters.valid_on &&
                        row.valid_to >= filters.valid_on)),
        );
        const limit = filters.limit ?? 50,
            offset = filters.offset ?? 0;
        return clone({
            version: context(version),
            total: rows.length,
            limit,
            offset,
            items: rows.slice(offset, offset + limit),
        });
    },
    workspace(id: number): PlanWorkspace {
        const version = requireVersion(id);
        return clone({
            context_label: version.context_label,
            teachers: version.teachers,
            versions: [...versions.values()]
                .filter((item) => item.meta.plan_id === version.meta.plan_id)
                .map(metadata)
                .sort((a, b) => b.version_no - a.version_no),
            row_count: version.rows.length,
            assigned_count: version.rows.filter(
                (row) => row.teacher_id !== null,
            ).length,
            locked_count: version.rows.filter((row) => row.locked).length,
            starts_on: version.starts_on,
            ends_on: version.ends_on,
        });
    },
    workloads(
        id: number,
        teacherId?: number,
        limit = 50,
        offset = 0,
    ): WorkloadPage {
        const version = requireVersion(id);
        const items = version.teachers
            .map((teacher) => {
                const a =
                    Math.round(
                        version.rows
                            .filter((row) => row.teacher_id === teacher.id)
                            .reduce(
                                (sum, row) => sum + row.periods_per_week,
                                0,
                            ) * 100,
                    ) / 100;
                const t =
                    Math.round(
                        (a +
                            teacher.fixed +
                            teacher.converted +
                            teacher.reduced) *
                            100,
                    ) / 100;
                return {
                    teacher_id: teacher.id,
                    teacher_name: teacher.full_name,
                    b: teacher.base_norm,
                    f: teacher.fixed,
                    a,
                    c: teacher.converted,
                    r: teacher.reduced,
                    q:
                        teacher.base_norm -
                        teacher.fixed -
                        teacher.converted -
                        teacher.reduced,
                    w: t - teacher.reduced,
                    t,
                    delta_t: t - teacher.base_norm,
                    under: Math.max(0, teacher.base_norm - t),
                    over: Math.max(0, t - teacher.base_norm),
                    target_applicable: true,
                    checks: [
                        {
                            br_code: 'ANNUAL_WORKLOAD',
                            subject_type: 'TEACHER',
                            subject_ref: String(teacher.id),
                            calculation_period: 'ANNUAL',
                            result_status: 'INSUFFICIENT_DATA',
                            severity: 'WARNING',
                            missing_data: ['annual_workload', 'annual_limit'],
                            details: {
                                annual_workload: null,
                                annual_limit: null,
                            },
                            message:
                                'Mock chưa có nguồn tải năm; không suy diễn giá trị bằng 0.',
                        },
                    ],
                };
            })
            .filter(
                (item) =>
                    teacherId === undefined || item.teacher_id === teacherId,
            );
        return clone({
            version: context(version),
            total: items.length,
            limit,
            offset,
            items: items.slice(offset, offset + limit),
            coverage: {
                required: version.rows.length,
                assigned: version.rows.filter((row) => row.teacher_id !== null)
                    .length,
                unassigned: version.rows.filter(
                    (row) => row.teacher_id === null,
                ).length,
            },
            overall_status: 'INSUFFICIENT_DATA',
            warnings: [
                ...(!metadata(version).snapshot_fresh ? ['STALE_INPUT'] : []),
                'ANNUAL_WORKLOAD_MISSING',
            ],
        });
    },
    change(
        id: number,
        rowId: number,
        input: AssignmentChange,
    ): AssignmentMutation {
        const version = requireVersion(id);
        assertDraft(version, input.expected_revision);
        const existing = version.rows.find((row) => row.id === rowId);
        if (!existing)
            fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy dòng phân công.');
        if (existing.locked) fail(409, 'ASSIGNMENT_LOCKED', 'Dòng đã khóa.');
        const teacher = version.teachers.find(
            (item) => item.id === input.teacher_id,
        );
        if (input.teacher_id !== null && !eligible(teacher, existing))
            fail(422, 'ASSIGNMENT_INELIGIBLE', 'Giáo viên không đủ điều kiện.');
        const replacement: AssignmentRow = {
            ...existing,
            teacher_id: input.teacher_id,
            teacher_name: teacher?.full_name ?? null,
            unassigned_reason_code:
                input.teacher_id === null
                    ? input.unassigned_reason_code!
                    : null,
            unassigned_reason_text:
                input.teacher_id === null
                    ? input.unassigned_reason_text!
                    : null,
        };
        const proposed = version.rows.map((row) =>
            row.id === rowId ? replacement : row,
        );
        assertLoads(version, proposed);
        const changed =
            JSON.stringify(existing) !== JSON.stringify(replacement);
        if (changed) {
            version.rows = proposed;
            version.meta.revision_no++;
            log(version, 'change', input.change_reason, [replacement]);
        }
        return clone({
            version: context(version),
            matched_count: 1,
            changed_count: changed ? 1 : 0,
            items: [changed ? replacement : existing],
        });
    },
    lock(
        id: number,
        selector:
            | { rowId: number }
            | Omit<AssignmentBatchLock, 'expected_revision' | 'reason'>,
        locked: boolean,
        input: AssignmentLock,
    ): AssignmentMutation {
        const version = requireVersion(id);
        assertDraft(version, input.expected_revision, locked);
        let rows: AssignmentRow[];
        if ('rowId' in selector)
            rows = version.rows.filter((row) => row.id === selector.rowId);
        else if ('assignment_ids' in selector && selector.assignment_ids) {
            rows = version.rows.filter((row) =>
                selector.assignment_ids!.includes(row.id),
            );
            if (rows.length !== selector.assignment_ids.length)
                fail(404, 'RESOURCE_NOT_FOUND', 'Có dòng nằm ngoài phiên bản.');
        } else
            rows = version.rows.filter(
                (row) =>
                    row.class_id === selector.class_id &&
                    row.subject_id === selector.subject_id,
            );
        if (!rows.length)
            fail(404, 'RESOURCE_NOT_FOUND', 'Không tìm thấy nhóm phân công.');
        if (locked && rows.some((row) => row.teacher_id === null))
            fail(409, 'ASSIGNMENT_NOT_ASSIGNED', 'Nhóm có dòng chưa gán.');
        if (locked) {
            for (const row of rows)
                if (
                    !eligible(
                        version.teachers.find(
                            (teacher) => teacher.id === row.teacher_id,
                        ),
                        row,
                    )
                )
                    fail(409, 'LOCK_CONFLICT', 'Khóa không còn hợp lệ.');
            assertLoads(version, version.rows);
        }
        const changed = rows.filter((row) => row.locked !== locked),
            stamp = now();
        for (const row of changed) {
            row.locked = locked;
            row.locked_by = locked ? 1 : null;
            row.locked_at = locked ? stamp : null;
            row.lock_reason = locked ? input.reason : null;
        }
        if (changed.length) {
            version.meta.revision_no += changed.length;
            log(version, locked ? 'lock' : 'unlock', input.reason, changed);
        }
        return clone({
            version: context(version),
            matched_count: rows.length,
            changed_count: changed.length,
            items: rows,
        });
    },
    refresh(id: number, input: RefreshPlanRequest, teachers: Teacher[]) {
        const version = requireVersion(id);
        assertDraft(version, input.expected_revision, false);
        configuration(version.meta.round_id, input);
        const captured = snapshot(
            version.meta.round_id,
            teachers,
            input.rule_set_version_id,
        );
        for (const old of version.rows.filter((row) => row.locked)) {
            const fresh = captured.rows.find(
                (row) => row.demand_id === old.demand_id,
            );
            if (
                !fresh ||
                fresh.periods_per_week !== old.periods_per_week ||
                !eligible(
                    captured.teachers.find(
                        (teacher) => teacher.id === old.teacher_id,
                    ),
                    fresh,
                )
            )
                fail(
                    409,
                    'LOCK_CONFLICT',
                    'Nhu cầu hoặc điều kiện của khóa đã đổi.',
                );
        }
        let changed = version.rows.filter(
            (old) =>
                !captured.rows.some((row) => row.demand_id === old.demand_id),
        ).length;
        captured.rows = captured.rows.map((fresh) => {
            const old = version.rows.find(
                (row) => row.demand_id === fresh.demand_id,
            );
            if (!old) {
                changed++;
                return fresh;
            }
            const next = {
                ...fresh,
                id: old.id,
                teacher_id: old.teacher_id,
                teacher_name:
                    captured.teachers.find(
                        (teacher) => teacher.id === old.teacher_id,
                    )?.full_name ?? null,
                locked: old.locked,
                locked_by: old.locked_by,
                locked_at: old.locked_at,
                lock_reason: old.lock_reason,
                unassigned_reason_code: old.unassigned_reason_code,
                unassigned_reason_text: old.unassigned_reason_text,
            };
            if (
                old.teacher_id !== null &&
                !eligible(
                    captured.teachers.find(
                        (teacher) => teacher.id === old.teacher_id,
                    ),
                    fresh,
                )
            ) {
                next.teacher_id = null;
                next.teacher_name = null;
                next.unassigned_reason_code = 'INELIGIBLE_AFTER_REFRESH';
                next.unassigned_reason_text =
                    'Giáo viên không còn đủ điều kiện sau cập nhật nguồn.';
            }
            if (JSON.stringify(next) !== JSON.stringify(old)) changed++;
            return next;
        });
        version.rows = captured.rows;
        version.teachers = captured.teachers;
        version.starts_on = captured.starts_on;
        version.context_label = captured.context_label;
        version.ends_on = captured.ends_on;
        version.meta = {
            ...version.meta,
            revision_no: version.meta.revision_no + changed + 1,
            input_snapshot_id: nextSnapshot++,
            optimization_config_id: input.optimization_config_id,
            rule_set_version_id: input.rule_set_version_id,
            captured_at: now(),
            source_revision_token: liveToken(version.meta.round_id),
            snapshot_content_hash: `mock-source-${id}-${nextSnapshot}-${liveToken(version.meta.round_id)}`,
        };
        log(version, 'refresh', 'Làm mới snapshot nguồn', version.rows);
        return clone(metadata(version));
    },
    decorateReadiness(value: RoundReadinessDto): RoundReadinessDto {
        const id = current.get(value.round_id);
        if (!id)
            return !initialized
                ? value
                : {
                      ...value,
                      current_version_id: null,
                      revision_no: null,
                      coverage: {
                          ...value.coverage,
                          assigned: 0,
                          unassigned: Math.max(
                              0,
                              value.coverage.required_components -
                                  value.coverage.missing_demand,
                          ),
                      },
                  };
        const version = requireVersion(id),
            assignedCount = version.rows.filter(
                (row) => row.teacher_id !== null,
            ).length;
        const stale = !metadata(version).snapshot_fresh;
        return {
            ...value,
            current_version_id: id,
            revision_no: version.meta.revision_no,
            can_run_solver: !stale && value.can_run_solver,
            can_open_feedback: !stale && value.can_open_feedback,
            coverage: {
                ...value.coverage,
                assigned: assignedCount,
                unassigned: version.rows.length - assignedCount,
                missing_plan_row: Math.max(
                    0,
                    value.coverage.required_components - version.rows.length,
                ),
            },
            issues: [
                ...value.issues,
                ...(stale
                    ? [
                          {
                              code: 'STALE_INPUT',
                              severity: 'ERROR' as const,
                              category: 'SOURCE',
                              entity_type: 'plan_version',
                              entity_id: id,
                              related_id: null,
                              message: 'Snapshot phương án đã cũ.',
                              suggestion:
                                  'Làm mới snapshot trong không gian phân công.',
                          },
                      ]
                    : []),
            ],
        };
    },
};
