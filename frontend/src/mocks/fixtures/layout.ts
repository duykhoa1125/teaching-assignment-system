import type { WorkspacePreview } from '../../features/workspace/types.ts';
import { overviewByContext } from './overview.ts';

const hk1 = overviewByContext.hk1!;
const hk2 = overviewByContext.hk2!;
const thcs = overviewByContext['thcs-demo']!;

export const layoutPreview: WorkspacePreview = {
    contexts: [
        {
            id: 'hk1',
            label: 'Học kỳ I · 2026–2027',
            round: hk1.round,
            school: hk1.school_name,
            assigned: hk1.summary.assigned_demands,
            total: hk1.summary.total_demands,
            feedback: hk1.summary.pending_feedback_count,
        },
        {
            id: 'hk2',
            label: 'Học kỳ II · 2026–2027',
            round: hk2.round,
            school: hk2.school_name,
            assigned: hk2.summary.assigned_demands,
            total: hk2.summary.total_demands,
            feedback: hk2.summary.pending_feedback_count,
        },
        {
            id: 'thcs-demo',
            label: 'THCS · Trải nghiệm · 2026–2027',
            round: thcs.round,
            school: thcs.school_name,
            assigned: thcs.summary.assigned_demands,
            total: thcs.summary.total_demands,
            feedback: thcs.summary.pending_feedback_count,
        },
    ],
    account: {
        name: 'Nguyễn Minh Khoa',
        email: 'quanly@tass.demo',
        role: 'Quản lý đào tạo',
        roleCode: 'Academic Manager',
    },
};
