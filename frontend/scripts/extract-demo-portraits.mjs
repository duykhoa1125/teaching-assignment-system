import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'prototype/index.html'), 'utf8');
const match = html.match(/^const portraitAssets=(\{[^\r\n]+\});$/m);
if (!match) {
    throw new Error('Không tìm thấy portraitAssets trong prototype/index.html');
}

const assets = JSON.parse(match[1]);
const outDir = resolve(root, 'src/assets/demo');
mkdirSync(outDir, { recursive: true });

for (let i = 1; i <= 12; i += 1) {
    const uri = assets[String(i)];
    if (
        typeof uri !== 'string' ||
        !uri.startsWith('data:image/svg+xml;base64,')
    ) {
        throw new Error(
            `Thiếu SVG chân dung giáo viên #${i} trong prototype/index.html`,
        );
    }
    const base64 = uri.slice('data:image/svg+xml;base64,'.length);
    writeFileSync(
        resolve(outDir, `teacher-${i}.svg`),
        Buffer.from(base64, 'base64'),
    );
}

console.log('Extracted teacher-1.svg .. teacher-12.svg into src/assets/demo');
