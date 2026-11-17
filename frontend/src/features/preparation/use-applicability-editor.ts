import { useMemo, useState, type FormEvent } from 'react';
import {
    formatPreparationApiError,
    validateApplicabilityForm,
} from '@/features/preparation/model';
import { useSaveApplicabilityMutation } from '@/features/preparation/queries';
import { useToast } from '@/shared/ui/toast-context';
import type {
    ApplicabilityStatus,
    ClassSubjectApplicability,
} from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
type ApplicabilityDraft = {
    scope_id: string;
    class_id: string;
    status: ApplicabilityStatus;
    reason: string;
    confirmNow: boolean;
};

export function useApplicabilityEditor(data: PreparationData) {
    const toast = useToast();
    const {
        actorId,
        activeSemester,
        classes,
        scopeMap,
        roundApps,
        semesterDemands,
        formatAppLabel,
    } = data;
    const [appScopeFilter, setAppScopeFilter] = useState('');
    const [appStatusFilter, setAppStatusFilter] = useState<
        ApplicabilityStatus | ''
    >('');
    const [appModal, setAppModal] = useState<{
        editing: ClassSubjectApplicability | null;
        draft: ApplicabilityDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const saveAppMutation = useSaveApplicabilityMutation();
    const filteredApps = useMemo(
        () =>
            roundApps.filter((a) => {
                if (appScopeFilter && a.scope_id !== Number(appScopeFilter))
                    return false;
                if (appStatusFilter && a.status !== appStatusFilter)
                    return false;
                return true;
            }),
        [roundApps, appScopeFilter, appStatusFilter],
    );

    const handleSaveApplicability = async (event: FormEvent) => {
        event.preventDefault();
        if (!appModal) return;
        const scope = scopeMap.get(Number(appModal.draft.scope_id));
        const hasActiveDemand =
            Boolean(activeSemester && scope) &&
            semesterDemands.some(
                (d) =>
                    d.semester_id === activeSemester!.id &&
                    d.class_id === Number(appModal.draft.class_id) &&
                    d.subject_id === scope!.subject_id &&
                    d.status === 'ACTIVE',
            );

        const errors = validateApplicabilityForm({
            scope_id: appModal.draft.scope_id,
            class_id: appModal.draft.class_id,
            status: appModal.draft.status,
            reason: appModal.draft.reason,
            hasActiveDemand,
        });
        if (Object.keys(errors).length > 0) {
            setAppModal({ ...appModal, errors, submitError: null });
            return;
        }
        const now = new Date().toISOString();
        const editing = appModal.editing;
        try {
            await saveAppMutation.mutateAsync({
                id: editing?.id,
                payload: {
                    scope_id: Number(appModal.draft.scope_id),
                    class_id: Number(appModal.draft.class_id),
                    status: appModal.draft.status,
                    reason:
                        appModal.draft.status === 'NOT_APPLICABLE'
                            ? appModal.draft.reason.trim()
                            : appModal.draft.reason.trim() || null,
                    updated_by: actorId,
                    confirmed_by: appModal.draft.confirmNow ? actorId : null,
                    confirmed_at: appModal.draft.confirmNow ? now : null,
                    components_confirmed_by:
                        editing?.components_confirmed_by ?? null,
                    components_confirmed_at:
                        editing?.components_confirmed_at ?? null,
                },
            });
            setAppModal(null);
            toast({
                title: editing
                    ? 'Đã cập nhật trạng thái áp dụng lớp–môn'
                    : 'Đã khai báo cặp lớp–môn mới',
                tone: 'success',
            });
        } catch (error) {
            setAppModal({
                ...appModal,
                submitError: formatPreparationApiError(error),
            });
        }
    };

    const handleConfirmComponentsForApp = async (
        app: ClassSubjectApplicability,
    ) => {
        try {
            await saveAppMutation.mutateAsync({
                id: app.id,
                payload: {
                    scope_id: app.scope_id,
                    class_id: app.class_id,
                    status: app.status,
                    reason: app.reason,
                    updated_by: actorId,
                    confirmed_by: app.confirmed_by ?? actorId,
                    confirmed_at: app.confirmed_at ?? new Date().toISOString(),
                    components_confirmed_by: actorId,
                    components_confirmed_at: new Date().toISOString(),
                },
            });
            toast({
                title: `Đã xác nhận tập thành phần cho ${formatAppLabel(app)}`,
                tone: 'success',
            });
        } catch (error) {
            toast({
                title: 'Không thể xác nhận tập thành phần',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    const availableClassesForSelectedScope = useMemo(() => {
        if (!appModal) return [];
        const scope = scopeMap.get(Number(appModal.draft.scope_id));
        if (!scope) return classes;
        return classes.filter(
            (c) =>
                c.grade_id === scope.grade_id &&
                (!activeSemester ||
                    c.academic_year_id === activeSemester.academic_year_id),
        );
    }, [appModal, scopeMap, classes, activeSemester]);

    return {
        appScopeFilter,
        setAppScopeFilter,
        appStatusFilter,
        setAppStatusFilter,
        appModal,
        setAppModal,
        filteredApps,
        saveAppMutation,
        handleSaveApplicability,
        handleConfirmComponentsForApp,
        availableClassesForSelectedScope,
    };
}
export type ApplicabilityEditor = ReturnType<typeof useApplicabilityEditor>;
