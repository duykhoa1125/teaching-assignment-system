import { useId, useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import { navigation, type NavigationItem } from './navigation';

const defaultDestinations: NavigationItem[] = [
    ...navigation,
    { path: '/settings', label: 'Cài đặt cá nhân', icon: 'settings' },
];

export function ShellSearch({
    onNavigate,
    destinations = defaultDestinations,
}: {
    onNavigate: (path: string) => void;
    destinations?: NavigationItem[];
}) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const id = useId();
    const normalize = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .toLowerCase();
    const results = destinations.filter((item) =>
        normalize(item.label).includes(normalize(query.trim())),
    );
    return (
        <div className="modal-body">
            <div className="input-wrap">
                <input
                    data-initial-focus
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls={`${id}-results`}
                    aria-label="Tìm kiếm toàn hệ thống"
                    aria-activedescendant={
                        results.length ? `${id}-${active}` : undefined
                    }
                    placeholder="Nhập tên màn hình…"
                    style={{ width: '100%' }}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                    }}
                    onKeyDown={(event) => {
                        if (
                            (event.key === 'ArrowDown' ||
                                event.key === 'ArrowUp') &&
                            results.length
                        ) {
                            event.preventDefault();
                            const next =
                                (active +
                                    (event.key === 'ArrowDown' ? 1 : -1) +
                                    results.length) %
                                results.length;
                            setActive(next);
                            document
                                .getElementById(`${id}-${next}`)
                                ?.scrollIntoView({ block: 'nearest' });
                        } else if (event.key === 'Enter' && results[active]) {
                            event.preventDefault();
                            onNavigate(results[active].path);
                        }
                    }}
                />
            </div>
            <div
                id={`${id}-results`}
                className="search-results"
                role="listbox"
                aria-label="Kết quả tìm kiếm"
            >
                {results.map((item, index) => (
                    <button
                        type="button"
                        role="option"
                        key={item.path}
                        id={`${id}-${index}`}
                        className={`search-result${index === active ? ' search-active' : ''}`}
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => onNavigate(item.path)}
                    >
                        <Icon name={item.icon} />
                        <span className="grow">{item.label}</span>
                        <Icon name="arrow" />
                    </button>
                ))}
                {!results.length && (
                    <div className="search-empty">
                        Không tìm thấy màn hình phù hợp.
                    </div>
                )}
            </div>
            <div className="help-keys">
                <span>↑ ↓ Di chuyển</span>
                <span>Enter Mở</span>
                <span>Esc Đóng</span>
            </div>
        </div>
    );
}
