import type { WorkspacePreview } from '../../features/workspace/types.ts';

export const layoutPreview: WorkspacePreview = {
    contexts: [
        {
            id: 'hk1',
            label: 'Học kỳ I · 2026–2027',
            round: 'PC-01',
            school: 'THPT An Hòa',
            assigned: 28,
            total: 36,
            feedback: 2,
        },
        {
            id: 'hk2',
            label: 'Học kỳ II · 2026–2027',
            round: 'PC-02',
            school: 'THPT An Hòa',
            assigned: 0,
            total: 36,
            feedback: 0,
        },
        {
            id: 'thcs-demo',
            label: 'THCS · Trải nghiệm · 2026–2027',
            round: 'PC-THCS',
            school: 'THPT An Hòa',
            assigned: 0,
            total: 0,
            feedback: 0,
        },
    ],
    account: {
        name: 'Nguyễn Minh Khoa',
        email: 'quanly@tass.demo',
        role: 'Quản lý đào tạo',
        roleCode: 'Academic Manager',
    },
};
