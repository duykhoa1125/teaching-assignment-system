import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { Icon } from './icon';
import styles from './dialog.module.css';

type DialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    busy?: boolean;
    variant?: 'default' | 'prototype';
    wide?: boolean;
};

export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    busy = false,
    variant = 'default',
    wide = false,
}: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            const initial =
                dialog.querySelector<HTMLElement>('[data-dialog-autofocus]') ??
                dialog.querySelector<HTMLElement>(
                    'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
                );
            initial?.focus();
        }
        if (!open && dialog.open) dialog.close();
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);
    return (
        <dialog
            ref={ref}
            className={
                variant === 'prototype'
                    ? 'shell-dialog prototype-dialog'
                    : styles.dialog
            }
            aria-labelledby={`${id}-title`}
            aria-describedby={description ? `${id}-description` : undefined}
            onKeyDown={(event) => {
                if (
                    event.key !== 'Tab' ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.metaKey
                )
                    return;
                const elements = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                        'button, a[href], input, select, textarea, [tabindex]',
                    ),
                ).filter(
                    (element) =>
                        element.tabIndex >= 0 &&
                        !element.hasAttribute('disabled') &&
                        element.getClientRects().length > 0,
                );
                const first = elements[0];
                const last = elements.at(-1);
                if (!first || !last) {
                    event.preventDefault();
                    event.currentTarget.focus();
                    return;
                }
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }}
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onOpenChange(false);
            }}
            onClose={() => {
                if (open) onOpenChange(false);
            }}
            onClick={(event) => {
                if (busy || event.target !== event.currentTarget) return;
                if (variant === 'prototype') {
                    onOpenChange(false);
                    return;
                }
                const rect = event.currentTarget.getBoundingClientRect();
                if (
                    event.clientX < rect.left ||
                    event.clientX > rect.right ||
                    event.clientY < rect.top ||
                    event.clientY > rect.bottom
                )
                    onOpenChange(false);
            }}
        >
            <div
                className={
                    variant === 'prototype'
                        ? `modal${wide ? ' wide' : ''}`
                        : styles.panel
                }
            >
                <header
                    className={
                        variant === 'prototype' ? 'modal-header' : styles.header
                    }
                >
                    <div>
                        {variant === 'prototype' && (
                            <div className="eyebrow">
                                <span className="section-index">
                                    TASS / WORKSPACE
                                </span>
                            </div>
                        )}
                        <h2 id={`${id}-title`}>{title}</h2>
                        {description && (
                            <p id={`${id}-description`}>{description}</p>
                        )}
                    </div>
                    <button
                        className={
                            variant === 'prototype' ? 'icon-btn' : styles.close
                        }
                        type="button"
                        aria-label="Đóng hộp thoại"
                        disabled={busy}
                        onClick={() => onOpenChange(false)}
                    >
                        <Icon glyph={X} />
                    </button>
                </header>
                {variant === 'prototype' ? (
                    <div className="modal-body">{children}</div>
                ) : (
                    children
                )}
            </div>
        </dialog>
    );
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    busy = false,
    confirmLabel = 'Xác nhận',
    destructive = false,
    variant = 'default',
}: Omit<DialogProps, 'children'> & {
    onConfirm: () => void;
    confirmLabel?: string;
    destructive?: boolean;
}) {
    return (
        <Dialog {...{ open, onOpenChange, title, description, busy, variant }}>
            {variant === 'prototype' ? (
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn"
                        data-dialog-autofocus
                        disabled={busy}
                        onClick={() => onOpenChange(false)}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className={`btn ${destructive ? 'danger' : 'primary'}`}
                        disabled={busy}
                        aria-busy={busy || undefined}
                        onClick={onConfirm}
                    >
                        {busy ? 'Đang xử lý…' : confirmLabel}
                    </button>
                </div>
            ) : (
                <div className={styles.actions}>
                    <Button
                        variant="secondary"
                        data-dialog-autofocus
                        disabled={busy}
                        onClick={() => onOpenChange(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant={destructive ? 'danger' : 'primary'}
                        loading={busy}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            )}
        </Dialog>
    );
}
