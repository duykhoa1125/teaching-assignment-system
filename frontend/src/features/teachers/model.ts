import type { School, Teacher, TeacherFilters, TeacherRequest } from './types';

export const TEACHERS_PAGE_SIZE = 5;

export interface TeacherFilterDraft {
    schoolId?: number;
    q?: string;
    teacherCode?: string;
    offset?: number;
    pageSize?: number;
}

export interface TeacherFormInput {
    schoolId: number | '';
    teacherCode: string;
    fullName: string;
}

export type TeacherFormFieldErrors = Partial<
    Record<'school_id' | 'teacher_code' | 'full_name', string>
>;

export type TeacherFormValidationResult =
    | { valid: true; payload: TeacherRequest }
    | { valid: false; errors: TeacherFormFieldErrors };

/** Normalizes UI filters to backend/MSW query params without whitespace-only strings. */
export function buildTeacherListFilters({
    schoolId,
    q,
    teacherCode,
    offset = 0,
    pageSize = TEACHERS_PAGE_SIZE,
}: TeacherFilterDraft): TeacherFilters {
    const safePageSize = Math.max(1, Math.min(99, Math.trunc(pageSize)));
    const safeOffset = Math.max(0, Math.trunc(offset));
    const trimmedQ = q?.trim();
    const trimmedCode = teacherCode?.trim();

    return {
        school_id:
            typeof schoolId === 'number' &&
            Number.isSafeInteger(schoolId) &&
            schoolId > 0
                ? schoolId
                : undefined,
        q: trimmedQ ? trimmedQ : undefined,
        teacher_code: trimmedCode ? trimmedCode : undefined,
        // Fetch one extra record to detect hasNext without a backend total count.
        limit: safePageSize + 1,
        offset: safeOffset,
    };
}

export function sliceTeacherPage(
    rows: Teacher[],
    pageSize = TEACHERS_PAGE_SIZE,
): { items: Teacher[]; hasNext: boolean } {
    const safePageSize = Math.max(1, Math.trunc(pageSize));
    return {
        items: rows.slice(0, safePageSize),
        hasNext: rows.length > safePageSize,
    };
}

export function validateTeacherForm(
    input: TeacherFormInput,
    schools: School[],
): TeacherFormValidationResult {
    const errors: TeacherFormFieldErrors = {};
    const teacherCode = input.teacherCode.trim();
    const fullName = input.fullName.trim();
    const schoolId =
        typeof input.schoolId === 'number' ? input.schoolId : Number.NaN;

    if (!Number.isSafeInteger(schoolId) || schoolId <= 0) {
        errors.school_id = 'Vui lòng chọn trường hợp lệ.';
    } else if (
        schools.length > 0 &&
        !schools.some((school) => school.id === schoolId)
    ) {
        errors.school_id = 'Trường được chọn không có trong danh sách.';
    }

    if (!teacherCode) {
        errors.teacher_code = 'Vui lòng nhập mã giáo viên.';
    } else if (teacherCode.length > 50) {
        errors.teacher_code = 'Mã giáo viên tối đa 50 ký tự.';
    }

    if (!fullName) {
        errors.full_name = 'Vui lòng nhập họ và tên giáo viên.';
    } else if (fullName.length > 255) {
        errors.full_name = 'Họ và tên tối đa 255 ký tự.';
    }

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        payload: {
            school_id: schoolId,
            teacher_code: teacherCode,
            full_name: fullName,
        },
    };
}

export function formatTeacherApiError(error: unknown): string {
    if (error && typeof error === 'object') {
        const record = error as { code?: unknown; message?: unknown };
        const message =
            typeof record.message === 'string' && record.message.trim()
                ? record.message.trim()
                : '';

        if (record.code === 'DUPLICATE_RESOURCE') {
            return message || 'Mã giáo viên đã tồn tại trong trường.';
        }
        if (record.code === 'REFERENCE_CONFLICT') {
            return (
                message ||
                'Không thể thực hiện vì hồ sơ đang được tham chiếu ở dữ liệu khác.'
            );
        }
        if (message) {
            return message;
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return 'Yêu cầu chưa hoàn tất. Vui lòng thử lại.';
}
