import type { ReactNode } from 'react';
import { PageHeadingContent } from '@/shared/ui/page-heading-content';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import type { PrototypeIconName } from '@/shared/ui/prototype-glyphs';
import { useSession } from './use-session';
import { accountPortraitSpec } from './roles';
import type { AuthAccount } from './types';

export type PillTone = '' | 'gray' | 'amber' | 'red' | 'purple';

/** Text-only status pill; user-requested removal of the prototype's leading dot. */
export function PillBadge({
    label,
    tone = '',
}: {
    label: string | number;
    tone?: PillTone;
    dot?: boolean; // Compatibility for existing callers; no dot is rendered.
}) {
    return <span className={tone ? `pill ${tone}` : 'pill'}>{label}</span>;
}

/** Page header shared by Admin, Teacher, and Settings workspaces. */
export function RolePageHeader({
    title,
    description,
    actions,
    roundLabel,
    contextLabel,
}: {
    title: string;
    description: string;
    actions?: ReactNode;
    roundLabel?: string;
    contextLabel?: string;
}) {
    const { isMockMode, account, activeContext } = useSession();
    const round = activeContext?.round ?? 'PC-01';
    const scopeLabel =
        !isMockMode || account?.school ? 'THPT An Hòa' : 'TÀI KHOẢN CÁ NHÂN';

    return (
        <div className="page-heading">
            <PageHeadingContent>
                <div>
                    <div className="eyebrow">
                        <span className="section-index">
                            {roundLabel ?? round}
                        </span>
                        <span>/</span>
                        <span>{contextLabel ?? scopeLabel}</span>
                    </div>
                    <h1>{title}</h1>
                    <p className="subtitle">{description}</p>
                </div>
            </PageHeadingContent>
            {actions ? <div className="flex">{actions}</div> : null}
        </div>
    );
}

/** Shared person identity chip (`.person-identity`) matching prototype `mvpPerson`. */
export function PersonIdentity({
    name,
    portraitKey,
    colorIndex = 0,
    detail,
    compact = false,
}: {
    name: string;
    portraitKey: 'manager' | number;
    colorIndex?: number;
    detail?: string;
    compact?: boolean;
}) {
    return (
        <span
            className={
                compact
                    ? 'person-identity person-identity-compact'
                    : 'person-identity'
            }
        >
            <PortraitAvatar portraitKey={portraitKey} colorIndex={colorIndex} />
            <span className="person-identity-copy">
                <strong>{name}</strong>
                {detail ? <small>{detail}</small> : null}
            </span>
        </span>
    );
}

function hashName(name: string): number {
    const key = name.trim().normalize('NFC').toLocaleLowerCase('vi');
    let hash = 0;
    for (const ch of key) {
        hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
    }
    return hash;
}

/** Resolves an audit/activity actor into either a system caption or `PersonIdentity`. */
export function ActorIdentity({
    actor,
    accounts,
}: {
    actor: string;
    accounts?: readonly AuthAccount[];
}) {
    if (!actor) {
        return <span className="muted">Chưa ghi nhận</span>;
    }
    if (/^(Dữ liệu|Chuyển đổi|Hệ thống|Studio|Demo|Chưa)/i.test(actor)) {
        return <span className="person-system">{actor}</span>;
    }
    const normalized = actor.trim().normalize('NFC').toLocaleLowerCase('vi');
    const matched = accounts?.find(
        (item) =>
            item.name.trim().normalize('NFC').toLocaleLowerCase('vi') ===
            normalized,
    );
    if (matched) {
        const spec = accountPortraitSpec(matched);
        return (
            <PersonIdentity
                name={actor}
                portraitKey={spec.portraitKey}
                colorIndex={spec.colorIndex}
                compact
            />
        );
    }
    const hash = hashName(actor);
    return (
        <PersonIdentity
            name={actor}
            portraitKey={(hash % 12) + 1}
            colorIndex={hash % 6}
            compact
        />
    );
}

const STATE_SYMBOLS: Record<
    'empty' | 'search' | 'error' | 'success' | 'loading',
    PrototypeIconName
> = {
    empty: 'book',
    search: 'search',
    error: 'warning',
    success: 'check',
    loading: 'spark',
};

/** Status/empty card matching prototype `stateCard(kind, title, detail, buttons)`. */
export function RoleStateCard({
    kind,
    title,
    detail,
    actions,
}: {
    kind: 'empty' | 'search' | 'error' | 'success' | 'loading';
    title: string;
    detail: string;
    actions?: ReactNode;
}) {
    return (
        <div
            className={`state-card state-${kind}`}
            role={
                kind === 'error'
                    ? 'alert'
                    : kind === 'loading'
                      ? 'status'
                      : undefined
            }
        >
            <span className="state-symbol">
                <Icon name={STATE_SYMBOLS[kind]} />
            </span>
            <h3>{title}</h3>
            <p>{detail}</p>
            {actions ? <div className="state-actions">{actions}</div> : null}
        </div>
    );
}
