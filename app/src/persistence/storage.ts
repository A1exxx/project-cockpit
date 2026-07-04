// Безопасные обёртки над window.localStorage — DESIGN-V2.md §4.
// Битые данные не удаляются молча (правило юзера), запись защищена quota-guard'ом.

/** Мягкий потолок на сериализованный размер записи — типичный черновик 5-15KB, недостижим на практике. */
const WRITE_SIZE_GUARD_BYTES = 3_000_000

/**
 * Читает и парсит JSON по ключу. При отсутствии ключа возвращает null.
 * При битом JSON — console.warn и null (ключ НЕ трогается: не стирать данные молча).
 */
export function safeRead<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    console.warn(`[storage] битый JSON по ключу "${key}", работаю как с пустым`, err)
    return null
  }
}

export interface WriteResult {
  ok: boolean
  /** Заполнено, когда ok === false — показать пользователю. */
  warning?: string
}

/**
 * Пишет значение как JSON по ключу. Guard на размер (~3MB) и try/catch на QuotaExceededError —
 * тихое падение записи запрещено, вызывающий код обязан показать warning из результата.
 */
export function safeWrite(key: string, value: unknown): WriteResult {
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch (err) {
    console.warn(`[storage] не удалось сериализовать значение для ключа "${key}"`, err)
    return { ok: false, warning: 'Не удалось сохранить — данные повреждены.' }
  }

  if (serialized.length > WRITE_SIZE_GUARD_BYTES) {
    console.warn(`[storage] запись по ключу "${key}" превышает guard (${serialized.length} байт), пропущена`)
    return { ok: false, warning: 'Не удалось сохранить черновик — хранилище браузера переполнено.' }
  }

  try {
    window.localStorage.setItem(key, serialized)
    return { ok: true }
  } catch (err) {
    console.warn(`[storage] запись по ключу "${key}" провалилась`, err)
    return { ok: false, warning: 'Не удалось сохранить черновик — хранилище браузера переполнено.' }
  }
}

/** Удаляет ключ. Используется только для явных пользовательских действий (удаление черновика, «начать заново»). */
export function safeRemove(key: string): void {
  window.localStorage.removeItem(key)
}
