// Общий формат Excel-шаблона вопросов (используется make-template и xlsx-to-json).

export const COLUMNS = [
  'id',
  'topic',
  'type',
  'status',
  'examOnly',
  'prompt_uz',
  'prompt_ru',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'correct',
  'explanation_uz',
  'explanation_ru',
  'image',
  'extra_json',
];

export const INSTRUCTIONS = [
  ['Столбец', 'Что писать (RU)', 'Nima yoziladi (UZ)'],
  ['id', 'Уникальный код, например t03-101. Не меняйте после утверждения.', 'Noyob kod, masalan t03-101.'],
  ['topic', 'Номер темы 1–15 по силлабусу.', 'Sillabus bo‘yicha mavzu raqami 1–15.'],
  ['type', 'single, multi, truefalse, latin, matching, ordering, cloze, hotspot, labels', '—'],
  ['status', 'draft или approved. В экзамен попадают только approved.', 'draft yoki approved. Imtihonga faqat approved tushadi.'],
  ['examOnly', '1 — только для экзамена (не показывать в тренировке).', '1 — faqat imtihon uchun.'],
  ['prompt_uz / prompt_ru', 'Текст вопроса. Для cloze — текст с пропусками {{1}}, {{2}}.', 'Savol matni. cloze uchun — {{1}}, {{2}} bo‘sh joylar bilan.'],
  ['A…F', 'single/multi: варианты. Латынь — как есть, перевод — «uz || ru». matching: «левое => правое». ordering: элементы в ПРАВИЛЬНОМ порядке.', 'single/multi: variantlar. matching: «chap => o‘ng». ordering: TO‘G‘RI tartibda.'],
  ['correct', 'single: B; multi: A,C; truefalse: верно/неверно (1/0); latin: варианты через «;»; cloze: «вар1;вар2 | вар1» (| разделяет пропуски); hotspot: id зон через запятую.', 'single: B; multi: A,C; truefalse: 1/0; latin: «;» bilan; cloze: «|» bilan.'],
  ['explanation_uz / _ru', 'Короткое объяснение для тренировки.', 'Mashq uchun qisqa izoh.'],
  ['image', 'Id картинки из приложения (например gray82-thoracic) — для hotspot и labels.', 'Rasm id si (hotspot va labels uchun).'],
  ['extra_json', 'Для hotspot/labels: JSON из «Редактора зон» (zones или targets).', 'hotspot/labels uchun: «Zonalar muharriri»dan JSON.'],
];

export const EXAMPLES = [
  ['my-001', 1, 'single', 'draft', '', 'Odamda nechta bo‘yin umurtqasi bor?', 'Сколько шейных позвонков у человека?', '5', '7', '12', '4', '', '', 'B', 'C1–C7.', 'C1–C7.', '', ''],
  ['my-002', 1, 'multi', 'draft', '', 'Qaysilari yassi suyaklar?', 'Какие кости плоские?', 'os parietale', 'sternum', 'femur', 'scapula', '', '', 'A,B,D', '', '', '', ''],
  ['my-003', 1, 'truefalse', 'draft', '', 'Atlantda tish bor.', 'У атланта есть зуб.', '', '', '', '', '', '', 'неверно', 'Tish — axisda.', 'Зуб — у осевого позвонка.', '', ''],
  ['my-004', 1, 'latin', 'draft', '', 'Lotincha yozing: o‘tkir o‘simta', 'Напишите по-латыни: остистый отросток', '', '', '', '', '', '', 'processus spinosus', '', '', '', ''],
  ['my-005', 1, 'matching', 'draft', '', 'Moslang', 'Сопоставьте', 'medialis => o‘rta tekislikka yaqin || ближе к срединной плоскости', 'lateralis => o‘rta tekislikdan uzoq || дальше от срединной плоскости', '', '', '', '', '', '', '', '', ''],
  ['my-006', 1, 'ordering', 'draft', '', 'Yuqoridan pastga tartiblang', 'Расположите сверху вниз', 'vertebrae cervicales', 'vertebrae thoracicae', 'vertebrae lumbales', 'os sacrum', 'os coccygis', '', '', '', '', '', ''],
  ['my-007', 1, 'cloze', 'draft', '', 'I bo‘yin umurtqasi {{1}}, II — {{2}}.', 'I шейный позвонок — {{1}}, II — {{2}}.', '', '', '', '', '', '', 'atlas | axis;epistropheus', '', '', '', ''],
  ['my-008', 1, 'hotspot', 'draft', '', 'Umurtqa teshigini toping', 'Найдите позвоночное отверстие', '', '', '', '', '', '', 'z1', '', '', 'gray82-thoracic', '{"zones":[{"id":"z1","kind":"circle","cx":50.2,"cy":49.8,"r":8}]}'],
];
