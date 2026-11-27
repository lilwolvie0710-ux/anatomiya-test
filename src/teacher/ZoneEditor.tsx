import { useRef, useState } from 'react';
import { Screen } from '../components/Layout';
import { IMAGES, imageInfo, imageSrc } from '../content/images';
import { BANK } from '../content/bank';
import { ZonesSvg } from '../components/QuestionView';
import { pointerToPct } from '../components/Figure';
import { shareOrDownload } from '../core/device';
import { useL } from './useL';
import type { MaskRect, Zone } from '../types';

type Tool = 'circle' | 'polygon' | 'mask' | 'target';
interface Target {
  id: string;
  x: number;
  y: number;
  label: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Уменьшаем загруженную картинку, чтобы файл теста не раздувался. */
async function fileToDataUrl(f: File, max = 1200): Promise<{ url: string; w: number; h: number }> {
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return { url: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height };
}

export function ZoneEditor() {
  const L = useL();
  const [image, setImage] = useState<string>(IMAGES[0]?.id ?? '');
  const [size, setSize] = useState<{ w: number; h: number }>({ w: IMAGES[0]?.width ?? 1, h: IMAGES[0]?.height ?? 1 });
  const [tool, setTool] = useState<Tool>('circle');
  const [zones, setZones] = useState<Zone[]>([]);
  const [masks, setMasks] = useState<MaskRect[]>(IMAGES[0]?.masks ?? []);
  const [targets, setTargets] = useState<Target[]>([]);
  const [poly, setPoly] = useState<[number, number][]>([]);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const [showMasks, setShowMasks] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const aspect = size.h / size.w;
  const nextId = (p: string, list: { id: string }[]) => {
    let i = list.length + 1;
    while (list.some((z) => z.id === p + i)) i++;
    return p + i;
  };

  const pickBuiltIn = (id: string) => {
    const info = imageInfo(id)!;
    setImage(id);
    setSize({ w: info.width, h: info.height });
    setMasks(info.masks ?? []);
    setZones([]);
    setTargets([]);
    setPoly([]);
  };

  const loadQuestion = (qid: string) => {
    const q = BANK.find((x) => x.id === qid);
    if (!q || (q.type !== 'hotspot' && q.type !== 'labels')) return;
    pickBuiltIn(q.image);
    if (q.type === 'hotspot') setZones(q.zones);
    else setTargets(q.targets.map((t) => ({ id: t.id, x: t.x, y: t.y, label: typeof t.label === 'string' ? t.label : t.label.ru })));
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const [x, y] = pointerToPct(e, ref.current);
    if (tool === 'polygon') return setPoly([...poly, [r1(x), r1(y)]]);
    if (tool === 'target') return setTargets([...targets, { id: nextId('t', targets), x: r1(x), y: r1(y), label: '' }]);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraft({ x0: x, y0: y, x, y });
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draft || !ref.current) return;
    const [x, y] = pointerToPct(e, ref.current);
    setDraft({ ...draft, x, y });
  };
  const up = () => {
    if (!draft) return;
    const { x0, y0, x, y } = draft;
    setDraft(null);
    if (tool === 'circle') {
      const r = Math.hypot(x - x0, (y - y0) * aspect);
      if (r < 0.8) return;
      setZones([...zones, { id: nextId('z', zones), kind: 'circle', cx: r1(x0), cy: r1(y0), r: r1(r) }]);
    } else if (tool === 'mask') {
      const m = { x: r1(Math.min(x0, x)), y: r1(Math.min(y0, y)), w: r1(Math.abs(x - x0)), h: r1(Math.abs(y - y0)) };
      if (m.w > 0.5 && m.h > 0.5) setMasks([...masks, m]);
    }
  };
  const closePoly = () => {
    if (poly.length >= 3) setZones([...zones, { id: nextId('z', zones), kind: 'polygon', points: poly }]);
    setPoly([]);
  };

  const output = {
    image: image.startsWith('data:') ? image : image,
    width: size.w,
    height: size.h,
    ...(zones.length ? { zones } : {}),
    ...(targets.length ? { targets } : {}),
    masks,
  };
  const json = JSON.stringify(output, null, 1);

  const draftZone: Zone | null =
    draft && tool === 'circle'
      ? { id: '_', kind: 'circle', cx: draft.x0, cy: draft.y0, r: Math.hypot(draft.x - draft.x0, (draft.y - draft.y0) * aspect) }
      : null;

  return (
    <Screen title={L('Zonalar muharriri', 'Редактор зон')} back="/teacher">
      <div className="row">
        <select className="input" value={image.startsWith('data:') ? '' : image} onChange={(e) => e.target.value && pickBuiltIn(e.target.value)}>
          <option value="">{L('Yuklangan rasm', 'Загруженная картинка')}</option>
          {IMAGES.map((i) => (
            <option key={i.id} value={i.id}>
              {i.id}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          📷
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept="image/*"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const r = await fileToDataUrl(f);
          setImage(r.url);
          setSize({ w: r.w, h: r.h });
          setMasks([]);
          setZones([]);
          setTargets([]);
        }}
      />
      <select className="input" defaultValue="" onChange={(e) => loadQuestion(e.target.value)}>
        <option value="">{L('Bankdagi savolni ochish…', 'Открыть вопрос из банка…')}</option>
        {BANK.filter((q) => q.type === 'hotspot' || q.type === 'labels').map((q) => (
          <option key={q.id} value={q.id}>
            {q.id} · {q.prompt.ru}
          </option>
        ))}
      </select>
      <div className="row wrap">
        {(['circle', 'polygon', 'mask', 'target'] as Tool[]).map((tl) => (
          <button key={tl} className={'btn small' + (tool === tl ? ' primary' : '')} onClick={() => { setTool(tl); setPoly([]); }}>
            {tl === 'circle' ? '◯ ' + L('Doira', 'Круг') : tl === 'polygon' ? '⬠ ' + L('Ko‘pburchak', 'Многоугольник') : tl === 'mask' ? '▭ ' + L('Niqob', 'Маска') : '• ' + L('Yozuv nuqtasi', 'Точка подписи')}
          </button>
        ))}
      </div>
      <p className="muted small">
        {tool === 'circle' && L('Markazdan barmoq bilan torting.', 'Ведите пальцем от центра.')}
        {tool === 'polygon' && L('Nuqtalarni bosing, so‘ng “Yopish”.', 'Ставьте точки касанием, затем «Замкнуть».')}
        {tool === 'mask' && L('Yozuvni yopish uchun to‘rtburchak torting.', 'Протяните прямоугольник поверх подписи.')}
        {tool === 'target' && L('“Yozuvlarni joylang” savoli uchun nuqtalar.', 'Точки для задания «Перетащите подписи».')}
      </p>
      <div className="figure editor-canvas">
        <div ref={ref} style={{ position: 'relative' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <img src={image.startsWith('data:') ? image : imageSrc(image)} alt="" draggable={false} style={{ display: 'block', width: '100%' }} />
          {showMasks &&
            masks.map((m, i) => (
              <div key={i} className="mask" style={{ left: m.x + '%', top: m.y + '%', width: m.w + '%', height: m.h + '%', outline: '1px dashed #f59e0b' }} />
            ))}
          {draft && tool === 'mask' && (
            <div className="mask" style={{ left: Math.min(draft.x0, draft.x) + '%', top: Math.min(draft.y0, draft.y) + '%', width: Math.abs(draft.x - draft.x0) + '%', height: Math.abs(draft.y - draft.y0) + '%', opacity: 0.7 }} />
          )}
          <ZonesSvg zones={draftZone ? [...zones, draftZone] : zones} aspect={aspect} />
          {poly.length > 0 && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <polyline points={poly.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ef4444" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {targets.map((t, i) => (
            <div key={t.id} className="target" style={{ left: t.x + '%', top: t.y + '%', pointerEvents: 'none' }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      {tool === 'polygon' && (
        <div className="row">
          <button className="btn small" disabled={!poly.length} onClick={() => setPoly(poly.slice(0, -1))}>
            ↶ {L('Nuqta', 'Точка')}
          </button>
          <button className="btn small primary" disabled={poly.length < 3} onClick={closePoly}>
            {L('Yopish', 'Замкнуть')}
          </button>
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={showMasks} onChange={(e) => setShowMasks(e.target.checked)} />
        {L('Niqoblarni ko‘rsatish', 'Показывать маски')}
      </label>

      <div className="list">
        {zones.map((z, i) => (
          <div key={z.id} className="row spread">
            <span className="small">
              {z.id} · {z.kind}
            </span>
            <button className="btn small danger" onClick={() => setZones(zones.filter((_, k) => k !== i))}>
              ✕
            </button>
          </div>
        ))}
        {targets.map((t, i) => (
          <div key={t.id} className="row">
            <b>{i + 1}</b>
            <input
              className="input"
              placeholder="lotincha nomi / латинское название"
              value={t.label}
              onChange={(e) => setTargets(targets.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
            />
            <button className="btn small danger" onClick={() => setTargets(targets.filter((_, k) => k !== i))}>
              ✕
            </button>
          </div>
        ))}
        {masks.map((m, i) => (
          <div key={'m' + i} className="row spread">
            <span className="small muted">
              {L('niqob', 'маска')} {i + 1}: {m.x},{m.y} {m.w}×{m.h}
            </span>
            <button className="btn small danger" onClick={() => setMasks(masks.filter((_, k) => k !== i))}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <pre className="code" data-testid="zones-json">{json.length > 3000 ? json.slice(0, 3000) + '\n…' : json}</pre>
      <div className="row">
        <button className="btn" style={{ flex: 1 }} onClick={() => navigator.clipboard?.writeText(json)}>
          📋 {L('Nusxa olish', 'Копировать')}
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={() => shareOrDownload('zones.json', json)}>
          💾 JSON
        </button>
      </div>
    </Screen>
  );
}
