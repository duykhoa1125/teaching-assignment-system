import { createContext, useContext } from 'react';
import type { WorkspaceContext } from '@/features/workspace/types';
import type {
    AuthAccount,
    AuthRole,
    ForbiddenTarget,
    LoginResponse,
    MockSessionRecord,
} from './types';

export type AuthScreenView = 'login' | 'choose' | 'locked';

export type SessionContextValue = {
    isMockMode: boolean;
    session: MockSessionRecord | null;
    account: AuthAccount | null;
    role: AuthRole;
    contexts: WorkspaceContext[];
    contextId: string;
    activeContext: WorkspaceContext | undefined;
    isAuthenticated: boolean;
    isValidatingSession: boolean;
    authView: AuthScreenView;
    authNotice: string;
    loginDraft: string;
    pendingAccount: AuthAccount | null;
    deniedTarget: ForbiddenTarget | null;
    setAuthNotice: (message: string) => void;
    setLoginDraft: (value: string) => void;
    resetAuthScreen: () => void;
    login: (login: string, password: string) => Promise<LoginResponse>;
    choosePendingRole: (role: AuthRole) => Promise<void>;
    switchRole: (role: AuthRole) => Promise<void>;
    logout: (reason?: 'logout' | 'expired') => Promise<void>;
    switchContext: (nextContextId: string) => Promise<void>;
    triggerForbidden: (target: ForbiddenTarget) => void;
    modal:
        | 'profile'
        | 'session'
        | 'permissions'
        | 'switcher'
        | 'search'
        | 'notifications'
        | null;
    setModal: (
        modal:
            | 'profile'
            | 'session'
            | 'permissions'
            | 'switcher'
            | 'search'
            | 'notifications'
            | null,
    ) => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession phải được dùng trong SessionProvider.');
    }
    return context;
}
