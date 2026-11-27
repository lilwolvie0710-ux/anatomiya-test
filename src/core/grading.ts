import type { Answer, Question } from '../types';
import { matchesAny } from './normalize';
import { hitZone } from './geometry';

export interface GradeOptions {
  /** Частичный балл за составные задания. */
  partial?: boolean;
}

/** Есть ли ответ (для подсчёта пропусков и прогресса). */
export function isAnswered(q: Question, a: Answer): boolean {
  if (a === null || a === undefined) return false;
  switch (q.type) {
    case 'multi':
      return Array.isArray(a) && a.length > 0;
    case 'latin':
      return typeof a === 'string' && a.trim() !== '';
    case 'matching':
    case 'labels':
      return Array.isArray(a) && (a as number[]).some((v) => v >= 0);
    case 'cloze':
      return Array.isArray(a) && (a as string[]).some((v) => (v ?? '').trim() !== '');
    default:
      return true;
  }
}

/** Оценка одного ответа: 0…1. */
export function gradeAnswer(q: Question, a: Answer, opts: GradeOptions = {}): number {
  if (!isAnswered(q, a)) return 0;
  const partial = !!opts.partial;
  switch (q.type) {
    case 'single': {
      const idx = a as number;
      return q.options[idx]?.id === q.correct ? 1 : 0;
    }
    case 'multi': {
      const chosen = new Set((a as number[]).map((i) => q.options[i]?.id));
      const correct = new Set(q.correct);
      let ok = 0;
      let wrong = 0;
      for (const id of chosen) (correct.has(id) ? ok++ : wrong++);
      if (!partial) return ok === correct.size && wrong === 0 ? 1 : 0;
      // каждый неверно отмеченный вариант снимает один верный
      return Math.max(0, (ok - wrong) / correct.size);
    }
    case 'truefalse':
      return (a === 1) === q.correct ? 1 : 0;
    case 'latin':
      return matchesAny(a as string, q.accepted) ? 1 : 0;
    case 'matching': {
      const arr = a as number[];
      let ok = 0;
      q.pairs.forEach((_, i) => {
        if (arr[i] === i) ok++;
      });
      return fraction(ok, q.pairs.length, partial);
    }
    case 'ordering': {
      const arr = a as number[];
      let ok = 0;
      q.items.forEach((_, i) => {
        if (arr[i] === i) ok++;
      });
      return fraction(ok, q.items.length, partial);
    }
    case 'cloze': {
      const arr = a as string[];
      let ok = 0;
      q.blanks.forEach((acc, i) => {
        if (matchesAny(arr[i] ?? '', acc)) ok++;
      });
      return fraction(ok, q.blanks.length, partial);
    }
    case 'hotspot': {
      const [x10, y10] = a as number[];
      const hit = hitZone(x10 / 10, y10 / 10, q.zones, q.aspect ?? 1);
      return hit !== null && q.correct.includes(hit) ? 1 : 0;
    }
    case 'labels': {
      // a[i] — индекс подписи, поставленной на цель i; подпись i — правильная для цели i
      const arr = a as number[];
      let ok = 0;
      q.targets.forEach((_, i) => {
        if (arr[i] === i) ok++;
      });
      return fraction(ok, q.targets.length, partial);
    }
  }
}

function fraction(ok: number, total: number, partial: boolean): number {
  if (total === 0) return 0;
  if (partial) return ok / total;
  return ok === total ? 1 : 0;
}

/** Итог по набору ответов: доля 0…1. */
export function gradeAll(qs: Question[], answers: Answer[], opts: GradeOptions = {}): number {
  if (qs.length === 0) return 0;
  let sum = 0;
  qs.forEach((q, i) => (sum += gradeAnswer(q, answers[i] ?? null, opts)));
  return sum / qs.length;
}
