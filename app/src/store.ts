import { create } from 'zustand'
import rawSalesbotMap from './data/salesbot-map.json'
import { ancestorPath } from './graph/nodeInfo'
import type { Lens, MapDoc } from './types'

const demoMap = rawSalesbotMap as unknown as MapDoc

/** Один проект в мультипроект-списке (первый — запечённый слепок Sales Bot). */
export interface CockpitProject {
  id: string
  doc: MapDoc
}

/** Таб правой панели. */
export type RightTab = 'node' | 'guide'
/** Режим гида внутри таба «Гид». */
export type GuideMode = 'tour' | 'ask' | 'task'

interface CockpitState {
  doc: MapDoc
  /** Хлебные крошки: цепочка id фокуса. [] = корень. */
  path: string[]
  lens: Lens
  selectedId: string | null
  /** Список проектов, доступных через свитчер в шапке. */
  projects: CockpitProject[]
  activeProjectId: string
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
  /** Переключает активный проект: обновляет doc, сбрасывает path/selectedId. Линзу не трогает. */
  switchProject: (id: string) => void
  /** Регистрирует новый проект (черновик мастера) и сразу делает его активным. */
  addProject: (id: string, doc: MapDoc) => void

  // --- ui-срез: управление правой панелью (изолирован от doc/path/lens). ---
  rightTab: RightTab
  guideMode: GuideMode
  /** Счётчик запусков тура — инкремент сигналит GuidePanel сбросить шаг на 0. */
  tourLaunchNonce: number
  setRightTab: (tab: RightTab) => void
  setGuideMode: (mode: GuideMode) => void
  /** Открывает таб «Гид» в режиме «Экскурсия» и запускает тур с шага 0. */
  launchTour: () => void
}

export const useCockpitStore = create<CockpitState>((set, get) => ({
  doc: demoMap,
  path: [],
  lens: 'blocks',
  selectedId: null,
  projects: [{ id: 'salesbot', doc: demoMap }],
  activeProjectId: 'salesbot',

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

  switchProject: (id) => {
    const project = get().projects.find((p) => p.id === id)
    if (!project) return
    set({ activeProjectId: id, doc: project.doc, path: [], selectedId: null })
  },

  addProject: (id, doc) => {
    set((state) => ({ projects: [...state.projects, { id, doc }] }))
    get().switchProject(id)
  },

  rightTab: 'node',
  guideMode: 'tour',
  tourLaunchNonce: 0,

  setRightTab: (tab) => set({ rightTab: tab }),
  setGuideMode: (mode) => set({ guideMode: mode }),

  launchTour: () => {
    set((state) => ({
      rightTab: 'guide',
      guideMode: 'tour',
      tourLaunchNonce: state.tourLaunchNonce + 1,
    }))
  },
}))
