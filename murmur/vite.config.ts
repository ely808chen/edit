import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apiDevPlugin } from './vite-api-plugin.ts';

export default defineConfig({
  root: 'app',
  publicDir: 'public',
  plugins: [react(), apiDevPlugin()],
  css: { postcss: { plugins: [] } },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
