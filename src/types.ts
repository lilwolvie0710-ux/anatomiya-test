// Общие типы данных приложения.

export type Lang = 'uz' | 'ru';

/** Текст на двух языках. */
export interface L10n {
  uz: string;
  ru: string;
}

/** Строка — языконезависимый текст (латынь), объект — перевод на uz/ru. */
export type Text = string | L10n;

export type QType =
  | 'single'
  | 'multi'
  | 'truefalse'
  | 'latin'
  | 'matching'
  | 'ordering'
  | 'cloze'
  | 'hotspot'
  | 'labels';

export const Q_TYPES: QType[] = [
  'single',
  'multi',
  'truefalse',
  'latin',
  'matching',
  'ordering',
  'cloze',
  'hotspot',
  'labels',
];

/** Зона на рисунке. Координаты в % от ширины (x, r) и высоты (y) картинки. */
export type Zone =
  | { id: string; kind: 'circle'; cx: number; cy: number; r: number; label?: Text }
  | { id: string; kind: 'polygon'; points: [number, number][]; label?: Text };

/** Прямоугольная маска, закрывающая напечатанные подписи на рисунке (в %). */
export interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Option {
  id: string;
  text: Text;
}

interface QBase {
  id: string;
  topic: number;
  type: QType;
  status: 'draft' | 'approved';
  /** Вопрос только для экзамена: не показывается в тренировке. */
  examOnly?: boolean;
  prompt: L10n;
  explanation?: L10n;
  /** Id картинки из реестра (src/content/images.json) или data:-URL. */
  image?: string;
}

export interface SingleQ extends QBase {
  type: 'single';
  options: Option[];
  correct: string;
}
export interface MultiQ extends QBase {
  type: 'multi';
  options: Option[];
  correct: string[];
}
export interface TrueFalseQ extends QBase {
  type: 'truefalse';
  correct: boolean;
}
export interface LatinQ extends QBase {
  type: 'latin';
  /** Допустимые варианты ответа на латыни. */
  accepted: string[];
}
export interface MatchingQ extends QBase {
  type: 'matching';
  /** Пары в правильном соответствии: left[i] ↔ right[i]. */
  pairs: { left: Text; right: Text }[];
}
export interface OrderingQ extends QBase {
  type: 'ordering';
  /** Элементы в правильном порядке. */
  items: Text[];
}
export interface ClozeQ extends QBase {
  type: 'cloze';
  /** Текст с пропусками вида {{1}}, {{2}}… */
  text: L10n;
  /** Для каждого пропуска — список допустимых вариантов. */
  blanks: string[][];
}
export interface HotspotQ extends QBase {
  type: 'hotspot';
  image: string;
  zones: Zone[];
  /** Id правильной зоны (или нескольких — засчитывается попадание в любую). */
  correct: string[];
  /** Высота/ширина картинки. Заполняется автоматически из реестра картинок. */
  aspect?: number;
}
export interface LabelsQ extends QBase {
  type: 'labels';
  image: string;
  /** Точки, куда нужно перетащить подписи (в %). */
  targets: { id: string; x: number; y: number; label: Text }[];
  /** Лишние подписи-отвлекатели. */
  distractors?: Text[];
}

export type Question =
  | SingleQ
  | MultiQ
  | TrueFalseQ
  | LatinQ
  | MatchingQ
  | OrderingQ
  | ClozeQ
  | HotspotQ
  | LabelsQ;

/**
 * Ответ студента (компактная форма, она же уходит в QR):
 * single — индекс варианта; multi — массив индексов; truefalse — 1/0;
 * latin — строка; matching — для каждой левой позиции индекс правой (-1 — пусто);
 * ordering — последовательность исходных индексов; cloze — массив строк;
 * hotspot — [x, y] в десятых долях процента (0…1000); labels — индекс подписи для каждой цели (-1).
 */
export type Answer = number | number[] | string | string[] | null;

export type ScoringRule =
  | { mode: 'thresholds'; thresholds: { min: number; grade: number }[]; otherwise: number }
  | { mode: 'linear'; max: number; step: number }
  | { mode: 'points'; perQuestion: number };

export interface ViolationRules {
  /** Тест не начинается, пока устройство онлайн. */
  requireOffline: boolean;
  /** Сколько уходов со страницы приводит к автосдаче (0 — никогда). */
  autoSubmitAt: number;
  /** Показывать предупреждение при нарушениях до автосдачи. */
  warn: boolean;
  /** blur короче этого (мс) без скрытия страницы не считается. */
  blurGraceMs: number;
  /** Появление сети засчитывается в счётчик уходов (иначе только записывается). */
  onlineCounts: boolean;
  /** Android: просить полноэкранный режим и считать выход из него нарушением. */
  fullscreen: boolean;
}

export interface TestPayload {
  testId: string;
  title: string;
  createdAt: number;
  durationMin: number;
  /** Сколько вопросов получает каждый студент (≤ questions.length). */
  count: number;
  questions: Question[];
  rules: ViolationRules;
  scoring: ScoringRule;
  /** Частичный балл за multi/matching/ordering/cloze/labels. */
  partialCredit: boolean;
  /** Ключ HMAC (base64) для подписи результата. */
  hmacKey: string;
}

export interface EncryptedTestFile {
  format: 'anatomy-test';
  v: 1;
  testId: string;
  title: string;
  kdf: { alg: 'PBKDF2-SHA256'; iter: number; salt: string };
  iv: string;
  data: string;
}

export type ViolationKind = 'hidden' | 'blur' | 'pagehide' | 'online' | 'fullscreen' | 'clock' | 'reload';

export interface Violation {
  kind: ViolationKind;
  /** Время (мс, Unix). */
  at: number;
}

export interface Profile {
  fullName: string;
  group: string;
  faculty: string;
}

/** Результат экзамена в компактной форме — именно он кодируется в QR. */
export interface ResultPayload {
  v: 1;
  t: string; // testId
  n: string; // ФИО
  g: string; // группа
  f: string; // факультет
  s: number; // начало (сек, Unix)
  e: number; // конец (сек, Unix)
  q: number[]; // индексы вопросов в файле теста, в порядке показа
  a: Answer[]; // ответы, выровненные с q
  p: number; // процент ×10 (0…1000)
  b: number; // балл ×100
  w: [string, number][]; // нарушения: [код, секунды от начала]
  h?: string; // HMAC (base64url, 16 байт)
}
