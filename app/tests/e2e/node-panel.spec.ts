import { expect, test } from '@playwright/test'

/** S-NODE-01..07 — панель узла (aside), см. SCENARIOS.md. */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.react-flow__node', { state: 'visible' })
})

test('S-NODE-01: клик по ноде показывает заголовок и статус-чип в панели', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').click()
  await page.waitForTimeout(700)

  const aside = page.locator('aside')
  await expect(aside.getByRole('heading', { name: 'Продукт / разработка' })).toBeVisible()
  await expect(aside.getByText('Требует внимания')).toBeVisible()
})

test('S-NODE-02: связь в панели — переход по кнопке-ссылке (focusNode)', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="sys-instagram-module"]').click()
  await page.waitForTimeout(700)

  const aside = page.locator('aside')
  await expect(aside.getByRole('heading', { name: 'Instagram-модуль' })).toBeVisible()

  await aside.getByRole('button', { name: 'Backend Core (FastAPI)' }).click()
  await page.waitForTimeout(900)

  await expect(aside.getByRole('heading', { name: 'Backend Core (FastAPI)' })).toBeVisible()
  await expect(page.locator('.react-flow__node[data-id="sys-backend-core"]')).toBeVisible()
})

test('S-NODE-03: кнопка «Раскрыть ветку» в панели выполняет drill', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').click()
  await page.waitForTimeout(700)

  const aside = page.locator('aside')
  await aside.getByRole('button', { name: /Раскрыть ветку/ }).click()
  await page.waitForTimeout(900)

  await expect(page.getByLabel('Хлебные крошки').getByText('Продукт / разработка')).toBeVisible()
  await expect(page.locator('.react-flow__node')).toHaveCount(6)
})

test('S-NODE-04: L4-узел показывает блок кода с main.py', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-product"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="sys-backend-core"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="mod-handle-message"]').dblclick()
  await page.waitForTimeout(900)
  await page.locator('.react-flow__node[data-id="feat-message-req"]').dblclick()
  await page.waitForTimeout(900)

  await page.locator('.react-flow__node[data-id="code-handle-message-fn"]').click()
  await page.waitForTimeout(700)

  const aside = page.locator('aside')
  await expect(aside.getByRole('heading', { name: '_handle_message()' })).toBeVisible()
  // "main.py" встречается дважды (мета-строка CodeMetaLine + упоминание в теле
  // кода) — .first() матчит мета-строку, она рендерится первой в DOM.
  await expect(aside.getByText('main.py').first()).toBeVisible()
  // shiki грузится асинхронно (dynamic import) — ждём появления подсвеченного кода
  await expect(aside.getByText('_handle_message', { exact: false }).last()).toBeVisible({ timeout: 10000 })
})

test('S-NODE-05: узел без детей не показывает кнопку «Раскрыть ветку»', async ({ page }) => {
  await page.locator('.react-flow__node[data-id="org-marketing"]').click()
  await page.waitForTimeout(700)

  const aside = page.locator('aside')
  await expect(aside.getByRole('heading', { name: 'Маркетинг' })).toBeVisible()
  await expect(aside.getByRole('button', { name: /Раскрыть ветку/ })).toHaveCount(0)
})

test('S-NODE-06: холодный старт (ничего не выбрано) показывает обзор проекта вместо пустого экрана', async ({ page }) => {
  const aside = page.locator('aside')
  await expect(aside.getByRole('heading', { name: 'Deadline Sales Bot' })).toBeVisible()
  await expect(aside.getByText('Бот, который сам ловит клиентов', { exact: false })).toBeVisible()
  await expect(aside.getByText('систем', { exact: false })).toBeVisible()
  await expect(aside.getByRole('button', { name: /Не знаешь, с чего начать/ })).toBeVisible()
})

test('S-NODE-07: кнопка «Экскурсия» видна в шапке и открывает тур', async ({ page }) => {
  const tourButton = page.getByRole('button', { name: 'Экскурсия' })
  await expect(tourButton).toBeVisible()

  await tourButton.click()
  await page.waitForTimeout(300)

  const aside = page.locator('aside')
  await expect(aside.getByText('Шаг 1 / 8')).toBeVisible()
})
