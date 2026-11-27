// Проверка структуры вопроса. Используется в приложении (импорт «моих вопросов»)
// и в скриптах scripts/*.mjs (Node запускает этот файл напрямую).
import type { Question } from '../types';

const TYPES = ['single', 'multi', 'truefalse', 'latin', 'matching', 'ordering', 'cloze', 'hotspot', 'labels'];

function isL10n(x: unknown): boolean {
  const o = x as { uz?: unknown; ru?: unknown };
  return !!o && typeof o === 'object' && typeof o.uz === 'string' && typeof o.ru === 'string' && !!o.uz && !!o.ru;
}
function isText(x: unknown): boolean {
  return (typeof x === 'string' && x.length > 0) || isL10n(x);
}

export function validateQuestion(raw: unknown): string[] {
  const e: string[] = [];
  const q = raw as Question & Record<string, unknown>;
  if (!q || typeof q !== 'object') return ['не объект'];
  if (typeof q.id !== 'string' || !q.id) e.push('нет id');
  if (!Number.isInteger(q.topic) || q.topic < 1) e.push('topic должен быть целым ≥ 1');
  if (!TYPES.includes(q.type)) e.push(`неизвестный type: ${String(q.type)}`);
  if (q.status !== 'draft' && q.status !== 'approved') e.push('status: draft | approved');
  if (!isL10n(q.prompt)) e.push('prompt должен иметь uz и ru');
  if (q.explanation !== undefined && !isL10n(q.explanation)) e.push('explanation должен иметь uz и ru');
  switch (q.type) {
    case 'single':
    case 'multi': {
      if (!Array.isArray(q.options) || q.options.length < 2) e.push('нужно ≥ 2 options');
      else {
        const ids = q.options.map((o) => o.id);
        if (new Set(ids).size !== ids.length) e.push('повторяются id вариантов');
        if (q.options.some((o) => !isText(o.text))) e.push('пустой текст варианта');
        const corr = q.type === 'single' ? [q.correct] : q.correct;
        if (!Array.isArray(corr) || corr.length === 0) e.push('нет correct');
        else if (corr.some((c) => !ids.includes(c as string))) e.push('correct ссылается на несуществующий вариант');
      }
      break;
    }
    case 'truefalse':
      if (typeof q.correct !== 'boolean') e.push('correct должен быть true/false');
      break;
    case 'latin':
      if (!Array.isArray(q.accepted) || q.accepted.length === 0) e.push('нужен accepted');
      break;
    case 'matching':
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) e.push('нужно ≥ 2 pairs');
      else if (q.pairs.some((p) => !isText(p.left) || !isText(p.right))) e.push('пустая пара');
      break;
    case 'ordering':
      if (!Array.isArray(q.items) || q.items.length < 2) e.push('нужно ≥ 2 items');
      break;
    case 'cloze': {
      if (!isL10n(q.text)) e.push('text должен иметь uz и ru');
      if (!Array.isArray(q.blanks) || q.blanks.length === 0) e.push('нужны blanks');
      else
        for (const lang of ['uz', 'ru'] as const) {
          const n = (q.text?.[lang]?.match(/\{\{\d+\}\}/g) ?? []).length;
          if (n !== q.blanks.length) e.push(`в text.${lang} ${n} пропусков, а blanks: ${q.blanks.length}`);
        }
      break;
    }
    case 'hotspot':
      if (!q.image) e.push('нужен image');
      if (!Array.isArray(q.zones) || q.zones.length === 0) e.push('нужны zones');
      else if (!Array.isArray(q.correct) || q.correct.some((c) => !q.zones.some((z) => z.id === c))) e.push('correct ссылается на несуществующую зону');
      break;
    case 'labels':
      if (!q.image) e.push('нужен image');
      if (!Array.isArray(q.targets) || q.targets.length < 2) e.push('нужно ≥ 2 targets');
      break;
  }
  return e;
}

export function validateBank(list: unknown[]): { id: string; errors: string[] }[] {
  const out: { id: string; errors: string[] }[] = [];
  const ids = new Set<string>();
  for (const raw of list) {
    const q = raw as { id?: string };
    const errors = validateQuestion(raw);
    if (q?.id && ids.has(q.id)) errors.push('повторяющийся id');
    if (q?.id) ids.add(q.id);
    if (errors.length) out.push({ id: q?.id ?? '?', errors });
  }
  return out;
}
