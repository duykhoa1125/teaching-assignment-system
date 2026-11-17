import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/styles/global.css';
import '@/app/layouts/prototype-shell.css';
import '@/styles/icon-treatment.css';
import '@/styles/icon-motion.css';
import '@/styles/table-spacing.css';
import '@/styles/dropdowns.css';
import '@/styles/filter-controls.css';
import '@/styles/status-badges.css';

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử gốc của ứng dụng.');

async function bootstrap() {
    if (import.meta.env.VITE_DATA_SOURCE === 'mock') {
        const { startMocking } = await import('@/mocks/browser');
        await startMocking();
    } else if ('serviceWorker' in navigator) {
        const hadMockController =
            navigator.serviceWorker.controller &&
            new URL(navigator.serviceWorker.controller.scriptURL).pathname ===
                '/mockServiceWorker.js';
        // A previous mock session on the same origin must not control API mode.
        for (const registration of await navigator.serviceWorker.getRegistrations()) {
            const script =
                registration.active?.scriptURL ??
                registration.waiting?.scriptURL ??
                registration.installing?.scriptURL;
            if (script && new URL(script).pathname === '/mockServiceWorker.js')
                await registration.unregister();
        }
        if (hadMockController) {
            window.location.reload();
            return;
        }
    }
    createRoot(root!).render(
        <StrictMode>
            <AppProviders>
                <AppRouter />
            </AppProviders>
        </StrictMode>,
    );
}

void bootstrap().catch(() => {
    root.textContent =
        'Không thể khởi động ứng dụng. Hãy kiểm tra cấu hình hoặc kết nối tới worker mock rồi tải lại trang.';
    root.setAttribute('role', 'alert');
});
