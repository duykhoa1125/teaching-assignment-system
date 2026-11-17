import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '@/shared/ui/icon';

export function ShellModal({
    open,
    onClose,
    title,
    subtitle,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            (
                dialog.querySelector<HTMLElement>('[data-initial-focus]') ??
                dialog.querySelector<HTMLElement>('button')
            )?.focus();
        } else if (!open && dialog.open) dialog.close();
    }, [open]);
    return (
        <dialog
            ref={ref}
            className="shell-dialog"
            aria-labelledby={id}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            onKeyDown={(event) => {
                if (event.key !== 'Tab') return;
                const elements = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                        'button, input, a[href], [tabindex]',
                    ),
                ).filter(
                    (element) =>
                        element.tabIndex >= 0 &&
                        !element.hasAttribute('disabled') &&
                        element.getClientRects().length,
                );
                const first = elements[0],
                    last = elements.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }}
        >
            <section className="modal">
                <div className="modal-header">
                    <div>
                        <div className="eyebrow">
                            <span className="section-index">
                                TASS / WORKSPACE
                            </span>
                        </div>
                        <h2 id={id}>{title}</h2>
                        <p>{subtitle}</p>
                    </div>
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Đóng hộp thoại"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>
                {children}
            </section>
        </dialog>
    );
}
