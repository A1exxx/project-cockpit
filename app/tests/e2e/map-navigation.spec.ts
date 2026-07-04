import { expect, test } from '@playwright/test'
import { openSalesbot } from './helpers'

/**
 * S-NAV-01..07 — навигация по карте (см. SCENARIOS.md).
 * Home — первый экран; каждый test() входит в Sales Bot заново (изоляция стора).
 */

test.beforeEach(async ({ page }) => {
  await openSalesbot(page)
})

test('S-NAV-01: карта загружается и показывает три бизнес-блока L0', async ({ page }) => {
  const nodes = page.locator('.react-flow__node')
  await expect(nodes).toHaveCount(3)

  await expect(page.locator('.react-flow__node[data-id="org-product"]')).toBeVisible()
  await expect(page.locator('.react-flow__node[data-id="org-marketing"]')).toBeVisible()
  await expect(page.locator('.react-flow__node[data-id="org-sales"]')).toBeVisible()
})

test('S-NAV-02: двойной клик по «Продукт / разработка» погружает на L1 (6 систем)', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)

  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).toBeVisible()

  const nodes = page.locator('.react-flow__node')
  await expect(nodes).toHaveCount(6)
  await expect(page.locator('.react-flow__node[data-id="sys-backend-core"]')).toBeVisible()
  await expect(page.locator('.react-flow__node[data-id="sys-instagram-module"]')).toBeVisible()
})

test('S-NAV-03: погружение до L2 через Backend Core (10 модулей)', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="sys-backend-core"]').dblclick()
  await page.waitForTimeout(900)

  const crumbNav = page.getByLabel('Хлебные крошки')
  await expect(crumbNav.getByText('Продукт / разработка')).toBeVisible()
  await expect(crumbNav.getByText('Backend Core (FastAPI)')).toBeVisible()

  const nodes = page.locator('.react-flow__node')
  await expect(nodes).toHaveCount(10)
})

test('S-NAV-04: клик по крошке поднимает уровень (jumpTo)', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="sys-backend-core"]').dblclick()
  await page.waitForTimeout(900)

  const crumbNav = page.getByLabel('Хлебные крошки')
  await crumbNav.getByText('Продукт / разработка').click()
  await page.waitForTimeout(900)

  await expect(crumbNav.getByText('Backend Core (FastAPI)')).not.toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
})

test('S-NAV-05: L0-крошка сбрасывает путь целиком (заменила кнопку «В корень» в волне 3)', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="sys-backend-core"]').dblclick()
  await page.waitForTimeout(900)

  const crumbNav = page.getByLabel('Хлебные крошки')
  await crumbNav.getByRole('button', { name: /L0 Deadline Sales Bot/ }).click()
  await page.waitForTimeout(900)

  await expect(crumbNav.getByText('Продукт / разработка')).not.toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
})

test('S-NAV-06: Esc поднимает уровень на единицу (когда мастер закрыт)', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).toBeVisible()

  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)

  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).not.toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
})

test('S-NAV-07: Esc закрывает мастер и НЕ поднимает уровень карты', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).toBeVisible()

  await page.getByRole('button', { name: /Новый проект/ }).click()
  await expect(page.getByText('Шаг 1 из 6')).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(page.getByText('Шаг 1 из 6')).not.toBeVisible()
  // карта осталась на L1 — крошка не пропала
  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).toBeVisible()
})
