import { createContext, useContext } from 'react';

export type ToastMessage = {
    title: string;
    description?: string;
    tone?: 'success' | 'error' | 'info';
};
export const ToastContext = createContext<
    ((message: ToastMessage) => void) | null
>(null);
export function useToast() {
    const notify = useContext(ToastContext);
    if (!notify) throw new Error('useToast cần nằm trong ToastProvider.');
    return notify;
}
