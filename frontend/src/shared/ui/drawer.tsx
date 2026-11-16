import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icon';

export function Drawer({
    open,
    onOpenChange,
    title,
    subtitle,
    eyebrow,
    children,
    footer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    subtitle?: string;
    eyebrow?: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const titleId = useId();
    const drawerRef = useRef<HTMLElement>(null);
    const restoreFocusTo = useRef<HTMLElement | null>(null);
    const changeRef = useRef(onOpenChange);
    useEffect(() => {
        changeRef.current = onOpenChange;
    }, [onOpenChange]);

    useEffect(() => {
        if (!open) return;
        restoreFocusTo.current =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const frame = requestAnimationFrame(() => {
            const firstFocus = drawerRef.current?.querySelector<HTMLElement>(
                '[data-drawer-autofocus], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)',
            );
            firstFocus?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (document.querySelector('dialog[open]')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                changeRef.current(false);
            }
            if (event.key === 'Tab') {
                const elements = Array.from(
                    drawerRef.current?.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
                    ) ?? [],
                ).filter((element) => element.getClientRects().length);
                const first = elements[0],
                    last = elements.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            restoreFocusTo.current?.focus();
        };
    }, [open]);

    if (!open) return null;

    const target = document.querySelector('.tass-shell') ?? document.body;
    return createPortal(
        <div
            className="drawer-backdrop"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onOpenChange(false);
                }
            }}
        >
            <aside
                ref={drawerRef}
                className="drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className="modal-header">
                    <div>
                        {eyebrow ? (
                            <div className="eyebrow">{eyebrow}</div>
                        ) : null}
                        <h2 id={titleId}>{title}</h2>
                        {subtitle ? <p>{subtitle}</p> : null}
                    </div>
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Đóng"
                        onClick={() => onOpenChange(false)}
                    >
                        <Icon name="close" />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer ? <div className="modal-footer">{footer}</div> : null}
            </aside>
        </div>,
        target,
    );
}
