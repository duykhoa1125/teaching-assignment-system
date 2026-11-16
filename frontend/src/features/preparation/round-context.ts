import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { roundFromUrl } from './round-navigation';
import type { AssignmentRound, Semester } from '../catalogs/types.ts';

const CONTEXT_ROUND_CODES: Record<string, string> = {
    hk1: 'PC-01',
    hk2: 'PC-02',
    'thcs-demo': 'PC-THCS',
};

export function resolveDefaultRound(
    rounds: readonly AssignmentRound[],
    contextId: string,
    activeContextRound?: string,
): AssignmentRound | null {
    if (rounds.length === 0) return null;
    const expectedCode =
        activeContextRound || CONTEXT_ROUND_CODES[contextId] || 'PC-01';
    return (
        rounds.find((round) => round.round_code === expectedCode) ??
        rounds[0] ??
        null
    );
}

export function resolveSemesterForRound(
    round: AssignmentRound | null,
    semesters: readonly Semester[],
    contextId: string,
): Semester | null {
    if (semesters.length === 0) return null;
    if (round) {
        const matched = semesters.find((s) => s.id === round.semester_id);
        if (matched) return matched;
    }
    if (contextId === 'hk2') {
        return (
            semesters.find((s) => s.semester_no === 2) ?? semesters[0] ?? null
        );
    }
    return semesters[0] ?? null;
}

export function useRoundSelection(
    rounds: readonly AssignmentRound[],
    contextId: string,
    activeContextRound?: string,
) {
    const [params, setParams] = useSearchParams();
    const urlContext = params.get('context_id');
    const changingContext = urlContext !== null && urlContext !== contextId;
    const fallback = resolveDefaultRound(rounds, contextId, activeContextRound);
    const activeRound = changingContext
        ? fallback
        : roundFromUrl(rounds, params.get('round_id'), fallback);
    useEffect(() => {
        if (!changingContext) return;
        const next = new URLSearchParams(params);
        for (const key of ['round_id', 'version_id', 'run_id'])
            next.delete(key);
        next.set('context_id', contextId);
        setParams(next, { replace: true });
    }, [changingContext, contextId, params, setParams]);
    const selectRoundId = (roundId: number) => {
        if (!rounds.some((round) => round.id === roundId)) return;
        const next = new URLSearchParams(params);
        next.set('round_id', String(roundId));
        next.set('context_id', contextId);
        next.delete('version_id');
        next.delete('run_id');
        setParams(next);
    };

    return { activeRound, selectRoundId };
}
