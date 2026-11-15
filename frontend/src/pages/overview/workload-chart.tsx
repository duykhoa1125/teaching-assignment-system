import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OverviewTeacherLoad } from '@/features/overview/types';
import { Icon } from '@/shared/ui/icon';
import { getShellPortalContainer } from '@/shared/ui/portal';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { clampPercent, formatPeriods } from './formatters';
import styles from './overview-page.module.css';

interface TooltipState {
    teacher: OverviewTeacherLoad;
    x: number;
    y: number;
}

const CHART_LEGEND = [
    ['F', 'Tải cố định', '--fixed'],
    ['A', 'Gán trong đợt', '--assigned'],
    ['C', 'Quy đổi', '--converted'],
    ['R', 'Giảm trừ', '--reduced'],
] as const;

export interface WorkloadChartProps {
    teachers: OverviewTeacherLoad[];
    onSelectTeacher: (
        teacher: OverviewTeacherLoad,
        trigger: HTMLElement,
    ) => void;
}

export function WorkloadChart({
    teachers,
    onSelectTeacher,
}: WorkloadChartProps) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{
        left: number;
        top: number;
    } | null>(null);
    const tipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!tooltip) {
            return undefined;
        }

        const dismiss = () => setTooltip(null);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                dismiss();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', dismiss);
        window.addEventListener('scroll', dismiss, {
            passive: true,
            capture: true,
        });

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('scroll', dismiss, true);
        };
    }, [tooltip]);

    useLayoutEffect(() => {
        if (!tooltip || !tipRef.current) {
            setTooltipPos(null);
            return;
        }
        const rect = tipRef.current.getBoundingClientRect();
        const left = Math.max(
            12,
            Math.min(tooltip.x + 12, window.innerWidth - rect.width - 12),
        );
        const top = Math.max(
            12,
            Math.min(
                tooltip.y - rect.height - 12,
                window.innerHeight - rect.height - 12,
            ),
        );
        setTooltipPos({ left, top });
    }, [tooltip]);

    const scale = Math.max(
        24,
        ...teachers.map((t) => Math.max(t.weekly_limit, t.total_periods)),
    );
    const maxLimit =
        teachers.length > 0
            ? Math.max(...teachers.map((t) => t.weekly_limit))
            : 24;
    const ticks = [scale, scale * 0.75, scale * 0.5, scale * 0.25, 0];

    const showPointerTooltip = (
        teacher: OverviewTeacherLoad,
        clientX: number,
        clientY: number,
    ) => {
        setTooltip({ teacher, x: clientX, y: clientY });
    };

    const showFocusTooltip = (
        teacher: OverviewTeacherLoad,
        element: HTMLElement,
    ) => {
        const rect = element.getBoundingClientRect();
        setTooltip({
            teacher,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    };

    return (
        <>
            <div className={styles.chartLegend}>
                {CHART_LEGEND.map(([key, label, colorVar]) => (
                    <span key={key}>
                        <i
                            className={styles.legendDot}
                            style={{ background: `var(${colorVar})` }}
                        />
                        {key} · {label}
                    </span>
                ))}
            </div>

            <div className={styles.stackedScroll}>
                <div
                    className={`${styles.stackedChart} stacked-chart`}
                    role="group"
                    aria-label={`Biểu đồ tải F, A, C, R của toàn bộ ${teachers.length} giáo viên`}
                >
                    <div className={styles.chartYAxis}>
                        {ticks.map((tick, index) => (
                            <span key={index}>{formatPeriods(tick)}</span>
                        ))}
                    </div>

                    <div
                        className={styles.stackedPlot}
                        style={
                            {
                                '--teacher-count': String(
                                    Math.max(1, teachers.length),
                                ),
                            } as React.CSSProperties
                        }
                    >
                        <div className={styles.chartCap} />
                        {teachers.map((teacher) => {
                            const totalPct = clampPercent(
                                teacher.total_periods,
                                scale,
                            );
                            const targetPct = clampPercent(
                                teacher.base_norm,
                                scale,
                            );
                            const nameParts = teacher.full_name
                                .trim()
                                .split(/\s+/)
                                .slice(-2);
                            const segments: ReadonlyArray<
                                readonly [string, number, string]
                            > = [
                                ['f', teacher.fixed_periods, '--fixed'],
                                ['a', teacher.assigned_periods, '--assigned'],
                                ['c', teacher.converted_periods, '--converted'],
                                ['r', teacher.reduction_periods, '--reduced'],
                            ];

                            return (
                                <div
                                    key={teacher.id}
                                    className={`${styles.loadColumn} load-column`}
                                    style={
                                        {
                                            '--load-percent': `${totalPct}%`,
                                            '--target': `${targetPct}%`,
                                        } as React.CSSProperties
                                    }
                                >
                                    <span
                                        className={styles.teacherTarget}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.loadValue}>
                                        {formatPeriods(teacher.total_periods)}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.stackButton}
                                        data-chart-teacher={teacher.id}
                                        aria-label={`${teacher.full_name}: tổng ${formatPeriods(teacher.total_periods)}, định mức ${teacher.base_norm}, trần ${teacher.weekly_limit} tiết/tuần`}
                                        onClick={(event) => {
                                            setTooltip(null);
                                            onSelectTeacher(
                                                teacher,
                                                event.currentTarget,
                                            );
                                        }}
                                        onPointerEnter={(event) =>
                                            showPointerTooltip(
                                                teacher,
                                                event.clientX,
                                                event.clientY,
                                            )
                                        }
                                        onPointerMove={(event) =>
                                            showPointerTooltip(
                                                teacher,
                                                event.clientX,
                                                event.clientY,
                                            )
                                        }
                                        onPointerLeave={() =>
                                            setTooltip((prev) =>
                                                prev?.teacher.id === teacher.id
                                                    ? null
                                                    : prev,
                                            )
                                        }
                                        onFocus={(event) =>
                                            showFocusTooltip(
                                                teacher,
                                                event.currentTarget,
                                            )
                                        }
                                        onBlur={() =>
                                            setTooltip((prev) =>
                                                prev?.teacher.id === teacher.id
                                                    ? null
                                                    : prev,
                                            )
                                        }
                                    >
                                        <span
                                            className={styles.loadStack}
                                            style={{ height: `${totalPct}%` }}
                                        >
                                            {segments.map(
                                                ([key, value, colorVar]) => (
                                                    <i
                                                        key={key}
                                                        style={{
                                                            height: `${clampPercent(value, teacher.total_periods)}%`,
                                                            background: `var(${colorVar})`,
                                                        }}
                                                    />
                                                ),
                                            )}
                                        </span>
                                    </button>
                                    <span
                                        className={`${styles.loadLabel} load-label`}
                                    >
                                        <PortraitAvatar
                                            portraitKey={teacher.portrait_key}
                                            colorIndex={teacher.color_index}
                                        />
                                        {nameParts.map((part, idx) => (
                                            <span key={idx}>{part}</span>
                                        ))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={styles.chartFooter}>
                <span className={styles.flex}>
                    <Icon name="balance" />
                    Vạch đứt: định mức B của từng giáo viên
                </span>
                <span>Trần minh họa {maxLimit} tiết / tuần</span>
            </div>

            {tooltip
                ? createPortal(
                      <div
                          ref={tipRef}
                          id="tass-chart-tooltip"
                          className={`${styles.chartTooltip} chart-tooltip`}
                          aria-hidden="true"
                          style={
                              tooltipPos
                                  ? {
                                        left: `${tooltipPos.left}px`,
                                        top: `${tooltipPos.top}px`,
                                    }
                                  : {
                                        left: `${tooltip.x + 12}px`,
                                        top: `${tooltip.y + 12}px`,
                                        visibility: 'hidden',
                                    }
                          }
                      >
                          <span className="person-identity person-identity-compact">
                              <PortraitAvatar
                                  portraitKey={tooltip.teacher.portrait_key}
                                  colorIndex={tooltip.teacher.color_index}
                              />
                              <span className="person-identity-copy">
                                  <strong>{tooltip.teacher.full_name}</strong>
                              </span>
                          </span>
                          {[
                              [
                                  'F · Cố định',
                                  formatPeriods(tooltip.teacher.fixed_periods),
                              ],
                              [
                                  'A · Gán mới',
                                  formatPeriods(
                                      tooltip.teacher.assigned_periods,
                                  ),
                              ],
                              [
                                  'C · Quy đổi',
                                  formatPeriods(
                                      tooltip.teacher.converted_periods,
                                  ),
                              ],
                              [
                                  'R · Giảm trừ',
                                  formatPeriods(
                                      tooltip.teacher.reduction_periods,
                                  ),
                              ],
                              [
                                  'Tổng / Định mức',
                                  `${formatPeriods(tooltip.teacher.total_periods)} / ${tooltip.teacher.base_norm}`,
                              ],
                          ].map(([label, value]) => (
                              <div
                                  key={label}
                                  className={styles.chartTooltipRow}
                              >
                                  <span>{label}</span>
                                  <b>{value}</b>
                              </div>
                          ))}
                      </div>,
                      getShellPortalContainer(),
                  )
                : null}
        </>
    );
}
