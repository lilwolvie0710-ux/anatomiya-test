// Создаёт Excel-шаблон для вопросов преподавателя: templates/savollar-shablon.xlsx
import * as fs from 'node:fs';
import * as XLSX from 'xlsx';
import { COLUMNS, EXAMPLES, INSTRUCTIONS } from './xlsx-format.mjs';

XLSX.set_fs(fs);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([COLUMNS, ...EXAMPLES]);
ws['!cols'] = COLUMNS.map((c) => ({ wch: ['prompt_uz', 'prompt_ru', 'A', 'B', 'extra_json'].includes(c) ? 40 : c.length < 4 ? 14 : 18 }));
ws['!freeze'] = { xSplit: 1, ySplit: 1 };
XLSX.utils.book_append_sheet(wb, ws, 'Savollar');

const help = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
help['!cols'] = [{ wch: 22 }, { wch: 90 }, { wch: 60 }];
XLSX.utils.book_append_sheet(wb, help, 'Инструкция');

fs.mkdirSync('templates', { recursive: true });
XLSX.writeFile(wb, 'templates/savollar-shablon.xlsx');
console.log('✓ templates/savollar-shablon.xlsx');
