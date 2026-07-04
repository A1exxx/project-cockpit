import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Общие хелперы e2e-контракта. Home — теперь первый экран приложения
 * (DESIGN-V2.md §2-3), поэтому каждый спек, которому нужна карта, должен
 * пройти через Home → клик по строке Sales Bot → дождаться канваса.
 */

/** Дожидается первой видимой ноды React Flow. */
export async function waitForMap(page: Page): Promise<void> {
  await page.waitForSelector('.react-flow__node', { state: 'visible' })
}

/**
 * Клик по строке Sales Bot на уже открытом Home → дождаться канваса.
 * Не навигирует — используй когда Home уже на экране (напр. после page.reload()).
 */
export async function clickSalesbotRow(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible()
  await page.getByText('Deadline Sales Bot', { exact: true }).click()
  await waitForMap(page)
}

/**
 * goto('/') → дождаться Home → клик по строке Sales Bot → дождаться канваса.
 * Sales Bot всегда первый элемент списка (не черновик, помечен чипом «демо»).
 */
export async function openSalesbot(page: Page): Promise<void> {
  await page.goto('/')
  await clickSalesbotRow(page)
}
