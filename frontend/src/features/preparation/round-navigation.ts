import type { AssignmentRound } from '../catalogs/types.ts';

export type PreparationStep = 1 | 2 | 3 | 4;

export function parsePreparationStep(raw: string | null): PreparationStep {
    return raw === '2' || raw === '3' || raw === '4'
        ? (Number(raw) as PreparationStep)
        : 1;
}

/** Switching preparation steps must retain the selected round and context. */
export function preparationStepParams(
    current: URLSearchParams,
    step: PreparationStep,
): URLSearchParams {
    const next = new URLSearchParams(current);
    next.set('step', String(step));
    return next;
}

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
