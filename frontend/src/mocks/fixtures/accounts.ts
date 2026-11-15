export type MockAuthRole = 'admin' | 'manager' | 'teacher';

export type MockDemoAccount = {
    id: string;
    login: string;
    name: string;
    roles: MockAuthRole[];
    status: 'active' | 'locked';
    school: string | null;
    portraitId?: 'manager' | number;
    teacherId?: number;
    grades?: string[];
    from?: string;
    to?: string;
};

export const DEMO_LOGIN_PASSWORD = 'demo2026';

export const demoAccounts: MockDemoAccount[] = [
    {
        id: 'admin',
        login: 'quantri@tass.demo',
        name: 'Lê Hải An',
        roles: ['admin'],
        status: 'active',
        school: 'anhoa',
        portraitId: 101,
    },
    {
        id: 'manager',
        login: 'quanly@tass.demo',
        name: 'Nguyễn Minh Khoa',
        roles: ['manager'],
        status: 'active',
        school: 'anhoa',
        portraitId: 'manager',
    },
    {
        id: 'teacher',
        login: 'giaovien@tass.demo',
        name: 'Nguyễn Minh Anh',
        roles: ['teacher'],
        status: 'active',
        school: 'anhoa',
        teacherId: 1,
    },
    {
        id: 'dual',
        login: 'kiemnhiem@tass.demo',
        name: 'Nguyễn Minh Khoa',
        roles: ['admin', 'manager'],
        status: 'active',
        school: 'anhoa',
        portraitId: 'manager',
    },
    {
        id: 'locked',
        login: 'tamkhoa@tass.demo',
        name: 'Trần Hoàng Nam',
        roles: ['teacher'],
        status: 'locked',
        school: 'anhoa',
        teacherId: 2,
    },
    {
        id: 'unscoped',
        login: 'chuaphamvi@tass.demo',
        name: 'Lê Bình Minh',
        roles: ['manager'],
        status: 'active',
        school: null,
        portraitId: 103,
    },
    {
        id: 'teacher-thcs',
        login: 'gvthcs@tass.demo',
        name: 'Phạm Khánh Linh',
        roles: ['teacher'],
        status: 'active',
        school: 'anhoa',
        teacherId: 13,
    },
];
