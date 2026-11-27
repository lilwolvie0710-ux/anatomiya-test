import type { Question } from '../types';
import { imageAspect } from './images';
import { TOPICS, type Topic } from './topics';

// Все файлы банка: src/content/bank/topic-XX.json
const modules = import.meta.glob<{ default: Question[] }>('./bank/*.json', { eager: true });

/** Включать ли черновики в тренировку. Перед выпуском поставьте false. */
export const TRAINING_INCLUDE_DRAFTS = true;

export const BANK: Question[] = Object.values(modules)
  .flatMap((m) => m.default)
  .map(withAspect);

export function withAspect(q: Question): Question {
  if (q.type === 'hotspot' && q.aspect === undefined) {
    const a = imageAspect(q.image);
    if (a) return { ...q, aspect: a };
  }
  return q;
}

/** Темы, по которым в банке есть вопросы (остальные скрыты, пока не наполнены). */
export function activeTopics(extraTopicIds: number[] = []): Topic[] {
  const ids = new Set([...BANK.map((q) => q.topic), ...extraTopicIds]);
  return TOPICS.filter((t) => ids.has(t.id));
}

export function questionsForTraining(topics: number[]): Question[] {
  return BANK.filter(
    (q) => topics.includes(q.topic) && !q.examOnly && (TRAINING_INCLUDE_DRAFTS || q.status === 'approved'),
  );
}

export function countByTopic(): Map<number, { total: number; approved: number }> {
  const m = new Map<number, { total: number; approved: number }>();
  for (const q of BANK) {
    const c = m.get(q.topic) ?? { total: 0, approved: 0 };
    c.total++;
    if (q.status === 'approved') c.approved++;
    m.set(q.topic, c);
  }
  return m;
}
