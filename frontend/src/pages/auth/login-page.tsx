import { useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import authIllustration from '@/assets/demo/auth-illustration.png';
import { useSession } from '@/features/session/use-session';
import {
    accountPortraitSpec,
    activeHomePath,
    roleDefinitions,
} from '@/features/session/roles';
import type { AuthRole } from '@/features/session/types';
import { ApiError } from '@/shared/api/http';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import type { PrototypeIconName } from '@/shared/ui/prototype-glyphs';

const QUICK_ACCOUNTS: readonly {
    id: string;
    login: string;
    label: string;
    icon: PrototypeIconName;
}[] = [
    {
        id: 'admin',
        login: 'quantri@tass.demo',
        label: 'Quản trị',
        icon: 'shield',
    },
    {
        id: 'manager',
        login: 'quanly@tass.demo',
        label: 'Điều phối',
        icon: 'assignment',
    },
    {
        id: 'teacher',
        login: 'giaovien@tass.demo',
        label: 'Giáo viên',
        icon: 'user',
    },
];

const OTHER_ACCOUNTS: readonly {
    id: string;
    login: string;
    label: string;
    description: string;
}[] = [
    {
        id: 'dual',
        login: 'kiemnhiem@tass.demo',
        label: 'Kiêm nhiệm',
        description: 'Hai vai trò, một tài khoản',
    },
    {
        id: 'locked',
        login: 'tamkhoa@tass.demo',
        label: 'Tạm khóa',
        description: 'Trạng thái tài khoản bị khóa',
    },
    {
        id: 'unscoped',
        login: 'chuaphamvi@tass.demo',
        label: 'Chưa có phạm vi',
        description: 'Chưa được gán đơn vị quản lý',
    },
    {
        id: 'teacher-thcs',
        login: 'gvthcs@tass.demo',
        label: 'Giáo viên THCS',
        description: 'KHTN · đợt THCS trải nghiệm',
    },
];

function AuthMark() {
    return (
        <div className="auth-brand">
            <span>
                <Icon name="brand" />
            </span>
            <b>
                tass<span>.</span>
            </b>
        </div>
    );
}

export function LoginPage() {
    const {
        isMockMode,
        isAuthenticated,
        isValidatingSession,
        account,
        role,
        authView,
        authNotice,
        loginDraft,
        pendingAccount,
        setAuthNotice,
        setLoginDraft,
        resetAuthScreen,
        login,
        choosePendingRole,
    } = useSession();

    const [passwordValue, setPasswordValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    if (!isMockMode) {
        return <Navigate to="/" replace />;
    }

    if (isAuthenticated && !isValidatingSession && account) {
        return <Navigate to={activeHomePath(account, role)} replace />;
    }

    const normalizedDraft = loginDraft.trim().toLowerCase();
    const hasError = Boolean(errorMessage);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = loginDraft.trim().toLowerCase();
        setLoginDraft(trimmed);
        if (!trimmed || !passwordValue) {
            setErrorMessage('Nhập tài khoản và mật khẩu demo để tiếp tục.');
            return;
        }
        setBusy(true);
        setErrorMessage('');
        try {
            await login(trimmed, passwordValue);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(
                    error.message || 'Thông tin đăng nhập không hợp lệ.',
                );
            } else {
                setErrorMessage('Thông tin đăng nhập không hợp lệ.');
            }
        } finally {
            setBusy(false);
        }
    }

    function handleQuickAccount(presetLogin: string) {
        setLoginDraft(presetLogin);
        setPasswordValue('demo2026');
        setAuthNotice('');
        setErrorMessage('');
        resetAuthScreen();
        window.requestAnimationFrame(() => submitButtonRef.current?.focus());
    }

    function handleBackToLogin() {
        setPasswordValue('');
        setErrorMessage('');
        resetAuthScreen();
    }

    async function handleChooseRole(chosenRole: AuthRole) {
        setBusy(true);
        setErrorMessage('');
        try {
            await choosePendingRole(chosenRole);
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : 'Chưa thể mở không gian làm việc này.',
            );
        } finally {
            setBusy(false);
        }
    }

    const pendingSpec = accountPortraitSpec(pendingAccount);

    return (
        <div className="tass-shell">
            <a href="#auth-main" className="sr-only">
                Chuyển tới nội dung
            </a>
            <div className="auth-layout" data-auth-root="">
                <main className="auth-shell" id="auth-main">
                    <section
                        className="auth-story"
                        aria-label="Giới thiệu TASS"
                    >
                        <AuthMark />
                        <div className="auth-story-copy">
                            <span className="auth-story-kicker">
                                TEACHING IN BALANCE
                            </span>
                            <h2>
                                Đúng người.
                                <br />
                                Đúng nhịp.
                                <br />
                                <em>Cùng một học kỳ.</em>
                            </h2>
                            <p>
                                Một nơi để nhà trường cùng chuẩn bị,
                                <br />
                                lắng nghe và hoàn thiện phân công.
                            </p>
                        </div>
                        <figure
                            className="auth-illustration"
                            aria-label="Giáo viên cùng chuẩn bị kế hoạch giảng dạy"
                        >
                            <img
                                src={authIllustration}
                                alt="Ba giáo viên cùng sắp xếp kế hoạch học kỳ quanh bàn làm việc."
                                width={1536}
                                height={1024}
                                decoding="async"
                            />
                        </figure>
                        <div className="auth-story-foot">
                            <span>01 / KẾT NỐI ĐỘI NGŨ</span>
                            <span>TASS STUDIO</span>
                        </div>
                    </section>

                    <section className="auth-entry">
                        <div className="auth-mobile-brand">
                            <AuthMark />
                            <img
                                className="auth-mobile-illustration"
                                src={authIllustration}
                                alt=""
                                width={1536}
                                height={1024}
                            />
                        </div>

                        <div className="auth-form-wrap">
                            {authView === 'locked' ? (
                                <>
                                    <div className="auth-status-mark">
                                        <Icon name="lock" />
                                    </div>
                                    <div className="auth-form-heading">
                                        <div className="eyebrow">
                                            TRUY CẬP TẠM DỪNG
                                        </div>
                                        <h1>
                                            Tài khoản đang
                                            <br />
                                            được tạm khóa.
                                        </h1>
                                        <p>
                                            Liên hệ quản trị viên nhà trường để
                                            được kiểm tra và hỗ trợ mở lại tài
                                            khoản.
                                        </p>
                                    </div>
                                    <div className="auth-support">
                                        <Icon name="mail" />
                                        <div>
                                            <strong>
                                                Quản trị THPT An Hòa
                                            </strong>
                                            <small>
                                                Cung cấp tên tài khoản khi cần
                                                hỗ trợ.
                                            </small>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn primary auth-submit"
                                        data-auth="back-login"
                                        onClick={handleBackToLogin}
                                    >
                                        Dùng tài khoản khác{' '}
                                        <Icon name="arrow" />
                                    </button>
                                    <p className="auth-local-note">
                                        Trạng thái này được mô phỏng bằng tài
                                        khoản trải nghiệm.
                                    </p>
                                </>
                            ) : authView === 'choose' && pendingAccount ? (
                                <>
                                    <div className="auth-form-heading">
                                        <div className="eyebrow">
                                            MỘT TÀI KHOẢN / NHIỀU VAI TRÒ
                                        </div>
                                        <h1>
                                            Bạn muốn làm việc
                                            <br />ở không gian nào?
                                        </h1>
                                        <p className="auth-selected-person">
                                            <PortraitAvatar
                                                portraitKey={
                                                    pendingSpec.portraitKey
                                                }
                                                colorIndex={
                                                    pendingSpec.colorIndex
                                                }
                                            />
                                            <span>
                                                {pendingAccount.name} ·{' '}
                                                {pendingAccount.login}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="auth-role-choices">
                                        {pendingAccount.roles.map((roleKey) => {
                                            const r = roleDefinitions[roleKey];
                                            return (
                                                <button
                                                    key={roleKey}
                                                    type="button"
                                                    data-auth-enter={roleKey}
                                                    disabled={busy}
                                                    onClick={() =>
                                                        void handleChooseRole(
                                                            roleKey,
                                                        )
                                                    }
                                                >
                                                    <span className="auth-role-symbol">
                                                        <Icon name={r.icon} />
                                                    </span>
                                                    <span className="grow">
                                                        <strong>
                                                            {r.label}
                                                        </strong>
                                                        <small>{r.name}</small>
                                                        <p>{r.description}</p>
                                                    </span>
                                                    <Icon name="arrow" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="auth-error" role="alert">
                                        {errorMessage}
                                    </div>
                                    <div className="auth-role-note">
                                        Mỗi không gian chỉ hiển thị các chức
                                        năng của vai trò đang chọn.
                                    </div>
                                    <button
                                        type="button"
                                        className="btn ghost auth-back"
                                        data-auth="back-login"
                                        onClick={handleBackToLogin}
                                    >
                                        <Icon name="arrow" /> Dùng tài khoản
                                        khác
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="auth-form-heading">
                                        <div className="eyebrow">
                                            THPT AN HÒA / 2026–2027
                                        </div>
                                        <h1>Chào mừng trở lại.</h1>
                                        <p>
                                            Một tài khoản, đúng không gian làm
                                            việc.
                                        </p>
                                    </div>

                                    {authNotice ? (
                                        <div
                                            className="auth-notice"
                                            role="status"
                                        >
                                            <Icon name="check" />
                                            <span>{authNotice}</span>
                                        </div>
                                    ) : null}

                                    <form
                                        id="demo-login-form"
                                        noValidate
                                        onSubmit={(event) =>
                                            void handleSubmit(event)
                                        }
                                    >
                                        <label
                                            className="field"
                                            htmlFor="auth-login"
                                        >
                                            Tài khoản demo
                                            <input
                                                id="auth-login"
                                                name="login"
                                                autoComplete="username"
                                                spellCheck={false}
                                                inputMode="email"
                                                placeholder="quanly@tass.demo"
                                                value={loginDraft}
                                                onChange={(event) => {
                                                    setLoginDraft(
                                                        event.target.value,
                                                    );
                                                    if (errorMessage) {
                                                        setErrorMessage('');
                                                    }
                                                }}
                                                aria-invalid={
                                                    hasError
                                                        ? 'true'
                                                        : undefined
                                                }
                                                aria-describedby={
                                                    hasError
                                                        ? 'auth-error'
                                                        : undefined
                                                }
                                                required
                                            />
                                        </label>

                                        <label
                                            className="field"
                                            htmlFor="auth-password"
                                        >
                                            Mật khẩu demo
                                            <span className="auth-password">
                                                <input
                                                    id="auth-password"
                                                    name="password"
                                                    type={
                                                        showPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    autoComplete="off"
                                                    placeholder="Nhập mật khẩu demo"
                                                    value={passwordValue}
                                                    onChange={(event) => {
                                                        setPasswordValue(
                                                            event.target.value,
                                                        );
                                                        if (errorMessage) {
                                                            setErrorMessage('');
                                                        }
                                                    }}
                                                    aria-invalid={
                                                        hasError
                                                            ? 'true'
                                                            : undefined
                                                    }
                                                    aria-describedby={
                                                        hasError
                                                            ? 'auth-error'
                                                            : undefined
                                                    }
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="icon-btn"
                                                    data-auth="password"
                                                    aria-label={
                                                        showPassword
                                                            ? 'Ẩn mật khẩu demo'
                                                            : 'Hiện mật khẩu demo'
                                                    }
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (prev) => !prev,
                                                        )
                                                    }
                                                >
                                                    <Icon name="eye" />
                                                </button>
                                            </span>
                                        </label>

                                        <div
                                            className="auth-error"
                                            id="auth-error"
                                            role="alert"
                                        >
                                            {errorMessage}
                                        </div>

                                        <button
                                            ref={submitButtonRef}
                                            className="btn primary auth-submit"
                                            type="submit"
                                            disabled={busy}
                                        >
                                            Đăng nhập <Icon name="arrow" />
                                        </button>
                                    </form>

                                    <div className="auth-divider">
                                        <span>Chọn nhanh tài khoản</span>
                                    </div>

                                    <div className="auth-quick">
                                        {QUICK_ACCOUNTS.map((preset) => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                data-auth-account={preset.id}
                                                className={
                                                    normalizedDraft ===
                                                    preset.login
                                                        ? 'selected'
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    handleQuickAccount(
                                                        preset.login,
                                                    )
                                                }
                                            >
                                                <Icon name={preset.icon} />
                                                <span>{preset.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="auth-demo-hint">
                                        <span>
                                            Mật khẩu chung:{' '}
                                            <b className="mono">demo2026</b>
                                        </span>
                                        <span>Chọn tài khoản để điền sẵn.</span>
                                    </div>

                                    <details className="auth-other">
                                        <summary>
                                            Các tài khoản trải nghiệm khác{' '}
                                            <Icon name="down" />
                                        </summary>
                                        <div>
                                            {OTHER_ACCOUNTS.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    data-auth-account={
                                                        preset.id
                                                    }
                                                    onClick={() =>
                                                        handleQuickAccount(
                                                            preset.login,
                                                        )
                                                    }
                                                >
                                                    <strong>
                                                        {preset.label}
                                                    </strong>
                                                    <small>
                                                        {preset.description}
                                                    </small>
                                                    <Icon name="arrow" />
                                                </button>
                                            ))}
                                        </div>
                                    </details>

                                    <p className="auth-local-note">
                                        <Icon name="shield" />
                                        Đăng nhập mô phỏng trong bản HTML. Không
                                        dùng mật khẩu thật.
                                    </p>
                                </>
                            )}
                        </div>

                        <footer className="auth-footer">
                            <span>
                                Không gian trải nghiệm · Dữ liệu minh họa
                            </span>
                            <span>© 2026 TASS</span>
                        </footer>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default LoginPage;
