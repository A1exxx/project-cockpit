// Подпись активной линзы + свои зум-контролы + «Разложить заново» поверх канваса.
// DESIGN-ONBOARDING.md §6.2, DESIGN-V2.md §6-7.
// pointer-events-auto — ТОЛЬКО у интерактивных элементов (кнопки), обёртка остаётся
// pointer-events-none, чтобы не перехватывать драг/пан канваса.

import { ArrowsClockwise, CornersOut, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'
import { useReactFlow } from '@xyflow/react'
import type { Lens } from '../types'

const LENS_LABEL: Record<Lens, string> = {
  blocks: 'Блоки',
  links: 'Связи',
  risk: 'Риск',
  tree: 'Дерево',
}

const LENS_GLOSS: Record<Lens, string> = {
  blocks: 'из чего состоит',
  links: 'как всё соединено',
  risk: 'где болит',
  tree: 'дерево целиком',
}

interface CanvasOverlayProps {
  lens: Lens
  /** Есть сохранённые оверрайды позиций для текущей тройки — показывает кнопку «Разложить заново». */
  hasOverrides: boolean
  onRelayout: () => void
}

export function CanvasOverlay({ lens, hasOverrides, onRelayout }: CanvasOverlayProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-3">
        <span className="font-mono text-[11px] text-ink-dim">
          Линза: {LENS_LABEL[lens]} — {LENS_GLOSS[lens]}
        </span>
        {hasOverrides ? (
          <button
            type="button"
            onClick={onRelayout}
            title="Разложить заново"
            aria-label="Разложить заново"
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
          >
            <ArrowsClockwise size={14} weight="regular" />
            Разложить заново
          </button>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <button
          type="button"
          onClick={() => zoomIn()}
          title="Приблизить"
          aria-label="Приблизить"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
        >
          <MagnifyingGlassPlus size={16} weight="regular" />
        </button>
        <button
          type="button"
          onClick={() => zoomOut()}
          title="Отдалить"
          aria-label="Отдалить"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
        >
          <MagnifyingGlassMinus size={16} weight="regular" />
        </button>
        <button
          type="button"
          onClick={() => fitView({ duration: 300, padding: 0.15, maxZoom: 1.15 })}
          title="Вписать в экран"
          aria-label="Вписать в экран"
          className="pointer-events-auto flex h-7 w-7 items-center justify-center text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
        >
          <CornersOut size={16} weight="regular" />
        </button>
      </div>
    </>
  )
}
