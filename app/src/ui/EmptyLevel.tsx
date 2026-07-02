import { FolderOpen } from '@phosphor-icons/react'
import { useCockpitStore } from '../store'

/** Композиция "нет узлов уровня" (DESIGN.md: иконка + фраза + действие). */
export function EmptyLevel() {
  const up = useCockpitStore((s) => s.up)
  const path = useCockpitStore((s) => s.path)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-dim">
      <FolderOpen size={32} weight="regular" className="text-ink-faint" />
      <p className="text-[13px]">На этом уровне пока нет узлов</p>
      {path.length > 0 ? (
        <button
          type="button"
          onClick={up}
          className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface active:scale-[0.98]"
        >
          Наверх
        </button>
      ) : null}
    </div>
  )
}
