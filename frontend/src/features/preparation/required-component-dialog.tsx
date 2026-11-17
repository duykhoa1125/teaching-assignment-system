import { Dialog } from '@/shared/ui/dialog';
import { InputField, SelectField } from '@/shared/ui/fields';
import type { DemandType } from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
import type { RequiredComponentEditor } from './use-required-component-editor';

export function RequiredComponentDialog({
    data,
    editor,
}: {
    data: PreparationData;
    editor: RequiredComponentEditor;
}) {
    const { applicableApps, formatAppLabel } = data;
    const {
        componentModal,
        setComponentModal,
        saveComponentMutation,
        handleSaveComponent,
    } = editor;

    return (
        <Dialog
            variant="prototype"
            open={componentModal !== null}
            onOpenChange={(open) => {
                if (!open) setComponentModal(null);
            }}
            title={
                componentModal?.editing
                    ? 'Cập nhật thành phần bắt buộc'
                    : 'Thêm thành phần bắt buộc'
            }
            description="Lưu ý: khi thay đổi danh sách thành phần, trạng thái xác nhận tập của cặp lớp–môn sẽ được đặt lại."
            busy={saveComponentMutation.isPending}
        >
            {componentModal ? (
                <form className="mvp-form" onSubmit={handleSaveComponent}>
                    <SelectField
                        label="Cặp lớp–môn áp dụng"
                        required
                        disabled={Boolean(componentModal.editing)}
                        value={componentModal.draft.applicability_id}
                        error={componentModal.errors.applicability_id}
                        onChange={(e) =>
                            setComponentModal({
                                ...componentModal,
                                draft: {
                                    ...componentModal.draft,
                                    applicability_id: e.target.value,
                                },
                            })
                        }
                    >
                        <option value="">Chọn cặp lớp–môn…</option>
                        {applicableApps.map((app) => (
                            <option key={app.id} value={app.id}>
                                {formatAppLabel(app)}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Loại thành phần"
                        required
                        value={componentModal.draft.demand_type}
                        error={componentModal.errors.demand_type}
                        onChange={(e) =>
                            setComponentModal({
                                ...componentModal,
                                draft: {
                                    ...componentModal.draft,
                                    demand_type: e.target.value as DemandType,
                                },
                            })
                        }
                    >
                        <option value="STANDARD">
                            Giảng dạy chuẩn (STANDARD)
                        </option>
                        <option value="SPECIALIZED_TOPIC">
                            Chuyên đề lựa chọn (SPECIALIZED_TOPIC)
                        </option>
                        <option value="ENRICHMENT">
                            Tăng cường / hoạt động (ENRICHMENT)
                        </option>
                    </SelectField>
                    <InputField
                        label="Hiệu lực từ ngày"
                        type="date"
                        required
                        value={componentModal.draft.valid_from}
                        error={componentModal.errors.valid_from}
                        onChange={(e) =>
                            setComponentModal({
                                ...componentModal,
                                draft: {
                                    ...componentModal.draft,
                                    valid_from: e.target.value,
                                },
                            })
                        }
                    />
                    <InputField
                        label="Hiệu lực đến ngày"
                        type="date"
                        required
                        value={componentModal.draft.valid_to}
                        error={componentModal.errors.valid_to}
                        onChange={(e) =>
                            setComponentModal({
                                ...componentModal,
                                draft: {
                                    ...componentModal.draft,
                                    valid_to: e.target.value,
                                },
                            })
                        }
                    />
                    {componentModal.submitError ? (
                        <p className="mvp-error full" role="alert">
                            {componentModal.submitError}
                        </p>
                    ) : null}
                    <div className="modal-footer full">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setComponentModal(null)}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn primary"
                            disabled={saveComponentMutation.isPending}
                        >
                            Lưu thành phần
                        </button>
                    </div>
                </form>
            ) : null}
        </Dialog>
    );
}
