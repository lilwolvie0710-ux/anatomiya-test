import { describe, expect, it } from 'vitest';
import { normalizeAnswer, matchesAny } from '../../src/core/normalize';
import { gradeAnswer, gradeAll } from '../../src/core/grading';
import { toGrade, DEFAULT_SCORING, THRESHOLD_SCORING } from '../../src/core/scoring';
import { encodeBase45, decodeBase45 } from '../../src/core/base45';
import {
  decryptTest,
  encryptTest,
  generateStartCode,
  hmacSign,
  hmacVerify,
  normalizeCode,
  randomBytes,
  toB64,
  WrongCodeError,
} from '../../src/core/crypto';
import { decodeResult, encodeResult, signResult, verifyResult } from '../../src/core/resultCodec';
import { pointInPolygon, pointInZone } from '../../src/core/geometry';
import type { Question, ResultPayload, TestPayload } from '../../src/types';

describe('латынь: нормализация', () => {
  it('регистр, пробелы, диакритика, лигатуры', () => {
    expect(normalizeAnswer('  Processus   SPINOSUS ')).toBe('processus spinosus');
    expect(normalizeAnswer('Vértebra prominens')).toBe('vertebra prominens');
    expect(normalizeAnswer('vertebræ')).toBe('vertebrae');
    expect(normalizeAnswer('fœtus')).toBe('foetus');
    expect(normalizeAnswer('os-coccygis.')).toBe('os coccygis');
    expect(normalizeAnswer('oʻtkir oʼsimta')).toBe('otkir osimta');
  });
  it('список допустимых вариантов', () => {
    expect(matchesAny('Atlas', ['atlas', 'vertebra cervicalis I'])).toBe(true);
    expect(matchesAny('Vertebra  Cervicalis I', ['atlas', 'vertebra cervicalis I'])).toBe(true);
    expect(matchesAny('axis', ['atlas'])).toBe(false);
    expect(matchesAny('', ['atlas'])).toBe(false);
  });
  it('опечатка — ошибка', () => {
    expect(matchesAny('processus spinosis', ['processus spinosus'])).toBe(false);
  });
});

const qSingle: Question = {
  id: 's',
  topic: 1,
  type: 'single',
  status: 'approved',
  prompt: { uz: '', ru: '' },
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  correct: 'b',
};
const qMulti: Question = {
  id: 'm',
  topic: 1,
  type: 'multi',
  status: 'approved',
  prompt: { uz: '', ru: '' },
  options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id })),
  correct: ['a', 'c'],
};
const qMatch: Question = {
  id: 'p',
  topic: 1,
  type: 'matching',
  status: 'approved',
  prompt: { uz: '', ru: '' },
  pairs: [
    { left: '1', right: 'I' },
    { left: '2', right: 'II' },
    { left: '3', right: 'III' },
    { left: '4', right: 'IV' },
  ],
};
const qHot: Question = {
  id: 'h',
  topic: 1,
  type: 'hotspot',
  status: 'approved',
  prompt: { uz: '', ru: '' },
  image: 'x',
  aspect: 2,
  zones: [
    { id: 'c', kind: 'circle', cx: 50, cy: 50, r: 10 },
    { id: 'p', kind: 'polygon', points: [[0, 0], [20, 0], [20, 20], [0, 20]] },
  ],
  correct: ['c'],
};

describe('оценка ответов', () => {
  it('один верный', () => {
    expect(gradeAnswer(qSingle, 1)).toBe(1);
    expect(gradeAnswer(qSingle, 0)).toBe(0);
    expect(gradeAnswer(qSingle, null)).toBe(0);
  });
  it('несколько верных: всё или ничего / частично', () => {
    expect(gradeAnswer(qMulti, [0, 2])).toBe(1);
    expect(gradeAnswer(qMulti, [0])).toBe(0);
    expect(gradeAnswer(qMulti, [0], { partial: true })).toBe(0.5);
    expect(gradeAnswer(qMulti, [0, 1], { partial: true })).toBe(0);
    expect(gradeAnswer(qMulti, [0, 1, 2, 3], { partial: true })).toBe(0);
  });
  it('сопоставление', () => {
    expect(gradeAnswer(qMatch, [0, 1, 2, 3])).toBe(1);
    expect(gradeAnswer(qMatch, [0, 1, 3, 2])).toBe(0);
    expect(gradeAnswer(qMatch, [0, 1, 3, 2], { partial: true })).toBe(0.5);
  });
  it('зона на рисунке с учётом пропорций', () => {
    expect(gradeAnswer(qHot, [500, 500])).toBe(1);
    // по y 4% высоты = 8% ширины при aspect 2 → внутри радиуса 10
    expect(gradeAnswer(qHot, [500, 540])).toBe(1);
    // 6% высоты = 12% ширины → снаружи
    expect(gradeAnswer(qHot, [500, 560])).toBe(0);
    expect(gradeAnswer(qHot, [100, 100])).toBe(0);
  });
  it('итог', () => {
    expect(gradeAll([qSingle, qMulti], [1, [0]])).toBe(0.5);
  });
});

describe('геометрия', () => {
  it('многоугольник', () => {
    expect(pointInPolygon(5, 5, [[0, 0], [10, 0], [10, 10], [0, 10]])).toBe(true);
    expect(pointInPolygon(15, 5, [[0, 0], [10, 0], [10, 10], [0, 10]])).toBe(false);
  });
  it('круг при aspect=1', () => {
    expect(pointInZone(10, 10, { id: 'a', kind: 'circle', cx: 10, cy: 10, r: 1 }, 1)).toBe(true);
  });
});

describe('перевод в балл', () => {
  it('по умолчанию: 0–2 с шагом 0.1', () => {
    expect(toGrade(1, DEFAULT_SCORING)).toBe(2);
    expect(toGrade(0.5, DEFAULT_SCORING)).toBe(1);
    expect(toGrade(24 / 30, DEFAULT_SCORING)).toBe(1.6);
    expect(toGrade(23 / 30, DEFAULT_SCORING)).toBe(1.5);
    expect(toGrade(0, DEFAULT_SCORING)).toBe(0);
  });
  it('пороги: ≥86 → 2, ≥56 → 1', () => {
    expect(toGrade(0.86, THRESHOLD_SCORING)).toBe(2);
    expect(toGrade(0.85, THRESHOLD_SCORING)).toBe(1);
    expect(toGrade(0.56, THRESHOLD_SCORING)).toBe(1);
    expect(toGrade(0.55, THRESHOLD_SCORING)).toBe(0);
    expect(toGrade(1, THRESHOLD_SCORING)).toBe(2);
  });
  it('линейно с шагом 0.1', () => {
    const rule = { mode: 'linear' as const, max: 2, step: 0.1 };
    expect(toGrade(0.5, rule)).toBe(1);
    expect(toGrade(0.74, rule)).toBe(1.4);
    expect(toGrade(1, rule)).toBe(2);
    expect(toGrade(0, rule)).toBe(0);
  });
  it('по 2 балла за вопрос (итоговый экзамен)', () => {
    expect(toGrade(30 / 35, { mode: 'points', perQuestion: 2 }, 35)).toBe(60);
  });
});

describe('base45', () => {
  it('туда и обратно', () => {
    const b = randomBytes(101);
    expect([...decodeBase45(encodeBase45(b))]).toEqual([...b]);
    expect(encodeBase45(new TextEncoder().encode('AB'))).toBe('BB8');
  });
});

const payload: TestPayload = {
  testId: 'T1',
  title: 'Test',
  createdAt: 0,
  durationMin: 30,
  count: 1,
  questions: [qSingle],
  rules: { requireOffline: true, autoSubmitAt: 2, warn: true, blurGraceMs: 2000, onlineCounts: false, fullscreen: true },
  scoring: DEFAULT_SCORING,
  partialCredit: false,
  hmacKey: toB64(randomBytes(32)),
};

describe('шифрование файла теста', () => {
  it('расшифровка верным кодом (регистр и дефис не важны)', async () => {
    const code = generateStartCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const file = await encryptTest(payload, code, 1000);
    expect(file.data).not.toContain('Test"');
    const back = await decryptTest(file, normalizeCode(code).toLowerCase());
    expect(back).toEqual(payload);
  });
  it('неверный код — ошибка', async () => {
    const file = await encryptTest(payload, 'AAAA-BBBB', 1000);
    await expect(decryptTest(file, 'AAAA-BBBC')).rejects.toBeInstanceOf(WrongCodeError);
  });
});

describe('подпись результата', () => {
  const res: ResultPayload = {
    v: 1,
    t: 'T1',
    n: 'Aliyev Vali',
    g: '101',
    f: 'Davolash ishi',
    s: 1000,
    e: 2000,
    q: [0],
    a: [1],
    p: 1000,
    b: 200,
    w: [['blur', 12]],
  };
  it('HMAC подписывает и проверяет', async () => {
    const sig = await hmacSign(payload.hmacKey, 'abc');
    expect(await hmacVerify(payload.hmacKey, 'abc', sig)).toBe(true);
    expect(await hmacVerify(payload.hmacKey, 'abd', sig)).toBe(false);
  });
  it('QR: кодирование и подделка', async () => {
    const signed = await signResult(res, payload.hmacKey);
    const text = encodeResult(signed);
    expect(text.startsWith('AT1:')).toBe(true);
    expect(/^[0-9A-Z $%*+\-./:]+$/.test(text)).toBe(true);
    const back = decodeResult(text);
    expect(back).toEqual(signed);
    expect(await verifyResult(back, payload.hmacKey)).toBe(true);
    // подделка балла и удаление нарушений ломают подпись
    expect(await verifyResult({ ...back, b: 200, w: [] }, payload.hmacKey)).toBe(false);
    expect(await verifyResult({ ...back, n: 'Boshqa' }, payload.hmacKey)).toBe(false);
  });
  it('мусор вместо QR', () => {
    expect(() => decodeResult('hello')).toThrow();
  });
});
