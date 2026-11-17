import type {
    IssueDocumentRequest,
    PlanSnapshot,
} from '../features/governance/types.ts';
import { base64ToUint8, sha256Hex } from '../features/results/pdf.ts';
import { MockError } from './mock-error.ts';

function invalid(code: string, message: string): never {
    throw new MockError(422, code, message);
}
export function snapshotContent(snapshot: PlanSnapshot): string {
    const { id: _id, title: _title, at: _at, by: _by, ...content } = snapshot;
    const stable = (value: unknown): unknown =>
        Array.isArray(value)
            ? value.map(stable)
            : value !== null && typeof value === 'object'
              ? Object.fromEntries(
                    Object.entries(value)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, item]) => [key, stable(item)]),
                )
              : value;
    return JSON.stringify(stable(content));
}
export async function verifyExportPdf(
    input: IssueDocumentRequest,
): Promise<string> {
    if (
        !['teachers', 'classes'].includes(input.mode) ||
        typeof input.filename !== 'string' ||
        !input.filename.toLowerCase().endsWith('.pdf')
    )
        invalid(
            'INVALID_EXPORT_PDF',
            'Chọn kiểu báo cáo và tên tệp PDF hợp lệ.',
        );
    if (
        typeof input.pdf_base64 !== 'string' ||
        !input.pdf_base64.length ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
            input.pdf_base64,
        )
    )
        invalid('INVALID_EXPORT_PDF', 'Dữ liệu PDF base64 không hợp lệ.');
    let bytes: Uint8Array;
    try {
        bytes = base64ToUint8(input.pdf_base64);
    } catch {
        return invalid('INVALID_EXPORT_PDF', 'Không đọc được tệp PDF.');
    }
    const decoder = new TextDecoder();
    if (
        !Number.isSafeInteger(input.bytes) ||
        input.bytes !== bytes.length ||
        !decoder.decode(bytes.subarray(0, 8)).startsWith('%PDF-') ||
        !decoder
            .decode(bytes.subarray(Math.max(0, bytes.length - 1024)))
            .trimEnd()
            .endsWith('%%EOF')
    )
        invalid(
            'INVALID_EXPORT_PDF',
            'Nội dung hoặc kích thước tệp PDF không khớp.',
        );
    if (
        typeof input.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(input.sha256)
    )
        invalid('EXPORT_HASH_MISMATCH', 'Mã kiểm tra SHA-256 không hợp lệ.');
    const hash = await sha256Hex(bytes);
    if (!hash || hash !== input.sha256.toLowerCase())
        invalid(
            'EXPORT_HASH_MISMATCH',
            'SHA-256 không khớp nội dung PDF; tạo lại tệp trước khi phát hành.',
        );
    return hash;
}
