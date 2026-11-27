import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBank } from '../../src/core/validate';
import { gradeAnswer } from '../../src/core/grading';
import type { Question } from '../../src/types';

const dir = join(__dirname, '../../src/content/bank');
const bank: Question[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Question[]);
const images = new Set((JSON.parse(readFileSync(join(__dirname, '../../src/content/images.json'), 'utf8')) as { id: string }[]).map((i) => i.id));

/** Эталонный ответ для вопроса — должен получать 1 балл. */
function perfect(q: Question) {
  switch (q.type) {
    case 'single':
      return q.options.findIndex((o) => o.id === q.correct);
    case 'multi':
      return q.options.map((o, i) => (q.correct.includes(o.id) ? i : -1)).filter((i) => i >= 0);
    case 'truefalse':
      return q.correct ? 1 : 0;
    case 'latin':
      return q.accepted[0];
    case 'matching':
      return q.pairs.map((_, i) => i);
    case 'ordering':
      return q.items.map((_, i) => i);
    case 'cloze':
      return q.blanks.map((b) => b[0]);
    case 'labels':
      return q.targets.map((_, i) => i);
    case 'hotspot':
      return null;
  }
}

describe('банк вопросов', () => {
  it('структура корректна', () => {
    expect(validateBank(bank)).toEqual([]);
  });
  it('в каждой теме ≥ 40 вопросов и все типы', () => {
    const topics = new Set(bank.map((q) => q.topic));
    for (const t of topics) {
      const qs = bank.filter((q) => q.topic === t);
      expect(qs.length).toBeGreaterThanOrEqual(40);
      expect(new Set(qs.map((q) => q.type)).size).toBe(9);
    }
  });
  it('картинки существуют в реестре', () => {
    for (const q of bank) if (q.image) expect(images.has(q.image), q.id).toBe(true);
  });
  it('эталонный ответ получает 1 балл', () => {
    for (const q of bank) {
      const a = perfect(q);
      if (a === null) continue;
      expect(gradeAnswer(q, a), q.id).toBe(1);
    }
  });
  it('у каждого вопроса есть узбекский и русский текст', () => {
    for (const q of bank) {
      expect(q.prompt.uz.length, q.id).toBeGreaterThan(3);
      expect(q.prompt.ru.length, q.id).toBeGreaterThan(3);
    }
  });
});
