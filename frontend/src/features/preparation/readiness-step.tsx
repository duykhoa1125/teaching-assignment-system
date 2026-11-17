import { ReadinessIssue } from '@/features/preparation/readiness-issue';
import { Link } from 'react-router';
import { PillBadge, RoleStateCard } from '@/features/session/role-ui';
import { Icon } from '@/shared/ui/icon';
import type { PreparationData } from './use-preparation-data';

export function ReadinessStep({ data }: { data: PreparationData }) {
    const { contextId, activeRound, readiness } = data;

    return (
        <section className="panel">
            <div className="panel-head">
                <div>
                    <h2>Bước 4 · Xác nhận & tiền kiểm sẵn sàng</h2>
                    <p>
                        Kiểm tra dữ liệu đầu vào theo lần cập nhật mới nhất của
                        đợt.
                    </p>
                </div>
                <Link to="/checks" className="btn primary">
                    <Icon name="arrow" />
                    Xem chi tiết tại Trung tâm kiểm tra
                </Link>
            </div>
            <div className="panel-body">
                {readiness ? (
                    <>
                        <div className="detail-grid">
                            <div>
                                <small>Thành phần bắt buộc</small>
                                <b>{readiness.coverage.required_components}</b>
                            </div>
                            <div>
                                <small>Đã có nhu cầu</small>
                                <b>
                                    {readiness.coverage.required_components -
                                        readiness.coverage.missing_demand}
                                </b>
                            </div>
                            <div>
                                <small>Thiếu nhu cầu giảng dạy</small>
                                <b>{readiness.coverage.missing_demand}</b>
                            </div>
                            <div>
                                <small>Quyết định điều kiện solver</small>
                                <PillBadge
                                    tone={readiness.can_run_solver ? '' : 'red'}
                                    dot
                                    label={
                                        readiness.can_run_solver
                                            ? 'Sẵn sàng'
                                            : 'Bị chặn'
                                    }
                                />
                            </div>
                        </div>
                        <div className="section-gap">
                            {readiness.issues.map((issue, idx) => (
                                <ReadinessIssue
                                    key={`${issue.code}-${idx}`}
                                    issue={issue}
                                    roundId={activeRound?.id}
                                    contextId={contextId}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <RoleStateCard
                        kind="loading"
                        title="Đang chạy tiền kiểm readiness…"
                        detail="Đang đối chiếu phạm vi, áp dụng, thành phần bắt buộc và nhu cầu."
                    />
                )}
            </div>
        </section>
    );
}
