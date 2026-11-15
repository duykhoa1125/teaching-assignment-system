import { useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/http';
import { AppErrorBoundary } from '@/app/error-boundary';

export function AppProviders({ children }: PropsWithChildren) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        retry: (failureCount, error) =>
                            failureCount < 1 &&
                            (!(error instanceof ApiError) ||
                                error.status >= 500),
                    },
                    mutations: { retry: false },
                },
            }),
    );
    return (
        <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </AppErrorBoundary>
    );
}
