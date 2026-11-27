// Готовый зашифрованный файл экзамена (то же, что «Конструктор теста» в приложении).
// npm run exam -- --topics 1-8 --count 30 --minutes 40 --title "Nazorat: 1–8-mavzular" [--approved-only]
// Результат: exams/imtihon-<ID>.json (отправить студентам) и exams/imtihon-<ID>-KOD.txt (код — не публиковать).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { encryptTest, generateStartCode, randomBytes, toB64 } from '../src/core/crypto.ts';
import { randomId } from '../src/core/random.ts';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const parseTopics = (s) =>
  s.split(',').flatMap((part) => {
    const [a, b] = part.split('-').map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, k) => a + k) : [a];
  });

const topics = parseTopics(opt('topics', '1-8'));
const count = Number(opt('count', 30));
const minutes = Number(opt('minutes', 40));
const approvedOnly = args.includes('--approved-only');
const title = opt('title', `Nazorat / Контроль: ${topics[0]}–${topics.at(-1)}-mavzular`);

const images = new Map(JSON.parse(readFileSync('src/content/images.json', 'utf8')).map((i) => [i.id, i]));
const bank = readdirSync('src/content/bank')
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(`src/content/bank/${f}`, 'utf8')))
  .filter((q) => topics.includes(q.topic) && (!approvedOnly || q.status === 'approved'))
  .map((q) => (q.type === 'hotspot' && q.aspect === undefined && images.has(q.image) ? { ...q, aspect: images.get(q.image).height / images.get(q.image).width } : q));

if (bank.length < count) {
  console.error(`Недостаточно вопросов: ${bank.length} < ${count}. ${approvedOnly ? 'Отметьте вопросы как approved или уберите --approved-only.' : ''}`);
  process.exit(1);
}

const payload = {
  testId: randomId('T'),
  title,
  createdAt: Date.now(),
  durationMin: minutes,
  count,
  questions: bank, // каждый студент получает count случайных вопросов из пула
  rules: { requireOffline: true, autoSubmitAt: 2, warn: true, blurGraceMs: 2000, onlineCounts: false, fullscreen: true },
  scoring: { mode: 'linear', max: 2, step: 0.1 },
  partialCredit: false,
  hmacKey: toB64(randomBytes(32)),
};
const code = generateStartCode();
const file = await encryptTest(payload, code);

mkdirSync('exams', { recursive: true });
const base = `exams/imtihon-${payload.testId}`;
writeFileSync(`${base}.json`, JSON.stringify(file), 'utf8');
writeFileSync(
  `${base}-KOD.txt`,
  `Test: ${title}\nID: ${payload.testId}\nKod / Код старта: ${code}\nSavollar / Вопросов: ${count} из пула ${bank.length}\nVaqt / Время: ${minutes} мин\nBall / Балл: 0–2.0 (шаг 0.1)\nMavzular / Темы: ${topics.join(', ')}\n`,
  'utf8',
);
console.log(`✓ ${base}.json  (пул ${bank.length}, по ${count} вопросов, ${minutes} мин)`);
console.log(`  Код старта: ${code}`);
