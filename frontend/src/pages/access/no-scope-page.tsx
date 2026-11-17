import { StateIllustration } from '@/shared/ui/state-illustration';
import { useNavigate } from 'react-router';
import { useSession } from '@/features/session/use-session';

export function NoScopePage() {
    const navigate = useNavigate();
    const { isMockMode, setModal, logout } = useSession();

    return (
        <section className="access-state">
            <span className="access-code">PHẠM VI / CHƯA ĐƯỢC CẤP</span>
            <StateIllustration kind="scope" />
            <h1>
                Tài khoản đã sẵn sàng. <br />
                Cần thêm phạm vi làm việc.
            </h1>
            <p>
                Tài khoản của bạn chưa được gán đơn vị quản lý. Liên hệ quản trị
                viên để được cấp đúng phạm vi trước khi truy cập dữ liệu nhà
                trường.
            </p>
            <div className="access-actions">
                <button
                    type="button"
                    className="btn primary"
                    onClick={() => setModal('profile')}
                >
                    Xem thông tin tài khoản
                </button>
                <button
                    type="button"
                    className="btn"
                    onClick={() => {
                        if (isMockMode) {
                            void logout('logout');
                        } else {
                            navigate('/');
                        }
                    }}
                >
                    Dùng tài khoản khác
                </button>
            </div>
        </section>
    );
}
