import { useEffect } from 'react';
import './tooltips.css';

/** Enhance native hints, including controls rendered later in dialogs and routes. */
export function Tooltips() {
    useEffect(() => {
        let anchor: HTMLElement | null = null;
        let label = '';
        let tip: HTMLDivElement | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let previousDescription: string | null = null;

        const close = () => {
            clearTimeout(timer);
            if (anchor) {
                if (!anchor.hasAttribute('title'))
                    anchor.setAttribute('title', label);
                if (previousDescription === null)
                    anchor.removeAttribute('aria-describedby');
                else
                    anchor.setAttribute(
                        'aria-describedby',
                        previousDescription,
                    );
            }
            tip?.remove();
            tip = null;
            anchor = null;
        };

        const open = (target: EventTarget | null, immediate: boolean) => {
            if (!(target instanceof Element)) return;
            if (anchor?.contains(target)) return;
            close();
            const candidate = target.closest<HTMLElement>('[title]');
            if (!candidate || candidate.closest('[inert]')) return;
            label = candidate.getAttribute('title')?.trim() ?? '';
            if (!label) return;
            anchor = candidate;
            previousDescription = candidate.getAttribute('aria-describedby');
            candidate.removeAttribute('title');
            timer = setTimeout(
                () => {
                    if (
                        !candidate.isConnected ||
                        !candidate.getClientRects().length
                    ) {
                        close();
                        return;
                    }
                    tip = document.createElement('div');
                    tip.id = 'tass-control-tooltip';
                    tip.className = 'tass-control-tooltip';
                    tip.setAttribute('role', 'tooltip');
                    tip.textContent = label;
                    // The top layer keeps hints visible inside modal dialogs and clipped tables.
                    tip.setAttribute('popover', 'manual');
                    document.body.append(tip);
                    tip.showPopover?.();
                    candidate.setAttribute(
                        'aria-describedby',
                        [previousDescription, tip.id].filter(Boolean).join(' '),
                    );
                    const rect = candidate.getBoundingClientRect();
                    const bounds = tip.getBoundingClientRect();
                    const left = Math.max(
                        8,
                        Math.min(
                            rect.left + (rect.width - bounds.width) / 2,
                            innerWidth - bounds.width - 8,
                        ),
                    );
                    const top =
                        rect.top >= bounds.height + 16
                            ? rect.top - bounds.height - 8
                            : Math.min(
                                  rect.bottom + 8,
                                  innerHeight - bounds.height - 8,
                              );
                    tip.style.left = `${left}px`;
                    tip.style.top = `${Math.max(8, top)}px`;
                },
                immediate ? 0 : 400,
            );
        };
        const pointerOver = (event: PointerEvent) => {
            if (event.pointerType === 'mouse') open(event.target, false);
        };
        const pointerOut = (event: PointerEvent) => {
            if (
                anchor &&
                !(
                    event.relatedTarget instanceof Node &&
                    anchor.contains(event.relatedTarget)
                )
            )
                close();
        };
        const focus = (event: FocusEvent) => open(event.target, true);
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        document.addEventListener('pointerover', pointerOver);
        document.addEventListener('pointerout', pointerOut);
        document.addEventListener('focusin', focus);
        document.addEventListener('focusout', close);
        document.addEventListener('pointerdown', close, true);
        document.addEventListener('keydown', key);
        document.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        window.addEventListener('blur', close);
        return () => {
            close();
            document.removeEventListener('pointerover', pointerOver);
            document.removeEventListener('pointerout', pointerOut);
            document.removeEventListener('focusin', focus);
            document.removeEventListener('focusout', close);
            document.removeEventListener('pointerdown', close, true);
            document.removeEventListener('keydown', key);
            document.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('blur', close);
        };
    }, []);
    return null;
}
