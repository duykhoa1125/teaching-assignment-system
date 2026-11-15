import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { prototypeGlyphs } from '../src/shared/ui/prototype-glyphs.ts';

test('SVG assets match the original demo including all late overrides', () => {
    const source = readFileSync(
        new URL('../prototype/index.html', import.meta.url),
        'utf8',
    );
    const literal = source.match(/const glyphs=(\{[\s\S]*?\n\});/);
    assert.ok(literal);
    const original = vm.runInNewContext(
        `(${literal[1]})`,
        {},
        { timeout: 1000 },
    );
    for (const match of source.matchAll(
        /Object\.assign\(glyphs,(\{[\s\S]*?\})\);/g,
    ))
        Object.assign(
            original,
            vm.runInNewContext(`(${match[1]})`, {}, { timeout: 1000 }),
        );
    assert.deepEqual(prototypeGlyphs, JSON.parse(JSON.stringify(original)));
});
