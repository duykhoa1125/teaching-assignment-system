import { Dialog } from '@/shared/ui/dialog';
import { SelectField, TextareaField } from '@/shared/ui/fields';
import type { ApplicabilityStatus } from '@/features/preparation/types';
import type { PreparationData } from './use-preparation-data';
import type { ApplicabilityEditor } from './use-applicability-editor';

export function ApplicabilityDialog({
    data,
    editor,
}: {
    data: PreparationData;
    editor: ApplicabilityEditor;
}) {
    const { classes, scopes, scopeMap, formatScopeLabel } = data;
    const {
        appModal,
        setAppModal,
        saveAppMutation,
        handleSaveApplicability,
        availableClassesForSelectedScope,
    } = editor;

    return (
        <Dialog
            variant="prototype"
            open={appModal !== null}
            onOpenChange={(open) => {
                if (!open) setAppModal(null);
            }}
            title={
                appModal?.editing
                    ? 'Phân loại cặp lớp–môn'
                    : 'Khai báo cặp lớp–môn'
            }
            description="Chọn Áp dụng hoặc Không áp dụng kèm lý do bắt buộc."
            busy={saveAppMutation.isPending}
        >
            {appModal ? (
                <form className="mvp-form" onSubmit={handleSaveApplicability}>
                    <SelectField
                        label="Phạm vi khối–môn"
                        required
                        disabled={Boolean(appModal.editing)}
                        value={appModal.draft.scope_id}
                        error={appModal.errors.scope_id}
                        onChange={(e) => {
                            const nextScope = scopeMap.get(
                                Number(e.target.value),
                            );
                            const nextClass = nextScope
                                ? classes.find(
                                      (c) => c.grade_id === nextScope.grade_id,
                                  )
                                : undefined;
                            setAppModal({
                                ...appModal,
                                draft: {
                                    ...appModal.draft,
                                    scope_id: e.target.value,
                                    class_id: nextClass
                                        ? String(nextClass.id)
                                        : '',
                                },
                            });
                        }}
                    >
                        <option value="">Chọn phạm vi…</option>
                        {scopes.map((s) => (
                            <option key={s.id} value={s.id}>
                                {formatScopeLabel(s)}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Lớp học"
                        required
                        disabled={Boolean(appModal.editing)}
                        value={appModal.draft.class_id}
                        error={appModal.errors.class_id}
                        onChange={(e) =>
                            setAppModal({
                                ...appModal,
                                draft: {
                                    ...appModal.draft,
                                    class_id: e.target.value,
                                },
                            })
                        }
                    >
                        <option value="">Chọn lớp…</option>
                        {availableClassesForSelectedScope.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.class_code}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label="Trạng thái áp dụng"
                        className="full"
                        required
                        value={appModal.draft.status}
                        error={appModal.errors.status}
                        onChange={(e) =>
                            setAppModal({
                                ...appModal,
                                draft: {
                                    ...appModal.draft,
                                    status: e.target
                                        .value as ApplicabilityStatus,
                                },
                            })
                        }
                    >
                        <option value="APPLICABLE">Áp dụng (APPLICABLE)</option>
                        <option value="NOT_APPLICABLE">
                            Không áp dụng (NOT_APPLICABLE)
                        </option>
                        <option value="UNDETERMINED">
                            Chưa xác định (UNDETERMINED)
                        </option>
                    </SelectField>
                    <TextareaField
                        label={
                            appModal.draft.status === 'NOT_APPLICABLE'
                                ? 'Lý do không áp dụng (bắt buộc)'
                                : 'Ghi chú (tùy chọn)'
                        }
                        className="full"
                        value={appModal.draft.reason}
                        error={appModal.errors.reason}
                        onChange={(e) =>
                            setAppModal({
                                ...appModal,
                                draft: {
                                    ...appModal.draft,
                                    reason: e.target.value,
                                },
                            })
                        }
                    />
                    <label className="mvp-checks full">
                        <span>
                            <input
                                type="checkbox"
                                checked={appModal.draft.confirmNow}
                                onChange={(e) =>
                                    setAppModal({
                                        ...appModal,
                                        draft: {
                                            ...appModal.draft,
                                            confirmNow: e.target.checked,
                                        },
                                    })
                                }
                            />{' '}
                            Xác nhận trạng thái phân loại này
                        </span>
                    </label>
                    {appModal.submitError ? (
                        <p className="mvp-error full" role="alert">
                            {appModal.submitError}
                        </p>
                    ) : null}
                    <div className="modal-footer full">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setAppModal(null)}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn primary"
                            disabled={saveAppMutation.isPending}
                        >
                            Lưu phân loại
                        </button>
                    </div>
                </form>
            ) : null}
        </Dialog>
    );
}
