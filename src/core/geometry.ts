import type { Zone } from '../types';

/**
 * Попадание точки в зону. Координаты в %: x — от ширины, y — от высоты.
 * aspect = высота / ширина картинки (нужно, чтобы круг был кругом, а не эллипсом).
 */
export function pointInZone(x: number, y: number, zone: Zone, aspect: number): boolean {
  if (zone.kind === 'circle') {
    const dx = x - zone.cx;
    const dy = (y - zone.cy) * aspect; // перевод % высоты в % ширины
    return dx * dx + dy * dy <= zone.r * zone.r;
  }
  return pointInPolygon(x, y, zone.points);
}

export function pointInPolygon(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Id зоны, в которую попала точка (первая подходящая), или null. */
export function hitZone(x: number, y: number, zones: Zone[], aspect: number): string | null {
  for (const z of zones) if (pointInZone(x, y, z, aspect)) return z.id;
  return null;
}
