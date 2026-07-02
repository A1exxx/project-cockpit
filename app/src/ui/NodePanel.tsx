import { ArrowLeft, ArrowRight, Cursor } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { breadcrumbTitles, nodeLinks } from '../graph/nodeInfo'
import { useCockpitStore } from '../store'
import type { LinkKind, MapNode, NodeKind, NodeStatus } from '../types'
import { CodeView } from './CodeView'

const STATUS_LABEL: Record<NodeStatus, string> = {
  ok: 'Стабильно',
  warn: 'Требует внимания',
  risk: 'Недоработки',
  todo: 'Задумано',
}

const STATUS_DOT_CLASS: Record<NodeStatus, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  risk: 'bg-risk',
  todo: 'bg-todo',
}

const STATUS_CHIP_CLASS: Record<NodeStatus, string> = {
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-warn/12 text-warn',
  risk: 'bg-risk/12 text-risk',
  todo: 'bg-todo/12 text-todo',
}

const STATUS_NOTE_BORDER_CLASS: Record<NodeStatus, string> = {
  ok: 'border-ok',
  warn: 'border-warn',
  risk: 'border-risk',
  todo: 'border-todo',
}

const KIND_LABEL: Record<NodeKind, string> = {
  org: 'организация',
  system: 'система',
  module: 'модуль',
  feature: 'фича',
  code: 'код',
}

const LINK_KIND_LABEL: Record<LinkKind, string> = {
  call: 'вызов',
  data: 'данные',
  event: 'событие',
}

function StatusChip({ status }: { status: NodeStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${STATUS_CHIP_CLASS[status]}`}
    >
      <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Заголовок + статус-чип + подстрока (kind · L{level} · где это). */
function NodeHeader({ node }: { node: MapNode }) {
  const doc = useCockpitStore((s) => s.doc)
  const crumbs = breadcrumbTitles(doc, node.id)

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[15px] font-medium text-ink">{node.title}</h2>
        <StatusChip status={node.status} />
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-faint">
        {KIND_LABEL[node.kind]} · L{node.level}
        {crumbs.length > 0 ? ` · ${crumbs.join(' › ')}` : ''}
      </p>
    </div>
  )
}

function NoteBlock({ note, status }: { note: string; status: NodeStatus }) {
  return (
    <div className="p-5">
      <div className={`border-l-2 pl-3 text-[13px] text-ink-dim ${STATUS_NOTE_BORDER_CLASS[status]}`}>{note}</div>
    </div>
  )
}

function LinksBlock({ node }: { node: MapNode }) {
  const doc = useCockpitStore((s) => s.doc)
  const focusNode = useCockpitStore((s) => s.focusNode)
  const { outgoing, incoming } = nodeLinks(doc, node.id)

  if (outgoing.length === 0 && incoming.length === 0) return null

  return (
    <div className="p-5">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Связи</h3>
      <ul className="space-y-2">
        {outgoing.map(({ link, other }, i) => (
          <li key={`out-${i}`} className="flex items-center gap-2 text-[13px]">
            <ArrowRight size={16} weight="regular" className="shrink-0 text-ink-faint" aria-label="исходящая" />
            <span className="font-mono text-[11px] text-ink-dim">{link.label ?? LINK_KIND_LABEL[link.kind]}</span>
            <button
              type="button"
              onClick={() => focusNode(other.id)}
              className="min-w-0 flex-1 truncate text-left text-accent hover:underline"
            >
              {other.title}
            </button>
            <span className="shrink-0 font-mono text-[10px] text-ink-faint">{link.kind}</span>
          </li>
        ))}
        {incoming.map(({ link, other }, i) => (
          <li key={`in-${i}`} className="flex items-center gap-2 text-[13px]">
            <ArrowLeft size={16} weight="regular" className="shrink-0 text-ink-faint" aria-label="входящая" />
            <span className="font-mono text-[11px] text-ink-dim">{link.label ?? LINK_KIND_LABEL[link.kind]}</span>
            <button
              type="button"
              onClick={() => focusNode(other.id)}
              className="min-w-0 flex-1 truncate text-left text-accent hover:underline"
            >
              {other.title}
            </button>
            <span className="shrink-0 font-mono text-[10px] text-ink-faint">{link.kind}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DrillButton({ node, childCount }: { node: MapNode; childCount: number }) {
  const drillInto = useCockpitStore((s) => s.drillInto)
  if (childCount === 0) return null

  return (
    <div className="p-5">
      <button
        type="button"
        onClick={() => drillInto(node.id)}
        className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface-2 active:scale-[0.98]"
      >
        Раскрыть ветку ({childCount})
      </button>
    </div>
  )
}

function NodeDetails({ node }: { node: MapNode }) {
  const doc = useCockpitStore((s) => s.doc)
  const childCount = doc.nodes.filter((n) => n.parent === node.id).length

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="divide-y divide-line"
    >
      <NodeHeader node={node} />
      {node.meta?.note ? <NoteBlock note={node.meta.note} status={node.status} /> : null}
      {node.sub ? <p className="p-5 text-[13px] text-ink-dim">{node.sub}</p> : null}
      <LinksBlock node={node} />
      <DrillButton node={node} childCount={childCount} />
      {node.code ? (
        <div className="p-5">
          <CodeView node={node} />
        </div>
      ) : null}
    </motion.div>
  )
}

export function NodePanel() {
  const doc = useCockpitStore((s) => s.doc)
  const selectedId = useCockpitStore((s) => s.selectedId)

  const selected = selectedId ? doc.nodes.find((n) => n.id === selectedId) : null

  return (
    <div className="h-full overflow-y-auto">
      <AnimatePresence mode="wait">
        {selected ? (
          <NodeDetails node={selected} />
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-ink-dim"
          >
            <Cursor size={24} weight="regular" className="text-ink-faint" />
            <p className="text-[13px]">Выбери узел на карте</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
