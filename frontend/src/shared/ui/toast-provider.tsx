import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PropsWithChildren,
} from 'react';
import {
    ChevronDown,
    ChevronUp,
    CircleAlert,
    CircleCheck,
    Info,
    X,
} from 'lucide-react';
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
    const [expanded, setExpanded] = useState(false);
    const [stopped, setStopped] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [remaining, setRemaining] = useState(
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
            stopped ||
            remaining === null ||
            remaining <= 0
        )
            return;

        let previous = performance.now();
        const timer = window.setInterval(() => {
            const now = performance.now();
            const elapsed = now - previous;
            setRemaining((value) =>
                value === null ? null : Math.max(0, value - elapsed),
            );
            previous = now;
        }, 100);
        return () => window.clearInterval(timer);
    }, [focused, hovered, stopped, remaining]);

    useEffect(() => {
        if (
            remaining === 0 &&
            durationMs !== 0 &&
            !hovered &&
            !focused &&
            !stopped
        ) {
            const timer = window.setTimeout(() => setExiting(true), 0);
            return () => window.clearTimeout(timer);
        }
    }, [remaining, hovered, focused, stopped, durationMs]);

    useEffect(() => {
        if (!exiting) return;
        const timer = window.setTimeout(
            () => dismiss(id),
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 0
                : 240,
        );
        return () => window.clearTimeout(timer);
    }, [exiting, dismiss, id]);

    const timed =
        durationMs !== null && (durationMs === undefined || durationMs > 0);
    const total = durationMs ?? (tone === 'error' && description ? 8000 : 4200);

    return (
        <div
            className={`${styles.toast} ${styles[tone] ?? ''} ${exiting ? styles.exiting : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setFocused(false);
            }}
        >
            <div className={styles.header}>
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
                <div
                    className={styles.heading}
                    role={tone === 'error' ? 'alert' : 'status'}
                >
                    <strong>{title}</strong>
                    {description && (
                        <span className={styles.srOnly}>{description}</span>
                    )}
                </div>
                {(description || timed) && (
                    <button
                        type="button"
                        aria-label={
                            expanded ? 'Thu gọn thông báo' : 'Mở rộng thông báo'
                        }
                        aria-expanded={expanded}
                        aria-controls={`toast-content-${id}`}
                        onClick={() => setExpanded((value) => !value)}
                    >
                        <Icon
                            glyph={expanded ? ChevronUp : ChevronDown}
                            size={18}
                        />
                    </button>
                )}
                <button
                    type="button"
                    aria-label={`Đóng thông báo: ${title}`}
                    onClick={() => dismiss(id)}
                >
                    <Icon glyph={X} size={16} />
                </button>
            </div>
            <div id={`toast-content-${id}`} hidden={!expanded}>
                {description && (
                    <div id={`toast-detail-${id}`} className={styles.detail}>
                        <p>{description}</p>
                    </div>
                )}
                {timed && (
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.timer}
                            onClick={() => setStopped((value) => !value)}
                            aria-label={
                                stopped
                                    ? 'Tiếp tục tự đóng thông báo'
                                    : 'Dừng tự đóng thông báo'
                            }
                        >
                            <span>
                                {stopped
                                    ? 'Đã dừng tự đóng.'
                                    : `Tự đóng sau ${Math.ceil((remaining ?? 0) / 1000)} giây.`}
                            </span>
                            <strong>
                                {stopped ? 'Tiếp tục' : 'Dừng tự đóng'}
                            </strong>
                        </button>
                    </div>
                )}
            </div>
            {timed && (
                <div className={styles.track} aria-hidden="true">
                    <span
                        style={{
                            width: `${Math.max(0, ((remaining ?? 0) / total) * 100)}%`,
                        }}
                    />
                </div>
            )}
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
