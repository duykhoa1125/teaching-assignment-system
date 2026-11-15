import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử gốc của ứng dụng.');

createRoot(root).render(
    <StrictMode>
        <AppProviders>
            <AppRouter />
        </AppProviders>
    </StrictMode>,
);
