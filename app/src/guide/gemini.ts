// BYO-key клиент Gemini для режима «Спросить» (SPEC.md §4, Аналитик).
// Ключ живёт только в localStorage браузера — никогда в коде/билде.
import type { MapDoc } from '../types'

const STORAGE_KEY = 'cockpit.gemini.key'
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const DIGEST_CHAR_LIMIT = 2500

export function getKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // localStorage недоступен (приватный режим, квота) — тихо игнорируем,
    // UI просто продолжит запрашивать ключ.
  }
}

export function clearKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // см. setKey
  }
}

/** Компактный текстовый дайджест карты для системного контекста Gemini. */
export function buildMapDigest(doc: MapDoc): string {
  const lines: string[] = []

  lines.push(`Проект: ${doc.project.name}`)
  if (doc.project.stack.length > 0) {
    lines.push(`Стек: ${doc.project.stack.join(', ')}`)
  }

  const systems = doc.nodes.filter((n) => n.level === 1)
  if (systems.length > 0) {
    lines.push('Системы (L1):')
    for (const sys of systems) {
      const childCount = doc.nodes.filter((n) => n.parent === sys.id).length
      lines.push(`- ${sys.title} [${sys.status}], узлов внутри: ${childCount}`)
    }
  }

  const flagged = doc.nodes.filter((n) => n.status === 'warn' || n.status === 'risk' || n.status === 'todo')
  if (flagged.length > 0) {
    lines.push('Внимание/риски/недоработки:')
    for (const n of flagged) {
      const note = n.meta?.note ? ` — ${n.meta.note}` : ''
      lines.push(`- [${n.status}] ${n.title}${note}`)
    }
  }

  lines.push(`Связей в карте: ${doc.links.length}`)

  const digest = lines.join('\n')
  return digest.length > DIGEST_CHAR_LIMIT ? digest.slice(0, DIGEST_CHAR_LIMIT) : digest
}

export type GeminiErrorKind = 'bad-key' | 'rate-limit' | 'network'

export type GeminiResult = { ok: true; text: string } | { ok: false; error: GeminiErrorKind }

const SYSTEM_PREAMBLE =
  'Ты — гид внутри инструмента Project Cockpit, который показывает проект слоями (бизнес → системы → модули → фичи → код). ' +
  'Ниже — дайджест карты текущего проекта. Отвечай коротко, по-русски, опираясь только на данные карты. ' +
  'Если ответа в карте нет — честно скажи, что не знаешь.'

export async function askGemini(
  key: string,
  digest: string,
  question: string,
  signal?: AbortSignal,
): Promise<GeminiResult> {
  const prompt = `${SYSTEM_PREAMBLE}\n\nКарта проекта:\n${digest}\n\nВопрос: ${question}`

  let response: Response
  try {
    response = await fetch(`${MODEL_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal,
    })
  } catch {
    return { ok: false, error: 'network' }
  }

  if (response.status === 400 || response.status === 403) {
    return { ok: false, error: 'bad-key' }
  }
  if (response.status === 429) {
    return { ok: false, error: 'rate-limit' }
  }
  if (!response.ok) {
    return { ok: false, error: 'network' }
  }

  try {
    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string' || text.length === 0) {
      return { ok: false, error: 'network' }
    }
    return { ok: true, text }
  } catch {
    return { ok: false, error: 'network' }
  }
}
