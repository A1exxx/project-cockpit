import { describe, expect, it } from 'vitest'
import rawSalesbotMap from '../data/salesbot-map.json'
import type { MapDoc } from '../types'
import { attentionNodes, countByKind, directChildCount } from './docStats'

const doc = rawSalesbotMap as unknown as MapDoc

describe('countByKind', () => {
  it('считает реальный слепок Sales Bot: 6 систем, 34 модуля, 54 фичи', () => {
    const counts = countByKind(doc)
    expect(counts.system).toBe(6)
    expect(counts.module).toBe(34)
    expect(counts.feature).toBe(54)
  })
})

describe('attentionNodes', () => {
  it('возвращает 11 узлов warn+todo (9 warn + 2 todo, risk=0)', () => {
    expect(attentionNodes(doc)).toHaveLength(11)
  })

  it('каждый возвращённый узел имеет статус warn или todo', () => {
    for (const node of attentionNodes(doc)) {
      expect(['warn', 'todo']).toContain(node.status)
    }
  })
})

describe('directChildCount', () => {
  it('org-product имеет 6 прямых детей (6 систем L1)', () => {
    expect(directChildCount(doc, 'org-product')).toBe(6)
  })

  it('для узла без детей возвращает 0', () => {
    expect(directChildCount(doc, 'mod-handle-message')).not.toBe(0)
    expect(directChildCount(doc, 'nope-not-a-real-id')).toBe(0)
  })
})
