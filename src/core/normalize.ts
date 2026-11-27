// Нормализация ответов для проверки латинских терминов и вставленных слов.

const LIGATURES: [RegExp, string][] = [
  [/æ/g, 'ae'],
  [/œ/g, 'oe'],
  [/ß/g, 'ss'],
];

/**
 * Приводит строку к каноническому виду:
 * регистр, диакритика, лигатуры æ/œ, дефисы, апострофы, лишние пробелы и знаки препинания.
 */
export function normalizeAnswer(input: string): string {
  let s = (input ?? '').toLowerCase().normalize('NFKD');
  // убрать диакритические знаки (комбинируемые символы)
  s = s.replace(/[̀-ͯ]/g, '');
  for (const [re, rep] of LIGATURES) s = s.replace(re, rep);
  // все виды апострофов (узбекские oʻ, gʻ) — к одному виду, затем убрать
  s = s.replace(/[‘’ʻʼ`´']/g, '');
  // дефисы, тире, точки, запятые → пробел
  s = s.replace(/[-‐-―.,;:()[\]"«»]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Совпадает ли ответ хотя бы с одним из допустимых вариантов. */
export function matchesAny(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}
