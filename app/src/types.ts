// Схема карты проекта. См. SPEC.md §5.

export type NodeStatus = 'ok' | 'warn' | 'risk' | 'todo'
export type NodeKind = 'org' | 'system' | 'module' | 'feature' | 'code'
export type NodeLevel = 0 | 1 | 2 | 3 | 4
export type LinkKind = 'call' | 'data' | 'event'
export type Lens = 'blocks' | 'links' | 'risk' | 'tree'

export interface MapNodeMeta {
  path?: string
  symbol?: string
  lines?: number
  note?: string
  /** Одна фраза «что это и зачем» человеческим языком (без имён файлов). */
  plain?: string
}

export interface MapNode {
  id: string
  parent: string | null
  level: NodeLevel
  kind: NodeKind
  title: string
  sub?: string
  status: NodeStatus
  meta?: MapNodeMeta
  /** Только для L4, ≤60 строк — исходник, показываемый в панели узла. */
  code?: string
}

export interface MapLink {
  from: string
  to: string
  kind: LinkKind
  label?: string
}

export interface MapDoc {
  version: number
  project: {
    name: string
    desc: string
    stack: string[]
    /** 2-3 фразы простым языком, «объясни другу». */
    about?: string
    /** id узла «точка входа / сердце». */
    entryPointId?: string
    /** id узлов «начни отсюда» для обзора. */
    highlights?: string[]
  }
  nodes: MapNode[]
  links: MapLink[]
}
