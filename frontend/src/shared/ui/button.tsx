import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { Icon } from './icon';
import styles from './controls.module.css';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    loading?: boolean;
    icon?: LucideIcon;
    children: ReactNode;
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    icon,
    children,
    className = '',
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
        >
            {loading ? (
                <Icon glyph={LoaderCircle} className={styles.spinner} />
            ) : (
                icon && <Icon glyph={icon} />
            )}
            {children}
        </button>
    );
}
