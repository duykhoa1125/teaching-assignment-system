import { useMemo, useState, type FormEvent } from 'react';
import { useSaveAssignmentRoundMutation } from '@/features/catalogs/queries';
import { formatPreparationApiError } from '@/features/preparation/model';
import { useSaveScopeMutation } from '@/features/preparation/queries';
import { useToast } from '@/shared/ui/toast-context';
import type { RoundSubjectScope } from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
type ScopeDraft = {
    grade_id: string;
    subject_id: string;
};

export function useScopeEditor(data: PreparationData) {
    const toast = useToast();
    const { actorId, activeRound, scopes } = data;
    const [scopeGradeFilter, setScopeGradeFilter] = useState('');
    const [scopeModal, setScopeModal] = useState<{
        draft: ScopeDraft;
        error: string | null;
    } | null>(null);

    const saveRoundMutation = useSaveAssignmentRoundMutation();
    const saveScopeMutation = useSaveScopeMutation();
    const filteredScopes = useMemo(
        () =>
            scopes.filter((s) =>
                scopeGradeFilter
                    ? s.grade_id === Number(scopeGradeFilter)
                    : true,
            ),
        [scopes, scopeGradeFilter],
    );

    const handleConfirmRoundScope = async () => {
        if (!activeRound) return;
        const now = new Date().toISOString();
        try {
            await saveRoundMutation.mutateAsync({
                id: activeRound.id,
                payload: {
                    semester_id: activeRound.semester_id,
                    round_code: activeRound.round_code,
                    status: activeRound.status,
                    scope_confirmed_by: actorId,
                    scope_confirmed_at: now,
                    opens_at: activeRound.opens_at,
                    closes_at: activeRound.closes_at,
                },
            });
            toast({
                title: `Đã xác nhận phạm vi cho đợt ${activeRound.round_code}`,
                tone: 'success',
            });
        } catch (error) {
            toast({
                title: 'Không thể xác nhận phạm vi đợt',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    const handleSaveScope = async (event: FormEvent) => {
        event.preventDefault();
        if (!scopeModal || !activeRound) return;
        const gradeId = Number(scopeModal.draft.grade_id);
        const subjectId = Number(scopeModal.draft.subject_id);
        if (!gradeId || !subjectId) {
            setScopeModal({
                ...scopeModal,
                error: 'Vui lòng chọn đầy đủ khối lớp và môn học.',
            });
            return;
        }
        try {
            await saveScopeMutation.mutateAsync({
                payload: {
                    round_id: activeRound.id,
                    grade_id: gradeId,
                    subject_id: subjectId,
                    confirmed_by: actorId,
                    confirmed_at: new Date().toISOString(),
                },
            });
            setScopeModal(null);
            toast({ title: 'Đã thêm môn vào phạm vi khối', tone: 'success' });
        } catch (error) {
            setScopeModal({
                ...scopeModal,
                error: formatPreparationApiError(error),
            });
        }
    };

    const handleToggleScopeConfirm = async (row: RoundSubjectScope) => {
        const confirming = !row.confirmed_at;
        try {
            await saveScopeMutation.mutateAsync({
                id: row.id,
                payload: {
                    round_id: row.round_id,
                    grade_id: row.grade_id,
                    subject_id: row.subject_id,
                    confirmed_by: confirming ? actorId : null,
                    confirmed_at: confirming ? new Date().toISOString() : null,
                },
            });
            toast({
                title: confirming
                    ? 'Đã xác nhận dòng phạm vi khối–môn'
                    : 'Đã bỏ xác nhận dòng phạm vi',
                tone: 'info',
            });
        } catch (error) {
            toast({
                title: 'Cập nhật thất bại',
                description: formatPreparationApiError(error),
                tone: 'error',
            });
        }
    };

    return {
        scopeGradeFilter,
        setScopeGradeFilter,
        scopeModal,
        setScopeModal,
        filteredScopes,
        saveRoundMutation,
        saveScopeMutation,
        handleConfirmRoundScope,
        handleSaveScope,
        handleToggleScopeConfirm,
    };
}
export type ScopeEditor = ReturnType<typeof useScopeEditor>;
