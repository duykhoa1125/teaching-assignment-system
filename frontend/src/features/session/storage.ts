import { clearActiveToasts } from '../../shared/ui/toast-bus.ts';
import { isAuthRole } from './roles.ts';
import type { MockSessionRecord } from './types.ts';

export const AUTH_STORAGE_KEY = 'tass-demo-session-v1';
export const CONTEXT_STORAGE_KEY = 'tass-demo-context-v1';

const DEFAULT_CONTEXT_ID = 'hk1';

function getStorage(): Storage | null {
    try {
        return typeof window !== 'undefined' ? window.sessionStorage : null;
    } catch {
        return null;
    }
}

export function readStoredSession(): MockSessionRecord | null {
    const storage = getStorage();
    if (!storage) return null;
    try {
        const raw = storage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Record<string, unknown> | null;
        if (
            !parsed ||
            typeof parsed.accountId !== 'string' ||
            !isAuthRole(parsed.role) ||
            typeof parsed.lastActivity !== 'number' ||
            !Number.isFinite(parsed.lastActivity)
        ) {
            return null;
        }
        return {
            accountId: parsed.accountId,
            role: parsed.role,
            lastActivity: parsed.lastActivity,
        };
    } catch {
        return null;
    }
}

export function writeStoredSession(session: MockSessionRecord): boolean {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        return true;
    } catch {
        return false;
    }
}

export function clearStoredSession(): void {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.removeItem(AUTH_STORAGE_KEY);
    } catch {
        // Ignore blocked storage.
    }
}

export function readStoredContextId(): string {
    const storage = getStorage();
    if (!storage) return DEFAULT_CONTEXT_ID;
    try {
        const value = storage.getItem(CONTEXT_STORAGE_KEY);
        return value && ['hk1', 'hk2', 'thcs-demo'].includes(value)
            ? value
            : DEFAULT_CONTEXT_ID;
    } catch {
        return DEFAULT_CONTEXT_ID;
    }
}

export function writeStoredContextId(contextId: string): boolean {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.setItem(CONTEXT_STORAGE_KEY, contextId);
        return true;
    } catch {
        return false;
    }
}

export function clearStoredContextId(): void {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.removeItem(CONTEXT_STORAGE_KEY);
    } catch {
        // Ignore blocked storage.
    }
}

const resetListeners = new Set<() => void>();

export function subscribeMockReset(listener: () => void): () => void {
    resetListeners.add(listener);
    return () => resetListeners.delete(listener);
}

export function resetMockClientSession(): void {
    clearActiveToasts();
    clearStoredSession();
    clearStoredContextId();
    for (const listener of resetListeners) {
        listener();
    }
}
