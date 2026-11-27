import type { Answer, Lang, Question, Text } from '../types';
import { derangedPermutation, permutation } from './random';
import { trText } from '../i18n';

/** Порядок показа для задания: варианты, правая колонка, начальный порядок, подписи. */
export function makeDisplayOrder(q: Question): number[] {
  switch (q.type) {
    case 'single':
    case 'multi':
      return permutation(q.options.length);
    case 'matching':
      return permutation(q.pairs.length);
    case 'ordering':
      return derangedPermutation(q.items.length);
    case 'labels':
      return permutation(q.targets.length + (q.distractors?.length ?? 0));
    default:
      return [];
  }
}

const tx = (t: Text, lang: Lang) => trText(t, lang);

/** Человекочитаемое представление ответа (для журнала и анализа ошибок). */
export function answerToText(q: Question, a: Answer, lang: Lang): string {
  if (a === null || a === undefined) return '—';
  switch (q.type) {
    case 'single':
      return tx(q.options[a as number]?.text ?? '?', lang);
    case 'multi':
      return (a as number[]).map((i) => tx(q.options[i]?.text ?? '?', lang)).join('; ');
    case 'truefalse':
      return a === 1 ? (lang === 'uz' ? 'To‘g‘ri' : 'Верно') : lang === 'uz' ? 'Noto‘g‘ri' : 'Неверно';
    case 'latin':
      return String(a);
    case 'matching':
      return (a as number[])
        .map((r, i) => `${tx(q.pairs[i].left, lang)} → ${r >= 0 ? tx(q.pairs[r].right, lang) : '—'}`)
        .join('; ');
    case 'ordering':
      return (a as number[]).map((i) => tx(q.items[i], lang)).join(' → ');
    case 'cloze':
      return (a as string[]).map((s) => s || '—').join('; ');
    case 'hotspot': {
      const [x, y] = a as number[];
      return `(${(x / 10).toFixed(1)}%, ${(y / 10).toFixed(1)}%)`;
    }
    case 'labels': {
      const labels = [...q.targets.map((t) => t.label), ...(q.distractors ?? [])];
      return (a as number[]).map((l, i) => `${i + 1}: ${l >= 0 ? tx(labels[l], lang) : '—'}`).join('; ');
    }
  }
}

/** Правильный ответ текстом. */
export function correctToText(q: Question, lang: Lang): string {
  switch (q.type) {
    case 'single':
      return tx(q.options.find((o) => o.id === q.correct)?.text ?? '?', lang);
    case 'multi':
      return q.options
        .filter((o) => q.correct.includes(o.id))
        .map((o) => tx(o.text, lang))
        .join('; ');
    case 'truefalse':
      return q.correct ? (lang === 'uz' ? 'To‘g‘ri' : 'Верно') : lang === 'uz' ? 'Noto‘g‘ri' : 'Неверно';
    case 'latin':
      return q.accepted.join(' / ');
    case 'matching':
      return q.pairs.map((p) => `${tx(p.left, lang)} → ${tx(p.right, lang)}`).join('; ');
    case 'ordering':
      return q.items.map((i) => tx(i, lang)).join(' → ');
    case 'cloze':
      return q.blanks.map((b) => b[0]).join('; ');
    case 'hotspot':
      return q.correct.join(', ');
    case 'labels':
      return q.targets.map((t, i) => `${i + 1}: ${tx(t.label, lang)}`).join('; ');
  }
}
