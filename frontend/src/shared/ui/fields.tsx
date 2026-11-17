import { Select } from '@/shared/ui/select';
import {
    useId,
    type ReactNode,
    type InputHTMLAttributes,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from 'react';
import styles from './controls.module.css';

type FieldProps = { label: string; hint?: string; error?: string };

function FieldFrame({
    id,
    label,
    hint,
    error,
    required,
    children,
}: FieldProps & { id: string; required?: boolean; children: ReactNode }) {
    return (
        <div className={styles.field}>
            <label htmlFor={id}>
                {label}
                {required && (
                    <span className={styles.required} aria-hidden="true">
                        {' '}
                        *
                    </span>
                )}
            </label>
            {children}
            {hint && (
                <p id={`${id}-hint`} className={styles.hint}>
                    {hint}
                </p>
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    className={styles.fieldError}
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

function descriptions(
    id: string,
    hint?: string,
    error?: string,
    external?: string,
) {
    return (
        [external, hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(' ') || undefined
    );
}

export function InputField({
    label,
    hint,
    error,
    id: suppliedId,
    className = '',
    ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
    const generated = useId();
    const id = suppliedId ?? generated;
    return (
        <FieldFrame {...{ id, label, hint, error }} required={props.required}>
            <input
                {...props}
                id={id}
                className={`${styles.input} ${className}`}
                aria-invalid={Boolean(error) || props['aria-invalid']}
                aria-describedby={descriptions(
                    id,
                    hint,
                    error,
                    props['aria-describedby'],
                )}
            />
        </FieldFrame>
    );
}

export function SelectField({
    label,
    hint,
    error,
    id: suppliedId,
    className = '',
    children,
    ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
    const generated = useId();
    const id = suppliedId ?? generated;
    return (
        <FieldFrame {...{ id, label, hint, error }} required={props.required}>
            <Select
                {...props}
                id={id}
                className={`${styles.input} ${className}`}
                aria-invalid={Boolean(error) || props['aria-invalid']}
                aria-describedby={descriptions(
                    id,
                    hint,
                    error,
                    props['aria-describedby'],
                )}
            >
                {children}
            </Select>
        </FieldFrame>
    );
}

export function TextareaField({
    label,
    hint,
    error,
    id: suppliedId,
    className = '',
    ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const generated = useId();
    const id = suppliedId ?? generated;
    return (
        <FieldFrame {...{ id, label, hint, error }} required={props.required}>
            <textarea
                rows={4}
                {...props}
                id={id}
                className={`${styles.input} ${className}`}
                aria-invalid={Boolean(error) || props['aria-invalid']}
                aria-describedby={descriptions(
                    id,
                    hint,
                    error,
                    props['aria-describedby'],
                )}
            />
        </FieldFrame>
    );
}
