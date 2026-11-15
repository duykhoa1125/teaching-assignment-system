import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { Icon } from '@/shared/ui/icon';
import styles from './overview-page.module.css';

const steps = [
    {
        number: '01',
        title: 'Chuẩn bị dữ liệu',
        text: 'Giáo viên, chuyên môn và nhu cầu giảng dạy là nền tảng của mỗi phương án.',
    },
    {
        number: '02',
        title: 'Xây dựng phương án',
        text: 'Kiểm tra dữ liệu, phân công và giữ lại những lựa chọn đã thống nhất.',
    },
    {
        number: '03',
        title: 'Rà soát kết quả',
        text: 'Đối chiếu tải giảng dạy và các ràng buộc trước khi hoàn thiện phương án.',
    },
];

export function OverviewPage() {
    return (
        <>
            <div className="page-heading">
                <p className="eyebrow">KHÔNG GIAN ĐIỀU PHỐI</p>
                <h1>Tổng quan</h1>
                <p>Cùng chuẩn bị một học kỳ cân bằng hơn.</p>
            </div>
            <section className={styles.hero} aria-labelledby="welcome-title">
                <div>
                    <p className={styles.heroLabel}>TEACHING IN BALANCE</p>
                    <h2 id="welcome-title">
                        Mỗi phân công hợp lý,
                        <br />
                        một khởi đầu tốt hơn.
                    </h2>
                    <p>
                        Không gian chuẩn bị, phân công và rà soát giảng dạy của
                        nhà trường.
                    </p>
                    <Link to="/teachers" className="button">
                        Khám phá giáo viên{' '}
                        <Icon glyph={ArrowUpRight} size={16} />
                    </Link>
                </div>
                <div className={styles.illustration} aria-hidden="true">
                    <span className={styles.orbit} />
                    <span className={styles.orbitInner} />
                    <span className={styles.balanceLine} />
                    <span className={styles.balanceCenter} />
                    <span className={styles.balanceLeft} />
                    <span className={styles.balanceRight} />
                    <span className={styles.illustrationCaption}>
                        SPACE FOR BETTER TEACHING
                    </span>
                </div>
            </section>
            <section
                aria-labelledby="workflow-title"
                className={styles.workflow}
            >
                <div className={styles.sectionHeading}>
                    <div>
                        <p className="eyebrow">TỪ DỮ LIỆU ĐẾN PHƯƠNG ÁN</p>
                        <h2 id="workflow-title">Một quy trình rõ ràng</h2>
                    </div>
                    <span className={styles.stepCount}>03 bước chuẩn bị</span>
                </div>
                <div className={styles.steps}>
                    {steps.map((step) => (
                        <article key={step.number} className={styles.step}>
                            <span className={styles.stepNumber}>
                                {step.number}
                            </span>
                            <h3>{step.title}</h3>
                            <p>{step.text}</p>
                        </article>
                    ))}
                </div>
            </section>
            <aside className={styles.notice}>
                <span aria-hidden="true">i</span>
                <div>
                    <strong>Không gian đang được xây dựng</strong>
                    <p>
                        Các màn hình nghiệp vụ và đăng nhập đang được phát
                        triển. Chưa có dữ liệu nhà trường được hiển thị tại đây.
                    </p>
                </div>
            </aside>
        </>
    );
}
