import { resolveSubjectVisual } from '@/features/catalogs/subject-visual';
import { Icon } from './icon';

export function SubjectIdentity({
    name,
    detail,
    compact = false,
}: {
    name: string;
    detail?: string;
    compact?: boolean;
}) {
    const { glyph, tone } = resolveSubjectVisual(name);
    const classes = ['subject-identity'];
    if (tone) classes.push(`subject-${tone}`);
    if (compact) classes.push('subject-compact');

    return (
        <span className={classes.join(' ')}>
            <span className="subject-symbol" aria-hidden="true">
                <Icon name={glyph} />
            </span>
            <span>
                <strong>{name}</strong>
                {detail ? <small>{detail}</small> : null}
            </span>
        </span>
    );
}
