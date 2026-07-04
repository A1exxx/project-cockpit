import { expect, test } from '@playwright/test'
import { openSalesbot } from './helpers'

/**
 * S-HOME-01..05 — Home как первый экран (DESIGN-V2.md §2-3), новый контракт волны 3-4.
 * Каждый test() стартует с чистого localStorage, чтобы черновики прошлых прогонов
 * не просачивались между тестами. ВАЖНО: не через page.addInitScript(() => clear()) —
 * тот скрипт перевыполняется на КАЖДОЙ навигации, включая page.reload() внутри теста,
 * и стирает данные, которые тест сохранил (нашли этот баг на прогоне S-HOME-03: localStorage
 * становился null после reload). Одноразовая очистка через evaluate() + goto('/') решает это.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.goto('/')
})

test('S-HOME-01: Home — первый экран приложения, Sales Bot виден с чипом «демо»', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible()
  const salesbotRow = page.getByText('Deadline Sales Bot', { exact: true })
  await expect(salesbotRow).toBeVisible()
  await expect(page.getByText('демо', { exact: true })).toBeVisible()
  // на канвасе ничего нет — карта не смонтирована до открытия проекта
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
})

test('S-HOME-02: открытие Sales Bot переключает на карту (3 корневые ноды)', async ({ page }) => {
  await openSalesbot(page)

  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  await expect(page.locator('.react-flow__node[data-id="org-product"]')).toBeVisible()
})

test('S-HOME-03: проект из мастера появляется в списке и переживает reload', async ({ page }) => {
  await openSalesbot(page)

  await page.getByRole('button', { name: /Новый проект/ }).click()
  await page.getByRole('button', { name: 'Заполнить примером' }).click()
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Далее' }).click()
    await page.waitForTimeout(200)
  }
  await page.getByRole('button', { name: 'Создать карту проекта' }).click()
  await page.waitForTimeout(900)

  // после создания — сразу на карте нового проекта; возвращаемся на Home
  await page.getByRole('button', { name: 'Ко всем проектам' }).click()
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible()
  await expect(page.getByText('Трекер привычек с TG-ботом', { exact: true })).toBeVisible()

  const namesBefore = await page.locator('div.group span.truncate').allInnerTexts()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible()
  const namesAfter = await page.locator('div.group span.truncate').allInnerTexts()

  expect(namesAfter).toEqual(namesBefore)
  await expect(page.getByText('Трекер привычек с TG-ботом', { exact: true })).toBeVisible()
})

test('S-HOME-04: удаление черновика требует подтверждения', async ({ page }) => {
  await openSalesbot(page)
  await page.getByRole('button', { name: /Новый проект/ }).click()
  await page.getByRole('button', { name: 'Заполнить примером' }).click()
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Далее' }).click()
    await page.waitForTimeout(200)
  }
  await page.getByRole('button', { name: 'Создать карту проекта' }).click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'Ко всем проектам' }).click()

  // ProjectRow меняет разметку в состоянии подтверждения (другой div, теряет
  // класс .group) — поэтому не держим один и тот же локатор `draftRow` через
  // обе фазы, а ищем каждый раз заново по видимому в данный момент содержимому.
  const draftRow = page.locator('div.group', { hasText: 'Трекер привычек с TG-ботом' })
  await draftRow.getByRole('button', { name: 'Удалить проект' }).click()

  // confirm/cancel inline, без window.confirm()
  await expect(page.getByText('Удалить «Трекер привычек с TG-ботом»?')).toBeVisible()
  await page.getByRole('button', { name: 'Отмена' }).click()
  await expect(page.getByText('Трекер привычек с TG-ботом', { exact: true })).toBeVisible()

  await draftRow.getByRole('button', { name: 'Удалить проект' }).click()
  await expect(page.getByText('Удалить «Трекер привычек с TG-ботом»?')).toBeVisible()
  await page.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByText('Трекер привычек с TG-ботом', { exact: true })).not.toBeVisible()
})

test('S-HOME-05: Sales Bot неудаляем (нет кнопки удаления в его строке)', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible()

  const salesbotRow = page.locator('div.group', { hasText: 'Deadline Sales Bot' })
  await expect(salesbotRow.getByRole('button', { name: 'Удалить проект' })).toHaveCount(0)
})
