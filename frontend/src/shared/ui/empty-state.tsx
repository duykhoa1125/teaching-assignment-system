import type { ReactNode } from 'react';
import styles from './empty-state.module.css';

type EmptyStateProps = {
    title: string;
    children: ReactNode;
    action?: ReactNode;
};
export function EmptyState({ title, children, action }: EmptyStateProps) {
    return (
        <section className={styles.panel}>
            <div className={styles.symbol} aria-hidden="true">
                ◫
            </div>
            <h2>{title}</h2>
            <div className={styles.description}>{children}</div>
            {action && <div className={styles.action}>{action}</div>}
        </section>
    );
}
