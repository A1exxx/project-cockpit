import type { MapDoc, MapLink, MapNode } from '../types'

/**
 * Цепочка id предков от корня до РОДИТЕЛЯ ноды включительно —
 * это путь фокуса (store.path), при котором нода видима на карте.
 * Для корневой ноды (parent=null) или неизвестного id — [].
 */
export function ancestorPath(doc: MapDoc, id: string): string[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  const node = byId.get(id)
  if (!node) return []

  const chain: string[] = []
  let parentId = node.parent
  // Ограничитель — страховка от цикла в parent-цепочке битых данных
  // (иначе бесконечный while вешает вкладку; код-ревью).
  while (parentId !== null && chain.length <= doc.nodes.length) {
    chain.unshift(parentId)
    parentId = byId.get(parentId)?.parent ?? null
  }
  return chain
}

export interface ResolvedLink {
  link: MapLink
  other: MapNode
}

export interface NodeLinksResult {
  outgoing: ResolvedLink[]
  incoming: ResolvedLink[]
}

/** Связи, где нода — from (outgoing) или to (incoming), с резолвом второй стороны. */
export function nodeLinks(doc: MapDoc, id: string): NodeLinksResult {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  const outgoing: ResolvedLink[] = []
  const incoming: ResolvedLink[] = []

  for (const link of doc.links) {
    if (link.from === id) {
      const other = byId.get(link.to)
      if (other) outgoing.push({ link, other })
    } else if (link.to === id) {
      const other = byId.get(link.from)
      if (other) incoming.push({ link, other })
    }
  }

  return { outgoing, incoming }
}

/** Заголовки цепочки предков (в порядке от корня) — для подписи «где это». */
export function breadcrumbTitles(doc: MapDoc, id: string): string[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  return ancestorPath(doc, id).map((ancestorId) => byId.get(ancestorId)?.title ?? '')
}
