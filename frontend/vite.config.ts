import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// During development the frontend runs on :5173 and proxies API + static asset
// requests to the Go backend on :8080, so the SPA can use same-origin paths.
const backend = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/roms': backend,
      '/covers': backend,
      '/saves': backend,
    },
  },
});
