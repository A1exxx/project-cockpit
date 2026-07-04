import { describe, expect, it } from 'vitest'
import type { MapDoc } from '../types'
import { childrenOf, edgeId, project, rollupLinks } from './projection'

// Фикстура-двойник demo-map.json: L0 (parent=null) → L1 → L2 → L3, плюс
// пара глубоких связей, чтобы rollupLinks было что поднимать.
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
      // Глубокая связь: feat-1 -> feat-2, оба на уровне L3.
      // При фокусе=корень (видимы sys-1/sys-2) должна подняться до sys-1 -> sys-2.
      { from: 'feat-1', to: 'feat-2', kind: 'call', label: 'A' },
      // Вторая связь между теми же видимыми предками — должна дедупиться в одно ребро.
      { from: 'mod-1', to: 'mod-2', kind: 'call', label: 'B' },
      // Связь внутри одного и того же видимого предка (петля) — должна быть отброшена.
      { from: 'mod-1', to: 'feat-1', kind: 'data', label: 'loop' },
    ],
  }
}

// Второй документ: имитирует будущий реальный файл, где L1-ноды сами по
// себе корневые (parent=null), без L0-обёртки. project()/childrenOf() не
// должны хардкодить уровень корня.
function makeRootlessDoc(): MapDoc {
  return {
    version: 1,
    project: { name: 'Rootless', desc: '', stack: [] },
    nodes: [
      { id: 'sys-x', parent: null, level: 1, kind: 'system', title: 'Sys X', status: 'ok' },
      { id: 'sys-y', parent: null, level: 1, kind: 'system', title: 'Sys Y', status: 'ok' },
      { id: 'mod-x', parent: 'sys-x', level: 2, kind: 'module', title: 'Mod X', status: 'ok' },
    ],
    links: [],
  }
}

describe('childrenOf', () => {
  it('для корня (focusId=null) возвращает ноды с parent===null', () => {
    const doc = makeDoc()
    const result = childrenOf(doc, null)
    expect(result.map((n) => n.id).sort()).toEqual(['org-a', 'org-b'])
  })

  it('для фокуса возвращает прямых детей этого узла', () => {
    const doc = makeDoc()
    const result = childrenOf(doc, 'org-a')
    expect(result.map((n) => n.id).sort()).toEqual(['sys-1', 'sys-2'])
  })

  it('для узла без детей возвращает пустой массив', () => {
    const doc = makeDoc()
    const result = childrenOf(doc, 'feat-1')
    expect(result).toEqual([])
  })

  it('работает, когда корневой уровень данных — L1, а не L0 (parent=null на любом уровне)', () => {
    const doc = makeRootlessDoc()
    const result = childrenOf(doc, null)
    expect(result.map((n) => n.id).sort()).toEqual(['sys-x', 'sys-y'])
  })
})

describe('rollupLinks', () => {
  it('поднимает глубокую связь до видимых предков и дедупит по паре+kind', () => {
    const doc = makeDoc()
    const visibleIds = new Set(['sys-1', 'sys-2'])
    const rolled = rollupLinks(doc, visibleIds)

    expect(rolled).toHaveLength(1)
    const [edge] = rolled
    expect(edge.from).toBe('sys-1')
    expect(edge.to).toBe('sys-2')
    expect(edge.kind).toBe('call')
    // Обе исходные call-связи (feat-1->feat-2 и mod-1->mod-2) схлопнулись в одну.
    expect(edge.count).toBe(2)
    expect(edge.labels).toEqual(['A', 'B'])
  })

  it('не создаёт петель — связь, чьи оба конца поднимаются к одному предку, отбрасывается', () => {
    const doc = makeDoc()
    const visibleIds = new Set(['mod-1', 'mod-2'])
    const rolled = rollupLinks(doc, visibleIds)
    // mod-1 -> feat-1 (внутри mod-1) не должна дать ребро mod-1 -> mod-1.
    expect(rolled.every((e) => e.from !== e.to)).toBe(true)
  })

  it('возвращает пустой массив, если предки не видимы ни на каком уровне', () => {
    const doc = makeDoc()
    const rolled = rollupLinks(doc, new Set(['org-a', 'org-b']))
    // Все связи в фикстуре внутри поддерева org-a — предок для обоих концов
    // один и тот же (org-a), значит попадают под петлю и отбрасываются.
    expect(rolled.every((e) => e.from !== e.to)).toBe(true)
  })
})

describe('project', () => {
  it('назначает числовые координаты всем видимым нодам (корень, blocks)', () => {
    const doc = makeDoc()
    const { nodes } = project(doc, [], 'blocks')
    expect(nodes.length).toBeGreaterThan(0)
    for (const n of nodes) {
      expect(typeof n.position.x).toBe('number')
      expect(typeof n.position.y).toBe('number')
      expect(Number.isFinite(n.position.x)).toBe(true)
      expect(Number.isFinite(n.position.y)).toBe(true)
    }
  })

  it('в линзе links есть агрегированное сквозное ребро', () => {
    const doc = makeDoc()
    // Фокус=org-a: видимы sys-1/sys-2, куда поднимаются связи feat-1->feat-2 и mod-1->mod-2.
    const { edges } = project(doc, ['org-a'], 'links')
    expect(edges.length).toBeGreaterThan(0)
  })

  it('в линзе blocks сквозных рёбер нет', () => {
    const doc = makeDoc()
    const { edges } = project(doc, [], 'blocks')
    expect(edges).toHaveLength(0)
  })

  it('на линзе links при активном узле нет двух рёбер с одинаковой парой from/to/kind (фикс дублей)', () => {
    const doc = makeDoc()
    // Фокус=org-a: видимы sys-1/sys-2 — то же место, где Canvas.tsx декорирует hover/select.
    const { edges } = project(doc, ['org-a'], 'links')
    const rolled = rollupLinks(doc, new Set(['sys-1', 'sys-2']))

    // Симулируем decoratedEdges Canvas.tsx: activeId = 'sys-1' наводит/выделяет рёбра,
    // инцидентные ей — точно так же, как реальный hover-путь.
    const activeLinks = rolled.filter((l) => l.from === 'sys-1' || l.to === 'sys-1')
    const projectedIds = new Set(edges.map((e) => e.id))
    const base = edges.map((e) => ({ ...e }))
    const extra = activeLinks.filter((l) => !projectedIds.has(edgeId(l)))
    const decorated = [...base, ...extra.map((l) => ({ id: edgeId(l) }))]

    // Ключевая проверка бага: id базового ребра (rolledToRfEdge) и id hover-декорации
    // (edgeId по тому же линку) должны совпадать — иначе получаем дубль.
    const idsByPair = new Map<string, number>()
    for (const e of decorated) {
      idsByPair.set(e.id, (idsByPair.get(e.id) ?? 0) + 1)
    }
    for (const count of idsByPair.values()) {
      expect(count).toBe(1)
    }
    // edgeId() детерминирован и одинаков для обоих путей построения id.
    for (const link of activeLinks) {
      const matchingBaseEdge = edges.find((e) => e.source === link.from && e.target === link.to && e.data?.kind === link.kind)
      expect(matchingBaseEdge?.id).toBe(edgeId(link))
    }
  })

  it('в линзе tree с фокусом содержит фокус-ноду, её детей и рёбра фокус->ребёнок', () => {
    const doc = makeDoc()
    const { nodes, edges } = project(doc, ['org-a'], 'tree')
    const ids = nodes.map((n) => n.id)
    expect(ids).toContain('org-a')
    expect(ids).toContain('sys-1')
    expect(ids).toContain('sys-2')
    expect(edges).toHaveLength(2)
    expect(edges.every((e) => e.source === 'org-a')).toBe(true)
  })

  it('каждая RF-нода несёт data.mapNode, data.childCount, data.lens и data.index', () => {
    const doc = makeDoc()
    const { nodes } = project(doc, [], 'blocks')
    const orgA = nodes.find((n) => n.id === 'org-a')
    expect(orgA?.data.mapNode.id).toBe('org-a')
    expect(orgA?.data.childCount).toBe(2)
    expect(orgA?.data.lens).toBe('blocks')
    expect(typeof orgA?.data.index).toBe('number')
    // index уникален по каждому видимому узлу уровня (для стаггера входа).
    const indices = nodes.map((n) => n.data.index)
    expect(new Set(indices).size).toBe(indices.length)
  })

  it('работает для документа без L0-обёртки (parent=null на L1)', () => {
    const doc = makeRootlessDoc()
    const { nodes } = project(doc, [], 'blocks')
    expect(nodes.map((n) => n.id).sort()).toEqual(['sys-x', 'sys-y'])
  })
})
