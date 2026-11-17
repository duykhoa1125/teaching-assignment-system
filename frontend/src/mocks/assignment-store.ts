import type {
    AssignmentBatchLock,
    AssignmentChange,
    AssignmentFilters,
    AssignmentLock,
    AssignmentMutation,
    AssignmentPage,
    AssignmentRow,
    OptimizationView,
    PlanConfiguration,
    PlanVersion,
    PlanWorkspace,
    RefreshPlanRequest,
    SolverRunDiffItem,
    SolverRunDto,
    SolverRunSummary,
    StartSolverRunRequest,
    ValidatePlanRequest,
    ValidationFinding,
    ValidationReport,
    ValidationStatus,
    VersionContext,
    WorkloadPage,
    WorkloadRow,
    WorkspaceTeacher,
} from '../features/assignment/types.ts';
import type {
    RoundReadinessDto,
    RequiredDemandComponent,
    ReadinessIssue,
} from '../features/preparation/types.ts';
import type { Teacher } from '../features/teachers/types.ts';
import { preparationStore } from './preparation-store.ts';
import { MockError } from './mock-error.ts';
import { readMockSection, writeMockSection } from './persistence.ts';
import { captureWorkspaceTeachers } from './fixtures/assignment.ts';
import { completeRoundDemands } from './fixtures/complete-round.ts';

type Snapshot = {
    required_components: RequiredDemandComponent[];
    preparation_issues: ReadinessIssue[];
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
type InternalSolverRun = {
    dto: SolverRunDto;
    polls: number;
    createdAtMs: number;
    configId: number;
    ruleSetId: number;
    baselineRows: AssignmentRow[];
    diffItems: SolverRunDiffItem[];
    scenarioOutcome: 'APPLIED' | 'STALE' | 'INFEASIBLE' | 'FAILED';
    holdActive?: boolean;
};
let versions = new Map<number, SavedVersion>();
let current = new Map<number, number>();
let solverRuns = new Map<number, InternalSolverRun>();
let validationReports = new Map<number, ValidationReport>();
let latestValidationByVersion = new Map<number, number>();
let nextRow = 50001,
    nextVersion = 1101,
    nextSnapshot = 2101,
    nextRunId = 9001,
    nextValidationId = 7001;
let initialized = false;
let setup = 'normal';
let conflictInjected = false;
let audit: Audit[] = [];
function saveStorage() {
    writeMockSection('assignment', {
        setup,
        nextRow,
        nextVersion,
        nextSnapshot,
        nextRunId,
        nextValidationId,
        conflictInjected,
        audit,
        versions: [...versions.entries()],
        current: [...current.entries()],
        solverRuns: [...solverRuns.entries()],
        validationReports: [...validationReports.entries()],
        latestValidationByVersion: [...latestValidationByVersion.entries()],
    });
}

function restoreStorage(): boolean {
    try {
        const parsed = readMockSection<{
            setup: string;
            nextRow: number;
            nextVersion: number;
            nextSnapshot: number;
            nextRunId: number;
            nextValidationId: number;
            conflictInjected: boolean;
            audit: Audit[];
            versions: [number, SavedVersion][];
            current: [number, number][];
            solverRuns: [number, InternalSolverRun][];
            validationReports: [number, ValidationReport][];
            latestValidationByVersion: [number, number][];
        }>('assignment');
        if (!parsed) return false;
        setup = parsed.setup;
        nextRow = parsed.nextRow;
        nextVersion = parsed.nextVersion;
        nextSnapshot = parsed.nextSnapshot;
        nextRunId = parsed.nextRunId;
        nextValidationId = parsed.nextValidationId;
        conflictInjected = parsed.conflictInjected;
        audit = parsed.audit;
        versions = new Map(parsed.versions);
        current = new Map(parsed.current);
        solverRuns = new Map(parsed.solverRuns);
        validationReports = new Map(parsed.validationReports);
        latestValidationByVersion = new Map(parsed.latestValidationByVersion);
        return true;
    } catch {
        return false;
    }
}

function clearStorage() {
    writeMockSection('assignment', undefined);
}

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
const round2 = (value: number) => Math.round(value * 100) / 100;
function fail(
    status: number,
    code: string,
    message: string,
    options?: {
        location?: string | null;
        details?: Record<string, unknown>;
    },
): never {
    throw new MockError(status, code, message, options);
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
    config: number,
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
        required_components: preparationStore
            .listRequiredComponents({ limit: 100000 })
            .filter(
                (req) =>
                    apps.some((app) => app.id === req.applicability_id) &&
                    req.valid_from <= semester.ends_on &&
                    req.valid_to >= semester.starts_on,
            ),
        preparation_issues: preparationStore.evaluateReadiness(
            roundId,
            { optimization_config_id: config, rule_set_version_id: rule },
            'normal',
        ).issues,
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
    const data = snapshot(
        round,
        teachers,
        input.rule_set_version_id,
        input.optimization_config_id,
    );
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
    if (restoreStorage()) return;
    if (setup === 'planEmpty') {
        saveStorage();
        return;
    }
    if (setup === 'validationPass') completeRoundDemands(1);
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
    if (setup === 'solverActiveRun') {
        const runId = nextRunId++;
        const config = configProfile(draft.meta.optimization_config_id);
        solverRuns.set(runId, {
            dto: {
                id: runId,
                version_id: draft.meta.version_id,
                base_revision: draft.meta.revision_no,
                requested_by: 1,
                status: 'RUNNING',
                queued_at: now(),
                execution_started_at: now(),
                finished_at: null,
                cancellation_requested_at: null,
                preparation_ms: 85,
                solve_ms: null,
                archive_write_ms: null,
                failure_code: null,
                input_hash: draft.meta.snapshot_content_hash,
                input_fresh: true,
                applied_revision_no: null,
                apply_ms: null,
                summary: {
                    contract_version: 1,
                    ortools_version: 'mock-heuristic/9.11',
                    random_seed: Number(config.seed),
                    num_workers: Number(config.workers),
                    total_budget_seconds: Number(config.total_seconds),
                    cp_sat_status: null,
                    termination_reason: null,
                    apply_outcome: null,
                    demo_only: true,
                    illustrative_workload_rules: true,
                    config_hash: `cfg-${draft.meta.optimization_config_id}`,
                    stages: [],
                    coverage: null,
                },
            },
            polls: 0,
            createdAtMs: Date.now(),
            configId: draft.meta.optimization_config_id,
            ruleSetId: draft.meta.rule_set_version_id,
            baselineRows: clone(draft.rows),
            diffItems: [],
            scenarioOutcome: 'APPLIED',
            holdActive: true,
        });
    }
    if (setup === 'validationPass') {
        const solved = runMockHeuristicSolver(
            draft,
            clone(draft.rows),
            draft.meta.optimization_config_id,
        );
        if (solved.candidateRows) {
            draft.rows = solved.candidateRows;
        }
        const report = createValidationReport(draft, 1);
        validationReports.set(report.id, report);
        latestValidationByVersion.set(draft.meta.version_id, report.id);
    }
    if (setup === 'validationViolation') {
        const report = createValidationReport(draft, 1);
        validationReports.set(report.id, report);
        latestValidationByVersion.set(draft.meta.version_id, report.id);
    }
    saveStorage();
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
    saveStorage();
}
function configProfile(configId: number): Record<string, unknown> {
    if (configId === 2) {
        return {
            coverage_mode: 'MAX_COVERAGE',
            deviation_basis: 'BASE_NORM',
            preserve_policy: 'REOPTIMIZE',
            load_weight: 120,
            experience_weight: 15,
            change_weight: 0,
            total_seconds: 45,
            stage_seconds: { Z: 12, L1: 12, M: 9, experience: 6, change: 6 },
            grade_weights: { '9': 3, '12': 4, other: 1 },
            workers: 4,
            seed: 202609,
        };
    }
    return {
        coverage_mode: 'MAX_COVERAGE',
        deviation_basis: 'BASE_NORM',
        preserve_policy: 'PENALIZE_CHANGES',
        load_weight: 100,
        experience_weight: 20,
        change_weight: 10,
        total_seconds: 30,
        stage_seconds: { Z: 8, L1: 8, M: 6, experience: 4, change: 4 },
        grade_weights: { '9': 3, '12': 4, other: 1 },
        workers: 4,
        seed: 202608,
    };
}

function computeWorkloadRows(
    version: SavedVersion,
    rows: AssignmentRow[] = version.rows,
): WorkloadRow[] {
    return version.teachers.map((teacher) => {
        const a = round2(
            rows
                .filter((row) => row.teacher_id === teacher.id)
                .reduce((sum, row) => sum + row.periods_per_week, 0),
        );
        const w = round2(a + teacher.fixed + teacher.converted);
        const t = round2(w + teacher.reduced);
        const q = Math.max(0, round2(teacher.base_norm - teacher.reduced));
        const deltaT = round2(t - teacher.base_norm);
        const exceedsWeekly =
            Math.round(t * 100) > Math.round(teacher.weekly_limit * 100);
        return {
            teacher_id: teacher.id,
            teacher_name: teacher.full_name,
            b: teacher.base_norm,
            f: teacher.fixed,
            a,
            c: teacher.converted,
            r: teacher.reduced,
            q,
            w,
            t,
            delta_t: deltaT,
            under: Math.max(0, round2(teacher.base_norm - t)),
            over: Math.max(0, round2(t - teacher.base_norm)),
            target_applicable: true,
            checks: [
                {
                    br_code: 'WEEKLY_WORKLOAD_CAP',
                    subject_type: 'TEACHER',
                    subject_ref: String(teacher.id),
                    calculation_period: 'WEEKLY',
                    result_status: exceedsWeekly ? 'VIOLATION' : 'PASS',
                    severity: exceedsWeekly ? 'ERROR' : 'INFO',
                    missing_data: [],
                    details: {
                        value: t,
                        limit: teacher.weekly_limit,
                        basis: 'T',
                        unit: 'PERIOD_PER_WEEK',
                        source: `Quy tắc v${version.meta.rule_set_version_id}`,
                    },
                    message: exceedsWeekly
                        ? `${teacher.full_name} vượt giới hạn tuần (${t} > ${teacher.weekly_limit} tiết).`
                        : `${teacher.full_name} đạt giới hạn tuần (${t} ≤ ${teacher.weekly_limit} tiết).`,
                },
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
    });
}

function planCoverage(version: Snapshot, rows = version.rows) {
    const missing = version.required_components.filter(
        (req) =>
            !rows.some(
                (row) =>
                    row.demand_id === req.demand_id &&
                    row.demand_type === req.demand_type &&
                    row.valid_from <=
                        (req.valid_from > version.starts_on
                            ? req.valid_from
                            : version.starts_on) &&
                    row.valid_to >=
                        (req.valid_to < version.ends_on
                            ? req.valid_to
                            : version.ends_on),
            ),
    );
    const assigned = rows.filter((row) => row.teacher_id !== null).length;
    return {
        required: rows.length + missing.length,
        assigned,
        unassigned: rows.length - assigned + missing.length,
        missing,
    };
}
function coverageCounts(version: Snapshot) {
    const { required, assigned, unassigned } = planCoverage(version);
    return { required, assigned, unassigned };
}
function evaluateValidationFindings(
    version: SavedVersion,
    rows: AssignmentRow[],
    workloads: WorkloadRow[],
): ValidationFinding[] {
    const meta = metadata(version);
    const findings: ValidationFinding[] = [];
    findings.push({
        br_code: 'SNAPSHOT_FRESHNESS',
        subject_type: 'VERSION',
        subject_ref: String(meta.version_id),
        calculation_period: 'WEEKLY',
        result_status: meta.snapshot_fresh ? 'PASS' : 'VIOLATION',
        severity: meta.snapshot_fresh ? 'INFO' : 'ERROR',
        missing_data: [],
        message: meta.snapshot_fresh
            ? 'Snapshot đầu vào khớp nguồn dữ liệu chuẩn bị hiện hành.'
            : 'Snapshot phương án đã cũ so với nguồn chuẩn bị hiện tại; cần làm mới trước khi chốt.',
        details: {
            source_revision_token: meta.source_revision_token,
            live_source_revision_token: meta.live_source_revision_token,
        },
    });
    const coverage = planCoverage(version, rows);
    findings.push({
        br_code: 'REQUIRED_COVERAGE',
        subject_type: 'VERSION',
        subject_ref: String(meta.version_id),
        calculation_period: 'WEEKLY',
        result_status: coverage.unassigned === 0 ? 'PASS' : 'VIOLATION',
        severity: coverage.unassigned === 0 ? 'INFO' : 'ERROR',
        missing_data: [],
        message:
            coverage.unassigned === 0
                ? `Đã phân công đủ ${coverage.assigned}/${coverage.required} thành phần nhu cầu.`
                : `Còn ${coverage.unassigned}/${coverage.required} thành phần chưa có giáo viên phụ trách, gồm ${coverage.missing.length} thành phần chưa có dòng nhu cầu trong snapshot.`,
        details: {
            required: coverage.required,
            assigned: coverage.assigned,
            unassigned: coverage.unassigned,
            missing_component_ids: coverage.missing.map((item) => item.id),
        },
    });
    const sourceErrors = version.preparation_issues.filter(
        (issue) => issue.severity === 'ERROR',
    );
    findings.push({
        br_code: 'PREPARATION_READINESS',
        subject_type: 'VERSION',
        subject_ref: String(meta.version_id),
        calculation_period: 'WEEKLY',
        result_status: sourceErrors.length ? 'VIOLATION' : 'PASS',
        severity: sourceErrors.length ? 'ERROR' : 'INFO',
        missing_data: sourceErrors.map((issue) => issue.code),
        message: sourceErrors.length
            ? 'Snapshot còn thiếu hoặc chưa xác nhận dữ liệu nguồn bắt buộc.'
            : 'Dữ liệu nguồn bắt buộc đã được chuẩn bị đầy đủ.',
        details: { issues: sourceErrors },
    });
    const ineligibleRows = rows.filter((row) => {
        if (row.teacher_id === null) return false;
        const teacher = version.teachers.find((t) => t.id === row.teacher_id);
        return !eligible(teacher, row);
    });
    findings.push({
        br_code: 'ELIGIBILITY_AND_PERIODS',
        subject_type: 'VERSION',
        subject_ref: String(meta.version_id),
        calculation_period: 'WEEKLY',
        result_status: ineligibleRows.length === 0 ? 'PASS' : 'VIOLATION',
        severity: ineligibleRows.length === 0 ? 'INFO' : 'ERROR',
        missing_data: [],
        message:
            ineligibleRows.length === 0
                ? 'Toàn bộ phân công phù hợp chuyên môn và giai đoạn công tác.'
                : `Có ${ineligibleRows.length} dòng phân công không còn khớp điều kiện giảng dạy hoặc hiệu lực.`,
        details: {
            invalid_row_ids: ineligibleRows.map((row) => row.id),
        },
    });
    const capViolations = workloads.filter((row) =>
        row.checks.some(
            (check) =>
                check.calculation_period === 'WEEKLY' &&
                check.result_status === 'VIOLATION',
        ),
    );
    if (capViolations.length > 0) {
        for (const row of capViolations) {
            const check = row.checks.find(
                (item) => item.calculation_period === 'WEEKLY',
            )!;
            findings.push({
                br_code: 'WEEKLY_WORKLOAD_CAP',
                subject_type: 'TEACHER',
                subject_ref: row.teacher_name,
                calculation_period: 'WEEKLY',
                result_status: 'VIOLATION',
                severity: 'ERROR',
                missing_data: [],
                message: check.message,
                details: check.details,
            });
        }
    } else {
        findings.push({
            br_code: 'WEEKLY_WORKLOAD_CAP',
            subject_type: 'VERSION',
            subject_ref: String(meta.version_id),
            calculation_period: 'WEEKLY',
            result_status: 'PASS',
            severity: 'INFO',
            missing_data: [],
            message: `Tất cả ${workloads.length} giáo viên đều nằm trong giới hạn tiết/tuần của bộ quy tắc.`,
            details: {
                checked_teachers: workloads.length,
            },
        });
    }
    findings.push({
        br_code: 'ANNUAL_WORKLOAD',
        subject_type: 'VERSION',
        subject_ref: String(meta.version_id),
        calculation_period: 'ANNUAL',
        result_status: 'INSUFFICIENT_DATA',
        severity: 'WARNING',
        missing_data: ['annual_workload', 'annual_limit'],
        message:
            'Chưa đủ dữ liệu định mức và tải cả năm; không chặn mở đợt nếu kiểm tra tuần đạt.',
        details: {
            annual_workload: null,
            annual_limit: null,
        },
    });
    return findings;
}

function summarizeReportStatus(
    findings: ValidationFinding[],
): ValidationStatus {
    if (findings.some((item) => item.result_status === 'VIOLATION'))
        return 'VIOLATION';
    if (findings.some((item) => item.result_status === 'INSUFFICIENT_DATA'))
        return 'INSUFFICIENT_DATA';
    return 'PASS';
}

function createValidationReport(
    version: SavedVersion,
    actorId: number | null,
): ValidationReport {
    const meta = metadata(version);
    const workloads = computeWorkloadRows(version);
    const results = evaluateValidationFindings(
        version,
        version.rows,
        workloads,
    );
    const overallStatus = summarizeReportStatus(results);
    return {
        id: nextValidationId++,
        version_id: meta.version_id,
        revision_no: meta.revision_no,
        input_snapshot_id: meta.input_snapshot_id,
        source_revision_token: meta.source_revision_token,
        checked_at: now(),
        checked_by: actorId,
        overall_status: overallStatus,
        fresh: isValidationFresh(version, {
            version_id: meta.version_id,
            revision_no: meta.revision_no,
            input_snapshot_id: meta.input_snapshot_id,
        }),
        validator_version: 'tass-val-mock/1',
        results,
        workloads,
        summary: {
            contract_version: 1,
            illustrative_rules: true,
            finding_count: results.length,
            coverage: coverageCounts(version),
            warnings: results
                .filter((item) => item.result_status === 'INSUFFICIENT_DATA')
                .map((item) => item.br_code),
        },
    };
}

function isValidationFresh(
    version: SavedVersion,
    report: Pick<
        ValidationReport,
        'version_id' | 'revision_no' | 'input_snapshot_id'
    >,
): boolean {
    const meta = metadata(version);
    return (
        report.version_id === meta.version_id &&
        report.revision_no === meta.revision_no &&
        report.input_snapshot_id === meta.input_snapshot_id &&
        meta.snapshot_fresh
    );
}

function runMockHeuristicSolver(
    version: SavedVersion,
    baselineRows: AssignmentRow[],
    configId: number,
): {
    feasible: boolean;
    candidateRows: AssignmentRow[] | null;
    summary: SolverRunSummary;
    diffItems: SolverRunDiffItem[];
} {
    const cfg = configProfile(configId);
    const reoptimize = cfg.preserve_policy === 'REOPTIMIZE';
    const stageSeconds = (cfg.stage_seconds ?? {
        Z: 8,
        L1: 8,
        M: 6,
        experience: 4,
        change: 4,
    }) as Record<string, number>;
    const gradeWeights = (cfg.grade_weights ?? {
        '9': 3,
        '12': 4,
        other: 1,
    }) as Record<string, number>;
    const candidateRows = clone(baselineRows);

    // Check fixed locks feasibility first
    const teacherTotals = new Map<number, number>();
    for (const teacher of version.teachers) {
        teacherTotals.set(
            teacher.id,
            teacher.fixed + teacher.converted + teacher.reduced,
        );
    }
    for (const row of candidateRows) {
        if (!row.locked || row.teacher_id === null) continue;
        const teacher = version.teachers.find((t) => t.id === row.teacher_id);
        if (!eligible(teacher, row)) {
            return {
                feasible: false,
                candidateRows: null,
                diffItems: [],
                summary: buildInfeasibleSummary(cfg, stageSeconds),
            };
        }
        const nextTotal =
            (teacherTotals.get(teacher.id) ?? 0) + row.periods_per_week;
        if (
            Math.round(nextTotal * 100) > Math.round(teacher.weekly_limit * 100)
        ) {
            return {
                feasible: false,
                candidateRows: null,
                diffItems: [],
                summary: buildInfeasibleSummary(cfg, stageSeconds),
            };
        }
        teacherTotals.set(teacher.id, nextTotal);
    }

    // Clear unlocked assignments before reconstructing (or only unassigned if PENALIZE_CHANGES preserves compatible)
    for (const row of candidateRows) {
        if (!row.locked) {
            if (reoptimize) {
                row.teacher_id = null;
                row.teacher_name = null;
            } else if (row.teacher_id !== null) {
                const teacher = version.teachers.find(
                    (t) => t.id === row.teacher_id,
                );
                const nextTotal =
                    (teacherTotals.get(row.teacher_id) ?? 0) +
                    row.periods_per_week;
                if (
                    !eligible(teacher, row) ||
                    Math.round(nextTotal * 100) >
                        Math.round(teacher.weekly_limit * 100)
                ) {
                    row.teacher_id = null;
                    row.teacher_name = null;
                } else {
                    teacherTotals.set(row.teacher_id, nextTotal);
                }
            }
        }
    }

    const targets = candidateRows
        .filter((row) => !row.locked && row.teacher_id === null)
        .sort((a, b) => {
            const cA = version.teachers.filter((t) => eligible(t, a)).length;
            const cB = version.teachers.filter((t) => eligible(t, b)).length;
            if (cA !== cB) return cA - cB;
            return b.periods_per_week - a.periods_per_week;
        });

    for (const row of targets) {
        const baselineRow = baselineRows.find((b) => b.id === row.id);
        const candidates = version.teachers
            .filter((teacher) => {
                if (!eligible(teacher, row)) return false;
                const total =
                    (teacherTotals.get(teacher.id) ?? 0) + row.periods_per_week;
                return (
                    Math.round(total * 100) <=
                    Math.round(teacher.weekly_limit * 100)
                );
            })
            .sort((a, b) => {
                const loadA =
                    (teacherTotals.get(a.id) ?? 0) +
                    row.periods_per_week -
                    a.base_norm;
                const loadB =
                    (teacherTotals.get(b.id) ?? 0) +
                    row.periods_per_week -
                    b.base_norm;
                const absDiff = Math.abs(loadA) - Math.abs(loadB);
                if (Math.abs(absDiff) > 0.01) return absDiff;
                if (baselineRow?.teacher_id === a.id) return -1;
                if (baselineRow?.teacher_id === b.id) return 1;
                return a.id - b.id;
            });
        const picked = candidates[0];
        if (picked) {
            assigned(row, picked);
            teacherTotals.set(
                picked.id,
                (teacherTotals.get(picked.id) ?? 0) + row.periods_per_week,
            );
        } else {
            row.unassigned_reason_code = 'NO_ELIGIBLE_TEACHER_WITH_CAP';
            row.unassigned_reason_text =
                'Không còn giáo viên đủ điều kiện trong trần tải tuần.';
        }
    }

    const workloads = computeWorkloadRows(version, candidateRows);
    const z = candidateRows.filter((row) => row.teacher_id === null).length;
    const l1 = round2(
        workloads.reduce((sum, item) => sum + Math.abs(item.delta_t ?? 0), 0),
    );
    const m = round2(
        Math.max(0, ...workloads.map((item) => Math.abs(item.delta_t ?? 0))),
    );
    const expPenalty = candidateRows.reduce((sum, row) => {
        if (row.teacher_id === null) return sum;
        const grade = row.class_name.match(/^\d+/)?.[0] ?? 'other';
        const gw = gradeWeights[grade] ?? gradeWeights.other ?? 1;
        return sum + (row.teacher_id % 2 === 0 ? gw : 0);
    }, 0);
    const changes = candidateRows.filter((row) => {
        const before = baselineRows.find((b) => b.id === row.id);
        return before && before.teacher_id !== row.teacher_id;
    }).length;
    const vector = [
        z,
        Math.round(l1 * 100),
        Math.round(m * 100),
        expPenalty,
        changes,
    ];
    const assignedRows = candidateRows.filter((r) => r.teacher_id !== null);
    const totalPeriods = candidateRows.reduce(
        (sum, row) => sum + row.periods_per_week,
        0,
    );
    const assignedPeriods = assignedRows.reduce(
        (sum, row) => sum + row.periods_per_week,
        0,
    );
    const diffItems: SolverRunDiffItem[] = candidateRows
        .map((row) => {
            const before = baselineRows.find((b) => b.id === row.id)!;
            return {
                row_id: row.id,
                class_name: row.class_name,
                subject_name: row.subject_name,
                demand_type: row.demand_type,
                periods_per_week: row.periods_per_week,
                before_teacher_id: before.teacher_id,
                before_teacher_name: before.teacher_name,
                after_teacher_id: row.teacher_id,
                after_teacher_name: row.teacher_name,
                reason_code: row.unassigned_reason_code,
                reason_text: row.unassigned_reason_text,
            };
        })
        .filter(
            (item) =>
                item.before_teacher_id !== item.after_teacher_id ||
                item.after_teacher_id === null,
        );

    return {
        feasible: true,
        candidateRows,
        diffItems,
        summary: {
            contract_version: 1,
            ortools_version: 'mock-heuristic/9.11',
            random_seed: Number(cfg.seed),
            num_workers: Number(cfg.workers),
            total_budget_seconds: Number(cfg.total_seconds),
            cp_sat_status: 'FEASIBLE',
            termination_reason: 'MOCK_HEURISTIC_COMPLETE',
            apply_outcome: null,
            demo_only: true,
            illustrative_workload_rules: true,
            config_hash: `cfg-${configId}`,
            stages: (['Z', 'L1', 'M', 'experience', 'change'] as const).map(
                (stage, index) => ({
                    name: stage,
                    status: 'HEURISTIC',
                    elapsed_ms: 45 + index * 18,
                    stop_reason: 'VECTOR_ONLY_NO_STAGE_PROOF',
                    exactOptimalityProven: false,
                    gap_tolerance: stageSeconds[stage] ?? 0,
                    objective: vector[index] ?? 0,
                    best_bound: null,
                }),
            ),
            coverage: {
                optimality_proven: false,
                metrics: {
                    totalComponents: candidateRows.length,
                    assignedComponents: assignedRows.length,
                    unassignedComponents: z,
                    totalPeriods,
                    assignedPeriods,
                    missingPeriods: round2(totalPeriods - assignedPeriods),
                    totalGroups: new Set(
                        candidateRows.map(
                            (r) => `${r.class_id}:${r.subject_id}`,
                        ),
                    ).size,
                    completeGroups: new Set(
                        candidateRows
                            .filter((r) => r.teacher_id !== null)
                            .map((r) => `${r.class_id}:${r.subject_id}`),
                    ).size,
                    incompleteGroups: new Set(
                        candidateRows
                            .filter((r) => r.teacher_id === null)
                            .map((r) => `${r.class_id}:${r.subject_id}`),
                    ).size,
                    loadDeviation: l1,
                    maxLoadDeviation: m,
                    experiencePenalty: expPenalty,
                    changes,
                    addedDemands: 0,
                    removedDemands: 0,
                    coverageObjective: z,
                    softObjective: expPenalty + changes,
                    fullCoverageImpossibleProven: false,
                    objectiveVector: vector,
                },
            },
        },
    };
}

function buildInfeasibleSummary(
    cfg: Record<string, unknown>,
    stageSeconds: Record<string, number>,
): SolverRunSummary {
    return {
        contract_version: 1,
        ortools_version: 'mock-heuristic/9.11',
        random_seed: Number(cfg.seed),
        num_workers: Number(cfg.workers),
        total_budget_seconds: Number(cfg.total_seconds),
        cp_sat_status: 'INFEASIBLE',
        termination_reason: 'INFEASIBLE_HARD_CONSTRAINTS',
        apply_outcome: 'NO_CANDIDATE',
        demo_only: true,
        illustrative_workload_rules: true,
        config_hash: null,
        stages: (['Z', 'L1', 'M', 'experience', 'change'] as const).map(
            (stage) => ({
                name: stage,
                status: 'INFEASIBLE',
                elapsed_ms: 60,
                stop_reason: 'MODEL_INFEASIBLE',
                exactOptimalityProven: false,
                gap_tolerance: stageSeconds[stage] ?? 0,
                objective: null,
                best_bound: null,
            }),
        ),
        coverage: {
            optimality_proven: false,
        },
    };
}

function advanceSolverRun(internal: InternalSolverRun): SolverRunDto {
    const status = internal.dto.status;
    if (
        status === 'SUCCEEDED' ||
        status === 'COMPLETED' ||
        status === 'FAILED' ||
        status === 'CANCELLED'
    ) {
        return internal.dto;
    }
    internal.polls += 1;
    const elapsedMs = Date.now() - internal.createdAtMs;
    if (status === 'CANCEL_REQUESTED') {
        internal.holdActive = false;
        internal.dto = {
            ...internal.dto,
            status: 'CANCELLED',
            finished_at: now(),
            solve_ms: Math.max(80, elapsedMs),
            summary: {
                ...(internal.dto.summary ??
                    buildInfeasibleSummary(
                        configProfile(internal.configId),
                        {},
                    )),
                cp_sat_status: 'ABORTED',
                termination_reason: 'CANCELLED_BY_USER',
                apply_outcome: 'CANCELLED',
                stages: internal.dto.summary?.stages ?? [],
            },
        };
        return internal.dto;
    }
    if (internal.holdActive && status === 'RUNNING') {
        return internal.dto;
    }
    if (status === 'QUEUED') {
        internal.dto = {
            ...internal.dto,
            status: 'RUNNING',
            execution_started_at: now(),
            preparation_ms: 85,
        };
        if (internal.polls < 2 && elapsedMs < 250) {
            return internal.dto;
        }
    }
    const version = versions.get(internal.dto.version_id);
    if (!version) {
        internal.dto = {
            ...internal.dto,
            status: 'FAILED',
            finished_at: now(),
            failure_code: 'VERSION_MISSING',
        };
        return internal.dto;
    }

    if (internal.scenarioOutcome === 'FAILED') {
        internal.dto = {
            ...internal.dto,
            status: 'FAILED',
            finished_at: now(),
            solve_ms: 320,
            failure_code: 'SOLVER_INTERNAL_ERROR',
            summary: {
                ...(internal.dto.summary ??
                    buildInfeasibleSummary(
                        configProfile(internal.configId),
                        {},
                    )),
                cp_sat_status: 'UNKNOWN',
                termination_reason: 'SOLVER_INTERNAL_ERROR',
                apply_outcome: 'FAILED',
                stages: [],
            },
        };
        return internal.dto;
    }

    if (internal.scenarioOutcome === 'INFEASIBLE') {
        const cfg = configProfile(internal.configId);
        internal.dto = {
            ...internal.dto,
            status: 'COMPLETED',
            finished_at: now(),
            solve_ms: 290,
            summary: buildInfeasibleSummary(
                cfg,
                (cfg.stage_seconds ?? {}) as Record<string, number>,
            ),
        };
        return internal.dto;
    }

    const solved = runMockHeuristicSolver(
        version,
        internal.baselineRows,
        internal.configId,
    );
    internal.diffItems = solved.diffItems;
    if (!solved.feasible || !solved.candidateRows) {
        internal.dto = {
            ...internal.dto,
            status: 'COMPLETED',
            finished_at: now(),
            solve_ms: 280,
            summary: solved.summary,
        };
        return internal.dto;
    }

    const freshMeta = metadata(version);
    const isStale =
        internal.scenarioOutcome === 'STALE' ||
        version.meta.revision_no !== internal.dto.base_revision ||
        !freshMeta.snapshot_fresh ||
        current.get(version.meta.round_id) !== version.meta.version_id;
    const isNotDraft = version.meta.status !== 'DRAFT';

    if (isNotDraft || isStale) {
        internal.dto = {
            ...internal.dto,
            status: 'COMPLETED',
            finished_at: now(),
            solve_ms: 340,
            archive_write_ms: 20,
            input_fresh: freshMeta.snapshot_fresh,
            summary: {
                ...solved.summary,
                apply_outcome: isNotDraft ? 'NOT_DRAFT' : 'STALE',
            },
        };
        return internal.dto;
    }

    // Apply candidate cleanly to draft version
    const changedRows = solved.candidateRows.filter((nextRowItem) => {
        const currentRow = version.rows.find((r) => r.id === nextRowItem.id);
        return (
            currentRow &&
            (currentRow.teacher_id !== nextRowItem.teacher_id ||
                currentRow.unassigned_reason_code !==
                    nextRowItem.unassigned_reason_code)
        );
    });
    if (changedRows.length > 0) {
        version.rows = clone(solved.candidateRows);
        version.meta.revision_no += 1;
        log(
            version,
            'solver_apply',
            `Áp dụng đề xuất solver #${internal.dto.id}`,
            changedRows,
        );
    }
    const postReport = createValidationReport(
        version,
        internal.dto.requested_by,
    );
    validationReports.set(postReport.id, postReport);
    latestValidationByVersion.set(version.meta.version_id, postReport.id);

    internal.dto = {
        ...internal.dto,
        status: 'SUCCEEDED',
        finished_at: now(),
        solve_ms: 360,
        archive_write_ms: 28,
        applied_revision_no: version.meta.revision_no,
        apply_ms: 22,
        summary: {
            ...solved.summary,
            apply_outcome: 'APPLIED',
            post_validation_status: postReport.overall_status,
            applied_revision_no: version.meta.revision_no,
            apply_ms: 22,
        },
    };
    return internal.dto;
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
        solverRuns = new Map();
        validationReports = new Map();
        latestValidationByVersion = new Map();
        nextRow = 50001;
        nextVersion = 1101;
        nextSnapshot = 2101;
        nextRunId = 9001;
        nextValidationId = 7001;
        initialized = false;
        setup = 'normal';
        conflictInjected = false;
        audit = [];
        clearStorage();
    },
    configureScenario(scenario: string) {
        if (
            !scenario.startsWith('plan') &&
            !scenario.startsWith('solver') &&
            !scenario.startsWith('validation')
        ) {
            if (scenario === 'normal' && setup !== 'normal') this.reset();
            return;
        }
        this.reset();
        setup = scenario;
    },
    ensure(teachers: Teacher[]) {
        initialize(teachers);
    },
    audit(versionId?: number) {
        const list =
            versionId === undefined
                ? audit
                : audit.filter((entry) => entry.version_id === versionId);
        return clone(list);
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
        saveStorage();
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
        const runs = [...solverRuns.values()]
            .filter((item) => item.dto.version_id === id)
            .sort((a, b) => b.dto.id - a.dto.id);
        const diffs: Record<number, SolverRunDiffItem[]> = {};
        for (const item of runs) {
            if (item.diffItems.length) diffs[item.dto.id] = item.diffItems;
        }
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
            solver_runs: runs.map((item) => item.dto),
            solver_diffs: diffs,
        });
    },
    workloads(
        id: number,
        teacherId?: number,
        limit = 50,
        offset = 0,
    ): WorkloadPage {
        const version = requireVersion(id);
        const allItems = computeWorkloadRows(version);
        const filtered = allItems.filter(
            (item) => teacherId === undefined || item.teacher_id === teacherId,
        );
        const hasWeeklyViolation = allItems.some((row) =>
            row.checks.some(
                (check) =>
                    check.calculation_period === 'WEEKLY' &&
                    check.result_status === 'VIOLATION',
            ),
        );
        return clone({
            version: context(version),
            total: filtered.length,
            limit,
            offset,
            items: filtered.slice(offset, offset + limit),
            coverage: coverageCounts(version),
            overall_status: hasWeeklyViolation
                ? 'VIOLATION'
                : 'INSUFFICIENT_DATA',
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
            input.optimization_config_id,
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
        version.required_components = captured.required_components;
        version.preparation_issues = captured.preparation_issues;
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
    startSolverRun(id: number, input: StartSolverRunRequest): SolverRunDto {
        const version = requireVersion(id);
        if (setup === 'solverQueueFull') {
            fail(
                503,
                'SOLVER_QUEUE_FULL',
                'Hàng đợi solver đang đầy; thử lại sau ít phút.',
            );
        }
        const existingActive = [...solverRuns.values()].find(
            (item) =>
                item.dto.version_id === id &&
                (item.dto.status === 'QUEUED' ||
                    item.dto.status === 'RUNNING' ||
                    item.dto.status === 'CANCEL_REQUESTED'),
        );
        if (existingActive) {
            fail(
                409,
                'SOLVER_RUN_ACTIVE',
                'Phiên bản đang có lượt sinh đề xuất hoạt động.',
                {
                    location: `/api/solver-runs/${existingActive.dto.id}`,
                    details: { solver_run_id: existingActive.dto.id },
                },
            );
        }
        assertDraft(version, input.expected_revision, true);
        configuration(version.meta.round_id, {
            optimization_config_id: input.optimization_config_id,
            rule_set_version_id: input.rule_set_version_id,
        });
        const runId = nextRunId++;
        const cfg = configProfile(input.optimization_config_id);
        const outcome: InternalSolverRun['scenarioOutcome'] =
            setup === 'solverStale'
                ? 'STALE'
                : setup === 'solverInfeasible'
                  ? 'INFEASIBLE'
                  : setup === 'solverFailed'
                    ? 'FAILED'
                    : 'APPLIED';
        const dto: SolverRunDto = {
            id: runId,
            version_id: id,
            base_revision: version.meta.revision_no,
            requested_by: 1,
            status: 'QUEUED',
            queued_at: now(),
            execution_started_at: null,
            finished_at: null,
            cancellation_requested_at: null,
            preparation_ms: null,
            solve_ms: null,
            archive_write_ms: null,
            failure_code: null,
            input_hash: metadata(version).snapshot_content_hash,
            input_fresh: true,
            applied_revision_no: null,
            apply_ms: null,
            summary: {
                contract_version: 1,
                ortools_version: 'mock-heuristic/9.11',
                random_seed: Number(cfg.seed),
                num_workers: Number(cfg.workers),
                total_budget_seconds: Number(cfg.total_seconds),
                cp_sat_status: null,
                termination_reason: null,
                apply_outcome: null,
                demo_only: true,
                illustrative_workload_rules: true,
                config_hash: `cfg-${input.optimization_config_id}`,
                stages: [],
                coverage: null,
            },
        };
        solverRuns.set(runId, {
            dto,
            polls: 0,
            createdAtMs: Date.now(),
            configId: input.optimization_config_id,
            ruleSetId: input.rule_set_version_id,
            baselineRows: clone(version.rows),
            diffItems: [],
            scenarioOutcome: outcome,
        });
        log(
            version,
            'solver_submit',
            `Gửi lượt sinh đề xuất #${runId} (cấu hình #${input.optimization_config_id})`,
            [],
        );
        return clone(dto);
    },
    solverRun(runId: number): SolverRunDto {
        const internal = solverRuns.get(runId);
        if (!internal) {
            fail(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy lượt sinh đề xuất.',
            );
        }
        const next = advanceSolverRun(internal);
        saveStorage();
        return clone(next);
    },
    cancelSolverRun(runId: number): SolverRunDto {
        const internal = solverRuns.get(runId);
        if (!internal) {
            fail(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy lượt sinh đề xuất.',
            );
        }
        const status = internal.dto.status;
        if (
            status === 'SUCCEEDED' ||
            status === 'COMPLETED' ||
            status === 'FAILED' ||
            status === 'CANCELLED'
        ) {
            return clone(internal.dto);
        }
        if (status === 'QUEUED') {
            internal.dto = {
                ...internal.dto,
                status: 'CANCELLED',
                cancellation_requested_at: now(),
                finished_at: now(),
                summary: {
                    ...(internal.dto.summary ??
                        buildInfeasibleSummary(
                            configProfile(internal.configId),
                            {},
                        )),
                    cp_sat_status: 'ABORTED',
                    termination_reason: 'CANCELLED_BEFORE_EXECUTION',
                    apply_outcome: 'CANCELLED',
                },
            };
        } else {
            internal.dto = {
                ...internal.dto,
                status: 'CANCEL_REQUESTED',
                cancellation_requested_at:
                    internal.dto.cancellation_requested_at ?? now(),
            };
        }
        saveStorage();
        return clone(internal.dto);
    },
    optimization(id: number): OptimizationView {
        const version = requireVersion(id);
        const runsForVersion = [...solverRuns.values()]
            .filter((item) => item.dto.version_id === id)
            .sort((a, b) => b.dto.id - a.dto.id);
        const appliedRun = runsForVersion.find(
            (item) => item.dto.summary?.apply_outcome === 'APPLIED',
        );
        const picked = appliedRun ?? runsForVersion[0] ?? null;
        const runDto = picked ? clone(picked.dto) : null;
        const appliedAndCurrent = Boolean(
            runDto &&
            runDto.summary?.apply_outcome === 'APPLIED' &&
            runDto.applied_revision_no === version.meta.revision_no &&
            metadata(version).snapshot_fresh,
        );
        const objectiveVector =
            runDto?.summary?.coverage?.metrics?.objectiveVector ?? null;
        const warnings: string[] = [];
        if (!runDto) warnings.push('NO_SOLVER_RUN');
        else if (!appliedAndCurrent)
            warnings.push('OPTIMIZATION_STALE_OR_NOT_APPLIED');
        return clone({
            version: context(version),
            latest_run_id: runDto?.id ?? null,
            run: runDto,
            matches_version: appliedAndCurrent,
            configuration: configProfile(
                picked?.configId ?? version.meta.optimization_config_id,
            ),
            objective_vector: objectiveVector,
            warnings,
        });
    },
    runValidation(id: number, input: ValidatePlanRequest): ValidationReport {
        const version = requireVersion(id);
        if (version.meta.revision_no !== input.expected_revision) {
            fail(409, 'REVISION_CONFLICT', 'Revision phương án đã thay đổi.');
        }
        const report = createValidationReport(version, 1);
        validationReports.set(report.id, report);
        latestValidationByVersion.set(id, report.id);
        log(
            version,
            'validate',
            `Kiểm tra phương án (${report.overall_status})`,
            [],
        );
        return clone(report);
    },
    validation(id: number, validationRunId?: number | null): ValidationReport {
        const version = requireVersion(id);
        const targetId =
            validationRunId ?? latestValidationByVersion.get(id) ?? null;
        if (!targetId) {
            fail(
                404,
                'VALIDATION_REPORT_NOT_FOUND',
                'Phiên bản chưa có báo cáo kiểm tra phương án.',
            );
        }
        const report = validationReports.get(targetId);
        if (!report || report.version_id !== id) {
            fail(
                404,
                'VALIDATION_REPORT_NOT_FOUND',
                'Không tìm thấy báo cáo kiểm tra phương án cho phiên bản này.',
            );
        }
        return clone({
            ...report,
            fresh: isValidationFresh(version, report),
        });
    },
    latestValidation(id: number): ValidationReport | null {
        const version = versions.get(id);
        const reportId = latestValidationByVersion.get(id);
        if (!version || !reportId) return null;
        const report = validationReports.get(reportId);
        if (!report) return null;
        return clone({
            ...report,
            fresh: isValidationFresh(version, report),
        });
    },
    latestSolverRun(id: number): SolverRunDto | null {
        const latest = [...solverRuns.values()]
            .filter((item) => item.dto.version_id === id)
            .sort((a, b) => b.dto.id - a.dto.id)[0];
        return latest ? clone(latest.dto) : null;
    },
    setRoundStatus(roundId: number, nextStatus: string): PlanVersion | null {
        const versionId = current.get(roundId);
        if (!versionId) return null;
        const version = requireVersion(versionId);
        version.meta.status = nextStatus;
        log(
            version,
            'lifecycle',
            `Chuyển trạng thái phương án sang ${nextStatus}`,
            [],
        );
        saveStorage();
        return clone(metadata(version));
    },
    createNextDraftFromRound(
        roundId: number,
        rowsOverride?: Array<{
            demand_id: number;
            teacher_id: number | null;
            teacher_name: string | null;
            locked: boolean;
        }>,
    ): { previous_version_no: number; version: PlanVersion } | null {
        const prevId = current.get(roundId);
        if (!prevId) return null;
        const prev = requireVersion(prevId);
        const nextMeta: PlanVersion = {
            ...clone(prev.meta),
            version_id: nextVersion++,
            version_no: prev.meta.version_no + 1,
            source_version_id: prev.meta.version_id,
            status: 'DRAFT',
            revision_no: prev.meta.revision_no + 1,
            is_current: true,
            created_at: now(),
        };
        const nextRows = clone(prev.rows);
        if (rowsOverride) {
            const overrideByDemand = new Map(
                rowsOverride.map((item) => [item.demand_id, item]),
            );
            for (const row of nextRows) {
                const match = overrideByDemand.get(row.demand_id);
                if (!match) continue;
                row.teacher_id = match.teacher_id;
                row.teacher_name = match.teacher_name;
                row.locked = match.locked;
                row.unassigned_reason_code =
                    match.teacher_id === null ? 'NOT_ASSIGNED' : null;
                row.unassigned_reason_text =
                    match.teacher_id === null
                        ? 'Chưa phân công giáo viên'
                        : null;
            }
        }
        const next: SavedVersion = {
            ...clone(prev),
            meta: nextMeta,
            rows: nextRows,
        };
        versions.set(nextMeta.version_id, next);
        current.set(roundId, nextMeta.version_id);
        log(
            next,
            'new_version',
            `Tạo bản nháp V${String(nextMeta.version_no).padStart(2, '0')} kế thừa từ V${String(prev.meta.version_no).padStart(2, '0')}`,
            [],
        );
        saveStorage();
        return {
            previous_version_no: prev.meta.version_no,
            version: clone(metadata(next)),
        };
    },
};
