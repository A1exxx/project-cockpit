// Контент тура «Экскурсия по Sales Bot» — на реальных узлах слепка
// D:\project-cockpit\app\src\data\salesbot-map.json (id проверены дословно).
import type { GuideStep } from './engine'

export const TOUR_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Экскурсия по Sales Bot',
    body: 'Кокпит показывает проект слоями — как тело: от бизнес-контекста снаружи до кода внутри. Пять минут — и ты понимаешь устройство чужого проекта.',
  },
  {
    id: 'root',
    title: 'Три бизнес-блока',
    body: 'На корневом уровне — Продукт, Маркетинг, Продажи. Серые блоки — контекст: видно, что рядом, но зона разработки — только Продукт.',
    action: { label: 'В корень карты', drillPath: [] },
  },
  {
    id: 'product-systems',
    title: 'Продукт → шесть систем',
    body: 'Внутри Продукта — Backend Core, Каналы доставки, Instagram-модуль, CRM-интеграция, БД-слой, Lead Intelligence. Это уровень L1: крупные части, как силуэт тела.',
    action: { label: 'Погрузиться в Продукт', drillPath: ['org-product'] },
  },
  {
    id: 'risk-lens',
    title: 'Линза «Риск»: жёлтые зоны',
    body: 'Instagram-модуль — легаси, изолированная реализация рядом с основными каналами. Два разных пути обработки одного канала — источник путаницы и багов.',
    action: { label: 'Показать риски', lens: 'risk', selectId: 'sys-instagram-module' },
  },
  {
    id: 'backend-core',
    title: 'Backend Core изнутри',
    body: 'Десять модулей: роуты, LLM-клиенты, reply guards, tenant loader и другие. Это уровень L2 — органы системы.',
    action: { label: 'Открыть Backend Core', drillPath: ['org-product', 'sys-backend-core'] },
  },
  {
    id: 'links-lens',
    title: 'Линза «Связи»: кровеносная система',
    body: '_handle_message pipeline стягивает почти всё: identity, БД, LLM, скоринг, эскалацию, funnel, CRM. Один узел — четырнадцать связей.',
    action: { label: 'Показать связи', lens: 'links', selectId: 'mod-handle-message' },
  },
  {
    id: 'to-code',
    title: 'До кода',
    body: 'Через MessageRequest-схему — вниз, до самой функции: _handle_message() в main.py, 60 строк реального кода прямо в панели узла.',
    action: {
      label: 'Погрузиться до кода',
      drillPath: ['org-product', 'sys-backend-core', 'mod-handle-message', 'feat-message-req'],
      selectId: 'code-handle-message-fn',
    },
  },
  {
    id: 'finale',
    title: 'Задача для агента',
    body: 'Выбери любой узел карты — вкладка «Задача» соберёт из него готовый markdown-промпт для Claude Code. А вкладка «Спросить» — это Gemini, который видит всю карту и отвечает на вопросы о проекте.',
  },
]
