import type {
    AcademicYear,
    AcademicYearFilters,
    AcademicYearRequest,
    AssignmentRoundFilters,
    AssignmentRoundRequest,
    AssignmentRoundStatus,
    ClassStatus,
    EducationLevelRequest,
    GradeFilters,
    GradeRequest,
    SchoolClassFilters,
    SchoolClassRequest,
    SemesterFilters,
    SemesterRequest,
    SubjectFilters,
    SubjectRequest,
} from './types.ts';

export const CATALOG_PAGE_SIZE = 20;

export function formatAcademicYearLabel(
    year: AcademicYear,
    schoolName?: string,
) {
    return `${year.year_code} · ${schoolName ?? `Trường #${year.school_id}`}`;
}

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Ngưng hoạt động',
};

export const ROUND_STATUS_LABELS: Record<AssignmentRoundStatus, string> = {
    DRAFT: 'Bản nháp',
    ACTIVE: 'Đang mở',
    CLOSED: 'Đã đóng',
    ARCHIVED: 'Lưu trữ',
};

export function isValidIsoDate(value: string): boolean {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const [y, m, d] = trimmed.split('-').map(Number);
    if (!y || !m || !d) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
    );
}

export function isValidIsoDateTime(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return !Number.isNaN(Date.parse(trimmed));
}

export function sliceCatalogPage<Row>(rows: readonly Row[], pageSize: number) {
    return {
        items: rows.slice(0, pageSize),
        hasNext: rows.length > pageSize,
    };
}

export function buildAcademicYearFilters(
    schoolId: number | null,
    offset = 0,
    limit = CATALOG_PAGE_SIZE,
): AcademicYearFilters {
    return {
        ...(schoolId ? { school_id: schoolId } : {}),
        limit: limit + 1,
        offset,
    };
}

export function buildSemesterFilters(
    academicYearId: number | null,
    offset = 0,
    limit = CATALOG_PAGE_SIZE,
): SemesterFilters {
    return {
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        limit: limit + 1,
        offset,
    };
}

export function buildGradeFilters(
    educationLevelId: number | null,
    offset = 0,
    limit = CATALOG_PAGE_SIZE,
): GradeFilters {
    return {
        ...(educationLevelId ? { education_level_id: educationLevelId } : {}),
        limit: limit + 1,
        offset,
    };
}

export function buildClassFilters(filters: {
    academicYearId?: number | null;
    gradeId?: number | null;
    status?: ClassStatus | '';
    offset?: number;
    limit?: number;
}): SchoolClassFilters {
    const pageSize = filters.limit ?? CATALOG_PAGE_SIZE;
    return {
        ...(filters.academicYearId
            ? { academic_year_id: filters.academicYearId }
            : {}),
        ...(filters.gradeId ? { grade_id: filters.gradeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        limit: pageSize + 1,
        offset: filters.offset ?? 0,
    };
}

export function buildSubjectFilters(filters: {
    q?: string;
    subjectCode?: string;
    asOf?: string;
    offset?: number;
    limit?: number;
}): SubjectFilters {
    const pageSize = filters.limit ?? CATALOG_PAGE_SIZE;
    const q = filters.q?.trim();
    const code = filters.subjectCode?.trim();
    const asOf = filters.asOf?.trim();
    return {
        ...(q ? { q } : {}),
        ...(code ? { subject_code: code } : {}),
        ...(asOf ? { as_of: asOf } : {}),
        limit: pageSize + 1,
        offset: filters.offset ?? 0,
    };
}

export function buildRoundFilters(filters: {
    semesterId?: number | null;
    status?: AssignmentRoundStatus | '';
    offset?: number;
    limit?: number;
}): AssignmentRoundFilters {
    const pageSize = filters.limit ?? CATALOG_PAGE_SIZE;
    return {
        ...(filters.semesterId ? { semester_id: filters.semesterId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        limit: pageSize + 1,
        offset: filters.offset ?? 0,
    };
}

export function validateSubjectForm(input: {
    subject_code: string;
    name: string;
    valid_from: string;
    valid_to: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    const code = input.subject_code.trim();
    const name = input.name.trim();
    const from = input.valid_from.trim();
    const to = input.valid_to.trim();

    if (!code) errors.subject_code = 'Vui lòng nhập mã môn học.';
    else if (code.length > 50)
        errors.subject_code = 'Mã môn học không quá 50 ký tự.';

    if (!name) errors.name = 'Vui lòng nhập tên môn học.';
    else if (name.length > 200)
        errors.name = 'Tên môn học không quá 200 ký tự.';

    if (!isValidIsoDate(from))
        errors.valid_from = 'Ngày bắt đầu phải đúng định dạng YYYY-MM-DD.';
    if (to) {
        if (!isValidIsoDate(to)) {
            errors.valid_to = 'Ngày kết thúc phải đúng định dạng YYYY-MM-DD.';
        } else if (isValidIsoDate(from) && to < from) {
            errors.valid_to = 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu.';
        }
    }
    return errors;
}

export function toSubjectRequest(input: {
    subject_code: string;
    name: string;
    valid_from: string;
    valid_to: string;
}): SubjectRequest {
    const trimmedTo = input.valid_to.trim();
    return {
        subject_code: input.subject_code.trim(),
        name: input.name.trim(),
        valid_from: input.valid_from.trim(),
        valid_to: trimmedTo || null,
    };
}

export function validateClassForm(input: {
    academic_year_id: string;
    grade_id: string;
    class_code: string;
    status: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.academic_year_id))
        errors.academic_year_id = 'Vui lòng chọn năm học.';
    if (!Number(input.grade_id)) errors.grade_id = 'Vui lòng chọn khối.';
    const code = input.class_code.trim();
    if (!code) errors.class_code = 'Vui lòng nhập tên / mã lớp.';
    else if (code.length > 50) errors.class_code = 'Mã lớp không quá 50 ký tự.';
    if (input.status !== 'ACTIVE' && input.status !== 'INACTIVE') {
        errors.status = 'Trạng thái lớp phải là ACTIVE hoặc INACTIVE.';
    }
    return errors;
}

export function toClassRequest(input: {
    academic_year_id: string;
    grade_id: string;
    class_code: string;
    status: ClassStatus;
}): SchoolClassRequest {
    return {
        academic_year_id: Number(input.academic_year_id),
        grade_id: Number(input.grade_id),
        class_code: input.class_code.trim(),
        status: input.status,
    };
}

export function validateGradeForm(input: {
    education_level_id: string;
    grade_code: string;
    name: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.education_level_id))
        errors.education_level_id = 'Vui lòng chọn cấp học.';
    const code = input.grade_code.trim();
    const name = input.name.trim();
    if (!code) errors.grade_code = 'Vui lòng nhập mã khối.';
    else if (code.length > 20)
        errors.grade_code = 'Mã khối không quá 20 ký tự.';
    if (!name) errors.name = 'Vui lòng nhập tên khối.';
    else if (name.length > 100) errors.name = 'Tên khối không quá 100 ký tự.';
    return errors;
}

export function toGradeRequest(input: {
    education_level_id: string;
    grade_code: string;
    name: string;
}): GradeRequest {
    return {
        education_level_id: Number(input.education_level_id),
        grade_code: input.grade_code.trim(),
        name: input.name.trim(),
    };
}

export function validateEducationLevelForm(input: {
    level_code: string;
    name: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    const code = input.level_code.trim();
    const name = input.name.trim();
    if (!code) errors.level_code = 'Vui lòng nhập mã cấp học.';
    else if (code.length > 30)
        errors.level_code = 'Mã cấp học không quá 30 ký tự.';
    if (!name) errors.name = 'Vui lòng nhập tên cấp học.';
    else if (name.length > 120)
        errors.name = 'Tên cấp học không quá 120 ký tự.';
    return errors;
}

export function toEducationLevelRequest(input: {
    level_code: string;
    name: string;
}): EducationLevelRequest {
    return {
        level_code: input.level_code.trim(),
        name: input.name.trim(),
    };
}

export function validateAcademicYearForm(input: {
    school_id: string;
    year_code: string;
    starts_on: string;
    ends_on: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.school_id)) errors.school_id = 'Vui lòng chọn trường.';
    const code = input.year_code.trim();
    if (!code) errors.year_code = 'Vui lòng nhập mã năm học.';
    else if (code.length > 30)
        errors.year_code = 'Mã năm học không quá 30 ký tự.';
    if (!isValidIsoDate(input.starts_on))
        errors.starts_on = 'Ngày bắt đầu không hợp lệ (YYYY-MM-DD).';
    if (!isValidIsoDate(input.ends_on))
        errors.ends_on = 'Ngày kết thúc không hợp lệ (YYYY-MM-DD).';
    else if (
        isValidIsoDate(input.starts_on) &&
        input.ends_on.trim() < input.starts_on.trim()
    ) {
        errors.ends_on = 'Ngày kết thúc năm học không được trước ngày bắt đầu.';
    }
    return errors;
}

export function toAcademicYearRequest(input: {
    school_id: string;
    year_code: string;
    starts_on: string;
    ends_on: string;
}): AcademicYearRequest {
    return {
        school_id: Number(input.school_id),
        year_code: input.year_code.trim(),
        starts_on: input.starts_on.trim(),
        ends_on: input.ends_on.trim(),
    };
}

export function validateSemesterForm(input: {
    academic_year_id: string;
    semester_no: string;
    starts_on: string;
    ends_on: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.academic_year_id))
        errors.academic_year_id = 'Vui lòng chọn năm học.';
    const no = Number(input.semester_no);
    if (!Number.isInteger(no) || no < 1 || no > 4) {
        errors.semester_no = 'Số thứ tự học kỳ phải là số nguyên từ 1 đến 4.';
    }
    if (!isValidIsoDate(input.starts_on))
        errors.starts_on = 'Ngày bắt đầu không hợp lệ (YYYY-MM-DD).';
    if (!isValidIsoDate(input.ends_on))
        errors.ends_on = 'Ngày kết thúc không hợp lệ (YYYY-MM-DD).';
    else if (
        isValidIsoDate(input.starts_on) &&
        input.ends_on.trim() < input.starts_on.trim()
    ) {
        errors.ends_on = 'Ngày kết thúc học kỳ không được trước ngày bắt đầu.';
    }
    return errors;
}

export function toSemesterRequest(input: {
    academic_year_id: string;
    semester_no: string;
    starts_on: string;
    ends_on: string;
}): SemesterRequest {
    return {
        academic_year_id: Number(input.academic_year_id),
        semester_no: Number(input.semester_no),
        starts_on: input.starts_on.trim(),
        ends_on: input.ends_on.trim(),
    };
}

export function validateAssignmentRoundForm(input: {
    semester_id: string;
    round_code: string;
    status: string;
    opens_at: string;
    closes_at: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Number(input.semester_id))
        errors.semester_id = 'Vui lòng chọn học kỳ.';
    const code = input.round_code.trim();
    if (!code) errors.round_code = 'Vui lòng nhập mã đợt phân công.';
    else if (code.length > 50)
        errors.round_code = 'Mã đợt phân công không quá 50 ký tự.';
    if (!['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'].includes(input.status)) {
        errors.status = 'Trạng thái đợt không hợp lệ.';
    }
    const opens = input.opens_at.trim();
    const closes = input.closes_at.trim();
    if (opens && !isValidIsoDateTime(opens)) {
        errors.opens_at = 'Thời điểm mở đợt không hợp lệ (ISO-8601).';
    }
    if (closes && !isValidIsoDateTime(closes)) {
        errors.closes_at = 'Thời điểm đóng đợt không hợp lệ (ISO-8601).';
    } else if (
        opens &&
        closes &&
        isValidIsoDateTime(opens) &&
        isValidIsoDateTime(closes) &&
        Date.parse(closes) < Date.parse(opens)
    ) {
        errors.closes_at = 'Thời điểm đóng đợt không được trước thời điểm mở.';
    }
    return errors;
}

export function toAssignmentRoundRequest(input: {
    semester_id: string;
    round_code: string;
    status: AssignmentRoundStatus;
    opens_at: string;
    closes_at: string;
    scope_confirmed_by?: number | null;
    scope_confirmed_at?: string | null;
}): AssignmentRoundRequest {
    return {
        semester_id: Number(input.semester_id),
        round_code: input.round_code.trim(),
        status: input.status,
        scope_confirmed_by: input.scope_confirmed_by ?? null,
        scope_confirmed_at: input.scope_confirmed_at ?? null,
        opens_at: input.opens_at.trim() || null,
        closes_at: input.closes_at.trim() || null,
    };
}

type ApiErrorLike = {
    status?: number;
    code?: string;
    message?: string;
};

export function formatCatalogApiError(error: unknown): string {
    if (error && typeof error === 'object') {
        const err = error as ApiErrorLike;
        switch (err.code) {
            case 'DUPLICATE_RESOURCE':
                return err.message || 'Bản ghi bị trùng mã trong phạm vi.';
            case 'REFERENCE_CONFLICT':
                return (
                    err.message ||
                    'Không thể thực hiện vì còn dữ liệu đang tham chiếu.'
                );
            case 'OVERLAPPING_PERIOD':
                return (
                    err.message ||
                    'Khoảng thời gian bị chồng lấn với bản ghi đã có.'
                );
            case 'DATA_CONSTRAINT':
            case 'INVALID_REQUEST':
                return err.message || 'Dữ liệu đầu vào không hợp lệ.';
            case 'RESOURCE_NOT_FOUND':
                return err.message || 'Không tìm thấy bản ghi cần xử lý.';
            default:
                if (typeof err.message === 'string' && err.message.trim()) {
                    return err.message;
                }
        }
    }
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return 'Thao tác danh mục thất bại. Vui lòng thử lại.';
}
