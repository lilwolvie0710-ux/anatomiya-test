// Проверка банка вопросов src/content/bank/*.json: структура, повторы id, картинки.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateBank } from '../src/core/validate.ts';

const dir = 'src/content/bank';
const images = new Set(JSON.parse(fs.readFileSync('src/content/images.json', 'utf8')).map((i) => i.id));
let all = [];
const stats = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const list = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  all = all.concat(list);
}
const problems = validateBank(all);
for (const q of all) {
  if (q.image && !q.image.startsWith('data:') && !images.has(q.image)) problems.push({ id: q.id, errors: [`нет картинки ${q.image} в images.json`] });
  const s = (stats[q.topic] ??= { total: 0, approved: 0, types: {} });
  s.total++;
  if (q.status === 'approved') s.approved++;
  s.types[q.type] = (s.types[q.type] ?? 0) + 1;
}
for (const [t, s] of Object.entries(stats)) {
  console.log(`Тема ${t}: ${s.total} вопросов (approved ${s.approved}) — ${Object.entries(s.types).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
if (problems.length) {
  console.log(`\n⚠ Ошибки (${problems.length}):`);
  for (const p of problems) console.log(`  ${p.id}: ${p.errors.join('; ')}`);
  process.exit(1);
}
console.log('\n✓ Банк корректен');
