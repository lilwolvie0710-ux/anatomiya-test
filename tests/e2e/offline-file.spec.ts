import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Офлайн-файл для Telegram: открывается как file:// без сети, всё внутри одного HTML.
const FILE = pathToFileURL(resolve('docs/Anatomiya_oflayn.html')).href;

test('офлайн-файл: тренировка и пробный тест без сети', async ({ browser }, testInfo) => {
  const ctx = await browser.newContext({ ...testInfo.project.use, offline: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url());
  });

  await page.goto(FILE);
  await expect(page.getByText('Anatomiya — oflayn')).toBeVisible();
  await page.getByRole('button', { name: 'RU' }).click();
  await expect(page.getByText('Анатомия — офлайн')).toBeVisible();

  // тренировка по теме 4
  await page.getByRole('button', { name: /Тренировка/ }).click();
  await page.locator('.opt', { hasText: 'Кости мозгового черепа' }).click();
  await page.getByRole('button', { name: 'Начать' }).click();
  await expect(page.locator('[data-qtype]')).toBeVisible();

  // пробный тест: 30 вопросов, отвечаем на первый и сдаём
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: /Пробный тест/ }).click();
  await page.getByRole('button', { name: 'Начать' }).click();
  await expect(page.locator('.badge').first()).toHaveText('1/30');
  await expect(page.locator('.timer')).toHaveText(/^(40:00|39:5\d)$/);
  const opt = page.locator('.opt').first();
  if (await opt.isVisible()) await opt.click();
  for (let i = 0; i < 29; i++) await page.getByRole('button', { name: 'Далее →' }).click();
  await page.getByRole('button', { name: 'Сдать тест' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Сдать тест' }).click();
  const grade = Number(await page.getByTestId('offline-grade').textContent());
  expect(grade).toBeGreaterThanOrEqual(0);
  expect(grade).toBeLessThanOrEqual(2);

  // картинки встроены: в разборе находим задание с рисунком
  const imgs = await page.evaluate(() => Object.values((globalThis as { __INLINE_IMAGES?: Record<string, string> }).__INLINE_IMAGES ?? {}).length);
  expect(imgs).toBeGreaterThanOrEqual(21);

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await ctx.close();
});
