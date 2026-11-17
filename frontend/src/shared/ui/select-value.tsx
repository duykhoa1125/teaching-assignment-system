/** A shrinkable selected label for customizable native selects.
 * Older browsers ignore this button and retain their native select display.
 */
export function SelectValue() {
    return (
        <button type="button" className="select-value-button">
            <selectedcontent />
        </button>
    );
}
import type * as React from 'react';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            selectedcontent: React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            >;
        }
    }
}
