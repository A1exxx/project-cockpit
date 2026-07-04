import { beforeEach, describe, expect, it } from 'vitest'
import type { MapDoc } from '../types'
import { addDraft, loadDrafts, removeDraft, SALESBOT_ID } from './projects'

// Тот же in-memory полифилл window.localStorage, что в storage.test.ts (environment: 'node').
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

function makeDoc(name: string): MapDoc {
  return { version: 1, project: { name, desc: '', stack: [] }, nodes: [], links: [] }
}

describe('projects — roundtrip', () => {
  it('addDraft сохраняет черновик, loadDrafts его возвращает с createdAt/updatedAt', () => {
    addDraft('my-project', makeDoc('Мой проект'))
    const drafts = loadDrafts()
    expect(drafts).toHaveLength(1)
    expect(drafts[0].id).toBe('my-project')
    expect(drafts[0].doc.project.name).toBe('Мой проект')
    expect(drafts[0].createdAt).toBeTruthy()
    expect(drafts[0].updatedAt).toBeTruthy()
  })

  it('removeDraft удаляет черновик по id', () => {
    addDraft('a', makeDoc('A'))
    addDraft('b', makeDoc('B'))
    removeDraft('a')
    const drafts = loadDrafts()
    expect(drafts.map((d) => d.id)).toEqual(['b'])
  })
})

describe('projects — битый JSON', () => {
  it('loadDrafts на битом JSON возвращает пустой список, не бросает', () => {
    window.localStorage.setItem('cockpit.projects.v1', '{not valid')
    expect(loadDrafts()).toEqual([])
  })

  it('loadDrafts отбрасывает отдельные некорректные записи, не весь список', () => {
    window.localStorage.setItem(
      'cockpit.projects.v1',
      JSON.stringify([
        { id: 'good', doc: makeDoc('Good'), createdAt: 'x', updatedAt: 'y' },
        { id: 'bad-missing-doc' },
        'not-even-an-object',
      ]),
    )
    const drafts = loadDrafts()
    expect(drafts).toHaveLength(1)
    expect(drafts[0].id).toBe('good')
  })
})

describe('projects — salesbot-фильтр', () => {
  it('loadDrafts никогда не возвращает запись с id salesbot, даже если она есть в storage', () => {
    window.localStorage.setItem(
      'cockpit.projects.v1',
      JSON.stringify([{ id: SALESBOT_ID, doc: makeDoc('Sales Bot'), createdAt: 'x', updatedAt: 'y' }]),
    )
    expect(loadDrafts()).toEqual([])
  })
})
