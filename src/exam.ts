// Логика экзамена на стороне студента: старт, восстановление, сдача.
import { db, type ExamSession } from './db';
import { decryptTest, isEncryptedTestFile } from './core/crypto';
import { gradeAnswer } from './core/grading';
import { toGrade } from './core/scoring';
import { decodeResult, encodeResult, signResult } from './core/resultCodec';
import { makeDisplayOrder } from './core/session';
import { permutation } from './core/random';
import { clearBackupViolations } from './core/violations';
import { withAspect } from './content/bank';
import type { EncryptedTestFile, Profile, ResultPayload, TestPayload } from './types';

let cache: { testId: string; payload: TestPayload } | null = null;

export function parseTestFile(text: string): EncryptedTestFile {
  const obj = JSON.parse(text) as unknown;
  if (!isEncryptedTestFile(obj)) throw new Error('bad-file');
  return obj;
}

export async function openTest(file: EncryptedTestFile, code: string): Promise<TestPayload> {
  if (cache && cache.testId === file.testId) return cache.payload;
  const payload = await decryptTest(file, code);
  payload.questions = payload.questions.map(withAspect);
  cache = { testId: file.testId, payload };
  return payload;
}

export async function startExam(file: EncryptedTestFile, code: string, payload: TestPayload): Promise<ExamSession> {
  const n = Math.min(payload.count, payload.questions.length);
  const order = permutation(payload.questions.length).slice(0, n);
  const now = Date.now();
  const session: ExamSession = {
    id: 'current',
    file,
    code,
    testId: payload.testId,
    startedAt: now,
    endsAt: now + payload.durationMin * 60_000,
    order,
    optionOrders: order.map((i) => makeDisplayOrder(payload.questions[i])),
    answers: order.map(() => null),
    current: 0,
    violations: [],
    strikes: 0,
    lastBeat: now,
  };
  clearBackupViolations();
  await db.exam.put(session);
  return session;
}

export interface ExamOutcome {
  fraction: number;
  grade: number;
  qr: string;
  payload: ResultPayload;
}

export async function submitExam(session: ExamSession, test: TestPayload, profile: Profile): Promise<ExamOutcome> {
  if (session.finished && session.resultQr) {
    // уже сдан (например, двойное нажатие) — повторно не считаем
    const p = decodeResult(session.resultQr);
    return { fraction: p.p / 1000, grade: p.b / 100, qr: session.resultQr, payload: p };
  }
  const qs = session.order.map((i) => test.questions[i]);
  const scores = qs.map((q, k) => gradeAnswer(q, session.answers[k] ?? null, { partial: test.partialCredit }));
  const fraction = scores.reduce((a, b) => a + b, 0) / Math.max(1, qs.length);
  const grade = toGrade(fraction, test.scoring, qs.length);
  const finishedAt = Math.min(Date.now(), session.endsAt + 5_000);
  const base: ResultPayload = {
    v: 1,
    t: test.testId,
    n: profile.fullName,
    g: profile.group,
    f: profile.faculty,
    s: Math.round(session.startedAt / 1000),
    e: Math.round(finishedAt / 1000),
    q: session.order,
    a: session.answers,
    p: Math.round(fraction * 1000),
    b: Math.round(grade * 100),
    w: session.violations.map((v) => [v.kind, Math.max(0, Math.round((v.at - session.startedAt) / 1000))]),
  };
  const signed = await signResult(base, test.hmacKey);
  const qr = encodeResult(signed);

  await db.transaction('rw', db.exam, db.attempts, db.qlog, async () => {
    await db.exam.update('current', { finished: true, resultQr: qr });
    const attemptId = await db.attempts.add({
      kind: 'exam',
      startedAt: session.startedAt,
      finishedAt,
      topics: [...new Set(qs.map((q) => q.topic))],
      total: qs.length,
      correct: scores.reduce((a, b) => a + b, 0),
      grade,
      testId: test.testId,
      qr,
    });
    await db.qlog.bulkAdd(
      qs.map((q, k) => ({ attemptId, questionId: q.id, topic: q.topic, score: scores[k], at: finishedAt })),
    );
  });
  clearBackupViolations();
  return { fraction, grade, qr, payload: signed };
}
