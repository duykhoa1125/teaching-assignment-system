import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
test('shell fonts and manager portrait preserve original demo bytes', () => {
    const original = readFileSync(new URL('prototype/index.html', root));
    assert.equal(
        createHash('sha256').update(original).digest('hex'),
        '030e179e84c2b765d842bfedbeef650186e18126b5a34b3451309c5d840ed0ef',
    );
    const html = original.toString('utf8');
    const fonts = [
        ...html
            .slice(0, html.indexOf('</head>'))
            .matchAll(/url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g),
    ];
    assert.equal(fonts.length, 15);
    for (const [index, match] of fonts.entries()) {
        assert.deepEqual(
            readFileSync(
                new URL(`src/assets/demo/font-${index + 1}.woff2`, root),
            ),
            Buffer.from(match[1], 'base64'),
        );
    }
    const portrait = [
        ...new Set(
            [
                ...html.matchAll(
                    /data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g,
                ),
            ].map((match) => match[0]),
        ),
    ].find((uri) => uri.length === 14394);
    assert.ok(portrait);
    assert.deepEqual(
        readFileSync(new URL('src/assets/demo/manager.svg', root)),
        Buffer.from(portrait.split(',')[1], 'base64'),
    );
});
