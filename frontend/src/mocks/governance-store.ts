import type {
    AliasRecord,
    ExportDocumentRecord,
    FeedbackDecision,
    FeedbackItem,
    GovernanceAuditRecord,
    GovernanceOverviewResponse,
    PlanLifecyclePhase,
    PlanSnapshot,
    RuleRecord,
    SaveAliasRequest,
    SaveRuleRequest,
    SaveSourceRequest,
    SourceEvidenceRecord,
    SourcesBundleResponse,
    TeacherFeedbackSubmitRequest,
} from '../features/governance/types.ts';
import {
    canCompletePlanReady,
    validateAliasDraft,
    validateRuleDraft,
    validateSourceDraft,
} from '../features/governance/model.ts';
import { normalizeSubjectSearch } from '../features/catalogs/subject-visual.ts';
import type { Teacher } from '../features/teachers/types.ts';
import { assignmentStore } from './assignment-store.ts';
import { MockError } from './mock-error.ts';
import { preparationStore } from './preparation-store.ts';
import { demoAccounts } from './fixtures/accounts.ts';
import {
    CONTEXT_OVERVIEW_CONFIG,
    readTeacherPortalOverview,
} from './fixtures/overview.ts';

type ContextGovernanceState = {
    phase: PlanLifecyclePhase;
    sourceVersionNo: number | null;
    feedbackDueAt: string | null;
    noReopenReason: string;
    feedback: FeedbackItem[];
    snapshots: PlanSnapshot[];
    documents: ExportDocumentRecord[];
};

const STORAGE_KEY = 'tass-mock-governance-v1';

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

let nextFeedbackId = 4;
let nextSnapshotSeq = 2;
let nextDocSeq = 1;
let nextRuleSeq = 1;
let nextSourceSeq = 1;
let nextAliasSeq = 1;
let nextAuditSeq = 1;

function browserStorage(): Storage | null {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return null;
    }
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

function seedRules(): RuleRecord[] {
    return [
        {
            id: 'rule-base-thpt',
            code: 'B-THPT',
            name: 'Định mức hồ sơ THPT',
            expression: 'B = 17 tiết/tuần',
            source: 'Bộ dữ liệu minh họa E3 · report.tex',
            clause: 'BR-04',
            version: 'RULE_THPT_2026_V1',
            from: '2026-08-01',
            to: '2027-07-31',
            audience: 'Giáo viên THPT',
            value: 17,
        },
        {
            id: 'rule-base-thcs',
            code: 'B-THCS',
            name: 'Định mức hồ sơ THCS',
            expression: 'B = 19 tiết/tuần',
            source: 'Bộ dữ liệu minh họa · cần xác nhận khi tích hợp',
            clause: 'BR-04',
            version: 'RULE_THPT_2026_V1',
            from: '2026-08-01',
            to: '2027-07-31',
            audience: 'Giáo viên THCS',
            value: 19,
        },
        {
            id: 'rule-duty',
            code: 'R-DUTY',
            name: 'Nhiệm vụ trong dữ liệu mẫu',
            expression: 'GVCN 4 · TTCM 3 · tổ phó 1',
            source: 'report.tex · ví dụ tải công tác',
            clause: 'BR-16',
            version: 'RULE_THPT_2026_V1',
            from: '2026-08-01',
            to: '2027-07-31',
            audience: 'Theo hồ sơ nhiệm vụ',
            value: 4,
        },
        {
            id: 'rule-weekly',
            code: 'LIMIT-T',
            name: 'Giới hạn tuần của demo',
            expression: 'T = F + A + C + R ≤ giới hạn theo hồ sơ',
            source: 'Giả định của bản demo, không thay quy định pháp lý',
            clause: 'BR-06',
            version: 'RULE_THPT_2026_V1',
            from: '2026-08-01',
            to: '2027-07-31',
            audience: 'Giáo viên có dữ liệu tuần đầy đủ',
            value: 24,
        },
    ];
}

function seedSources(): SourceEvidenceRecord[] {
    return [
        {
            id: 'source-legacy',
            file: 'TASS Studio · dữ liệu mẫu',
            sheet: 'Học kỳ I/II',
            cell: 'GV001…GV006; 9 nhu cầu',
            raw: 'Dữ liệu giao diện đã có trước khi chuyển chuẩn API',
            canonical: 'Giữ nguyên ID trường, giáo viên, lớp, môn và nhu cầu',
            status: 'CONFIRMED',
            confirmed_by: 'Chuyển đổi dữ liệu demo',
            confirmed_at: '2026-08-10T08:00:00Z',
            evidence:
                'Nguồn minh họa dùng cho FE-02–FE-08; không thay hồ sơ nhân sự thật.',
        },
    ];
}

function createInitialContexts(): Record<string, ContextGovernanceState> {
    return {
        hk1: {
            phase: 'DRAFT',
            sourceVersionNo: 1,
            feedbackDueAt: '2026-11-15T17:00',
            noReopenReason: '',
            feedback: [
                {
                    id: 1,
                    context_id: 'hk1',
                    version_no: 1,
                    round_id: 1,
                    round_code: 'PC-01',
                    teacher_id: 1,
                    teacher_name: 'Nguyễn Minh Anh',
                    teacher_code: 'GV001',
                    portrait_key: 1,
                    color_index: 0,
                    type: 'ASSIGNMENT',
                    title: 'Rà soát tải giảng dạy khối 10–11',
                    text: 'Tôi mong muốn cân đối lại số tiết Toán giữa các lớp 10A1 và 11A1 để phù hợp thời lượng chuyên môn.',
                    demand_id: 1,
                    subject: 'Toán',
                    desired_total: null,
                    source_id: 'V1 · dữ liệu trước nâng cấp',
                    source_revision: 3,
                    status: 'pending',
                    decision: null,
                    result: '',
                    resolved_by: null,
                    resolved_at: null,
                    result_version: null,
                    created_at: '2026-11-09T08:20:00Z',
                    created_label: '09/11 · 08:20',
                },
                {
                    id: 2,
                    context_id: 'hk1',
                    version_no: 1,
                    round_id: 1,
                    round_code: 'PC-01',
                    teacher_id: 102,
                    teacher_name: 'Trần Thu Hà',
                    teacher_code: 'GV002',
                    portrait_key: 2,
                    color_index: 1,
                    type: 'REQUEST_SUBJECT_TOTAL',
                    title: 'Đề nghị nhận thêm tiết Ngữ văn',
                    text: 'Tôi có thể nhận tổng cộng 15 tiết/tuần môn Ngữ văn nếu còn nhu cầu phù hợp trong học kỳ.',
                    demand_id: null,
                    subject: 'Ngữ văn',
                    desired_total: 15,
                    source_id: 'V1 · dữ liệu trước nâng cấp',
                    source_revision: 3,
                    status: 'pending',
                    decision: null,
                    result: '',
                    resolved_by: null,
                    resolved_at: null,
                    result_version: null,
                    created_at: '2026-11-08T16:45:00Z',
                    created_label: '08/11 · 16:45',
                },
                {
                    id: 3,
                    context_id: 'hk1',
                    version_no: 1,
                    round_id: 1,
                    round_code: 'PC-01',
                    teacher_id: 103,
                    teacher_name: 'Lê Hoàng Nam',
                    teacher_code: 'GV003',
                    portrait_key: 3,
                    color_index: 2,
                    type: 'GENERAL',
                    title: 'Xác nhận chuyên môn giảng dạy',
                    text: 'Thông tin năng lực và lớp phân công hiện tại đã khớp kế hoạch.',
                    demand_id: null,
                    subject: null,
                    desired_total: null,
                    source_id: 'V1 · dữ liệu trước nâng cấp',
                    source_revision: 3,
                    status: 'resolved',
                    decision: 'ACCEPTED',
                    result: 'Đã ghi nhận và xác nhận thông tin chuyên môn.',
                    resolved_by: 'Nguyễn Minh Khoa',
                    resolved_at: '2026-11-08T14:15:00Z',
                    result_version: 2,
                    created_at: '2026-11-08T10:30:00Z',
                    created_label: '08/11 · 10:30',
                },
            ],
            snapshots: [
                {
                    id: 'SNAP-HK1-V1',
                    context_id: 'hk1',
                    title: 'Lưu phương án trước điều chỉnh',
                    at: '2026-11-08T16:00:00Z',
                    by: 'Nguyễn Minh Khoa',
                    version_no: 1,
                    revision_no: 3,
                    phase: 'DRAFT',
                    round_code: 'PC-01',
                    context_title: 'Học kỳ I · 2026–2027',
                    academic_year: '2026–2027',
                    rule_version: 'RULE_THPT_2026_V1',
                    token: 'legacy-hk1-v1',
                    interval: { from: '2026-08-01', to: '2026-12-31' },
                    is_full: false,
                    teachers: [],
                    rows: [
                        {
                            id: 50001,
                            demand_id: 101,
                            class_name: '10A1',
                            subject_name: 'Toán',
                            demand_type: 'STANDARD',
                            periods_per_week: 4,
                            valid_from: '2026-08-01',
                            valid_to: '2026-12-31',
                            teacher_id: 101,
                            teacher_name: 'Nguyễn Minh An',
                            locked: true,
                        },
                        {
                            id: 50002,
                            demand_id: 102,
                            class_name: '11A1',
                            subject_name: 'Toán',
                            demand_type: 'STANDARD',
                            periods_per_week: 4,
                            valid_from: '2026-08-01',
                            valid_to: '2026-12-31',
                            teacher_id: 101,
                            teacher_name: 'Nguyễn Minh An',
                            locked: false,
                        },
                    ],
                    annual_warning: null,
                },
            ],
            documents: [],
        },
        hk2: {
            phase: 'DRAFT',
            sourceVersionNo: null,
            feedbackDueAt: null,
            noReopenReason: '',
            feedback: [],
            snapshots: [],
            documents: [],
        },
        'thcs-demo': {
            phase: 'DRAFT',
            sourceVersionNo: null,
            feedbackDueAt: null,
            noReopenReason: '',
            feedback: [],
            snapshots: [],
            documents: [],
        },
    };
}

function seedAudit(): GovernanceAuditRecord[] {
    return [
        {
            id: 'gov-audit-0',
            at: '2026-11-08T16:00:00Z',
            actor: 'Nguyễn Minh Khoa',
            role: 'manager',
            action: 'Khởi tạo bản nháp V02 · PC-01',
            object: 'PC-01 · V02',
            result: 'SUCCESS',
            before: { version_no: 1, phase: 'FEEDBACK_PROCESSING' },
            after: { version_no: 2, phase: 'DRAFT' },
        },
    ];
}

let contextsState: Record<string, ContextGovernanceState> =
    createInitialContexts();
let rulesState: RuleRecord[] = seedRules();
let sourcesState: SourceEvidenceRecord[] = seedSources();
let aliasesState: AliasRecord[] = [];
let auditState: GovernanceAuditRecord[] = seedAudit();
let hydrated = false;

function saveStorage() {
    const store = browserStorage();
    if (!store) return;
    try {
        store.setItem(
            STORAGE_KEY,
            JSON.stringify({
                nextFeedbackId,
                nextSnapshotSeq,
                nextDocSeq,
                nextRuleSeq,
                nextSourceSeq,
                nextAliasSeq,
                nextAuditSeq,
                contextsState,
                rulesState,
                sourcesState,
                aliasesState,
                auditState,
            }),
        );
    } catch {
        // Ignore browser storage quota issues in mock mode
    }
}

function ensureHydrated() {
    if (hydrated) return;
    hydrated = true;
    const store = browserStorage();
    if (!store) return;
    try {
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
            nextFeedbackId: number;
            nextSnapshotSeq: number;
            nextDocSeq: number;
            nextRuleSeq: number;
            nextSourceSeq: number;
            nextAliasSeq: number;
            nextAuditSeq: number;
            contextsState: Record<string, ContextGovernanceState>;
            rulesState: RuleRecord[];
            sourcesState: SourceEvidenceRecord[];
            aliasesState: AliasRecord[];
            auditState: GovernanceAuditRecord[];
        };
        if (!parsed || typeof parsed !== 'object' || !parsed.contextsState) {
            return;
        }
        nextFeedbackId = parsed.nextFeedbackId;
        nextSnapshotSeq = parsed.nextSnapshotSeq;
        nextDocSeq = parsed.nextDocSeq;
        nextRuleSeq = parsed.nextRuleSeq;
        nextSourceSeq = parsed.nextSourceSeq;
        nextAliasSeq = parsed.nextAliasSeq;
        nextAuditSeq = parsed.nextAuditSeq;
        contextsState = parsed.contextsState;
        rulesState = parsed.rulesState;
        sourcesState = parsed.sourcesState;
        aliasesState = parsed.aliasesState;
        auditState = parsed.auditState;
    } catch {
        // Fallback to clean seed if storage corrupted
    }
}

function requireContextConfig(contextId: string) {
    const cfg = CONTEXT_OVERVIEW_CONFIG[contextId];
    if (!cfg || !contextsState[contextId]) {
        throw new MockError(
            400,
            'INVALID_QUERY',
            'Không tìm thấy không gian học kỳ được yêu cầu.',
        );
    }
    return {
        cfg,
        gov: contextsState[contextId]!,
    };
}

function recordAudit(
    actor: string,
    role: string,
    action: string,
    object: string,
    before: unknown,
    after: unknown,
) {
    auditState.unshift({
        id: `gov-audit-${nextAuditSeq++}`,
        at: now(),
        actor: actor || 'Nguyễn Minh Khoa',
        role,
        action,
        object,
        result: 'SUCCESS',
        before: clone(before),
        after: clone(after),
    });
}

function checkValidationStatus(versionId: number) {
    const report = assignmentStore.latestValidation(versionId);
    const fresh = Boolean(report?.fresh);
    const annualFinding = report?.results.find(
        (item) => item.calculation_period === 'ANNUAL',
    );
    const releasable = Boolean(
        report &&
        fresh &&
        !report.results.some(
            (item) =>
                item.result_status === 'VIOLATION' ||
                (item.result_status === 'INSUFFICIENT_DATA' &&
                    item.calculation_period !== 'ANNUAL'),
        ),
    );
    const annualWarning =
        annualFinding && annualFinding.result_status !== 'PASS'
            ? annualFinding.message
            : null;
    return {
        report,
        fresh,
        releasable,
        annualWarning,
        validationId: report ? `VAL-${report.id}` : null,
    };
}

function buildSnapshotFromPlan(
    contextId: string,
    title: string,
    actor: string,
    phaseOverride?: PlanLifecyclePhase,
): PlanSnapshot | null {
    const { cfg, gov } = requireContextConfig(contextId);
    const preview = assignmentStore.preview(cfg.roundCode);
    if (!preview) return null;
    const round = preparationStore.detailRound(preview.meta.round_id);
    const semester = preparationStore.detailSemester(round.semester_id);
    const year = preparationStore.detailAcademicYear(semester.academic_year_id);
    const val = checkValidationStatus(preview.meta.version_id);

    const loads = preview.teachers.map((teacher) => {
        const load = preview.loads.find(
            (item) => item.teacher_id === teacher.id,
        );
        return {
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            full_name: teacher.full_name,
            color_index: teacher.color_index,
            portrait_key: teacher.portrait_key,
            f: load?.f ?? teacher.fixed,
            a: load?.a ?? 0,
            c: load?.c ?? teacher.converted,
            r: load?.r ?? teacher.reduced,
            w: load?.w ?? 0,
            q: load?.q ?? Math.max(0, teacher.base_norm - teacher.reduced),
            t: load?.t ?? 0,
            b: load?.b ?? teacher.base_norm,
            delta: load?.delta_t ?? 0,
        };
    });

    return {
        id: `SNAP-${nextSnapshotSeq++}`,
        context_id: contextId,
        title,
        at: now(),
        by: actor || 'Nguyễn Minh Khoa',
        version_no: preview.meta.version_no,
        revision_no: preview.meta.revision_no,
        phase: phaseOverride ?? gov.phase,
        round_code: cfg.roundCode,
        context_title: cfg.label,
        academic_year: year.year_code.replace('-', '–'),
        rule_version: `RULE_${preview.meta.rule_set_version_id}`,
        token: preview.meta.source_revision_token,
        interval: {
            from: preview.starts_on,
            to: preview.ends_on,
        },
        is_full: true,
        teachers: loads,
        rows: preview.rows.map((row) => ({
            id: row.id,
            demand_id: row.demand_id,
            class_name: row.class_name,
            subject_name: row.subject_name,
            demand_type: row.demand_type,
            periods_per_week: row.periods_per_week,
            valid_from: row.valid_from,
            valid_to: row.valid_to,
            teacher_id: row.teacher_id,
            teacher_name: row.teacher_name,
            locked: row.locked,
        })),
        annual_warning: val.annualWarning,
    };
}

function buildOverviewResponse(
    contextId: string,
    teachers: Teacher[],
): GovernanceOverviewResponse {
    ensureHydrated();
    assignmentStore.ensure(teachers);
    const { cfg, gov } = requireContextConfig(contextId);
    const round = preparationStore.detailRound(cfg.roundId);
    const semester = preparationStore.detailSemester(round.semester_id);
    const year = preparationStore.detailAcademicYear(semester.academic_year_id);
    const preview = assignmentStore.preview(cfg.roundCode);
    const val = preview
        ? checkValidationStatus(preview.meta.version_id)
        : {
              report: null,
              fresh: false,
              releasable: false,
              annualWarning: null,
              validationId: null,
          };

    return clone({
        context_id: contextId,
        round_id: round.id,
        round_code: round.round_code,
        context_title: cfg.label,
        academic_year: year.year_code.replace('-', '–'),
        phase: gov.phase,
        has_plan: Boolean(preview),
        version_id: preview?.meta.version_id ?? null,
        version_no: preview?.meta.version_no ?? (contextId === 'hk1' ? 2 : 1),
        revision_no: preview?.meta.revision_no ?? 0,
        source_version_no: gov.sourceVersionNo,
        feedback_due_at: gov.feedbackDueAt,
        no_reopen_reason: gov.noReopenReason,
        validation_fresh: val.fresh,
        validation_releasable: val.releasable,
        validation_annual_warning: val.annualWarning,
        validation_id: val.validationId,
        source_token:
            preview?.meta.source_revision_token ??
            round.source_revision_token ??
            `round-${round.id}`,
        pending_count: gov.feedback.filter((item) => item.status === 'pending')
            .length,
        feedback: gov.feedback,
        snapshots: gov.snapshots,
        documents: gov.documents,
        preview_snapshot: buildSnapshotFromPlan(
            contextId,
            'Xem trước báo cáo',
            'Nguyễn Minh Khoa',
        ),
    });
}

export const governanceStore = {
    reset() {
        contextsState = createInitialContexts();
        rulesState = seedRules();
        sourcesState = seedSources();
        aliasesState = [];
        auditState = seedAudit();
        nextFeedbackId = 4;
        nextSnapshotSeq = 2;
        nextDocSeq = 1;
        nextRuleSeq = 1;
        nextSourceSeq = 1;
        nextAliasSeq = 1;
        nextAuditSeq = 1;
        hydrated = true;
        const store = browserStorage();
        if (store) {
            try {
                store.removeItem(STORAGE_KEY);
            } catch {
                // Ignore
            }
        }
    },
    pendingCount(contextId: string): number {
        ensureHydrated();
        const gov = contextsState[contextId];
        return gov
            ? gov.feedback.filter((item) => item.status === 'pending').length
            : 0;
    },
    phase(contextId: string): PlanLifecyclePhase {
        ensureHydrated();
        return contextsState[contextId]?.phase ?? 'DRAFT';
    },
    feedbackDueAt(contextId: string): string | null {
        ensureHydrated();
        return contextsState[contextId]?.feedbackDueAt ?? null;
    },
    overview(
        contextId: string,
        teachers: Teacher[],
    ): GovernanceOverviewResponse {
        return buildOverviewResponse(contextId, teachers);
    },
    openFeedback(
        contextId: string,
        due: string,
        actorName: string,
        teachers: Teacher[],
    ): GovernanceOverviewResponse {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(contextId);
        if (gov.phase !== 'DRAFT') {
            throw new MockError(
                409,
                'INVALID_LIFECYCLE_STATE',
                'Chỉ mở lấy ý kiến khi phương án đang ở trạng thái Bản nháp (DRAFT).',
            );
        }
        const parsedDue = new Date(due);
        if (
            !due ||
            Number.isNaN(parsedDue.getTime()) ||
            parsedDue <= new Date()
        ) {
            throw new MockError(
                422,
                'INVALID_FEEDBACK_DEADLINE',
                'Hạn nhận phản hồi phải là một thời điểm hợp lệ ở tương lai.',
            );
        }
        const preview = assignmentStore.preview(cfg.roundCode);
        if (!preview) {
            throw new MockError(
                422,
                'PLAN_REQUIRED',
                'Cần tạo phương án nháp trước khi mở lấy ý kiến.',
            );
        }
        const val = checkValidationStatus(preview.meta.version_id);
        if (!val.fresh || !val.releasable) {
            throw new MockError(
                422,
                'VALIDATION_REQUIRED',
                'Kết quả kiểm tra phương án chưa có, đã cũ hoặc còn điều kiện chặn. Vào Trung tâm kiểm tra trước khi mở lấy ý kiến.',
            );
        }
        const before = { phase: gov.phase, due: gov.feedbackDueAt };
        gov.phase = 'OPEN_FOR_FEEDBACK';
        gov.feedbackDueAt = due;
        assignmentStore.setRoundStatus(cfg.roundId, 'OPEN_FOR_FEEDBACK');
        const snap = buildSnapshotFromPlan(
            contextId,
            'Mở lấy ý kiến',
            actorName,
            'OPEN_FOR_FEEDBACK',
        );
        if (snap) gov.snapshots.push(snap);
        recordAudit(
            actorName,
            'manager',
            'Mở lấy ý kiến',
            `${cfg.roundCode} · V${preview.meta.version_no}`,
            before,
            { phase: gov.phase, due, snapshot_id: snap?.id ?? null },
        );
        saveStorage();
        return buildOverviewResponse(contextId, teachers);
    },
    closeFeedback(
        contextId: string,
        reason: string,
        actorName: string,
        teachers: Teacher[],
    ): GovernanceOverviewResponse {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(contextId);
        if (gov.phase !== 'OPEN_FOR_FEEDBACK') {
            throw new MockError(
                409,
                'INVALID_LIFECYCLE_STATE',
                'Phương án hiện không ở trạng thái Đang lấy ý kiến.',
            );
        }
        if (!reason.trim()) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Ghi lý do đóng nhận phản hồi.',
            );
        }
        const before = { phase: gov.phase };
        gov.phase = 'FEEDBACK_PROCESSING';
        assignmentStore.setRoundStatus(cfg.roundId, 'FEEDBACK_PROCESSING');
        recordAudit(
            actorName,
            'manager',
            'Đóng nhận phản hồi',
            cfg.roundCode,
            before,
            { phase: gov.phase, reason: reason.trim() },
        );
        saveStorage();
        return buildOverviewResponse(contextId, teachers);
    },
    resolveFeedback(
        feedbackId: number,
        input: {
            context_id: string;
            decision: FeedbackDecision;
            result: string;
            actor_name?: string;
        },
        teachers: Teacher[],
    ): FeedbackItem {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(input.context_id);
        const item = gov.feedback.find((row) => row.id === feedbackId);
        if (!item) {
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy phản hồi.',
            );
        }
        if (
            item.status !== 'pending' ||
            !(
                gov.phase === 'FEEDBACK_PROCESSING' ||
                (gov.phase === 'DRAFT' && gov.sourceVersionNo !== null)
            )
        ) {
            throw new MockError(
                409,
                'FEEDBACK_NOT_RESOLVABLE',
                'Chỉ xử lý phản hồi khi đã đóng nhận ý kiến hoặc trên bản nháp kế tiếp.',
            );
        }
        if (!input.result.trim()) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Ghi rõ quyết định và lý do xử lý phản hồi.',
            );
        }
        const preview = assignmentStore.preview(cfg.roundCode);
        const before = clone(item);
        item.status = 'resolved';
        item.decision = input.decision;
        item.result = input.result.trim();
        item.resolved_by = input.actor_name?.trim() || 'Nguyễn Minh Khoa';
        item.resolved_at = now();
        item.result_version = preview?.meta.version_no ?? null;
        recordAudit(
            item.resolved_by,
            'manager',
            'Xử lý phản hồi',
            `Phản hồi #${feedbackId}`,
            before,
            clone(item),
        );
        saveStorage();
        return clone(item);
    },
    submitTeacherFeedback(
        input: TeacherFeedbackSubmitRequest,
        teachers: Teacher[],
    ): FeedbackItem {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(input.context_id);
        if (
            gov.phase !== 'OPEN_FOR_FEEDBACK' ||
            !gov.feedbackDueAt ||
            new Date(gov.feedbackDueAt) <= new Date()
        ) {
            throw new MockError(
                409,
                'FEEDBACK_CLOSED',
                'Phiên bản này không còn mở nhận phản hồi.',
            );
        }
        const portalTeacher = readTeacherPortalOverview(
            input.context_id,
            input.teacher_id,
            false,
        );
        if (!portalTeacher) {
            throw new MockError(
                403,
                'TEACHER_OUT_OF_SCOPE',
                'Không tìm thấy hồ sơ giáo viên trong đợt đang chọn.',
            );
        }
        if (!input.title.trim() || !input.text.trim()) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Nhập tiêu đề và nội dung phản hồi.',
            );
        }
        if (
            input.type === 'ASSIGNMENT' &&
            !portalTeacher.assignments.some((a) => a.id === input.demand_id)
        ) {
            throw new MockError(
                400,
                'INVALID_REQUEST',
                'Chọn một phân công cá nhân liên quan.',
            );
        }
        if (input.type === 'REQUEST_SUBJECT_TOTAL') {
            const subjectRows = portalTeacher.assignments.filter(
                (row) => row.subject_name === input.subject,
            );
            const currentSum = subjectRows.reduce((s, r) => s + r.periods, 0);
            if (
                subjectRows.length === 0 ||
                !input.desired_total ||
                input.desired_total <= currentSum
            ) {
                throw new MockError(
                    422,
                    'INVALID_DESIRED_TOTAL',
                    'Tổng mong muốn phải lớn hơn tổng tiết môn hiện có; không nhập riêng phần tăng.',
                );
            }
        }
        const released = gov.snapshots
            .filter(
                (snap) =>
                    snap.is_full &&
                    (snap.phase === 'OPEN_FOR_FEEDBACK' ||
                        snap.phase === 'READY_TO_EXPORT' ||
                        snap.phase === 'EXPORTED'),
            )
            .sort((a, b) => a.version_no - b.version_no);
        const chosenSnap =
            (input.release_id
                ? released.find((item) => item.id === input.release_id)
                : undefined) ?? released.at(-1);
        const preview = assignmentStore.preview(cfg.roundCode);
        const versionNo =
            chosenSnap?.version_no ?? preview?.meta.version_no ?? 1;
        const revisionNo =
            chosenSnap?.revision_no ?? preview?.meta.revision_no ?? 0;

        const createdAt = now();
        const created: FeedbackItem = {
            id: nextFeedbackId++,
            context_id: input.context_id,
            version_no: versionNo,
            round_id: cfg.roundId,
            round_code: cfg.roundCode,
            teacher_id: input.teacher_id,
            teacher_name: portalTeacher.full_name,
            teacher_code: portalTeacher.teacher_code,
            portrait_key: portalTeacher.portrait_key,
            color_index: portalTeacher.color_index,
            type: input.type,
            title: input.title.trim(),
            text: input.text.trim(),
            demand_id:
                input.type === 'ASSIGNMENT' ? (input.demand_id ?? null) : null,
            subject:
                input.type === 'REQUEST_SUBJECT_TOTAL'
                    ? (input.subject ?? null)
                    : null,
            desired_total:
                input.type === 'REQUEST_SUBJECT_TOTAL'
                    ? (input.desired_total ?? null)
                    : null,
            source_id: chosenSnap?.id ?? `V${versionNo}/r${revisionNo}`,
            source_revision: revisionNo,
            status: 'pending',
            decision: null,
            result: '',
            resolved_by: null,
            resolved_at: null,
            result_version: null,
            created_at: createdAt,
            created_label: new Date(createdAt).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
        gov.feedback.unshift(created);
        recordAudit(
            portalTeacher.full_name,
            'teacher',
            'Gửi phản hồi cá nhân',
            created.source_id,
            null,
            clone(created),
        );
        saveStorage();
        return clone(created);
    },
    createNextDraft(
        contextId: string,
        actorName: string,
        teachers: Teacher[],
    ): GovernanceOverviewResponse {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(contextId);
        if (gov.phase === 'DRAFT') {
            throw new MockError(
                409,
                'ALREADY_DRAFT',
                'Bạn đã ở bản nháp hiện hành.',
            );
        }
        if (gov.phase === 'OPEN_FOR_FEEDBACK') {
            throw new MockError(
                409,
                'FEEDBACK_STILL_OPEN',
                'Cần đóng nhận phản hồi và xử lý hết ý kiến trước khi tạo bản nháp mới.',
            );
        }
        if (gov.feedback.some((item) => item.status === 'pending')) {
            throw new MockError(
                422,
                'PENDING_FEEDBACK_EXISTS',
                'Xử lý xong toàn bộ phản hồi chờ trước khi tạo bản nháp kế tiếp.',
            );
        }
        const snap = buildSnapshotFromPlan(
            contextId,
            'Nguồn trước bản nháp kế tiếp',
            actorName,
        );
        if (snap) gov.snapshots.push(snap);
        const branched = assignmentStore.createNextDraftFromRound(cfg.roundId);
        const prevVersionNo = branched?.previous_version_no ?? 1;
        const newVersionNo = branched?.version.version_no ?? prevVersionNo + 1;
        gov.sourceVersionNo = prevVersionNo;
        gov.phase = 'DRAFT';
        gov.noReopenReason = '';
        for (const item of gov.feedback) {
            if (
                item.version_no === prevVersionNo &&
                item.result_version === null
            ) {
                item.result_version = newVersionNo;
            }
        }
        recordAudit(
            actorName,
            'manager',
            'Tạo bản nháp kế tiếp',
            `${cfg.roundCode} · V${newVersionNo}`,
            { source_version: prevVersionNo },
            { new_version: newVersionNo, phase: 'DRAFT' },
        );
        saveStorage();
        return buildOverviewResponse(contextId, teachers);
    },
    markReady(
        contextId: string,
        reason: string,
        actorName: string,
        teachers: Teacher[],
    ): GovernanceOverviewResponse {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(contextId);
        const pending = gov.feedback.filter(
            (item) => item.status === 'pending',
        ).length;
        if (
            !canCompletePlanReady(
                gov.phase,
                gov.sourceVersionNo,
                pending,
                reason,
            )
        ) {
            throw new MockError(
                422,
                'READY_CONDITION_NOT_MET',
                gov.phase === 'DRAFT' && gov.sourceVersionNo === null
                    ? 'Bản nháp ban đầu phải qua bước mở lấy ý kiến trước khi hoàn tất.'
                    : 'Cần xử lý hết phản hồi chờ và ghi lý do không mở lại tối thiểu 8 ký tự.',
            );
        }
        const preview = assignmentStore.preview(cfg.roundCode);
        if (!preview) {
            throw new MockError(422, 'PLAN_REQUIRED', 'Đợt chưa có phương án.');
        }
        const val = checkValidationStatus(preview.meta.version_id);
        if (!val.fresh || !val.releasable) {
            throw new MockError(
                422,
                'VALIDATION_REQUIRED',
                'Chạy kiểm tra hiện hành và xử lý điều kiện chặn tại Trung tâm kiểm tra trước khi hoàn tất.',
            );
        }
        const before = { phase: gov.phase, reason: gov.noReopenReason };
        gov.noReopenReason = reason.trim();
        gov.phase = 'READY_TO_EXPORT';
        assignmentStore.setRoundStatus(cfg.roundId, 'READY_TO_EXPORT');
        const snap = buildSnapshotFromPlan(
            contextId,
            'Sẵn sàng phát hành',
            actorName,
            'READY_TO_EXPORT',
        );
        if (snap) gov.snapshots.push(snap);
        recordAudit(
            actorName,
            'manager',
            'Sẵn sàng phát hành đề xuất',
            `${cfg.roundCode} · V${preview.meta.version_no}`,
            before,
            { phase: gov.phase, reason: gov.noReopenReason },
        );
        saveStorage();
        return buildOverviewResponse(contextId, teachers);
    },
    saveSnapshot(
        contextId: string,
        title: string | undefined,
        actorName: string,
        teachers: Teacher[],
    ): PlanSnapshot {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(contextId);
        const snap = buildSnapshotFromPlan(
            contextId,
            title?.trim() || 'Mốc rà soát đầy đủ',
            actorName,
        );
        if (!snap) {
            throw new MockError(
                422,
                'PLAN_REQUIRED',
                'Đợt chưa có phương án để chụp snapshot.',
            );
        }
        gov.snapshots.push(snap);
        recordAudit(
            actorName,
            'manager',
            'Lưu mốc đầy đủ',
            `${cfg.roundCode} · ${snap.id}`,
            null,
            { snapshot_id: snap.id, version_no: snap.version_no },
        );
        saveStorage();
        return clone(snap);
    },
    restoreSnapshot(
        contextId: string,
        snapshotId: string,
        actorName: string,
        teachers: Teacher[],
    ): GovernanceOverviewResponse {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(contextId);
        const target = gov.snapshots.find((item) => item.id === snapshotId);
        if (!target) {
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy bản lưu lịch sử.',
            );
        }
        if (!target.is_full) {
            throw new MockError(
                422,
                'LEGACY_SNAPSHOT_READONLY',
                'Bản lưu cũ trước nâng cấp chỉ có dữ liệu tối thiểu; không thể khôi phục thành bản nháp.',
            );
        }
        if (
            gov.phase === 'OPEN_FOR_FEEDBACK' ||
            gov.feedback.some((item) => item.status === 'pending')
        ) {
            throw new MockError(
                409,
                'RESTORE_BLOCKED',
                'Đóng nhận và xử lý xong phản hồi trước khi khôi phục snapshot.',
            );
        }
        const preSnap = buildSnapshotFromPlan(
            contextId,
            'Trước khi khôi phục',
            actorName,
        );
        if (preSnap) gov.snapshots.push(preSnap);
        const restored = assignmentStore.createNextDraftFromRound(
            cfg.roundId,
            target.rows.map((row) => ({
                demand_id: row.demand_id,
                teacher_id: row.teacher_id,
                teacher_name: row.teacher_name,
                locked: row.locked,
            })),
        );
        const oldVersionNo = restored?.previous_version_no ?? target.version_no;
        const newVersionNo =
            restored?.version.version_no ?? target.version_no + 1;
        gov.phase = 'DRAFT';
        gov.sourceVersionNo = oldVersionNo;
        gov.noReopenReason = '';
        recordAudit(
            actorName,
            'manager',
            'Khôi phục snapshot vào bản mới',
            `${cfg.roundCode} · ${target.id} → V${newVersionNo}`,
            { from_snapshot: target.id },
            { new_version: newVersionNo, phase: 'DRAFT' },
        );
        saveStorage();
        return buildOverviewResponse(contextId, teachers);
    },
    issueDocument(
        input: {
            context_id: string;
            mode: 'teachers' | 'classes';
            filename: string;
            bytes: number;
            sha256: string;
            source_token: string;
            base_revision: number;
            validation_id: string;
            pdf_base64: string;
            snapshot: PlanSnapshot;
            actor_name?: string;
        },
        teachers: Teacher[],
    ): ExportDocumentRecord {
        ensureHydrated();
        assignmentStore.ensure(teachers);
        const { cfg, gov } = requireContextConfig(input.context_id);
        if (gov.phase !== 'READY_TO_EXPORT') {
            throw new MockError(
                409,
                'EXPORT_NOT_READY',
                'Chỉ phát hành tài liệu chính thức khi phương án ở trạng thái Sẵn sàng xuất (READY_TO_EXPORT).',
            );
        }
        if (gov.feedback.some((item) => item.status === 'pending')) {
            throw new MockError(
                422,
                'PENDING_FEEDBACK_EXISTS',
                'Vẫn còn phản hồi chờ xử lý.',
            );
        }
        const preview = assignmentStore.preview(cfg.roundCode);
        const val = preview
            ? checkValidationStatus(preview.meta.version_id)
            : null;
        if (!val || !val.fresh || !val.releasable) {
            throw new MockError(
                422,
                'VALIDATION_STALE_OR_BLOCKED',
                'Kết quả kiểm tra phương án đã cũ hoặc còn điều kiện chặn.',
            );
        }
        const actor = input.actor_name?.trim() || 'Nguyễn Minh Khoa';
        const record: ExportDocumentRecord = {
            id: `PDF-${nextDocSeq++}`,
            context_id: input.context_id,
            at: now(),
            by: actor,
            filename: input.filename,
            mode: input.mode,
            bytes: input.bytes,
            sha256: input.sha256,
            validation_id: input.validation_id,
            source_token: input.source_token,
            base_revision: input.base_revision,
            pdf_base64: input.pdf_base64,
            snapshot: clone(input.snapshot),
        };
        gov.documents.unshift(record);
        gov.phase = 'EXPORTED';
        assignmentStore.setRoundStatus(cfg.roundId, 'EXPORTED');
        const snap = buildSnapshotFromPlan(
            input.context_id,
            'Đã phát hành tài liệu',
            actor,
            'EXPORTED',
        );
        if (snap) gov.snapshots.push(snap);
        recordAudit(
            actor,
            'manager',
            'Phát hành PDF đề xuất',
            record.filename,
            { phase: 'READY_TO_EXPORT' },
            {
                record_id: record.id,
                sha256: record.sha256,
                phase: 'EXPORTED',
            },
        );
        saveStorage();
        return clone(record);
    },
    listRules(): RuleRecord[] {
        ensureHydrated();
        return clone(rulesState);
    },
    saveRule(
        input: SaveRuleRequest & { actor_name?: string },
        editingId?: string,
    ): RuleRecord {
        ensureHydrated();
        const err = validateRuleDraft(input, rulesState, editingId ?? null);
        if (err) {
            throw new MockError(422, 'RULE_VALIDATION_ERROR', err);
        }
        const old = editingId
            ? rulesState.find((item) => item.id === editingId)
            : undefined;
        const next: RuleRecord = {
            id: `rule-${nextRuleSeq++}`,
            code: input.code.trim(),
            name: input.name.trim(),
            expression: input.expression.trim(),
            source: input.source.trim(),
            clause: input.clause.trim(),
            audience: input.audience.trim(),
            version: input.version.trim(),
            from: input.from,
            to: input.to,
            value: Number(input.value),
        };
        rulesState.push(next);
        recordAudit(
            input.actor_name?.trim() || 'Lê Hải An',
            'admin',
            'Ghi phiên bản quy tắc',
            next.code,
            old ?? null,
            next,
        );
        saveStorage();
        return clone(next);
    },
    listSources(): SourcesBundleResponse {
        ensureHydrated();
        const subjects = preparationStore
            .listSubjects({ limit: 100 })
            .map((item) => ({
                value: item.name,
                label: `${item.subject_code} · ${item.name}`,
            }));
        const classes = preparationStore
            .listClasses({ limit: 100 })
            .map((item) => ({
                value: item.class_code,
                label: item.class_code,
            }));
        const teachers = [
            ...demoAccounts
                .filter((acc) => acc.teacherId !== undefined)
                .map((acc) => ({
                    value: String(acc.teacherId),
                    label: `${acc.name} (#${acc.teacherId})`,
                })),
        ];
        return clone({
            sources: sourcesState,
            aliases: aliasesState,
            canonical_options: {
                teachers,
                classes,
                subjects,
            },
        });
    },
    saveSource(
        input: SaveSourceRequest,
        editingId?: string,
    ): SourceEvidenceRecord {
        ensureHydrated();
        const err = validateSourceDraft(input);
        if (err) {
            throw new MockError(400, 'INVALID_REQUEST', err);
        }
        const actor = input.actor_name?.trim() || 'Lê Hải An';
        const old = editingId
            ? sourcesState.find((item) => item.id === editingId)
            : undefined;
        if (editingId && !old) {
            throw new MockError(
                404,
                'RESOURCE_NOT_FOUND',
                'Không tìm thấy bản ghi nguồn.',
            );
        }
        const next: SourceEvidenceRecord = {
            id: old?.id ?? `source-${nextSourceSeq++}`,
            file: input.file.trim(),
            sheet: input.sheet.trim(),
            cell: input.cell.trim(),
            raw: input.raw.trim(),
            canonical: input.canonical.trim(),
            evidence: input.evidence.trim(),
            status: input.status,
            confirmed_by: input.status === 'CONFIRMED' ? actor : null,
            confirmed_at: input.status === 'CONFIRMED' ? now() : null,
        };
        if (old) {
            Object.assign(old, next);
        } else {
            sourcesState.unshift(next);
        }
        recordAudit(
            actor,
            'admin',
            'Đối soát nguồn',
            next.file,
            old ?? null,
            next,
        );
        saveStorage();
        return clone(next);
    },
    saveAlias(input: SaveAliasRequest): AliasRecord {
        ensureHydrated();
        const bundle = this.listSources();
        const validValues =
            input.kind === 'TEACHER'
                ? bundle.canonical_options.teachers.map((o) => o.value)
                : input.kind === 'CLASS'
                  ? bundle.canonical_options.classes.map((o) => o.value)
                  : bundle.canonical_options.subjects.map((o) => o.value);
        const err = validateAliasDraft(input, aliasesState, validValues);
        if (err) {
            throw new MockError(422, 'ALIAS_VALIDATION_ERROR', err);
        }
        const actor = input.actor_name?.trim() || 'Lê Hải An';
        const next: AliasRecord = {
            id: `alias-${nextAliasSeq++}`,
            kind: input.kind,
            alias: input.alias.trim(),
            canonical: input.canonical.trim(),
            source: input.source.trim(),
            by: actor,
            at: now(),
        };
        aliasesState.unshift(next);
        recordAudit(
            actor,
            'admin',
            'Ghi ánh xạ bí danh',
            `${next.kind} / ${next.alias}`,
            null,
            next,
        );
        saveStorage();
        return clone(next);
    },
    listAudit(filters?: {
        q?: string;
        from?: string;
        to?: string;
    }): GovernanceAuditRecord[] {
        ensureHydrated();
        const assignmentLogs: GovernanceAuditRecord[] = assignmentStore
            .audit()
            .map((entry, idx) => ({
                id: `plan-audit-${entry.version_id}-${idx}`,
                at: entry.at,
                actor: 'Nguyễn Minh Khoa',
                role: 'manager',
                action: entry.reason,
                object:
                    entry.row_ids.length > 0
                        ? `V${entry.version_id} · ${entry.row_ids.length} dòng`
                        : `V${entry.version_id}`,
                result: 'SUCCESS',
                before: null,
                after: { action: entry.action, row_ids: entry.row_ids },
            }));
        const all = [...auditState, ...assignmentLogs].sort((a, b) =>
            b.at.localeCompare(a.at),
        );
        const q = normalizeSubjectSearch(filters?.q ?? '');
        return clone(
            all.filter(
                (item) =>
                    (!q ||
                        normalizeSubjectSearch(
                            `${item.actor} ${item.action} ${item.object} ${item.result}`,
                        ).includes(q)) &&
                    (!filters?.from || item.at.slice(0, 10) >= filters.from) &&
                    (!filters?.to || item.at.slice(0, 10) <= filters.to),
            ),
        );
    },
};
