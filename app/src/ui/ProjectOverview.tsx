import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { attentionNodes, countByKind, STATUS_DOT_CLASS, STATUS_LABEL } from '../graph/docStats'
import { breadcrumbTitles } from '../graph/nodeInfo'
import { useCockpitStore } from '../store'
import type { NodeStatus } from '../types'

/** Порядок легенды: Стабильно · Требует внимания · Задумано · Недоработки (см. §6.1). */
const LEGEND_ORDER: NodeStatus[] = ['ok', 'warn', 'todo', 'risk']

/** Мини-легенда статусов — единственная в приложении (§6.1: либо здесь, либо на канвасе, не оба). */
function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {LEGEND_ORDER.map((status) => (
        <span key={status} className="flex items-center gap-1.5 font-mono text-[11px] text-ink-dim">
          <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  )
}

/** Обзор проекта — правая панель, когда ничего не выбрано (§3). Единственная поверхность холодного старта. */
export function ProjectOverview() {
  const doc = useCockpitStore((s) => s.doc)
  const focusNode = useCockpitStore((s) => s.focusNode)
  const setLens = useCockpitStore((s) => s.setLens)
  const setRightTab = useCockpitStore((s) => s.setRightTab)
  const setGuideMode = useCockpitStore((s) => s.setGuideMode)
  const launchTour = useCockpitStore((s) => s.launchTour)
  const [attentionOpen, setAttentionOpen] = useState(false)

  const { project } = doc
  const counts = countByKind(doc)
  const attention = attentionNodes(doc)

  const entryPointExists =
    project.entryPointId != null && doc.nodes.some((n) => n.id === project.entryPointId)

  return (
    <div className="divide-y divide-line">
      {/* Секция 1 — идентичность */}
      <div className="p-5">
        <h2 className="text-[15px] font-medium text-ink">{project.name}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">{project.about ?? project.desc}</p>
        {project.stack.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-dim"
              >
                {tech}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Секция 2 — здоровье проекта */}
      <div className="p-5">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">Здоровье проекта</h3>
        <p className="mt-2 font-mono text-[13px] text-ink-dim">
          <span className="text-ink">{counts.system}</span> систем ·{' '}
          <span className="text-ink">{counts.module}</span> модулей ·{' '}
          <span className="text-ink">{counts.feature}</span> фич
        </p>

        {attention.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setAttentionOpen((v) => !v)}
              aria-expanded={attentionOpen}
              className="flex items-center gap-1.5 font-mono text-[13px] text-ink-dim transition-colors hover:text-ink"
            >
              {attentionOpen ? (
                <CaretDown size={14} weight="regular" className="shrink-0" />
              ) : (
                <CaretRight size={14} weight="regular" className="shrink-0" />
              )}
              <span className="text-ink">{attention.length}</span> зон внимания
            </button>

            {attentionOpen ? (
              <ul className="mt-2 space-y-1">
                {attention.map((node) => {
                  const crumbs = breadcrumbTitles(doc, node.id)
                  const locator = crumbs[crumbs.length - 1]
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => focusNode(node.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={`h-[6px] w-[6px] shrink-0 rounded-full ${STATUS_DOT_CLASS[node.status]}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{node.title}</span>
                        {locator ? (
                          <span className="shrink-0 font-mono text-[10px] text-ink-faint">{locator}</span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 font-mono text-[13px] text-ink-dim">Зон внимания нет</p>
        )}

        <div className="mt-4">
          <StatusLegend />
        </div>
      </div>

      {/* Секция 3 — первые двери */}
      <div className="p-5">
        <div className="space-y-1">
          {entryPointExists ? (
            <button
              type="button"
              onClick={() => focusNode(project.entryPointId as string)}
              className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="text-[13px] text-ink">Показать точку входа</span>
              <span className="font-mono text-[11px] text-ink-faint">сердце бота — весь путь сообщения</span>
            </button>
          ) : null}

          {attention.length > 0 ? (
            <button
              type="button"
              onClick={() => setLens('risk')}
              className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="text-[13px] text-ink">Показать зоны внимания</span>
              <span className="font-mono text-[11px] text-ink-faint">где техдолг и легаси</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setRightTab('guide')
              setGuideMode('ask')
            }}
            className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="text-[13px] text-ink">Спросить AI-гида</span>
            <span className="font-mono text-[11px] text-ink-faint">что это за проект и как работает</span>
          </button>
        </div>
      </div>

      {/* Секция 4 — приглашение */}
      <div className="p-5">
        <p className="text-[13px] text-ink-dim">Выбери блок на карте, чтобы погрузиться.</p>
        <button type="button" onClick={launchTour} className="mt-2 text-[13px] text-accent hover:underline">
          Не знаешь, с чего начать — пройди экскурсию
        </button>
      </div>
    </div>
  )
}
