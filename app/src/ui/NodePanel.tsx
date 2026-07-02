import { Cursor } from '@phosphor-icons/react'
import { useCockpitStore } from '../store'
import type { NodeStatus } from '../types'

const STATUS_LABEL: Record<NodeStatus, string> = {
  ok: 'Стабильно',
  warn: 'Внимание',
  risk: 'Недоработка',
  todo: 'Задумано',
}

const STATUS_DOT_CLASS: Record<NodeStatus, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  risk: 'bg-risk',
  todo: 'bg-todo',
}

export function NodePanel() {
  const doc = useCockpitStore((s) => s.doc)
  const selectedId = useCockpitStore((s) => s.selectedId)

  const selected = selectedId ? doc.nodes.find((n) => n.id === selectedId) : null

  return (
    <aside className="z-10 hidden w-[360px] flex-col border-l border-line bg-surface md:flex">
      {selected ? (
        <div className="divide-y divide-line">
          <div className="p-5">
            <div className="flex items-center gap-2">
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_DOT_CLASS[selected.status]}`}
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                {STATUS_LABEL[selected.status]}
              </span>
            </div>
            <h2 className="mt-2 text-[15px] font-medium text-ink">{selected.title}</h2>
            {selected.sub ? (
              <p className="mt-1 font-mono text-[11px] text-ink-dim">{selected.sub}</p>
            ) : null}
          </div>
          <div className="p-5 text-[13px] text-ink-dim">
            Детали узла — в разработке (Wave 2a)
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-ink-dim">
          <Cursor size={24} weight="regular" className="text-ink-faint" />
          <p className="text-[13px]">Выбери узел на карте</p>
        </div>
      )}
    </aside>
  )
}
