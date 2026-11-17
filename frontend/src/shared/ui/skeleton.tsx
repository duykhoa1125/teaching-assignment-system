import styles from './skeleton.module.css';

export function SkeletonLine() {
    return <span className={styles.line} aria-hidden="true" />;
}

/** Neutral content placeholders; tables use their own real columns in DataTable. */
export function Skeleton({
    variant = 'content',
    tableClassName,
    scrollClassName,
}: {
    variant?: 'content' | 'teachers' | 'dashboard' | 'detail';
    tableClassName?: string;
    scrollClassName?: string;
}) {
    if (variant === 'dashboard') {
        return (
            <div className={styles.root} aria-hidden="true">
                <div className={styles.banner}>
                    <SkeletonLine />
                    <SkeletonLine />
                </div>
                <div className={styles.metrics}>
                    {Array.from({ length: 4 }, (_, i) => (
                        <div className={styles.metric} key={i}>
                            <SkeletonLine />
                            <span className={styles.value}>
                                <SkeletonLine />
                            </span>
                            <SkeletonLine />
                        </div>
                    ))}
                </div>
                <div className={styles.dashboardPanels}>
                    <div className={styles.chart}>
                        <SkeletonLine />
                        <div className={styles.bars}>
                            {[60, 85, 45, 72, 95, 55, 78, 66].map(
                                (height, i) => (
                                    <span
                                        key={i}
                                        style={{ height: `${height}%` }}
                                    >
                                        <SkeletonLine />
                                    </span>
                                ),
                            )}
                        </div>
                    </div>
                    <div className={styles.summary}>
                        <SkeletonLine />
                        <div className={styles.ring} />
                        <SkeletonLine />
                    </div>
                </div>
                <div className={styles.dashboardPanels}>
                    {[0, 1].map((i) => (
                        <div className={styles.metric} key={i}>
                            {[0, 1, 2, 3].map((j) => (
                                <SkeletonLine key={j} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (variant === 'detail') {
        return (
            <div className={styles.root} aria-hidden="true">
                <div className={styles.identity}>
                    <span className={`${styles.avatar} ${styles.avatarLarge}`}>
                        <SkeletonLine />
                    </span>
                    <div className={styles.lines}>
                        <SkeletonLine />
                        <SkeletonLine />
                    </div>
                </div>
                <div className={styles.detailFields}>
                    {Array.from({ length: 6 }, (_, i) => (
                        <div className={styles.lines} key={i}>
                            <SkeletonLine />
                            <SkeletonLine />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (variant === 'teachers') {
        return (
            <div
                className={scrollClassName ?? styles.teacherScroll}
                aria-hidden="true"
            >
                <table className={tableClassName ?? styles.teacherTable}>
                    <thead>
                        <tr>
                            {[
                                'GIÁO VIÊN',
                                'TRƯỜNG HỌC',
                                'TRẠNG THÁI TRƯỜNG',
                                'ID HỒ SƠ',
                                'THAO TÁC',
                            ].map((title) => (
                                <th key={title}>{title}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }, (_, i) => (
                            <tr key={i}>
                                <td>
                                    <div className={styles.identity}>
                                        <span className={styles.avatar}>
                                            <SkeletonLine />
                                        </span>
                                        <div className={styles.lines}>
                                            <SkeletonLine />
                                            <SkeletonLine />
                                        </div>
                                    </div>
                                </td>
                                {[0, 1, 2, 3].map((j) => (
                                    <td key={j}>
                                        <SkeletonLine />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    return (
        <div className={`${styles.root} ${styles.content}`} aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
                <div className={styles.lines} key={i}>
                    <SkeletonLine />
                    <SkeletonLine />
                </div>
            ))}
        </div>
    );
}
