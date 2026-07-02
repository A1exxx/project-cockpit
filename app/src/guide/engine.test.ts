import { describe, expect, it, vi } from 'vitest'
import { applyStepAction, clampStepIndex, createTour, type GuideApi, type GuideStep } from './engine'

describe('createTour', () => {
  it('возвращает непустой список шагов с уникальными id', () => {
    const steps = createTour()
    expect(steps.length).toBeGreaterThan(0)
    const ids = steps.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('каждый шаг несёт title и body непустыми строками', () => {
    const steps = createTour()
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.body.length).toBeGreaterThan(0)
    }
  })
})

describe('applyStepAction', () => {
  function makeApi() {
    return {
      setLens: vi.fn<GuideApi['setLens']>(),
      setPath: vi.fn<GuideApi['setPath']>(),
      select: vi.fn<GuideApi['select']>(),
    }
  }

  it('шаг без action ничего не вызывает', () => {
    const api = makeApi()
    const step: GuideStep = { id: 's1', title: 'T', body: 'B' }
    applyStepAction(step, api)
    expect(api.setLens).not.toHaveBeenCalled()
    expect(api.setPath).not.toHaveBeenCalled()
    expect(api.select).not.toHaveBeenCalled()
  })

  it('вызывает только setLens, если в action есть только lens', () => {
    const api = makeApi()
    const step: GuideStep = { id: 's2', title: 'T', body: 'B', action: { label: 'Go', lens: 'risk' } }
    applyStepAction(step, api)
    expect(api.setLens).toHaveBeenCalledWith('risk')
    expect(api.setPath).not.toHaveBeenCalled()
    expect(api.select).not.toHaveBeenCalled()
  })

  it('вызывает только setPath, если в action есть только drillPath', () => {
    const api = makeApi()
    const step: GuideStep = {
      id: 's3',
      title: 'T',
      body: 'B',
      action: { label: 'Go', drillPath: ['org-product', 'sys-backend-core'] },
    }
    applyStepAction(step, api)
    expect(api.setPath).toHaveBeenCalledWith(['org-product', 'sys-backend-core'])
    expect(api.setLens).not.toHaveBeenCalled()
    expect(api.select).not.toHaveBeenCalled()
  })

  it('вызывает только select, если в action есть только selectId', () => {
    const api = makeApi()
    const step: GuideStep = { id: 's4', title: 'T', body: 'B', action: { label: 'Go', selectId: 'sys-instagram-module' } }
    applyStepAction(step, api)
    expect(api.select).toHaveBeenCalledWith('sys-instagram-module')
    expect(api.setLens).not.toHaveBeenCalled()
    expect(api.setPath).not.toHaveBeenCalled()
  })

  it('вызывает все три колбэка в порядке setPath -> setLens -> select, если все поля заданы', () => {
    const calls: string[] = []
    const api: GuideApi = {
      setLens: () => calls.push('setLens'),
      setPath: () => calls.push('setPath'),
      select: () => calls.push('select'),
    }
    const step: GuideStep = {
      id: 's5',
      title: 'T',
      body: 'B',
      action: { label: 'Go', lens: 'links', drillPath: ['org-product'], selectId: 'mod-handle-message' },
    }
    applyStepAction(step, api)
    expect(calls).toEqual(['setPath', 'setLens', 'select'])
  })

  it('пустой drillPath ([]) всё равно вызывает setPath (переход в корень — валидное намерение)', () => {
    const api = makeApi()
    const step: GuideStep = { id: 's6', title: 'T', body: 'B', action: { label: 'Go', drillPath: [] } }
    applyStepAction(step, api)
    expect(api.setPath).toHaveBeenCalledWith([])
  })
})

describe('clampStepIndex', () => {
  it('держит индекс в границах [0, length-1] при выходе за верх', () => {
    expect(clampStepIndex(5, 3)).toBe(2)
  })

  it('держит индекс в границах при выходе за низ', () => {
    expect(clampStepIndex(-2, 3)).toBe(0)
  })

  it('пропускает валидный индекс без изменений', () => {
    expect(clampStepIndex(1, 3)).toBe(1)
  })

  it('length=0 не даёт отрицательный или NaN результат', () => {
    expect(clampStepIndex(0, 0)).toBe(0)
    expect(Number.isNaN(clampStepIndex(3, 0))).toBe(false)
  })

  it('length=1 всегда возвращает 0 независимо от входа', () => {
    expect(clampStepIndex(0, 1)).toBe(0)
    expect(clampStepIndex(5, 1)).toBe(0)
    expect(clampStepIndex(-5, 1)).toBe(0)
  })
})
