import { Dialog } from '@/shared/ui/dialog';
import { SelectField } from '@/shared/ui/fields';
import type { PreparationData } from './use-preparation-data';
import type { ScopeEditor } from './use-scope-editor';

export function ScopeDialog({
    data,
    editor,
}: {
    data: PreparationData;
    editor: ScopeEditor;
}) {
    const { grades, subjects } = data;
    const { scopeModal, setScopeModal, saveScopeMutation, handleSaveScope } =
        editor;

    return (
        <Dialog
            variant="prototype"
            open={scopeModal !== null}
            onOpenChange={(open) => {
                if (!open) setScopeModal(null);
            }}
            title="Thêm môn học vào phạm vi khối"
            description="Mỗi cặp khối–môn chỉ xuất hiện một lần trong đợt phân công."
            busy={saveScopeMutation.isPending}
        >
            {scopeModal ? (
                <form className="mvp-form" onSubmit={handleSaveScope}>
                    <SelectField
                        label="Khối lớp"
                        required
                        value={scopeModal.draft.grade_id}
                        onChange={(e) =>
                            setScopeModal({
                                ...scopeModal,
                                draft: {
                                    ...scopeModal.draft,
                                    grade_id: e.target.value,
                                },
                            })
                        }
                    >
                        <option value="">Chọn khối lớp…</option>
                        {grades.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Môn học"
                        required
                        value={scopeModal.draft.subject_id}
                        onChange={(e) =>
                            setScopeModal({
                                ...scopeModal,
                                draft: {
                                    ...scopeModal.draft,
                                    subject_id: e.target.value,
                                },
                            })
                        }
                    >
                        <option value="">Chọn môn học…</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} ({s.subject_code})
                            </option>
                        ))}
                    </SelectField>
                    {scopeModal.error ? (
                        <p className="mvp-error full" role="alert">
                            {scopeModal.error}
                        </p>
                    ) : null}
                    <div className="modal-footer full">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setScopeModal(null)}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn primary"
                            disabled={saveScopeMutation.isPending}
                        >
                            Lưu phạm vi
                        </button>
                    </div>
                </form>
            ) : null}
        </Dialog>
    );
}
