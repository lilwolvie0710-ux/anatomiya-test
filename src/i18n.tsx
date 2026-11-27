import { createContext, useContext, type ReactNode } from 'react';
import type { Lang, Text } from './types';

const DICT = {
  appName: { uz: 'Anatomiya test', ru: 'Анатомия: тест' },
  student: { uz: 'Talaba', ru: 'Студент' },
  teacher: { uz: 'O‘qituvchi', ru: 'Преподаватель' },
  training: { uz: 'Mashq', ru: 'Тренировка' },
  exam: { uz: 'Imtihon', ru: 'Экзамен' },
  stats: { uz: 'Statistika', ru: 'Статистика' },
  settings: { uz: 'Sozlamalar', ru: 'Настройки' },
  sources: { uz: 'Manbalar', ru: 'Источники' },
  profile: { uz: 'Profil', ru: 'Профиль' },
  back: { uz: 'Orqaga', ru: 'Назад' },
  save: { uz: 'Saqlash', ru: 'Сохранить' },
  cancel: { uz: 'Bekor qilish', ru: 'Отмена' },
  next: { uz: 'Keyingi', ru: 'Далее' },
  prev: { uz: 'Oldingi', ru: 'Назад' },
  check: { uz: 'Tekshirish', ru: 'Проверить' },
  finish: { uz: 'Yakunlash', ru: 'Завершить' },
  start: { uz: 'Boshlash', ru: 'Начать' },
  close: { uz: 'Yopish', ru: 'Закрыть' },
  delete: { uz: 'O‘chirish', ru: 'Удалить' },
  yes: { uz: 'Ha', ru: 'Да' },
  no: { uz: 'Yo‘q', ru: 'Нет' },
  language: { uz: 'Til', ru: 'Язык' },
  theme: { uz: 'Mavzu (rang)', ru: 'Тема оформления' },
  dark: { uz: 'Qorong‘i', ru: 'Тёмная' },
  light: { uz: 'Yorug‘', ru: 'Светлая' },
  fullName: { uz: 'F.I.Sh.', ru: 'ФИО' },
  group: { uz: 'Guruh', ru: 'Группа' },
  faculty: { uz: 'Fakultet', ru: 'Факультет' },
  profileHint: {
    uz: 'Ma’lumotlar faqat shu qurilmada saqlanadi va natijaga yoziladi.',
    ru: 'Данные хранятся только на этом устройстве и попадают в результат.',
  },
  fillProfile: { uz: 'Avval profilni to‘ldiring', ru: 'Сначала заполните профиль' },
  chooseTopic: { uz: 'Mavzuni tanlang', ru: 'Выберите тему' },
  allTopics: { uz: 'Barcha mavzular', ru: 'Все темы' },
  questionsCount: { uz: 'Savollar soni', ru: 'Число вопросов' },
  noQuestions: { uz: 'Bu mavzu bo‘yicha savollar hali yo‘q', ru: 'По этой теме вопросов пока нет' },
  correct: { uz: 'To‘g‘ri!', ru: 'Верно!' },
  incorrect: { uz: 'Noto‘g‘ri', ru: 'Неверно' },
  partly: { uz: 'Qisman to‘g‘ri', ru: 'Частично верно' },
  correctAnswer: { uz: 'To‘g‘ri javob', ru: 'Правильный ответ' },
  explanation: { uz: 'Izoh', ru: 'Объяснение' },
  draft: { uz: 'qoralama', ru: 'черновик' },
  question: { uz: 'Savol', ru: 'Вопрос' },
  of: { uz: 'dan', ru: 'из' },
  result: { uz: 'Natija', ru: 'Результат' },
  trainingDone: { uz: 'Mashq tugadi', ru: 'Тренировка завершена' },
  again: { uz: 'Yana', ru: 'Ещё раз' },
  home: { uz: 'Bosh sahifa', ru: 'На главную' },
  // типы заданий
  'type.single': { uz: 'Bitta to‘g‘ri javob', ru: 'Один верный ответ' },
  'type.multi': { uz: 'Bir nechta to‘g‘ri javob', ru: 'Несколько верных ответов' },
  'type.truefalse': { uz: 'To‘g‘ri / noto‘g‘ri', ru: 'Верно / неверно' },
  'type.latin': { uz: 'Lotincha atama', ru: 'Латинский термин' },
  'type.matching': { uz: 'Moslashtirish', ru: 'Сопоставление' },
  'type.ordering': { uz: 'Tartib bilan joylang', ru: 'Расставьте по порядку' },
  'type.cloze': { uz: 'Tushirib qoldirilgan so‘z', ru: 'Вставьте пропущенное слово' },
  'type.hotspot': { uz: 'Rasmda toping', ru: 'Найдите на рисунке' },
  'type.labels': { uz: 'Yozuvlarni rasmga joylang', ru: 'Перетащите подписи на рисунок' },
  'hint.multi': { uz: 'Barcha to‘g‘ri javoblarni belgilang', ru: 'Отметьте все верные ответы' },
  'hint.latin': { uz: 'Lotin tilida yozing', ru: 'Напишите на латыни' },
  'hint.matching': {
    uz: 'Chapdagi har bir element uchun mosini tanlang',
    ru: 'Для каждого элемента слева выберите пару',
  },
  'hint.ordering': { uz: 'Strelkalar bilan tartibni o‘zgartiring', ru: 'Меняйте порядок стрелками' },
  'hint.hotspot': { uz: 'Rasmdagi kerakli joyga bosing', ru: 'Коснитесь нужного места на рисунке' },
  'hint.labels': {
    uz: 'Yozuvni tanlang, so‘ng rasmdagi nuqtaga bosing (yoki sudrang)',
    ru: 'Выберите подпись и коснитесь точки на рисунке (или перетащите)',
  },
  true: { uz: 'To‘g‘ri', ru: 'Верно' },
  false: { uz: 'Noto‘g‘ri', ru: 'Неверно' },
  choose: { uz: 'Tanlang…', ru: 'Выберите…' },
  typeHere: { uz: 'Javobni yozing', ru: 'Введите ответ' },
  // экзамен
  importTest: { uz: 'Test faylini yuklash', ru: 'Загрузить файл теста' },
  importHint: {
    uz: 'Telegram orqali kelgan .json faylni tanlang (avval “Fayllar”ga saqlang).',
    ru: 'Выберите файл .json, присланный в Telegram (сначала сохраните его в «Файлы»).',
  },
  startCode: { uz: 'Boshlash kodi', ru: 'Код старта' },
  startCodeHint: { uz: 'Kodni o‘qituvchi aytadi', ru: 'Код называет преподаватель' },
  wrongCode: { uz: 'Kod noto‘g‘ri', ru: 'Неверный код' },
  badFile: { uz: 'Bu test fayli emas', ru: 'Это не файл теста' },
  decrypting: { uz: 'Ochilmoqda…', ru: 'Открываем…' },
  testLoaded: { uz: 'Test tayyor', ru: 'Тест готов' },
  minutes: { uz: 'daqiqa', ru: 'мин' },
  goOffline: {
    uz: 'Internetni o‘chiring: Wi-Fi va mobil internet. Parvoz rejimini yoqing.',
    ru: 'Отключите интернет: Wi-Fi и мобильные данные. Включите авиарежим.',
  },
  youAreOnline: { uz: 'Qurilma hali onlayn', ru: 'Устройство ещё онлайн' },
  youAreOffline: { uz: 'Qurilma oflayn — boshlash mumkin', ru: 'Устройство офлайн — можно начинать' },
  guidedTitle: { uz: 'iPhone: “Yo‘naltirilgan kirish”ni yoqing', ru: 'iPhone: включите «Гид-доступ»' },
  guided1: {
    uz: 'Sozlamalar → Universal kirish → Yo‘naltirilgan kirish → yoqing (bir marta).',
    ru: 'Настройки → Универсальный доступ → Гид-доступ → включить (один раз).',
  },
  guided2: {
    uz: 'Shu ilovaga qayting va yon tugmani 3 marta bosing.',
    ru: 'Вернитесь в это приложение и трижды нажмите боковую кнопку.',
  },
  guided3: {
    uz: '“Boshlash”ni bosing. Kodni o‘qituvchi kiritadi.',
    ru: 'Нажмите «Начать». Код Гид-доступа вводит преподаватель.',
  },
  guided4: {
    uz: 'Test tugagach, o‘qituvchi yon tugmani 3 marta bosib, kod bilan chiqaradi.',
    ru: 'После теста преподаватель трижды нажимает боковую кнопку и выходит по коду.',
  },
  guidedDone: { uz: 'Yo‘naltirilgan kirish yoqildi', ru: 'Гид-доступ включён' },
  rulesTitle: { uz: 'Qoidalar', ru: 'Правила' },
  ruleLeave: {
    uz: 'Ilovadan chiqish — qoidabuzarlik. {n}-marta chiqilganda test avtomatik topshiriladi.',
    ru: 'Уход из приложения — нарушение. На {n}-й раз тест сдаётся автоматически.',
  },
  ruleLeaveNoAuto: { uz: 'Ilovadan chiqish qoidabuzarlik sifatida yoziladi.', ru: 'Уход из приложения записывается как нарушение.' },
  ruleOnline: { uz: 'Internet paydo bo‘lsa, qoidabuzarlik yoziladi.', ru: 'Если появится интернет, записывается нарушение.' },
  timeLeft: { uz: 'Qolgan vaqt', ru: 'Осталось' },
  answered: { uz: 'Javob berildi', ru: 'Отвечено' },
  submit: { uz: 'Testni topshirish', ru: 'Сдать тест' },
  submitConfirm: { uz: 'Testni topshirasizmi?', ru: 'Сдать тест?' },
  unanswered: { uz: 'Javobsiz savollar', ru: 'Без ответа' },
  warningTitle: { uz: 'Ogohlantirish!', ru: 'Предупреждение!' },
  warningText: {
    uz: 'Siz ilovadan chiqdingiz. Bu qoidabuzarlik sifatida yozildi. Yana takrorlansa, test avtomatik topshiriladi.',
    ru: 'Вы покинули приложение. Это записано как нарушение. При повторе тест будет сдан автоматически.',
  },
  onlineWarning: {
    uz: 'Internet paydo bo‘ldi! Qoidabuzarlik yozildi. Internetni o‘chiring.',
    ru: 'Появился интернет! Нарушение записано. Отключите интернет.',
  },
  understood: { uz: 'Tushundim', ru: 'Понятно' },
  autoSubmitted: { uz: 'Test avtomatik topshirildi', ru: 'Тест сдан автоматически' },
  timeUp: { uz: 'Vaqt tugadi', ru: 'Время вышло' },
  grade: { uz: 'Ball', ru: 'Балл' },
  percent: { uz: 'Foiz', ru: 'Процент' },
  time: { uz: 'Vaqt', ru: 'Время' },
  violations: { uz: 'Qoidabuzarliklar', ru: 'Нарушения' },
  showQr: {
    uz: 'QR-kodni o‘qituvchiga ko‘rsating',
    ru: 'Покажите QR-код преподавателю',
  },
  saveResultFile: { uz: 'Natijani fayl sifatida saqlash', ru: 'Сохранить результат файлом' },
  examInProgress: { uz: 'Davom etayotgan imtihon', ru: 'Идёт экзамен' },
  continueExam: { uz: 'Davom ettirish', ru: 'Продолжить' },
  lastResult: { uz: 'Oxirgi natija', ru: 'Последний результат' },
  // статистика
  history: { uz: 'Urinishlar tarixi', ru: 'История попыток' },
  weakTopics: { uz: 'Mavzular bo‘yicha natija', ru: 'Результат по темам' },
  progress: { uz: 'Rivojlanish', ru: 'Прогресс' },
  noData: { uz: 'Hali ma’lumot yo‘q', ru: 'Пока нет данных' },
  // источники
  sourcesIntro: {
    uz: 'Barcha rasmlar erkin litsenziyali manbalardan olingan.',
    ru: 'Все рисунки взяты из источников со свободной лицензией.',
  },
  author: { uz: 'Muallif', ru: 'Автор' },
  license: { uz: 'Litsenziya', ru: 'Лицензия' },
  source: { uz: 'Manba', ru: 'Источник' },
  changes: { uz: 'O‘zgartirishlar', ru: 'Изменения' },
  installHint: {
    uz: 'Ilovani bosh ekranga o‘rnating — u internetsiz ishlaydi.',
    ru: 'Установите приложение на главный экран — оно работает без интернета.',
  },
  offlineReady: { uz: 'Oflayn ishlashga tayyor', ru: 'Готово к работе офлайн' },
} satisfies Record<string, Record<Lang, string>>;

export type DictKey = keyof typeof DICT;

export interface I18n {
  lang: Lang;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  tr: (text: Text | undefined) => string;
}

export function makeI18n(lang: Lang): I18n {
  return {
    lang,
    t: (key, vars) => {
      let s: string = DICT[key]?.[lang] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    tr: (text) => trText(text, lang),
  };
}

export function trText(text: Text | undefined, lang: Lang): string {
  if (text === undefined) return '';
  return typeof text === 'string' ? text : text[lang] || text.ru || text.uz;
}

const Ctx = createContext<I18n>(makeI18n('uz'));

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Ctx.Provider value={makeI18n(lang)}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx);
}
