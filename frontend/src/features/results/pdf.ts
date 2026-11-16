import { DEMAND_TYPE_LABELS, formatPeriods } from '../preparation/model.ts';
import type { PlanSnapshot } from '../governance/types.ts';

/** Pure PDF 1.4 multi-page JPEG container generator matching prototype mvpPdfBytes. */
export function buildPdfFromJpegPages(
    jpegPages: readonly Uint8Array[],
    width = 595,
    height = 842,
): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [0];
    let length = 0;

    const push = (part: string | Uint8Array) => {
        const bytes = typeof part === 'string' ? encoder.encode(part) : part;
        chunks.push(bytes);
        length += bytes.length;
    };

    push('%PDF-1.4\n');
    const objectCount = 2 + jpegPages.length * 3;
    const writeObj = (id: number, body: () => void) => {
        offsets[id] = length;
        push(`${id} 0 obj\n`);
        body();
        push('\nendobj\n');
    };

    writeObj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    writeObj(2, () =>
        push(
            `<< /Type /Pages /Count ${jpegPages.length} /Kids [${jpegPages
                .map((_, idx) => `${3 + idx * 3} 0 R`)
                .join(' ')}] >>`,
        ),
    );

    jpegPages.forEach((jpg, idx) => {
        const pageId = 3 + idx * 3;
        const stream = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
        writeObj(pageId, () =>
            push(
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
            ),
        );
        writeObj(pageId + 1, () =>
            push(
                `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
            ),
        );
        writeObj(pageId + 2, () => {
            push(
                `<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,
            );
            push(jpg);
            push('\nendstream');
        });
    });

    const xrefOffset = length;
    push(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= objectCount; id += 1) {
        push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    }
    push(
        `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    );

    const output = new Uint8Array(length);
    let cursor = 0;
    for (const chunk of chunks) {
        output.set(chunk, cursor);
        cursor += chunk.length;
    }
    return output;
}

export function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 16384) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
    }
    return btoa(binary);
}

export function base64ToUint8(encoded: string): Uint8Array {
    return Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0));
}

export async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function downloadBytes(
    bytes: Uint8Array,
    filename: string,
    mimeType: string,
) {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const url = URL.createObjectURL(
        new Blob([copy.buffer], { type: mimeType }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type PdfLine = { text: string; size: number; color: string };

/** Render frozen snapshot to real multi-page PDF matching prototype mvpPdfRender. */
export async function renderSnapshotPdfBytes(
    snapshot: PlanSnapshot,
    mode: 'teachers' | 'classes',
    isDraft: boolean,
): Promise<Uint8Array> {
    if (document.fonts?.ready) {
        await document.fonts.ready;
    }
    const width = 1190;
    const height = 1684;
    const margin = 80;
    const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const blocks: PdfLine[][] = [];
    const line = (text: string, size = 21, color = '#252820'): PdfLine => ({
        text,
        size,
        color,
    });
    const addBlock = (items: PdfLine[]) => blocks.push(items);

    if (isDraft) {
        addBlock([
            line('BẢN NHÁP · CHƯA ĐỦ ĐIỀU KIỆN PHÁT HÀNH', 24, '#AE451F'),
        ]);
    }
    addBlock([
        line('Phân công giảng dạy', 38),
        line(`${snapshot.interval.from} → ${snapshot.interval.to}`),
        line(
            `Người lập: ${snapshot.by} · ${new Date(snapshot.at).toLocaleString('vi-VN')}`,
            18,
        ),
    ]);
    if (snapshot.annual_warning) {
        addBlock([
            line('CẢNH BÁO: CHƯA ĐỦ DỮ LIỆU KIỂM TRA TẢI NĂM', 24, '#AE451F'),
            line(snapshot.annual_warning, 20, '#AE451F'),
        ]);
    }
    addBlock([line('01 / TỔNG HỢP TẢI · TIẾT / TUẦN', 26)]);
    for (const teacher of snapshot.teachers) {
        addBlock([
            line(`${teacher.teacher_code} · ${teacher.full_name}`, 23),
            line(
                `F ${formatPeriods(teacher.f)}  |  A ${formatPeriods(teacher.a)}  |  C ${formatPeriods(teacher.c)}  |  R ${formatPeriods(teacher.r)}  |  W ${formatPeriods(teacher.w)}  |  Q ${formatPeriods(teacher.q)}`,
                19,
            ),
            line(
                `T ${formatPeriods(teacher.t)}  /  B ${formatPeriods(teacher.b)}  |  T−B ${formatPeriods(teacher.delta)}  |  A−Q ${formatPeriods(teacher.a - teacher.q)}  |  W−Q ${formatPeriods(teacher.w - teacher.q)}`,
                19,
            ),
        ]);
    }
    addBlock([
        line(
            `02 / PHÂN CÔNG THEO ${mode === 'teachers' ? 'GIÁO VIÊN' : 'LỚP'}`,
            26,
        ),
    ]);
    const sortedRows = snapshot.rows
        .slice()
        .sort((a, b) =>
            mode === 'teachers'
                ? (a.teacher_id ?? 0) - (b.teacher_id ?? 0)
                : a.class_name.localeCompare(b.class_name, 'vi'),
        );
    for (const row of sortedRows) {
        addBlock([
            line(
                `${row.class_name} · ${row.subject_name} · ${DEMAND_TYPE_LABELS[row.demand_type] ?? row.demand_type} · ${formatPeriods(row.periods_per_week)} tiết/tuần`,
            ),
            line(
                `${row.teacher_name ?? 'CHƯA GÁN'} · ${row.valid_from} → ${row.valid_to}${row.locked ? ' · Đã khóa' : ''}`,
                18,
                '#696D61',
            ),
        ]);
    }
    addBlock([
        line(
            `Bộ quy tắc: ${snapshot.rule_version} · Input: ${snapshot.token}`,
            18,
        ),
        line(
            'Đề xuất phục vụ xem xét, chưa phải quyết định phân công chính thức.',
            18,
        ),
    ]);

    const jpegPages: Uint8Array[] = [];

    const startPage = () => {
        const nextCanvas = document.createElement('canvas');
        nextCanvas.width = width;
        nextCanvas.height = height;
        const nextCtx = nextCanvas.getContext('2d');
        if (!nextCtx) throw new Error('Không khởi tạo được canvas tạo PDF.');
        nextCtx.fillStyle = '#FFFDF8';
        nextCtx.fillRect(0, 0, width, height);
        nextCtx.fillStyle = '#D43819';
        nextCtx.fillRect(margin, 55, width - margin * 2, 5);
        nextCtx.font = `18px ${family}`;
        nextCtx.fillStyle = '#696D61';
        nextCtx.fillText(
            isDraft ? 'TASS / BẢN NHÁP RÀ SOÁT' : 'TASS / PHƯƠNG ÁN ĐỀ XUẤT',
            margin,
            100,
        );
        nextCtx.fillText(
            `${snapshot.academic_year} · ${snapshot.context_title} · ${snapshot.round_code} · V${snapshot.version_no}/r${snapshot.revision_no}`,
            margin,
            130,
        );
        return { canvas: nextCanvas, ctx: nextCtx, y: 190 };
    };

    let page = startPage();

    const finishPage = () => {
        page.ctx.font = `16px ${family}`;
        page.ctx.fillStyle = '#696D61';
        page.ctx.fillText(
            `Dữ liệu minh họa · ${snapshot.id} · Trang ${jpegPages.length + 1}`,
            margin,
            height - 50,
        );
        const dataUrl = page.canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.split(',')[1] ?? '';
        jpegPages.push(base64ToUint8(base64));
    };

    const wrapLine = (item: PdfLine): PdfLine[] => {
        page.ctx.font = `${item.size}px ${family}`;
        const wrapped: PdfLine[] = [];
        let current = '';
        for (const word of item.text.split(/\s+/)) {
            const candidate = current ? `${current} ${word}` : word;
            if (
                current &&
                page.ctx.measureText(candidate).width > width - margin * 2
            ) {
                wrapped.push({ ...item, text: current });
                current = word;
            } else {
                current = candidate;
            }
        }
        wrapped.push({ ...item, text: current });
        return wrapped;
    };

    for (const group of blocks) {
        const lines = group.flatMap(wrapLine);
        const blockHeight =
            lines.reduce((sum, item) => sum + item.size * 1.6, 0) + 15;
        if (page.y + blockHeight > height - 110 && page.y > 190) {
            finishPage();
            page = startPage();
        }
        for (const row of lines) {
            if (page.y + row.size * 1.6 > height - 100) {
                finishPage();
                page = startPage();
            }
            page.ctx.font = `${row.size}px ${family}`;
            page.ctx.fillStyle = row.color;
            page.ctx.fillText(row.text, margin, page.y);
            page.y += row.size * 1.6;
        }
        page.y += 15;
    }
    finishPage();

    return buildPdfFromJpegPages(jpegPages);
}
