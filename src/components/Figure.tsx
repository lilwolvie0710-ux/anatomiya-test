import { forwardRef, type ReactNode } from 'react';
import { imageInfo, imageSrc } from '../content/images';
import type { MaskRect } from '../types';

interface Props {
  image: string;
  /** Дополнительные маски (например, из редактора зон). */
  masks?: MaskRect[];
  children?: ReactNode;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
}

/** Картинка с масками поверх напечатанных подписей и слоем для разметки (координаты в %). */
export const Figure = forwardRef<HTMLDivElement, Props>(function Figure(
  { image, masks, children, onPointerDown, className },
  ref,
) {
  const info = imageInfo(image);
  const allMasks = [...(info?.masks ?? []), ...(masks ?? [])];
  const tall = info ? info.height / info.width > 1.6 : false;
  return (
    <div className={'figure' + (tall ? ' tall' : '') + (className ? ' ' + className : '')}>
      <div ref={ref} style={{ position: 'relative', width: tall ? 'fit-content' : '100%', margin: '0 auto' }} onPointerDown={onPointerDown}>
        <img src={imageSrc(image)} alt="" draggable={false} />
        {allMasks.map((m, i) => (
          <div key={i} className="mask" style={{ left: m.x + '%', top: m.y + '%', width: m.w + '%', height: m.h + '%' }} />
        ))}
        <div className="layer">{children}</div>
      </div>
    </div>
  );
});

/** Перевод координат указателя в % от размера элемента. */
export function pointerToPct(e: { clientX: number; clientY: number }, el: HTMLElement): [number, number] {
  const r = el.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100;
  const y = ((e.clientY - r.top) / r.height) * 100;
  return [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
}
