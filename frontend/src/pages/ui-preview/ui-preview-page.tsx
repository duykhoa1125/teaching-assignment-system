import { Skeleton } from '@/shared/ui/skeleton';
import { PageHeadingContent } from '@/shared/ui/page-heading-content';
import {
    lazy,
    Suspense,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { InputField, SelectField, TextareaField } from '@/shared/ui/fields';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { DataTable, Pagination } from '@/shared/ui/table';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState, LoadingState } from '@/shared/ui/data-state';
import { useToast } from '@/shared/ui/toast-context';
import styles from './ui-preview.module.css';

const MockTools =
    import.meta.env.VITE_DATA_SOURCE === 'mock'
        ? lazy(() =>
              import('./mock-tools').then((module) => ({
                  default: module.MockTools,
              })),
          )
        : null;
const examples = [
    {
        id: '01',
        name: 'Nút bấm',
        usage: 'Thao tác chính và phụ',
        state: 'Sẵn sàng',
    },
    {
        id: '02',
        name: 'Biểu mẫu',
        usage: 'Nhập và kiểm tra dữ liệu',
        state: 'Sẵn sàng',
    },
    {
        id: '03',
        name: 'Hộp thoại',
        usage: 'Xác nhận thao tác',
        state: 'Sẵn sàng',
    },
];

export function UiPreviewPage() {
    const notify = useToast();
    const [dialog, setDialog] = useState<'form' | 'confirm' | null>(null);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState('Mẫu giao diện TASS');
    const [error, setError] = useState('');
    const [offset, setOffset] = useState(0);
    const [state, setState] = useState('loading');
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const saveForm = (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setError('Vui lòng nhập tên hiển thị.');
            return;
        }
        setDialog(null);
        setError('');
        notify({
            title: 'Đã thử biểu mẫu',
            description: 'Ví dụ UI này không ghi dữ liệu nghiệp vụ.',
            tone: 'success',
        });
    };
    const rows = examples.slice(offset, offset + 2);
    return (
        <>
            <PageHeadingContent>
                <div className="page-heading">
                    <p className="eyebrow">DÀNH CHO PHÁT TRIỂN</p>
                    <h1>Thư viện giao diện</h1>
                    <p>
                        Các thành phần dùng chung của TASS. Trang này không xuất
                        hiện trong bản triển khai API.
                    </p>
                </div>
            </PageHeadingContent>
            <section className={styles.panel} aria-labelledby="identity-title">
                <div className={styles.sectionHeading}>
                    <span>01</span>
                    <h2 id="identity-title">Ngôn ngữ giao diện</h2>
                </div>
                <div className={styles.identity}>
                    <div>
                        <p className="eyebrow">
                            BE VIETNAM PRO · 400 / 500 / 600 / 700
                        </p>
                        <h3>Rõ ràng trong từng phân công.</h3>
                        <p>
                            Chữ Việt đủ dấu: Nguyễn, giảng dạy, chuyên môn, học
                            kỳ.
                        </p>
                        <p>
                            Font được phục vụ cùng ứng dụng; icon kế thừa SVG
                            gốc trong demo với nét 1,6px và lớp màu duo.
                        </p>
                    </div>
                    <div className={styles.swatches}>
                        {[
                            ['Chủ đạo', 'var(--primary)'],
                            ['Nội dung', 'var(--ink)'],
                            ['Thành công', 'var(--success)'],
                            ['Nền', 'var(--bg)'],
                        ].map(([label, color]) => (
                            <div key={label}>
                                <span style={{ background: color }} />
                                <small>{label}</small>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <div className={styles.grid}>
                <section
                    className={styles.panel}
                    aria-labelledby="buttons-title"
                >
                    <div className={styles.sectionHeading}>
                        <span>02</span>
                        <h2 id="buttons-title">Nút và thông báo</h2>
                    </div>
                    <div className={styles.row}>
                        <Button icon={Plus} onClick={() => setDialog('form')}>
                            Mở biểu mẫu
                        </Button>
                        <Button
                            variant="secondary"
                            icon={Save}
                            onClick={() =>
                                notify({
                                    title: 'Ví dụ đã được lưu',
                                    tone: 'success',
                                })
                            }
                        >
                            Thử thông báo
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() =>
                                notify({
                                    title: 'Không thể hoàn tất thao tác mẫu',
                                    description:
                                        'Thông báo lỗi tự đóng sau 8 giây; tạm dừng khi rê chuột hoặc focus.',
                                    tone: 'error',
                                })
                            }
                        >
                            Thử lỗi
                        </Button>
                        <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={() => setDialog('confirm')}
                        >
                            Thử xác nhận
                        </Button>
                    </div>
                    <div className={styles.row}>
                        <Button
                            size="sm"
                            icon={Check}
                            onClick={() => notify({ title: 'Đã chọn nút nhỏ' })}
                        >
                            Nút nhỏ
                        </Button>
                        <Button disabled>Không khả dụng</Button>
                        <Button loading>Đang lưu</Button>
                    </div>
                </section>
                <section
                    className={styles.panel}
                    aria-labelledby="fields-title"
                >
                    <div className={styles.sectionHeading}>
                        <span>03</span>
                        <h2 id="fields-title">Trường nhập</h2>
                    </div>
                    <div className={styles.form}>
                        <InputField
                            label="Tên hiển thị"
                            placeholder="Nhập nội dung"
                            hint="Nhãn và nội dung trợ giúp được liên kết với trường nhập."
                        />
                        <InputField
                            label="Ví dụ kiểm tra lỗi"
                            defaultValue=""
                            error="Vui lòng bổ sung nội dung."
                        />
                        <SelectField
                            label="Kích thước hiển thị"
                            defaultValue="standard"
                        >
                            <option value="standard">Tiêu chuẩn</option>
                            <option value="compact">Gọn</option>
                        </SelectField>
                        <TextareaField
                            label="Ghi chú"
                            placeholder="Nội dung nhiều dòng…"
                        />
                    </div>
                </section>
            </div>
            <section className={styles.panel} aria-labelledby="table-title">
                <div className={styles.sectionHeading}>
                    <span>04</span>
                    <h2 id="table-title">Bảng và phân trang</h2>
                </div>
                <DataTable
                    caption="Danh mục thành phần giao diện mẫu"
                    rows={rows}
                    rowKey={(row) => row.id}
                    columns={[
                        { key: 'id', title: 'STT', render: (row) => row.id },
                        {
                            key: 'name',
                            title: 'Thành phần',
                            render: (row) => <strong>{row.name}</strong>,
                        },
                        {
                            key: 'usage',
                            title: 'Cách dùng',
                            render: (row) => row.usage,
                        },
                        {
                            key: 'state',
                            title: 'Trạng thái',
                            render: (row) => (
                                <span className={styles.badge}>
                                    {row.state}
                                </span>
                            ),
                        },
                    ]}
                />
                <Pagination
                    offset={offset}
                    limit={2}
                    itemCount={rows.length}
                    hasNext={offset + rows.length < examples.length}
                    onPageChange={setOffset}
                />
            </section>
            <section className={styles.panel} aria-labelledby="states-title">
                <div className={styles.sectionHeading}>
                    <span>05</span>
                    <h2 id="states-title">Trạng thái dữ liệu</h2>
                </div>
                <div className={styles.stateSelector}>
                    <SelectField
                        label="Trạng thái xem thử"
                        value={state}
                        onChange={(event) => setState(event.target.value)}
                    >
                        <option value="loading">Đang tải</option>
                        <option value="table">Skeleton bảng</option>
                        <option value="dashboard">Skeleton tổng quan</option>
                        <option value="teachers">Skeleton giáo viên</option>
                        <option value="detail">Skeleton chi tiết</option>
                        <option value="refresh">Cập nhật dữ liệu cũ</option>
                        <option value="empty">Trống</option>
                        <option value="error">Lỗi</option>
                    </SelectField>
                </div>
                {state === 'loading' ? (
                    <LoadingState />
                ) : ['table', 'refresh'].includes(state) ? (
                    <DataTable
                        caption="Bảng xem thử trạng thái tải"
                        loading={state === 'table'}
                        updating={state === 'refresh'}
                        rows={examples}
                        rowKey={(row) => row.id}
                        columns={[
                            {
                                key: 'name',
                                title: 'Thành phần',
                                render: (row) => row.name,
                            },
                            {
                                key: 'usage',
                                title: 'Cách dùng',
                                render: (row) => row.usage,
                            },
                            {
                                key: 'state',
                                title: 'Trạng thái',
                                render: (row) => row.state,
                            },
                        ]}
                    />
                ) : ['dashboard', 'teachers', 'detail'].includes(state) ? (
                    <div role="status" aria-busy="true">
                        <span className="sr-only">Đang tải dữ liệu…</span>
                        <Skeleton
                            variant={
                                state as 'dashboard' | 'teachers' | 'detail'
                            }
                        />
                    </div>
                ) : state === 'empty' ? (
                    <EmptyState title="Chưa có dữ liệu">
                        <p>Nội dung sẽ xuất hiện khi có dữ liệu phù hợp.</p>
                    </EmptyState>
                ) : (
                    <ErrorState
                        message="Đây là tình huống lỗi minh họa."
                        onRetry={() => {
                            setState('loading');
                            timer.current = setTimeout(
                                () => setState('empty'),
                                700,
                            );
                        }}
                    />
                )}
            </section>
            {MockTools && (
                <Suspense
                    fallback={<LoadingState label="Đang mở công cụ mock…" />}
                >
                    <MockTools />
                </Suspense>
            )}
            <Dialog
                open={dialog === 'form'}
                onOpenChange={(open) => setDialog(open ? 'form' : null)}
                title="Biểu mẫu dùng chung"
                description="Thử nhập nội dung, di chuyển bằng Tab và đóng bằng Escape."
            >
                <form className={styles.form} onSubmit={saveForm}>
                    <InputField
                        label="Tên hiển thị"
                        autoFocus
                        required
                        value={name}
                        error={error}
                        onChange={(event) => {
                            setName(event.target.value);
                            setError('');
                        }}
                    />
                    <TextareaField
                        label="Mô tả"
                        placeholder="Ghi chú cho ví dụ này"
                    />
                    <div className={styles.actions}>
                        <Button
                            variant="secondary"
                            onClick={() => setDialog(null)}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" icon={Save}>
                            Lưu ví dụ
                        </Button>
                    </div>
                </form>
            </Dialog>
            <ConfirmDialog
                open={dialog === 'confirm'}
                onOpenChange={(open) => setDialog(open ? 'confirm' : null)}
                title="Thử thao tác xác nhận"
                description="Ví dụ này không xóa dữ liệu. Nút hủy được chọn trước để tránh thao tác nhầm."
                destructive
                confirmLabel="Xác nhận ví dụ"
                busy={busy}
                onConfirm={() => {
                    setBusy(true);
                    timer.current = setTimeout(() => {
                        setBusy(false);
                        setDialog(null);
                        notify({
                            title: 'Đã hoàn tất ví dụ xác nhận',
                            tone: 'success',
                        });
                    }, 500);
                }}
            />
        </>
    );
}
