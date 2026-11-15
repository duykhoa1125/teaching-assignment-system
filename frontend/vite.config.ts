import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'DEV_');
    const target = env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:8080';
    return {
        plugins: [react()],
        resolve: {
            alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        server: {
            host: '127.0.0.1',
            port: 5173,
            strictPort: true,
            proxy: {
                '/api': { target },
                '/v3/api-docs': { target },
                '/swagger-ui': { target },
            },
        },
        preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    };
});
