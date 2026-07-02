import { describe, expect, it } from 'vitest'
import type { MapDoc } from '../types'
import { ancestorPath, breadcrumbTitles, nodeLinks } from './nodeInfo'

// Та же форма фикстуры, что в projection.test.ts: org-a → sys-1/sys-2 →
// mod-1/mod-2 → feat-1/feat-2, плюс связи между узлами разных уровней.
function makeDoc(): MapDoc {
  return {
    version: 1,
    project: { name: 'Test', desc: '', stack: [] },
    nodes: [
      { id: 'org-a', parent: null, level: 0, kind: 'org', title: 'Org A', status: 'ok' },
      { id: 'org-b', parent: null, level: 0, kind: 'org', title: 'Org B', status: 'ok' },

      { id: 'sys-1', parent: 'org-a', level: 1, kind: 'system', title: 'Sys 1', status: 'ok' },
      { id: 'sys-2', parent: 'org-a', level: 1, kind: 'system', title: 'Sys 2', status: 'ok' },

      { id: 'mod-1', parent: 'sys-1', level: 2, kind: 'module', title: 'Mod 1', status: 'ok' },
      { id: 'mod-2', parent: 'sys-2', level: 2, kind: 'module', title: 'Mod 2', status: 'ok' },

      { id: 'feat-1', parent: 'mod-1', level: 3, kind: 'feature', title: 'Feat 1', status: 'risk' },
      { id: 'feat-2', parent: 'mod-2', level: 3, kind: 'feature', title: 'Feat 2', status: 'ok' },
    ],
    links: [
      { from: 'feat-1', to: 'feat-2', kind: 'call', label: 'вызывает' },
      { from: 'mod-2', to: 'feat-1', kind: 'data', label: 'пишет в' },
      // Связь, не касающаяся feat-1/feat-2 вовсе — должна игнорироваться.
      { from: 'sys-1', to: 'sys-2', kind: 'event', label: 'шумовая' },
    ],
  }
}

describe('ancestorPath', () => {
  it('для корневой ноды (parent=null) возвращает []', () => {
    const doc = makeDoc()
    expect(ancestorPath(doc, 'org-a')).toEqual([])
  })

  it('для ноды на L3 возвращает цепочку от корня до родителя включительно', () => {
    const doc = makeDoc()
    expect(ancestorPath(doc, 'feat-1')).toEqual(['org-a', 'sys-1', 'mod-1'])
  })

  it('для ноды на L1 возвращает только прямого родителя', () => {
    const doc = makeDoc()
    expect(ancestorPath(doc, 'sys-2')).toEqual(['org-a'])
  })

  it('для несуществующего id возвращает []', () => {
    const doc = makeDoc()
    expect(ancestorPath(doc, 'nope')).toEqual([])
  })
})

describe('nodeLinks', () => {
  it('находит исходящие связи (from === id) и резолвит другую сторону', () => {
    const doc = makeDoc()
    const { outgoing } = nodeLinks(doc, 'feat-1')
    expect(outgoing).toHaveLength(1)
    expect(outgoing[0].link.to).toBe('feat-2')
    expect(outgoing[0].other.id).toBe('feat-2')
    expect(outgoing[0].other.title).toBe('Feat 2')
  })

  it('находит входящие связи (to === id) и резолвит другую сторону', () => {
    const doc = makeDoc()
    const { incoming } = nodeLinks(doc, 'feat-1')
    expect(incoming).toHaveLength(1)
    expect(incoming[0].link.from).toBe('mod-2')
    expect(incoming[0].other.id).toBe('mod-2')
  })

  it('для ноды без связей возвращает пустые массивы', () => {
    const doc = makeDoc()
    const { outgoing, incoming } = nodeLinks(doc, 'org-b')
    expect(outgoing).toEqual([])
    expect(incoming).toEqual([])
  })

  it('не путает связи других узлов (шумовая sys-1->sys-2 не попадает в feat-1)', () => {
    const doc = makeDoc()
    const { outgoing, incoming } = nodeLinks(doc, 'feat-1')
    const allOtherIds = [...outgoing, ...incoming].map((e) => e.other.id)
    expect(allOtherIds).not.toContain('sys-1')
    expect(allOtherIds).not.toContain('sys-2')
  })
})

describe('breadcrumbTitles', () => {
  it('возвращает заголовки цепочки предков в порядке от корня', () => {
    const doc = makeDoc()
    expect(breadcrumbTitles(doc, 'feat-1')).toEqual(['Org A', 'Sys 1', 'Mod 1'])
  })

  it('для корневой ноды возвращает []', () => {
    const doc = makeDoc()
    expect(breadcrumbTitles(doc, 'org-a')).toEqual([])
  })
})
