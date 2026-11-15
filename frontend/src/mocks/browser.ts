import { setupWorker } from 'msw/browser';
import { handlers } from './handlers/index.ts';
import { preparationHandlers } from './handlers/preparation.ts';
export const worker = setupWorker(...preparationHandlers, ...handlers);

export async function startMocking() {
    await worker.start({
        onUnhandledFrame: 'bypass',
        quiet: true,
        serviceWorker: { url: '/mockServiceWorker.js' },
    });
}
