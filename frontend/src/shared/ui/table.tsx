import { RefreshStatus } from './refresh-status';
import { SkeletonLine } from './skeleton';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Icon } from './icon';
import styles from './table.module.css';

export type Column<Row> = {
    key: string;
    title: string;
    render: (row: Row) => ReactNode;
    align?: 'left' | 'right';
};
export function DataTable<Row>({
    caption,
    columns,
    rows,
    rowKey,
    emptyMessage = 'Chưa có dữ liệu.',
    variant = 'default',
    loading = false,
    updating = false,
}: {
    caption: string;
    columns: Column<Row>[];
    rows: Row[];
    rowKey: (row: Row) => string | number;
    emptyMessage?: string;
    variant?: 'default' | 'prototype';
    loading?: boolean;
    updating?: boolean;
}) {
    return (
        <div
            className={variant === 'prototype' ? 'table-scroll' : styles.scroll}
            role="region"
            aria-label={caption}
            tabIndex={0}
            style={{ position: 'relative' }}
        >
            <RefreshStatus active={updating && !loading} />
            {loading && (
                <span className="sr-only" role="status">
                    Đang tải dữ liệu…
                </span>
            )}
            <table
                aria-busy={loading || updating}
                inert={(updating && !loading) || undefined}
                className={
                    variant === 'prototype'
                        ? 'data-table mvp-table'
                        : styles.table
                }
            >
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                style={{ textAlign: column.align }}
                            >
                                {column.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        Array.from({ length: 6 }, (_, index) => (
                            <tr key={index} aria-hidden="true">
                                {columns.map((column) => (
                                    <td key={column.key}>
                                        <SkeletonLine />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : rows.length ? (
                        rows.map((row) => (
                            <tr key={rowKey(row)}>
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        style={{ textAlign: column.align }}
                                    >
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className={styles.empty}
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function Pagination({
    offset,
    limit,
    itemCount,
    hasNext,
    onPageChange,
    busy = false,
}: {
    offset: number;
    limit: number;
    itemCount: number;
    hasNext: boolean;
    onPageChange: (offset: number) => void;
    busy?: boolean;
}) {
    return (
        <nav className={styles.pagination} aria-label="Phân trang">
            <span aria-live="polite">
                {busy ? (
                    'Đang cập nhật kết quả…'
                ) : (
                    <>
                        Trang {Math.floor(offset / limit) + 1}
                        {itemCount > 0
                            ? ` · Dòng ${offset + 1}–${offset + itemCount}`
                            : ' · Không có dữ liệu'}
                    </>
                )}
            </span>
            <div>
                <Button
                    variant="secondary"
                    size="sm"
                    className="icon-btn"
                    aria-label="Trang trước"
                    title="Trang trước"
                    disabled={offset === 0 || busy}
                    onClick={() => onPageChange(Math.max(0, offset - limit))}
                >
                    <Icon glyph={ChevronLeft} size={16} />
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    className="icon-btn"
                    aria-label="Trang sau"
                    title="Trang sau"
                    disabled={!hasNext || busy}
                    onClick={() => onPageChange(offset + limit)}
                >
                    <Icon glyph={ChevronRight} size={16} />
                </Button>
            </div>
        </nav>
    );
}
