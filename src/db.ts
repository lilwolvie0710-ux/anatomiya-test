import Dexie, { type Table } from 'dexie';
import type { Answer, EncryptedTestFile, Profile, Question, ResultPayload, TestPayload, Violation } from './types';

/** Попытка тренировки или экзамена (для статистики студента). */
export interface Attempt {
  id?: number;
  kind: 'training' | 'exam';
  startedAt: number;
  finishedAt: number;
  topics: number[];
  total: number;
  /** Сумма баллов за вопросы (0…total). */
  correct: number;
  grade?: number;
  testId?: string;
  /** Для экзамена — строка QR, чтобы можно было показать её снова. */
  qr?: string;
}

/** Ответ на отдельный вопрос (для слабых тем). */
export interface QuestionLog {
  id?: number;
  attemptId: number;
  questionId: string;
  topic: number;
  score: number;
  at: number;
}

/** Текущий экзамен — сохраняется после каждого действия, чтобы пережить перезагрузку. */
export interface ExamSession {
  id: 'current';
  file: EncryptedTestFile;
  /** Код храним, чтобы расшифровать файл после перезагрузки. */
  code: string;
  testId: string;
  startedAt: number;
  endsAt: number;
  /** Индексы вопросов в файле, в порядке показа. */
  order: number[];
  /** Перестановки вариантов для каждого показанного вопроса (по позиции в order). */
  optionOrders: number[][];
  answers: Answer[];
  current: number;
  violations: Violation[];
  /** Сколько нарушений уже засчитано в счётчик уходов. */
  strikes: number;
  lastBeat: number;
  finished?: boolean;
  resultQr?: string;
}

export interface KV {
  key: string;
  value: unknown;
}

// ---------- преподаватель ----------
export interface TeacherTest {
  testId: string;
  title: string;
  code: string;
  createdAt: number;
  payload: TestPayload;
  file: EncryptedTestFile;
}

export interface JournalEntry {
  id?: number;
  /** sha256 от строки QR — защита от повторного сканирования. */
  hash: string;
  testId: string;
  testTitle?: string;
  fullName: string;
  group: string;
  faculty: string;
  startedAt: number;
  finishedAt: number;
  percent: number;
  grade: number;
  /** Балл, который посчитал телефон студента (для сравнения). */
  claimedGrade: number;
  violations: [string, number][];
  answers: Answer[];
  order: number[];
  status: 'ok' | 'bad-signature' | 'unknown-test' | 'mismatch';
  scannedAt: number;
  raw: ResultPayload;
}

export interface MyQuestion {
  id: string;
  q: Question;
  importedAt: number;
}

class AppDB extends Dexie {
  kv!: Table<KV, string>;
  attempts!: Table<Attempt, number>;
  qlog!: Table<QuestionLog, number>;
  exam!: Table<ExamSession, string>;
  tests!: Table<TeacherTest, string>;
  journal!: Table<JournalEntry, number>;
  myQuestions!: Table<MyQuestion, string>;

  constructor() {
    super('anatomiya-test');
    this.version(1).stores({
      kv: 'key',
      attempts: '++id, kind, startedAt',
      qlog: '++id, attemptId, questionId, topic',
      exam: 'id',
      tests: 'testId, createdAt',
      journal: '++id, &hash, testId, group, finishedAt',
      myQuestions: 'id',
    });
  }
}

export const db = new AppDB();

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}
export async function setKV(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export async function getProfile(): Promise<Profile | null> {
  return getKV<Profile | null>('profile', null);
}
