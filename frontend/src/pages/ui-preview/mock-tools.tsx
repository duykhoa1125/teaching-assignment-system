import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { resetMockClientSession } from '@/features/session/storage';
import { mockStore } from '@/mocks/store';
import { isMockScenario, scenarios } from '@/mocks/scenarios';
import { teachersApi } from '@/features/teachers/api';
import { Button } from '@/shared/ui/button';
import { SelectField } from '@/shared/ui/fields';
import { DataTable } from '@/shared/ui/table';
import { ErrorState, LoadingState } from '@/shared/ui/data-state';
import { useToast } from '@/shared/ui/toast-context';
import styles from './ui-preview.module.css';

export function MockTools() {
    const client = useQueryClient();
    const notify = useToast();
    const [scenario, setScenario] = useState(mockStore.scenario);
    const [busy, setBusy] = useState(false);
    const query = useQuery({
        queryKey: ['dev', 'mock-probe'],
        queryFn: ({ signal }) => teachersApi.list({ limit: 3 }, signal),
        retry: false,
    });
    async function applyScenario(value: string, reset = false) {
        if (!isMockScenario(value)) return;
        setBusy(true);
        try {
            await client.cancelQueries();
            if (reset) {
                mockStore.reset();
                resetMockClientSession();
            } else mockStore.setScenario(value);
            setScenario(mockStore.scenario);
            await client.resetQueries();
            if (reset)
                notify({
                    title: 'Đã khôi phục fixture mock và query cache',
                    tone: 'success',
                });
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className={styles.panel} aria-labelledby="mock-title">
            <div className={styles.sectionHeading}>
                <span>06</span>
                <h2 id="mock-title">Kiểm tra MSW</h2>
                <span className={styles.badge}>Dữ liệu mẫu</span>
            </div>
            <p className={styles.help}>
                Công cụ phát triển gọi qua API client và TanStack Query. Dữ liệu
                chỉ nằm trong bộ nhớ; tải lại trang sẽ về fixture gốc. Reset áp
                dụng toàn bộ mock store và query cache.
            </p>
            <div className={styles.mockToolbar}>
                <SelectField
                    label="Kịch bản mock"
                    value={scenario}
                    disabled={busy}
                    onChange={(event) => void applyScenario(event.target.value)}
                >
                    {Object.entries(scenarios).map(([value, item]) => (
                        <option key={value} value={value}>
                            {item.label}
                        </option>
                    ))}
                </SelectField>
                <Button
                    variant="secondary"
                    icon={RotateCcw}
                    disabled={busy}
                    onClick={() => void applyScenario('normal', true)}
                >
                    Reset mock
                </Button>
            </div>
            {query.isPending || query.isFetching ? (
                <LoadingState label="Đang đọc dữ liệu qua MSW…" />
            ) : query.isError ? (
                <ErrorState
                    message={query.error.message}
                    onRetry={() => void query.refetch()}
                />
            ) : (
                <DataTable
                    caption="Kết quả GET giáo viên qua mock"
                    rowKey={(teacher) => teacher.id}
                    rows={query.data}
                    columns={[
                        {
                            key: 'code',
                            title: 'Mã giáo viên',
                            render: (teacher) => teacher.teacher_code,
                        },
                        {
                            key: 'name',
                            title: 'Họ và tên',
                            render: (teacher) => teacher.full_name,
                        },
                        {
                            key: 'school',
                            title: 'ID trường',
                            render: (teacher) => teacher.school_id,
                        },
                    ]}
                />
            )}
        </section>
    );
}
