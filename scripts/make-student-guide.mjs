// Создаёт единый файл для студентов: docs/Talaba_qollanma_Anatomiya.pdf (+ .html).
// Запуск: npm run guide   (адрес приложения можно передать: npm run guide -- https://...)
import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { chromium } from '@playwright/test';

const APP_URL = process.argv[2] ?? 'https://lilwolvie0710-ux.github.io/anatomiya-test/';
const qr = await QRCode.toString(APP_URL, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 });

const step = (n, uz, ru) => `<li><span class="n">${n}</span><div><p>${uz}</p><p class="ru">${ru}</p></div></li>`;
const steps = (list) => `<ol class="steps">${list.map((s, i) => step(i + 1, s[0], s[1])).join('')}</ol>`;
const section = (icon, uz, ru, body) => `<section><h2><span class="ico">${icon}</span>${uz}<span class="ru-h">${ru}</span></h2>${body}</section>`;
const two = (uz, ru) => `<p>${uz}</p><p class="ru">${ru}</p>`;

const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Anatomiya test — talaba uchun qo‘llanma</title>
<style>
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  :root { color-scheme: light; }
  html { background: #fff; }
  body { background: #fff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.38; color: #14171c; margin: 0; }
  header { display: flex; gap: 16px; align-items: center; border-bottom: 3px solid #0f766e; padding-bottom: 10px; margin-bottom: 10px; }
  header .qr { width: 118px; flex: none; }
  header h1 { font-size: 20pt; margin: 0 0 2px; color: #0f766e; }
  header .sub { font-size: 11pt; margin: 0; }
  header .url { font-family: Consolas, monospace; font-size: 10.5pt; background: #eef6f5; padding: 3px 6px; border-radius: 5px; display: inline-block; margin-top: 6px; }
  h2 { font-size: 12.5pt; margin: 12px 0 6px; padding: 5px 9px; background: #0f766e; color: #fff; border-radius: 6px; display: flex; align-items: baseline; gap: 8px; break-after: avoid; }
  h2 .ico { font-size: 12pt; }
  h2 .ru-h { font-weight: 400; font-size: 10.5pt; opacity: .9; margin-left: auto; }
  h3 { font-size: 11pt; margin: 8px 0 4px; color: #0f766e; break-after: avoid; }
  p { margin: 0 0 3px; }
  .ru { color: #475066; font-style: italic; }
  section { break-inside: auto; }
  .steps { list-style: none; padding: 0; margin: 0; }
  .steps li { display: flex; gap: 8px; margin: 0 0 5px; break-inside: avoid; }
  .steps .n { flex: none; width: 20px; height: 20px; border-radius: 50%; background: #0f766e; color: #fff; font-weight: 700; font-size: 9.5pt; display: grid; place-items: center; margin-top: 1px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .box { border: 1.5px solid #cfd6df; border-radius: 8px; padding: 8px 10px; break-inside: avoid; }
  .warn { border-color: #b45309; background: #fff7ed; }
  .ok { border-color: #15803d; background: #f0fdf4; }
  table { width: 100%; border-collapse: collapse; font-size: 9.8pt; }
  td, th { border: 1px solid #cfd6df; padding: 4px 6px; vertical-align: top; text-align: left; }
  th { background: #eef6f5; }
  .big { font-size: 11.5pt; font-weight: 700; }
  b.k { background: #eef0f4; border: 1px solid #cfd6df; border-radius: 4px; padding: 0 4px; font-weight: 600; }
  footer { margin-top: 10px; font-size: 8.5pt; color: #5b6372; border-top: 1px solid #cfd6df; padding-top: 6px; }
</style>
</head>
<body>
<header>
  <div class="qr">${qr}</div>
  <div>
    <h1>Anatomiya test</h1>
    <p class="sub"><b>Talaba uchun qo‘llanma</b> · Odam anatomiyasi (HUMAN ANATOMY 1)</p>
    <p class="sub ru">Инструкция для студента · Анатомия человека</p>
    <span class="url">${APP_URL}</span>
  </div>
</header>

${section('📲', '1. Ilovani o‘rnatish (bir marta, internet bilan)', '1. Установка (один раз, с интернетом)', `
<div class="cols">
  <div class="box">
    <h3>iPhone (Safari)</h3>
    ${steps([
      ['QR-kodni skanerlang yoki havolani <b>Safari</b>da oching. Telegram ichida ochilsa: <b class="k">⋯</b> → «Safari’da ochish».', 'Отсканируйте QR или откройте ссылку <b>в Safari</b>. Если открылось в Telegram: <b class="k">⋯</b> → «Открыть в Safari».'],
      ['<b class="k">Ulashish</b> (strelkali kvadrat) → <b>«Bosh ekranga»</b> → «Qo‘shish».', 'Кнопка <b class="k">Поделиться</b> → <b>«На экран “Домой”»</b> → «Добавить».'],
      ['Ilovani bosh ekrandagi <b>Anatomiya</b> belgisidan oching.', 'Запускайте приложение со значка <b>Anatomiya</b> на главном экране.'],
    ])}
  </div>
  <div class="box">
    <h3>Android (Chrome)</h3>
    ${steps([
      ['QR-kodni skanerlang yoki havolani <b>Chrome</b>da oching.', 'Отсканируйте QR или откройте ссылку <b>в Chrome</b>.'],
      ['Menyu <b class="k">⋮</b> → <b>«Ilovani o‘rnatish»</b> (yoki «Bosh ekranga qo‘shish»).', 'Меню <b class="k">⋮</b> → <b>«Установить приложение»</b> (или «Добавить на главный экран»).'],
      ['Ilovani bosh ekrandagi <b>Anatomiya</b> belgisidan oching.', 'Запускайте приложение со значка <b>Anatomiya</b> на главном экране.'],
    ])}
  </div>
</div>
<div class="box ok" style="margin-top:8px">
  ${two('<b>Tekshirish:</b> parvoz rejimini yoqing va ilovani oching — u internetsiz ochilishi kerak. Ochilmasa, internet bilan yana bir marta oching va 1 daqiqa kuting.', '<b>Проверка:</b> включите авиарежим и откройте приложение — оно должно открыться без интернета. Если нет — откройте ещё раз с интернетом и подождите 1 минуту.')}
</div>`)}

${section('👤', '2. Profil', '2. Профиль', steps([
  ['Bosh sahifada <b>«Profil»</b>ni bosing: <b>F.I.Sh.</b> (pasport bo‘yicha to‘liq), <b>guruh</b> va <b>fakultet</b>ni kiriting → «Saqlash».', 'На главном экране нажмите <b>«Профиль»</b>: введите <b>ФИО</b> (полностью, как в паспорте), <b>группу</b> и <b>факультет</b> → «Сохранить».'],
  ['Profil bir marta kiritiladi va faqat telefoningizda saqlanadi. U imtihon natijasiga yoziladi — xato bo‘lmasin.', 'Профиль вводится один раз и хранится только в телефоне. Он попадает в результат экзамена — проверьте, что без ошибок.'],
  ['Tilni almashtirish: <b class="k">⚙︎</b> Sozlamalar → O‘zbekcha / Русский.', 'Сменить язык: <b class="k">⚙︎</b> Настройки → O‘zbekcha / Русский.'],
]))}

${section('🦴', '3. Mashq (tayyorgarlik)', '3. Тренировка (подготовка)', steps([
  ['<b>«Mashq»</b> → mavzuni tanlang → savollar sonini tanlang → «Boshlash».', '<b>«Тренировка»</b> → выберите тему → число вопросов → «Начать».'],
  ['Javob bering va <b>«Tekshirish»</b>ni bosing: to‘g‘ri javob va qisqa izoh chiqadi. Vaqt cheklanmagan.', 'Ответьте и нажмите <b>«Проверить»</b>: появится правильный ответ и объяснение. Время не ограничено.'],
  ['<b>«Statistika»</b>da natijalaringiz, zaif mavzular va rivojlanish grafigi ko‘rinadi.', 'В <b>«Статистике»</b> — ваши результаты, слабые темы и график прогресса.'],
]))}

${section('✍️', '4. Savol turlari — qanday javob berish', '4. Типы заданий — как отвечать', `
<table>
<tr><th style="width:27%">Turi / Тип</th><th>Qanday javob beriladi</th><th>Как отвечать</th></tr>
<tr><td>Bitta / bir nechta javob</td><td>Variant(lar)ni bosing. Bir nechta bo‘lsa — barcha to‘g‘rilarini belgilang.</td><td class="ru">Нажмите вариант(ы). Если несколько — отметьте все верные.</td></tr>
<tr><td>To‘g‘ri / noto‘g‘ri</td><td>Bitta tugmani bosing.</td><td class="ru">Нажмите одну из двух кнопок.</td></tr>
<tr><td>Lotincha atama</td><td>Lotin tilida yozing. Katta-kichik harf va ortiqcha bo‘shliq farq qilmaydi, lekin imlo xatosi — xato.</td><td class="ru">Напишите на латыни. Регистр и лишние пробелы не важны, но опечатка — ошибка.</td></tr>
<tr><td>Moslashtirish</td><td>Chapdagi har bir element uchun ro‘yxatdan mosini tanlang.</td><td class="ru">Для каждого элемента слева выберите пару из списка.</td></tr>
<tr><td>Tartib bilan joylash</td><td><b class="k">▲</b> <b class="k">▼</b> bilan tartibni o‘zgartiring. Tartib allaqachon to‘g‘ri bo‘lsa — <b>«Saqlash»</b>ni bosing.</td><td class="ru">Меняйте порядок стрелками. Если порядок уже верный — нажмите <b>«Сохранить»</b>.</td></tr>
<tr><td>Tushirib qoldirilgan so‘z</td><td>Har bir bo‘sh joyga lotincha atamani yozing.</td><td class="ru">Впишите латинский термин в каждое поле.</td></tr>
<tr><td>Rasmda toping</td><td>Rasmdagi kerakli joyga bosing — belgi paydo bo‘ladi. Qayta bosib o‘zgartirish mumkin.</td><td class="ru">Коснитесь нужного места на рисунке — появится метка. Можно перенести.</td></tr>
<tr><td>Yozuvlarni joylang</td><td>Yozuvni tanlang, so‘ng rasmdagi raqamli nuqtani bosing (yoki sudrang). Nuqtani qayta bossangiz — tozalanadi.</td><td class="ru">Выберите подпись и коснитесь точки с номером (или перетащите). Повторное касание — очистить.</td></tr>
</table>`)}

${section('📝', '5. Imtihon tartibi', '5. Порядок экзамена', `
<h3>Darsdan oldin · До занятия</h3>
${steps([
  ['Ilova o‘rnatilgan, profil to‘ldirilgan bo‘lsin. Telefon <b>kamida 50%</b> zaryadlangan bo‘lsin.', 'Приложение установлено, профиль заполнен. Телефон заряжен <b>минимум на 50%</b>.'],
  ['Darsdan oldin ilovani <b>internet bilan</b> bir marta oching — yangilanishlar yuklanadi.', 'Перед занятием один раз откройте приложение <b>с интернетом</b> — подтянутся обновления.'],
])}
<h3>Darsda · На занятии</h3>
${steps([
  ['O‘qituvchi Telegram guruhiga <b>test faylini</b> (.json) yuboradi. Uni saqlang: iPhone — «Fayllarga saqlash», Android — «Yuklab olish».', 'Преподаватель присылает в Telegram <b>файл теста</b> (.json). Сохраните его: iPhone — «Сохранить в Файлы», Android — «Загрузки».'],
  ['Ilovada: <b>«Imtihon» → «Test faylini yuklash»</b> → saqlangan faylni tanlang.', 'В приложении: <b>«Экзамен» → «Загрузить файл теста»</b> → выберите сохранённый файл.'],
  ['O‘qituvchi aytgan <b>boshlash kodini</b> kiriting (masalan, K7MP-4QX9) → «Keyingi».', 'Введите <b>код старта</b>, который назовёт преподаватель (например, K7MP-4QX9) → «Далее».'],
  ['<b>Parvoz rejimini yoqing</b>, Wi-Fi va mobil internetni o‘chiring. Ekranda «Qurilma oflayn» yozuvi chiqishi kerak.', '<b>Включите авиарежим</b>, выключите Wi-Fi и мобильные данные. На экране должно появиться «Устройство офлайн».'],
  ['<b>iPhone:</b> yon tugmani <b>3 marta</b> bosing → «Yo‘naltirilgan kirish». Kodni <b>o‘qituvchi kiritadi</b>. (Oldindan: Sozlamalar → Universal kirish → Yo‘naltirilgan kirish → yoqing.) <b>Android:</b> boshlaganda ilova to‘liq ekranga o‘tadi.', '<b>iPhone:</b> трижды нажмите боковую кнопку → «Гид-доступ». Код <b>вводит преподаватель</b>. (Заранее: Настройки → Универсальный доступ → Гид-доступ → включить.) <b>Android:</b> при старте приложение перейдёт в полноэкранный режим.'],
  ['<b>«Boshlash»</b>ni bosing. Odatda <b>30 ta savol, 40 daqiqa</b>. Savollar va variantlar har bir talabada boshqacha tartibda.', 'Нажмите <b>«Начать»</b>. Обычно <b>30 заданий, 40 минут</b>. Порядок вопросов и вариантов у каждого свой.'],
  ['Savollar orasida <b>«Keyingi» / «Oldingi»</b> bilan yuring; raqamli ro‘yxat (yuqori chapdagi tugma) orqali istalgan savolga o‘tish mumkin. Javoblar avtomatik saqlanadi.', 'Переходите <b>«Далее» / «Назад»</b>; кнопка с номером вверху слева открывает список всех вопросов. Ответы сохраняются автоматически.'],
  ['Tugatgach: <b>«Testni topshirish»</b> → tasdiqlang. Vaqt tugasa, test o‘zi topshiriladi.', 'В конце: <b>«Сдать тест»</b> → подтвердите. Когда время выйдет, тест сдастся сам.'],
  ['Ekranda <b>ball, foiz, vaqt va QR-kod</b> chiqadi. QR-kodni <b>o‘qituvchiga ko‘rsating</b> — u skanerlaydi. Shundan keyin o‘qituvchi Yo‘naltirilgan kirishdan chiqaradi.', 'На экране — <b>балл, процент, время и QR-код</b>. <b>Покажите QR преподавателю</b> — он его отсканирует. После этого преподаватель выключит Гид-доступ.'],
])}`)}

${section('⚠️', '6. Qoidalar', '6. Правила', `
<div class="box warn">
${steps([
  ['<b>Ilovadan chiqish</b> (boshqa ilovani ochish, yig‘ish, sahifani yopish) — qoidabuzarlik. <b>1-marta — ogohlantirish, 2-marta — test avtomatik topshiriladi.</b>', '<b>Уход из приложения</b> (другое приложение, сворачивание, закрытие) — нарушение. <b>1-й раз — предупреждение, 2-й — тест сдаётся автоматически.</b>'],
  ['Test davomida <b>internet paydo bo‘lsa</b> — qoidabuzarlik yoziladi. Parvoz rejimini o‘chirmang.', 'Если во время теста <b>появится интернет</b> — записывается нарушение. Не выключайте авиарежим.'],
  ['Telefon soatini o‘zgartirish ham qoidabuzarlik sifatida yoziladi.', 'Перевод часов на телефоне тоже записывается как нарушение.'],
  ['Barcha qoidabuzarliklar vaqti bilan natijaga va QR-kodga yoziladi; o‘qituvchi ularni ko‘radi.', 'Все нарушения со временем попадают в результат и QR-код; преподаватель их видит.'],
  ['Matnni nusxalash va belgilash o‘chirilgan.', 'Копирование и выделение текста отключены.'],
])}
</div>`)}

${section('📊', '7. Baholash', '7. Оценка', `
${two('<span class="big">Ball: 0 dan 2.0 gacha, 0.1 qadam bilan</span> (0; 0.1; 0.2 … 1.9; 2.0). Ball = to‘g‘ri javoblar ulushi × 2, o‘ndan birgacha pastga yaxlitlanadi. Masalan: 30 tadan 24 ta to‘g‘ri → 80% → <b>1.6</b>.', '<span class="big">Балл: от 0 до 2.0 с шагом 0.1.</span> Балл = доля верных ответов × 2, с округлением вниз до десятых. Например: 24 из 30 верно → 80% → <b>1.6</b>.')}
${two('Ballni o‘qituvchi o‘z kaliti bo‘yicha qayta hisoblaydi — QR-kodni o‘zgartirish natija bermaydi.', 'Преподаватель пересчитывает балл по своему ключу — изменять QR бесполезно.')}`)}

${section('❓', '8. Muammolar va yechimlar', '8. Если что-то не так', `
<table>
<tr><th style="width:30%">Muammo / Проблема</th><th>Nima qilish kerak</th><th>Что делать</th></tr>
<tr><td>«Qurilma hali onlayn»</td><td>Parvoz rejimini yoqing va <b>Wi-Fi’ni ham</b> o‘chiring.</td><td class="ru">Включите авиарежим и выключите <b>ещё и Wi-Fi</b>.</td></tr>
<tr><td>«Kod noto‘g‘ri»</td><td>Kodni qayta kiriting: harflar va raqamlar, chiziqcha shart emas. Fayl aynan shu dars uchunmi — tekshiring.</td><td class="ru">Введите код ещё раз (дефис не обязателен). Проверьте, что файл именно для этого занятия.</td></tr>
<tr><td>Fayl tanlanmayapti (iPhone)</td><td>Telegram’da faylni bosing → <b class="k">Ulashish</b> → «Fayllarga saqlash», so‘ng ilovadan tanlang.</td><td class="ru">В Telegram нажмите на файл → <b class="k">Поделиться</b> → «Сохранить в Файлы», затем выберите в приложении.</td></tr>
<tr><td>Ilova yopilib qoldi / telefon o‘chdi</td><td>Ilovani qayta oching — test davom etadi, javoblar saqlangan. Vaqt to‘xtamaydi; chiqish qoidabuzarlik sifatida yoziladi.</td><td class="ru">Откройте приложение снова — тест продолжится, ответы сохранены. Время не останавливается; уход записывается как нарушение.</td></tr>
<tr><td>QR-kod skanerlanmayapti</td><td>Ekran yorqinligini oshiring. Bo‘lmasa: <b>«Natijani fayl sifatida saqlash»</b> → faylni o‘qituvchiga Telegram’da yuboring.</td><td class="ru">Прибавьте яркость. Если не помогает: <b>«Сохранить результат файлом»</b> → отправьте файл преподавателю в Telegram.</td></tr>
<tr><td>Oxirgi natijani qayta ko‘rsatish</td><td>Bosh sahifa → <b>«Oxirgi natija»</b>.</td><td class="ru">Главный экран → <b>«Последний результат»</b>.</td></tr>
</table>`)}

<footer>Anatomiya test · ${APP_URL} · Rasmlar: Gray’s Anatomy (1918, public domain), OpenStax Anatomy &amp; Physiology (CC BY 4.0) — ilovadagi «Manbalar» bo‘limida.</footer>
</body>
</html>`;

mkdirSync('docs', { recursive: true });
writeFileSync('docs/talaba-qollanma.html', html, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({ path: 'docs/Talaba_qollanma_Anatomiya.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('✓ docs/Talaba_qollanma_Anatomiya.pdf');
