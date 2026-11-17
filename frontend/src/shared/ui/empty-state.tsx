import {
    StateIllustration,
    type StateIllustrationKind,
} from './state-illustration';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Icon } from './icon';
import styles from './empty-state.module.css';

type EmptyStateProps = {
    title: string;
    children: ReactNode;
    action?: ReactNode;
    illustration?: StateIllustrationKind;
};
export function EmptyState({
    title,
    children,
    action,
    illustration,
}: EmptyStateProps) {
    return (
        <section className={styles.panel}>
            {illustration ? (
                <StateIllustration kind={illustration} />
            ) : (
                <div
                    className={`${styles.symbol} icon-surface`}
                    aria-hidden="true"
                >
                    <Icon glyph={Inbox} size={24} />
                </div>
            )}
            <h2>{title}</h2>
            <div className={styles.description}>{children}</div>
            {action && <div className={styles.action}>{action}</div>}
        </section>
    );
}
