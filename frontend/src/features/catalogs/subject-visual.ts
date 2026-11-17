import type { PrototypeIconName } from '../../shared/ui/prototype-glyphs.ts';

export type SubjectTone = '' | 'slate' | 'clay' | 'sage' | 'brass';

export type SubjectVisual = {
    glyph: PrototypeIconName;
    tone: SubjectTone;
};

export function normalizeSubjectSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .trim()
        .toLowerCase();
}

const SUBJECT_RULES: ReadonlyArray<{
    pattern: RegExp;
    glyph: PrototypeIconName;
    tone: SubjectTone;
}> = [
    { pattern: /\btoan\b/, glyph: 'subject-math', tone: 'slate' },
    {
        pattern: /\b(ngu van|van hoc|van)\b/,
        glyph: 'subject-literature',
        tone: 'clay',
    },
    {
        pattern: /\b(ngoai ngu|tieng anh|tieng phap|tieng trung|anh van)\b/,
        glyph: 'subject-language',
        tone: 'slate',
    },
    {
        pattern: /\b(vat li|vat ly|li)\b/,
        glyph: 'subject-physics',
        tone: 'slate',
    },
    {
        pattern: /\b(hoa hoc|hoa)\b/,
        glyph: 'subject-chemistry',
        tone: 'brass',
    },
    {
        pattern: /\b(sinh hoc|sinh)\b/,
        glyph: 'subject-biology',
        tone: 'sage',
    },
    { pattern: /\b(lich su|su)\b/, glyph: 'subject-history', tone: 'clay' },
    {
        pattern: /\b(dia li|dia ly|dia)\b/,
        glyph: 'subject-geography',
        tone: 'sage',
    },
    {
        pattern: /\b(tin hoc|tin)\b/,
        glyph: 'subject-computing',
        tone: 'slate',
    },
    { pattern: /\bcong nghe\b/, glyph: 'subject-technology', tone: 'brass' },
    {
        pattern: /\b(khtn|khoa hoc tu nhien)\b/,
        glyph: 'subject-science',
        tone: 'sage',
    },
    {
        pattern: /\b(the duc|gdtc|giao duc the chat)\b/,
        glyph: 'subject-sport',
        tone: 'clay',
    },
    {
        pattern:
            /\b(gdcd|giao duc cong dan|ktpl|kinh te va phap luat|giao duc kinh te)\b/,
        glyph: 'subject-civic',
        tone: 'brass',
    },
    {
        pattern: /\b(gdqp|quoc phong|an ninh)\b/,
        glyph: 'subject-defense',
        tone: 'sage',
    },
    { pattern: /\bam nhac\b/, glyph: 'subject-music', tone: 'clay' },
    { pattern: /\b(mi thuat|my thuat)\b/, glyph: 'subject-art', tone: 'clay' },
    {
        pattern: /\b(gddp|gd dp|dia phuong|hdtn|trai nghiem|huong nghiep)\b/,
        glyph: 'subject-local',
        tone: 'sage',
    },
];

export function resolveSubjectVisual(subjectName: string): SubjectVisual {
    const normalized = normalizeSubjectSearch(subjectName);
    for (const rule of SUBJECT_RULES) {
        if (rule.pattern.test(normalized)) {
            return { glyph: rule.glyph, tone: rule.tone };
        }
    }
    return { glyph: 'book', tone: '' };
}
