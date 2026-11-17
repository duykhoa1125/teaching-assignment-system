import type {
    OverviewComponentType,
    OverviewPlanPhase,
} from '@/features/overview/types';

export const PHASE_LABELS: Record<OverviewPlanPhase, string> = {
    DRAFT: 'Bản nháp',
    OPEN_FOR_FEEDBACK: 'Đang lấy ý kiến',
    FEEDBACK_PROCESSING: 'Xử lý phản hồi',
    READY_TO_EXPORT: 'Sẵn sàng xuất',
    EXPORTED: 'Đã xuất',
};

export const COMPONENT_LABELS: Record<OverviewComponentType, string> = {
    STANDARD: 'Chính khóa',
    SPECIALIZED_TOPIC: 'Chuyên đề',
    ENRICHMENT: 'Tăng tiết',
};

export function formatPeriods(value: number): string {
    return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

export function clampPercent(value: number, total: number): number {
    return total ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
}
