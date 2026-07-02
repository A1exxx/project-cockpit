# Task: Project Cockpit — демо-версия v1
Date: 2026-07-03
Gear: 3 (Full Lifecycle)
Status: Complete (verified, deployed)

## Summary
Построена и задеплоена кликабельная демо визуального «кокпита» проекта: карта слоями L0→L4 на реальном слепке Deadline Sales Bot (112 узлов, 64 связи), 4 линзы, панель узла с кодом, AI-гид (тур + Gemini BYO + «Задача для агента»), мастер «Новый проект». LIVE: https://a1exxx.github.io/project-cockpit/

## Agent Work
- Research ×2 (Opus-план / Sonnet-исполнение): фреймворки финиша; ландшафт code-map инструментов (build-vs-buy).
- Слепок Sales Bot: Sonnet-цепочка (верификация репо → 109 нод L1-L4 через точечный Read — jcodemunch лежал).
- Wave 1 (ядро карты, TDD 13 тестов) · Wave 2a (панель узла) ∥ Wave 2b (AI-гид) · Wave 3 (мастер) — Sonnet-агенты, файловая собственность без конфликтов.
- Scenario Architect: 26 E2E-сценариев, SCENARIOS.md. Ревью ×2: spec-compliance (8/9 → 9/9 после деплоя), code quality (0 CRITICAL/HIGH; 2 MED-фикса применены).
- Team Lead (Opus): дизайн-система (ui-ux-pro-max + taste-skill → DESIGN.md), интеграции, все интеграционные фиксы, impeccable-polish, деплой.

## Files Changed
Весь репозиторий A1exxx/project-cockpit создан с нуля: CHARTER.md, SPEC.md, app/ (Vite+React19+TS+Tailwind v4+React Flow+Zustand; src: types/store/graph/ui/guide/wizard/data), tests/e2e (6 spec-файлов + SCENARIOS.md), DESIGN.md, PRODUCT.md. 17 коммитов.

## Verification Evidence
| Check | Результат |
|---|---|
| Unit tests | `Test Files 5 passed · Tests 77 passed (77)` |
| Build | `✓ built in 868ms` (exit 0) |
| Lint (oxlint) | пусто, exit 0 |
| E2E | `26 passed (1.4m)` — два стабильных прогона |
| Live desktop | verify-live: 6/6 (drill, линзы Риск/Связи, скрины) |
| Live mobile 375px | карта рендерится, горизонтального скролла нет |
| Spec-compliance | 9/9 Done-чеклиста c file:line; read-only исчерпывающе; ключей в бандле нет |
| Дата-убийца | 2026-07-13 — отгружено 03.07, с запасом 10 дней |

## How to Verify
1. Открыть https://a1exxx.github.io/project-cockpit/ — 3 бизнес-блока.
2. Даблклик «Продукт / разработка» → 6 систем; линза «Риск» → янтарный Instagram-модуль.
3. Даблклик Backend Core → 10 модулей; линза «Связи» → рёбра сходятся на _handle_message.
4. Вглубь до `_handle_message()` → в панели реальный Python из main.py.
5. Таб «Гид» → экскурсия 8 шагов; сегмент «Задача» → markdown для Claude Code.
6. «Новый проект» → «Заполнить примером» → 6 шагов → карта-черновик пунктиром, свитчер в шапке.

## Известные хвосты (не блокеры)
- Мусор скаффолда не удалён без разрешения: app/src/App.css, app/src/assets/*.svg, app/src/data/demo-map.json (мертвы, ни на что не влияют).
- Бандл 640KB gzip 201KB (React Flow+dagre+motion) — code-splitting в бэклог v2.
- Runtime-валидация MapDoc — обязательна перед v2 (внешние данные).
- jcodemunch read-path outage — отдельная чип-задача создана ранее.
