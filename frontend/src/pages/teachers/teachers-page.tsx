import { EmptyState } from '@/shared/ui/empty-state';
export function TeachersPage() {
    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">DỮ LIỆU NHÀ TRƯỜNG</p>
                <h1>Giáo viên</h1>
                <p>Thông tin đội ngũ và nền tảng cho phân công giảng dạy.</p>
            </div>
            <EmptyState title="Chưa kết nối danh sách giáo viên">
                <p>
                    Màn hình quản lý giáo viên đang được phát triển. Danh sách
                    và các thao tác cập nhật sẽ được bổ sung trong bước tiếp
                    theo.
                </p>
            </EmptyState>
        </>
    );
}
