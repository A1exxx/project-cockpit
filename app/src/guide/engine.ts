// Чистая машина заскриптованного сценария гида. Не знает о zustand/React —
// работает только через колбэки (GuideApi), поэтому тестируется без DOM.
import type { Lens } from '../types'
import { TOUR_STEPS } from './scenario'

export interface GuideStepAction {
  label: string
  lens?: Lens
  /** Путь id от корня — применяется через GuideApi.setPath. */
  drillPath?: string[]
  selectId?: string
}

export interface GuideStep {
  id: string
  title: string
  body: string
  action?: GuideStepAction
}

/** Колбэки в карту — движок не завязан на конкретную форму store API. */
export interface GuideApi {
  setLens: (lens: Lens) => void
  setPath: (ids: string[]) => void
  select: (id: string | null) => void
}

export function createTour(): GuideStep[] {
  return TOUR_STEPS
}

/**
 * Применяет action текущего шага к карте. Порядок важен: сначала навигация
 * (setPath), затем линза, затем выделение — select должен находить узел,
 * который уже "на месте" после смены пути.
 */
export function applyStepAction(step: GuideStep, api: GuideApi): void {
  const { action } = step
  if (!action) return

  if (action.drillPath !== undefined) {
    api.setPath(action.drillPath)
  }
  if (action.lens !== undefined) {
    api.setLens(action.lens)
  }
  if (action.selectId !== undefined) {
    api.select(action.selectId)
  }
}

/** Держит индекс шага в границах [0, length-1]. length<=0 всегда даёт 0. */
export function clampStepIndex(index: number, length: number): number {
  if (length <= 0) return 0
  if (index < 0) return 0
  if (index > length - 1) return length - 1
  return index
}
