import { Icon } from './icon';
import { LoaderCircle } from 'lucide-react';
import styles from './skeleton.module.css';

export function RefreshStatus({ active }: { active: boolean }) {
    return active ? (
        <span className={styles.refresh} role="status">
            <Icon glyph={LoaderCircle} className={styles.spinner} size={16} />
            Đang cập nhật…
        </span>
    ) : null;
}
