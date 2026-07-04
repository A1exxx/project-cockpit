import { beforeEach, describe, expect, it } from 'vitest'
import { safeRead, safeRemove, safeWrite } from './storage'

// vitest здесь работает в environment: 'node' (vite.config.ts не трогаем — задача запрещает).
// window/localStorage в node-окружении не существуют — минимальный in-memory полифилл
// только для этого тестового файла, ничего не меняет в рантайме приложения (там window есть всегда).
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

beforeEach(() => {
  ;(globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: new MemoryStorage(),
  }
})

describe('safeRead/safeWrite — roundtrip', () => {
  it('пишет и читает произвольный JSON-сериализуемый объект', () => {
    const value = { a: 1, b: ['x', 'y'], c: { nested: true } }
    const result = safeWrite('test.key', value)
    expect(result.ok).toBe(true)
    expect(safeRead('test.key')).toEqual(value)
  })

  it('возвращает null для отсутствующего ключа', () => {
    expect(safeRead('missing.key')).toBeNull()
  })

  it('safeRemove удаляет ключ, дальнейшее чтение даёт null', () => {
    safeWrite('to.remove', { x: 1 })
    safeRemove('to.remove')
    expect(safeRead('to.remove')).toBeNull()
  })
})

describe('safeRead — битые данные', () => {
  it('битый JSON под ключом → null, ключ не трогается (не удаляется, не перезаписывается)', () => {
    window.localStorage.setItem('broken.key', '{not valid json')
    expect(safeRead('broken.key')).toBeNull()
    // ключ по-прежнему хранит исходный битый текст — не был стёрт молча
    expect(window.localStorage.getItem('broken.key')).toBe('{not valid json')
  })
})

describe('safeWrite — quota guard', () => {
  it('отклоняет запись больше guard-порога (~3MB) с предупреждением, ничего не пишет', () => {
    const huge = 'x'.repeat(3_100_000)
    const result = safeWrite('too.big', huge)
    expect(result.ok).toBe(false)
    expect(result.warning).toBeTruthy()
    expect(safeRead('too.big')).toBeNull()
  })
})
