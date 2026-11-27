import { useEffect, useState } from 'react';
import type { Lang } from './types';

// Язык и тема — удобство конкретного устройства, храним в localStorage (с защитой от ошибок).
export interface UiSettings {
  lang: Lang;
  theme: 'dark' | 'light';
}

const KEY = 'ui-settings';
const DEFAULTS: UiSettings = { lang: 'uz', theme: 'dark' };

function load(): UiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UiSettings>) };
  } catch {
    /* приватный режим и т.п. */
  }
  return DEFAULTS;
}

let state = load();
const listeners = new Set<(s: UiSettings) => void>();

export function setUiSettings(patch: Partial<UiSettings>): void {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(state));
}

export function useUiSettings(): UiSettings {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}
