import { useMemo, useState, type FormEvent } from 'react';
import {
    formatPreparationApiError,
    validateRequiredComponentForm,
} from '@/features/preparation/model';
import { useSaveRequiredComponentMutation } from '@/features/preparation/queries';
import { useToast } from '@/shared/ui/toast-context';
import type {
    DemandType,
    RequiredDemandComponent,
} from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
type ComponentDraft = {
    applicability_id: string;
    demand_type: DemandType;
    valid_from: string;
    valid_to: string;
};

export function useRequiredComponentEditor(data: PreparationData) {
    const toast = useToast();
    const { roundComponents } = data;
    const [componentAppFilter, setComponentAppFilter] = useState('');

    const [componentModal, setComponentModal] = useState<{
        editing: RequiredDemandComponent | null;
        draft: ComponentDraft;
        errors: Record<string, string>;
        submitError: string | null;
    } | null>(null);

    const saveComponentMutation = useSaveRequiredComponentMutation();
    const filteredComponents = useMemo(
        () =>
            roundComponents.filter((c) =>
                componentAppFilter
                    ? c.applicability_id === Number(componentAppFilter)
                    : true,
            ),
        [roundComponents, componentAppFilter],
    );

    const handleSaveComponent = async (event: FormEvent) => {
        event.preventDefault();
        if (!componentModal) return;
        const errors = validateRequiredComponentForm(componentModal.draft);
        if (Object.keys(errors).length > 0) {
            setComponentModal({ ...componentModal, errors, submitError: null });
            return;
        }
        try {
            await saveComponentMutation.mutateAsync({
                id: componentModal.editing?.id,
                payload: {
                    applicability_id: Number(
                        componentModal.draft.applicability_id,
                    ),
                    demand_type: componentModal.draft.demand_type,
                    valid_from: componentModal.draft.valid_from,
                    valid_to: componentModal.draft.valid_to,
                    confirmed_by: componentModal.editing?.confirmed_by ?? null,
                    confirmed_at: componentModal.editing?.confirmed_at ?? null,
                },
            });
            setComponentModal(null);
            toast({
                title: componentModal.editing
                    ? 'Đã cập nhật thành phần bắt buộc'
                    : 'Đã thêm thành phần bắt buộc',
                description:
                    'Xác nhận tập thành phần của cặp lớp–môn đã được đặt lại để rà soát trước khi chốt.',
                tone: 'info',
            });
        } catch (error) {
            setComponentModal({
                ...componentModal,
                submitError: formatPreparationApiError(error),
            });
        }
    };

    return {
        componentAppFilter,
        setComponentAppFilter,
        componentModal,
        setComponentModal,
        filteredComponents,
        saveComponentMutation,
        handleSaveComponent,
    };
}
export type RequiredComponentEditor = ReturnType<
    typeof useRequiredComponentEditor
>;
