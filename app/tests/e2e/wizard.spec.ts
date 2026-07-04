import { expect, test } from '@playwright/test'
import { clickSalesbotRow, openSalesbot } from './helpers'

/**
 * S-WIZ-01..06 — мастер «Новый проект» (см. SCENARIOS.md).
 * Мастер и черновики теперь персистятся в localStorage (Волна 3) — каждый test()
 * стартует с чистого localStorage, чтобы черновики/автосейв прошлых прогонов не
 * просачивались между тестами. ВАЖНО: очистка через одноразовый evaluate(), НЕ
 * через page.addInitScript(() => clear()) — тот перевыполняется на каждой навигации,
 * включая page.reload() внутри теста (S-WIZ-06 перезагружает страницу; addInitScript
 * стёр бы автосейв прямо перед проверкой — нашли на прогоне home.spec.ts).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await openSalesbot(page)
})

test('S-WIZ-01: открытие мастера, Esc закрывает без следов', async ({ page }) => {
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await expect(page.getByText('Шаг 1 из 6')).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(page.getByText('Шаг 1 из 6')).not.toBeVisible()
})

test('S-WIZ-02: «Заполнить примером» разблокирует «Далее», полный проход до конца', async ({ page }) => {
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await page.getByRole('button', { name: 'Заполнить примером' }).click()

  for (let i = 0; i < 5; i++) {
    const nextButton = page.getByRole('button', { name: 'Далее' })
    await expect(nextButton).toBeEnabled()
    await nextButton.click()
    await page.waitForTimeout(200)
  }

  await expect(page.getByText('Шаг 6 из 6')).toBeVisible()
  const finishButton = page.getByRole('button', { name: 'Создать карту проекта' })
  await expect(finishButton).toBeVisible()
  await expect(finishButton).toBeEnabled()
})

test('S-WIZ-03: завершение мастера создаёт новый проект и переключает на него', async ({ page }) => {
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await page.getByRole('button', { name: 'Заполнить примером' }).click()

  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Далее' }).click()
    await page.waitForTimeout(200)
  }

  await page.getByRole('button', { name: 'Создать карту проекта' }).click()
  await page.waitForTimeout(900)

  await expect(page.getByText('Шаг 6 из 6')).not.toBeVisible()
  // header содержит и свитчер-кнопку, и L0-крошку с тем же текстом (Волна 3) —
  // getByRole + exact матчит только кнопку-свитчер (крошка имеет "L0 " в accessible name).
  await expect(
    page.locator('header').getByRole('button', { name: 'Трекер привычек с TG-ботом', exact: true }),
  ).toBeVisible()

  // карта нового (черновикового) проекта отрисована на корне
  await page.waitForSelector('.react-flow__node', { state: 'visible' })
})

test('S-WIZ-04: пустая обязательная форма блокирует «Далее» на шаге 1', async ({ page }) => {
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await expect(page.getByText('Шаг 1 из 6')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Далее' })).toBeDisabled()
})

test('S-WIZ-05: свитчер проектов переключается туда-обратно без потери карты Sales Bot', async ({ page }) => {
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await page.getByRole('button', { name: 'Заполнить примером' }).click()
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Далее' }).click()
    await page.waitForTimeout(200)
  }
  await page.getByRole('button', { name: 'Создать карту проекта' }).click()
  await page.waitForTimeout(900)

  const header = page.locator('header')
  await header.getByRole('button', { name: 'Трекер привычек с TG-ботом', exact: true }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitem', { name: 'Deadline Sales Bot' }).click()
  await page.waitForTimeout(900)

  await expect(header.getByRole('button', { name: 'Deadline Sales Bot', exact: true })).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  await expect(page.locator('.react-flow__node[data-id="org-product"]')).toBeVisible()
})

test('S-WIZ-06: автосейв — заполнить шаг 1 → reload → плашка «Продолжить»', async ({ page }) => {
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await page.getByPlaceholder('Как назовём?').fill('Черновик для автосейва')
  // debounce автосейва 500ms
  await page.waitForTimeout(700)

  await page.reload()
  await clickSalesbotRow(page)
  await page.getByRole('button', { name: /Новый проект/ }).click()

  await expect(page.getByText('Есть незаконченный черновик', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await expect(page.getByPlaceholder('Как назовём?')).toHaveValue('Черновик для автосейва')
})
