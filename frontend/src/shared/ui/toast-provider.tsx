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

type ActiveToast = ToastMessage & { id: number };

function ToastItem({
    message: { id, title, description, tone = 'info', durationMs },
    dismiss,
}: {
    message: ActiveToast;
    dismiss: (id: number) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const remaining = useRef(
        durationMs === undefined
            ? tone === 'error' && description
                ? 8000
                : 4200
            : durationMs,
    );

    useEffect(() => {
        if (
            hovered ||
            focused ||
            remaining.current === null ||
            remaining.current <= 0
        )
            return;
        const started = performance.now();
        const timer = window.setTimeout(() => dismiss(id), remaining.current);
        return () => {
            window.clearTimeout(timer);
            if (remaining.current !== null)
                remaining.current = Math.max(
                    1,
                    remaining.current - (performance.now() - started),
                );
        };
    }, [dismiss, focused, hovered, id]);

    return (
        <div
            className={`${styles.toast} ${styles[tone] ?? ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setFocused(false);
            }}
        >
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
    );
}

export function ToastProvider({ children }: PropsWithChildren) {
    const [messages, setMessages] = useState<ActiveToast[]>([]);
    const nextId = useRef(0);
    const clearAll = useCallback(() => setMessages([]), []);
    useEffect(() => subscribeToastClear(clearAll), [clearAll]);
    const dismiss = useCallback((id: number) => {
        setMessages((current) => current.filter((item) => item.id !== id));
    }, []);
    const notify = useCallback((message: ToastMessage) => {
        const id = ++nextId.current;
        setMessages((current) => [...current.slice(-3), { ...message, id }]);
    }, []);
    return (
        <ToastContext value={notify}>
            {children}
            <div className={styles.stack} aria-label="Thông báo">
                {messages.map((message) => (
                    <ToastItem
                        key={message.id}
                        message={message}
                        dismiss={dismiss}
                    />
                ))}
            </div>
        </ToastContext>
    );
}
