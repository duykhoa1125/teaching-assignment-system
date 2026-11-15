import { useCallback, useRef, useState, type PropsWithChildren } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { ToastContext, type ToastMessage } from './toast-context';
import { Icon } from './icon';
import styles from './toast.module.css';

export function ToastProvider({ children }: PropsWithChildren) {
    const [messages, setMessages] = useState<(ToastMessage & { id: number })[]>(
        [],
    );
    const nextId = useRef(0);
    const notify = useCallback((message: ToastMessage) => {
        const id = ++nextId.current;
        setMessages((current) => [...current.slice(-3), { ...message, id }]);
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
                            onClick={() =>
                                setMessages((current) =>
                                    current.filter((item) => item.id !== id),
                                )
                            }
                        >
                            <Icon glyph={X} size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext>
    );
}
