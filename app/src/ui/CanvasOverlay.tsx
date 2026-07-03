// Подпись активной линзы поверх канваса. DESIGN-ONBOARDING.md §6.2.
// absolute z-10 pointer-events-none — не перехватывает клики по канвасу.

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

export function CanvasOverlay({ lens }: { lens: Lens }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 font-mono text-[11px] text-ink-dim">
      Линза: {LENS_LABEL[lens]} — {LENS_GLOSS[lens]}
    </div>
  )
}
