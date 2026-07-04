// Единый источник статистики карты и статус-констант. См. DESIGN-ONBOARDING.md §9 (Волна 0).
// Обзор проекта, легенда, панель узла и ноды канваса читают отсюда, чтобы не расходиться.

import type { MapDoc, MapNode, NodeStatus } from '../types'

export const STATUS_LABEL: Record<NodeStatus, string> = {
  ok: 'Стабильно',
  warn: 'Требует внимания',
  risk: 'Недоработки',
  todo: 'Задумано',
}

export const STATUS_DOT_CLASS: Record<NodeStatus, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  risk: 'bg-risk',
  todo: 'bg-todo',
}

/** Хекс статус-токенов DESIGN.md — для SVG-атрибутов (напр. MiniMap nodeColor), где CSS-переменные ненадёжны. */
export const STATUS_HEX: Record<NodeStatus, string> = {
  ok: '#4ADE80',
  warn: '#FBBF24',
  risk: '#F87171',
  todo: '#64748B',
}

export interface KindCounts {
  org: number
  system: number
  module: number
  feature: number
  code: number
}

/** Счёт узлов по `kind` — источник чисел «6 систем · 34 модуля · 54 фичи» в обзоре. */
export function countByKind(doc: MapDoc): KindCounts {
  const counts: KindCounts = { org: 0, system: 0, module: 0, feature: 0, code: 0 }
  for (const node of doc.nodes) {
    counts[node.kind] += 1
  }
  return counts
}

/** Узлы, требующие внимания: status === 'warn' || 'todo' (risk в этом проекте отсутствует, но не игнорируется). */
export function attentionNodes(doc: MapDoc): MapNode[] {
  return doc.nodes.filter((n) => n.status === 'warn' || n.status === 'todo')
}

/** Число прямых детей узла (parent === id) — для крошек-контекста «{N} внутри». */
export function directChildCount(doc: MapDoc, id: string): number {
  return doc.nodes.filter((n) => n.parent === id).length
}
