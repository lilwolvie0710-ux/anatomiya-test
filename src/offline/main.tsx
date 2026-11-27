// Офлайн-версия для Telegram: один HTML-файл со всеми вопросами и картинками внутри.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OfflineApp } from './OfflineApp';
import '../styles.css';

// Картинки встраиваются в файл как data:-URL (vite.offline.config.ts отключает public/).
// imageSrc() читает их во время отрисовки, поэтому порядок импортов не важен.
const files = import.meta.glob<string>('../../public/img/*', { eager: true, query: '?inline', import: 'default' });
const inline: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.(png|jpe?g|webp)$/i, '');
  inline[id] = url;
}
(globalThis as { __INLINE_IMAGES?: Record<string, string> }).__INLINE_IMAGES = inline;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineApp />
  </StrictMode>,
);
