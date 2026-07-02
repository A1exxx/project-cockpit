import { CaretDown } from '@phosphor-icons/react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'motion/react'
import type { CockpitNode as CockpitNodeType } from '../graph/projection'
import type { NodeStatus } from '../types'

const STATUS_DOT_CLASS: Record<NodeStatus, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  risk: 'bg-risk',
  todo: 'bg-todo',
}

const RISK_FILL_BG_CLASS: Record<NodeStatus, string> = {
  ok: 'bg-ok/12',
  warn: 'bg-warn/12',
  risk: 'bg-risk/12',
  todo: 'bg-todo/12',
}

const RISK_FILL_BORDER_CLASS: Record<NodeStatus, string> = {
  ok: 'border-ok/50',
  warn: 'border-warn/50',
  risk: 'border-risk/50',
  todo: 'border-todo/50',
}

const HANDLE_CLASS = 'opacity-0'

export function CockpitNode({ data, selected, id }: NodeProps<CockpitNodeType>) {
  const { mapNode, childCount, lens, index } = data
  const isTodo = mapNode.status === 'todo'
  const isRiskLens = lens === 'risk'
  // Приглушаем только контекстные бизнес-блоки без содержимого (Маркетинг/Продажи),
  // а не всю ветку разработки.
  const isOrgOutOfFocus = mapNode.kind === 'org' && childCount === 0

  const borderClass = selected
    ? 'border-accent ring-2 ring-accent/20'
    : isRiskLens
      ? RISK_FILL_BORDER_CLASS[mapNode.status]
      : 'border-line hover:border-line-strong'

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: index * 0.035 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`${mapNode.title} — статус: ${mapNode.status}${childCount > 0 ? `, вложено: ${childCount}` : ''}`}
      className={[
        'w-[200px] rounded-[10px] border p-3',
        isRiskLens ? RISK_FILL_BG_CLASS[mapNode.status] : 'bg-surface-2',
        borderClass,
        isTodo ? 'border-dashed' : '',
        isOrgOutOfFocus ? 'opacity-70' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />

      <div className="flex items-center gap-2">
        <span
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_DOT_CLASS[mapNode.status]}`}
          aria-hidden="true"
        />
        <span
          className={`min-w-0 flex-1 truncate text-[13px] font-medium text-ink ${isTodo ? 'text-ink-dim' : ''}`}
          title={mapNode.title}
        >
          {mapNode.title}
        </span>
      </div>

      {mapNode.sub ? (
        <div className="mt-1 truncate pl-[15px] font-mono text-[11px] text-ink-dim" title={mapNode.sub}>
          {mapNode.sub}
        </div>
      ) : null}

      {childCount > 0 ? (
        <div className="mt-2 flex items-center gap-1 pl-[15px] font-mono text-[11px] text-ink-faint">
          <span>{childCount}</span>
          <CaretDown size={12} weight="regular" />
        </div>
      ) : null}

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </motion.div>
  )
}
