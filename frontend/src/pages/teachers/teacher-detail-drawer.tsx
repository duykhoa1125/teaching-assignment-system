import { Skeleton } from '@/shared/ui/skeleton';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatTeacherApiError } from '@/features/teachers/model';
import { useTeacherDetailQuery } from '@/features/teachers/queries';
import type { School, Teacher } from '@/features/teachers/types';
import { Icon } from '@/shared/ui/icon';
import { getShellPortalContainer } from '@/shared/ui/portal';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import styles from './teachers-page.module.css';

export interface TeacherDetailDrawerProps {
    teacherId: number | null;
    fallbackTeacher: Teacher | null;
    schoolsById: ReadonlyMap<number, School>;
    returnFocusRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
    onEdit: (teacher: Teacher) => void;
    onDelete: (teacher: Teacher) => void;
}

export function TeacherDetailDrawer({
    teacherId,
    fallbackTeacher,
    schoolsById,
    returnFocusRef,
    onClose,
    onEdit,
    onDelete,
}: TeacherDetailDrawerProps) {
    const titleId = useId();
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const skipReturnFocusRef = useRef(false);
    const detailQuery = useTeacherDetailQuery(teacherId);

    useEffect(() => {
        if (teacherId === null) {
            return undefined;
        }

        skipReturnFocusRef.current = false;
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
            if (!skipReturnFocusRef.current && returnTarget?.isConnected) {
                returnTarget.focus();
            }
        };
    }, [teacherId, onClose, returnFocusRef]);

    if (teacherId === null) {
        return null;
    }

    const teacher = detailQuery.data ?? fallbackTeacher;
    const school = teacher ? schoolsById.get(teacher.school_id) : undefined;

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
                                CHI TIẾT HỒ SƠ
                            </span>
                        </div>
                        <h2 id={titleId}>
                            {teacher?.full_name ?? `Giáo viên #${teacherId}`}
                        </h2>
                        <p>
                            {teacher
                                ? `${teacher.teacher_code} · ${school?.name ?? `Trường #${teacher.school_id}`}`
                                : 'Đang đồng bộ thông tin hồ sơ từ hệ thống…'}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="icon-btn"
                        aria-label="Đóng hồ sơ giáo viên"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <div className={`${styles.drawerBody} modal-body`}>
                    {detailQuery.isPending && !teacher ? (
                        <div role="status" aria-busy="true">
                            <span className="sr-only">
                                Đang tải chi tiết giáo viên…
                            </span>
                            <Skeleton variant="detail" />
                        </div>
                    ) : null}

                    {detailQuery.isError ? (
                        <div className={styles.mvpError} role="alert">
                            <Icon name="warning" />
                            <div>
                                <span>
                                    {formatTeacherApiError(detailQuery.error)}
                                </span>
                                <div className={styles.drawerErrorAction}>
                                    <button
                                        type="button"
                                        className="btn small"
                                        onClick={() =>
                                            void detailQuery.refetch()
                                        }
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {teacher ? (
                        <>
                            <div className={styles.drawerProfile}>
                                <PortraitAvatar
                                    portraitKey={teacher.id}
                                    colorIndex={teacher.id % 6}
                                />
                                <div>
                                    <h3>{teacher.full_name}</h3>
                                    <p>
                                        {school?.name ??
                                            `Trường #${teacher.school_id}`}
                                    </p>
                                </div>
                            </div>

                            <div className={styles.detailGrid}>
                                <div>
                                    <small>Mã giáo viên</small>
                                    <strong className={styles.monoId}>
                                        {teacher.teacher_code}
                                    </strong>
                                </div>
                                <div>
                                    <small>ID bản ghi</small>
                                    <strong className={styles.monoId}>
                                        #{teacher.id}
                                    </strong>
                                </div>
                                <div>
                                    <small>Trường học</small>
                                    <span>
                                        {school?.name ??
                                            `Trường #${teacher.school_id}`}
                                    </span>
                                </div>
                                <div>
                                    <small>Mã trường</small>
                                    <span className={styles.monoId}>
                                        {school?.school_code ??
                                            `SCHOOL_${teacher.school_id}`}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.mvpNote}>
                                <Icon name="book" />
                                <span>
                                    Hồ sơ công tác, năng lực môn–cấp và định mức
                                    tải sử dụng các tài nguyên chuyên biệt tách
                                    riêng và sẽ được nối ở các mốc tiếp theo.
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>

                <div className={`${styles.drawerFooter} modal-footer`}>
                    <div className={styles.drawerFooterGroup}>
                        {teacher ? (
                            <>
                                <button
                                    type="button"
                                    className="btn danger"
                                    onClick={() => {
                                        skipReturnFocusRef.current = true;
                                        onDelete(teacher);
                                    }}
                                >
                                    Xóa
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        skipReturnFocusRef.current = true;
                                        onEdit(teacher);
                                    }}
                                >
                                    <Icon name="edit" />
                                    Sửa hồ sơ
                                </button>
                            </>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="btn primary"
                        onClick={onClose}
                    >
                        Đóng hồ sơ
                    </button>
                </div>
            </section>
        </div>,
        getShellPortalContainer(),
    );
}
