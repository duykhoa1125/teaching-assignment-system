import { useState } from 'react';
import { formatPreparationApiError } from '@/features/preparation/model';
import {
    useDeleteApplicabilityMutation,
    useDeleteRequiredComponentMutation,
    useDeleteScopeMutation,
} from '@/features/preparation/queries';
import { useToast } from '@/shared/ui/toast-context';

type DeletePrepTarget =
    | { kind: 'scope'; id: number; label: string }
    | { kind: 'applicability'; id: number; label: string }
    | { kind: 'component'; id: number; label: string };

export function usePreparationDeletion() {
    const toast = useToast();
    const [deleteTarget, setDeleteTarget] = useState<DeletePrepTarget | null>(
        null,
    );

    const deleteScopeMutation = useDeleteScopeMutation();
    const deleteAppMutation = useDeleteApplicabilityMutation();
    const deleteComponentMutation = useDeleteRequiredComponentMutation();
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.kind === 'scope') {
                await deleteScopeMutation.mutateAsync(deleteTarget.id);
            } else if (deleteTarget.kind === 'applicability') {
                await deleteAppMutation.mutateAsync(deleteTarget.id);
            } else {
                await deleteComponentMutation.mutateAsync(deleteTarget.id);
            }
            toast({ title: `Đã xóa ${deleteTarget.label}`, tone: 'success' });
            setDeleteTarget(null);
        } catch (error) {
            setDeleteTarget(null);
            toast({
                title: 'Không thể xóa bản ghi',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    return {
        deleteTarget,
        setDeleteTarget,
        deleteScopeMutation,
        deleteAppMutation,
        deleteComponentMutation,
        handleConfirmDelete,
    };
}
export type PreparationDeletion = ReturnType<typeof usePreparationDeletion>;
