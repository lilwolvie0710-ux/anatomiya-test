import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Основной сценарий: преподаватель создаёт тест → студент офлайн проходит экзамен
// (с перезагрузкой посередине) → QR результата → преподаватель принимает его в журнал.

async function setLangRu(page: Page) {
  await page.evaluate(() => localStorage.setItem('ui-settings', JSON.stringify({ lang: 'ru', theme: 'dark' })));
}

async function readTeacherTest(page: Page): Promise<{ file: unknown; code: string }> {
  return page.evaluate(
    () =>
      new Promise<{ file: unknown; code: string }>((resolve, reject) => {
        const req = indexedDB.open('anatomiya-test');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('tests', 'readonly');
          const all = tx.objectStore('tests').getAll();
          all.onsuccess = () => {
            const t = all.result[0];
            resolve({ file: t.file, code: t.code });
          };
        };
      }),
  );
}

async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    // ждём, пока SW возьмёт страницу под контроль (precache завершён)
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }));
    }
    return !!reg.active;
  });
}

async function answerCurrent(page: Page) {
  const type = await page.locator('[data-qtype]').getAttribute('data-qtype');
  switch (type) {
    case 'single':
    case 'truefalse':
      await page.locator('.opt').first().click();
      break;
    case 'multi':
      await page.locator('.opt').first().click();
      break;
    case 'latin':
      await page.locator('input.input').first().fill('processus spinosus');
      break;
    case 'matching':
      for (const sel of await page.locator('.match-row select').all()) await sel.selectOption({ index: 1 });
      break;
    case 'ordering':
      await page.locator('.order-item button[aria-label="down"]').first().click();
      break;
    case 'cloze':
      for (const inp of await page.locator('.cloze input').all()) await inp.fill('atlas');
      break;
    case 'hotspot': {
      const box = await page.locator('.figure > div').first().boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      break;
    }
    case 'labels':
      await page.locator('.chip').first().click();
      await page.locator('[data-target="0"]').click();
      break;
  }
}

test('полный сценарий экзамена офлайн', async ({ browser, browserName }, testInfo) => {
  const device = testInfo.project.use;
  // ---------- преподаватель ----------
  const teacher: BrowserContext = await browser.newContext({ ...device });
  const tp = await teacher.newPage();
  await tp.goto('./');
  await setLangRu(tp);
  await tp.goto('./#/teacher');
  await tp.reload();
  const pins = tp.locator('input[type=password]');
  await pins.nth(0).fill('1234');
  await pins.nth(1).fill('1234');
  await tp.getByRole('button', { name: 'Сохранить PIN' }).click();
  await tp.getByText('Конструктор теста').click();
  await tp.getByPlaceholder('Например: Тема 1, группа 101').fill('E2E тест');
  await tp.getByText('Включить черновики (только для проверки!)').click();
  const countInput = tp.locator('label.field', { hasText: 'Вопросов каждому студенту' }).locator('input');
  await countInput.fill('6');
  const durationInput = tp.locator('label.field', { hasText: 'Время, мин' }).locator('input');
  await durationInput.fill('10');
  await tp.getByTestId('create-test').click();
  const code = (await tp.getByTestId('start-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  const { file } = await readTeacherTest(tp);

  // ---------- студент ----------
  const student = await browser.newContext({ ...device });
  const sp = await student.newPage();
  await sp.goto('./');
  await setLangRu(sp);
  await sp.reload();
  await waitForServiceWorker(sp);

  // приложение работает без сети после первой загрузки
  await student.setOffline(true);
  await sp.reload();
  await expect(sp.getByText('Анатомия: тест')).toBeVisible();
  await student.setOffline(false);

  await sp.getByText('Сначала заполните профиль').click();
  await sp.locator('label.field', { hasText: 'ФИО' }).locator('input').fill('Aliyev Vali');
  await sp.locator('label.field', { hasText: 'Группа' }).locator('input').fill('101');
  await sp.getByRole('button', { name: 'Сохранить' }).click();

  await sp.locator('.tile.accent').click();
  await sp.locator('input[type=file]').setInputFiles({
    name: 'test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await sp.locator('input.code').fill('WRON-GCOD');
  await sp.getByRole('button', { name: 'Далее' }).click();
  await expect(sp.getByText('Неверный код')).toBeVisible({ timeout: 30_000 });
  await sp.locator('input.code').fill(code.toLowerCase());
  await sp.getByRole('button', { name: 'Далее' }).click();

  // онлайн — старт запрещён
  await expect(sp.getByTestId('online-state')).toContainText('онлайн', { timeout: 30_000 });
  if (browserName === 'webkit') await sp.getByText('Гид-доступ включён').click();
  await expect(sp.getByTestId('begin')).toBeDisabled();

  // авиарежим
  await student.setOffline(true);
  await expect(sp.getByTestId('online-state')).toContainText('офлайн');
  await sp.getByTestId('begin').click();
  await expect(sp.getByTestId('timer')).toBeVisible();

  // ответ на первый вопрос и перезагрузка — состояние и таймер сохраняются
  await answerCurrent(sp);
  await sp.waitForTimeout(600);
  const timerBefore = await sp.getByTestId('timer').textContent();
  await sp.reload();
  await expect(sp.getByTestId('timer')).toBeVisible();
  // уход со страницы засчитан: первое нарушение — предупреждение
  await expect(sp.getByText('Предупреждение!')).toBeVisible();
  await sp.getByRole('button', { name: 'Понятно' }).click();
  const timerAfter = await sp.getByTestId('timer').textContent();
  expect(timerAfter! <= timerBefore!).toBeTruthy();
  await expect(sp.getByText(/Отвечено: 1\//)).toBeVisible();

  // остальные вопросы
  for (let i = 0; i < 10; i++) {
    const next = sp.getByRole('button', { name: 'Далее →' });
    if (!(await next.isVisible())) break;
    await next.click();
    await answerCurrent(sp);
  }
  await sp.getByRole('button', { name: 'Сдать тест' }).first().click();
  await sp.getByTestId('confirm-submit').click();

  const qr = sp.getByTestId('result-qr');
  await expect(qr).toBeVisible();
  const qrText = (await qr.getAttribute('data-qr'))!;
  expect(qrText.startsWith('AT1:')).toBeTruthy();
  const grade = Number(await sp.getByTestId('grade').textContent());
  expect([0, 1, 2]).toContain(grade);
  await expect(sp.locator('.stat').nth(2)).toContainText(/[1-9]/); // есть нарушения

  // ---------- преподаватель принимает результат ----------
  await tp.goto('./#/teacher/scan');
  await tp.getByText('Добавить без QR').click();
  await tp.locator('textarea').fill(qrText);
  await tp.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(tp.getByRole('status')).toContainText('Aliyev Vali');
  await expect(tp.getByRole('status')).not.toContainText('ПОДПИСЬ');

  // подделанный результат не проходит проверку
  await tp.locator('textarea').fill(qrText.slice(0, -6) + 'AAAAAA');
  await tp.getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(tp.getByRole('status')).toBeVisible();

  await tp.goto('./#/teacher/journal');
  await expect(tp.getByText('Aliyev Vali')).toBeVisible();

  await teacher.close();
  await student.close();
});

test('тренировка: ответ и объяснение', async ({ page }) => {
  await page.goto('./');
  await setLangRu(page);
  await page.goto('./#/training');
  await page.reload();
  await page.locator('.opt').first().click();
  await page.getByRole('button', { name: 'Начать' }).click();
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Проверить' }).click();
  await expect(page.locator('.feedback')).toBeVisible();
});
