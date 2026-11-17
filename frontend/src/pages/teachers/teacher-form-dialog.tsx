import { Select } from '@/shared/ui/select';
import { useId, useState, type FormEvent } from 'react';
import {
    formatTeacherApiError,
    validateTeacherForm,
    type TeacherFormFieldErrors,
} from '@/features/teachers/model';
import { useSaveTeacherMutation } from '@/features/teachers/queries';
import type { School, Teacher } from '@/features/teachers/types';
import { Dialog } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/icon';
import styles from './teachers-page.module.css';

export interface TeacherFormDialogProps {
    open: boolean;
    teacher: Teacher | null;
    schools: School[];
    defaultSchoolId?: number;
    onClose: () => void;
    onSaved: (teacher: Teacher, mode: 'create' | 'edit') => void;
}

export function TeacherFormDialog({
    open,
    teacher,
    schools,
    defaultSchoolId,
    onClose,
    onSaved,
}: TeacherFormDialogProps) {
    const mode = teacher ? 'edit' : 'create';
    const formKey = open
        ? `${mode}-${teacher?.id ?? 'new'}-${defaultSchoolId ?? 'none'}`
        : 'closed';

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
            title={
                mode === 'create'
                    ? 'Thêm hồ sơ giáo viên'
                    : 'Cập nhật hồ sơ giáo viên'
            }
            description={
                mode === 'create'
                    ? 'Tạo mới giáo viên thuộc phạm vi trường quản lý.'
                    : 'Chỉnh sửa thông tin định danh của giáo viên trong hệ thống.'
            }
        >
            {open ? (
                <TeacherFormBody
                    key={formKey}
                    mode={mode}
                    teacher={teacher}
                    schools={schools}
                    defaultSchoolId={defaultSchoolId}
                    onClose={onClose}
                    onSaved={onSaved}
                />
            ) : null}
        </Dialog>
    );
}

function TeacherFormBody({
    mode,
    teacher,
    schools,
    defaultSchoolId,
    onClose,
    onSaved,
}: {
    mode: 'create' | 'edit';
    teacher: Teacher | null;
    schools: School[];
    defaultSchoolId?: number;
    onClose: () => void;
    onSaved: (teacher: Teacher, mode: 'create' | 'edit') => void;
}) {
    const schoolFieldId = useId();
    const codeFieldId = useId();
    const nameFieldId = useId();

    const initialSchoolId =
        teacher?.school_id ?? defaultSchoolId ?? schools[0]?.id ?? '';
    const [schoolId, setSchoolId] = useState<number | ''>(initialSchoolId);
    const [teacherCode, setTeacherCode] = useState(teacher?.teacher_code ?? '');
    const [fullName, setFullName] = useState(teacher?.full_name ?? '');
    const [fieldErrors, setFieldErrors] = useState<TeacherFormFieldErrors>({});
    const [serverError, setServerError] = useState('');

    const saveMutation = useSaveTeacherMutation();
    const busy = saveMutation.isPending;

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (busy) return;

        setServerError('');
        const validation = validateTeacherForm(
            { schoolId, teacherCode, fullName },
            schools,
        );
        if (!validation.valid) {
            setFieldErrors(validation.errors);
            return;
        }

        setFieldErrors({});
        try {
            const saved = await saveMutation.mutateAsync({
                id: teacher?.id,
                payload: validation.payload,
            });
            onSaved(saved, mode);
        } catch (error) {
            setServerError(formatTeacherApiError(error));
        }
    }

    return (
        <form
            className={styles.mvpForm}
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
        >
            <div className={styles.field}>
                <label htmlFor={schoolFieldId}>
                    Trường học
                    <span className={styles.requiredMark} aria-hidden="true">
                        {' '}
                        *
                    </span>
                </label>
                <Select
                    id={schoolFieldId}
                    name="school_id"
                    value={schoolId === '' ? '' : String(schoolId)}
                    disabled={busy || schools.length === 0}
                    aria-invalid={Boolean(fieldErrors.school_id)}
                    aria-describedby={
                        fieldErrors.school_id
                            ? `${schoolFieldId}-error`
                            : undefined
                    }
                    onChange={(event) => {
                        const next = Number(event.target.value);
                        setSchoolId(
                            Number.isSafeInteger(next) && next > 0 ? next : '',
                        );
                        setFieldErrors((prev) => ({
                            ...prev,
                            school_id: undefined,
                        }));
                        setServerError('');
                    }}
                >
                    {schools.length === 0 ? (
                        <option value="">Chưa có danh sách trường</option>
                    ) : (
                        schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {`${school.name} (${school.school_code})`}
                            </option>
                        ))
                    )}
                </Select>
                {fieldErrors.school_id ? (
                    <span
                        id={`${schoolFieldId}-error`}
                        className={styles.fieldError}
                        role="alert"
                    >
                        {fieldErrors.school_id}
                    </span>
                ) : null}
            </div>

            <div className={styles.field}>
                <label htmlFor={codeFieldId}>
                    Mã giáo viên
                    <span className={styles.requiredMark} aria-hidden="true">
                        {' '}
                        *
                    </span>
                </label>
                <input
                    id={codeFieldId}
                    name="teacher_code"
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Ví dụ: GV007"
                    value={teacherCode}
                    disabled={busy}
                    data-dialog-autofocus={mode === 'create' ? '' : undefined}
                    aria-invalid={Boolean(fieldErrors.teacher_code)}
                    aria-describedby={
                        fieldErrors.teacher_code
                            ? `${codeFieldId}-error`
                            : undefined
                    }
                    onChange={(event) => {
                        setTeacherCode(event.target.value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            teacher_code: undefined,
                        }));
                        setServerError('');
                    }}
                />
                {fieldErrors.teacher_code ? (
                    <span
                        id={`${codeFieldId}-error`}
                        className={styles.fieldError}
                        role="alert"
                    >
                        {fieldErrors.teacher_code}
                    </span>
                ) : null}
            </div>

            <div className={`${styles.field} ${styles.full}`}>
                <label htmlFor={nameFieldId}>
                    Họ và tên
                    <span className={styles.requiredMark} aria-hidden="true">
                        {' '}
                        *
                    </span>
                </label>
                <input
                    id={nameFieldId}
                    name="full_name"
                    type="text"
                    required
                    maxLength={255}
                    placeholder="Ví dụ: Nguyễn Minh Tâm"
                    value={fullName}
                    disabled={busy}
                    data-dialog-autofocus={mode === 'edit' ? '' : undefined}
                    aria-invalid={Boolean(fieldErrors.full_name)}
                    aria-describedby={
                        fieldErrors.full_name
                            ? `${nameFieldId}-error`
                            : undefined
                    }
                    onChange={(event) => {
                        setFullName(event.target.value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            full_name: undefined,
                        }));
                        setServerError('');
                    }}
                />
                {fieldErrors.full_name ? (
                    <span
                        id={`${nameFieldId}-error`}
                        className={styles.fieldError}
                        role="alert"
                    >
                        {fieldErrors.full_name}
                    </span>
                ) : null}
            </div>

            <div className={styles.mvpNote}>
                <Icon name="shield" />
                <span>
                    Mã giáo viên phải là duy nhất trong cùng một trường. Thông
                    tin công tác, năng lực và định mức sẽ được nối ở các hồ sơ
                    chuyên biệt.
                </span>
            </div>

            {serverError ? (
                <div className={styles.mvpError} role="alert">
                    <Icon name="warning" />
                    <span>{serverError}</span>
                </div>
            ) : null}

            <div className={styles.formActions}>
                <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={onClose}
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="btn primary"
                    disabled={busy || schools.length === 0}
                    aria-busy={busy || undefined}
                >
                    <Icon name="check" />
                    {busy
                        ? 'Đang lưu…'
                        : mode === 'create'
                          ? 'Thêm giáo viên'
                          : 'Lưu thay đổi'}
                </button>
            </div>
        </form>
    );
}
