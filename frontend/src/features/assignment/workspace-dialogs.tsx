import { Dialog } from '@/shared/ui/dialog';
import {
    OPTIMIZATION_CONFIG_OPTIONS,
    RULE_SET_VERSION_OPTIONS,
} from '@/features/preparation/model';
import type { AssignmentRow } from './types';

export type LockAction = {
    locked: boolean;
    reason: string;
    revision: number;
    row?: AssignmentRow;
    selected?: number[];
    group?: boolean;
};
export type ConfigurationAction = {
    kind: 'create' | 'refresh';
    config: number;
    rule: number;
    revision: number;
};
export function WorkspaceDialogs({
    lock,
    configuration,
    error,
    busy,
    checking,
    checkError,
    setLock,
    setConfiguration,
    submitLock,
    submitConfiguration,
    reload,
}: {
    lock: LockAction | null;
    configuration: ConfigurationAction | null;
    error: string | null;
    busy: boolean;
    checking: boolean;
    checkError: string | null;
    setLock: (value: LockAction | null) => void;
    setConfiguration: (value: ConfigurationAction | null) => void;
    submitLock: () => void;
    submitConfiguration: () => void;
    reload: () => void;
}) {
    const failure = error && (
        <div className="form-error full" role="alert">
            {error}
            <button type="button" className="btn small" onClick={reload}>
                Tải lại phương án
            </button>
        </div>
    );
    return (
        <>
            <Dialog
                variant="prototype"
                open={lock !== null}
                busy={busy}
                onOpenChange={(open) => {
                    if (!open) setLock(null);
                }}
                title={lock?.locked ? 'Khóa phân công' : 'Mở khóa phân công'}
                description={
                    lock?.group
                        ? 'Áp dụng toàn bộ nhóm lớp–môn trong snapshot, kể cả thành phần đang ẩn bởi bộ lọc. Giữ riêng giáo viên của từng thành phần; có lỗi thì cả nhóm không thay đổi.'
                        : lock?.selected
                          ? `${lock.selected.length} dòng đã chọn. Cả thao tác được thực hiện cùng nhau; có lỗi thì không đổi dòng nào.`
                          : 'Giữ nguyên giáo viên và số tiết của thành phần. Cần ghi rõ lý do.'
                }
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        submitLock();
                    }}
                >
                    <label className="field">
                        Lý do
                        <textarea
                            aria-label="Lý do khóa hoặc mở khóa"
                            value={lock?.reason ?? ''}
                            maxLength={2000}
                            required
                            disabled={busy}
                            onChange={(event) => {
                                if (lock)
                                    setLock({
                                        ...lock,
                                        reason: event.target.value,
                                    });
                            }}
                        />
                    </label>
                    {failure}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn"
                            disabled={busy}
                            onClick={() => setLock(null)}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn primary"
                            disabled={busy}
                        >
                            {busy ? 'Đang lưu…' : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </Dialog>
            <Dialog
                variant="prototype"
                open={configuration !== null}
                busy={busy}
                onOpenChange={(open) => {
                    if (!open) setConfiguration(null);
                }}
                title={
                    configuration?.kind === 'create'
                        ? 'Tạo phương án nháp'
                        : 'Làm mới snapshot nguồn'
                }
                description={
                    configuration?.kind === 'create'
                        ? 'Chụp dữ liệu nguồn và tạo các thành phần chưa gán. Chưa chạy giải thuật tối ưu.'
                        : 'Đối soát nguồn mới, giữ khóa còn hợp lệ; bỏ gán giáo viên không còn đủ điều kiện. Xung đột khóa sẽ giữ nguyên toàn bộ phương án.'
                }
            >
                <form
                    className="mvp-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submitConfiguration();
                    }}
                >
                    <label className="field full">
                        Cấu hình tối ưu
                        <select
                            aria-label="Cấu hình tối ưu cho snapshot"
                            value={configuration?.config ?? 1}
                            disabled={busy}
                            onChange={(event) => {
                                if (configuration)
                                    setConfiguration({
                                        ...configuration,
                                        config: Number(event.target.value),
                                    });
                            }}
                        >
                            {OPTIMIZATION_CONFIG_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.code} · {option.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field full">
                        Bộ quy tắc
                        <select
                            aria-label="Bộ quy tắc cho snapshot"
                            value={configuration?.rule ?? 1}
                            disabled={busy}
                            onChange={(event) => {
                                if (configuration)
                                    setConfiguration({
                                        ...configuration,
                                        rule: Number(event.target.value),
                                    });
                            }}
                        >
                            {RULE_SET_VERSION_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.code} · {option.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {checking && (
                        <p className="muted full">Đang đọc tiền kiểm nguồn…</p>
                    )}
                    {checkError && (
                        <p className="form-error full" role="alert">
                            {checkError}
                        </p>
                    )}
                    {failure}
                    <div className="modal-footer full">
                        <button
                            type="button"
                            className="btn"
                            disabled={busy}
                            onClick={() => setConfiguration(null)}
                        >
                            Hủy
                        </button>
                        <button
                            className="btn primary"
                            type="submit"
                            disabled={busy || checking || Boolean(checkError)}
                        >
                            {busy
                                ? 'Đang xử lý…'
                                : configuration?.kind === 'create'
                                  ? 'Tạo bản nháp'
                                  : 'Làm mới snapshot'}
                        </button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}
