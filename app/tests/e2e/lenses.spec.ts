import { expect, test } from '@playwright/test'

/** S-LENS-01..04 — 4 линзы (Блоки/Связи/Риск/Дерево), см. SCENARIOS.md. */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.react-flow__node', { state: 'visible' })
  // все линзовые сценарии работают внутри «Продукт / разработка» (L1, 6 систем со связями)
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
})

test('S-LENS-01: линза «Блоки» — сеточная раскладка без рёбер (дефолт)', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Блоки' })).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
})

test('S-LENS-05: наведение на ноду в линзе «Блоки» рисует временные связи (§5.1 DESIGN-ONBOARDING)', async ({ page }) => {
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)

  await page.locator('.react-flow__node[data-id="sys-instagram-module"]').hover()
  await page.waitForTimeout(400)

  const edgeCount = await page.locator('.react-flow__edge').count()
  expect(edgeCount).toBeGreaterThan(0)

  await page.mouse.move(0, 0)
  await page.waitForTimeout(400)
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
})

test('S-LENS-02: линза «Связи» — сквозные рёбра между нодами', async ({ page }) => {
  await page.getByRole('button', { name: 'Связи' }).click()
  await page.waitForTimeout(900)

  await expect(page.locator('.react-flow__node')).toHaveCount(6)
  const edgeCount = await page.locator('.react-flow__edge').count()
  expect(edgeCount).toBeGreaterThan(0)
})

test('S-LENS-03: линза «Риск» — цветовая заливка по статусу', async ({ page }) => {
  await page.getByRole('button', { name: 'Риск' }).click()
  await page.waitForTimeout(900)

  await expect(page.locator('.react-flow__node')).toHaveCount(6)
  // instagram-модуль имеет status warn — в линзе риска нода красится в warn-фон
  const igNode = page.locator('.react-flow__node[data-id="sys-instagram-module"]')
  await expect(igNode.locator('div.bg-warn\\/12').first()).toBeVisible()
})

test('S-LENS-04: линза «Дерево» — фокус-нода сверху + дети снизу', async ({ page }) => {
  await page.getByRole('button', { name: 'Дерево' }).click()
  await page.waitForTimeout(900)

  // фокус (org-product) + 6 детей = 7 нод, соединены рёбрами вниз
  await expect(page.locator('.react-flow__node')).toHaveCount(7)
  await expect(page.locator('.react-flow__node[data-id="org-product"]')).toBeVisible()
  const edgeCount = await page.locator('.react-flow__edge').count()
  expect(edgeCount).toBe(6)
})
