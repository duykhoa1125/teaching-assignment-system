import { useLocation } from 'react-router';
import { pageTitle } from '@/app/layouts/navigation';
import { EmptyState } from '@/shared/ui/empty-state';

export function LayoutPlaceholder() {
    const { pathname } = useLocation();
    return (
        <>
            <div className="page-heading">
                <div>
                    <div className="eyebrow">KHÔNG GIAN ĐIỀU PHỐI</div>
                    <h1>{pageTitle(pathname)}</h1>
                    <p className="subtitle">
                        Không gian làm việc của nhà trường.
                    </p>
                </div>
            </div>
            <EmptyState title="Màn hình đang được chuẩn bị">
                <p>
                    Khung điều hướng đã sẵn sàng. Nội dung và thao tác của màn
                    hình này sẽ được hoàn thiện ở bước tiếp theo.
                </p>
            </EmptyState>
        </>
    );
}
