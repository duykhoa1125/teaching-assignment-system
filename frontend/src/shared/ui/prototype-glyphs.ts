// SVGs copied from prototype/index.html, including its later Object.assign overrides.
// Preserve these paths when migrating the demo. Do not accept runtime/user HTML.
export const prototypeGlyphs = {
    brand: '<g transform="scale(.09375)" fill="currentColor" stroke="none"><path d="M240,56V200a8,8,0,0,1-8,8H160a24,24,0,0,0-24,23.94,7.9,7.9,0,0,1-5.12,7.55A8,8,0,0,1,120,232a24,24,0,0,0-24-24H24a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H88a32,32,0,0,1,32,32v87.73a8.17,8.17,0,0,0,7.47,8.25,8,8,0,0,0,8.53-8V80a32,32,0,0,1,32-32h64A8,8,0,0,1,240,56Z"/></g>',
    home: '<path class="duo" d="m3 10 9-7 9 7v10H3Z"/><path d="m3 10 9-7 9 7M5 9v11h14V9M10 20v-7h4v7"/>',
    dashboard:
        '<rect class="duo" x="3" y="3" width="7" height="11" rx="2"/><rect x="3" y="3" width="7" height="11" rx="2"/><rect x="14" y="3" width="7" height="6" rx="2"/><rect x="14" y="13" width="7" height="8" rx="2"/><path d="M3 18h7M6.5 16v5"/>',
    assignment:
        '<path class="duo" d="M4 4h10v16H4z"/><rect x="3" y="3" width="13" height="18" rx="3"/><path d="M7 7h5M7 11h3M7 15h2m8-1 3 3-3 3m-5-3h8"/>',
    teachers:
        '<path class="duo" d="M3 20v-3a5 5 0 0 1 10 0v3Z"/><circle cx="8" cy="7" r="3"/><path d="M2 20v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 5 5v2M6 17h4"/>',
    book: '<path class="duo" d="M3 4c3-1 6 0 9 2v15c-3-2-6-3-9-2Z"/><path d="M12 6c-3-2-6-3-9-2v15c3-1 6 0 9 2 3-2 6-3 9-2V4c-3-1-6 0-9 2Zm0 0v15M6 8l3 1m6 0 3-1"/>',
    balance:
        '<path class="duo" d="m3 9 4 9H0Zm14 0 4 9h-8Z"/><path d="M12 3v17m-5 1h10M4 7h16M3 15l3-8 3 8a5 5 0 0 1-6 0Zm12 0 3-8 3 8a5 5 0 0 1-6 0Z"/>',
    feedback:
        '<path class="duo" d="M3 4h18v13H9l-6 4Z"/><path d="M8 17H6l-3 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6M7 8h10M7 12h6"/>',
    history:
        '<path class="duo" d="M12 4a8 8 0 1 1-8 8h8Z"/><path d="M3 8a9 9 0 1 1 0 8M3 3v5h5m4-1v5l3 2"/>',
    school: '<path class="duo" d="M4 10h16v11H4Z"/><path d="m3 10 9-7 9 7M5 10v11h14V10M9 21v-7h6v7M12 3V1m-5 11h1m8 0h1"/>',
    spark: '<path class="duo" d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4m-2-2h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    bell: '<path class="duo" d="M5 17V9a7 7 0 0 1 14 0v8Z"/><path d="M4 18h16l-2-4V9a6 6 0 0 0-12 0v5Zm6 3h4M12 1v2"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    sun: '<circle class="duo" cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    moon: '<path class="duo" d="M19 17A9 9 0 0 1 7 4a9 9 0 1 0 12 13Z"/><path d="M20 16A9 9 0 0 1 8 4a9 9 0 1 0 12 12Z"/>',
    settings:
        '<path class="duo" d="M4 4h16v16H4Z"/><path d="M3 6h18M3 18h18M7 3v6m10 6v6M3 12h18m-5-3v6"/>',
    help: '<circle class="duo" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01"/>',
    download:
        '<path class="duo" d="M3 15h18v6H3Z"/><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    lock: '<rect class="duo" x="5" y="10" width="14" height="11" rx="3"/><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    unlock: '<rect class="duo" x="5" y="10" width="14" height="11" rx="3"/><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 7.5-2m-3.5 11v2"/>',
    warning:
        '<path class="duo" d="m12 3 10 18H2Z"/><path d="m12 3 10 18H2Zm0 6v5m0 3h.01"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8ZM7 5v-2m10 2v-2"/>',
    clock: '<path class="duo" d="M12 3a9 9 0 0 1 9 9h-9Z"/><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    leaf: '<path class="duo" d="M20 3C7 2 1 9 7 17c8 6 15 0 13-14Z"/><path d="M20 3C7 2 1 9 7 17c8 6 15 0 13-14ZM4 21 16 9m-6 6h6m-6 0V9"/>',
    file: '<path class="duo" d="M5 3h9l5 5v13H5Z"/><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/>',
    edit: '<path class="duo" d="m4 16 12-12 4 4L8 20H4Z"/><path d="m4 16 12-12 4 4L8 20H4Zm9-9 4 4M4 16l4 4"/>',
    calendar:
        '<path class="duo" d="M3 9h18v12H3Z"/><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-14 4h2m6 0h2M7 17h2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    logout: '<path d="M9 4H4v16h5m5-12 4 4-4 4M8 12h12"/>',
    chart: '<path class="duo" d="M4 12h4v8H4Zm6-6h4v14h-4Zm6 3h4v11h-4Z"/><path d="M4 12h4v8H4Zm6-6h4v14h-4Zm6 3h4v11h-4ZM2 22h20"/>',
    layers: '<path class="duo" d="m2 7 10-5 10 5-10 5Z"/><path d="m2 7 10-5 10 5-10 5Zm0 5 10 5 10-5M2 17l10 5 10-5"/>',
    reset: '<path d="M4 8a8 8 0 1 1-1 7M4 3v5h5"/>',
    send: '<path class="duo" d="m3 3 18 9-18 9 3-9Z"/><path d="m3 3 18 9-18 9 3-9Zm3 9h15"/>',
    user: '<circle class="duo" cx="12" cy="7" r="4"/><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3M8 21v-3m8 3v-3"/>',
    mail: '<rect class="duo" x="3" y="5" width="18" height="14" rx="3"/><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/>',
    shield: '<path class="duo" d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-4 9 3 3 5-5"/>',
    rules: '<rect class="duo" x="4" y="3" width="16" height="18" rx="3"/><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m7 8 1 1 2-2m3 1h4m-10 5 1 1 2-2m3 1h4M7 18h10"/>',
    access: '<circle class="duo" cx="8" cy="9" r="5"/><circle cx="8" cy="9" r="5"/><circle cx="7" cy="8" r="1"/><path d="m12 12 8 8m-4-4 3-3m-1 5 3-3"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    matrix: '<rect class="duo" x="3" y="3" width="18" height="18" rx="3"/><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 3v18m6-12v12M9 15h12"/>',
    list: '<path d="M9 5h12M9 12h12M9 19h12"/><rect class="duo" x="2" y="3" width="4" height="4" rx="1"/><path d="M3 5h1m-1 7h1m-1 7h1"/>',
    undo: '<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>',
    panel: '<rect class="duo" x="15" y="3" width="6" height="18" rx="2"/><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M15 3v18m-6-13-3 4 3 4"/>',
    compare: '<path d="M4 3v13m0 5v-1m16-17v1m0 4v13M4 7h12l-3-3m3 13H8l3 3"/>',
    grain: '<path d="M4 5h16M4 12h16M4 19h16m-9-17v6m6 1v6m-9 1v6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    'subject-math':
        '<rect class="duo" x="4" y="3" width="16" height="18" rx="3"/><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 12h2m4 0h2m-8 4h2m4 0h2"/>',
    'subject-literature':
        '<path class="duo" d="M7 14 18 3l3 3-11 11-5 2Z"/><path d="M7 14 18 3l3 3-11 11-5 2Zm0 0 3 3m3-9 3 3M3 21h15"/>',
    'subject-language':
        '<path class="duo" d="M3 4h18v13H9l-6 4Z"/><path d="M8 17H6l-3 4V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5M8 13l3-6 3 6m-5-2h4m3-3h2m-2 3h2"/>',
    'subject-physics':
        '<circle class="duo" cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(35 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)"/>',
    'subject-chemistry':
        '<path class="duo" d="m6 14-3 5a1 1 0 0 0 1 2h16a1 1 0 0 0 1-2l-3-5Z"/><path d="M9 3h6m-5 0v6l-7 10a1.3 1.3 0 0 0 1 2h16a1.3 1.3 0 0 0 1-2L14 9V3M7 14h10m-7 3h.01m4 1h.01"/>',
    'subject-biology':
        '<path class="duo" d="M4 4c8-2 17 3 16 16C8 22 2 14 4 4Z"/><path d="M4 4c8-2 17 3 16 16C8 22 2 14 4 4Zm1 1 15 15M9 9v6m0-6h6m-2 4v5m0-5h5"/>',
    'subject-history':
        '<path class="duo" d="M6 3h12v4l-6 5-6-5Zm6 9 6 5v4H6v-4Z"/><path d="M5 3h14M5 21h14M7 3v4l5 5 5-5V3M7 21v-4l5-5 5 5v4M9 18h6"/>',
    'subject-geography':
        '<circle class="duo" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
    'subject-computing':
        '<rect class="duo" x="3" y="4" width="18" height="13" rx="2"/><rect x="3" y="4" width="18" height="13" rx="2"/><path d="m9 8-2 2 2 2m6-4 2 2-2 2M12 17v4m-5 0h10"/>',
    'subject-technology':
        '<path class="duo" d="m14 3 1 5 5 1a6 6 0 0 1-8 6l-6 6-3-3 6-6a6 6 0 0 1 5-9Z"/><path d="m14 3 1 5 5 1a6 6 0 0 1-8 6l-6 6-3-3 6-6a6 6 0 0 1 5-9ZM6 18l.01.01"/>',
    'subject-science':
        '<path class="duo" d="M4 12h8v8H4Zm10-8h7v9h-7Z"/><path d="M5 3h6M7 3v6l-4 9a2 2 0 0 0 2 3h6a2 2 0 0 0 2-3L9 9V3M5 14h6m3-10c6-2 8 3 6 8-5 0-8-3-6-8Zm0 0 6 8"/>',
    'subject-sport':
        '<circle class="duo" cx="15" cy="4" r="2"/><circle cx="15" cy="4" r="2"/><path d="m4 10 5-3 5 2 3 4h4M9 7l-1 7 5 3-1 5M8 14l-5 6m10-10-2 4"/>',
    'subject-civic':
        '<path class="duo" d="m3 9 3 7H0Zm15 0 3 7h-6Z"/><path d="M12 3v17m-5 1h10M4 7h16M3 15l3-8 3 8a5 5 0 0 1-6 0Zm12 0 3-8 3 8a5 5 0 0 1-6 0Z"/>',
    'subject-defense':
        '<path class="duo" d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm0 5 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 10.5l3.5-.5Z"/>',
    'subject-music':
        '<path class="duo" d="m9 5 11-3v5L9 10Z"/><path d="M9 17V5l11-3v12M9 10l11-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="15" rx="3" ry="3"/>',
    'subject-art':
        '<path class="duo" d="M12 3a9 9 0 1 0 0 18c2 0 3-1 2-3s0-3 2-3h2c5 0 4-12-6-12Z"/><path d="M12 3a9 9 0 1 0 0 18c2 0 3-1 2-3s0-3 2-3h2c5 0 4-12-6-12Z"/><circle cx="7" cy="10" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="6" cy="15" r="1"/>',
    'subject-local':
        '<path class="duo" d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
} as const;
export type PrototypeIconName = keyof typeof prototypeGlyphs;
