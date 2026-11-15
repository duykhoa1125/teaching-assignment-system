import type {
    OverviewActivityItem,
    OverviewAssignmentItem,
    OverviewComponentType,
    OverviewDashboard,
    OverviewTeacherLoad,
} from '../../features/overview/types.ts';

type SeedTeacher = {
    id: number;
    code: string;
    name: string;
    subjects: string[];
    fixed: number;
    reduction: number;
    converted: number;
    base: number;
    max: number;
    department: string;
    color: number;
};

type SeedDemand = OverviewAssignmentItem & {
    teacher_id: number | null;
};

const thptSubjects = [
    'Toán',
    'Ngữ văn',
    'Tiếng Anh',
    'Vật lý',
    'Hóa học',
    'Sinh học',
    'Tin học',
    'Lịch sử',
] as const;
const thptPeriods = [4, 3, 3, 2, 2, 2, 2, 2] as const;

const thptTeachers: SeedTeacher[] = [
    ['Nguyễn Minh Anh', 'Toán', 9, 0, 'Tổ Toán – Tin'],
    ['Trần Hoàng Nam', 'Toán', 8, 2, 'Tổ Toán – Tin'],
    ['Lê Thảo Nguyên', 'Ngữ văn', 10, 0, 'Tổ Ngữ văn'],
    ['Phạm Quỳnh Chi', 'Ngữ văn', 9, 0, 'Tổ Ngữ văn'],
    ['Võ Ngọc Hà', 'Tiếng Anh', 10, 0, 'Tổ Ngoại ngữ'],
    ['Đặng Quốc Bảo', 'Tiếng Anh', 9, 0, 'Tổ Ngoại ngữ'],
    ['Nguyễn Đức Huy', 'Vật lý', 9, 0, 'Tổ Khoa học tự nhiên'],
    ['Bùi Thanh Trúc', 'Vật lý', 10, 0, 'Tổ Khoa học tự nhiên'],
    ['Đỗ Minh Châu', 'Hóa học', 9, 0, 'Tổ Khoa học tự nhiên'],
    ['Hoàng Thu Uyên', 'Sinh học', 9, 0, 'Tổ Khoa học tự nhiên'],
    ['Trịnh Gia Khánh', 'Tin học', 9, 0, 'Tổ Toán – Tin'],
    ['Phan Bảo Ngọc', 'Lịch sử', 9, 0, 'Tổ Khoa học xã hội'],
].map((row, index) => ({
    id: index + 1,
    code: `GV${String(index + 1).padStart(3, '0')}`,
    name: row[0] as string,
    subjects: [row[1] as string],
    fixed: row[2] as number,
    reduction: row[3] as number,
    converted: 0,
    base: 17,
    max: 24,
    department: row[4] as string,
    color: index % 6,
}));

const thcsTeachers: SeedTeacher[] = [
    {
        id: 13,
        code: 'GV013',
        name: 'Phạm Khánh Linh',
        department: 'Tổ Khoa học tự nhiên',
        subjects: ['KHTN'],
        fixed: 8,
        converted: 0,
        reduction: 4,
        base: 19,
        max: 24,
        color: 1,
    },
    {
        id: 14,
        code: 'GV014',
        name: 'Vũ Anh Tuấn',
        department: 'Tổ Toán – Tin',
        subjects: ['Toán'],
        fixed: 9,
        converted: 0,
        reduction: 0,
        base: 19,
        max: 24,
        color: 2,
    },
    {
        id: 15,
        code: 'GV015',
        name: 'Lê Thanh Hương',
        department: 'Tổ Ngữ văn',
        subjects: ['Ngữ văn'],
        fixed: 9,
        converted: 0,
        reduction: 0,
        base: 19,
        max: 24,
        color: 3,
    },
];

function createThptDemands(assigned: boolean): SeedDemand[] {
    const demands: SeedDemand[] = [];
    const missingIndices = new Set([2, 9, 15, 22, 27, 30]);
    for (const [classIndex, className] of [
        '10A1',
        '10A2',
        '11A1',
        '12A1',
    ].entries()) {
        for (const [subjectIndex, subjectName] of thptSubjects.entries()) {
            const candidates = thptTeachers.filter((teacher) =>
                teacher.subjects.includes(subjectName),
            );
            const idx = demands.length;
            const teacher =
                assigned && !missingIndices.has(idx)
                    ? candidates[
                          (classIndex === 3 ? 0 : classIndex) %
                              candidates.length
                      ]
                    : undefined;
            demands.push({
                id: idx + 1,
                class_name: className,
                subject_name: subjectName,
                component_type: 'STANDARD',
                periods: thptPeriods[subjectIndex] ?? 1,
                locked: assigned && (idx === 0 || idx === 19),
                teacher_id: teacher?.id ?? null,
            });
        }
    }
    const topics: readonly [string, string][] = [
        ['12A1', 'Toán'],
        ['12A1', 'Ngữ văn'],
        ['11A1', 'Toán'],
        ['12A1', 'Tiếng Anh'],
    ];
    for (const [index, [className, subjectName]] of topics.entries()) {
        const teacher =
            assigned && index < 2
                ? thptTeachers.find((item) =>
                      item.subjects.includes(subjectName),
                  )
                : undefined;
        demands.push({
            id: demands.length + 1,
            class_name: className,
            subject_name: subjectName,
            component_type: 'SPECIALIZED_TOPIC',
            periods: 1,
            locked: false,
            teacher_id: teacher?.id ?? null,
        });
    }
    return demands;
}

function createThcsDemands(): SeedDemand[] {
    const demands: SeedDemand[] = [];
    const subjects: readonly [string, number][] = [
        ['KHTN', 4],
        ['Toán', 4],
        ['Ngữ văn', 3],
    ];
    for (const className of ['9A1', '9A2']) {
        for (const [subjectName, periods] of subjects) {
            demands.push({
                id: demands.length + 1,
                class_name: className,
                subject_name: subjectName,
                component_type: 'STANDARD',
                periods,
                locked: false,
                teacher_id: null,
            });
        }
    }
    demands.push({
        id: demands.length + 1,
        class_name: '9A1',
        subject_name: 'Toán',
        component_type: 'ENRICHMENT' satisfies OverviewComponentType,
        periods: 1,
        locked: false,
        teacher_id: null,
    });
    return demands;
}

function summarizeTeachers(
    teachers: SeedTeacher[],
    demands: SeedDemand[],
): OverviewTeacherLoad[] {
    return teachers.map((teacher) => {
        const assignments = demands
            .filter((item) => item.teacher_id === teacher.id)
            .map(({ teacher_id: _unused, ...rest }) => ({ ...rest }));
        const assignedPeriods = assignments.reduce(
            (sum, item) => sum + item.periods,
            0,
        );
        const workingPeriods =
            teacher.fixed + assignedPeriods + teacher.converted;
        const totalPeriods = workingPeriods + teacher.reduction;
        return {
            id: teacher.id,
            teacher_code: teacher.code,
            full_name: teacher.name,
            department_name: teacher.department,
            subjects: [...teacher.subjects],
            color_index: teacher.color,
            portrait_key: ((Math.abs(teacher.id) - 1) % 12) + 1,
            fixed_periods: teacher.fixed,
            assigned_periods: assignedPeriods,
            converted_periods: teacher.converted,
            reduction_periods: teacher.reduction,
            working_periods: workingPeriods,
            quota_remaining: Math.max(0, teacher.base - teacher.reduction),
            total_periods: totalPeriods,
            base_norm: teacher.base,
            weekly_limit: teacher.max,
            delta: totalPeriods - teacher.base,
            assignments,
        };
    });
}

function buildOverviewContext(config: {
    contextId: string;
    round: string;
    contextTitle: string;
    planVersion: number;
    planRevision: number;
    feedbackDueAt: string | null;
    pendingFeedbackCount: number;
    teachers: SeedTeacher[];
    demands: SeedDemand[];
    recentActivity: OverviewActivityItem[];
}): OverviewDashboard {
    const teacherLoads = summarizeTeachers(config.teachers, config.demands);
    const assignedDemands = config.demands.filter(
        (item) => item.teacher_id !== null,
    ).length;
    const totalDemands = config.demands.length;
    const unassignedDemands = totalDemands - assignedDemands;
    const lockedDemands = config.demands.filter((item) => item.locked).length;
    const totalPeriods = config.demands.reduce(
        (sum, item) => sum + item.periods,
        0,
    );
    const over = teacherLoads.filter((item) => item.delta > 0).length;
    const under = teacherLoads.filter((item) => item.delta < 0).length;
    const balanced = teacherLoads.length - over - under;

    const gradeTotals = new Map<string, number>();
    const classes = new Set<string>();
    for (const demand of config.demands) {
        classes.add(demand.class_name);
        const grade = demand.class_name.match(/^\d+/)?.[0] ?? '';
        if (grade) {
            gradeTotals.set(
                grade,
                (gradeTotals.get(grade) ?? 0) + demand.periods,
            );
        }
    }

    return {
        context_id: config.contextId,
        round: config.round,
        context_title: config.contextTitle,
        academic_year: '2026–2027',
        school_name: 'THPT An Hòa',
        phase: 'DRAFT',
        plan_version: config.planVersion,
        plan_revision: config.planRevision,
        feedback_due_at: config.feedbackDueAt,
        readiness: {
            required_inputs_count: totalDemands,
            scope_confirmed: false,
            required_confirmed: false,
            validation_fresh: false,
            validation_releasable: false,
        },
        summary: {
            teachers_count: teacherLoads.length,
            balanced_teachers_count: balanced,
            under_norm_teachers_count: under,
            over_norm_teachers_count: over,
            total_periods: totalPeriods,
            total_demands: totalDemands,
            assigned_demands: assignedDemands,
            unassigned_demands: unassignedDemands,
            locked_demands: lockedDemands,
            class_count: classes.size,
            coverage_percent: totalDemands
                ? Math.round((assignedDemands / totalDemands) * 100)
                : 0,
            pending_feedback_count: config.pendingFeedbackCount,
            demands_by_grade: [...gradeTotals.entries()].map(
                ([grade, periods]) => ({ grade, periods }),
            ),
        },
        teachers: teacherLoads,
        recent_activity: config.recentActivity,
    };
}

const hk1Overview = buildOverviewContext({
    contextId: 'hk1',
    round: 'PC-01',
    contextTitle: 'Học kỳ I',
    planVersion: 2,
    planRevision: 4,
    feedbackDueAt: '2026-11-15T17:00',
    pendingFeedbackCount: 2,
    teachers: thptTeachers,
    demands: createThptDemands(true),
    recentActivity: [
        {
            id: 'act-hk1-1',
            title: 'Đã tạo phiên bản V02',
            detail: ' · Tiếp nhận phản hồi từ V01',
            actor_name: 'Nguyễn Minh Khoa',
            actor_portrait_key: 'manager',
            actor_color_index: 0,
            time_label: 'Hôm nay, 08:45',
        },
        {
            id: 'act-hk1-2',
            title: 'Cập nhật nhu cầu học kỳ I',
            detail: '36 thành phần nhu cầu · 4 lớp học',
            actor_name: null,
            actor_portrait_key: null,
            actor_color_index: 0,
            time_label: 'Hôm qua, 15:30',
        },
        {
            id: 'act-hk1-3',
            title: 'Đã xác nhận hồ sơ chuyên môn',
            detail: '12 giáo viên · 8 môn học',
            actor_name: null,
            actor_portrait_key: null,
            actor_color_index: 0,
            time_label: 'Hôm qua, 09:15',
        },
    ],
});

const hk2Overview = buildOverviewContext({
    contextId: 'hk2',
    round: 'PC-02',
    contextTitle: 'Học kỳ II',
    planVersion: 1,
    planRevision: 0,
    feedbackDueAt: null,
    pendingFeedbackCount: 0,
    teachers: thptTeachers,
    demands: createThptDemands(false),
    recentActivity: [
        {
            id: 'act-hk2-1',
            title: 'Khởi tạo không gian học kỳ II',
            detail: 'Bộ dữ liệu minh họa độc lập · 36 nhu cầu',
            actor_name: null,
            actor_portrait_key: null,
            actor_color_index: 0,
            time_label: 'Vừa xong',
        },
    ],
});

const thcsOverview = buildOverviewContext({
    contextId: 'thcs-demo',
    round: 'PC-THCS',
    contextTitle: 'THCS · Trải nghiệm',
    planVersion: 1,
    planRevision: 0,
    feedbackDueAt: null,
    pendingFeedbackCount: 0,
    teachers: thcsTeachers,
    demands: createThcsDemands(),
    recentActivity: [],
});

export const overviewByContext: Record<string, OverviewDashboard> = {
    hk1: hk1Overview,
    hk2: hk2Overview,
    'thcs-demo': thcsOverview,
};

export function readOverviewFixture(
    contextId: string,
    empty: boolean,
): OverviewDashboard | null {
    const base = overviewByContext[contextId];
    if (!base) return null;
    if (!empty) return structuredClone(base);
    return {
        ...structuredClone(base),
        readiness: {
            required_inputs_count: 0,
            scope_confirmed: false,
            required_confirmed: false,
            validation_fresh: false,
            validation_releasable: false,
        },
        summary: {
            teachers_count: 0,
            balanced_teachers_count: 0,
            under_norm_teachers_count: 0,
            over_norm_teachers_count: 0,
            total_periods: 0,
            total_demands: 0,
            assigned_demands: 0,
            unassigned_demands: 0,
            locked_demands: 0,
            class_count: 0,
            coverage_percent: 0,
            pending_feedback_count: 0,
            demands_by_grade: [],
        },
        teachers: [],
        recent_activity: [],
    };
}
