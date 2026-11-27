// Конвертирует Excel-шаблон вопросов в JSON.
// Использование:  npm run xlsx2json -- путь/к/файлу.xlsx [выход.json]
// По умолчанию результат пишется рядом: <имя>.json
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { validateBank } from '../src/core/validate.ts';

XLSX.set_fs(fs);

const [, , input, outArg] = process.argv;
if (!input) {
  console.error('Укажите файл: npm run xlsx2json -- savollar.xlsx');
  process.exit(1);
}

const wb = XLSX.readFile(input);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

const str = (v) => String(v ?? '').trim();
/** «uz || ru» → {uz, ru}; иначе строка (латынь). */
function text(cell) {
  const s = str(cell);
  if (s.includes('||')) {
    const [uz, ru] = s.split('||').map((x) => x.trim());
    return { uz, ru };
  }
  return s;
}
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function convert(r, line) {
  const type = str(r.type);
  const q = {
    id: str(r.id),
    topic: Number(r.topic),
    type,
    status: str(r.status) || 'draft',
    prompt: { uz: str(r.prompt_uz), ru: str(r.prompt_ru) },
  };
  if (['1', 'да', 'ha', 'true', 'yes'].includes(str(r.examOnly).toLowerCase())) q.examOnly = true;
  if (str(r.explanation_uz) || str(r.explanation_ru)) q.explanation = { uz: str(r.explanation_uz), ru: str(r.explanation_ru) };
  const cells = LETTERS.map((L) => str(r[L])).filter(Boolean);
  const correct = str(r.correct);
  const extra = str(r.extra_json) ? JSON.parse(str(r.extra_json)) : {};
  switch (type) {
    case 'single':
    case 'multi': {
      q.options = LETTERS.filter((L) => str(r[L])).map((L) => ({ id: L.toLowerCase(), text: text(r[L]) }));
      const ids = correct.split(/[,;\s]+/).filter(Boolean).map((x) => x.toLowerCase());
      q.correct = type === 'single' ? ids[0] : ids;
      break;
    }
    case 'truefalse':
      q.correct = ['1', 'true', 'верно', 'да', 'to‘g‘ri', "to'g'ri", 'ha'].includes(correct.toLowerCase());
      break;
    case 'latin':
      q.accepted = correct.split(';').map((x) => x.trim()).filter(Boolean);
      break;
    case 'matching':
      q.pairs = cells.map((c) => {
        const [l, rr] = c.split('=>');
        return { left: text(l), right: text(rr) };
      });
      break;
    case 'ordering':
      q.items = cells.map(text);
      break;
    case 'cloze':
      q.text = q.prompt;
      q.prompt = { uz: 'Tushirib qoldirilgan so‘zlarni yozing', ru: 'Впишите пропущенные слова' };
      q.blanks = correct.split('|').map((b) => b.split(';').map((x) => x.trim()).filter(Boolean));
      break;
    case 'hotspot':
      q.image = str(r.image) || extra.image;
      q.zones = extra.zones ?? [];
      q.correct = correct ? correct.split(/[,;\s]+/).filter(Boolean) : q.zones.map((z) => z.id);
      break;
    case 'labels':
      q.image = str(r.image) || extra.image;
      q.targets = extra.targets ?? [];
      if (extra.distractors) q.distractors = extra.distractors;
      break;
    default:
      throw new Error(`строка ${line}: неизвестный тип «${type}»`);
  }
  return q;
}

const out = [];
const problems = [];
rows.forEach((r, i) => {
  if (!str(r.id) && !str(r.type)) return; // пустая строка
  try {
    out.push(convert(r, i + 2));
  } catch (e) {
    problems.push(`строка ${i + 2}: ${e.message}`);
  }
});
for (const p of validateBank(out)) problems.push(`${p.id}: ${p.errors.join('; ')}`);

const outPath = outArg ?? path.join(path.dirname(input), path.basename(input, path.extname(input)) + '.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`✓ ${out.length} вопросов → ${outPath}`);
if (problems.length) {
  console.log(`⚠ Проблемы (${problems.length}):`);
  for (const p of problems) console.log('  - ' + p);
  process.exitCode = 1;
}
