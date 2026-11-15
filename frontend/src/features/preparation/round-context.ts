import { useMemo, useState } from 'react';
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
    const [override, setOverride] = useState<{
        contextId: string;
        roundId: number;
    } | null>(null);

    const activeRound = useMemo(() => {
        if (override && override.contextId === contextId) {
            const matched = rounds.find((r) => r.id === override.roundId);
            if (matched) return matched;
        }
        return resolveDefaultRound(rounds, contextId, activeContextRound);
    }, [rounds, contextId, activeContextRound, override]);

    const selectRoundId = (roundId: number) => {
        setOverride({ contextId, roundId });
    };

    return { activeRound, selectRoundId };
}
