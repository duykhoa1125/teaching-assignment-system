import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
    useAssignmentRows,
    useCurrentPlan,
    useWorkloads,
} from '@/features/assignment/queries';
import {
    useAssignmentRoundsQuery,
    useClassesQuery,
    useSubjectsQuery,
} from '@/features/catalogs/queries';
import {
    useApplicabilitiesQuery,
    useRequiredComponentsQuery,
    useScopesQuery,
} from '@/features/preparation/queries';
import { useRoundSelection } from '@/features/preparation/round-context';
import {
    buildAssignmentStatisticsCsv,
    extractGradeCode,
    formatLoadNumber,
} from '@/features/results/model';
import { RolePageHeader, RoleStateCard } from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { ApiError } from '@/shared/api/http';
import { Icon } from '@/shared/ui/icon';
import '../results/results.css';

type GroupBy = 'subject' | 'grade' | 'class' | 'teacher';

function triggerDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function StatisticsPage() {
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
    const rowsQuery = useAssignmentRows(plan?.version_id ?? null, {});
    const workloadsQuery = useWorkloads(plan?.version_id ?? null);

    const scopesQuery = useScopesQuery(
        activeRound ? { round_id: activeRound.id, limit: 100 } : {},
        Boolean(activeRound),
    );
    const appsQuery = useApplicabilitiesQuery(
        { limit: 100 },
        Boolean(activeRound),
    );
    const reqsQuery = useRequiredComponentsQuery(
        { limit: 100 },
        Boolean(activeRound),
    );
    const classesQuery = useClassesQuery({ limit: 100 });
    const subjectsQuery = useSubjectsQuery({ limit: 100 });

    const [groupBy, setGroupBy] = useState<GroupBy>('subject');
    const [groupFilter, setGroupFilter] = useState<string>('all');

    const rows = useMemo(() => rowsQuery.data?.items ?? [], [rowsQuery.data]);
    const scopes = useMemo(() => scopesQuery.data ?? [], [scopesQuery.data]);

    const stats = useMemo(() => {
        const keyFor = (row: (typeof rows)[number]) => {
            if (groupBy === 'subject') return row.subject_name;
            if (groupBy === 'grade') return extractGradeCode(row.class_name);
            if (groupBy === 'class') return row.class_name;
            return row.teacher_name ?? 'Chưa phân công';
        };
        const map = new Map<
            string,
            {
                group: string;
                teachers: Set<number>;
                total: number;
                assigned: number;
                periods: number;
                unassignedPeriods: number;
            }
        >();
        for (const row of rows) {
            const key = keyFor(row);
            const cur = map.get(key) ?? {
                group: key,
                teachers: new Set<number>(),
                total: 0,
                assigned: 0,
                periods: 0,
                unassignedPeriods: 0,
            };
            cur.total += 1;
            cur.periods += row.periods_per_week;
            if (row.teacher_id !== null) {
                cur.assigned += 1;
                cur.teachers.add(row.teacher_id);
            } else {
                cur.unassignedPeriods += row.periods_per_week;
            }
            map.set(key, cur);
        }
        return [...map.values()]
            .map((entry) => ({
                group: entry.group,
                teachers: entry.teachers.size,
                total: entry.total,
                assigned: entry.assigned,
                unassigned: entry.total - entry.assigned,
                periods: Math.round(entry.periods * 100) / 100,
                unassignedPeriods:
                    Math.round(entry.unassignedPeriods * 100) / 100,
            }))
            .sort((a, b) => a.group.localeCompare(b.group, 'vi'));
    }, [groupBy, rows]);

    const groupNames = stats.map((s) => s.group);
    const effectiveFilter =
        groupFilter === 'all' || groupNames.includes(groupFilter)
            ? groupFilter
            : 'all';
    const filteredStats =
        effectiveFilter === 'all'
            ? stats
            : stats.filter((item) => item.group === effectiveFilter);

    const roundScopeIds = useMemo(
        () => new Set(scopes.map((s) => s.id)),
        [scopes],
    );
    const roundApps = useMemo(
        () =>
            (appsQuery.data ?? []).filter(
                (a) =>
                    a.status === 'APPLICABLE' && roundScopeIds.has(a.scope_id),
            ),
        [appsQuery.data, roundScopeIds],
    );
    const applicableAppIds = useMemo(
        () => new Set(roundApps.map((a) => a.id)),
        [roundApps],
    );
    const roundRequired = useMemo(
        () =>
            (reqsQuery.data ?? []).filter((r) =>
                applicableAppIds.has(r.applicability_id),
            ),
        [reqsQuery.data, applicableAppIds],
    );

    const incompletePairs = useMemo(() => {
        const classes = classesQuery.data ?? [];
        const subjects = subjectsQuery.data ?? [];
        const pairMap = new Map<
            string,
            {
                key: string;
                className: string;
                subjectName: string;
                missingInputs: number;
                unassignedRows: number;
            }
        >();
        for (const req of roundRequired) {
            if (req.demand_id) continue;
            const app = roundApps.find((a) => a.id === req.applicability_id);
            if (!app) continue;
            const scope = scopes.find((s) => s.id === app.scope_id);
            const cls = classes.find((c) => c.id === app.class_id);
            const sub = scope
                ? subjects.find((s) => s.id === scope.subject_id)
                : undefined;
            const key = `${app.class_id}:${scope?.subject_id ?? 0}`;
            const cur = pairMap.get(key) ?? {
                key,
                className: cls?.class_code ?? `#${app.class_id}`,
                subjectName: sub?.name ?? `#${scope?.subject_id ?? 0}`,
                missingInputs: 0,
                unassignedRows: 0,
            };
            cur.missingInputs += 1;
            pairMap.set(key, cur);
        }
        for (const row of rows) {
            if (row.teacher_id !== null) continue;
            const key = `${row.class_id}:${row.subject_id}`;
            const cur = pairMap.get(key) ?? {
                key,
                className: row.class_name,
                subjectName: row.subject_name,
                missingInputs: 0,
                unassignedRows: 0,
            };
            cur.unassignedRows += 1;
            pairMap.set(key, cur);
        }
        return [...pairMap.values()];
    }, [
        classesQuery.data,
        roundApps,
        roundRequired,
        rows,
        scopes,
        subjectsQuery.data,
    ]);

    if (roundsQuery.isPending || planQuery.isPending) {
        return (
            <RoleStateCard
                kind="loading"
                title="Đang tổng hợp thống kê phân công…"
                detail="Đang đọc dữ liệu độ phủ và các cặp lớp–môn cần hoàn thiện."
            />
        );
    }

    if (roundsQuery.isError || !activeRound) {
        return (
            <RoleStateCard
                kind={roundsQuery.isError ? 'error' : 'empty'}
                title="Chưa có đợt phân công để thống kê"
                detail="Mở Chuẩn bị dữ liệu để chọn hoặc khởi tạo đợt phân công."
                actions={
                    <Link to="/preparation" className="btn small">
                        Chuẩn bị dữ liệu
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
                        ? 'Chưa có phương án cho đợt này'
                        : 'Không tải được dữ liệu thống kê'
                }
                detail={
                    planQuery.error instanceof Error
                        ? planQuery.error.message
                        : 'Tạo bản nháp trong Phân công trước khi xem thống kê.'
                }
                actions={
                    <Link to="/assignment" className="btn primary small">
                        Mở Phân công
                    </Link>
                }
            />
        );
    }

    if (!plan || rowsQuery.isPending) {
        return (
            <RoleStateCard
                kind="loading"
                title="Đang tải các dòng phân công…"
                detail="Đang đọc toàn bộ thành phần của snapshot hiện tại."
            />
        );
    }

    const totalPeriods =
        Math.round(rows.reduce((s, r) => s + r.periods_per_week, 0) * 100) /
        100;
    const unassignedRows = rows.filter((r) => r.teacher_id === null);
    const unassignedPeriods =
        Math.round(
            unassignedRows.reduce((s, r) => s + r.periods_per_week, 0) * 100,
        ) / 100;
    const missingDemandCount = roundRequired.filter((r) => !r.demand_id).length;

    return (
        <div>
            <RolePageHeader
                roundLabel={activeRound.round_code}
                contextLabel={`V${String(plan.version_no).padStart(2, '0')} · r${plan.revision_no}`}
                title="Thấy rõ đội ngũ. Hiểu đủ nhu cầu."
                description="Tổng hợp theo môn, khối hoặc lớp và truy về các cặp còn thiếu."
                actions={
                    <div className="mvp-actions">
                        <Link to="/workload" className="btn">
                            <Icon name="balance" />
                            Định mức & Tải
                        </Link>
                        <button
                            type="button"
                            className="btn primary"
                            onClick={() =>
                                triggerDownload(
                                    buildAssignmentStatisticsCsv(rows),
                                    `TASS-thong-ke-${activeRound.round_code}-V${plan.version_no}.csv`,
                                )
                            }
                        >
                            <Icon name="download" />
                            Tải bảng CSV
                        </button>
                    </div>
                }
            />

            <div className="mvp-toolbar">
                <div className="mvp-filter">
                    <select
                        id="stats-round-select"
                        name="round_id"
                        aria-label="Chọn đợt phân công thống kê"
                        value={activeRound.id}
                        onChange={(e) => selectRoundId(Number(e.target.value))}
                    >
                        {rounds.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.round_code}
                            </option>
                        ))}
                    </select>
                    <select
                        id="stats-group-select"
                        name="group_by"
                        aria-label="Nhóm thống kê"
                        value={groupBy}
                        onChange={(e) => {
                            setGroupBy(e.target.value as GroupBy);
                            setGroupFilter('all');
                        }}
                    >
                        <option value="subject">Theo môn</option>
                        <option value="grade">Theo khối</option>
                        <option value="class">Theo lớp</option>
                        <option value="teacher">Theo giáo viên</option>
                    </select>
                    <select
                        id="stats-value-select"
                        name="group_filter"
                        aria-label="Lọc nhóm thống kê"
                        value={effectiveFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                    >
                        <option value="all">Tất cả nhóm</option>
                        {groupNames.map((name) => (
                            <option key={name} value={name}>
                                {groupBy === 'grade' ? `Khối ${name}` : name}
                            </option>
                        ))}
                    </select>
                </div>
                <span className="mvp-code">
                    Snapshot #{plan.input_snapshot_id} ·{' '}
                    {workloadsQuery.data?.items.length ?? 0} giáo viên
                </span>
            </div>

            <div className="mvp-kpis">
                <div className="mvp-kpi">
                    <span className="mvp-kpi-label">
                        Thành phần
                        <i>
                            <Icon name="layers" />
                        </i>
                    </span>
                    <strong>{rows.length}</strong>
                    <small>{formatLoadNumber(totalPeriods)} tiết / tuần</small>
                </div>
                <div
                    className={`mvp-kpi ${unassignedRows.length > 0 ? 'kpi-brass' : 'kpi-sage'}`}
                >
                    <span className="mvp-kpi-label">
                        Thiếu gán
                        <i>
                            <Icon name="warning" />
                        </i>
                    </span>
                    <strong>{unassignedRows.length}</strong>
                    <small>
                        {formatLoadNumber(unassignedPeriods)} tiết / tuần
                    </small>
                </div>
                <div
                    className={`mvp-kpi ${incompletePairs.length > 0 ? 'kpi-clay' : 'kpi-sage'}`}
                >
                    <span className="mvp-kpi-label">
                        Cặp chưa đủ
                        <i>
                            <Icon name="matrix" />
                        </i>
                    </span>
                    <strong>{incompletePairs.length}</strong>
                    <small>Theo tập bắt buộc & gán</small>
                </div>
                <div className="mvp-kpi">
                    <span className="mvp-kpi-label">
                        Đầu vào còn thiếu
                        <i>
                            <Icon name="help" />
                        </i>
                    </span>
                    <strong>{missingDemandCount}</strong>
                    <small>Không tính vào độ phủ gán</small>
                </div>
            </div>

            <section className="panel mvp-card">
                <h3>Độ phủ theo nhóm</h3>
                {filteredStats.length > 0 ? (
                    <div className="mvp-mini-chart section-gap">
                        {filteredStats.map((row) => {
                            const pct = row.total
                                ? (row.assigned / row.total) * 100
                                : 0;
                            return (
                                <div
                                    key={row.group}
                                    className="results-mini-bar-row"
                                >
                                    <span>
                                        {groupBy === 'grade'
                                            ? `Khối ${row.group}`
                                            : row.group}
                                    </span>
                                    <div className="track">
                                        <i
                                            style={{
                                                width: `${pct}%`,
                                                background: 'var(--aqua)',
                                            }}
                                        />
                                    </div>
                                    <b>
                                        {row.assigned}/{row.total}
                                    </b>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mvp-empty">
                        Không có nhóm dữ liệu phù hợp với bộ lọc.
                    </div>
                )}
            </section>

            <section className="panel section-gap">
                <div className="table-scroll">
                    <table className="data-table mvp-table">
                        <thead>
                            <tr>
                                <th>NHÓM</th>
                                <th>GIÁO VIÊN</th>
                                <th>THÀNH PHẦN</th>
                                <th>ĐÃ GÁN</th>
                                <th>THIẾU GÁN</th>
                                <th>TỔNG TIẾT</th>
                                <th>THIẾU TIẾT GÁN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStats.map((row) => (
                                <tr key={row.group}>
                                    <td>
                                        <strong>
                                            {groupBy === 'grade'
                                                ? `Khối ${row.group}`
                                                : row.group}
                                        </strong>
                                    </td>
                                    <td>{row.teachers}</td>
                                    <td>{row.total}</td>
                                    <td>{row.assigned}</td>
                                    <td>{row.unassigned}</td>
                                    <td>{formatLoadNumber(row.periods)}</td>
                                    <td>
                                        {formatLoadNumber(
                                            row.unassignedPeriods,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="panel section-gap">
                <div className="panel-head">
                    <div>
                        <h2>Cặp lớp–môn cần hoàn thiện</h2>
                        <p>
                            Bao gồm cặp có thành phần chưa gán hoặc thiếu nhu
                            cầu bắt buộc
                        </p>
                    </div>
                    <Link to="/assignment" className="btn small">
                        Mở bảng phân công
                    </Link>
                </div>
                {incompletePairs.length > 0 ? (
                    <div className="table-scroll">
                        <table className="data-table mvp-table">
                            <thead>
                                <tr>
                                    <th>LỚP</th>
                                    <th>MÔN</th>
                                    <th>CHƯA GÁN</th>
                                    <th>THIẾU NHU CẦU</th>
                                    <th>TRẠNG THÁI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incompletePairs.map((pair) => (
                                    <tr key={pair.key}>
                                        <td>
                                            <strong>{pair.className}</strong>
                                        </td>
                                        <td>{pair.subjectName}</td>
                                        <td>{pair.unassignedRows}</td>
                                        <td>{pair.missingInputs}</td>
                                        <td>
                                            <span
                                                className={`mvp-status ${
                                                    pair.missingInputs > 0
                                                        ? 'INSUFFICIENT_DATA'
                                                        : 'PARTIAL'
                                                }`}
                                            >
                                                {pair.missingInputs > 0
                                                    ? 'Chưa đủ thành phần'
                                                    : 'Còn dòng chưa gán'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mvp-empty">
                        Mọi cặp lớp–môn áp dụng đã có đủ nhu cầu và phân công.
                    </div>
                )}
            </section>
        </div>
    );
}
