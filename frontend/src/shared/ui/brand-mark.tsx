/** Original TASS monogram. The favicon and UI share this exact SVG symbol. */
export function BrandMark({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className="icon"
            aria-hidden="true"
            focusable="false"
        >
            <use href="/tass-mark.svg#tass-mark" />
        </svg>
    );
}
