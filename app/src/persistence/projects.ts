// Черновики-проекты в localStorage — DESIGN-V2.md §4.
// salesbot НИКОГДА не читается/не пишется отсюда: он всегда из salesbot-map.json,
// программно первый элемент projects[] в сторе.

import type { MapDoc } from '../types'
import { safeRead, safeWrite, type WriteResult } from './storage'

const PROJECTS_KEY = 'cockpit.projects.v1'
export const SALESBOT_ID = 'salesbot'

export interface DraftRecord {
  id: string
  doc: MapDoc
  createdAt: string
  updatedAt: string
}

/** Минимальная проверка формы записи — защита от битых/чужих данных в ключе. */
function isDraftRecord(value: unknown): value is DraftRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string' &&
    typeof r.doc === 'object' &&
    r.doc !== null
  )
}

/** Загружает черновики (без salesbot). Битые записи по одной отбрасываются с warn, не всё разом. */
export function loadDrafts(): DraftRecord[] {
  const raw = safeRead<unknown>(PROJECTS_KEY)
  if (raw === null) return []
  if (!Array.isArray(raw)) {
    console.warn('[projects] ожидался массив черновиков, получено другое — работаю как с пустым')
    return []
  }
  const drafts: DraftRecord[] = []
  for (const item of raw) {
    if (isDraftRecord(item) && item.id !== SALESBOT_ID) {
      drafts.push(item)
    } else {
      console.warn('[projects] пропущена битая или некорректная запись черновика', item)
    }
  }
  return drafts
}

/** Полностью перезаписывает список черновиков. */
export function saveDrafts(drafts: DraftRecord[]): WriteResult {
  return safeWrite(PROJECTS_KEY, drafts)
}

/** Добавляет новый черновик (createdAt = updatedAt = сейчас) поверх сохранённых. */
export function addDraft(id: string, doc: MapDoc): WriteResult {
  const now = new Date().toISOString()
  const drafts = loadDrafts()
  drafts.push({ id, doc, createdAt: now, updatedAt: now })
  return saveDrafts(drafts)
}

/** Удаляет черновик по id. Не влияет на salesbot (его здесь и не может быть). */
export function removeDraft(id: string): WriteResult {
  const drafts = loadDrafts().filter((d) => d.id !== id)
  return saveDrafts(drafts)
}
