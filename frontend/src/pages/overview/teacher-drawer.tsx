import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { OverviewTeacherLoad } from '@/features/overview/types';
import { Icon } from '@/shared/ui/icon';
import { getShellPortalContainer } from '@/shared/ui/portal';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { COMPONENT_LABELS, clampPercent, formatPeriods } from './formatters';
import styles from './overview-page.module.css';

export interface TeacherDrawerProps {
    teacher: OverviewTeacherLoad | null;
    onClose: () => void;
    onInspectAssignment: (assignmentId: number) => void;
    returnFocusRef: React.RefObject<HTMLElement | null>;
}

export function TeacherDrawer({
    teacher,
    onClose,
    onInspectAssignment,
    returnFocusRef,
}: TeacherDrawerProps) {
    const titleId = useId();
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!teacher) {
            return undefined;
        }

        const returnTarget = returnFocusRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const appEl = document.querySelector<HTMLElement>('.app');
        const sidebarEl = document.querySelector<HTMLElement>('#sidebar');
        if (appEl) appEl.inert = true;
        if (sidebarEl) sidebarEl.inert = true;

        const frame = window.requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            if (appEl) appEl.inert = false;
            if (sidebarEl) sidebarEl.inert = false;
            if (returnTarget?.isConnected) {
                returnTarget.focus();
            }
        };
    }, [teacher, onClose, returnFocusRef]);

    if (!teacher) {
        return null;
    }

    const deltaToneClass =
        teacher.delta > 0
            ? styles.pillAmber
            : teacher.delta < 0
              ? styles.pillGray
              : '';
    const deltaLabel =
        teacher.delta > 0
            ? `+${formatPeriods(teacher.delta)} tiết`
            : teacher.delta < 0
              ? `${formatPeriods(teacher.delta)} tiết`
              : 'Đạt định mức';
    const loadPct = clampPercent(teacher.total_periods, teacher.weekly_limit);

    return createPortal(
        <div
            className={styles.drawerBackdrop}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className={`${styles.drawer} drawer`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className={`${styles.drawerHeader} modal-header`}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span className={styles.sectionIndex}>
                                THÔNG TIN CHI TIẾT
                            </span>
                        </div>
                        <h2 id={titleId}>Hồ sơ giáo viên</h2>
                        <p>{`${teacher.teacher_code} · ${teacher.department_name}`}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="icon-btn"
                        aria-label="Đóng ngăn chi tiết"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <div className={`${styles.drawerBody} modal-body`}>
                    <div className={styles.drawerProfile}>
                        <PortraitAvatar
                            portraitKey={teacher.portrait_key}
                            colorIndex={teacher.color_index}
                        />
                        <div>
                            <h2>{teacher.full_name}</h2>
                            <p>{teacher.department_name}</p>
                        </div>
                    </div>

                    <div className={styles.drawerTags}>
                        {teacher.subjects.map((subject) => (
                            <span
                                key={subject}
                                className={`${styles.pill} ${styles.pillGray}`}
                            >
                                {subject}
                            </span>
                        ))}
                        <span className={styles.pill}>
                            Đã xác nhận chuyên môn
                        </span>
                    </div>

                    <div className={styles.drawerSectionLabel}>
                        Tổng công tác / định mức
                    </div>
                    <div className={styles.drawerStat}>
                        <b>{formatPeriods(teacher.total_periods)}</b>
                        <span>/ {teacher.base_norm} tiết mỗi tuần</span>
                        <span
                            className={[styles.pill, deltaToneClass]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {deltaLabel}
                        </span>
                    </div>

                    <div className={styles.track}>
                        <i
                            style={{
                                width: `${loadPct}%`,
                                background:
                                    teacher.delta > 0
                                        ? 'var(--chart-over)'
                                        : 'var(--aqua)',
                            }}
                        />
                    </div>

                    <div className={styles.detailGrid}>
                        <div>
                            <small>F · Tải cố định</small>
                            {formatPeriods(teacher.fixed_periods)}
                        </div>
                        <div>
                            <small>A · Gán trong đợt</small>
                            {formatPeriods(teacher.assigned_periods)}
                        </div>
                        <div>
                            <small>C · Công tác quy đổi</small>
                            {formatPeriods(teacher.converted_periods)}
                        </div>
                        <div>
                            <small>R · Giảm trừ</small>
                            {formatPeriods(teacher.reduction_periods)}
                        </div>
                        <div>
                            <small>W / Q</small>
                            {`${formatPeriods(teacher.working_periods)} / ${formatPeriods(teacher.quota_remaining)}`}
                        </div>
                        <div>
                            <small>Trần minh họa</small>
                            {`${teacher.weekly_limit} tiết / tuần`}
                        </div>
                    </div>

                    <div className={styles.drawerSectionLabel}>
                        Phân công đang phụ trách · {teacher.assignments.length}
                    </div>
                    {teacher.assignments.length > 0 ? (
                        teacher.assignments.map((item) => (
                            <div
                                key={item.id}
                                className={styles.drawerAssignment}
                            >
                                <span className={styles.schoolSymbol}>
                                    {item.class_name}
                                </span>
                                <div className={styles.grow}>
                                    <strong>{item.subject_name}</strong>
                                    <p>
                                        {COMPONENT_LABELS[item.component_type]}{' '}
                                        · {formatPeriods(item.periods)} tiết /
                                        tuần
                                    </p>
                                </div>
                                {item.locked ? <Icon name="lock" /> : null}
                                <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={`Xem phân công ${item.class_name}`}
                                    onClick={() => onInspectAssignment(item.id)}
                                >
                                    <Icon name="chevron" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className={styles.stateCard}>
                            <span className={styles.stateSymbol}>
                                <Icon name="assignment" />
                            </span>
                            <h3>Một khoảng trống để bắt đầu</h3>
                            <p>Chưa có phân công trong đợt này.</p>
                        </div>
                    )}
                </div>

                <div className={`${styles.drawerFooter} modal-footer`}>
                    <button type="button" className="btn" onClick={onClose}>
                        Đóng hồ sơ
                    </button>
                </div>
            </section>
        </div>,
        getShellPortalContainer(),
    );
}
