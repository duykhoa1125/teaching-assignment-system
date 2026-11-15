import { fileURLToPath, URL } from 'node:url';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { resolveDataSource } from './src/shared/config/data-source.ts';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), ['DEV_', 'VITE_']);
    const source = resolveDataSource(command, mode, env.VITE_DATA_SOURCE);
    const target = env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:8080';
    let outputDirectory = resolve('dist');
    return {
        plugins: [
            react(),
            {
                name: 'exclude-mock-worker-from-api-build',
                apply: 'build',
                configResolved(config) {
                    outputDirectory = resolve(config.root, config.build.outDir);
                },
                async closeBundle() {
                    if (source === 'api')
                        await rm(
                            resolve(outputDirectory, 'mockServiceWorker.js'),
                            { force: true },
                        );
                },
            },
        ],
        define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify(source) },
        resolve: {
            alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        server: {
            host: '127.0.0.1',
            port: 5173,
            strictPort: true,
            proxy:
                source === 'mock'
                    ? undefined
                    : {
                          '/api': { target },
                          '/v3/api-docs': { target },
                          '/swagger-ui': { target },
                      },
        },
        preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    };
});
