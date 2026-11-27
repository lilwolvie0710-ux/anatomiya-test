import { useEffect, useRef, useState } from 'react';
import type {
  Answer,
  ClozeQ,
  HotspotQ,
  LabelsQ,
  LatinQ,
  MatchingQ,
  MultiQ,
  OrderingQ,
  Question,
  SingleQ,
  Text,
  TrueFalseQ,
  Zone,
} from '../types';
import { useI18n } from '../i18n';
import { matchesAny } from '../core/normalize';
import { Figure, pointerToPct } from './Figure';
import { imageAspect } from '../content/images';

export interface QProps<Q extends Question = Question> {
  q: Q;
  value: Answer;
  onChange: (a: Answer) => void;
  /** Порядок показа (перестановка исходных индексов) — для вариантов, правой колонки, подписей. */
  order?: number[];
  /** Режим проверки: показать правильные ответы, блокировать ввод. */
  reveal?: boolean;
}

function identity(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

/** Латинский текст (строка) показываем курсивом. */
function T({ text }: { text: Text }) {
  const { tr } = useI18n();
  return typeof text === 'string' ? <span className="latin">{text}</span> : <span>{tr(text)}</span>;
}

export function QuestionView(props: QProps) {
  const { t, tr } = useI18n();
  const { q } = props;
  return (
    <div className="stack" data-qtype={q.type}>
      <div className="row spread">
        <span className="badge">{t(('type.' + q.type) as 'type.single')}</span>
        {q.status === 'draft' && <span className="badge warn">{t('draft')}</span>}
      </div>
      <p className="q-prompt">{tr(q.prompt)}</p>
      {q.image && q.type !== 'hotspot' && q.type !== 'labels' && <Figure image={q.image} />}
      {renderBody(props)}
    </div>
  );
}

function renderBody(p: QProps) {
  switch (p.q.type) {
    case 'single':
      return <SingleView {...(p as QProps<SingleQ>)} />;
    case 'multi':
      return <MultiView {...(p as QProps<MultiQ>)} />;
    case 'truefalse':
      return <TrueFalseView {...(p as QProps<TrueFalseQ>)} />;
    case 'latin':
      return <LatinView {...(p as QProps<LatinQ>)} />;
    case 'matching':
      return <MatchingView {...(p as QProps<MatchingQ>)} />;
    case 'ordering':
      return <OrderingView {...(p as QProps<OrderingQ>)} />;
    case 'cloze':
      return <ClozeView {...(p as QProps<ClozeQ>)} />;
    case 'hotspot':
      return <HotspotView {...(p as QProps<HotspotQ>)} />;
    case 'labels':
      return <LabelsView {...(p as QProps<LabelsQ>)} />;
  }
}

// ---------- один верный ----------
function SingleView({ q, value, onChange, order, reveal }: QProps<SingleQ>) {
  const ord = order ?? identity(q.options.length);
  return (
    <div className="opts" role="radiogroup">
      {ord.map((i, k) => {
        const o = q.options[i];
        const sel = value === i;
        let cls = 'opt' + (sel ? ' selected' : '');
        if (reveal) {
          if (o.id === q.correct) cls += ' correct';
          else if (sel) cls += ' wrong';
        }
        return (
          <button key={o.id} className={cls} disabled={reveal} role="radio" aria-checked={sel} onClick={() => onChange(i)}>
            <span className="mark">{String.fromCharCode(65 + k)}</span>
            <T text={o.text} />
          </button>
        );
      })}
    </div>
  );
}

// ---------- несколько верных ----------
function MultiView({ q, value, onChange, order, reveal }: QProps<MultiQ>) {
  const { t } = useI18n();
  const ord = order ?? identity(q.options.length);
  const chosen = new Set(Array.isArray(value) ? (value as number[]) : []);
  const toggle = (i: number) => {
    const s = new Set(chosen);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    onChange(s.size ? [...s].sort((a, b) => a - b) : null);
  };
  return (
    <>
      <div className="q-hint">{t('hint.multi')}</div>
      <div className="opts">
        {ord.map((i) => {
          const o = q.options[i];
          const sel = chosen.has(i);
          const isCorrect = q.correct.includes(o.id);
          let cls = 'opt multi' + (sel ? ' selected' : '');
          if (reveal) {
            if (isCorrect) cls += ' correct';
            else if (sel) cls += ' wrong';
          }
          return (
            <button key={o.id} className={cls} disabled={reveal} role="checkbox" aria-checked={sel} onClick={() => toggle(i)}>
              <span className="mark">{sel ? '✓' : ''}</span>
              <T text={o.text} />
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------- верно / неверно ----------
function TrueFalseView({ q, value, onChange, reveal }: QProps<TrueFalseQ>) {
  const { t } = useI18n();
  const btn = (v: 1 | 0, label: string) => {
    const sel = value === v;
    let cls = 'opt' + (sel ? ' selected' : '');
    if (reveal) {
      if ((v === 1) === q.correct) cls += ' correct';
      else if (sel) cls += ' wrong';
    }
    return (
      <button className={cls} disabled={reveal} onClick={() => onChange(v)} aria-pressed={sel}>
        {label}
      </button>
    );
  };
  return (
    <div className="tf">
      {btn(1, t('true'))}
      {btn(0, t('false'))}
    </div>
  );
}

// ---------- латинский термин ----------
function LatinView({ q, value, onChange, reveal }: QProps<LatinQ>) {
  const { t } = useI18n();
  const v = typeof value === 'string' ? value : '';
  const ok = reveal && matchesAny(v, q.accepted);
  return (
    <div className="stack">
      <div className="q-hint">{t('hint.latin')}</div>
      <input
        className={'input latin' + (reveal ? (ok ? ' correct' : ' wrong') : '')}
        style={reveal ? { borderColor: ok ? 'var(--ok)' : 'var(--bad)' } : undefined}
        value={v}
        disabled={reveal}
        placeholder={t('typeHere')}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        lang="la"
        onChange={(e) => onChange(e.target.value || null)}
      />
      {reveal && !ok && (
        <div>
          {t('correctAnswer')}: <span className="latin">{q.accepted[0]}</span>
        </div>
      )}
    </div>
  );
}

// ---------- сопоставление ----------
function MatchingView({ q, value, onChange, order, reveal }: QProps<MatchingQ>) {
  const { t, tr } = useI18n();
  const n = q.pairs.length;
  const ord = order ?? identity(n);
  const arr = Array.isArray(value) ? (value as number[]) : Array(n).fill(-1);
  const set = (left: number, right: number) => {
    const next = [...arr];
    // одна правая позиция — только одной левой
    for (let i = 0; i < n; i++) if (next[i] === right) next[i] = -1;
    next[left] = right;
    onChange(next.some((x) => x >= 0) ? next : null);
  };
  const label = (x: Text) => (typeof x === 'string' ? x : tr(x));
  return (
    <div className="stack">
      <div className="q-hint">{t('hint.matching')}</div>
      {q.pairs.map((p, i) => {
        const cur = arr[i] ?? -1;
        const cls = 'match-row' + (reveal ? (cur === i ? ' correct' : ' wrong') : '');
        return (
          <div key={i} className={cls}>
            <div style={{ fontWeight: 700 }}>
              {i + 1}. <T text={p.left} />
            </div>
            <select
              className="input"
              value={cur}
              disabled={reveal}
              aria-label={label(p.left)}
              onChange={(e) => set(i, Number(e.target.value))}
            >
              <option value={-1}>{t('choose')}</option>
              {ord.map((j) => (
                <option key={j} value={j}>
                  {label(q.pairs[j].right)}
                </option>
              ))}
            </select>
            {reveal && cur !== i && (
              <div className="small">
                {t('correctAnswer')}: <T text={p.right} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- расставить по порядку ----------
function OrderingView({ q, value, onChange, order, reveal }: QProps<OrderingQ>) {
  const { t } = useI18n();
  const n = q.items.length;
  const initial = order ?? identity(n).reverse();
  const seq = Array.isArray(value) && (value as number[]).length === n ? (value as number[]) : initial;
  const touched = Array.isArray(value);
  const move = (pos: number, dir: -1 | 1) => {
    const np = pos + dir;
    if (np < 0 || np >= n) return;
    const next = [...seq];
    [next[pos], next[np]] = [next[np], next[pos]];
    onChange(next);
  };
  return (
    <div className="stack">
      <div className="q-hint">{t('hint.ordering')}</div>
      {seq.map((idx, pos) => {
        const cls = 'order-item' + (reveal ? (idx === pos ? ' correct' : ' wrong') : '');
        return (
          <div key={idx} className={cls}>
            <span className="num">{pos + 1}</span>
            <span className="txt">
              <T text={q.items[idx]} />
            </span>
            {!reveal && (
              <>
                <button className="btn icon small" aria-label="up" disabled={pos === 0} onClick={() => move(pos, -1)}>
                  ▲
                </button>
                <button className="btn icon small" aria-label="down" disabled={pos === n - 1} onClick={() => move(pos, 1)}>
                  ▼
                </button>
              </>
            )}
          </div>
        );
      })}
      {!reveal && !touched && (
        <button className="btn small" onClick={() => onChange([...seq])}>
          ✓ {t('save')}
        </button>
      )}
      {reveal && (
        <div className="small">
          {t('correctAnswer')}:{' '}
          {q.items.map((it, i) => (
            <span key={i}>
              {i > 0 && ' → '}
              <T text={it} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- пропущенное слово ----------
function ClozeView({ q, value, onChange, reveal }: QProps<ClozeQ>) {
  const { t, tr } = useI18n();
  const n = q.blanks.length;
  const arr = Array.isArray(value) ? (value as string[]) : Array(n).fill('');
  const parts = tr(q.text).split(/(\{\{\d+\}\})/);
  const set = (i: number, v: string) => {
    const next = [...arr];
    next[i] = v;
    onChange(next.some((x) => x.trim()) ? next : null);
  };
  return (
    <div className="stack">
      <div className="cloze">
        {parts.map((part, k) => {
          const m = part.match(/^\{\{(\d+)\}\}$/);
          if (!m) return <span key={k}>{part}</span>;
          const i = Number(m[1]) - 1;
          const ok = reveal && matchesAny(arr[i] ?? '', q.blanks[i] ?? []);
          return (
            <input
              key={k}
              className={reveal ? (ok ? 'correct' : 'wrong') : ''}
              value={arr[i] ?? ''}
              disabled={reveal}
              aria-label={`${i + 1}`}
              placeholder={`${i + 1}`}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => set(i, e.target.value)}
            />
          );
        })}
      </div>
      {reveal && (
        <div className="small">
          {t('correctAnswer')}:{' '}
          {q.blanks.map((b, i) => (
            <span key={i}>
              {i > 0 && '; '}
              {i + 1}) <span className="latin">{b[0]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- найди на рисунке ----------
export function ZonesSvg({ zones, aspect, highlight }: { zones: Zone[]; aspect: number; highlight?: string[] }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {zones.map((z) => {
        const hi = !highlight || highlight.includes(z.id);
        const style = {
          fill: hi ? 'rgba(74,222,128,0.35)' : 'rgba(250,204,21,0.25)',
          stroke: hi ? '#16a34a' : '#ca8a04',
          strokeWidth: 0.6,
          vectorEffect: 'non-scaling-stroke' as const,
        };
        if (z.kind === 'circle') return <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.r} ry={z.r / aspect} style={style} />;
        return <polygon key={z.id} points={z.points.map((p) => p.join(',')).join(' ')} style={style} />;
      })}
    </svg>
  );
}

function HotspotView({ q, value, onChange, reveal }: QProps<HotspotQ>) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const pt = Array.isArray(value) ? (value as number[]) : null;
  const aspect = q.aspect ?? imageAspect(q.image) ?? 1;
  return (
    <div className="stack">
      <div className="q-hint">{t('hint.hotspot')}</div>
      <Figure
        ref={ref}
        image={q.image}
        onPointerDown={(e) => {
          if (reveal || !ref.current) return;
          const [x, y] = pointerToPct(e, ref.current);
          onChange([Math.round(x * 10), Math.round(y * 10)]);
        }}
      >
        {reveal && <ZonesSvg zones={q.zones} aspect={aspect} highlight={q.correct} />}
        {pt && <div className="pin" style={{ left: pt[0] / 10 + '%', top: pt[1] / 10 + '%' }} />}
      </Figure>
    </div>
  );
}

// ---------- перетащить подписи ----------
function LabelsView({ q, value, onChange, order, reveal }: QProps<LabelsQ>) {
  const { t, tr } = useI18n();
  const nT = q.targets.length;
  const labels: Text[] = [...q.targets.map((x) => x.label), ...(q.distractors ?? [])];
  const ord = order ?? identity(labels.length);
  const arr = Array.isArray(value) ? (value as number[]) : Array(nT).fill(-1);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ label: number; x: number; y: number; over: number | null } | null>(null);
  const used = new Set(arr.filter((x) => x >= 0));
  const text = (x: Text) => (typeof x === 'string' ? x : tr(x));

  const place = (target: number, label: number) => {
    const next = [...arr];
    for (let i = 0; i < nT; i++) if (next[i] === label) next[i] = -1;
    next[target] = label;
    onChange(next.some((x) => x >= 0) ? next : null);
    setSelected(null);
  };
  const clear = (target: number) => {
    const next = [...arr];
    next[target] = -1;
    onChange(next.some((x) => x >= 0) ? next : null);
  };

  // актуальные значения для обработчиков, подписанных один раз на время перетаскивания
  const placeRef = useRef(place);
  placeRef.current = place;
  const dragRef = useRef(drag);
  dragRef.current = drag;

  // перетаскивание пальцем (Pointer Events)
  useEffect(() => {
    if (!drag) return;
    const targetAt = (x: number, y: number): number | null => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const tEl = el?.closest('[data-target]') as HTMLElement | null;
      return tEl ? Number(tEl.dataset.target) : null;
    };
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY) } : d));
    const up = (e: PointerEvent) => {
      const tg = targetAt(e.clientX, e.clientY);
      const d = dragRef.current;
      if (d && tg !== null) placeRef.current(tg, d.label);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  return (
    <div className="stack">
      <div className="q-hint">{t('hint.labels')}</div>
      <Figure image={q.image}>
        {q.targets.map((tg, i) => {
          const lab = arr[i];
          let cls = 'target' + (lab >= 0 ? ' filled' : '');
          if (reveal) cls += lab === i ? ' correct' : ' wrong';
          if (drag?.over === i) cls += ' drop';
          return (
            <div
              key={tg.id}
              data-target={i}
              className={cls}
              style={{ left: tg.x + '%', top: tg.y + '%' }}
              onClick={() => {
                if (reveal) return;
                if (selected !== null) place(i, selected);
                else if (lab >= 0) clear(i);
              }}
            >
              {reveal ? (lab === i ? text(labels[i]) : `${i + 1}`) : lab >= 0 ? text(labels[lab]) : i + 1}
            </div>
          );
        })}
      </Figure>
      {!reveal && (
        <div className="chips">
          {ord.map((li) => (
            <button
              key={li}
              className={'chip' + (selected === li ? ' selected' : '') + (used.has(li) ? ' used' : '')}
              onClick={() => setSelected(selected === li ? null : li)}
              onPointerDown={(e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                const sx = e.clientX;
                const sy = e.clientY;
                const startDrag = (ev: PointerEvent) => {
                  if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
                    window.removeEventListener('pointermove', startDrag);
                    setDrag({ label: li, x: ev.clientX, y: ev.clientY, over: null });
                  }
                };
                window.addEventListener('pointermove', startDrag);
                window.addEventListener('pointerup', () => window.removeEventListener('pointermove', startDrag), { once: true });
              }}
            >
              {text(labels[li])}
            </button>
          ))}
        </div>
      )}
      {reveal && (
        <ol className="small" style={{ margin: 0, paddingLeft: 22 }}>
          {q.targets.map((tg) => (
            <li key={tg.id}>
              <T text={tg.label} />
            </li>
          ))}
        </ol>
      )}
      {drag && (
        <div className="drag-ghost chip selected" style={{ left: drag.x, top: drag.y }}>
          {text(labels[drag.label])}
        </div>
      )}
    </div>
  );
}
