import { roundPath } from '@/features/preparation/round-navigation';
import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import {
    useAssignmentRows,
    useCurrentPlan,
    useWorkloads,
} from '@/features/assignment/queries';
import type { WorkloadRow } from '@/features/assignment/types';
import { useAssignmentRoundsQuery } from '@/features/catalogs/queries';
import {
    DEMAND_TYPE_LABELS,
    formatPeriods,
} from '@/features/preparation/model';
import { useRoundSelection } from '@/features/preparation/round-context';
import {
    buildWorkloadCsv,
    extractAnnualLoad,
    extractWeeklyCap,
    formatLoadNumber,
    summarizeWorkloadItems,
} from '@/features/results/model';
import { RolePageHeader, RoleStateCard } from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Dialog } from '@/shared/ui/dialog';
import { Drawer } from '@/shared/ui/drawer';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import '../results/results.css';

type WorkloadFilter = 'all' | 'over' | 'cap';

function triggerDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function WorkloadPage() {
    const { contextId, activeContext } = useSession();
    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const rounds = roundsQuery.data ?? [];
    const { activeRound, selectRoundId } = useRoundSelection(
        rounds,
        contextId,
        activeContext?.round,
    );
    const planQuery = useCurrentPlan(activeRound?.id ?? null);
    const plan = planQuery.data ?? null;
    const workloadsQuery = useWorkloads(plan?.version_id ?? null);
    const rowsQuery = useAssignmentRows(plan?.version_id ?? null, {});

    const [filter, setFilter] = useState<WorkloadFilter>('all');
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
        null,
    );
    const [helpOpen, setHelpOpen] = useState(false);

    if (roundsQuery.isPending || planQuery.isPending) {
        return (
            <RoleStateCard
                kind="loading"
                title="Đang tải định mức & bảng tải…"
                detail="Đang đọc dữ liệu F, A, C, R và quy tắc giới hạn của phiên bản."
            />
        );
    }

    if (roundsQuery.isError || !activeRound) {
        return (
            <RoleStateCard
                kind={roundsQuery.isError ? 'error' : 'empty'}
                title="Chưa có đợt phân công để tính tải"
                detail="Kiểm tra lại danh sách đợt phân công trong Chuẩn bị dữ liệu."
                actions={
                    <Link
                        to={roundPath(
                            '/preparation',
                            activeRound?.id,
                            contextId,
                        )}
                        className="btn small"
                    >
                        Mở Chuẩn bị dữ liệu
                    </Link>
                }
            />
        );
    }

    if (planQuery.isError) {
        return (
            <RoleStateCard
                kind={
                    planQuery.error instanceof ApiError &&
                    planQuery.error.status === 404
                        ? 'empty'
                        : 'error'
                }
                title={
                    planQuery.error instanceof ApiError &&
                    planQuery.error.status === 404
                        ? 'Đợt này chưa có phiên bản phương án'
                        : 'Không tải được phương án phân công'
                }
                detail={
                    planQuery.error instanceof Error
                        ? planQuery.error.message
                        : 'Tạo phương án ở Phân công giảng dạy trước khi xem tải.'
                }
                actions={
                    <Link
                        to={roundPath(
                            '/assignment',
                            activeRound?.id,
                            contextId,
                        )}
                        className="btn primary small"
                    >
                        Mở Phân công
                    </Link>
                }
            />
        );
    }

    if (!plan || workloadsQuery.isPending) {
        return (
            <RoleStateCard
                kind="loading"
                title="Đang tổng hợp tải giảng dạy…"
                detail="Đang đọc bảng tải và giới hạn từ API workloads."
            />
        );
    }

    if (workloadsQuery.isError) {
        return (
            <RoleStateCard
                kind="error"
                title="Không đọc được bảng tải"
                detail={
                    workloadsQuery.error instanceof Error
                        ? workloadsQuery.error.message
                        : 'Lỗi tải dữ liệu.'
                }
                actions={
                    <button
                        type="button"
                        className="btn small"
                        onClick={() => void workloadsQuery.refetch()}
                    >
                        Thử lại
                    </button>
                }
            />
        );
    }

    const page = workloadsQuery.data;
    const allItems = page.items;
    const summary = summarizeWorkloadItems(allItems);
    const rows = rowsQuery.data?.items ?? [];

    const filteredItems = allItems.filter((item) => {
        if (filter === 'over') return (item.delta_t ?? 0) > 0.001;
        if (filter === 'cap') {
            return extractWeeklyCap(item).status === 'VIOLATION';
        }
        return true;
    });

    const chartScaleMax = Math.max(
        26,
        ...allItems.map((item) => item.t + 2),
        ...summary.weeklyCaps.map((cap) => cap + 2),
    );
    const weeklyCapDisplay =
        summary.weeklyCaps.length === 1
            ? `${summary.weeklyCaps[0]} tiết / tuần`
            : summary.weeklyCaps.length > 1
              ? `${summary.weeklyCaps[0]}–${summary.weeklyCaps[summary.weeklyCaps.length - 1]} tiết / tuần`
              : 'Theo quy tắc đợt';

    const selectedTeacher: WorkloadRow | null =
        selectedTeacherId !== null
            ? (allItems.find((item) => item.teacher_id === selectedTeacherId) ??
              null)
            : null;
    const selectedTeacherRows = selectedTeacher
        ? rows.filter((r) => r.teacher_id === selectedTeacher.teacher_id)
        : [];

    return (
        <div>
            <div className="page-control-row">
                <RolePageHeader
                    roundLabel={activeRound.round_code}
                    contextLabel={`V${String(plan.version_no).padStart(2, '0')} · r${plan.revision_no}`}
                    title="Mỗi thành phần tải, một nguồn rõ ràng."
                    description="Đối chiếu T = F + A + C + R, W = F + A + C, Q = max(0, B − R) trên đúng snapshot hiệu lực."
                    actions={
                        <div className="mvp-actions">
                            <button
                                type="button"
                                className="btn"
                                onClick={() =>
                                    triggerDownload(
                                        buildWorkloadCsv(allItems),
                                        `TASS-tai-${activeRound.round_code}-V${plan.version_no}.csv`,
                                    )
                                }
                            >
                                <Icon name="download" />
                                Tải CSV tải
                            </button>
                            <Link
                                to={roundPath(
                                    '/checks',
                                    activeRound?.id,
                                    contextId,
                                )}
                                className="btn"
                            >
                                <Icon name="shield" />
                                Kiểm tra phương án
                            </Link>
                        </div>
                    }
                />

                <div className="results-round-strip">
                    <label>
                        Đợt phân công
                        <select
                            id="workload-round-select"
                            name="round_id"
                            aria-label="Chọn đợt phân công xem tải"
                            value={activeRound.id}
                            onChange={(e) =>
                                selectRoundId(Number(e.target.value))
                            }
                        >
                            {rounds.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.round_code} ({item.status})
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            <div className="metrics">
                <article className="panel metric">
                    <div className="metric-top">
                        <span>Đạt định mức</span>
                        <span className="metric-icon">
                            <Icon name="check" />
                        </span>
                    </div>
                    <div className="metric-value">
                        {summary.balanced}
                        <span>giáo viên</span>
                    </div>
                    <div className="metric-foot">
                        <strong>Tổng công tác T = B</strong>
                    </div>
                </article>
                <article className="panel metric">
                    <div className="metric-top">
                        <span>Dưới định mức</span>
                        <span className="metric-icon">
                            <Icon name="leaf" />
                        </span>
                    </div>
                    <div className="metric-value">
                        {summary.under}
                        <span>giáo viên</span>
                    </div>
                    <div className="metric-foot">
                        <span>Còn khả năng nhận phân công</span>
                    </div>
                </article>
                <article className="panel metric metric-accent">
                    <div className="metric-top">
                        <span>Vượt định mức</span>
                        <span className="metric-icon">
                            <Icon name="balance" />
                        </span>
                    </div>
                    <div className="metric-value">
                        {summary.over}
                        <span>giáo viên</span>
                    </div>
                    <div className="metric-foot">
                        <span>Cần rà soát và cân đối</span>
                    </div>
                </article>
                <article className="panel metric">
                    <div className="metric-top">
                        <span>Giới hạn tuần theo quy tắc</span>
                        <span className="metric-icon">
                            <Icon name="shield" />
                        </span>
                    </div>
                    <div
                        className="metric-value"
                        style={{
                            fontSize: summary.weeklyCaps.length ? 28 : 20,
                        }}
                    >
                        {summary.weeklyCaps.length === 1
                            ? summary.weeklyCaps[0]
                            : summary.weeklyCaps.length > 1
                              ? `${summary.weeklyCaps[0]}–${summary.weeklyCaps[summary.weeklyCaps.length - 1]}`
                              : '—'}
                        {summary.weeklyCaps.length ? (
                            <span>tiết / tuần</span>
                        ) : null}
                    </div>
                    <div className="metric-foot">
                        <span>
                            Đọc từ quy tắc kiểm tra ({weeklyCapDisplay})
                        </span>
                    </div>
                </article>
            </div>

            <div className="banner">
                <Icon name="balance" />
                <span className="grow">
                    Tổng công tác <b>T = F + A + C + R</b> · Đang gánh{' '}
                    <b>W = F + A + C</b> · Phần gán mới tối đa còn lại{' '}
                    <b>Q = max(0, B − R)</b>. Vượt định mức cơ sở <b>B</b> chưa
                    đồng nghĩa vượt trần tải tuần.
                </span>
            </div>

            {allItems.length > 0 ? (
                <section className="panel results-chart-card">
                    <div className="panel-head">
                        <div>
                            <h2>Biểu đồ cấu phần tải theo giáo viên</h2>
                            <p>
                                Bấm vào từng cột để xem phân công chi tiết và
                                các kết luận tuần / năm của giáo viên
                            </p>
                        </div>
                    </div>
                    <div className="panel-body">
                        <div className="chart-legend">
                            <span>
                                <i
                                    className="legend-dot"
                                    style={{ background: 'var(--fixed)' }}
                                />
                                Cố định (F)
                            </span>
                            <span>
                                <i
                                    className="legend-dot"
                                    style={{ background: 'var(--assigned)' }}
                                />
                                Phân công (A)
                            </span>
                            <span>
                                <i
                                    className="legend-dot"
                                    style={{ background: 'var(--converted)' }}
                                />
                                Quy đổi (C)
                            </span>
                            <span>
                                <i
                                    className="legend-dot"
                                    style={{ background: 'var(--reduced)' }}
                                />
                                Giảm trừ (R)
                            </span>
                            <span>— Định mức cơ sở (B)</span>
                        </div>
                        <div className="stacked-scroll">
                            <div className="stacked-chart">
                                <div className="chart-y-axis">
                                    <span>{Math.ceil(chartScaleMax)}</span>
                                    <span>
                                        {Math.round(chartScaleMax * 0.75)}
                                    </span>
                                    <span>
                                        {Math.round(chartScaleMax * 0.5)}
                                    </span>
                                    <span>
                                        {Math.round(chartScaleMax * 0.25)}
                                    </span>
                                    <span>0</span>
                                </div>
                                <div
                                    className="stacked-plot"
                                    style={{
                                        ['--teacher-count' as string]:
                                            allItems.length,
                                    }}
                                >
                                    {summary.weeklyCaps[0] ? (
                                        <div
                                            className="chart-cap"
                                            style={{
                                                top: `${Math.max(0, 100 - (summary.weeklyCaps[0] / chartScaleMax) * 100)}%`,
                                            }}
                                            title={`Trần tải tuần: ${summary.weeklyCaps[0]} tiết`}
                                        />
                                    ) : null}
                                    {allItems.map((item, idx) => {
                                        const totalPct = Math.min(
                                            100,
                                            (item.t / chartScaleMax) * 100,
                                        );
                                        const targetPct = Math.min(
                                            100,
                                            (item.b / chartScaleMax) * 100,
                                        );
                                        const parts = [
                                            { v: item.f, bg: 'var(--fixed)' },
                                            {
                                                v: item.a,
                                                bg: 'var(--assigned)',
                                            },
                                            {
                                                v: item.c,
                                                bg: 'var(--converted)',
                                            },
                                            { v: item.r, bg: 'var(--reduced)' },
                                        ];
                                        return (
                                            <div
                                                key={item.teacher_id}
                                                className="load-column"
                                            >
                                                <div
                                                    className="teacher-target"
                                                    style={{
                                                        ['--target' as string]: `${targetPct}%`,
                                                    }}
                                                    title={`Định mức cơ sở: ${item.b}`}
                                                />
                                                <span
                                                    className="load-value"
                                                    style={{
                                                        ['--load-percent' as string]: `${totalPct}%`,
                                                    }}
                                                >
                                                    {formatLoadNumber(item.t)}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="stack-button"
                                                    aria-label={`Xem chi tiết tải của ${item.teacher_name}`}
                                                    onClick={() =>
                                                        setSelectedTeacherId(
                                                            item.teacher_id,
                                                        )
                                                    }
                                                >
                                                    <div
                                                        className="load-stack"
                                                        style={{
                                                            height: `${totalPct}%`,
                                                        }}
                                                    >
                                                        {parts.map(
                                                            (part, i) => (
                                                                <i
                                                                    key={i}
                                                                    style={{
                                                                        height: item.t
                                                                            ? `${(part.v / item.t) * 100}%`
                                                                            : '0%',
                                                                        background:
                                                                            part.bg,
                                                                    }}
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </button>
                                                <div className="load-label">
                                                    <PortraitAvatar
                                                        portraitKey={
                                                            (idx % 12) + 1
                                                        }
                                                        colorIndex={idx % 6}
                                                    />
                                                    <span>
                                                        {item.teacher_name
                                                            .split(' ')
                                                            .slice(-2)
                                                            .join(' ')}
                                                    </span>
                                                    <small>
                                                        {item.delta_t !== null
                                                            ? `${item.delta_t > 0 ? '+' : ''}${formatLoadNumber(item.delta_t)}`
                                                            : '—'}
                                                    </small>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            ) : null}

            <div className="toolbar">
                <div className="tabs" role="tablist" aria-label="Lọc giáo viên">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === 'all'}
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        Toàn bộ đội ngũ ({allItems.length})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === 'over'}
                        className={filter === 'over' ? 'active' : ''}
                        onClick={() => setFilter('over')}
                    >
                        Vượt định mức ({summary.over})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === 'cap'}
                        className={filter === 'cap' ? 'active' : ''}
                        onClick={() => setFilter('cap')}
                    >
                        Vượt trần tuần
                    </button>
                </div>
                <button
                    type="button"
                    className="btn small"
                    onClick={() => setHelpOpen(true)}
                >
                    <Icon name="help" />
                    Cách đọc công thức
                </button>
            </div>

            <section className="panel">
                <div className="table-scroll">
                    <table className="data-table mvp-table">
                        <thead>
                            <tr>
                                <th>GIÁO VIÊN</th>
                                <th>F</th>
                                <th>A</th>
                                <th>C</th>
                                <th>R</th>
                                <th>T</th>
                                <th>B</th>
                                <th>W</th>
                                <th>Q</th>
                                <th>T − B</th>
                                <th>A − Q</th>
                                <th>W − Q</th>
                                <th>TẢI NĂM</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((row, idx) => {
                                const annual = extractAnnualLoad(row);
                                const aMinusQ =
                                    row.q !== null
                                        ? Math.round((row.a - row.q) * 100) /
                                          100
                                        : null;
                                const wMinusQ =
                                    row.q !== null
                                        ? Math.round((row.w - row.q) * 100) /
                                          100
                                        : null;
                                const cap = extractWeeklyCap(row);
                                return (
                                    <tr key={row.teacher_id}>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn ghost small teacher-cell"
                                                style={{
                                                    padding: 0,
                                                    color: 'var(--ink)',
                                                }}
                                                onClick={() =>
                                                    setSelectedTeacherId(
                                                        row.teacher_id,
                                                    )
                                                }
                                            >
                                                <PortraitAvatar
                                                    portraitKey={(idx % 12) + 1}
                                                    colorIndex={idx % 6}
                                                />
                                                <span>{row.teacher_name}</span>
                                            </button>
                                        </td>
                                        <td>{formatLoadNumber(row.f)}</td>
                                        <td>{formatLoadNumber(row.a)}</td>
                                        <td>{formatLoadNumber(row.c)}</td>
                                        <td>{formatLoadNumber(row.r)}</td>
                                        <td>
                                            <strong>
                                                {formatLoadNumber(row.t)}
                                            </strong>
                                        </td>
                                        <td>{formatLoadNumber(row.b)}</td>
                                        <td>{formatLoadNumber(row.w)}</td>
                                        <td>{formatLoadNumber(row.q)}</td>
                                        <td>
                                            <span
                                                className={`pill ${
                                                    (row.delta_t ?? 0) > 0
                                                        ? 'amber'
                                                        : (row.delta_t ?? 0) < 0
                                                          ? 'gray'
                                                          : ''
                                                }`}
                                            >
                                                {(row.delta_t ?? 0) > 0
                                                    ? '+'
                                                    : ''}
                                                {formatLoadNumber(row.delta_t)}
                                            </span>
                                        </td>
                                        <td>{formatLoadNumber(aMinusQ)}</td>
                                        <td>{formatLoadNumber(wMinusQ)}</td>
                                        <td>
                                            {annual.current !== null &&
                                            annual.limit !== null ? (
                                                <span>
                                                    {formatLoadNumber(
                                                        annual.current,
                                                    )}{' '}
                                                    /{' '}
                                                    {formatLoadNumber(
                                                        annual.limit,
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="mvp-status INSUFFICIENT_DATA">
                                                    Chưa đủ dữ liệu
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="mvp-actions">
                                                {cap.status === 'VIOLATION' ? (
                                                    <span className="pill red">
                                                        Vượt trần
                                                    </span>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="btn small"
                                                    onClick={() =>
                                                        setSelectedTeacherId(
                                                            row.teacher_id,
                                                        )
                                                    }
                                                >
                                                    Nguồn tải
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="table-bottom">
                    <span>
                        Đơn vị: tiết/tuần · {activeRound.round_code} · Độ phủ{' '}
                        {page.coverage.assigned}/{page.coverage.required} thành
                        phần
                    </span>
                    <span>{filteredItems.length} giáo viên</span>
                </div>
            </section>

            <section className="panel section-gap">
                <div className="panel-head">
                    <div>
                        <h2>Nguồn và giới hạn đang dùng</h2>
                        <p>
                            Biểu thức giới hạn tuần trích trực tiếp từ đánh giá
                            quy tắc của từng giáo viên
                        </p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="data-table mvp-table">
                        <thead>
                            <tr>
                                <th>GIÁO VIÊN</th>
                                <th>BIỂU THỨC TUẦN</th>
                                <th>TRẠNG THÁI TUẦN</th>
                                <th>NGUỒN QUY TẮC</th>
                                <th>TẢI / TRẦN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allItems.map((row) => {
                                const cap = extractWeeklyCap(row);
                                const pct = cap.limit
                                    ? Math.min(100, (row.t / cap.limit) * 100)
                                    : 0;
                                return (
                                    <tr key={row.teacher_id}>
                                        <td>
                                            <strong>{row.teacher_name}</strong>
                                        </td>
                                        <td className="mono">
                                            {cap.limit !== null
                                                ? `T ≤ ${formatLoadNumber(cap.limit)}`
                                                : 'Chưa khai báo giới hạn tuần'}
                                        </td>
                                        <td>
                                            <span
                                                className={`mvp-status ${
                                                    cap.status ??
                                                    'INSUFFICIENT_DATA'
                                                }`}
                                            >
                                                {cap.status ??
                                                    'INSUFFICIENT_DATA'}
                                            </span>
                                        </td>
                                        <td className="mvp-source-cell">
                                            {cap.source ??
                                                cap.message ??
                                                'Theo cấu hình bộ quy tắc đợt'}
                                        </td>
                                        <td>
                                            <div className="load-meter flex">
                                                <div className="track">
                                                    <i
                                                        style={{
                                                            width: `${pct}%`,
                                                            background:
                                                                cap.status ===
                                                                'VIOLATION'
                                                                    ? 'var(--red)'
                                                                    : (row.delta_t ??
                                                                            0) >
                                                                        0
                                                                      ? 'var(--chart-over)'
                                                                      : 'var(--primary)',
                                                        }}
                                                    />
                                                </div>
                                                <small>
                                                    {formatLoadNumber(row.t)}
                                                    {cap.limit !== null
                                                        ? ` / ${formatLoadNumber(cap.limit)}`
                                                        : ''}
                                                </small>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <Dialog
                open={helpOpen}
                variant="prototype"
                onOpenChange={setHelpOpen}
                title="Cách đọc các chỉ số tải công tác"
                description="Các đại lượng tuần được backend và kiểm thử đối chiếu cùng một định nghĩa."
            >
                <div className="detail-grid">
                    <div>
                        <small>W = F + A + C</small>
                        <b>
                            Tổng giờ giảng dạy & kiêm nhiệm quy đổi đang thực
                            hiện
                        </b>
                    </div>
                    <div>
                        <small>T = F + A + C + R</small>
                        <b>Tổng công tác quy đổi (bao gồm tiết giảm trừ R)</b>
                    </div>
                    <div>
                        <small>Q = max(0, B − R)</small>
                        <b>Hạn mức tiết giảng thực dạy sau khi trừ giảm trừ</b>
                    </div>
                    <div>
                        <small>Tải năm (ANNUAL)</small>
                        <b>
                            Chỉ hiển thị khi đủ dữ liệu nguồn; tuyệt đối không
                            thay bằng 0
                        </b>
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn primary"
                        onClick={() => setHelpOpen(false)}
                    >
                        Đã hiểu
                    </button>
                </div>
            </Dialog>

            <Drawer
                open={Boolean(selectedTeacher)}
                onOpenChange={(open) => {
                    if (!open) setSelectedTeacherId(null);
                }}
                title={selectedTeacher?.teacher_name ?? 'Nguồn tải giáo viên'}
                eyebrow={activeRound.round_code}
                subtitle={
                    selectedTeacher
                        ? `Định mức B: ${formatLoadNumber(selectedTeacher.b)} · Tổng T: ${formatLoadNumber(selectedTeacher.t)} tiết/tuần`
                        : undefined
                }
                footer={
                    <Fragment>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setSelectedTeacherId(null)}
                        >
                            Đóng
                        </button>
                        <Link
                            to={roundPath(
                                '/assignment',
                                activeRound?.id,
                                contextId,
                            )}
                            className="btn primary"
                        >
                            <Icon name="matrix" />
                            Mở bảng phân công
                        </Link>
                    </Fragment>
                }
            >
                {selectedTeacher ? (
                    <>
                        <div className="detail-grid">
                            <div>
                                <small>Cố định (F)</small>
                                <b>{formatLoadNumber(selectedTeacher.f)}</b>
                            </div>
                            <div>
                                <small>Gán mới (A)</small>
                                <b>{formatLoadNumber(selectedTeacher.a)}</b>
                            </div>
                            <div>
                                <small>Quy đổi (C)</small>
                                <b>{formatLoadNumber(selectedTeacher.c)}</b>
                            </div>
                            <div>
                                <small>Giảm trừ (R)</small>
                                <b>{formatLoadNumber(selectedTeacher.r)}</b>
                            </div>
                            <div>
                                <small>
                                    Hạn mức thực dạy Q = max(0, B − R)
                                </small>
                                <b>{formatLoadNumber(selectedTeacher.q)}</b>
                            </div>
                            <div>
                                <small>Chênh lệch T − B</small>
                                <b>
                                    {formatLoadNumber(selectedTeacher.delta_t)}
                                </b>
                            </div>
                        </div>

                        <h3 style={{ marginBottom: 10 }}>
                            Kiểm tra quy tắc của giáo viên
                        </h3>
                        {selectedTeacher.checks.map((check, i) => (
                            <div
                                key={`${check.br_code}-${i}`}
                                className="mvp-note results-drawer-check"
                                style={{ margin: '10px 0' }}
                            >
                                <span
                                    className={`mvp-status ${check.result_status}`}
                                >
                                    {check.result_status}
                                </span>
                                <div>
                                    <strong>{check.br_code}</strong> (
                                    {check.calculation_period})
                                    <div style={{ marginTop: 3 }}>
                                        {check.message}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <h3
                            className="section-gap"
                            style={{ marginBottom: 10 }}
                        >
                            Phân công đang nhận ({selectedTeacherRows.length})
                        </h3>
                        {selectedTeacherRows.length > 0 ? (
                            <div className="table-scroll">
                                <table className="data-table mvp-table">
                                    <thead>
                                        <tr>
                                            <th>LỚP</th>
                                            <th>MÔN / THÀNH PHẦN</th>
                                            <th>TIẾT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTeacherRows.map((row) => (
                                            <tr key={row.id}>
                                                <td>
                                                    <strong>
                                                        {row.class_name}
                                                    </strong>
                                                </td>
                                                <td>
                                                    {row.subject_name}
                                                    <small>
                                                        {
                                                            DEMAND_TYPE_LABELS[
                                                                row.demand_type
                                                            ]
                                                        }
                                                    </small>
                                                </td>
                                                <td>
                                                    {formatPeriods(
                                                        row.periods_per_week,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="mvp-empty">
                                Giáo viên chưa nhận dòng phân công nào trong
                                phiên bản này.
                            </div>
                        )}
                    </>
                ) : null}
            </Drawer>
        </div>
    );
}
