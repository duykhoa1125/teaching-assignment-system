import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PropsWithChildren,
} from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { subscribeToastClear } from './toast-bus';
import { ToastContext, type ToastMessage } from './toast-context';
import { Icon } from './icon';
import styles from './toast.module.css';

const DEFAULT_TOAST_DURATION_MS = 4200;

export function ToastProvider({ children }: PropsWithChildren) {
    const [messages, setMessages] = useState<(ToastMessage & { id: number })[]>(
        [],
    );
    const nextId = useRef(0);
    const timersRef = useRef<Map<number, number>>(new Map());

    const clearAll = useCallback(() => {
        for (const handle of timersRef.current.values()) {
            window.clearTimeout(handle);
        }
        timersRef.current.clear();
        setMessages([]);
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToastClear(clearAll);
        return () => {
            unsubscribe();
            clearAll();
        };
    }, [clearAll]);

    const dismiss = useCallback((id: number) => {
        const handle = timersRef.current.get(id);
        if (handle !== undefined) {
            window.clearTimeout(handle);
            timersRef.current.delete(id);
        }
        setMessages((current) => current.filter((item) => item.id !== id));
    }, []);

    const notify = useCallback((message: ToastMessage) => {
        const id = ++nextId.current;
        const duration =
            message.durationMs === undefined
                ? DEFAULT_TOAST_DURATION_MS
                : message.durationMs;
        setMessages((current) => [...current.slice(-3), { ...message, id }]);
        if (
            duration !== null &&
            duration > 0 &&
            typeof window !== 'undefined'
        ) {
            const handle = window.setTimeout(() => {
                timersRef.current.delete(id);
                setMessages((current) =>
                    current.filter((item) => item.id !== id),
                );
            }, duration);
            timersRef.current.set(id, handle);
        }
    }, []);
    return (
        <ToastContext value={notify}>
            {children}
            <div className={styles.stack} aria-label="Thông báo">
                {messages.map(({ id, title, description, tone = 'info' }) => (
                    <div key={id} className={`${styles.toast} ${styles[tone]}`}>
                        <Icon
                            glyph={
                                tone === 'success'
                                    ? CircleCheck
                                    : tone === 'error'
                                      ? CircleAlert
                                      : Info
                            }
                            size={20}
                        />
                        <div role={tone === 'error' ? 'alert' : 'status'}>
                            <strong>{title}</strong>
                            {description && <p>{description}</p>}
                        </div>
                        <button
                            type="button"
                            aria-label={`Đóng thông báo: ${title}`}
                            onClick={() => dismiss(id)}
                        >
                            <Icon glyph={X} size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext>
    );
}
