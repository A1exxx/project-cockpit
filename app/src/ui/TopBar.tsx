import { CaretDown, CaretRight, House, Plus } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useCockpitStore } from '../store'

/** Дропдаун-свитчер проектов: имя активного проекта становится кнопкой-меню. */
function ProjectSwitcher() {
  const projects = useCockpitStore((s) => s.projects)
  const activeProjectId = useCockpitStore((s) => s.activeProjectId)
  const switchProject = useCockpitStore((s) => s.switchProject)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const active = projects.find((p) => p.id === activeProjectId)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-lg font-medium tracking-tight text-ink transition-colors hover:bg-surface-2"
      >
        {active?.doc.project.name ?? ''}
        <CaretDown size={12} weight="regular" className="text-ink-dim" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-56 rounded-[10px] border border-line bg-surface-2 p-1"
        >
          {projects.map((p) => {
            const isActive = p.id === activeProjectId
            return (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  switchProject(p.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-surface"
              >
                <span
                  className={`h-[6px] w-[6px] shrink-0 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{p.doc.project.name}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function TopBar({ onOpenWizard }: { onOpenWizard: () => void }) {
  const doc = useCockpitStore((s) => s.doc)
  const path = useCockpitStore((s) => s.path)
  const jumpTo = useCockpitStore((s) => s.jumpTo)

  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  const crumbs = path.map((id) => byId.get(id)).filter((n) => n !== undefined)

  return (
    <header className="z-30 flex h-12 items-center gap-2 border-b border-line bg-surface px-4">
      <ProjectSwitcher />

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

      <button
        type="button"
        onClick={onOpenWizard}
        className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
      >
        <Plus size={16} weight="regular" />
        Новый проект
      </button>
    </header>
  )
}
