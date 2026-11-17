import {
    useId,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
} from 'react';
import { Icon } from './icon';
import './date-picker.css';

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parse = (value: string) =>
    value ? new Date(`${value}T12:00:00`) : new Date();

/** Local calendar dates stay YYYY-MM-DD at the form/query boundary. */
export function DatePicker({
    value,
    onChange,
    name,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    name: string;
    label: string;
}) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const [cursor, setCursor] = useState(() => parse(value));
    const [position, setPosition] = useState({ left: 0, top: 0 });
    const [open, setOpen] = useState(false);
    const month = cursor.getMonth();
    const year = cursor.getFullYear();
    const first = new Date(year, month, 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const [today, setToday] = useState(() => iso(new Date()));
    const days = Array.from(
        { length: 42 },
        (_, i) => new Date(year, month, i - offset + 1, 12),
    );

    useEffect(() => {
        if (!open) return;
        const dismiss = (event: Event) => {
            if (
                event.type === 'scroll' &&
                event.target instanceof Node &&
                popup.current?.contains(event.target)
            )
                return;
            popup.current?.hidePopover();
        };
        window.addEventListener('resize', dismiss);
        window.addEventListener('scroll', dismiss, true);
        return () => {
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('scroll', dismiss, true);
        };
    }, [open]);

    function close() {
        popup.current?.hidePopover();
        trigger.current?.focus();
    }
    function select(next: string) {
        onChange(next);
        close();
    }
    function handleOpen() {
        if (open) return close();
        const bounds = trigger.current?.getBoundingClientRect();
        if (!bounds) return;
        // oxlint-disable-next-line react/purity -- Only runs in the open button's click handler.
        setToday(iso(new Date()));
        const width = Math.min(300, window.innerWidth - 24);
        setPosition({
            left: Math.max(
                12,
                Math.min(bounds.left, window.innerWidth - width - 12),
            ),
            top:
                bounds.bottom + 8 + 360 <= window.innerHeight
                    ? bounds.bottom + 8
                    : Math.max(12, bounds.top - 368),
        });
        setCursor(parse(value));
        popup.current?.showPopover();
    }
    function moveMonth(delta: number) {
        setCursor(new Date(year, month + delta, 1, 12));
    }
    function handleDayKey(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
        const delta: Record<string, number> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
            Home: -((date.getDay() + 6) % 7),
            End: 6 - ((date.getDay() + 6) % 7),
        };
        let next: Date;
        if (event.key in delta)
            next = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() + delta[event.key]!,
                12,
            );
        else if (event.key === 'PageUp' || event.key === 'PageDown')
            next = new Date(
                year,
                month + (event.key === 'PageUp' ? -1 : 1),
                1,
                12,
            );
        else return;
        event.preventDefault();
        setCursor(next);
        requestAnimationFrame(() =>
            popup.current
                ?.querySelector<HTMLButtonElement>(`[data-date="${iso(next)}"]`)
                ?.focus(),
        );
    }

    return (
        <span className="date-picker">
            <input type="hidden" name={name} value={value} />
            <button
                ref={trigger}
                type="button"
                className="date-picker-trigger"
                aria-label={`${label}${value ? `: ${parse(value).toLocaleDateString('vi-VN')}` : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={id}
                onClick={handleOpen}
            >
                <span className={value ? '' : 'date-picker-placeholder'}>
                    {value
                        ? parse(value).toLocaleDateString('vi-VN')
                        : 'dd/mm/yyyy'}
                </span>
                <Icon name="calendar" size={16} />
            </button>
            <div
                ref={popup}
                id={id}
                popover="auto"
                className="date-picker-popup"
                role="dialog"
                aria-label={`Chọn ${label.toLowerCase()}`}
                style={
                    {
                        '--date-left': `${position.left}px`,
                        '--date-top': `${position.top}px`,
                    } as CSSProperties
                }
                onToggle={(event) => {
                    const isOpen =
                        (event.nativeEvent as ToggleEvent).newState === 'open';
                    setOpen(isOpen);
                    if (isOpen)
                        requestAnimationFrame(() =>
                            popup.current
                                ?.querySelector<HTMLButtonElement>(
                                    '[data-cursor="true"]',
                                )
                                ?.focus(),
                        );
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        close();
                    }
                }}
            >
                <div className="date-picker-heading">
                    <button
                        className="icon-btn"
                        type="button"
                        aria-label="Tháng trước"
                        onClick={() => moveMonth(-1)}
                    >
                        <Icon
                            name="chevron"
                            className="date-picker-prev"
                            size={16}
                        />
                    </button>
                    <div className="date-picker-month" aria-live="polite">
                        <select
                            aria-label="Tháng"
                            value={month}
                            onChange={(e) =>
                                setCursor(
                                    new Date(
                                        year,
                                        Number(e.target.value),
                                        1,
                                        12,
                                    ),
                                )
                            }
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i}>
                                    Tháng {i + 1}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Năm"
                            value={year}
                            onChange={(e) =>
                                setCursor(
                                    new Date(
                                        Number(e.target.value),
                                        month,
                                        1,
                                        12,
                                    ),
                                )
                            }
                        >
                            {Array.from(
                                {
                                    length:
                                        Math.max(2100, year) -
                                        Math.min(1900, year) +
                                        1,
                                },
                                (_, i) => Math.min(1900, year) + i,
                            ).map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        className="icon-btn"
                        type="button"
                        aria-label="Tháng sau"
                        onClick={() => moveMonth(1)}
                    >
                        <Icon name="chevron" size={16} />
                    </button>
                </div>
                <table
                    className="date-picker-grid"
                    role="grid"
                    aria-label={`Tháng ${month + 1} năm ${year}`}
                >
                    <thead>
                        <tr>
                            {weekdays.map((day) => (
                                <th scope="col" key={day}>
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }, (_, week) => (
                            <tr key={week}>
                                {days
                                    .slice(week * 7, week * 7 + 7)
                                    .map((date) => {
                                        const key = iso(date);
                                        return (
                                            <td
                                                key={key}
                                                aria-selected={value === key}
                                            >
                                                <button
                                                    type="button"
                                                    data-date={key}
                                                    data-cursor={
                                                        key === iso(cursor)
                                                    }
                                                    tabIndex={
                                                        key === iso(cursor)
                                                            ? 0
                                                            : -1
                                                    }
                                                    className={`date-picker-day${date.getMonth() !== month ? ' outside' : ''}${value === key ? ' selected' : ''}`}
                                                    aria-label={date.toLocaleDateString(
                                                        'vi-VN',
                                                        {
                                                            weekday: 'long',
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                    aria-current={
                                                        today === key
                                                            ? 'date'
                                                            : undefined
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleDayKey(e, date)
                                                    }
                                                    onClick={() => select(key)}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            </td>
                                        );
                                    })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="date-picker-footer">
                    <button type="button" onClick={() => select('')}>
                        Xóa
                    </button>
                    <button type="button" onClick={() => select(today)}>
                        Hôm nay
                    </button>
                </div>
            </div>
        </span>
    );
}
