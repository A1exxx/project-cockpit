import { create } from 'zustand'
import rawSalesbotMap from './data/salesbot-map.json'
import { ancestorPath } from './graph/nodeInfo'
import type { Lens, MapDoc } from './types'

const demoMap = rawSalesbotMap as unknown as MapDoc

interface CockpitState {
  doc: MapDoc
  /** Хлебные крошки: цепочка id фокуса. [] = корень. */
  path: string[]
  lens: Lens
  selectedId: string | null
  /** Погружение на уровень ниже — разрешено только для нод, у которых есть дети. */
  drillInto: (id: string) => void
  /** Всплытие до крошки по индексу. -1 = корень. */
  jumpTo: (index: number) => void
  /** Всплытие на один уровень вверх. */
  up: () => void
  setLens: (lens: Lens) => void
  select: (id: string | null) => void
  /** Прыжок к ноде из панели (связи): переставляет path так, чтобы нода была видима, и выбирает её. */
  focusNode: (id: string) => void
}

export const useCockpitStore = create<CockpitState>((set, get) => ({
  doc: demoMap,
  path: [],
  lens: 'blocks',
  selectedId: null,

  drillInto: (id) => {
    const hasChildren = get().doc.nodes.some((n) => n.parent === id)
    if (!hasChildren) return
    set((state) => ({ path: [...state.path, id], selectedId: null }))
  },

  jumpTo: (index) => {
    set((state) => ({
      path: index < 0 ? [] : state.path.slice(0, index + 1),
      selectedId: null,
    }))
  },

  up: () => {
    set((state) => ({ path: state.path.slice(0, -1), selectedId: null }))
  },

  setLens: (lens) => set({ lens }),
  select: (id) => set({ selectedId: id }),

  focusNode: (id) => {
    set({ path: ancestorPath(get().doc, id), selectedId: id })
  },
}))
