# DESIGN-V2.md — Project Cockpit v2: спека реализации

> Синтез 4 дизайн-предложений + 2 вердиктов судей. Факт-чек по коду выполнен 2026-07-04
> (Canvas.tsx, projection.ts, store.ts, TopBar.tsx, CockpitNode.tsx, App.tsx, Wizard.tsx,
> types.ts, DESIGN.md, salesbot-map.json; React Flow API сверен с /websites/reactflow_dev).
> DESIGN.md остаётся законом — эта спека его не отменяет, а конкретизирует v2.
> Рамки: статика без бэкенда, read-only карта Sales Bot, НОЛЬ новых npm-зависимостей, аппетит ~1.5 недели.

---

## 0. Факт-чек: что подтверждено кодом (кодеру верить этому разделу, не пересказам)

**Баг дублей рёбер — ПОДТВЕРЖДЁН построчно:**
- `Canvas.tsx:71`: `extraEdgeIds = new Set(activeLinks.map((l) => \`hover:${l.from}->${l.to}:${l.kind}\`))`
- `projection.ts:167` (`rolledToRfEdge`): id базового ребра = `` `${link.from}->${link.to}:${link.kind}` `` — БЕЗ префикса `hover:`.
- `Canvas.tsx:72`: `projected.edges.filter((e) => !extraEdgeIds.has(e.id))` сравнивает разные строки → никогда не фильтрует.
- Следствие: на линзе «Связи» при hover/select рисуется ВТОРОЕ ребро (из `rolledToHoverEdge`, Canvas.tsx:20-34) поверх базового. На линзах blocks/risk `projected.edges` пуст — там hover-рёбра корректно аддитивны (это поведение сохранить).
- Важно: на линзе links `activeLinks ⊆ projected.edges` всегда (оба из `rollupLinks` того же уровня) — значит после фикса hover-декорация должна ЗАМЕНЯТЬ базовое ребро (тот же id), а не добавляться.

**Прочее подтверждённое:**
- `Canvas.tsx:144`: `nodesDraggable={false}`. Controls/MiniMap не импортируются нигде.
- `projection.ts:236`: линза links — dagre `{direction:'LR', nodesep:48, ranksep:120}`, ranker не задан (default network-simplex). Рёбра `type:'straight'` (центр→центр, отсюда «прошивание» нод).
- `projection.ts:172-186`: подписи — нативные `label`/`labelStyle`/`labelBgStyle` React Flow (SVG), всегда видимы → каша при плотном графе.
- `Canvas.tsx:96-98`: смена `projected` полностью заменяет nodes (намеренный ремаунт + стаггер). `Canvas.tsx:117-124`: fitView с deps `[projected, fitView]`, задержка 60ms.
- `store.ts`: `projects`/`activeProjectId`/`switchProject`/`addProject` есть; view-state, createdAt, persistence — НЕТ. `CockpitProject = { id, doc }`.
- `Wizard.tsx:275-277`: `stepIndex`/`projectName`/`answers` — `useState` компонента. F5/закрытие = потеря. `zustand/middleware persist` их НЕ захватит (предпосылка предложения №4 п.10 фактически неверна — вердикты правы).
- `Wizard.tsx:283-292`: Escape перехвачен на capture-фазе (закрывает мастер, не долетает до LensRail).
- `TopBar.tsx:97-105`: House-иконка = `jumpTo(-1)`, aria-label «В корень». Конфликт с будущей кнопкой «домой» реален.
- `types.ts`: `MapDoc.project` не содержит createdAt. Метаданные черновика класть на уровень стора/localStorage, НЕ в MapDoc (формат карты не трогаем, salesbot-map.json неприкосновенен).
- Занятые ключи localStorage: `cockpit.tourSeen`, `cockpit.hintSeen`, `cockpit.gemini.key`.
- `CockpitNode.tsx:63-64,93-94`: 4 хендла (Top/Left target, Bottom/Right source) с `opacity-0` уже есть — FloatingEdge их не использует для геометрии, но React Flow требует их наличия; не удалять.
- **Реальные данные** (`salesbot-map.json`): 112 нод / 64 связи ВСЕГО, но `project()` показывает только детей фокуса: корень = 3 ноды, максимум на уровне = 10 (sys-backend-core). «112 нод на канвасе разом» не бывает — dagre-тюнинг работает с 3-10 нодами на уровне, elkjs не нужен тем более.
- React Flow v12 API сверено с доками: `useInternalNode(id)` → `internals.positionAbsolute` + `measured.width/height`; `getBezierPath({...,curvature})`; `EdgeLabelRenderer` (div-label, `nodrag nopan`); `BaseEdge` с `interactionWidth` (default 20); `MiniMap` props `nodeColor/maskColor/bgColor/position`. Всё существует в установленном @xyflow/react ^12.11.1. Фантазий в предложениях не найдено.

---

## 1. Цель

**Метрика юзера дословно: «зашёл — ага, класс, всё понятно, серьёзно».** Разложено на проверяемое:
первый экран — список проектов (а не чужая карта); линза «Связи» — ни одно ребро не прошивает ноду, ни одна подпись не накладывается; блоки двигаются рукой и позиции переживают F5; черновик мастера не сгорает; у канваса есть зум/миникарта/«разложить заново». Приёмка — скриншотами (§10), не «код смёржен».

---

## 2. IA: view-state дом ↔ карта

**Без роутера** (решение судей единогласно: весь nav-стейт — path/lens/rightTab — уже в zustand; react-router ради бинарного переключателя — избыточен).

### store.ts — добавить в CockpitState:

```ts
view: 'home' | 'map'          // начальное значение: 'home'
goHome: () => void            // set({ view: 'home' }) — path/selectedId/lens НЕ трогать:
                              // возврат в проект показывает то же место, где был
openProject: (id: string) => void  // = switchProject(id) + set({ view: 'map' })
```

- `addProject` (финиш мастера) дополнительно вызывает `set({ view: 'map' })` через существующий `switchProject` → `openProject` семантика.
- Начальный `view: 'home'` всегда (не запоминать последний view — предсказуемый холодный старт, «портфельное» ощущение).

### App.tsx:

```tsx
const view = useCockpitStore((s) => s.view)
// view === 'home' → <Home onOpenWizard={...} />  (полноэкранный, без TopBar/LensRail/RightPanel)
// view === 'map'  → текущий каркас (TopBar + Canvas + LensRail + RightPanel) без изменений
// Wizard рендерится поверх ОБОИХ view (открывается и с Home, и с карты)
```

### TopBar.tsx — развязка двух House:

1. Текущая кнопка House («В корень», `jumpTo(-1)`, строки 97-105) — **переназначить**: `onClick={goHome}`, `aria-label="Ко всем проектам"`, `title="Ко всем проектам"`. Позиция: ПЕРВЫЙ элемент шапки, слева от ProjectSwitcher.
2. Функцию «в корень карты» отдать крошкам: перед существующим `crumbs.map(...)` добавить постоянную первую крошку — mono `L0` + `doc.project.name` (truncate max-w-[20ch]), `onClick={() => jumpTo(-1)}`; когда `path.length === 0` она подсвечена как isLast (`text-accent`), иначе `text-ink-dim hover:text-ink`. Паттерн 1-в-1 как существующие крошки (TopBar.tsx:108-132).
3. Итоговый порядок шапки: `[House→Home] [ProjectSwitcher ▾] [крошки: L0 · L1 · …] [спейсер] [Экскурсия] [Новый проект]`.
4. Опционально-если-время (вердикты разошлись: adopt vs adoptLater — решение: делать только если волна 3 идёт с опережением): мини-лого зона — 20×20px rounded-md bg-surface-2 монограмма `PC` font-mono 10px text-ink-dim перед House, скрыта на <md. Никакого текста «Project Cockpit» в шапке — Home теперь даёт продукту личность.

**Escape НЕ выходит на Home** (неожиданно, риск потери контекста; Escape уже занят: мастер — закрыть, LensRail — up()). Навигация домой — только явный клик.

---

## 3. Домашний экран — `src/ui/Home.tsx` (новый файл)

Тон: сухой инструмент, sentence case, без восклицаний и «Добро пожаловать» (PRODUCT.md anti-references).

### Раскладка (токены DESIGN.md):

```
bg (полный экран, overflow-y-auto)
└─ колонка max-w-2xl mx-auto px-6 py-16 (десктоп) / px-4 py-8 (мобайл)
   ├─ шапка-строка (flex items-baseline justify-between mb-8):
   │   ├─ h1: «Проекты» — text-lg font-medium tracking-tight text-ink
   │   │   + рядом счётчик font-mono text-[13px] text-ink-faint (напр. «3»)
   │   └─ кнопка «Новый проект» (хедлайн-действие, крупнее чем в TopBar):
   │       border border-accent-dim bg-accent/12 text-accent rounded-lg px-4 py-2
   │       text-[14px] hover:bg-accent/20 active:scale-[0.98], иконка Plus 16
   └─ список: divide-y divide-line (НЕ плитки-карточки — DESIGN.md бан «3 равные карточки»)
       └─ строка проекта = <button> на всю ширину, text-left, px-3 py-4 rounded-lg
          hover:bg-surface-2 transition-colors, focus-visible:ring-2 ring-accent/20
```

### Содержимое строки проекта:

```
[имя: text-[14px] font-medium text-ink truncate]  [«демо» chip — только salesbot]
[about: text-[13px] text-ink-dim truncate, 1 строка]     ← doc.project.about ?? doc.project.desc
[сводка: font-mono text-[11px] text-ink-faint]           ← из countByKind(doc)+attentionNodes(doc)
  «6 систем · 34 модуля · 54 фичи · 11 зон внимания»
  точка 6px bg-warn перед «зон внимания», только если attentionNodes(doc).length > 0
[справа: font-mono text-[11px] text-ink-faint] — дата updatedAt черновика («обновлён 2 июл»);
  у salesbot вместо даты chip «демо-слепок» (border border-line rounded-full px-1.5 text-[10px])
```

- Данные сводки — переиспользовать `countByKind()` / `attentionNodes()` из `graph/docStats.ts` 1:1, не изобретать.
- Порядок: salesbot всегда первый, дальше черновики по `updatedAt` убыв. (MRU). Сортировка НЕ настраиваемая.
- Клик по строке ЦЕЛИКОМ → `openProject(id)`.
- Поиск/фильтр — НЕ делать, пока проектов ≤5 (порог из предложения №1, судьи согласны).

### Удаление черновика (только `isDraft`; у salesbot кнопки нет вообще):

- Иконка Trash (phosphor, 16, text-ink-faint) появляется на hover строки справа, `hover:text-risk`.
- Клик → инлайн-подтверждение В ТОЙ ЖЕ строке (не browser confirm()): контент строки заменяется на
  `«Удалить „{name}“?» [Удалить: text-risk border border-risk/50 rounded-lg px-3 py-1] [Отмена: text-ink-dim]`,
  spring-транзишен (stiffness 260 damping 26 — как везде).
- Только явный клик «Удалить» стирает из `projects[]` стора И из `cockpit.projects.v1`. Отмена/клик-мимо возвращает строку.
- Если удаляемый проект был `activeProjectId` → активным становится `salesbot` (сброс path/selectedId через switchProject).

### Empty-state:
salesbot неудаляем, поэтому «пустого» списка не бывает. Если черновиков нет — под salesbot одна строка-хинт: text-[13px] text-ink-faint «Черновики появятся здесь — начни с кнопки „Новый проект“». Не рисовать отдельную empty-композицию.

### Онбординг (слепое пятно, найденное судьями — решение):
- Пульс-точка тура остаётся на кнопке «Экскурсия» в TopBar (логика `cockpit.tourSeen` без изменений) — сработает при первом входе В КАРТУ, не на Home.
- `CanvasHint` (`cockpit.hintSeen`) — без изменений, живёт в map-view.
- Home сам туров не имеет: список из ≤5 строк не требует объяснений.

---

## 4. Persistence — схема localStorage

Всё — нативный `window.localStorage`, точечно. **НЕ** `zustand/middleware persist` (сериализовал бы doc/path/lens, а answers мастера вообще вне стора — см. §0). Новый модуль `src/persistence/storage.ts` c общими safeRead/safeWrite + модули `projects.ts`, `positions.ts`.

### Ключи (существующие не трогаем):

| Ключ | Формат | Что хранит |
|---|---|---|
| `cockpit.tourSeen` | `'1'` | (существует) тур запускался |
| `cockpit.hintSeen` | `'1'` | (существует) хинт канваса показан |
| `cockpit.gemini.key` | string | (существует) ключ Gemini |
| **`cockpit.projects.v1`** | `DraftRecord[]` | черновики-проекты (БЕЗ salesbot) |
| **`cockpit.wizardDraft.v1`** | `WizardDraftRecord` | незаконченное интервью мастера |
| **`cockpit.positions.v1`** | `PositionsRecord` | ручные позиции нод |

```ts
interface DraftRecord {
  id: string
  doc: MapDoc          // целиком
  createdAt: string    // ISO
  updatedAt: string    // ISO
}
// salesbot НИКОГДА не пишется в storage и не читается оттуда: он всегда из salesbot-map.json,
// always read-only, первый элемент projects[] программно.
// Загрузка при старте: projects = [{id:'salesbot', doc: demoMap}, ...loadDrafts()]
// CockpitProject расширить: { id, doc, isDraft: boolean, createdAt?: string, updatedAt?: string }

interface WizardDraftRecord {
  projectName: string
  answers: WizardAnswers
  stepIndex: number
  updatedAt: string
}

type PositionsRecord = Record<string /* `${projectId}/${focusId ?? 'root'}/${lens}` */,
                              Record<string /* nodeId */, { x: number; y: number }>>
```

### Поведение мастера (Wizard.tsx):

- Автосейв в `cockpit.wizardDraft.v1`: debounce 500ms на изменение answers/projectName + немедленно на смену шага.
- При открытии мастера, если ключ существует и `projectName || answers` непусты → над шагом 0 инлайн-плашка (border border-line rounded-lg p-3, text-[13px]): «Есть незаконченный черновик от {дата}» `[Продолжить]` `[Начать заново]`. Явный выбор, не молчаливая перезапись. «Начать заново» очищает ключ.
- `handleFinish`: ключ `cockpit.wizardDraft.v1` удаляется, проект уходит в `cockpit.projects.v1` (через addProject → persistDrafts).
- Закрытие мастера (X/Escape) черновик НЕ удаляет — в этом смысл.

### Деградация (обязательна, не try/catch-и-молчание):

- **Чтение**: `JSON.parse` в try/catch + минимальная проверка формы (Array.isArray, наличие id/doc). Битые данные → `console.warn`, работать как с пустыми, ключ НЕ перезаписывать и НЕ удалять до первой успешной записи пользователем (не стирать данные молча — правило юзера).
- **Запись**: try/catch на QuotaExceededError. Мягкий guard: если `JSON.stringify(drafts).length > 3_000_000` — запись пропустить и показать инлайн-предупреждение в мастере/Home: «Не удалось сохранить черновик — хранилище браузера переполнено». Типичный MapDoc мастера 5-15KB — guard практически недостижим, но тихое падение запрещено.
- **Кросс-таб sync** — вне скоупа v2 (статика без бэкенда), задокументировано. `storage`-listener не делаем.
- Версия в ключе (`.v1`): при будущей смене формата — функция миграции читает старый ключ, пишет новый, старый не удаляет.

---

## 5. Линза «Связи» — главный техпуть

**Выбрано (оба вердикта, ранг №1): floating-edges + bezier + EdgeLabelRenderer + dagre-тюнинг. Ноль новых зависимостей.**

### 5.1 Первый коммит всего v2 — фикс дублей (Canvas.tsx)

Единый источник формата id — экспортировать из projection.ts:

```ts
// projection.ts — новый экспорт, использовать в rolledToRfEdge И в Canvas:
export function edgeId(l: { from: string; to: string; kind: LinkKind }): string {
  return `${l.from}->${l.to}:${l.kind}`
}
```

`decoratedEdges` в Canvas.tsx переписать с «дубль поверх» на «декорация флагом»:

```ts
const decoratedEdges = useMemo(() => {
  if (activeId === null) return projected.edges
  const activeLinks = visibleRolled.filter((l) => l.from === activeId || l.to === activeId)
  const activeIds = new Set(activeLinks.map(edgeId))
  const projectedIds = new Set(projected.edges.map((e) => e.id))
  // линза links: помечаем существующие рёбра active/passive (id НЕ меняется — React Flow
  // обновляет edge на месте, без remove+add);
  const base = projected.edges.map((e) => ({
    ...e,
    data: { ...e.data, active: activeIds.has(e.id), passive: !activeIds.has(e.id) },
  }))
  // линзы blocks/risk (projected.edges пуст): hover-рёбра аддитивны, id в ТОМ ЖЕ формате edgeId()
  const extra = activeLinks
    .filter((l) => !projectedIds.has(edgeId(l)))
    .map(rolledToHoverEdge) // внутри id: edgeId(link), БЕЗ префикса 'hover:'
  return [...base, ...extra]
}, [projected.edges, visibleRolled, activeId])
```

Префикс `hover:` удаляется из кодовой базы полностью. Юнит-тест: `edgeId()` одинаков для rolledToRfEdge и hover-пути (фиксирует класс бага навсегда).

### 5.2 Новый компонент `src/ui/FloatingEdge.tsx`

Паттерн — официальный floating-edges example React Flow v12 (API сверен: `useInternalNode`, `internals.positionAbsolute`, `measured.width/height`, `getBezierPath`, `BaseEdge`, `EdgeLabelRenderer` — всё есть в @xyflow/react 12.11.1):

```tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, useInternalNode } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

// getEdgeParams: по центрам двух нод (internals.positionAbsolute + measured.width/height / 2)
// найти точку пересечения линии центр→центр с прямоугольником каждой ноды и сторону
// (Position.Left/Right/Top/Bottom) по доминирующей оси. ~40 строк, портировать из
// официального примера floating-edges (utils.ts).

export function FloatingEdge({ id, source, target, data, style }: EdgeProps) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  if (!sourceNode || !targetNode) return null
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode)
  const [path, labelX, labelY] = getBezierPath({
    sourceX: sx, sourceY: sy, sourcePosition: sourcePos,
    targetX: tx, targetY: ty, targetPosition: targetPos,
    curvature: 0.2,
  })
  // стили из data.active/passive — см. 5.4; interactionWidth оставить дефолт 20
  return (
    <>
      <BaseEdge id={id} path={path} style={computedStyle} interactionWidth={20} />
      {showLabel ? (
        <EdgeLabelRenderer>
          <div className="nodrag nopan pointer-events-none absolute rounded border border-line
                          bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-dim"
               style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)` }}>
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
```

Регистрация: `const edgeTypes = { floating: FloatingEdge }` в Canvas.tsx (мемо-константа на уровне модуля, как nodeTypes) + `edgeTypes={edgeTypes}` в `<ReactFlow>`.

### 5.3 projection.ts — изменения

- `rolledToRfEdge`: `type: 'floating'`; УДАЛИТЬ `label`, `labelStyle`, `labelBgStyle`, `labelBgPadding`, `labelBgBorderRadius` (нативный SVG-label — источник каши); данные для подписи уже в `data` (kind/labels/count). id через `edgeId(link)`.
- `rolledToHoverEdge` (Canvas.tsx): `type: 'floating'`, id = `edgeId(link)`, `data: {..., active: true}`.
- Строка 241 (`type: 'straight'` в links-ветке project()) — убрать переопределение, наследуется 'floating'.
- dagre для линзы links (строка 236): `{ direction: 'LR', nodesep: 64, ranksep: 160 }` + в `g.setGraph` добавить `ranker: 'tight-tree'`. Направление остаётся LR (вердикты: TB отклонён как параллельная фича; разрешён только как ≤1-дневный эксперимент при реализации, ЕСЛИ скриншот-приёмка на LR провалится — решение фиксируется скриншотом, не вкусом).
- Линза tree и grid-раскладка blocks/risk — БЕЗ изменений.

### 5.4 Стратегия стилей и подписей (точные значения)

| Состояние ребра | stroke | width | dash | opacity |
|---|---|---|---|---|
| base (ничего не наведено) | `var(--color-accent-dim)` | 1.5 | `6 4` | 0.6 |
| active (`data.active`: инцидентно hover/select ноде) | `var(--color-accent)` | 2 | `6 4` | 0.9 |
| passive (`data.passive`: активна другая нода) | `var(--color-accent-dim)` | 1.5 | `6 4` | 0.15 |

Подпись (чип из 5.2): показывать когда `data.active === true` ИЛИ общее число рёбер уровня ≤ 12 (порог из предложения №2, судьи приняли; на реальном слепке уровни ≤10 нод — чипы чаще видимы, и это ок). Текст: `labels[0] ?? kind` + ` +${count-1}` при count>1 (текущая формула projection.ts:172). `pointer-events-none` — чип не перехватывает hover нод. Переходы opacity/stroke — CSS transition 150ms (не JS-анимация).

`interactionWidth` — оставить дефолт 20 (сверено: default BaseEdge = 20 ≥ требуемых судьями 12), прописать явно для читаемости.

### 5.5 Запасной путь (contingency, НЕ планировать в аппетит)

Если после 5.1-5.4 скриншот-приёмка (§10) на уровне sys-backend-core (10 нод) всё ещё проваливается — радиальная хаб-раскладка вокруг selected-ноды (~40 строк чистой геометрии Math.cos/sin в projection.ts, выбранная нода в центре, связи веером, несвязанные во внешнем кольце через существующий dimmed). Включается при select, выключается при deselect. Это M-эффорт — только по решению Team Lead после замера.

### 5.6 elkjs — отклонён (фиксация решения)

1.6MB минифицированного GWT-воркера (проверено скачиванием tarball: elk-worker.min.js = 1 593 716 байт) против бандла 640KB = рост 2.5-3× ради orthogonal-routing на уровнях по 3-10 нод. Пересмотр — только после измеренного провала 5.1-5.5 на живом слепке. То же: react-router, react-hotkeys-hook, zustand persist middleware — НЕ вводить (§9).

---

## 6. Драг нод

### Поведение

- `Canvas.tsx:144`: `nodesDraggable={true}`.
- `onNodeDragStop={(_, node) => savePosition(activeProjectId, focusId, lens, node.id, node.position)}` — пишет в `cockpit.positions.v1` (ключ-тройка `${projectId}/${focusId ?? 'root'}/${lens}`). Debounce не нужен — dragStop стреляет один раз.
- Сам драг идёт через уже подключённый `onNodesChange` (`useNodesState` → `applyNodeChanges`) — React Flow сам обрабатывает position-changes, `projected` не пересчитывается, стаггер не переигрывается, fitView не срабатывает (deps `[projected, fitView]` не тронуты). Это подтверждено текущей архитектурой Canvas.tsx.

### Восстановление позиций — КРИТИЧНО против «прыжка»

Оверрайды применяются ВНУТРИ `project()` ДО первого рендера (не патчем после):

```ts
// projection.ts: 4-й опциональный параметр
export function project(doc, path, lens, overrides?: Record<string, {x:number;y:number}>)
// после layout()/gridLayout(): position = overrides?.[n.id] ?? computed
```

```ts
// Canvas.tsx: снапшот оверрайдов читается из localStorage ОДИН раз на вход в уровень,
// НЕ реактивен к записям dragStop (иначе каждый drag-stop → новый projected →
// полный setNodes → ремаунт всех нод + повтор стаггера + fitView. ЗАПРЕЩЕНО.)
const [layoutNonce, setLayoutNonce] = useState(0) // локальный state, НЕ стор
const overrides = useMemo(
  () => loadPositions(activeProjectId, focusId, lens),
  [activeProjectId, focusId, lens, layoutNonce],
)
const projected = useMemo(() => project(doc, path, lens, overrides), [doc, path, lens, overrides])
```

### «Разложить заново»

- Кнопка в `CanvasOverlay.tsx` (правый-верх канваса, рядом с существующим оверлеем): иконка ArrowsClockwise (phosphor 16), стиль второстепенной кнопки TopBar (`border border-line rounded-lg px-3 py-1.5 text-[13px] text-ink-dim hover:bg-surface-2 hover:text-ink active:scale-[0.98]`), текст «Разложить заново».
- Видима ТОЛЬКО когда для текущей тройки (projectId,focusId,lens) есть сохранённые оверрайды (не засорять дефолтное состояние).
- onClick: удалить запись тройки из `cockpit.positions.v1` → `setLayoutNonce(n => n+1)` → memo перечитывает пустые оверрайды → авто-layout → существующий fitView-эффект срабатывает сам (projected изменился). Ремаунт+стаггер при этом — ожидаемое «пересобрал уровень».

### Физика (в той же волне, дёшево)

- `CockpitNode.tsx`: обёртке добавить `cursor-grab active:cursor-grabbing`.
- motion.div: `whileDrag={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}` — тонированная тень, НЕ glow (DESIGN.md). `whileHover 1.01` остаётся, framer сам не триггерит hover во время чужого драга.
- FloatingEdge при драге пересчитывается сам (useInternalNode ре-рендерит на движение ноды) — рёбра «тянутся» за нодой живьём. Перф-риск при ≤10 нод/уровень — незначим; проверить один раз профайлером при приёмке.

---

## 7. Контролы, миникарта, клавиатура

### Зум-контролы — СВОИ, не `<Controls>`

Дефолтные Controls React Flow = белые SVG-иконки, чужой стиль — проще собрать свой блок (~30 строк), чем перекрашивать `.react-flow__controls-button`:

- В `CanvasOverlay.tsx`, позиция bottom-left канваса (absolute, отступ 16px), вертикальный столбик из 3 кнопок 28×28: `MagnifyingGlassPlus` / `MagnifyingGlassMinus` / `CornersOut` (phosphor, 16, weight="regular").
- Действия: `zoomIn()` / `zoomOut()` / `fitView({ duration: 300, padding: 0.15, maxZoom: 1.15 })` из `useReactFlow()`.
- Стиль: `bg-surface border border-line rounded-lg text-ink-dim hover:bg-surface-2 hover:text-ink active:scale-[0.98]`, столбик `divide-y divide-line` в общем контейнере border. z-index 10 (шкала DESIGN.md: панели).
- У каждой кнопки aria-label + title («Приблизить», «Отдалить», «Вписать в экран») — бан немых иконок.

### MiniMap — встроенная, стилизованная

```tsx
{projected.nodes.length > 12 ? (
  <MiniMap
    position="bottom-right"
    pannable zoomable
    nodeColor={(n) => STATUS_HEX[(n as CockpitRfNode).data.mapNode.status]}
    maskColor="rgba(11,14,20,0.8)"          /* --color-bg / 80% */
    bgColor="var(--color-surface)"
    style={{ border: '1px solid var(--color-line)', borderRadius: 10 }}
  />
) : null}
```

- `STATUS_HEX` — новая константа рядом с `STATUS_DOT_CLASS` в docStats.ts (hex-значения токенов ok/warn/risk/todo — CSS-переменные в SVG-атрибут nodeColor надёжнее хексами).
- Порог `> 12` (не 30 из предложения №3): факт-чек показал, что видимых нод на уровне максимум 10 — с порогом 30 миникарта не появилась бы НИКОГДА. С 12 — не появится на текущем слепке тоже (и это честно: миникарта над 6 нодами — шум), но заработает на будущих больших уровнях. Отступ от LensRail учесть (position right — конфликта нет, рейл слева).

### Клавиатура — только если волны 0-3 закрыты с запасом (adoptLater у обоих судей)

`+`/`=`/`-` → zoomIn/zoomOut; `0` → fitView; `1-4` → setLens по порядку `['blocks','links','risk','tree']`. Guard: `document.activeElement` — input/textarea/contenteditable → игнор. Vanilla keydown-слушатель (паттерн уже дважды в коде: LensRail, Wizard), НЕ react-hotkeys-hook. Escape не трогать.

---

## 8. Визуальная серьёзность — приоритизированные правки

По убыванию влияния на «зашёл — серьёзно»:

1. **Рёбра не прошивают ноды + подписи не каша** — §5 целиком (главная претензия скриншота).
2. **Дубль рёбер на hover устранён** — §5.1 (первый коммит).
3. **Блоки двигаются** + cursor-grab/grabbing + whileDrag scale 1.03 / тень `0 8px 24px rgba(0,0,0,0.35)` — §6.
4. **Зум-контролы + миникарта в токенах** (не белые дефолты — они сами по себе AI-slop-сигнал) — §7.
5. **Home как первый экран** — §3; тон: «Проекты» + счётчик, никакого маркетинга.
6. **Одна недвусмысленная House-иконка** (= Home), корень карты — через крошку L0 — §2.
7. **Черновики переживают F5** (мастер + проекты) — §4.
8. Опционально: монограмма PC в шапке — §2 п.4.

Не входит в v2 (adoptLater обоих судей): визуальная иерархия нод по kind (L1 жирнее границы/заголовок), центрирование пустого grid, клавиатура (см. §7).

---

## 9. SCOPE-граница — явно НЕ делаем в v2

| Что | Почему |
|---|---|
| elkjs | 1.6MB воркер vs 640KB бандл; уровни ≤10 нод — решается floating+dagre (§5.6) |
| react-router | view-переключатель в zustand, паттерн проекта |
| zustand persist middleware | answers мастера вне стора — не захватит; ручной localStorage точнее |
| react-hotkeys-hook | vanilla-паттерн в коде уже дважды |
| dagre LR → TB | отклонён; только ≤1-дневный эксперимент при провале приёмки LR |
| Радиальная хаб-раскладка | contingency §5.5, не планировать |
| Тюнинг нативных SVG-label (labelBgPadding/stroke) | superseded EdgeLabelRenderer |
| Иерархия нод по kind/уровню (веса границ L1 vs L2+) | adoptLater, M-эффорт не влезает |
| Центрирование grid / gap-тюнинг малых уровней | micro-polish, adoptLater |
| Кросс-таб sync черновиков (storage listener) | статика, принятое ограничение (§4) |
| Поиск/фильтр на Home | порог >5 проектов не достигнут |
| Сортировка Home настраиваемая | один порядок: salesbot + MRU |
| Escape → Home | опасно, контекст теряется |
| Легенда статусов на Home | дублирование (легенда одна — в ProjectOverview) |
| Бэкенд / share-ссылки / URL-стейт | чартер v2 |

---

## 10. Волны реализации + матрица конфликтов + тесты

Аппетит ~1.5 недели (7-8 рабочих дней). Судьи сошлись: E2E-обновление съест ~1.5-2 дня — оно заложено волной 4, не «потом».

### Волна 0 — «стоп-кровотечение» (0.5 дня, один кодер)
- **Файлы:** `Canvas.tsx`, `projection.ts` (только экспорт `edgeId`).
- Фикс дублей §5.1 (декорация флагом, без префикса hover:) + юнит-тест на `edgeId`.
- Скриншот-БАЗЛАЙН «до»: Playwright-скрины линзы «Связи» на корне и на sys-backend-core, с hover — кладутся в `.planning/v2-baseline/`.

### Волна 1 — линза «Связи» (2.5 дня, кодер A)
- **Файлы:** NEW `src/ui/FloatingEdge.tsx`; `projection.ts` (rolledToRfEdge → floating, снятие label*, dagre 64/160/tight-tree); `Canvas.tsx` (edgeTypes, стили active/passive в data).
- Полностью §5.2-5.4. Приёмка скриншотами (см. ниже) ДО мерджа.

### Волна 2 — драг + контролы (2 дня, кодер A, строго ПОСЛЕ волны 1 — те же файлы)
- **Файлы:** `Canvas.tsx` (draggable, onNodeDragStop, overrides-мемо, layoutNonce, MiniMap); `projection.ts` (4-й параметр overrides); `CanvasOverlay.tsx` (зум-кнопки, «Разложить заново»); `CockpitNode.tsx` (cursor, whileDrag); NEW `src/persistence/positions.ts`, NEW `src/persistence/storage.ts`; `docStats.ts` (STATUS_HEX).
- Полностью §6-7 (без клавиатуры).

### Волна 3 — оболочка (3 дня, кодер B, ПАРАЛЛЕЛЬНО волнам 1-2)
- **Файлы:** NEW `src/ui/Home.tsx`; `store.ts` (view/goHome/openProject, CockpitProject+isDraft/даты, загрузка черновиков при старте); `App.tsx` (ветвление view); `TopBar.tsx` (House→Home, крошка L0, [опц.] монограмма); `Wizard.tsx` (автосейв, плашка «Продолжить»); NEW `src/persistence/projects.ts` (+ общий `storage.ts` — см. конфликт ниже).
- Полностью §2-4.

### Волна 4 — E2E + приёмка + полиш (1.5-2 дня, оба)
- Обновить все 5 спеков (`map-navigation`, `wizard`, `guide`, `lenses`, `node-panel`) — Home ломает КАЖДЫЙ (карта больше не первый экран): общий хелпер `openSalesbot(page)` (зайти → кликнуть строку salesbot). Обновить `tests/e2e/SCENARIOS.md`.
- Новые E2E: `home.spec.ts` (список, открытие, создание из мастера появляется в списке, удаление с подтверждением, salesbot без Trash); `drag.spec.ts` (подвинул ноду → F5 → позиция сохранена → «Разложить заново» → авто-layout); дополнение `lenses.spec.ts` (на hover число `path.react-flow__edge-path` НЕ растёт на линзе links); `wizard.spec.ts` (заполнил шаг → reload → плашка «Продолжить» → данные на месте).
- Клавиатура (§7) — только если остаётся ≥0.5 дня.

### Матрица конфликтов (кто владеет файлом в какую волну)

| Файл | W0 | W1 | W2 | W3 | Правило |
|---|---|---|---|---|---|
| Canvas.tsx | A | A | A | — | последовательно A |
| projection.ts | A | A | A | — | последовательно A |
| CockpitNode.tsx | — | — | A | — | только W2 |
| CanvasOverlay.tsx | — | — | A | — | только W2 |
| store.ts | — | — | — | B | только B (layoutNonce живёт в Canvas-useState, НЕ в сторе — развязка) |
| TopBar.tsx / Wizard.tsx / App.tsx / Home.tsx | — | — | — | B | только B |
| persistence/storage.ts | — | — | A? | B | **владелец B** (создаёт в начале W3), A импортирует; если W2 стартует раньше — B выделяет storage.ts первым коммитом W3 |
| docStats.ts | — | — | A | — | STATUS_HEX, точечно |

Единственное реальное пересечение — `persistence/storage.ts`: снимается порядком «B коммитит storage.ts первым».

### Критерий приёмки глазами (обязателен, до мерджа W1 и W2)

Playwright-скриншоты на живом слепке Sales Bot, сравнение с базлайном W0:
1. Линза «Связи», корень (3 ноды) и sys-backend-core (10 нод): **0 рёбер, пересекающих тело ноды; 0 наложенных друг на друга подписей; 0 дублей рёбер при hover**.
2. Драг: нода сдвинута → скрин → F5 → скрин идентичен (позиция та же).
3. Home: первый экран, строка salesbot со сводкой «6 систем · 34 модуля · 54 фичи».
Провал п.1 на LR → 1 день на TB-эксперимент (§5.3) → снова скрин → решение Team Lead. «Готово» = скрины приложены к PR, не «код смёржен» (урок v1.1 и EVENT AI).
