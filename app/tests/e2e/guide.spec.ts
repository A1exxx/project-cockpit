import { expect, test } from '@playwright/test'
import { openSalesbot } from './helpers'

/**
 * S-GUIDE-01..05 — AI-гид (см. SCENARIOS.md).
 * Сегменты гида (Экскурсия/Спросить/Задача) имеют role="tab" — используем
 * button:has-text() вместо getByRole('button'), как указано в паттернах.
 * Таб «Гид» — exact: true, иначе матчит и кнопку обзора «Спросить AI-гида»
 * (getByRole matches by substring by default; см. onboarding-обзор §3).
 */

test.beforeEach(async ({ page }) => {
  await openSalesbot(page)
  await page.getByRole('button', { name: 'Гид', exact: true }).click()
  await page.waitForTimeout(300)
})

test('S-GUIDE-01: таб «Гид» переключает правую панель на GuidePanel', async ({ page }) => {
  const aside = page.locator('aside')
  await expect(aside.locator('button:has-text("Экскурсия")')).toBeVisible()
  await expect(aside.locator('button:has-text("Спросить")')).toBeVisible()
  await expect(aside.locator('button:has-text("Задача")')).toBeVisible()

  // по умолчанию открыт сегмент «Экскурсия», шаг 1/8
  await expect(aside.getByText('Шаг 1 / 8')).toBeVisible()
  await expect(aside.getByRole('heading', { name: 'Экскурсия по Sales Bot' })).toBeVisible()
})

test('S-GUIDE-02: тур — «Далее» продвигает шаги, счётчик растёт', async ({ page }) => {
  const aside = page.locator('aside')
  await expect(aside.getByText('Шаг 1 / 8')).toBeVisible()

  await aside.getByRole('button', { name: 'Далее' }).click()
  await aside.getByRole('button', { name: 'Далее' }).click()

  await expect(aside.getByText('Шаг 3 / 8')).toBeVisible()
  await expect(aside.getByRole('heading', { name: 'Продукт → шесть систем' })).toBeVisible()
})

test('S-GUIDE-03: тур — «Назад» дизейблена на первом шаге, action меняет карту', async ({ page }) => {
  const aside = page.locator('aside')
  await expect(aside.getByRole('button', { name: 'Назад' })).toBeDisabled()

  // шаг 3 «Продукт → шесть систем» — action погружает в org-product
  await aside.getByRole('button', { name: 'Далее' }).click()
  await aside.getByRole('button', { name: 'Далее' }).click()
  await expect(aside.getByRole('heading', { name: 'Продукт → шесть систем' })).toBeVisible()

  await aside.getByRole('button', { name: 'Погрузиться в Продукт' }).click()
  await page.waitForTimeout(900)

  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).toBeVisible()
})

test('S-GUIDE-04: сегмент «Задача» — подсказка без узла, превью + кнопка с узлом', async ({ page }) => {
  const aside = page.locator('aside')
  await aside.locator('button:has-text("Задача")').click()
  await page.waitForTimeout(300)

  await expect(aside.getByText('Выбери узел на карте')).toBeVisible()

  await page.locator('.react-flow__node[data-id="org-product"]').click()
  await page.waitForTimeout(700)

  await expect(aside.locator('pre')).toContainText('Задача из карты Project Cockpit')
  await expect(aside.getByRole('button', { name: 'Скопировать задачу' })).toBeVisible()
  // клик по «Скопировать» намеренно не выполняем — clipboard в headless без
  // permission нестабилен; наличие кнопки и превью достаточно для контракта.
})

test('S-GUIDE-05: сегмент «Спросить» без ключа — плашка ввода Gemini-ключа', async ({ page }) => {
  const aside = page.locator('aside')
  await aside.locator('button:has-text("Спросить")').click()
  await page.waitForTimeout(300)

  await expect(aside.getByText('Вставь свой Gemini API ключ')).toBeVisible()
  await expect(aside.locator('input[type="password"]')).toBeVisible()
  await expect(aside.getByRole('link', { name: /aistudio\.google\.com/ })).toBeVisible()
})
