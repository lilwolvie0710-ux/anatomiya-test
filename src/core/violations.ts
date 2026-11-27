import type { Violation, ViolationKind, ViolationRules } from '../types';
import { isFullscreen } from './device';

/** Виды нарушений, которые считаются «уходом» и идут в счётчик автосдачи. */
export const LEAVE_KINDS: ViolationKind[] = ['hidden', 'pagehide', 'blur', 'fullscreen', 'reload'];

/** События, случившиеся в пределах этого окна после засчитанного, не добавляют ещё одно нарушение. */
export const COALESCE_MS = 3000;

const BACKUP_KEY = 'exam-violation-backup';

export interface MonitorCallbacks {
  /** Нарушение записано; counted — засчитано ли в счётчик уходов. */
  onViolation: (v: Violation, counted: boolean) => void;
}

/**
 * Следит за уходом со страницы, потерей фокуса, появлением сети, выходом из полноэкранного режима
 * и скачками системных часов.
 */
export class ViolationMonitor {
  private lastCounted = 0;
  private blurTimer: number | null = null;
  private clockTimer: number | null = null;
  private wallStart = Date.now();
  private perfStart = performance.now();
  private wasFullscreen = false;
  private stopped = false;
  private readonly rules: ViolationRules;
  private readonly cb: MonitorCallbacks;

  constructor(rules: ViolationRules, cb: MonitorCallbacks) {
    this.rules = rules;
    this.cb = cb;
  }

  start(): void {
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('online', this.onOnline);
    document.addEventListener('fullscreenchange', this.onFullscreen);
    document.addEventListener('webkitfullscreenchange', this.onFullscreen);
    this.wasFullscreen = isFullscreen();
    this.clockTimer = window.setInterval(this.checkClock, 5000);
  }

  stop(): void {
    this.stopped = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('online', this.onOnline);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreen);
    if (this.blurTimer) clearTimeout(this.blurTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  /** Пометить, что полноэкранный режим включён (после повторного входа). */
  markFullscreen(): void {
    this.wasFullscreen = isFullscreen();
  }

  private record(kind: ViolationKind): void {
    if (this.stopped) return;
    const at = Date.now();
    const leave = LEAVE_KINDS.includes(kind) || (kind === 'online' && this.rules.onlineCounts);
    let counted = false;
    if (leave && at - this.lastCounted > COALESCE_MS) {
      counted = true;
      this.lastCounted = at;
    }
    const v: Violation = { kind, at };
    // синхронная резервная запись — IndexedDB может не успеть при закрытии страницы
    try {
      const prev = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]') as [Violation, boolean][];
      prev.push([v, counted]);
      localStorage.setItem(BACKUP_KEY, JSON.stringify(prev));
    } catch {
      /* ignore */
    }
    this.cb.onViolation(v, counted);
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      if (this.blurTimer) {
        clearTimeout(this.blurTimer);
        this.blurTimer = null;
      }
      this.record('hidden');
    }
  };

  private onPageHide = () => this.record('pagehide');

  private onBlur = () => {
    if (this.blurTimer) return;
    this.blurTimer = window.setTimeout(() => {
      this.blurTimer = null;
      if (!document.hasFocus() && document.visibilityState === 'visible') this.record('blur');
    }, Math.max(0, this.rules.blurGraceMs));
  };

  private onFocus = () => {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
  };

  private onOnline = () => this.record('online');

  private onFullscreen = () => {
    const fs = isFullscreen();
    if (this.rules.fullscreen && this.wasFullscreen && !fs) this.record('fullscreen');
    this.wasFullscreen = fs;
  };

  private checkClock = () => {
    const wall = Date.now() - this.wallStart;
    const perf = performance.now() - this.perfStart;
    if (Math.abs(wall - perf) > 20_000) {
      this.record('clock');
      this.wallStart = Date.now();
      this.perfStart = performance.now();
    }
  };
}

/** Забрать нарушения, записанные синхронно перед закрытием страницы. */
export function takeBackupViolations(): [Violation, boolean][] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    localStorage.removeItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as [Violation, boolean][]) : [];
  } catch {
    return [];
  }
}

export function clearBackupViolations(): void {
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

export const VIOLATION_LABEL: Record<ViolationKind, { uz: string; ru: string }> = {
  hidden: { uz: 'Ilovadan chiqish', ru: 'Уход из приложения' },
  pagehide: { uz: 'Sahifa yopildi', ru: 'Страница закрыта' },
  blur: { uz: 'Fokus yo‘qoldi', ru: 'Потеря фокуса' },
  online: { uz: 'Internet paydo bo‘ldi', ru: 'Появился интернет' },
  fullscreen: { uz: 'To‘liq ekrandan chiqish', ru: 'Выход из полноэкранного режима' },
  clock: { uz: 'Soat o‘zgartirildi', ru: 'Изменены часы устройства' },
  reload: { uz: 'Qayta yuklash', ru: 'Перезагрузка' },
};
