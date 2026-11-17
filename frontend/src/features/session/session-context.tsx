import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type PropsWithChildren,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/http';
import { clearActiveToasts } from '@/shared/ui/toast-bus';
import { useToast } from '@/shared/ui/toast-context';
import { readWorkspacePreview } from '@/features/workspace/api';
import type { WorkspaceContext } from '@/features/workspace/types';
import { sessionApi } from './api';
import { useMockSessionQuery } from './queries';
import {
    activeHomePath,
    AUTH_CHECK_INTERVAL_MS,
    AUTH_IDLE_MS,
    AUTH_TOUCH_THROTTLE_MS,
    isSessionRecordValid,
    roleAllowsPath,
    roleDefinitions,
} from './roles';
import {
    clearStoredSession,
    readStoredContextId,
    readStoredSession,
    subscribeMockReset,
    writeStoredContextId,
    writeStoredSession,
} from './storage';
import type {
    AuthAccount,
    AuthRole,
    ForbiddenTarget,
    LoginResponse,
    MockSessionRecord,
} from './types';
import {
    SessionContext,
    type AuthScreenView,
    type SessionContextValue,
} from './use-session';

const IS_MOCK_MODE = import.meta.env.VITE_DATA_SOURCE === 'mock';

function readInitialMockState(): {
    session: MockSessionRecord | null;
    notice: string;
    draft: string;
    contextId: string;
} {
    if (!IS_MOCK_MODE) {
        return { session: null, notice: '', draft: '', contextId: 'hk1' };
    }
    const stored = readStoredSession();
    const contextId = readStoredContextId();
    if (!stored) {
        return { session: null, notice: '', draft: '', contextId };
    }
    const now = Date.now();
    if (
        !Number.isFinite(stored.lastActivity) ||
        stored.lastActivity > now + 5000 ||
        now - stored.lastActivity >= AUTH_IDLE_MS
    ) {
        clearStoredSession();
        return {
            session: null,
            notice: 'Phiên làm việc đã hết hạn. Đăng nhập lại để tiếp tục.',
            draft: '',
            contextId,
        };
    }
    return { session: stored, notice: '', draft: '', contextId };
}

export function SessionProvider({ children }: PropsWithChildren) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const client = useQueryClient();
    const notify = useToast();

    const initial = useMemo(() => readInitialMockState(), []);
    const [session, setSession] = useState<MockSessionRecord | null>(
        initial.session,
    );
    const [optimisticAccount, setOptimisticAccount] =
        useState<AuthAccount | null>(null);
    const [preloadedContexts, setPreloadedContexts] = useState<
        WorkspaceContext[]
    >([]);
    const [contextId, setContextId] = useState<string>(initial.contextId);
    const [authView, setAuthView] = useState<AuthScreenView>('login');
    const [authNotice, setAuthNotice] = useState<string>(initial.notice);
    const [loginDraft, setLoginDraft] = useState<string>(initial.draft);
    const [pendingAccount, setPendingAccount] = useState<AuthAccount | null>(
        null,
    );
    const [deniedTarget, setDeniedTarget] = useState<ForbiddenTarget | null>(
        null,
    );
    const [modal, setModal] = useState<SessionContextValue['modal']>(null);

    const lastWriteRef = useRef<number>(0);
    const loggingOutRef = useRef<boolean>(false);

    const sessionQuery = useMockSessionQuery(
        session?.accountId ?? null,
        session?.role ?? null,
        contextId,
        IS_MOCK_MODE && Boolean(session),
    );

    const account =
        IS_MOCK_MODE && session
            ? (sessionQuery.data?.account ?? optimisticAccount)
            : null;
    const contexts = sessionQuery.data?.contexts ?? preloadedContexts;

    // Preload mock layout contexts even before login or when on /dev/ui.
    useEffect(() => {
        if (!IS_MOCK_MODE || preloadedContexts.length > 0) return;
        let cancelled = false;
        void readWorkspacePreview()
            .then((preview) => {
                if (!cancelled) setPreloadedContexts(preview.contexts);
            })
            .catch(() => {
                // Handled gracefully when layout or session reloads.
            });
        return () => {
            cancelled = true;
        };
    }, [preloadedContexts.length]);

    const clearBusinessQueries = useCallback(async () => {
        await client.cancelQueries();
        client.removeQueries({
            predicate: (query) =>
                query.queryKey[0] !== 'mock-layout' &&
                query.queryKey[0] !== 'mock-session',
        });
    }, [client]);

    const logout = useCallback(
        async (reason: 'logout' | 'expired' = 'logout') => {
            if (!IS_MOCK_MODE || loggingOutRef.current) return;
            loggingOutRef.current = true;
            try {
                if (account?.login) setLoginDraft(account.login);
                clearActiveToasts();
                setModal(null);
                setPendingAccount(null);
                setDeniedTarget(null);
                clearStoredSession();
                setSession(null);
                setOptimisticAccount(null);
                setAuthView('login');
                setAuthNotice(
                    reason === 'expired'
                        ? 'Phiên làm việc đã hết hạn. Dữ liệu đã lưu vẫn được giữ. Đăng nhập lại để tiếp tục.'
                        : 'Bạn đã đăng xuất khỏi TASS.',
                );
                await clearBusinessQueries();
                void sessionApi.logout().catch(() => {});
                if (pathname !== '/dev/ui') {
                    navigate('/login', { replace: true });
                }
            } finally {
                loggingOutRef.current = false;
            }
        },
        [account?.login, clearBusinessQueries, navigate, pathname],
    );

    // Handle 401 or invalidated account/role from /api/mock/session without locking /dev/ui.
    useEffect(() => {
        if (!IS_MOCK_MODE) return;
        const err = sessionQuery.error;
        if (err instanceof ApiError && err.status === 401) {
            void logout('expired');
            return;
        }
        if (
            session &&
            sessionQuery.data &&
            !isSessionRecordValid(
                session,
                sessionQuery.data.account,
                Date.now(),
            )
        ) {
            void logout('expired');
        }
    }, [sessionQuery.error, sessionQuery.data, session, logout]);

    // Touch session on user activity (throttled 15s) and expire after 30 minutes idle.
    useEffect(() => {
        if (!IS_MOCK_MODE || !session) return;
        if (!lastWriteRef.current) lastWriteRef.current = Date.now();
        const touch = () => {
            const now = Date.now();
            if (
                !Number.isFinite(session.lastActivity) ||
                now - session.lastActivity >= AUTH_IDLE_MS
            ) {
                void logout('expired');
                return;
            }
            if (now - lastWriteRef.current > AUTH_TOUCH_THROTTLE_MS) {
                const updated: MockSessionRecord = {
                    ...session,
                    lastActivity: now,
                };
                writeStoredSession(updated);
                lastWriteRef.current = now;
                setSession(updated);
            }
        };
        const checkExpiry = () => {
            const stored = readStoredSession() ?? session;
            if (
                !stored ||
                !Number.isFinite(stored.lastActivity) ||
                Date.now() - stored.lastActivity >= AUTH_IDLE_MS
            ) {
                void logout('expired');
            }
        };
        const onVisibility = () => {
            if (!document.hidden) checkExpiry();
        };
        document.addEventListener('pointerdown', touch, true);
        document.addEventListener('keydown', touch, true);
        document.addEventListener('visibilitychange', onVisibility);
        const timer = window.setInterval(checkExpiry, AUTH_CHECK_INTERVAL_MS);
        return () => {
            document.removeEventListener('pointerdown', touch, true);
            document.removeEventListener('keydown', touch, true);
            document.removeEventListener('visibilitychange', onVisibility);
            window.clearInterval(timer);
        };
    }, [session, logout]);

    // Subscribe to /dev/ui "Reset mock" so session + context reset in sync with mockStore.
    useEffect(() => {
        if (!IS_MOCK_MODE) return;
        return subscribeMockReset(() => {
            setModal(null);
            setPendingAccount(null);
            setDeniedTarget(null);
            setSession(null);
            setOptimisticAccount(null);
            setContextId('hk1');
            setAuthView('login');
            setAuthNotice('');
            setLoginDraft('');
        });
    }, []);

    const applyAuthenticated = useCallback(
        async (
            nextAccount: AuthAccount,
            nextSession: MockSessionRecord,
            redirectHome = true,
        ) => {
            writeStoredSession(nextSession);
            lastWriteRef.current = Date.now();
            setOptimisticAccount(nextAccount);
            setSession(nextSession);
            setPendingAccount(null);
            setDeniedTarget(null);
            setAuthView('login');
            setAuthNotice('');
            setModal(null);
            await clearBusinessQueries();
            if (redirectHome) {
                navigate(activeHomePath(nextAccount, nextSession.role), {
                    replace: true,
                });
            }
        },
        [clearBusinessQueries, navigate],
    );

    const login = useCallback(
        async (rawLogin: string, password: string): Promise<LoginResponse> => {
            const result = await sessionApi.login({
                login: rawLogin,
                password,
            });
            setLoginDraft(rawLogin.trim().toLowerCase());
            if (result.status === 'locked') {
                setPendingAccount(null);
                setAuthView('locked');
                setAuthNotice('');
                return result;
            }
            if (result.status === 'choose_role') {
                setPendingAccount(result.account);
                setAuthView('choose');
                setAuthNotice('');
                return result;
            }
            await applyAuthenticated(result.account, result.session, true);
            return result;
        },
        [applyAuthenticated],
    );

    const choosePendingRole = useCallback(
        async (targetRole: AuthRole) => {
            if (!pendingAccount) return;
            const result = await sessionApi.selectRole({
                accountId: pendingAccount.id,
                role: targetRole,
            });
            if (result.status === 'authenticated') {
                await applyAuthenticated(result.account, result.session, true);
            }
        },
        [applyAuthenticated, pendingAccount],
    );

    const switchRole = useCallback(
        async (targetRole: AuthRole) => {
            if (!session || !account) return;
            if (!account.roles.includes(targetRole)) {
                setModal(null);
                setDeniedTarget({
                    title: roleDefinitions[targetRole].label,
                    requestedRole: targetRole,
                });
                navigate('/forbidden');
                return;
            }
            const result = await sessionApi.selectRole({
                accountId: account.id,
                role: targetRole,
            });
            if (result.status === 'authenticated') {
                await applyAuthenticated(result.account, result.session, true);
            }
        },
        [account, applyAuthenticated, navigate, session],
    );

    const switchContext = useCallback(
        async (nextContextId: string) => {
            if (nextContextId === contextId) return;
            await clearBusinessQueries();
            if (IS_MOCK_MODE) writeStoredContextId(nextContextId);
            setContextId(nextContextId);
            setModal(null);
            const activeRole: AuthRole = session?.role ?? 'manager';
            if (IS_MOCK_MODE && account && session) {
                const target = roleAllowsPath(activeRole, pathname)
                    ? pathname === '/teachers' ||
                      pathname === '/' ||
                      pathname.startsWith('/admin') ||
                      pathname.startsWith('/teacher')
                        ? activeHomePath(account, activeRole)
                        : pathname
                    : activeHomePath(account, activeRole);
                if (pathname !== target) {
                    navigate(target);
                }
            }
            const found = contexts.find((c) => c.id === nextContextId);
            if (found) {
                notify({
                    title: `Đã chuyển sang ${found.label}.`,
                    tone: 'info',
                });
            }
        },
        [
            account,
            clearBusinessQueries,
            contextId,
            contexts,
            navigate,
            notify,
            pathname,
            session,
        ],
    );

    const triggerForbidden = useCallback(
        (target: ForbiddenTarget) => {
            setModal(null);
            setDeniedTarget(target);
            navigate('/forbidden');
        },
        [navigate],
    );

    const resetAuthScreen = useCallback(() => {
        setAuthView('login');
        setPendingAccount(null);
        setAuthNotice('');
    }, []);

    const activeRole: AuthRole = IS_MOCK_MODE
        ? (session?.role ?? 'manager')
        : 'manager';
    const activeContext = contexts.find((item) => item.id === contextId);
    const isAuthenticated = IS_MOCK_MODE ? Boolean(session) : true;
    const isValidatingSession =
        IS_MOCK_MODE && Boolean(session) && sessionQuery.isPending && !account;

    const value = useMemo<SessionContextValue>(
        () => ({
            isMockMode: IS_MOCK_MODE,
            session,
            account,
            role: activeRole,
            contexts,
            contextId,
            activeContext,
            isAuthenticated,
            isValidatingSession,
            authView,
            authNotice,
            loginDraft,
            pendingAccount,
            deniedTarget,
            setAuthNotice,
            setLoginDraft,
            resetAuthScreen,
            login,
            choosePendingRole,
            switchRole,
            logout,
            switchContext,
            triggerForbidden,
            modal,
            setModal,
        }),
        [
            session,
            account,
            activeRole,
            contexts,
            contextId,
            activeContext,
            isAuthenticated,
            isValidatingSession,
            authView,
            authNotice,
            loginDraft,
            pendingAccount,
            deniedTarget,
            resetAuthScreen,
            login,
            choosePendingRole,
            switchRole,
            logout,
            switchContext,
            triggerForbidden,
            modal,
        ],
    );

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}
