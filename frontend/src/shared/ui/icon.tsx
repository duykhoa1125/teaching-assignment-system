import {
    ArrowUpRight,
    CalendarRange,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    Inbox,
    Info,
    LayoutDashboard,
    Plus,
    RotateCcw,
    School,
    UsersRound,
    X,
    type LucideIcon,
} from 'lucide-react';
import { prototypeGlyphs, type PrototypeIconName } from './prototype-glyphs';
import styles from './icon.module.css';

const originalByGlyph = new Map<LucideIcon, PrototypeIconName>([
    [LayoutDashboard, 'dashboard'],
    [CalendarRange, 'assignment'],
    [UsersRound, 'teachers'],
    [School, 'school'],
    [Plus, 'plus'],
    [Check, 'check'],
    [X, 'close'],
    [ChevronLeft, 'chevron'],
    [ChevronRight, 'chevron'],
    [ArrowUpRight, 'arrow'],
    [RotateCcw, 'reset'],
    [CircleAlert, 'warning'],
    [CircleCheck, 'check'],
    [Info, 'help'],
    [Inbox, 'file'],
]);

export function Icon({
    glyph: Glyph,
    name,
    size = 18,
    className,
}: {
    glyph?: LucideIcon;
    name?: PrototypeIconName;
    size?: 16 | 18 | 20 | 24 | 27;
    className?: string;
}) {
    const original = name ?? (Glyph && originalByGlyph.get(Glyph));
    if (original)
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                className={`icon ${styles.icon} ${className ?? ''}`}
                aria-hidden="true"
                focusable="false"
                style={{
                    transform:
                        Glyph === ChevronLeft
                            ? 'rotate(180deg)'
                            : Glyph === ArrowUpRight
                              ? 'rotate(-45deg)'
                              : undefined,
                }}
                dangerouslySetInnerHTML={{ __html: prototypeGlyphs[original] }}
            />
        );
    if (!Glyph) return null;
    return (
        <Glyph
            size={size}
            strokeWidth={1.6}
            className={className}
            aria-hidden="true"
            focusable="false"
        />
    );
}
