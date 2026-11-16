import { preparationStore } from '../preparation-store.ts';

/** Explicit complete-source fixture for the weekly-PASS scenario and successful workflow tests. */
export function completeRoundDemands(roundId: number) {
    const round = preparationStore.detailRound(roundId);
    const scopes = preparationStore.listScopes({
        round_id: roundId,
        limit: 100000,
    });
    const apps = preparationStore
        .listApplicabilities({ limit: 100000 })
        .filter(
            (app) =>
                app.status === 'APPLICABLE' &&
                scopes.some((scope) => scope.id === app.scope_id),
        );
    for (const req of preparationStore.listRequiredComponents({
        limit: 100000,
    })) {
        const app = apps.find((item) => item.id === req.applicability_id);
        if (!app || req.demand_id !== null) continue;
        const scope = scopes.find((item) => item.id === app.scope_id)!;
        preparationStore.saveDemand({
            semester_id: round.semester_id,
            class_id: app.class_id,
            subject_id: scope.subject_id,
            periods_per_week: 3,
            status: 'ACTIVE',
            updated_by: 1,
            demand_type: req.demand_type,
            valid_from: req.valid_from,
            valid_to: req.valid_to,
            unit: 'PERIOD_PER_WEEK',
        });
    }
}
