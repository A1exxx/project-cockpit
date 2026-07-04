// Домашний экран — список проектов, первый экран приложения (DESIGN-V2.md §3).
import { Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { attentionNodes, countByKind } from '../graph/docStats'
import { useCockpitStore, type CockpitProject } from '../store'

/** Русское склонение по числу: [1, 2-4, 5-0] (напр. модуль/модуля/модулей). */
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function summaryLine(project: CockpitProject): { text: string; hasAttention: boolean } {
  const counts = countByKind(project.doc)
  const attention = attentionNodes(project.doc).length
  const parts = [
    `${counts.system} ${plural(counts.system, ['система', 'системы', 'систем'])}`,
    `${counts.module} ${plural(counts.module, ['модуль', 'модуля', 'модулей'])}`,
    `${counts.feature} ${plural(counts.feature, ['фича', 'фичи', 'фич'])}`,
  ]
  if (attention > 0) {
    parts.push(`${attention} ${plural(attention, ['зона', 'зоны', 'зон'])} внимания`)
  }
  return { text: parts.join(' · '), hasAttention: attention > 0 }
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  return `обновлён ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
}

interface ProjectRowProps {
  project: CockpitProject
  onOpen: () => void
  onDelete: () => void
}

function ProjectRow({ project, onOpen, onDelete }: ProjectRowProps) {
  const [confirming, setConfirming] = useState(false)
  const { text: summary, hasAttention } = summaryLine(project)
  const about = project.doc.project.about ?? project.doc.project.desc

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-4">
        <span className="text-[14px] text-ink">Удалить «{project.doc.project.name}»?</span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-risk/50 px-3 py-1 text-[13px] text-risk transition-colors hover:bg-risk/10 active:scale-[0.98]"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg px-3 py-1 text-[13px] text-ink-dim transition-colors hover:text-ink active:scale-[0.98]"
          >
            Отмена
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg px-3 py-4 pr-10 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-medium text-ink">{project.doc.project.name}</span>
          {!project.isDraft ? (
            <span className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">
              демо
            </span>
          ) : null}
        </div>
        {about ? <p className="mt-0.5 truncate text-[13px] text-ink-dim">{about}</p> : null}
        <div className="mt-1.5 flex items-center gap-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
            {hasAttention ? (
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-warn" aria-hidden="true" />
            ) : null}
            {summary}
          </p>
          {project.isDraft && project.updatedAt ? (
            <span className="font-mono text-[11px] text-ink-faint">{formatUpdatedAt(project.updatedAt)}</span>
          ) : null}
        </div>
      </button>

      {project.isDraft ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Удалить проект"
          title="Удалить проект"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint opacity-0 transition-colors group-hover:opacity-100 hover:bg-surface hover:text-risk active:scale-[0.98]"
        >
          <Trash size={16} weight="regular" />
        </button>
      ) : null}
    </div>
  )
}

export function Home({ onOpenWizard }: { onOpenWizard: () => void }) {
  const projects = useCockpitStore((s) => s.projects)
  const openProject = useCockpitStore((s) => s.openProject)
  const removeProject = useCockpitStore((s) => s.removeProject)

  const hasDrafts = projects.some((p) => p.isDraft)

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-16">
        <div className="mb-8 flex items-baseline justify-between">
          <h1 className="flex items-baseline gap-2 text-lg font-medium tracking-tight text-ink">
            Проекты
            <span className="font-mono text-[13px] text-ink-faint">{projects.length}</span>
          </h1>
          <button
            type="button"
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 rounded-lg border border-accent-dim bg-accent/12 px-4 py-2 text-[14px] text-accent transition-colors hover:bg-accent/20 active:scale-[0.98]"
          >
            <Plus size={16} weight="regular" />
            Новый проект
          </button>
        </div>

        <div className="divide-y divide-line">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onOpen={() => openProject(project.id)}
              onDelete={() => removeProject(project.id)}
            />
          ))}
          {!hasDrafts ? (
            <p className="px-3 py-4 text-[13px] text-ink-faint">
              Черновики появятся здесь — начни с кнопки «Новый проект».
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
