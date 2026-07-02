import { Graph, SquaresFour, TreeStructure, Warning } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useCockpitStore } from '../store'
import type { Lens } from '../types'

const LENSES: Array<{ id: Lens; label: string; Icon: typeof SquaresFour }> = [
  { id: 'blocks', label: 'Блоки', Icon: SquaresFour },
  { id: 'links', label: 'Связи', Icon: Graph },
  { id: 'risk', label: 'Риск', Icon: Warning },
  { id: 'tree', label: 'Дерево', Icon: TreeStructure },
]

export function LensRail() {
  const lens = useCockpitStore((s) => s.lens)
  const setLens = useCockpitStore((s) => s.setLens)
  const up = useCockpitStore((s) => s.up)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') up()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [up])

  return (
    <nav
      aria-label="Линзы карты"
      className="z-10 flex h-12 w-full flex-row items-center justify-center gap-1 border-t border-line bg-surface px-3 md:h-full md:w-12 md:flex-col md:justify-start md:border-t-0 md:border-r md:px-0 md:py-3"
    >
      {LENSES.map(({ id, label, Icon }) => {
        const active = lens === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLens(id)}
            aria-label={label}
            title={label}
            className={[
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-[0.98]',
              active ? 'bg-surface-2 text-accent' : 'text-ink-dim hover:bg-surface-2 hover:text-ink',
            ].join(' ')}
          >
            <Icon size={20} weight="regular" />
          </button>
        )
      })}
    </nav>
  )
}
