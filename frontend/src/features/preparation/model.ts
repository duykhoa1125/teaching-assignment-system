import { isValidIsoDate } from '../catalogs/model.ts';
import type {
    ApplicabilityStatus,
    ConfigOption,
    DemandStatus,
    DemandType,
    ReadinessIssue,
    ReadinessQueryParams,
    TeachingDemand,
    TeachingDemandFilters,
    TeachingDemandRequest,
} from './types.ts';

export const PREPARATION_PAGE_SIZE = 20;

export const DEMAND_TYPE_LABELS: Record<DemandType, string> = {
    STANDARD: 'Giảng dạy chuẩn',
    SPECIALIZED_TOPIC: 'Chuyên đề lựa chọn',
    ENRICHMENT: 'Tăng cường / hoạt động',
};

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
    ACTIVE: 'Hiệu lực',
    INACTIVE: 'Tạm ngưng',
};

export const APPLICABILITY_STATUS_LABELS: Record<ApplicabilityStatus, string> =
    {
        APPLICABLE: 'Áp dụng',
        NOT_APPLICABLE: 'Không áp dụng',
        UNDETERMINED: 'Chưa xác định',
    };

export const OPTIMIZATION_CONFIG_OPTIONS: readonly ConfigOption[] = [
    {
        id: 1,
        code: 'DEMO_FIVE_STAGE',
        name: 'Cấu hình cân bằng 5 bước (T = A+F+C+R)',
        detail: 'Ưu tiên giữ phân công ổn định và cân bằng độ lệch tải T − B',
    },
    {
        id: 2,
        code: 'STRICT_EXPERIENCE',
        name: 'Cấu hình ưu tiên kinh nghiệm khối',
        detail: 'Chặn ứng viên thiếu hồ sơ kinh nghiệm theo khối đã khai báo',
    },
];

export const RULE_SET_VERSION_OPTIONS: readonly ConfigOption[] = [
    {
        id: 1,
        code: 'RULE_THPT_2026_V1',
        name: 'Bộ quy tắc THPT 2026–2027 (v1)',
        detail: 'Định mức chuẩn 17 tiết/tuần · trần kiểm tra tải T',
    },
    {
        id: 2,
        code: 'RULE_THCS_2026_V1',
        name: 'Bộ quy tắc THCS 2026–2027 (v1)',
        detail: 'Định mức chuẩn 19 tiết/tuần · áp dụng cấp THCS',
    },
];

export function formatPeriods(value: number): string {
    return Number.isInteger(value)
        ? String(value)
        : Number(value.toFixed(2)).toString();
}

export function validatePeriodsPerWeek(raw: string | number): string | null {
    const text = String(raw).trim();
    if (!text) return 'Vui lòng nhập số tiết/tuần.';
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) {
        return 'Số tiết phải là số dương tối đa 999.99 và tối đa 2 chữ số thập phân.';
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999.99) {
        return 'Số tiết phải nằm trong khoảng từ 0.01 đến 999.99.';
    }
    return null;
}

export function intervalsOverlap(
    aFrom: string,
    aTo: string,
    bFrom: string,
    bTo: string,
): boolean {
    return aFrom <= bTo && bFrom <= aTo;
}

export function buildDemandFilters(filters: {
    semesterId?: number | null;
    classId?: number | null;
    subjectId?: number | null;
    demandType?: DemandType | '';
    status?: DemandStatus | '';
    asOf?: string;
    offset?: number;
    limit?: number;
}): TeachingDemandFilters {
    const pageSize = filters.limit ?? PREPARATION_PAGE_SIZE;
    const asOf = filters.asOf?.trim();
    return {
        ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
        ...(filters.demandType ? { demand_type: filters.demandType } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(asOf ? { as_of: asOf } : {}),
        limit: pageSize + 1,
        offset: filters.offset ?? 0,
    };
}

export function validateDemandForm(input: {
    semester_id: string;
    class_id: string;
    subject_id: string;
    demand_type: string;
    periods_per_week: string;
    status: string;
    valid_from: string;
    valid_to: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.semester_id))
        errors.semester_id = 'Vui lòng chọn học kỳ.';
    if (!Number(input.class_id)) errors.class_id = 'Vui lòng chọn lớp học.';
    if (!Number(input.subject_id)) errors.subject_id = 'Vui lòng chọn môn học.';
    if (
        !['STANDARD', 'SPECIALIZED_TOPIC', 'ENRICHMENT'].includes(
            input.demand_type,
        )
    ) {
        errors.demand_type = 'Loại thành phần không hợp lệ.';
    }
    const periodError = validatePeriodsPerWeek(input.periods_per_week);
    if (periodError) errors.periods_per_week = periodError;
    if (input.status !== 'ACTIVE' && input.status !== 'INACTIVE') {
        errors.status = 'Trạng thái nhu cầu phải là ACTIVE hoặc INACTIVE.';
    }
    if (!isValidIsoDate(input.valid_from)) {
        errors.valid_from = 'Ngày bắt đầu phải đúng định dạng YYYY-MM-DD.';
    }
    if (!isValidIsoDate(input.valid_to)) {
        errors.valid_to = 'Ngày kết thúc phải đúng định dạng YYYY-MM-DD.';
    } else if (
        isValidIsoDate(input.valid_from) &&
        input.valid_to.trim() < input.valid_from.trim()
    ) {
        errors.valid_to = 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu.';
    }
    return errors;
}

export function toDemandRequest(
    input: {
        semester_id: string;
        class_id: string;
        subject_id: string;
        demand_type: DemandType;
        periods_per_week: string;
        status: DemandStatus;
        valid_from: string;
        valid_to: string;
    },
    actorId: number | null = 1,
): TeachingDemandRequest {
    return {
        semester_id: Number(input.semester_id),
        class_id: Number(input.class_id),
        subject_id: Number(input.subject_id),
        periods_per_week: Number(
            Number(input.periods_per_week.trim()).toFixed(2),
        ),
        status: input.status,
        updated_by: actorId,
        demand_type: input.demand_type,
        valid_from: input.valid_from.trim(),
        valid_to: input.valid_to.trim(),
        unit: 'PERIOD_PER_WEEK',
    };
}

export type BatchDemandRowInput = {
    class_id: number;
    class_code: string;
    periods_text: string;
};

export type BatchDemandPreviewRow = {
    class_id: number;
    class_code: string;
    periods_per_week: number | null;
    status: 'OK' | 'WARNING' | 'ERROR';
    message: string;
};

export function validateBatchDemands(params: {
    semesterId: number | null;
    subjectId: number | null;
    demandType: DemandType;
    validFrom: string;
    validTo: string;
    rows: readonly BatchDemandRowInput[];
    existingDemands: readonly TeachingDemand[];
}): { formError: string | null; preview: BatchDemandPreviewRow[] } {
    if (!params.semesterId) {
        return {
            formError: 'Chưa xác định được học kỳ đang làm việc.',
            preview: [],
        };
    }
    if (!params.subjectId) {
        return {
            formError: 'Vui lòng chọn môn học trước khi kiểm tra hoặc lưu.',
            preview: [],
        };
    }
    if (!isValidIsoDate(params.validFrom) || !isValidIsoDate(params.validTo)) {
        return {
            formError: 'Khoảng hiệu lực phải đúng định dạng YYYY-MM-DD.',
            preview: [],
        };
    }
    if (params.validTo.trim() < params.validFrom.trim()) {
        return {
            formError: 'Ngày kết thúc hiệu lực phải từ ngày bắt đầu trở đi.',
            preview: [],
        };
    }
    if (params.rows.length === 0) {
        return {
            formError: 'Chọn ít nhất một lớp để nhập nhu cầu.',
            preview: [],
        };
    }

    const from = params.validFrom.trim();
    const to = params.validTo.trim();
    const seenClass = new Set<number>();

    const preview: BatchDemandPreviewRow[] = params.rows.map((row) => {
        if (seenClass.has(row.class_id)) {
            return {
                class_id: row.class_id,
                class_code: row.class_code,
                periods_per_week: null,
                status: 'ERROR',
                message: 'Lớp bị chọn trùng trong cùng đợt nhập.',
            };
        }
        seenClass.add(row.class_id);

        const pError = validatePeriodsPerWeek(row.periods_text);
        if (pError) {
            return {
                class_id: row.class_id,
                class_code: row.class_code,
                periods_per_week: null,
                status: 'ERROR',
                message: pError,
            };
        }
        const periods = Number(Number(row.periods_text.trim()).toFixed(2));
        const conflicting = params.existingDemands.find(
            (d) =>
                d.semester_id === params.semesterId &&
                d.class_id === row.class_id &&
                d.subject_id === params.subjectId &&
                d.demand_type === params.demandType &&
                d.status === 'ACTIVE' &&
                intervalsOverlap(from, to, d.valid_from, d.valid_to),
        );
        if (conflicting) {
            return {
                class_id: row.class_id,
                class_code: row.class_code,
                periods_per_week: periods,
                status: 'ERROR',
                message: `Đã có nhu cầu ACTIVE (#${conflicting.id}, ${conflicting.valid_from} → ${conflicting.valid_to}) giao với khoảng này.`,
            };
        }
        return {
            class_id: row.class_id,
            class_code: row.class_code,
            periods_per_week: periods,
            status: 'OK',
            message: 'Sẵn sàng lưu vào hệ thống',
        };
    });

    const hasError = preview.some((item) => item.status === 'ERROR');
    return {
        formError: hasError
            ? 'Có dòng không hợp lệ hoặc chồng khoảng hiệu lực. Vui lòng kiểm tra bảng xem trước.'
            : null,
        preview,
    };
}

export function validateApplicabilityForm(input: {
    scope_id: string;
    class_id: string;
    status: ApplicabilityStatus;
    reason: string;
    hasActiveDemand: boolean;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.scope_id))
        errors.scope_id = 'Vui lòng chọn phạm vi khối–môn.';
    if (!Number(input.class_id)) errors.class_id = 'Vui lòng chọn lớp học.';

    if (input.status === 'NOT_APPLICABLE' && !input.reason.trim()) {
        errors.reason =
            'Trạng thái Không áp dụng bắt buộc phải ghi lý do rõ ràng.';
    }
    if (
        (input.status === 'NOT_APPLICABLE' ||
            input.status === 'UNDETERMINED') &&
        input.hasActiveDemand
    ) {
        errors.status =
            'Cặp lớp–môn đang có nhu cầu ACTIVE; không thể chuyển sang Không áp dụng hoặc Chưa xác định.';
    }
    return errors;
}

export function validateRequiredComponentForm(input: {
    applicability_id: string;
    demand_type: string;
    valid_from: string;
    valid_to: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.applicability_id))
        errors.applicability_id = 'Vui lòng chọn cặp lớp–môn áp dụng.';
    if (
        !['STANDARD', 'SPECIALIZED_TOPIC', 'ENRICHMENT'].includes(
            input.demand_type,
        )
    ) {
        errors.demand_type = 'Loại thành phần không hợp lệ.';
    }
    if (!isValidIsoDate(input.valid_from))
        errors.valid_from = 'Ngày bắt đầu phải đúng định dạng YYYY-MM-DD.';
    if (!isValidIsoDate(input.valid_to))
        errors.valid_to = 'Ngày kết thúc phải đúng định dạng YYYY-MM-DD.';
    else if (
        isValidIsoDate(input.valid_from) &&
        input.valid_to.trim() < input.valid_from.trim()
    ) {
        errors.valid_to = 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu.';
    }
    return errors;
}

export function buildReadinessQuery(
    optimizationConfigId?: number | null,
    ruleSetVersionId?: number | null,
): ReadinessQueryParams {
    const hasConfig =
        typeof optimizationConfigId === 'number' && optimizationConfigId > 0;
    const hasRules =
        typeof ruleSetVersionId === 'number' && ruleSetVersionId > 0;
    if (hasConfig !== hasRules) {
        throw new Error(
            'Cần chọn đồng thời Cấu hình tối ưu và Bộ quy tắc, hoặc bỏ trống cả hai.',
        );
    }
    if (hasConfig && hasRules) {
        return {
            optimization_config_id: optimizationConfigId,
            rule_set_version_id: ruleSetVersionId,
        };
    }
    return {};
}

export type PrototypeIssueBadge =
    'PASS' | 'VIOLATION' | 'LOCK_CONFLICT' | 'INSUFFICIENT_DATA' | 'PARTIAL';

export function badgeStatusForIssue(
    issue: ReadinessIssue,
): PrototypeIssueBadge {
    if (
        issue.code.includes('LOCK') ||
        issue.category.toUpperCase() === 'LOCK'
    ) {
        return 'LOCK_CONFLICT';
    }
    if (issue.severity === 'ERROR') return 'VIOLATION';
    if (issue.severity === 'WARNING') return 'INSUFFICIENT_DATA';
    return 'PASS';
}

export function resolveIssueTarget(issue: ReadinessIssue): {
    path: string;
    label: string;
} {
    const code = issue.code.toUpperCase();
    const category = issue.category.toUpperCase();

    if (code === 'CONFIGURATION_SELECTION_REQUIRED') {
        return { path: '/checks', label: 'Chọn cấu hình & bộ quy tắc' };
    }
    if (
        code.includes('LOCK') ||
        code.includes('UNASSIGNED') ||
        category === 'LOCK' ||
        code.includes('PLAN_ROW')
    ) {
        return { path: '/assignment', label: 'Mở không gian phân công' };
    }
    if (
        code.includes('WORKLOAD') ||
        code.includes('QUALIFICATION') ||
        code.includes('TEACHER') ||
        category === 'WORKLOAD' ||
        category === 'QUALIFICATION'
    ) {
        return { path: '/teachers', label: 'Kiểm tra hồ sơ giáo viên' };
    }
    if (
        code.includes('DEMAND_MISSING') ||
        code.includes('MISSING_DEMAND') ||
        code === 'REQUIRED_COMPONENT_DEMAND_MISSING'
    ) {
        return { path: '/demands', label: 'Mở nhu cầu giảng dạy' };
    }
    if (code.includes('SCOPE')) {
        return { path: '/preparation?step=1', label: 'Xem phạm vi đợt' };
    }
    if (code.includes('COMPONENT') || code.includes('REQUIRED')) {
        return { path: '/preparation?step=3', label: 'Kiểm tra tập bắt buộc' };
    }
    if (code.includes('APPLICAB') || code.includes('UNDETERMINED')) {
        return { path: '/preparation?step=2', label: 'Phân loại lớp–môn' };
    }
    if (issue.severity === 'INFO') {
        return { path: '/assignment', label: 'Đi tới phân công' };
    }
    return { path: '/preparation', label: 'Mở chuẩn bị dữ liệu' };
}

type ApiErrorLike = {
    status?: number;
    code?: string;
    message?: string;
};

export function formatPreparationApiError(error: unknown): string {
    if (error && typeof error === 'object') {
        const err = error as ApiErrorLike;
        switch (err.code) {
            case 'DUPLICATE_RESOURCE':
                return err.message || 'Bản ghi bị trùng trong cùng phạm vi.';
            case 'REFERENCE_CONFLICT':
                return (
                    err.message ||
                    'Xung đột tham chiếu hoặc còn bản ghi đang phụ thuộc.'
                );
            case 'DATA_CONSTRAINT':
            case 'INVALID_REQUEST':
                return err.message || 'Dữ liệu chuẩn bị không hợp lệ.';
            case 'RESOURCE_NOT_FOUND':
                return err.message || 'Không tìm thấy bản ghi.';
            default:
                if (typeof err.message === 'string' && err.message.trim()) {
                    return err.message;
                }
        }
    }
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return 'Thao tác thất bại. Vui lòng kiểm tra lại dữ liệu.';
}
