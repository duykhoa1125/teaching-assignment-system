import { EmptyState } from '@/shared/ui/empty-state';
export function AssignmentWorkspacePage() {
    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">ĐIỀU PHỐI GIẢNG DẠY</p>
                <h1>Phân công giảng dạy</h1>
                <p>
                    Xây dựng phương án phù hợp với nhu cầu và đội ngũ nhà
                    trường.
                </p>
            </div>
            <EmptyState title="Không gian phân công đang được chuẩn bị">
                <p>
                    Các bước chọn đợt, kiểm tra dữ liệu và xây dựng phương án sẽ
                    có tại đây sau khi hoàn tất kết nối nghiệp vụ và đăng nhập.
                </p>
            </EmptyState>
        </>
    );
}
