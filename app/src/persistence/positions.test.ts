import { beforeEach, describe, expect, it } from 'vitest'
import { clearPositions, loadPositions, positionsKeyFor, savePosition } from './positions'

// vitest здесь работает в environment: 'node' (см. storage.test.ts) — свой in-memory
// полифилл window.localStorage, ничего не меняет в рантайме приложения.
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

describe('positionsKeyFor', () => {
  it('focusId=null становится "root"', () => {
    expect(positionsKeyFor('p1', null, 'blocks')).toBe('p1/root/blocks')
  })
  it('обычный focusId используется как есть', () => {
    expect(positionsKeyFor('p1', 'sys-backend-core', 'links')).toBe('p1/sys-backend-core/links')
  })
})

describe('savePosition / loadPositions — roundtrip', () => {
  it('сохраняет и читает позицию одной ноды', () => {
    savePosition('p1', null, 'blocks', 'node-a', { x: 10, y: 20 })
    expect(loadPositions('p1', null, 'blocks')).toEqual({ 'node-a': { x: 10, y: 20 } })
  })

  it('merge: сохранение второй ноды не стирает первую', () => {
    savePosition('p1', null, 'blocks', 'node-a', { x: 10, y: 20 })
    savePosition('p1', null, 'blocks', 'node-b', { x: 30, y: 40 })
    expect(loadPositions('p1', null, 'blocks')).toEqual({
      'node-a': { x: 10, y: 20 },
      'node-b': { x: 30, y: 40 },
    })
  })

  it('перезапись позиции той же ноды обновляет значение', () => {
    savePosition('p1', null, 'blocks', 'node-a', { x: 10, y: 20 })
    savePosition('p1', null, 'blocks', 'node-a', { x: 99, y: 99 })
    expect(loadPositions('p1', null, 'blocks')).toEqual({ 'node-a': { x: 99, y: 99 } })
  })

  it('разные тройки (projectId/focusId/lens) не пересекаются', () => {
    savePosition('p1', null, 'blocks', 'node-a', { x: 1, y: 1 })
    savePosition('p1', 'focus-x', 'blocks', 'node-a', { x: 2, y: 2 })
    savePosition('p2', null, 'blocks', 'node-a', { x: 3, y: 3 })
    savePosition('p1', null, 'links', 'node-a', { x: 4, y: 4 })

    expect(loadPositions('p1', null, 'blocks')).toEqual({ 'node-a': { x: 1, y: 1 } })
    expect(loadPositions('p1', 'focus-x', 'blocks')).toEqual({ 'node-a': { x: 2, y: 2 } })
    expect(loadPositions('p2', null, 'blocks')).toEqual({ 'node-a': { x: 3, y: 3 } })
    expect(loadPositions('p1', null, 'links')).toEqual({ 'node-a': { x: 4, y: 4 } })
  })

  it('отсутствующая тройка возвращает пустой объект', () => {
    expect(loadPositions('nope', null, 'blocks')).toEqual({})
  })
})

describe('clearPositions', () => {
  it('удаляет только оверрайды указанной тройки', () => {
    savePosition('p1', null, 'blocks', 'node-a', { x: 1, y: 1 })
    savePosition('p1', null, 'links', 'node-a', { x: 2, y: 2 })
    clearPositions('p1', null, 'blocks')
    expect(loadPositions('p1', null, 'blocks')).toEqual({})
    expect(loadPositions('p1', null, 'links')).toEqual({ 'node-a': { x: 2, y: 2 } })
  })

  it('на отсутствующей тройке — no-op, не бросает', () => {
    expect(() => clearPositions('nope', null, 'blocks')).not.toThrow()
  })
})

describe('битые данные — деградация', () => {
  it('битый JSON под ключом → loadPositions возвращает пустое, не бросает', () => {
    window.localStorage.setItem('cockpit.positions.v1', '{not valid json')
    expect(loadPositions('p1', null, 'blocks')).toEqual({})
  })

  it('неожиданная форма (массив вместо объекта) → пустое', () => {
    window.localStorage.setItem('cockpit.positions.v1', JSON.stringify([1, 2, 3]))
    expect(loadPositions('p1', null, 'blocks')).toEqual({})
  })

  it('битая под-запись позиции (не {x,y}) отбрасывается, остальные сохраняются', () => {
    window.localStorage.setItem(
      'cockpit.positions.v1',
      JSON.stringify({
        'p1/root/blocks': {
          'node-a': { x: 1, y: 2 },
          'node-b': { x: 'nope', y: 2 },
          'node-c': 'not-an-object',
        },
      }),
    )
    expect(loadPositions('p1', null, 'blocks')).toEqual({ 'node-a': { x: 1, y: 2 } })
  })

  it('savePosition после битых данных перезаписывает валидным JSON (не молчаливое удаление чужого)', () => {
    window.localStorage.setItem('cockpit.positions.v1', '{not valid json')
    savePosition('p1', null, 'blocks', 'node-a', { x: 5, y: 5 })
    expect(loadPositions('p1', null, 'blocks')).toEqual({ 'node-a': { x: 5, y: 5 } })
  })
})
