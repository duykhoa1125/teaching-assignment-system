import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'prototype/index.html'), 'utf8');
const match = html.match(
    /^const loginIllustration="data:image\/png;base64,([A-Za-z0-9+/=]+)";$/m,
);
if (!match?.[1]) {
    throw new Error(
        'Không tìm thấy loginIllustration PNG trong prototype/index.html',
    );
}

const outDir = resolve(root, 'src/assets/demo');
mkdirSync(outDir, { recursive: true });
writeFileSync(
    resolve(outDir, 'auth-illustration.png'),
    Buffer.from(match[1], 'base64'),
);

console.log('Extracted auth-illustration.png into src/assets/demo');
