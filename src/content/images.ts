import type { MaskRect } from '../types';
import raw from './images.json';

export interface ImageInfo {
  id: string;
  file: string;
  width: number;
  height: number;
  title: string;
  author: string;
  source: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  changes?: string;
  masks?: MaskRect[];
}

export const IMAGES: ImageInfo[] = raw as ImageInfo[];

const byId = new Map(IMAGES.map((i) => [i.id, i]));

export function imageInfo(id: string | undefined): ImageInfo | undefined {
  return id ? byId.get(id) : undefined;
}

/** URL картинки: id из реестра или data:-URL (картинки из редактора зон). */
export function imageSrc(id: string): string {
  const info = byId.get(id);
  if (info) return import.meta.env.BASE_URL + info.file;
  return id;
}

export function imageAspect(id: string): number | undefined {
  const info = byId.get(id);
  return info ? info.height / info.width : undefined;
}
