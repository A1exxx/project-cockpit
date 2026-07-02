import { describe, expect, it } from 'vitest'
import type { MapDoc } from '../types'
import { buildAgentTask } from './agentTask'

function makeDoc(): MapDoc {
  return {
    version: 1,
    project: { name: 'Test Project', desc: '', stack: [] },
    nodes: [
      {
        id: 'mod-handle-message',
        parent: 'sys-backend-core',
        level: 2,
        kind: 'module',
        title: '_handle_message pipeline',
        sub: 'Единая точка входа для всех каналов',
        status: 'ok',
        meta: { path: 'main.py' },
      },
      {
        id: 'code-target',
        parent: 'mod-handle-message',
        level: 4,
        kind: 'code',
        title: '_handle_message()',
        status: 'warn',
        meta: {
          path: 'main.py',
          symbol: '_handle_message',
          lines: 60,
          note: 'Явно помечено CRITICAL FIX комментариями',
        },
        code: 'async def _handle_message(req):\n    pass',
      },
      {
        id: 'code-neighbor',
        parent: 'mod-handle-message',
        level: 4,
        kind: 'code',
        title: 'update_email()',
        status: 'ok',
        meta: {},
      },
    ],
    links: [
      { from: 'code-target', to: 'code-neighbor', kind: 'call', label: 'identity resolve' },
      { from: 'mod-handle-message', to: 'code-target', kind: 'data', label: 'contains' },
    ],
  }
}

describe('buildAgentTask', () => {
  it('содержит meta.path узла', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('main.py')
  })

  it('содержит note узла', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('Явно помечено CRITICAL FIX комментариями')
  })

  it('содержит названия связанных узлов (from/to)', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('update_email()')
    expect(md).toContain('_handle_message pipeline')
  })

  it('содержит labels связей', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('identity resolve')
    expect(md).toContain('contains')
  })

  it('содержит фрагмент code, если есть', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('async def _handle_message(req)')
  })

  it('не падает и не содержит code-блок для узла без поля code', () => {
    const md = buildAgentTask(makeDoc(), 'code-neighbor')
    expect(md.length).toBeGreaterThan(0)
  })

  it('содержит symbol и lines из meta', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('_handle_message')
    expect(md).toContain('60')
  })

  it('для несуществующего id возвращает пустую строку, а не бросает исключение', () => {
    expect(() => buildAgentTask(makeDoc(), 'nope')).not.toThrow()
    expect(buildAgentTask(makeDoc(), 'nope')).toBe('')
  })

  it('содержит заголовок задачи', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toContain('Задача из карты Project Cockpit')
  })

  it('содержит секцию критериев приёмки', () => {
    const md = buildAgentTask(makeDoc(), 'code-target')
    expect(md).toMatch(/Критери[ия]\s+приём/i)
  })
})
