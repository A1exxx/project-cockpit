import { expect, test } from '@playwright/test'
import { openSalesbot } from './helpers'

/** S-LENS-01..05 — 4 линзы (Блоки/Связи/Риск/Дерево) + анти-дубль/чипы, см. SCENARIOS.md. */

test.beforeEach(async ({ page }) => {
  await openSalesbot(page)
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

test('S-LENS-06: линза «Связи» — при hover нет дублей ребра одной пары (id уникальны)', async ({ page }) => {
  await page.getByRole('button', { name: 'Связи' }).click()
  await page.waitForTimeout(900)

  const baseIds = await page.locator('.react-flow__edge').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-id') ?? el.id),
  )
  expect(new Set(baseIds).size).toBe(baseIds.length)

  await page.locator('.react-flow__node[data-id="sys-instagram-module"]').hover()
  await page.waitForTimeout(400)

  const hoverIds = await page.locator('.react-flow__edge').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-id') ?? el.id),
  )
  expect(new Set(hoverIds).size).toBe(hoverIds.length)
  // hover не должен добавлять новых рёбер на линзе «Связи» — все пары уже нарисованы базово
  expect(hoverIds.length).toBe(baseIds.length)
})

test('S-LENS-07: линза «Связи» — подписи-чипы рёбер видны (≤12 рёбер на уровне показываются всегда)', async ({ page }) => {
  // org-product (L1) имеет 17 рёбер (>12) — чипы там скрыты без hover по дизайну.
  // Backend Core (L2, 10 нод / 6 рёбер) укладывается в порог — уходим на уровень глубже.
  await page.locator('.react-flow__node[data-id="sys-backend-core"]').dblclick()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'Связи' }).click()
  await page.waitForTimeout(900)

  const edgeCount = await page.locator('.react-flow__edge').count()
  expect(edgeCount).toBeLessThanOrEqual(12)
  // при <=12 рёбрах уровня подписи показываются без hover (FloatingEdge showLabel)
  const chip = page.locator('.react-flow__edgelabel-renderer div').first()
  await expect(chip).toBeVisible()
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
