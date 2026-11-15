import { Link } from 'react-router';
import { EmptyState } from '@/shared/ui/empty-state';
export function NotFoundPage() {
    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">404</p>
                <h1>Không tìm thấy trang</h1>
            </div>
            <EmptyState
                title="Đường dẫn không tồn tại"
                action={
                    <Link className="button" to="/">
                        Về tổng quan
                    </Link>
                }
            >
                <p>
                    Đường dẫn này không tồn tại. Bạn có thể quay lại tổng quan
                    để tiếp tục.
                </p>
            </EmptyState>
        </>
    );
}
