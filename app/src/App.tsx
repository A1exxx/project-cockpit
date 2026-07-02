import '@xyflow/react/dist/style.css'
import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useState } from 'react'
import { GuidePanel } from './guide/GuidePanel'
import { Canvas } from './ui/Canvas'
import { LensRail } from './ui/LensRail'
import { RightPanel } from './ui/RightPanel'
import { Skeleton } from './ui/Skeleton'
import { TopBar } from './ui/TopBar'

function App() {
  // Эмуляция асинхронной загрузки карты (doc уже в сторе синхронно —
  // здесь только физическое состояние "скелетон показан до готовности").
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="flex h-full flex-col md:grid md:grid-cols-[auto_1fr_auto] md:grid-rows-[auto_1fr]">
      <div className="md:col-span-3 md:row-start-1">
        <TopBar />
      </div>

      <main className="min-w-0 flex-1 bg-bg md:col-start-2 md:row-start-2">
        {ready ? (
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        ) : (
          <Skeleton />
        )}
      </main>

      <div className="md:col-start-1 md:row-start-2">
        <LensRail />
      </div>

      <div className="hidden md:col-start-3 md:row-start-2 md:block">
        <RightPanel guideSlot={<GuidePanel />} />
      </div>
    </div>
  )
}

export default App
