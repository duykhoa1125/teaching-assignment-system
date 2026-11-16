import type { AssignmentRound } from '../catalogs/types.ts';

export function roundFromUrl(
    rounds: readonly AssignmentRound[],
    raw: string | null,
    fallback: AssignmentRound | null,
) {
    if (raw === null) return fallback;
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)))
        return null;
    return rounds.find((round) => round.id === Number(raw)) ?? null;
}
export function roundPath(
    path: string,
    roundId: number | null | undefined,
    contextId: string,
) {
    const url = new URL(path, 'http://tass.local');
    if (roundId != null) url.searchParams.set('round_id', String(roundId));
    url.searchParams.set('context_id', contextId);
    return url.pathname + url.search + url.hash;
}
