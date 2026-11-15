import '@/pages/preparation/preparation-ui.css';
import { ReadinessIssue } from '@/features/preparation/readiness-issue';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAssignmentRoundsQuery } from '@/features/catalogs/queries';
import {
    buildReadinessQuery,
    formatPreparationApiError,
    OPTIMIZATION_CONFIG_OPTIONS,
    RULE_SET_VERSION_OPTIONS,
} from '@/features/preparation/model';
import { useRoundReadinessQuery } from '@/features/preparation/queries';
import { useRoundSelection } from '@/features/preparation/round-context';
import type { ReadinessSeverity } from '@/features/preparation/types';
import {
    PillBadge,
    RolePageHeader,
    RoleStateCard,
} from '@/features/session/role-ui';
import { useSession } from '@/features/session/use-session';
import { Icon } from '@/shared/ui/icon';

type SeverityTab = 'ALL' | ReadinessSeverity;

export function ChecksPage() {
    const { contextId, activeContext } = useSession();
    const roundsQuery = useAssignmentRoundsQuery({ limit: 100, offset: 0 });
    const rounds = roundsQuery.data ?? [];

    const { activeRound, selectRoundId } = useRoundSelection(
        rounds,
        contextId,
        activeContext?.round,
    );

    const [configIdInput, setConfigIdInput] = useState<string>('1');
    const [ruleSetIdInput, setRuleSetIdInput] = useState<string>(() =>
        contextId === 'thcs-demo' ? '2' : '1',
    );
    const [severityTab, setSeverityTab] = useState<SeverityTab>('ALL');

    const hasConfig = Boolean(configIdInput);
    const hasRuleSet = Boolean(ruleSetIdInput);
    const isPairedValid = hasConfig === hasRuleSet;

    const readinessParams = useMemo(() => {
        if (!isPairedValid) return {};
        return buildReadinessQuery(
            configIdInput ? Number(configIdInput) : null,
            ruleSetIdInput ? Number(ruleSetIdInput) : null,
        );
    }, [isPairedValid, configIdInput, ruleSetIdInput]);

    const readinessQuery = useRoundReadinessQuery(
        activeRound?.id ?? null,
        readinessParams,
        Boolean(activeRound) && isPairedValid,
    );

    const readiness = readinessQuery.data;
    const issues = useMemo(() => readiness?.issues ?? [], [readiness?.issues]);

    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = issues.filter((i) => i.severity === 'INFO').length;

    const filteredIssues = useMemo(
        () =>
            severityTab === 'ALL'
                ? issues
                : issues.filter((issue) => issue.severity === severityTab),
        [issues, severityTab],
    );

    return (
        <div className="fe05-page">
            <RolePageHeader
                title="Kiểm tra có căn cứ. Quyết định rõ ràng."
                description="Kết quả gắn với phiên bản dữ liệu nguồn, cấu hình tối ưu và bộ quy tắc đang chọn."
                actions={
                    <div className="mvp-actions">
                        <Link to="/preparation" className="btn">
                            <Icon name="layers" />
                            Chuẩn bị dữ liệu
                        </Link>
                        <button
                            type="button"
                            className="btn primary"
                            disabled={
                                !activeRound ||
                                !isPairedValid ||
                                readinessQuery.isFetching
                            }
                            onClick={() => void readinessQuery.refetch()}
                        >
                            <Icon name="reset" />
                            {readinessQuery.isFetching
                                ? 'Đang kiểm tra…'
                                : 'Chạy kiểm tra lại'}
                        </button>
                    </div>
                }
            />

            <section className="panel">
                <div className="panel-head">
                    <div>
                        <h2>Tham số đánh giá sẵn sàng (Readiness)</h2>
                        <p>
                            Chọn cấu hình tối ưu cùng bộ quy tắc, hoặc để trống
                            cả hai để chỉ kiểm tra dữ liệu nền.
                        </p>
                    </div>
                    {readiness ? (
                        <code className="mvp-code">
                            {readiness.source_revision_token}
                        </code>
                    ) : null}
                </div>
                <div className="panel-body">
                    <div className="mvp-filter">
                        <select
                            aria-label="Chọn đợt phân công kiểm tra"
                            value={activeRound?.id ?? ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                if (id) selectRoundId(id);
                            }}
                        >
                            {rounds.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.round_code} ({r.status})
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Chọn cấu hình tối ưu"
                            value={configIdInput}
                            onChange={(e) => setConfigIdInput(e.target.value)}
                        >
                            <option value="">Chưa chọn cấu hình tối ưu</option>
                            {OPTIMIZATION_CONFIG_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.code} · {opt.name}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Chọn bộ quy tắc"
                            value={ruleSetIdInput}
                            onChange={(e) => setRuleSetIdInput(e.target.value)}
                        >
                            <option value="">Chưa chọn bộ quy tắc</option>
                            {RULE_SET_VERSION_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.code} · {opt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!isPairedValid ? (
                        <div className="mvp-note warning" role="alert">
                            Cần chọn đồng thời cả Cấu hình tối ưu và Bộ quy tắc,
                            hoặc đặt cả hai về “Chưa chọn” để xem trạng thái
                            tiền kiểm trước cấu hình.
                        </div>
                    ) : null}
                </div>
            </section>

            {readinessQuery.isError ? (
                <div className="section-gap">
                    <RoleStateCard
                        kind="error"
                        title="Không thể đánh giá tiền kiểm readiness"
                        detail={formatPreparationApiError(readinessQuery.error)}
                        actions={
                            <button
                                type="button"
                                className="btn small"
                                onClick={() => void readinessQuery.refetch()}
                            >
                                Thử lại
                            </button>
                        }
                    />
                </div>
            ) : null}

            {readiness ? (
                <>
                    <div
                        className={`banner section-gap ${
                            readiness.can_run_solver
                                ? ''
                                : errorCount > 0
                                  ? 'red'
                                  : 'amber'
                        }`}
                    >
                        <span className="school-symbol">
                            <Icon
                                name={
                                    readiness.can_run_solver
                                        ? 'check'
                                        : 'warning'
                                }
                            />
                        </span>
                        <div className="grow">
                            <strong
                                style={{ color: 'var(--ink)', fontWeight: 500 }}
                            >
                                {readiness.can_run_solver
                                    ? `Đợt ${activeRound?.round_code ?? ''} đủ điều kiện chạy bộ giải tối ưu`
                                    : `Đợt ${activeRound?.round_code ?? ''} chưa thể chạy bộ giải tối ưu`}
                            </strong>
                            <div
                                className="muted"
                                style={{ fontSize: 12, marginTop: 3 }}
                            >
                                Hiệu lực {readiness.starts_on} →{' '}
                                {readiness.ends_on} ·{' '}
                                {readiness.preflight_only
                                    ? 'Chỉ kiểm tra dữ liệu nguồn'
                                    : 'Đã kiểm tra đủ dữ liệu tối ưu'}
                            </div>
                        </div>
                        <div className="mvp-actions">
                            <PillBadge
                                tone={readiness.can_run_solver ? '' : 'red'}
                                dot
                                label={
                                    readiness.can_run_solver
                                        ? 'Sẵn sàng chạy tối ưu'
                                        : 'Chưa sẵn sàng'
                                }
                            />
                            {readiness.can_run_solver ? (
                                <Link
                                    to="/assignment"
                                    className="btn small primary"
                                >
                                    Mở không gian phân công
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    <div className="mvp-kpis">
                        <div className="mvp-kpi kpi-sage">
                            <span className="mvp-kpi-label">
                                ĐẠT / THÔNG TIN
                                <i>
                                    <Icon name="check" />
                                </i>
                            </span>
                            <strong>{infoCount}</strong>
                            <small>Mục thông tin & đạt chuẩn</small>
                        </div>
                        <div
                            className={`mvp-kpi ${errorCount > 0 ? 'kpi-clay' : 'kpi-sage'}`}
                        >
                            <span className="mvp-kpi-label">
                                LỖI CHẶN (ERROR)
                                <i>
                                    <Icon name="shield" />
                                </i>
                            </span>
                            <strong>{errorCount}</strong>
                            <small>Chặn chạy tối ưu / công bố</small>
                        </div>
                        <div
                            className={`mvp-kpi ${warningCount > 0 ? 'kpi-brass' : ''}`}
                        >
                            <span className="mvp-kpi-label">
                                CẢNH BÁO (WARNING)
                                <i>
                                    <Icon name="warning" />
                                </i>
                            </span>
                            <strong>{warningCount}</strong>
                            <small>Nên rà soát trước khi chốt</small>
                        </div>
                        <div className="mvp-kpi">
                            <span className="mvp-kpi-label">
                                ĐỘ PHỦ NHU CẦU
                                <i>
                                    <Icon name="layers" />
                                </i>
                            </span>
                            <strong>
                                {readiness.coverage.required_components -
                                    readiness.coverage.missing_demand}
                                /{readiness.coverage.required_components}
                            </strong>
                            <small>
                                {readiness.coverage.missing_demand} thiếu nhu
                                cầu
                            </small>
                        </div>
                    </div>

                    <section className="panel">
                        <div className="panel-head">
                            <div>
                                <h2>Tổng hợp độ phủ & điều kiện cổng</h2>
                                <p>
                                    Thành phần bắt buộc và các điều kiện cần
                                    hoàn thiện
                                </p>
                            </div>
                            <PillBadge
                                tone={
                                    readiness.can_open_feedback ? '' : 'amber'
                                }
                                label={
                                    readiness.can_open_feedback
                                        ? 'Cho phép mở phản hồi'
                                        : 'Chưa mở phản hồi'
                                }
                            />
                        </div>
                        <div className="panel-body">
                            <div className="detail-grid">
                                <div>
                                    <small>Thành phần bắt buộc</small>
                                    <b>
                                        {readiness.coverage.required_components}
                                    </b>
                                </div>
                                <div>
                                    <small>Đã phân công</small>
                                    <b>{readiness.coverage.assigned}</b>
                                </div>
                                <div>
                                    <small>Chưa phân công</small>
                                    <b>{readiness.coverage.unassigned}</b>
                                </div>
                                <div>
                                    <small>Thiếu nhu cầu</small>
                                    <b>{readiness.coverage.missing_demand}</b>
                                </div>
                                <div>
                                    <small>Thiếu dòng kế hoạch</small>
                                    <b>{readiness.coverage.missing_plan_row}</b>
                                </div>
                                <div>
                                    <small>Đã kiểm tra dữ liệu tối ưu</small>
                                    <b>
                                        {readiness.solver_input_validated
                                            ? 'Đã kiểm tra'
                                            : 'Chưa kiểm tra'}
                                    </b>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="mvp-toolbar section-gap">
                        <div
                            className="mvp-tabs"
                            role="tablist"
                            aria-label="Lọc mức độ issue"
                        >
                            {(
                                [
                                    ['ALL', `Tất cả · ${issues.length}`],
                                    ['ERROR', `Lỗi chặn · ${errorCount}`],
                                    ['WARNING', `Cảnh báo · ${warningCount}`],
                                    ['INFO', `Thông tin · ${infoCount}`],
                                ] as const
                            ).map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={severityTab === id}
                                    className={
                                        severityTab === id ? 'active' : ''
                                    }
                                    onClick={() => setSeverityTab(id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <section className="section-gap">
                        {filteredIssues.length > 0 ? (
                            filteredIssues.map((issue, idx) => (
                                <ReadinessIssue
                                    key={`${issue.code}-${idx}`}
                                    issue={issue}
                                />
                            ))
                        ) : (
                            <RoleStateCard
                                kind="empty"
                                title="Không có issue nào ở nhóm mức độ đang chọn"
                                detail="Chọn tab Tất cả để xem toàn bộ báo cáo kiểm tra của đợt."
                            />
                        )}
                    </section>
                </>
            ) : isPairedValid && readinessQuery.isLoading ? (
                <div className="section-gap">
                    <RoleStateCard
                        kind="loading"
                        title="Đang đánh giá mức độ sẵn sàng…"
                        detail="Hệ thống đang kiểm tra phạm vi, cặp lớp–môn, thành phần bắt buộc và nhu cầu."
                    />
                </div>
            ) : null}
        </div>
    );
}
