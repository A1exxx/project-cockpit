import { CaretRight, House } from '@phosphor-icons/react'
import { useCockpitStore } from '../store'

export function TopBar() {
  const doc = useCockpitStore((s) => s.doc)
  const path = useCockpitStore((s) => s.path)
  const jumpTo = useCockpitStore((s) => s.jumpTo)

  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  const crumbs = path.map((id) => byId.get(id)).filter((n) => n !== undefined)

  return (
    <header className="z-30 flex h-12 items-center gap-2 border-b border-line bg-surface px-4">
      <span className="text-lg font-medium tracking-tight text-ink">{doc.project.name}</span>

      <button
        type="button"
        onClick={() => jumpTo(-1)}
        aria-label="В корень"
        title="В корень"
        className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
      >
        <House size={16} weight="regular" />
      </button>

      <nav className="flex items-center gap-1 font-mono text-[13px]" aria-label="Хлебные крошки">
        {crumbs.map((node, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <span key={node.id} className="flex items-center gap-1">
              <CaretRight size={12} weight="regular" className="text-ink-faint" />
              <button
                type="button"
                onClick={() => jumpTo(index)}
                className={
                  isLast
                    ? 'text-accent'
                    : 'text-ink-dim transition-colors hover:text-ink'
                }
              >
                {node.title}
              </button>
            </span>
          )
        })}
      </nav>
    </header>
  )
}
