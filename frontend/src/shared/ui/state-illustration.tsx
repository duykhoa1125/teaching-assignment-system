import type { CSSProperties } from 'react';
import styles from './state-illustration.module.css';

export type StateIllustrationKind =
    | 'plan'
    | 'waiting'
    | 'teachers'
    | 'documents'
    | 'preparation'
    | 'solver'
    | 'success'
    | 'not-found'
    | 'forbidden'
    | 'scope';

/** Decorative, token-colored artwork; the surrounding state supplies its accessible text. */
export function StateIllustration({ kind }: { kind: StateIllustrationKind }) {
    return (
        <svg
            className={styles.art}
            viewBox="0 0 200 140"
            fill="none"
            aria-hidden="true"
            focusable="false"
            style={{ '--art-accent': 'var(--primary)' } as CSSProperties}
        >
            <ellipse
                cx="100"
                cy="128"
                rx="76"
                ry="5"
                fill="var(--line)"
                opacity=".45"
            />
            <path
                d="M24 89C10 60 37 23 73 29c30-36 102-7 105 36 14 39-33 62-70 55-40 13-75-3-84-31Z"
                fill="var(--surface2, var(--surface-alt))"
            />
            {['not-found', 'forbidden', 'scope'].includes(kind) ? (
                <>
                    <path
                        d="M66 120V30h66v90"
                        fill="var(--surface)"
                        stroke="var(--line-strong)"
                        strokeWidth="2"
                    />
                    <path
                        d="m76 120 39-12V40l-39-7v87Z"
                        fill="var(--art-accent)"
                        opacity=".14"
                    />
                    <circle cx="106" cy="78" r="3" fill="var(--art-accent)" />
                    <circle
                        cx="146"
                        cy="88"
                        r="22"
                        fill="var(--surface)"
                        stroke="var(--art-accent)"
                        strokeWidth="2"
                    />
                    {kind === 'forbidden' ? (
                        <path
                            d="m135 99 22-22"
                            stroke="var(--art-accent)"
                            strokeWidth="2"
                        />
                    ) : kind === 'scope' ? (
                        <path
                            d="M135 92V81l11-7 11 7v11h-22Zm8 0v-9h6v9"
                            stroke="var(--art-accent)"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    ) : (
                        <path
                            d="M141 82c0-7 12-7 12 0 0 4-7 4-7 9m0 6v1"
                            stroke="var(--art-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    )}
                </>
            ) : ['documents', 'preparation', 'solver', 'success'].includes(
                  kind,
              ) ? (
                <>
                    <rect
                        x="61"
                        y="28"
                        width="85"
                        height="91"
                        rx="7"
                        fill="var(--surface2, var(--surface-alt))"
                        stroke="var(--line)"
                        transform="rotate(9 61 28)"
                    />
                    <rect
                        x="46"
                        y="24"
                        width="89"
                        height="95"
                        rx="7"
                        fill="var(--surface)"
                        stroke="var(--line-strong)"
                    />
                    <path
                        d="M61 43h44m-44 11h27"
                        stroke="var(--art-accent)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity=".6"
                    />
                    <path
                        d="M77 73h39M77 89h29M77 105h34"
                        stroke="var(--line-strong)"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d="m61 72 3 3 5-6m-8 19 3 3 5-6m-8 19 3 3 5-6"
                        stroke="var(--success)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle
                        cx="145"
                        cy="99"
                        r="22"
                        fill="var(--surface)"
                        stroke="var(--art-accent)"
                        strokeWidth="2"
                    />
                    {kind === 'success' ? (
                        <path
                            d="m134 99 7 7 15-15"
                            stroke="var(--success)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ) : kind === 'solver' ? (
                        <path
                            d="m147 84-11 17h10l-3 13 12-18h-10l2-12Z"
                            fill="var(--art-accent)"
                            opacity=".65"
                        />
                    ) : kind === 'preparation' ? (
                        <path
                            d="M133 99h24m-7-7 7 7-7 7"
                            stroke="var(--art-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ) : (
                        <path
                            d="M145 88v18m-6-6 6 6 6-6m-16 12h20"
                            stroke="var(--art-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                </>
            ) : kind === 'teachers' ? (
                <>
                    <rect
                        x="47"
                        y="35"
                        width="109"
                        height="83"
                        rx="8"
                        fill="var(--surface)"
                        stroke="var(--line-strong)"
                    />
                    <path
                        d="M61 48h33m-33 6h21"
                        stroke="var(--muted)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity=".45"
                    />
                    <circle
                        cx="82"
                        cy="77"
                        r="10"
                        fill="var(--art-accent)"
                        opacity=".18"
                    />
                    <path
                        d="M65 103c0-20 34-20 34 0"
                        fill="var(--art-accent)"
                        opacity=".18"
                    />
                    <path
                        d="M112 73h29m-29 10h23m-23 10h18"
                        stroke="var(--line-strong)"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <circle
                        cx="151"
                        cy="105"
                        r="18"
                        fill="var(--surface)"
                        stroke="var(--art-accent)"
                        strokeWidth="2"
                    />
                    <path
                        d="M151 98v14m-7-7h14"
                        stroke="var(--art-accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </>
            ) : (
                <>
                    <rect
                        x="43"
                        y="30"
                        width="115"
                        height="89"
                        rx="8"
                        fill="var(--surface)"
                        stroke="var(--line-strong)"
                    />
                    <path d="M43 54h115" stroke="var(--line-strong)" />
                    <path
                        d="M66 23v15m69-15v15"
                        stroke="var(--muted)"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d="M58 69h84M58 86h84M58 103h84M82 62v48m30-48v48"
                        stroke="var(--line)"
                    />
                    <rect
                        x="58"
                        y="63"
                        width="21"
                        height="12"
                        rx="3"
                        fill="var(--art-accent)"
                        opacity=".22"
                    />
                    <rect
                        x="87"
                        y="81"
                        width="21"
                        height="12"
                        rx="3"
                        fill="var(--success)"
                        opacity=".22"
                    />
                    {kind === 'waiting' ? (
                        <>
                            <circle
                                cx="150"
                                cy="103"
                                r="22"
                                fill="var(--surface)"
                                stroke="var(--art-accent)"
                                strokeWidth="2"
                            />
                            <path
                                d="M150 90v14l9 5"
                                stroke="var(--art-accent)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <circle
                                cx="150"
                                cy="103"
                                r="2"
                                fill="var(--art-accent)"
                            />
                        </>
                    ) : (
                        <>
                            <rect
                                x="125"
                                y="92"
                                width="44"
                                height="25"
                                rx="5"
                                fill="var(--surface)"
                                stroke="var(--art-accent)"
                                strokeWidth="2"
                                transform="rotate(-8 125 92)"
                            />
                            <circle
                                cx="138"
                                cy="102"
                                r="4"
                                fill="var(--art-accent)"
                                opacity=".35"
                            />
                            <path
                                d="m148 100 11-2m-11 8 7-1"
                                stroke="var(--art-accent)"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </>
                    )}
                </>
            )}
            <path
                d="M29 39v8m-4-4h8m139 18v8m-4-4h8"
                stroke="var(--art-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity=".5"
            />
        </svg>
    );
}
