import managerPortrait from '@/assets/demo/manager.svg';
import teacher1 from '@/assets/demo/teacher-1.svg';
import teacher2 from '@/assets/demo/teacher-2.svg';
import teacher3 from '@/assets/demo/teacher-3.svg';
import teacher4 from '@/assets/demo/teacher-4.svg';
import teacher5 from '@/assets/demo/teacher-5.svg';
import teacher6 from '@/assets/demo/teacher-6.svg';
import teacher7 from '@/assets/demo/teacher-7.svg';
import teacher8 from '@/assets/demo/teacher-8.svg';
import teacher9 from '@/assets/demo/teacher-9.svg';
import teacher10 from '@/assets/demo/teacher-10.svg';
import teacher11 from '@/assets/demo/teacher-11.svg';
import teacher12 from '@/assets/demo/teacher-12.svg';

const TEACHER_PORTRAITS = [
    teacher1,
    teacher2,
    teacher3,
    teacher4,
    teacher5,
    teacher6,
    teacher7,
    teacher8,
    teacher9,
    teacher10,
    teacher11,
    teacher12,
] as const;

export interface PortraitAvatarProps {
    /** 'manager' uses manager.svg; numeric values map 1..12 onto teacher-1..12.svg. */
    portraitKey: 'manager' | number;
    /** Palette ring tint index (0..5) matching prototype .avatar.portrait.c0..c5. */
    colorIndex?: number;
    className?: string;
}

export function PortraitAvatar({
    portraitKey,
    colorIndex = 0,
    className,
}: PortraitAvatarProps) {
    let src = managerPortrait;
    if (portraitKey !== 'manager') {
        const slot =
            (Math.abs(Math.trunc(Number(portraitKey) || 1)) - 1) %
            TEACHER_PORTRAITS.length;
        src = TEACHER_PORTRAITS[slot] ?? teacher1;
    }

    const tone = ((Math.trunc(colorIndex) % 6) + 6) % 6;
    const classes = ['avatar', 'portrait', `c${tone}`, className]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes} aria-hidden="true">
            <img src={src} alt="" width={80} height={80} decoding="async" />
        </span>
    );
}
