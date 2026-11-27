// Логика режима преподавателя: сборка теста, приём результатов, экспорт, резервная копия.
import { db, type JournalEntry, type TeacherTest } from '../db';
import { encryptTest, generateStartCode, randomBytes, sha256Hex, toB64 } from '../core/crypto';
import { decodeResult, encodeResult, verifyResult } from '../core/resultCodec';
import { gradeAnswer } from '../core/grading';
import { toGrade, DEFAULT_SCORING } from '../core/scoring';
import { shuffled, randomId } from '../core/random';
import { answerToText } from '../core/session';
import { BANK, withAspect } from '../content/bank';
import { decryptTest } from '../core/crypto';
import type { EncryptedTestFile, Lang, Question, ScoringRule, TestPayload, ViolationRules } from '../types';

export const DEFAULT_RULES: ViolationRules = {
  requireOffline: true,
  autoSubmitAt: 2,
  warn: true,
  blurGraceMs: 2000,
  onlineCounts: false,
  fullscreen: true,
};

export interface BuildOptions {
  title: string;
  topics: number[];
  count: number;
  /** Размер пула (0 — все доступные): каждый студент получает count случайных из пула. */
  pool: number;
  durationMin: number;
  rules: ViolationRules;
  scoring: ScoringRule;
  partialCredit: boolean;
  includeDrafts: boolean;
  includeMine: boolean;
}

export async function availableQuestions(opts: Pick<BuildOptions, 'topics' | 'includeDrafts' | 'includeMine'>): Promise<Question[]> {
  const mine = opts.includeMine ? (await db.myQuestions.toArray()).map((m) => m.q) : [];
  const all = [...BANK, ...mine.map(withAspect)];
  const seen = new Set<string>();
  return all.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return opts.topics.includes(q.topic) && (opts.includeDrafts || q.status === 'approved');
  });
}

export async function buildTest(opts: BuildOptions): Promise<TeacherTest> {
  const avail = await availableQuestions(opts);
  if (avail.length === 0) throw new Error('no-questions');
  const pool = opts.pool > 0 ? shuffled(avail).slice(0, Math.max(opts.pool, opts.count)) : avail;
  const testId = randomId('T');
  const payload: TestPayload = {
    testId,
    title: opts.title.trim() || 'Test',
    createdAt: Date.now(),
    durationMin: opts.durationMin,
    count: Math.min(opts.count, pool.length),
    questions: pool,
    rules: opts.rules,
    scoring: opts.scoring,
    partialCredit: opts.partialCredit,
    hmacKey: toB64(randomBytes(32)),
  };
  const code = generateStartCode();
  const file = await encryptTest(payload, code);
  const rec: TeacherTest = { testId, title: payload.title, code, createdAt: payload.createdAt, payload, file };
  await db.tests.put(rec);
  return rec;
}

/** Импорт файла теста с другого устройства (нужен код). */
export async function importTestFile(file: EncryptedTestFile, code: string): Promise<TeacherTest> {
  const payload = await decryptTest(file, code);
  const rec: TeacherTest = { testId: payload.testId, title: payload.title, code, createdAt: payload.createdAt, payload, file };
  await db.tests.put(rec);
  return rec;
}

export type ScanOutcome =
  | { kind: 'added'; entry: JournalEntry }
  | { kind: 'duplicate'; entry: JournalEntry }
  | { kind: 'invalid'; error: string };

/** Принять строку QR (или содержимое файла результата) и записать в журнал. */
export async function acceptResult(text: string): Promise<ScanOutcome> {
  let p;
  try {
    p = decodeResult(text);
  } catch {
    return { kind: 'invalid', error: 'not-a-result' };
  }
  const hash = await sha256Hex(text.trim());
  const dup = await db.journal.where('hash').equals(hash).first();
  if (dup) return { kind: 'duplicate', entry: dup };

  const test = await db.tests.get(p.t);
  let status: JournalEntry['status'] = 'unknown-test';
  let percent = p.p / 10;
  let grade = p.b / 100;
  if (test) {
    const sigOk = await verifyResult(p, test.payload.hmacKey);
    // пересчёт по ключу преподавателя — балл из QR не принимается на веру
    const qs = p.q.map((i) => test.payload.questions[i]);
    const valid = qs.every(Boolean);
    if (valid) {
      const scores = qs.map((q, k) => gradeAnswer(withAspect(q), p.a[k] ?? null, { partial: test.payload.partialCredit }));
      const fraction = scores.reduce((a, b) => a + b, 0) / Math.max(1, qs.length);
      percent = Math.round(fraction * 1000) / 10;
      grade = toGrade(fraction, test.payload.scoring, qs.length);
    }
    if (!sigOk || !valid) status = 'bad-signature';
    else if (Math.abs(grade - p.b / 100) > 0.001) status = 'mismatch';
    else status = 'ok';
  }
  const entry: JournalEntry = {
    hash,
    testId: p.t,
    testTitle: test?.title,
    fullName: p.n,
    group: p.g,
    faculty: p.f,
    startedAt: p.s * 1000,
    finishedAt: p.e * 1000,
    percent,
    grade,
    claimedGrade: p.b / 100,
    violations: p.w,
    answers: p.a,
    order: p.q,
    status,
    scannedAt: Date.now(),
    raw: p,
  };
  entry.id = await db.journal.add(entry);
  return { kind: 'added', entry };
}

/** Пересчитать записи «неизвестный тест» после импорта теста. */
export async function recheckUnknown(): Promise<number> {
  const rows = await db.journal.where('testId').anyOf((await db.tests.toArray()).map((t) => t.testId)).toArray();
  let n = 0;
  for (const r of rows) {
    if (r.status !== 'unknown-test') continue;
    await db.journal.delete(r.id!);
    const res = await acceptResult(encodeResult(r.raw));
    if (res.kind === 'added') n++;
  }
  return n;
}

// ---------- статистика ----------
export interface QuestionStat {
  index: number;
  question: Question;
  n: number;
  correctPct: number;
  wrong: { text: string; count: number }[];
}

export function questionAnalysis(test: TestPayload, rows: JournalEntry[], lang: Lang): QuestionStat[] {
  const map = new Map<number, { n: number; sum: number; wrong: Map<string, number> }>();
  for (const r of rows) {
    r.order.forEach((qi, k) => {
      const q = test.questions[qi];
      if (!q) return;
      const a = r.answers[k] ?? null;
      const s = gradeAnswer(withAspect(q), a, { partial: test.partialCredit });
      const c = map.get(qi) ?? { n: 0, sum: 0, wrong: new Map() };
      c.n++;
      c.sum += s;
      if (s < 1) {
        const key = answerToText(q, a, lang);
        c.wrong.set(key, (c.wrong.get(key) ?? 0) + 1);
      }
      map.set(qi, c);
    });
  }
  return [...map.entries()]
    .map(([index, c]) => ({
      index,
      question: test.questions[index],
      n: c.n,
      correctPct: Math.round((c.sum / c.n) * 100),
      wrong: [...c.wrong.entries()]
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    }))
    .sort((a, b) => a.correctPct - b.correctPct);
}

// ---------- экспорт ----------
const STATUS_RU: Record<JournalEntry['status'], string> = {
  ok: 'проверено',
  'bad-signature': 'ПОДПИСЬ НЕВЕРНА',
  'unknown-test': 'тест не импортирован',
  mismatch: 'балл не совпал',
};

export function journalRows(rows: JournalEntry[]): (string | number)[][] {
  const fmt = (ms: number) => new Date(ms).toLocaleString('ru-RU');
  const header = ['ФИО', 'Группа', 'Факультет', 'Тест', 'ID теста', 'Начало', 'Конец', 'Мин', 'Процент', 'Балл', 'Нарушений', 'Нарушения', 'Статус'];
  const body = rows.map((r) => [
    r.fullName,
    r.group,
    r.faculty,
    r.testTitle ?? '',
    r.testId,
    fmt(r.startedAt),
    fmt(r.finishedAt),
    Math.round((r.finishedAt - r.startedAt) / 60000),
    r.percent,
    r.grade,
    r.violations.length,
    r.violations.map(([k, s]) => `${k}@${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`).join(', '),
    STATUS_RU[r.status],
  ]);
  return [header, ...body];
}

export function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  // BOM — чтобы Excel открыл UTF-8 с кириллицей; разделитель «;» для русской локали Excel
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}

export async function toXlsx(rows: (string | number)[][], sheet = 'Jurnal'): Promise<Blob> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0].map((_, i) => ({ wch: Math.min(40, Math.max(8, ...rows.map((r) => String(r[i] ?? '').length))) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------- резервная копия ----------
export async function makeBackup(): Promise<string> {
  return JSON.stringify({
    format: 'anatomy-teacher-backup',
    v: 1,
    createdAt: Date.now(),
    journal: await db.journal.toArray(),
    tests: await db.tests.toArray(),
    myQuestions: await db.myQuestions.toArray(),
  });
}

export async function restoreBackup(text: string): Promise<{ journal: number; tests: number; questions: number }> {
  const data = JSON.parse(text) as {
    format?: string;
    journal?: JournalEntry[];
    tests?: TeacherTest[];
    myQuestions?: { id: string; q: Question; importedAt: number }[];
  };
  if (data.format !== 'anatomy-teacher-backup') throw new Error('bad-backup');
  let journal = 0;
  await db.transaction('rw', db.journal, db.tests, db.myQuestions, async () => {
    for (const e of data.journal ?? []) {
      const exists = await db.journal.where('hash').equals(e.hash).first();
      if (!exists) {
        const { id: _omit, ...rest } = e;
        void _omit;
        await db.journal.add(rest);
        journal++;
      }
    }
    await db.tests.bulkPut(data.tests ?? []);
    await db.myQuestions.bulkPut(data.myQuestions ?? []);
  });
  return { journal, tests: data.tests?.length ?? 0, questions: data.myQuestions?.length ?? 0 };
}

export { DEFAULT_SCORING };
