import { useEffect, useState } from 'react'
import { useCockpitStore } from '../store'

const HINT_SEEN_KEY = 'cockpit.hintSeen'
const AUTO_DISMISS_MS = 8000
const FADE_MS = 200

/**
 * Первый-вход подсказка над канвасом: «клик по блоку — детали, двойной клик — внутрь».
 * Не coach-marks (§4.2 DESIGN-ONBOARDING.md) — одна статичная строка, гаснет при первом
 * выборе узла или авто через ~8с, один раз за браузер.
 */
export function CanvasHint() {
  const selectedId = useCockpitStore((s) => s.selectedId)
  const [visible, setVisible] = useState(
    () => window.localStorage.getItem(HINT_SEEN_KEY) !== '1',
  )
  const [fading, setFading] = useState(false)

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function dismiss() {
    if (window.localStorage.getItem(HINT_SEEN_KEY) === '1') return
    window.localStorage.setItem(HINT_SEEN_KEY, '1')
    if (reducedMotion) {
      setVisible(false)
      return
    }
    setFading(true)
    window.setTimeout(() => setVisible(false), FADE_MS)
  }

  // Гаснет при первом выборе узла на канвасе.
  useEffect(() => {
    if (selectedId !== null) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Гаснет авто через ~8с.
  useEffect(() => {
    if (!visible) return
    const id = window.setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`absolute inset-x-0 bottom-3 z-10 flex justify-center px-3 pointer-events-none transition-opacity ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="rounded-lg border border-line bg-surface/90 px-3 py-1.5 font-mono text-[11px] text-ink-dim">
        Клик по блоку — детали. Двойной клик — внутрь.
      </div>
    </div>
  )
}
