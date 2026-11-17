import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { prototypeGlyphs } from '../src/shared/ui/prototype-glyphs.ts';

test('SVG assets match the demo with the approved rounded warning override', () => {
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
    // Only this user-approved override may differ; all other keys/paths stay exact.
    const warning =
        '<path class="duo" d="M10.363 3.591 2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0Z"/><path d="M12 9v4m-1.637-9.409L2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0M12 16h.01"/>';
    assert.notEqual(original.warning, warning);
    assert.deepEqual(prototypeGlyphs, {
        ...JSON.parse(JSON.stringify(original)),
        warning,
    });
});
