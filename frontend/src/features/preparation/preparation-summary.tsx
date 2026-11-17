import { Select } from '@/shared/ui/select';
import { PillBadge, RolePageHeader } from '@/features/session/role-ui';
import { Icon } from '@/shared/ui/icon';
import type { PreparationData } from './use-preparation-data';

export function PreparationSummary({ data }: { data: PreparationData }) {
    const {
        activeRound,
        selectRoundId,
        activeSemester,
        rounds,
        roundApps,
        roundComponents,
        undeterminedCount,
        missingDemandCount,
        readiness,
    } = data;

    return (
        <>
            <RolePageHeader
                title="Chuẩn bị rõ, phân công vững."
                description="Bốn bước xác nhận đầu vào trước khi mở lấy ý kiến."
            />

            <div className="banner">
                <span className="school-symbol">
                    <Icon name="layers" />
                </span>
                <div className="grow">
                    <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {activeRound?.round_code ?? 'Đang tải đợt'} ·{' '}
                        {activeSemester
                            ? `Học kỳ ${activeSemester.semester_no} (${activeSemester.starts_on} → ${activeSemester.ends_on})`
                            : 'Chọn đợt phân công'}
                    </strong>
                    {activeRound?.source_revision_token ? (
                        <div style={{ marginTop: 4 }}>
                            <code className="mvp-code">
                                {activeRound.source_revision_token}
                            </code>
                        </div>
                    ) : null}
                </div>
                <Select
                    aria-label="Chọn đợt phân công chuẩn bị"
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
                </Select>
                {activeRound ? (
                    <PillBadge
                        tone={activeRound.scope_confirmed_at ? '' : 'amber'}
                        dot
                        label={
                            activeRound.scope_confirmed_at
                                ? 'Đã xác nhận phạm vi'
                                : 'Chưa xác nhận phạm vi'
                        }
                    />
                ) : null}
            </div>

            <div className="mvp-kpis">
                <div className="mvp-kpi kpi-sage">
                    <span className="mvp-kpi-label">
                        Cặp lớp–môn
                        <i>
                            <Icon name="layers" />
                        </i>
                    </span>
                    <strong>{roundApps.length}</strong>
                    <small>{undeterminedCount} chưa xác định</small>
                </div>
                <div className="mvp-kpi">
                    <span className="mvp-kpi-label">
                        Tập bắt buộc
                        <i>
                            <Icon name="book" />
                        </i>
                    </span>
                    <strong>{roundComponents.length}</strong>
                    <small>Độc lập với số dòng nhu cầu</small>
                </div>
                <div className="mvp-kpi kpi-brass">
                    <span className="mvp-kpi-label">
                        Thiếu đầu vào
                        <i>
                            <Icon name="warning" />
                        </i>
                    </span>
                    <strong>{missingDemandCount}</strong>
                    <small>Thành phần chưa được nhập</small>
                </div>
                <div
                    className={`mvp-kpi ${readiness?.can_run_solver ? 'kpi-sage' : 'kpi-clay'}`}
                >
                    <span className="mvp-kpi-label">
                        Tiền kiểm sẵn sàng
                        <i>
                            <Icon name="shield" />
                        </i>
                    </span>
                    <strong>
                        {readiness?.can_run_solver ? 'Sẵn sàng' : 'Chưa đạt'}
                    </strong>
                    <small>
                        {readiness
                            ? `${readiness.issues.filter((issue) => issue.severity === 'ERROR').length} lỗi chặn`
                            : 'Đang tính…'}
                    </small>
                </div>
            </div>
        </>
    );
}
