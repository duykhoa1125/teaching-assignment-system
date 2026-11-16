import { setupWorker } from 'msw/browser';
import { handlers } from './handlers/index.ts';
import { preparationHandlers } from './handlers/preparation.ts';
import { assignmentHandlers } from './handlers/assignment.ts';
export const worker = setupWorker(
    ...assignmentHandlers,
    ...preparationHandlers,
    ...handlers,
);

export async function startMocking() {
    await worker.start({
        onUnhandledFrame: 'bypass',
        quiet: true,
        serviceWorker: { url: '/mockServiceWorker.js' },
    });
}
