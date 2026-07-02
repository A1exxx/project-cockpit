import { Compass, Info } from '@phosphor-icons/react'
import { useState } from 'react'
import { useCockpitStore } from '../store'
import { NodePanel } from './NodePanel'

type Tab = 'node' | 'guide'

const TABS: Array<{ id: Tab; label: string; Icon: typeof Info }> = [
  { id: 'node', label: 'Узел', Icon: Info },
  { id: 'guide', label: 'Гид', Icon: Compass },
]

function GuidePlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-ink-dim">
      <Compass size={24} weight="regular" className="text-ink-faint" />
      <p className="text-[13px]">AI-гид подключается…</p>
    </div>
  )
}

/** Контейнер правой колонки: табы «Узел» / «Гид» над содержимым. */
export function RightPanel({ guideSlot }: { guideSlot?: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>('node')
  const selectedId = useCockpitStore((s) => s.selectedId)

  // Выбор узла на карте не переключает таб автоматически (не дёргаем юзера),
  // но показываем бейдж-точку на табе «Узел», если там есть что показать,
  // а активен «Гид».
  const showNodeBadge = tab === 'guide' && selectedId !== null

  return (
    <aside className="z-10 hidden h-full w-[360px] flex-col border-l border-line bg-surface md:flex">
      <div className="flex h-12 shrink-0 border-b border-line">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-label={label}
              aria-selected={active}
              className={[
                'relative flex flex-1 items-center justify-center gap-1.5 text-[13px] transition-colors',
                active ? 'text-ink' : 'text-ink-dim hover:text-ink',
              ].join(' ')}
            >
              <Icon size={16} weight="regular" />
              {label}
              {id === 'node' && showNodeBadge ? (
                <span
                  className="absolute right-[calc(50%-28px)] top-2.5 h-[6px] w-[6px] rounded-full bg-accent"
                  aria-hidden="true"
                />
              ) : null}
              {active ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" aria-hidden="true" />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'node' ? <NodePanel /> : (guideSlot ?? <GuidePlaceholder />)}
      </div>
    </aside>
  )
}
