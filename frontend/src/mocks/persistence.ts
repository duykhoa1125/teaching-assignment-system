// One versioned envelope keeps source, plans and governance in the same mock session.
// v1 plan/governance caches omitted their source state and cannot be migrated safely.
const KEY = 'tass-mock-state-v3';
type Section = 'preparation' | 'directory' | 'assignment' | 'governance';
type Envelope = { schema: 3; sections: Partial<Record<Section, unknown>> };

function storage(): Storage | null {
    if (typeof document === 'undefined' || typeof window === 'undefined')
        return null;
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}
function readEnvelope(store: Storage): Envelope {
    for (const old of [
        'tass-mock-assignment-v1',
        'tass-mock-governance-v1',
        'tass-mock-state-v2',
    ])
        store.removeItem(old);
    const raw = store.getItem(KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Envelope;
            if (
                parsed?.schema === 3 &&
                parsed.sections &&
                typeof parsed.sections === 'object' &&
                !Array.isArray(parsed.sections)
            )
                return parsed;
        } catch {
            // A damaged cache must not prevent subsequent valid writes.
        }
    }
    return { schema: 3, sections: {} };
}
export function readMockSection<T>(section: Section): T | null {
    const store = storage();
    if (!store) return null;
    try {
        return (readEnvelope(store).sections[section] as T | undefined) ?? null;
    } catch {
        return null;
    }
}
export function writeMockSection(section: Section, value: unknown) {
    const store = storage();
    if (!store) return;
    try {
        const envelope = readEnvelope(store);
        if (value === undefined) delete envelope.sections[section];
        else envelope.sections[section] = value;
        store.setItem(KEY, JSON.stringify(envelope));
    } catch {
        /* Storage may be unavailable or full; in-memory mock remains usable. */
    }
}
export function clearMockPersistence() {
    const store = storage();
    if (!store) return;
    try {
        for (const key of [
            KEY,
            'tass-mock-assignment-v1',
            'tass-mock-governance-v1',
            'tass-mock-state-v2',
        ])
            store.removeItem(key);
    } catch {
        /* Same fallback as writes. */
    }
}
