import type { ScoringRule } from '../types';

/** По умолчанию: балл 0–2.0 с шагом 0.1 (доля верных × 2, вниз до десятых). */
export const DEFAULT_SCORING: ScoringRule = { mode: 'linear', max: 2, step: 0.1 };

/** Пороговая шкала (≥86% → 2, ≥56% → 1, иначе 0) — доступна в конструкторе. */
export const THRESHOLD_SCORING: ScoringRule = {
  mode: 'thresholds',
  thresholds: [
    { min: 86, grade: 2 },
    { min: 56, grade: 1 },
  ],
  otherwise: 0,
};

/** Пресет итогового экзамена по силлабусу: 35 вопросов × 2 балла. */
export const FINAL_EXAM_SCORING: ScoringRule = { mode: 'points', perQuestion: 2 };

/**
 * Перевод доли верных (0…1) в балл.
 * correctCount — сумма баллов за вопросы (нужна для режима points).
 */
export function toGrade(fraction: number, rule: ScoringRule, questionCount = 0): number {
  const pct = round(fraction * 100, 6);
  switch (rule.mode) {
    case 'thresholds': {
      const sorted = [...rule.thresholds].sort((a, b) => b.min - a.min);
      for (const t of sorted) if (pct >= t.min) return t.grade;
      return rule.otherwise;
    }
    case 'linear': {
      const raw = fraction * rule.max;
      const stepped = Math.floor(round(raw / rule.step, 6)) * rule.step;
      return round(Math.min(rule.max, Math.max(0, stepped)), 2);
    }
    case 'points':
      return round(fraction * questionCount * rule.perQuestion, 2);
  }
}

/** Максимально возможный балл. */
export function maxGrade(rule: ScoringRule, questionCount = 0): number {
  switch (rule.mode) {
    case 'thresholds':
      return Math.max(rule.otherwise, ...rule.thresholds.map((t) => t.grade));
    case 'linear':
      return rule.max;
    case 'points':
      return questionCount * rule.perQuestion;
  }
}

function round(v: number, digits: number): number {
  const k = 10 ** digits;
  return Math.round(v * k) / k;
}
