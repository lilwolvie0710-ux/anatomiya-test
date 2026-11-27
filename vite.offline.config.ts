// Сборка офлайн-тренажёра в ОДИН html-файл (для отправки в Telegram).
// npm run offline  →  dist-offline/offline.html  →  docs/Anatomiya_oflayn.html
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  publicDir: false, // картинки импортируются и встраиваются как data:-URL
  plugins: [react(), viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  build: {
    outDir: 'dist-offline',
    emptyOutDir: true,
    target: 'es2019',
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: 'offline.html' },
  },
});
