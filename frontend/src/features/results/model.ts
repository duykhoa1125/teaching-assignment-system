import type {
    AssignmentRow,
    SolverRunDto,
    SolverRunStatus,
    ValidationFinding,
    ValidationReport,
    ValidationStatus,
    WorkloadRow,
} from '@/features/assignment/types';

export type StatusTone = 'PASS' | 'VIOLATION' | 'INSUFFICIENT_DATA' | 'PARTIAL';

export const SOLVER_STAGE_META: Record<
    string,
    { label: string; shortLabel: string; description: string }
> = {
    Z: {
        label: 'Thành phần chưa gán',
        shortLabel: '01 / Z',
        description:
            'Ưu tiên phủ tối đa nhu cầu bắt buộc và giữ cứng mọi khóa.',
    },
    L1: {
        label: 'Tổng |T − B|',
        shortLabel: '02 / L1',
        description: 'Giảm tổng độ lệch giữa tổng công tác và định mức cơ sở.',
    },
    M: {
        label: 'Lệch lớn nhất',
        shortLabel: '03 / M',
        description: 'Thu hẹp mức vượt/thiếu lớn nhất giữa các giáo viên.',
    },
    experience: {
        label: 'Phạt kinh nghiệm',
        shortLabel: '04 / Kinh nghiệm',
        description: 'Ưu tiên giáo viên có kinh nghiệm cho khối cuối cấp 9/12.',
    },
    change: {
        label: 'Xáo trộn',
        shortLabel: '05 / Thay đổi',
        description:
            'Giữ ổn định tối đa so với phân công hiện tại hoặc mốc nguồn.',
    },
};

export const SOLVER_STATUS_LABELS: Record<string, string> = {
    QUEUED: 'Trong hàng đợi',
    RUNNING: 'Đang chạy',
    CANCEL_REQUESTED: 'Đang yêu cầu hủy',
    SUCCEEDED: 'Hoàn tất',
    COMPLETED: 'Kết thúc chưa áp dụng',
    FAILED: 'Thất bại',
    CANCELLED: 'Đã hủy',
};

export const APPLY_OUTCOME_LABELS: Record<string, string> = {
    APPLIED: 'Đã áp dụng vào bản nháp',
    STALE: 'Không áp dụng · Dữ liệu đã đổi',
    NOT_DRAFT: 'Không áp dụng · Không phải bản nháp',
    REJECTED: 'Bị từ chối khi kiểm tra lại',
    FAILED: 'Áp dụng thất bại',
    NO_CANDIDATE: 'Chưa có nghiệm hợp lệ',
    CANCELLED: 'Đã hủy trước khi áp dụng',
};

export function isSolverRunActive(
    status: SolverRunStatus | null | undefined,
): boolean {
    return (
        status === 'QUEUED' ||
        status === 'RUNNING' ||
        status === 'CANCEL_REQUESTED'
    );
}

export type SolverOutcomeInterpretation = {
    tone: StatusTone;
    badge: string;
    title: string;
    description: string;
    applied: boolean;
    active: boolean;
    noOpApplied: boolean;
};

export function interpretSolverRun(
    run: SolverRunDto,
): SolverOutcomeInterpretation {
    if (run.status === 'QUEUED') {
        return {
            tone: 'INSUFFICIENT_DATA',
            badge: SOLVER_STATUS_LABELS.QUEUED ?? 'Trong hàng đợi',
            title: 'Đang xếp hàng chờ solver xử lý',
            description:
                'Phân công đang lưu trong bản nháp chưa bị thay đổi. Hệ thống tự theo dõi tiến trình và chỉ cập nhật khi áp dụng thành công.',
            applied: false,
            active: true,
            noOpApplied: false,
        };
    }
    if (run.status === 'RUNNING') {
        return {
            tone: 'PARTIAL',
            badge: SOLVER_STATUS_LABELS.RUNNING ?? 'Đang chạy',
            title: 'Đang tối ưu theo vector 5 mục tiêu',
            description:
                'Hệ thống đang chạy tối ưu từng bước Z → L1 → M → kinh nghiệm → thay đổi trên snapshot đã chụp.',
            applied: false,
            active: true,
            noOpApplied: false,
        };
    }
    if (run.status === 'CANCEL_REQUESTED') {
        return {
            tone: 'INSUFFICIENT_DATA',
            badge: SOLVER_STATUS_LABELS.CANCEL_REQUESTED ?? 'Đang yêu cầu hủy',
            title: 'Đã gửi yêu cầu dừng lượt chạy',
            description:
                'Hệ thống đang chờ worker dừng an toàn. Bản nháp hiện hành không bị sửa đổi.',
            applied: false,
            active: true,
            noOpApplied: false,
        };
    }
    if (run.status === 'CANCELLED') {
        return {
            tone: 'INSUFFICIENT_DATA',
            badge: SOLVER_STATUS_LABELS.CANCELLED ?? 'Đã hủy',
            title: 'Lượt chạy đã được hủy',
            description:
                'Không có ứng viên nào được ghi đè vào bản nháp. Bạn có thể chỉnh cấu hình hoặc chạy lại khi sẵn sàng.',
            applied: false,
            active: false,
            noOpApplied: false,
        };
    }
    const summary = run.summary;
    const outcome = summary?.apply_outcome ?? null;
    if (outcome === 'APPLIED') {
        const appliedRev =
            run.applied_revision_no ?? summary?.applied_revision_no ?? null;
        const noOp = appliedRev !== null && appliedRev === run.base_revision;
        return {
            tone: 'PASS',
            badge: noOp ? 'APPLIED (không đổi)' : 'APPLIED',
            title: noOp
                ? 'Phương án hiện hành đã khớp kết quả tối ưu'
                : `Đã áp dụng kết quả lên revision r${appliedRev ?? run.base_revision}`,
            description: noOp
                ? 'Không phát sinh thay đổi nào trên các dòng phân công; revision bản nháp giữ nguyên.'
                : 'Phân công, bảng tải và trạng thái kiểm tra đã được đồng bộ từ bản nháp mới nhất.',
            applied: true,
            active: false,
            noOpApplied: noOp,
        };
    }
    if (outcome === 'STALE') {
        return {
            tone: 'VIOLATION',
            badge: 'STALE',
            title: 'Bản nháp hoặc nguồn dữ liệu đã thay đổi khi chạy',
            description:
                'Hệ thống từ chối áp dụng nghiệm cũ (apply_outcome = STALE) để bảo vệ thay đổi mới hơn. Làm mới/tải lại bản hiện hành trước khi chạy lại.',
            applied: false,
            active: false,
            noOpApplied: false,
        };
    }
    if (outcome === 'NOT_DRAFT') {
        return {
            tone: 'VIOLATION',
            badge: 'NOT_DRAFT',
            title: 'Phiên bản không còn ở trạng thái nháp',
            description:
                'Phiên bản đã mở lấy ý kiến hoặc phát hành nên nghiệm từ solver không thể tự ghi đè.',
            applied: false,
            active: false,
            noOpApplied: false,
        };
    }
    if (outcome === 'REJECTED') {
        return {
            tone: 'VIOLATION',
            badge: 'REJECTED',
            title: 'Nghiệm đề xuất không vượt qua hậu kiểm khi áp dụng',
            description:
                'Bản nháp gốc được giữ nguyên do phát hiện vi phạm ràng buộc hoặc thay đổi khóa.',
            applied: false,
            active: false,
            noOpApplied: false,
        };
    }
    if (summary?.cp_sat_status === 'INFEASIBLE') {
        return {
            tone: 'VIOLATION',
            badge: 'INFEASIBLE',
            title: 'Không tồn tại phương án thỏa toàn bộ ràng buộc cứng',
            description:
                'Các khóa hiện tại, năng lực giảng dạy hoặc trần tải tuần đang làm bài toán vô nghiệm. Cần kiểm tra dữ liệu và khóa trước khi chạy lại.',
            applied: false,
            active: false,
            noOpApplied: false,
        };
    }
    if (run.status === 'FAILED' || outcome === 'FAILED') {
        return {
            tone: 'VIOLATION',
            badge: run.failure_code || 'FAILED',
            title: 'Lượt chạy gặp sự cố kỹ thuật',
            description:
                'Phân công đang lưu hoàn toàn được giữ nguyên. Kiểm tra mã lỗi và nhật ký trước khi thử lại.',
            applied: false,
            active: false,
            noOpApplied: false,
        };
    }
    return {
        tone: 'INSUFFICIENT_DATA',
        badge: summary?.cp_sat_status ?? outcome ?? run.status,
        title: 'Lượt chạy hoàn tất nhưng chưa áp dụng vào bản nháp',
        description:
            summary?.cp_sat_status === 'UNKNOWN'
                ? 'Hết thời gian tối ưu trước khi xác nhận được nghiệm khả thi; bản nháp gốc vẫn nguyên vẹn.'
                : 'Nghiệm này chưa ghi đè bản nháp hiện hành. Không dùng kết quả chưa APPLIED làm phương án chính thức.',
        applied: false,
        active: false,
        noOpApplied: false,
    };
}

export function formatRunDuration(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

export function formatDateTimeShort(iso: string | null | undefined): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export type WeeklyCapInfo = {
    limit: number | null;
    source: string | null;
    status: string | null;
    message: string | null;
};

export function extractWeeklyCap(row: WorkloadRow): WeeklyCapInfo {
    const check = row.checks.find(
        (item) =>
            item.calculation_period === 'WEEKLY' ||
            item.br_code.includes('WEEKLY'),
    );
    if (!check) {
        return { limit: null, source: null, status: null, message: null };
    }
    const rawLimit = check.details?.limit;
    const limit =
        typeof rawLimit === 'number' && Number.isFinite(rawLimit)
            ? rawLimit
            : null;
    const source =
        typeof check.details?.source === 'string' ? check.details.source : null;
    return {
        limit,
        source,
        status: check.result_status,
        message: check.message,
    };
}

export type AnnualWorkloadInfo = {
    status: string;
    current: number | null;
    limit: number | null;
    missingData: string[];
    message: string | null;
};

export function extractAnnualLoad(row: WorkloadRow): AnnualWorkloadInfo {
    const check = row.checks.find(
        (item) =>
            item.calculation_period === 'ANNUAL' ||
            item.br_code.includes('ANNUAL'),
    );
    if (!check) {
        return {
            status: 'INSUFFICIENT_DATA',
            current: null,
            limit: null,
            missingData: ['annual_workload', 'annual_limit'],
            message: null,
        };
    }
    const cur =
        typeof check.details?.annual_workload === 'number'
            ? check.details.annual_workload
            : typeof check.details?.value === 'number'
              ? check.details.value
              : null;
    const lim =
        typeof check.details?.annual_limit === 'number'
            ? check.details.annual_limit
            : typeof check.details?.limit === 'number'
              ? check.details.limit
              : null;
    return {
        status: check.result_status,
        current: cur,
        limit: lim,
        missingData: check.missing_data,
        message: check.message,
    };
}

export function summarizeWorkloadItems(items: WorkloadRow[]) {
    let balanced = 0;
    let under = 0;
    let over = 0;
    const caps = new Set<number>();
    for (const row of items) {
        const delta = row.delta_t;
        if (delta === null) {
            balanced++;
        } else if (delta > 0.001) {
            over++;
        } else if (delta < -0.001) {
            under++;
        } else {
            balanced++;
        }
        const cap = extractWeeklyCap(row).limit;
        if (cap !== null) caps.add(cap);
    }
    return {
        total: items.length,
        balanced,
        under,
        over,
        weeklyCaps: [...caps].sort((a, b) => a - b),
    };
}

export const VALIDATION_STATUS_LABELS: Record<string, string> = {
    PASS: 'Đạt',
    VIOLATION: 'Vi phạm',
    INSUFFICIENT_DATA: 'Thiếu dữ liệu',
};

export function validationStatusLabel(status: ValidationStatus): string {
    return VALIDATION_STATUS_LABELS[status] ?? status;
}

export function validationFindingRoute(finding: ValidationFinding): {
    path: string;
    label: string;
} {
    const code = finding.br_code.toUpperCase();
    if (
        code.includes('LOCK') ||
        code.includes('COVERAGE') ||
        code.includes('ASSIGN') ||
        code.includes('QUALIFICATION') ||
        code.includes('CONFLICT') ||
        code.includes('ELIGIB')
    ) {
        return { path: '/assignment', label: 'Mở bảng phân công' };
    }
    if (code.includes('WORKLOAD') || code.includes('ANNUAL')) {
        return { path: '/workload', label: 'Xem bảng tải' };
    }
    if (code.includes('DEMAND') || code.includes('APPLICAB')) {
        return { path: '/preparation', label: 'Kiểm tra chuẩn bị' };
    }
    if (finding.subject_type === 'TEACHER') {
        return { path: '/teachers', label: 'Hồ sơ giáo viên' };
    }
    return { path: '/preparation', label: 'Chuẩn bị dữ liệu' };
}

export function isReportReleasable(report: ValidationReport | null): boolean {
    if (!report || !report.fresh) return false;
    const hasBlocking = report.results.some((item) => {
        if (item.result_status === 'VIOLATION') return true;
        if (item.result_status === 'INSUFFICIENT_DATA') {
            return item.calculation_period !== 'ANNUAL';
        }
        return false;
    });
    return !hasBlocking;
}

export function formatLoadNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }
    return Number.isInteger(value)
        ? String(value)
        : String(Math.round(value * 100) / 100);
}

export function extractGradeCode(className: string): string {
    return className.match(/^\d+/)?.[0] ?? 'Khác';
}

export function buildWorkloadCsv(
    items: WorkloadRow[],
    teacherMeta?: Map<number, { code?: string; department?: string }>,
): string {
    const headers = [
        'Mã GV',
        'Giáo viên',
        'F',
        'A',
        'C',
        'R',
        'W',
        'Q',
        'T',
        'B',
        'T-B',
        'A-Q',
        'W-Q',
        'Giới hạn tuần',
        'Tải năm',
    ];
    const rows = items.map((item) => {
        const meta = teacherMeta?.get(item.teacher_id);
        const cap = extractWeeklyCap(item);
        const annual = extractAnnualLoad(item);
        const aMinusQ =
            item.q !== null ? Math.round((item.a - item.q) * 100) / 100 : null;
        const wMinusQ =
            item.q !== null ? Math.round((item.w - item.q) * 100) / 100 : null;
        return [
            meta?.code ?? `GV${item.teacher_id}`,
            item.teacher_name,
            item.f,
            item.a,
            item.c,
            item.r,
            item.w,
            item.q ?? '',
            item.t,
            item.b,
            item.delta_t ?? '',
            aMinusQ ?? '',
            wMinusQ ?? '',
            cap.limit ?? '',
            annual.current !== null && annual.limit !== null
                ? `${annual.current}/${annual.limit}`
                : 'INSUFFICIENT_DATA',
        ];
    });
    return (
        '\uFEFF' +
        [headers, ...rows]
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
                    .join(','),
            )
            .join('\r\n')
    );
}

export function buildAssignmentStatisticsCsv(rows: AssignmentRow[]): string {
    const headers = [
        'Mã lớp',
        'Môn học',
        'Loại nhu cầu',
        'Số tiết/tuần',
        'Hiệu lực từ',
        'Hiệu lực đến',
        'Giáo viên',
        'Khóa',
        'Lý do chưa gán',
    ];
    const body = rows.map((row) => [
        row.class_name,
        row.subject_name,
        row.demand_type,
        row.periods_per_week,
        row.valid_from,
        row.valid_to,
        row.teacher_name ?? 'Chưa phân công',
        row.locked ? 'Đã khóa' : 'Mở',
        row.unassigned_reason_text ?? row.unassigned_reason_code ?? '',
    ]);
    return (
        '\uFEFF' +
        [headers, ...body]
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
                    .join(','),
            )
            .join('\r\n')
    );
}
