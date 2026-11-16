import type { OverviewAssignmentItem } from '../overview/types.ts';
import type {
    AliasKind,
    AliasRecord,
    FeedbackKind,
    PlanLifecyclePhase,
    RuleRecord,
    SaveAliasRequest,
    SaveRuleRequest,
    SaveSourceRequest,
} from './types.ts';

export const FEEDBACK_TYPE_LABELS: Record<FeedbackKind, string> = {
    GENERAL: 'Góp ý chung',
    ASSIGNMENT: 'Điều chỉnh phân công',
    REQUEST_SUBJECT_TOTAL: 'Đề nghị nhận thêm tiết',
};

export const ALIAS_KIND_LABELS: Record<AliasKind, string> = {
    TEACHER: 'Giáo viên',
    CLASS: 'Lớp',
    SUBJECT: 'Môn',
};

export function isPositiveTwoDecimals(value: unknown): boolean {
    const n = Number(value);
    return (
        Number.isFinite(n) &&
        n > 0 &&
        n <= 999.99 &&
        Math.abs(n * 100 - Math.round(n * 100)) < 1e-8
    );
}

/** Validate teacher feedback submission matching prototype mvpFeedbackValid + form rules. */
export function validateFeedbackSubmission(
    input: {
        type: FeedbackKind;
        title: string;
        text: string;
        demandId: number | null;
        subject: string | null;
        desiredTotal: string;
    },
    sourceAssignments: readonly OverviewAssignmentItem[],
): string | null {
    if (!Object.hasOwn(FEEDBACK_TYPE_LABELS, input.type)) {
        return 'Loại phản hồi không hợp lệ.';
    }
    if (!input.title.trim() || !input.text.trim()) {
        return 'Nhập tiêu đề và nội dung phản hồi.';
    }
    if (input.type === 'ASSIGNMENT') {
        if (
            input.demandId === null ||
            !sourceAssignments.some((row) => row.id === input.demandId)
        ) {
            return 'Chọn một phân công cá nhân liên quan.';
        }
    }
    if (input.type === 'REQUEST_SUBJECT_TOTAL') {
        const rows = sourceAssignments.filter(
            (row) => row.subject_name === input.subject,
        );
        if (rows.length === 0) {
            return 'Chỉ chọn môn đang được phân công trên phiên bản nguồn.';
        }
        const currentTotal = rows.reduce((sum, row) => sum + row.periods, 0);
        if (
            !isPositiveTwoDecimals(input.desiredTotal) ||
            Number(input.desiredTotal) <= currentTotal
        ) {
            return 'Tổng mong muốn phải lớn hơn tổng tiết môn hiện có; không nhập riêng phần tăng.';
        }
    }
    return null;
}

/** Matches prototype mvpCanReady for closing into READY_TO_EXPORT. */
export function canCompletePlanReady(
    phase: PlanLifecyclePhase,
    sourceVersionNo: number | null,
    pendingCount: number,
    reason: string,
): boolean {
    if (pendingCount > 0) return false;
    if (phase === 'FEEDBACK_PROCESSING') return true;
    return (
        phase === 'DRAFT' &&
        sourceVersionNo !== null &&
        reason.trim().length >= 8
    );
}

export function validateRuleDraft(
    input: SaveRuleRequest,
    existing: readonly RuleRecord[],
    editingId: string | null,
): string | null {
    if (
        !input.code.trim() ||
        !input.name.trim() ||
        !input.expression.trim() ||
        !input.source.trim() ||
        !input.clause.trim() ||
        !input.audience.trim() ||
        !input.version.trim()
    ) {
        return 'Nhập đầy đủ mã, tên, biểu thức, nguồn, điều khoản, đối tượng và phiên bản.';
    }
    if (!input.from || !input.to || input.from > input.to) {
        return 'Kiểm tra khoảng hiệu lực từ ngày đến ngày.';
    }
    if (!Number.isFinite(input.value) || input.value < 0) {
        return 'Giá trị mẫu phải là số không âm.';
    }
    const old = editingId
        ? existing.find((item) => item.id === editingId)
        : null;
    if (old && old.version === input.version.trim()) {
        return 'Dùng mã phiên bản mới khi cập nhật quy tắc.';
    }
    if (
        existing.some(
            (item) =>
                item.code === input.code.trim() &&
                item.version === input.version.trim(),
        )
    ) {
        return 'Trùng mã và phiên bản quy tắc.';
    }
    return null;
}

export function validateSourceDraft(input: SaveSourceRequest): string | null {
    if (
        !input.file.trim() ||
        !input.sheet.trim() ||
        !input.cell.trim() ||
        !input.raw.trim() ||
        !input.canonical.trim() ||
        !input.evidence.trim()
    ) {
        return 'Ghi đủ tên nguồn, mục/vị trí, giá trị gốc, ánh xạ và bằng chứng.';
    }
    return null;
}

export function validateAliasDraft(
    input: SaveAliasRequest,
    existing: readonly AliasRecord[],
    validCanonicalValues: readonly string[],
): string | null {
    if (
        !input.alias.trim() ||
        !input.canonical.trim() ||
        !input.source.trim()
    ) {
        return 'Nhập bí danh, giá trị chuẩn và nguồn chứng cứ.';
    }
    if (!validCanonicalValues.includes(input.canonical.trim())) {
        return 'Mã chuẩn chưa có trong danh mục tương ứng.';
    }
    const key = input.alias.trim().toLocaleLowerCase('vi');
    if (
        existing.some(
            (item) =>
                item.kind === input.kind &&
                item.alias.trim().toLocaleLowerCase('vi') === key,
        )
    ) {
        return 'Bí danh đã có ánh xạ; không tạo ánh xạ mơ hồ.';
    }
    return null;
}

export function formatGovernanceDateTime(
    iso: string | null | undefined,
): string {
    if (!iso) return 'Chưa ghi nhận';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
