import type { L10n } from '../types';

export interface Topic {
  id: number;
  title: L10n;
  /** Подтемы по силлабусу. */
  summary: L10n;
}

// Темы по силлабусу HUMAN ANATOMY 1 (AN 112312), занятия M1–M15 / A1–A15.
export const TOPICS: Topic[] = [
  {
    id: 1,
    title: {
      uz: 'Anatomiyaga kirish. Umumiy osteologiya. Umurtqa pog‘onasi',
      ru: 'Введение в анатомию. Общая остеология. Позвоночный столб',
    },
    summary: {
      uz: 'Sathlar, anatomik terminologiya, suyaklarning tuzilishi, umurtqalar',
      ru: 'Плоскости, анатомическая терминология, строение костей, позвонки',
    },
  },
  {
    id: 2,
    title: { uz: 'Ko‘krak qafasi va qo‘l suyaklari', ru: 'Кости грудной клетки и верхней конечности' },
    summary: {
      uz: 'Qovurg‘alar, to‘sh suyagi, yelka kamari, qo‘lning erkin qismi',
      ru: 'Рёбра, грудина, пояс верхней конечности, свободная верхняя конечность',
    },
  },
  {
    id: 3,
    title: { uz: 'Oyoq suyaklari', ru: 'Кости нижней конечности' },
    summary: { uz: 'Oyoq kamari va oyoqning erkin qismi', ru: 'Пояс и свободная нижняя конечность' },
  },
  {
    id: 4,
    title: { uz: 'Kallaning miya qismi suyaklari', ru: 'Кости мозгового черепа' },
    summary: { uz: 'Peshona, tepa, ensa, g‘alvirsimon suyaklar', ru: 'Лобная, теменная, затылочная, решётчатая кости' },
  },
  {
    id: 5,
    title: { uz: 'Ponasimon va chakka suyaklari', ru: 'Клиновидная и височная кости' },
    summary: { uz: 'Ponasimon va chakka suyaklarining tuzilishi', ru: 'Строение клиновидной и височной костей' },
  },
  {
    id: 6,
    title: { uz: 'Kallaning yuz qismi suyaklari', ru: 'Кости лицевого черепа' },
    summary: {
      uz: 'Yuqori va pastki jag‘, yonoq, burun, tanglay, ko‘z yoshi suyaklari, pastki chig‘anoq, til osti suyagi',
      ru: 'Верхняя и нижняя челюсти, скуловая, носовая, нёбная, слёзная кости, нижняя носовая раковина, подъязычная кость',
    },
  },
  {
    id: 7,
    title: { uz: 'Butun kalla', ru: 'Череп в целом' },
    summary: {
      uz: 'Kalla gumbazi va asosi, teshiklar, kanallar, yoriqlar, yangi tug‘ilgan bola kallasi',
      ru: 'Свод и основание черепа, отверстия, каналы, щели, череп новорождённого',
    },
  },
  {
    id: 8,
    title: { uz: 'Kalla topografiyasi', ru: 'Топография черепа' },
    summary: {
      uz: 'Ko‘z kosasi, burun bo‘shlig‘i, chakka, chakka osti va qanot-tanglay chuqurchalari',
      ru: 'Глазница, полость носа, височная, подвисочная и крыловидно-нёбная ямки',
    },
  },
  {
    id: 9,
    title: { uz: 'Artrologiya. Sindesmologiya', ru: 'Артрология. Синдесмология' },
    summary: {
      uz: 'Birlashuvlar tasnifi, kalla birlashuvlari, chakka-pastki jag‘ bo‘g‘imi, tana suyaklari birlashuvi',
      ru: 'Классификация соединений, соединения черепа, ВНЧС, соединения костей туловища',
    },
  },
  {
    id: 10,
    title: { uz: 'Qo‘l va oyoq suyaklari birlashuvi', ru: 'Соединения костей конечностей' },
    summary: { uz: 'Qo‘l va oyoq bo‘g‘imlari, boylamlar', ru: 'Суставы и связки верхней и нижней конечностей' },
  },
  {
    id: 11,
    title: { uz: 'Miologiya. Orqa mushaklari', ru: 'Миология. Мышцы спины' },
    summary: {
      uz: 'Mushaklar tasnifi, orqaning yuza va chuqur mushaklari, bel-ko‘krak fassiyasi',
      ru: 'Классификация мышц, поверхностные и глубокие мышцы спины, пояснично-грудная фасция',
    },
  },
  {
    id: 12,
    title: { uz: 'Ko‘krak va qorin mushaklari. Diafragma', ru: 'Мышцы груди и живота. Диафрагма' },
    summary: {
      uz: 'Ko‘krak mushaklari, diafragma, qorin devori, chov kanali',
      ru: 'Мышцы груди, диафрагма, стенка живота, паховый канал',
    },
  },
  {
    id: 13,
    title: { uz: 'Qo‘l mushaklari', ru: 'Мышцы верхней конечности' },
    summary: {
      uz: 'Yelka kamari, yelka, bilak va kaft mushaklari, qo‘l topografiyasi',
      ru: 'Мышцы пояса, плеча, предплечья и кисти, топография',
    },
  },
  {
    id: 14,
    title: { uz: 'Oyoq mushaklari', ru: 'Мышцы нижней конечности' },
    summary: {
      uz: 'Chanoq, son, boldir va oyoq panjasi mushaklari, oyoq topografiyasi',
      ru: 'Мышцы таза, бедра, голени и стопы, топография',
    },
  },
  {
    id: 15,
    title: { uz: 'Bosh va bo‘yin mushaklari', ru: 'Мышцы головы и шеи' },
    summary: {
      uz: 'Mimika va chaynov mushaklari, bo‘yin mushaklari, bo‘yin topografiyasi',
      ru: 'Мимические и жевательные мышцы, мышцы шеи, топография шеи',
    },
  },
];

export function topicById(id: number): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
