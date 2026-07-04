// Ручные позиции нод (драг канваса) — DESIGN-V2.md §4, §6.
// Использует общие safe-обёртки persistence/storage.ts (единая точка quota-guard
// и обработки битого JSON) — унификация волны 4, было два параллельных набора обёрток.

import { safeRead, safeWrite } from './storage'

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
  const raw = safeRead<unknown>(POSITIONS_KEY)
  if (raw === null) return {}
  if (!isPositionsRecord(raw)) {
    console.warn('[positions] неожиданная форма cockpit.positions.v1, работаю как с пустым')
    return {}
  }
  return raw
}

function writeAll(record: PositionsRecord): void {
  const result = safeWrite(POSITIONS_KEY, record)
  if (!result.ok) {
    console.warn('[positions] запись позиций провалилась:', result.warning)
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
