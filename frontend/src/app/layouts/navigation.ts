import type { PrototypeIconName } from '@/shared/ui/prototype-glyphs';

export type NavigationItem = {
    path: string;
    label: string;
    icon: PrototypeIconName;
    group?: string;
    count?: 'unassigned' | 'feedback';
};
export const navigation: NavigationItem[] = [
    { path: '/', label: 'Tổng quan', icon: 'dashboard' },
    {
        path: '/preparation',
        label: 'Chuẩn bị dữ liệu',
        icon: 'layers',
        group: 'Kế hoạch giảng dạy',
    },
    {
        path: '/assignment',
        label: 'Phân công',
        icon: 'assignment',
        count: 'unassigned',
    },
    { path: '/demands', label: 'Nhu cầu giảng dạy', icon: 'book' },
    { path: '/checks', label: 'Trung tâm kiểm tra', icon: 'shield' },
    { path: '/solver-runs', label: 'Lượt sinh đề xuất', icon: 'spark' },
    {
        path: '/teachers',
        label: 'Hồ sơ & năng lực',
        icon: 'teachers',
        group: 'Đội ngũ & trao đổi',
    },
    { path: '/workload', label: 'Tải & định mức', icon: 'balance' },
    { path: '/statistics', label: 'Thống kê', icon: 'chart' },
    {
        path: '/feedback',
        label: 'Phản hồi',
        icon: 'feedback',
        count: 'feedback',
    },
    {
        path: '/history',
        label: 'Lịch sử phiên bản',
        icon: 'history',
        group: 'Theo dõi & lưu trữ',
    },
    { path: '/documents', label: 'Tài liệu đã phát hành', icon: 'file' },
    { path: '/sources', label: 'Nguồn & đối soát', icon: 'compare' },
];
export function pageTitle(pathname: string) {
    return (
        navigation.find((item) => item.path === pathname)?.label ??
        (pathname === '/settings'
            ? 'Hồ sơ & cài đặt'
            : pathname === '/dev/ui'
              ? 'Thư viện giao diện'
              : 'Không tìm thấy trang')
    );
}
