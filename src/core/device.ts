export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return false;
    return true;
  } catch {
    return false;
  }
}

export function isFullscreen(): boolean {
  const d = document as Document & { webkitFullscreenElement?: Element };
  return !!(document.fullscreenElement || d.webkitFullscreenElement);
}

export async function exitFullscreen(): Promise<void> {
  try {
    if (isFullscreen()) await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

type WakeLockSentinelLike = { release: () => Promise<void> };
let wakeLock: WakeLockSentinelLike | null = null;

/** Не даём экрану погаснуть: блокировка экрана выглядела бы как уход из приложения. */
export async function keepAwake(): Promise<void> {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (wl) wakeLock = await wl.request('screen');
  } catch {
    /* не поддерживается или отказано */
  }
}

export async function releaseAwake(): Promise<void> {
  try {
    await wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

/** Скачать/поделиться файлом. На телефоне — системное меню «Поделиться» (например, сразу в Telegram). */
export async function shareOrDownload(filename: string, content: string | Blob, mime = 'application/json'): Promise<void> {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const file = new File([blob], filename, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if ((isIOS() || isAndroid()) && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}
