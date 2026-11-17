import type { ComponentPropsWithRef } from 'react';
import { SelectValue } from './select-value';

/** Native form semantics with a shrinkable label in customizable selects. */
export function Select({
    children,
    ...props
}: ComponentPropsWithRef<'select'>) {
    return (
        <select {...props}>
            {!props.multiple && props.size === undefined && <SelectValue />}
            {children}
        </select>
    );
}
