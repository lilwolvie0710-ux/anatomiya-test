// Криптостойкое перемешивание (Фишер — Йетс).

export function randInt(n: number): number {
  const buf = new Uint32Array(1);
  // отбрасываем «хвост», чтобы не было смещения
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Перестановка индексов 0…n-1. */
export function permutation(n: number): number[] {
  return shuffled(Array.from({ length: n }, (_, i) => i));
}

/** Перестановка, гарантированно отличная от тождественной (для «расставь по порядку»). */
export function derangedPermutation(n: number): number[] {
  if (n < 2) return permutation(n);
  for (let k = 0; k < 20; k++) {
    const p = permutation(n);
    if (p.some((v, i) => v !== i)) return p;
  }
  return [...Array(n).keys()].reverse();
}

export function randomId(prefix = ''): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return prefix + [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 8).toUpperCase();
}
