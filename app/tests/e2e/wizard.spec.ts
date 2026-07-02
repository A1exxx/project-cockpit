import { expect, test } from '@playwright/test'

/** S-WIZ-01..05 — мастер «Новый проект» (см. SCENARIOS.md). */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.react-flow__node', { state: 'visible' })
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
  await expect(
    page.locator('header').getByText('Трекер привычек с TG-ботом'),
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
  await header.getByText('Трекер привычек с TG-ботом').click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitem', { name: 'Deadline Sales Bot' }).click()
  await page.waitForTimeout(900)

  await expect(header.getByText('Deadline Sales Bot')).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(3)
  await expect(page.locator('.react-flow__node[data-id="org-product"]')).toBeVisible()
})
