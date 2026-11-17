import { useState } from 'react';
import { formatTeacherApiError } from '@/features/teachers/model';
import { useDeleteTeacherMutation } from '@/features/teachers/queries';
import type { School, Teacher } from '@/features/teachers/types';
import { Dialog } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import styles from './teachers-page.module.css';

export interface TeacherDeleteDialogProps {
    teacher: Teacher | null;
    school: School | undefined;
    onClose: () => void;
    onDeleted: (teacher: Teacher) => void;
}

export function TeacherDeleteDialog({
    teacher,
    school,
    onClose,
    onDeleted,
}: TeacherDeleteDialogProps) {
    const deleteMutation = useDeleteTeacherMutation();
    const open = teacher !== null;

    return (
        <Dialog
            open={open}
            busy={deleteMutation.isPending}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
            title="Xóa hồ sơ giáo viên?"
            description="Thao tác sẽ gỡ hồ sơ khỏi danh sách hiện hành nếu không có dữ liệu liên kết ràng buộc."
        >
            {teacher ? (
                <TeacherDeleteBody
                    key={teacher.id}
                    teacher={teacher}
                    school={school}
                    deleteMutation={deleteMutation}
                    onClose={onClose}
                    onDeleted={onDeleted}
                />
            ) : null}
        </Dialog>
    );
}

function TeacherDeleteBody({
    teacher,
    school,
    deleteMutation,
    onClose,
    onDeleted,
}: {
    teacher: Teacher;
    school: School | undefined;
    deleteMutation: ReturnType<typeof useDeleteTeacherMutation>;
    onClose: () => void;
    onDeleted: (teacher: Teacher) => void;
}) {
    const [errorMessage, setErrorMessage] = useState('');
    const busy = deleteMutation.isPending;

    async function handleConfirm() {
        if (busy) return;
        setErrorMessage('');
        try {
            await deleteMutation.mutateAsync(teacher.id);
            onDeleted(teacher);
        } catch (error) {
            setErrorMessage(formatTeacherApiError(error));
        }
    }

    return (
        <div className={styles.confirmBody}>
            <div className={styles.confirmTarget}>
                <PortraitAvatar
                    portraitKey={teacher.id}
                    colorIndex={teacher.id % 6}
                />
                <div>
                    <strong>{teacher.full_name}</strong>
                    <small>
                        {`${teacher.teacher_code} · ${school?.name ?? `Trường #${teacher.school_id}`}`}
                    </small>
                </div>
            </div>

            {errorMessage ? (
                <div className={styles.mvpError} role="alert">
                    <Icon name="warning" />
                    <span>{errorMessage}</span>
                </div>
            ) : null}

            <div className={styles.formActions}>
                <button
                    type="button"
                    className="btn"
                    data-dialog-autofocus
                    disabled={busy}
                    onClick={onClose}
                >
                    Hủy
                </button>
                <button
                    type="button"
                    className={`btn ${styles.btnDangerSolid}`}
                    disabled={busy}
                    aria-busy={busy || undefined}
                    onClick={() => void handleConfirm()}
                >
                    {busy ? 'Đang xóa…' : 'Xóa giáo viên'}
                </button>
            </div>
        </div>
    );
}
