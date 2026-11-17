import { ConfirmDialog } from '@/shared/ui/dialog';
import type { PreparationDeletion } from './use-preparation-deletion';

export function PreparationDeleteDialog({
    deletion,
}: {
    deletion: PreparationDeletion;
}) {
    const {
        deleteTarget,
        setDeleteTarget,
        deleteScopeMutation,
        deleteAppMutation,
        deleteComponentMutation,
        handleConfirmDelete,
    } = deletion;

    return (
        <ConfirmDialog
            variant="prototype"
            open={deleteTarget !== null}
            onOpenChange={(open) => {
                if (!open) setDeleteTarget(null);
            }}
            title="Xác nhận xóa bản ghi chuẩn bị"
            description={
                deleteTarget?.kind === 'component'
                    ? 'Xóa thành phần bắt buộc sẽ tự động đặt lại trạng thái xác nhận tập thành phần của cặp lớp–môn cha.'
                    : 'Nếu đã có dữ liệu bước sau tham chiếu bản ghi này, hệ thống sẽ từ chối xóa cứng (409 REFERENCE_CONFLICT).'
            }
            confirmLabel="Xác nhận xóa"
            destructive
            busy={
                deleteScopeMutation.isPending ||
                deleteAppMutation.isPending ||
                deleteComponentMutation.isPending
            }
            onConfirm={() => void handleConfirmDelete()}
        />
    );
}
