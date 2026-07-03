import '@xyflow/react/dist/style.css'
import { ReactFlowProvider } from '@xyflow/react'
import { MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { GuidePanel } from './guide/GuidePanel'
import { Canvas } from './ui/Canvas'
import { CanvasHint } from './ui/CanvasHint'
import { LensRail } from './ui/LensRail'
import { RightPanel } from './ui/RightPanel'
import { Skeleton } from './ui/Skeleton'
import { TopBar } from './ui/TopBar'
import { Wizard } from './wizard/Wizard'

function App() {
  // Эмуляция асинхронной загрузки карты (doc уже в сторе синхронно —
  // здесь только физическое состояние "скелетон показан до готовности").
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    // reducedMotion="user": JS-пружины motion уважают prefers-reduced-motion
    // (CSS-клэмп в index.css их не покрывает) — impeccable polish.
    <MotionConfig reducedMotion="user">
    <div className="flex h-full flex-col md:grid md:grid-cols-[auto_1fr_auto] md:grid-rows-[auto_1fr]">
      <div className="md:col-span-3 md:row-start-1">
        <TopBar onOpenWizard={() => setWizardOpen(true)} />
      </div>

      {wizardOpen ? <Wizard onClose={() => setWizardOpen(false)} /> : null}

      <main className="relative min-w-0 flex-1 bg-bg md:col-start-2 md:row-start-2">
        {ready ? (
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        ) : (
          <Skeleton />
        )}
        <CanvasHint />
      </main>

      <div className="md:col-start-1 md:row-start-2">
        <LensRail />
      </div>

      <div className="hidden md:col-start-3 md:row-start-2 md:block">
        <RightPanel guideSlot={<GuidePanel />} />
      </div>
    </div>
    </MotionConfig>
  )
}

export default App
