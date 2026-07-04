// Ручные позиции нод (драг канваса) — DESIGN-V2.md §4, §6.
// САМОДОСТАТОЧНЫЙ модуль: свои safe get/set поверх window.localStorage напрямую,
// НЕ импортирует persistence/storage.ts соседа (владелец storage.ts — волна 3,
// интегратор объединит позже — см. отчёт волны 2).

const POSITIONS_KEY = 'cockpit.positions.v1'

export interface XY {
  x: number
  y: number
}

/** Ключ тройки (проект, фокус, линза) внутри PositionsRecord. focusId=null → 'root'. */
export function positionsKeyFor(projectId: string, focusId: string | null, lens: string): string {
  return `${projectId}/${focusId ?? 'root'}/${lens}`
}

type PositionsRecord = Record<string, Record<string, XY>>

function isXY(value: unknown): value is XY {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.x === 'number' && typeof v.y === 'number'
}

/** Проверяет форму записи: объект троек → объект nodeId → {x,y}. Битые под-записи не валят всё. */
function isPositionsRecord(value: unknown): value is PositionsRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readAll(): PositionsRecord {
  const raw = window.localStorage.getItem(POSITIONS_KEY)
  if (raw === null) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.warn('[positions] битый JSON в cockpit.positions.v1, работаю как с пустым', err)
    return {}
  }
  if (!isPositionsRecord(parsed)) {
    console.warn('[positions] неожиданная форма cockpit.positions.v1, работаю как с пустым')
    return {}
  }
  return parsed
}

const WRITE_SIZE_GUARD_BYTES = 3_000_000

function writeAll(record: PositionsRecord): void {
  let serialized: string
  try {
    serialized = JSON.stringify(record)
  } catch (err) {
    console.warn('[positions] не удалось сериализовать позиции', err)
    return
  }
  if (serialized.length > WRITE_SIZE_GUARD_BYTES) {
    console.warn('[positions] запись превышает guard, пропущена')
    return
  }
  try {
    window.localStorage.setItem(POSITIONS_KEY, serialized)
  } catch (err) {
    console.warn('[positions] запись в localStorage провалилась (вероятно quota)', err)
  }
}

/** Читает сохранённые оверрайды позиций для тройки. Битые под-записи узлов отбрасываются по одной. */
export function loadPositions(
  projectId: string,
  focusId: string | null,
  lens: string,
): Record<string, XY> {
  const all = readAll()
  const bucket = all[positionsKeyFor(projectId, focusId, lens)]
  if (typeof bucket !== 'object' || bucket === null) return {}

  const clean: Record<string, XY> = {}
  for (const [nodeId, pos] of Object.entries(bucket)) {
    if (isXY(pos)) clean[nodeId] = pos
    else console.warn(`[positions] отброшена битая позиция для ноды "${nodeId}"`, pos)
  }
  return clean
}

/** Сохраняет/обновляет позицию одной ноды в тройке (merge, остальные позиции не трогает). */
export function savePosition(
  projectId: string,
  focusId: string | null,
  lens: string,
  nodeId: string,
  position: XY,
): void {
  const all = readAll()
  const key = positionsKeyFor(projectId, focusId, lens)
  const bucket = { ...(all[key] ?? {}) }
  bucket[nodeId] = position
  writeAll({ ...all, [key]: bucket })
}

/** Удаляет все оверрайды тройки (кнопка «Разложить заново»). */
export function clearPositions(projectId: string, focusId: string | null, lens: string): void {
  const all = readAll()
  const key = positionsKeyFor(projectId, focusId, lens)
  if (!(key in all)) return
  const { [key]: _removed, ...rest } = all
  writeAll(rest)
}
