import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Icon } from './icon';
import { Button } from './button';
import styles from './controls.module.css';

export function LoadingState({
    label = 'Đang tải dữ liệu…',
}: {
    label?: string;
}) {
    return (
        <div className={styles.dataState} role="status" aria-busy="true">
            <Icon glyph={LoaderCircle} size={24} className={styles.spinner} />
            <p>{label}</p>
        </div>
    );
}
export function ErrorState({
    message,
    onRetry,
    busy = false,
}: {
    message: string;
    onRetry?: () => void;
    busy?: boolean;
}) {
    return (
        <div className={styles.dataState} role="alert">
            <Icon glyph={CircleAlert} size={24} />
            <h2>Không thể tải dữ liệu</h2>
            <p>{message}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry} loading={busy}>
                    Thử lại
                </Button>
            )}
        </div>
    );
}
