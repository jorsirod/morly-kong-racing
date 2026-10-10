import { defineConfig } from 'vite';
export default defineConfig({ server: { watch: { usePolling: true, interval: 300 }, port: 5173, proxy: { '/api': 'http://127.0.0.1:2567', '/matchmake': 'http://127.0.0.1:2567', '/game': { target: 'ws://127.0.0.1:2567', ws: true, rewrite:path=>path.replace(/^\/game/,'') } } }, build: { target: 'es2022', chunkSizeWarningLimit: 1800 } });
