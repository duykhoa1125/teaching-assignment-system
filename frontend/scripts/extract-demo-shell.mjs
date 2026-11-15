import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(resolve(root, 'prototype/index.html'), 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
const css = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((match) => match[1])
    .join('\n');
mkdirSync(resolve(root, 'src/assets/demo'), { recursive: true });
const names = new Set(
    'sidebar brand brandmark brandword brand-caption workspace school-symbol nav-label nav nav-separator sidebar-bottom semester-box profile account-control account-identity avatar portrait c0 app main topbar breadcrumb top-actions global-search vertical-divider icon-btn mobile-menu mobile-nav-open nav-backdrop footer role-footer live-dot flex grow stack between mono sr-only icon duo count track mvp-nav-group quick-popover workspace-popover quick-head quick-body context-option mvp-note modal-backdrop modal wide modal-header modal-body modal-footer eyebrow section-index btn small primary danger ghost detail-grid account-portrait search-input-wrap search-input search-result search-group search-results search-empty notification-list notification-item notification-dot scope-note role-boundary popover-empty'.split(
        ' ',
    ),
);
for (const name of [
    'input-wrap',
    'help-keys',
    'search-active',
    'issue',
    'issue-symbol',
    'popover-fallback',
])
    names.add(name);
let fontIndex = 0;
function copyNode(node) {
    if (node.type === 'atrule') {
        if (node.name === 'font-face') {
            const font = node.clone();
            font.walkDecls('src', (decl) => {
                decl.value = decl.value.replace(
                    /url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g,
                    (_, data) => {
                        const file = `font-${++fontIndex}.woff2`;
                        writeFileSync(
                            resolve(root, 'src/assets/demo', file),
                            Buffer.from(data, 'base64'),
                        );
                        return `url('../../assets/demo/${file}')`;
                    },
                );
            });
            return font;
        }
        if (node.name.endsWith('keyframes')) return node.clone();
        if (!node.nodes) return null;
        const parent = node.clone({ nodes: [] });
        for (const child of node.nodes) {
            const copy = copyNode(child);
            if (copy) parent.append(copy);
        }
        return parent.nodes.length ? parent : null;
    }
    if (node.type !== 'rule') return null;
    const selectors = postcss.list
        .comma(node.selector)
        .filter(
            (selector) =>
                /^(?::root|html|body|\*|h[1-4](?:\b)|p(?:\b)|button(?:\b)|a(?:\b)|input(?:\b)|select(?:\b)|textarea(?:\b)|small(?:\b)|\[(?:hidden|tabindex)\]|:is\(|::selection|::view-transition|::-webkit-scrollbar)/.test(
                    selector,
                ) ||
                [...selector.matchAll(/\.([\w-]+)/g)].some((match) =>
                    names.has(match[1]),
                ),
        );
    if (!selectors.length) return null;
    const copy = node.clone();
    copy.selector = selectors
        .map((selector) => {
            if (
                selector === ':root' ||
                selector === 'html' ||
                selector.startsWith('::view-transition') ||
                selector.startsWith('::-webkit-scrollbar')
            )
                return selector;
            if (selector === 'body') return '.tass-shell';
            if (selector.startsWith('.mobile-nav-open'))
                return selector.replace(
                    '.mobile-nav-open',
                    ':where(.tass-shell).mobile-nav-open',
                );
            return `:where(.tass-shell) ${selector}`;
        })
        .join(',');
    return copy;
}
const output = postcss.root();
for (const node of postcss.parse(css).nodes) {
    const copy = copyNode(node);
    if (copy) output.append(copy);
}
writeFileSync(
    resolve(root, 'src/app/layouts/prototype-shell.css'),
    '/* Extracted from prototype/index.html. Regenerate with npm run assets:shell. */\n' +
        output.toString() +
        '\n',
);
const avatars = [
    ...new Set(
        [...html.matchAll(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g)].map(
            (match) => match[0],
        ),
    ),
].filter((uri) => uri.length === 14394);
if (avatars.length !== 1)
    throw new Error(
        `Expected original manager portrait, found ${avatars.length}`,
    );
writeFileSync(
    resolve(root, 'src/assets/demo/manager.svg'),
    Buffer.from(avatars[0].split(',')[1], 'base64'),
);
console.log(
    `Extracted ${fontIndex} original font files, shell CSS and manager portrait.`,
);
