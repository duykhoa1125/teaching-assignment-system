import type { QueryClient } from '@tanstack/react-query';

/** All views derived from a plan/source/validation or lifecycle change. */
export async function invalidatePlanQueries(client: QueryClient) {
    await Promise.all(
        [
            'assignment-workspace',
            'preparation',
            'governance',
            'overview',
            'teacher-overview',
            'admin-overview',
            'mock-layout',
            'mock-session',
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
}
