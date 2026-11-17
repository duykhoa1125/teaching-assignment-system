import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '..');
const prototypePath = resolve(frontendDir, 'prototype/index.html');
const assetsDir = resolve(frontendDir, 'src/assets/demo');

function extractPrototypePortraitAssets() {
    const html = readFileSync(prototypePath, 'utf8');
    const match = html.match(/^const portraitAssets=(\{[^\r\n]+\});$/m);
    assert.ok(
        match?.[1],
        'Expected portraitAssets object inside frontend/prototype/index.html',
    );
    return JSON.parse(match[1]);
}

test('extracted teacher portraits match prototype/index.html byte-for-byte', () => {
    const assets = extractPrototypePortraitAssets();
    const sha = (buf) => createHash('sha256').update(buf).digest('hex');

    for (let id = 1; id <= 12; id += 1) {
        const uri = assets[String(id)];
        assert.ok(
            typeof uri === 'string' &&
                uri.startsWith('data:image/svg+xml;base64,'),
        );
        const expectedSvg = Buffer.from(
            uri.slice('data:image/svg+xml;base64,'.length),
            'base64',
        );
        const filePath = resolve(assetsDir, `teacher-${id}.svg`);
        assert.ok(existsSync(filePath), `Missing ${filePath}`);
        const actualSvg = readFileSync(filePath);
        assert.equal(
            sha(actualSvg),
            sha(expectedSvg),
            `teacher-${id}.svg SHA-256 mismatch`,
        );
    }

    assert.ok(
        existsSync(resolve(assetsDir, 'manager.svg')),
        'Missing manager.svg',
    );
});

test('extracted auth illustration matches prototype/index.html byte-for-byte', () => {
    const html = readFileSync(prototypePath, 'utf8');
    const match = html.match(
        /^const loginIllustration="data:image\/png;base64,([A-Za-z0-9+/=]+)";$/m,
    );
    assert.ok(
        match?.[1],
        'Expected loginIllustration PNG inside frontend/prototype/index.html',
    );
    const expectedPng = Buffer.from(match[1], 'base64');
    const filePath = resolve(assetsDir, 'auth-illustration.png');
    assert.ok(existsSync(filePath), `Missing ${filePath}`);
    const actualPng = readFileSync(filePath);
    assert.equal(
        createHash('sha256').update(actualPng).digest('hex'),
        createHash('sha256').update(expectedPng).digest('hex'),
        'auth-illustration.png SHA-256 mismatch',
    );
});

test('overview UI components never import src/mocks or lucide-react', () => {
    const files = [
        'src/pages/overview/overview-page.tsx',
        'src/pages/overview/overview-sections.tsx',
        'src/pages/overview/workload-chart.tsx',
        'src/pages/overview/teacher-drawer.tsx',
        'src/shared/ui/portrait-avatar.tsx',
        'src/features/overview/api.ts',
        'src/features/overview/queries.ts',
    ];

    for (const rel of files) {
        const source = readFileSync(resolve(frontendDir, rel), 'utf8');
        assert.equal(
            source.includes('mocks/'),
            false,
            `${rel} must not import mocks`,
        );
        assert.equal(
            source.includes('lucide-react'),
            false,
            `${rel} should use original Icon glyphs`,
        );
    }
});
