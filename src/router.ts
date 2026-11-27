import { useEffect, useState } from 'react';

// Hash-маршруты: на GitHub Pages не ломаются при перезагрузке страницы.
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function navigate(path: string, replace = false): void {
  const url = '#' + path;
  if (replace) window.location.replace(url);
  else window.location.hash = path;
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}
