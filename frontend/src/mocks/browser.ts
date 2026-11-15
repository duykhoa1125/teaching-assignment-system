import { setupWorker } from 'msw/browser';
import { handlers } from './handlers/index.ts';
export const worker = setupWorker(...handlers);

export async function startMocking() {
    await worker.start({
        onUnhandledFrame: 'bypass',
        quiet: true,
        serviceWorker: { url: '/mockServiceWorker.js' },
    });
}
