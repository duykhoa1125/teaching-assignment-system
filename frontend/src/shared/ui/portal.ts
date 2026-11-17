/** Resolves the .tass-shell root for floating portals so shared shell rules still apply. */
export function getShellPortalContainer(): HTMLElement {
    return document.querySelector<HTMLElement>('.tass-shell') ?? document.body;
}
