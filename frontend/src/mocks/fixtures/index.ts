import type { School, Teacher } from '../../features/teachers/types.ts';

export const schools: School[] = [
    {
        id: 1,
        school_code: 'THPT_AN_HOA',
        name: 'THPT An Hòa (mẫu)',
        status: 'ACTIVE',
    },
    {
        id: 2,
        school_code: 'THPT_BINH_MINH',
        name: 'THPT Bình Minh (mẫu)',
        status: 'ACTIVE',
    },
];
export const teachers: Teacher[] = [
    {
        id: 101,
        school_id: 1,
        teacher_code: 'GV001',
        full_name: 'Nguyễn Minh An',
    },
    { id: 102, school_id: 1, teacher_code: 'GV002', full_name: 'Trần Thu Hà' },
    { id: 103, school_id: 1, teacher_code: 'GV003', full_name: 'Lê Hoàng Nam' },
    {
        id: 104,
        school_id: 1,
        teacher_code: 'GV004',
        full_name: 'Phạm Ngọc Mai',
    },
    {
        id: 105,
        school_id: 1,
        teacher_code: 'GV005',
        full_name: 'Võ Thanh Bình',
    },
    { id: 106, school_id: 1, teacher_code: 'GV006', full_name: 'Đặng Thảo Vy' },
    {
        id: 201,
        school_id: 2,
        teacher_code: 'GV001',
        full_name: 'Bùi Quang Huy',
    },
    {
        id: 202,
        school_id: 2,
        teacher_code: 'GV002',
        full_name: 'Đỗ Khánh Linh',
    },
];
export const academicYears = schools.map((school) => ({
    id: school.id,
    school_id: school.id,
    year_code: '2026-2027',
    starts_on: '2026-08-01',
    ends_on: '2027-07-31',
}));
export const semesters = academicYears.map((year) => ({
    id: year.id,
    academic_year_id: year.id,
    semester_no: 1,
    starts_on: '2026-08-01',
    ends_on: '2026-12-31',
}));
export const educationLevels = [
    { id: 1, level_code: 'THPT', name: 'Trung học phổ thông' },
];
export const grades = [
    { id: 10, education_level_id: 1, grade_code: '10', name: 'Khối 10' },
    { id: 11, education_level_id: 1, grade_code: '11', name: 'Khối 11' },
];
export const classes = [
    {
        id: 11,
        academic_year_id: 1,
        grade_id: 10,
        class_code: '10A1',
        status: 'ACTIVE',
    },
    {
        id: 12,
        academic_year_id: 1,
        grade_id: 11,
        class_code: '11A1',
        status: 'ACTIVE',
    },
    {
        id: 21,
        academic_year_id: 2,
        grade_id: 10,
        class_code: '10A1',
        status: 'ACTIVE',
    },
];
export const subjects = [
    {
        id: 1,
        subject_code: 'TOAN',
        name: 'Toán',
        valid_from: '2026-08-01',
        valid_to: null,
    },
    {
        id: 2,
        subject_code: 'VAN',
        name: 'Ngữ văn',
        valid_from: '2026-08-01',
        valid_to: null,
    },
    {
        id: 3,
        subject_code: 'ANH',
        name: 'Tiếng Anh',
        valid_from: '2026-08-01',
        valid_to: null,
    },
];
