// Полноэкранный мастер «Новый проект» — 6-шаговое интервью-наставник
// (SPEC.md §4, режим «Наставник»). Из ответов рождается карта-черновик.
import { Plus, Sparkle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { safeRead, safeRemove, safeWrite } from '../persistence/storage'
import { useCockpitStore } from '../store'
import type { WizardAnswers } from './draft'
import { buildDraftDoc, slugify } from './draft'
import { DEMO_PROJECT, WIZARD_STEPS } from './steps'

const WIZARD_DRAFT_KEY = 'cockpit.wizardDraft.v1'
const AUTOSAVE_DEBOUNCE_MS = 500

interface WizardDraftRecord {
  projectName: string
  answers: WizardAnswers
  stepIndex: number
  updatedAt: string
}

function loadWizardDraft(): WizardDraftRecord | null {
  return safeRead<WizardDraftRecord>(WIZARD_DRAFT_KEY)
}

function formatDraftDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function emptyAnswers(): WizardAnswers {
  return {
    essence: { problem: '', user: '', outcome: '' },
    screens: [''],
    features: { must: [''], later: [] },
    entities: [''],
    integrations: [],
    plan: { done: ['', '', ''], killDate: '' },
  }
}

function demoAnswers(): WizardAnswers {
  return {
    essence: { ...DEMO_PROJECT.essence },
    screens: [...DEMO_PROJECT.screens],
    features: { must: [...DEMO_PROJECT.features.must], later: [...DEMO_PROJECT.features.later] },
    entities: [...DEMO_PROJECT.entities],
    integrations: [...DEMO_PROJECT.integrations],
    plan: { done: [...DEMO_PROJECT.plan.done], killDate: DEMO_PROJECT.plan.killDate },
  }
}

function nonEmpty(items: string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0)
}

/** Обязательные поля по шагу (индекс 0..5) — держит кнопку «Далее» disabled, пока не заполнены. */
function isStepValid(step: number, answers: WizardAnswers): boolean {
  switch (step) {
    case 0:
      return (
        answers.essence.problem.trim().length > 0 &&
        answers.essence.user.trim().length > 0 &&
        answers.essence.outcome.trim().length > 0
      )
    case 1:
      return nonEmpty(answers.screens).length >= 1
    case 2:
      return nonEmpty(answers.features.must).length >= 1
    case 5:
      return nonEmpty(answers.plan.done).length >= 3
    default:
      return true
  }
}

interface DynamicListProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  addLabel: string
}

/** Динамический список строковых инпутов с добавлением/удалением строки. */
function DynamicList({ items, onChange, placeholder, addLabel }: DynamicListProps) {
  function updateAt(index: number, value: string) {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  function removeAt(index: number) {
    const next = items.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [''])
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => updateAt(index, e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeAt(index)}
            aria-label="Удалить строку"
            title="Удалить строку"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
          >
            <X size={14} weight="regular" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="flex w-fit items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
      >
        <Plus size={14} weight="regular" />
        {addLabel}
      </button>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] uppercase tracking-wide text-ink-faint">{children}</label>
}

interface StepProps {
  answers: WizardAnswers
  setAnswers: (updater: (prev: WizardAnswers) => WizardAnswers) => void
  projectName: string
  setProjectName: (name: string) => void
}

const TEXT_INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

function EssenceStep({ answers, setAnswers, projectName, setProjectName }: StepProps) {
  const { essence } = answers
  function update(field: keyof WizardAnswers['essence'], value: string) {
    setAnswers((prev) => ({ ...prev, essence: { ...prev.essence, [field]: value } }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Название проекта</FieldLabel>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Как назовём?"
          className={TEXT_INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Проблема</FieldLabel>
        <input
          type="text"
          value={essence.problem}
          onChange={(e) => update('problem', e.target.value)}
          placeholder="Что сейчас не работает или бесит"
          className={TEXT_INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Пользователь</FieldLabel>
        <input
          type="text"
          value={essence.user}
          onChange={(e) => update('user', e.target.value)}
          placeholder="Один конкретный человек, не «все»"
          className={TEXT_INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Исход</FieldLabel>
        <input
          type="text"
          value={essence.outcome}
          onChange={(e) => update('outcome', e.target.value)}
          placeholder="Что изменится, когда продукт готов"
          className={TEXT_INPUT_CLASS}
        />
      </div>
    </div>
  )
}

function ScreensStep({ answers, setAnswers }: StepProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Экраны</FieldLabel>
      <DynamicList
        items={answers.screens}
        onChange={(screens) => setAnswers((prev) => ({ ...prev, screens }))}
        placeholder="Например, «Главный экран»"
        addLabel="Добавить экран"
      />
    </div>
  )
}

function FeaturesStep({ answers, setAnswers }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Точно нужно (must)</FieldLabel>
        <DynamicList
          items={answers.features.must}
          onChange={(must) => setAnswers((prev) => ({ ...prev, features: { ...prev.features, must } }))}
          placeholder="Без этого продукт не работает"
          addLabel="Добавить фичу"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Не сейчас (later)</FieldLabel>
        <DynamicList
          items={answers.features.later}
          onChange={(later) => setAnswers((prev) => ({ ...prev, features: { ...prev.features, later } }))}
          placeholder="Хочется, но не для v1"
          addLabel="Добавить в «не сейчас»"
        />
      </div>
    </div>
  )
}

function EntitiesStep({ answers, setAnswers }: StepProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Сущности</FieldLabel>
      <DynamicList
        items={answers.entities}
        onChange={(entities) => setAnswers((prev) => ({ ...prev, entities }))}
        placeholder="Например, «Пользователь»"
        addLabel="Добавить сущность"
      />
    </div>
  )
}

function IntegrationsStep({ answers, setAnswers }: StepProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Интеграции</FieldLabel>
      <DynamicList
        items={answers.integrations}
        onChange={(integrations) => setAnswers((prev) => ({ ...prev, integrations }))}
        placeholder="Например, «Telegram Bot API»"
        addLabel="Добавить интеграцию"
      />
    </div>
  )
}

function PlanStep({ answers, setAnswers }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Done-чеклист (3-5 пунктов)</FieldLabel>
        <DynamicList
          items={answers.plan.done}
          onChange={(done) => setAnswers((prev) => ({ ...prev, plan: { ...prev.plan, done } }))}
          placeholder="Когда это работает — v1 готова"
          addLabel="Добавить пункт"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Дата-убийца</FieldLabel>
        <input
          type="date"
          value={answers.plan.killDate}
          onChange={(e) => setAnswers((prev) => ({ ...prev, plan: { ...prev.plan, killDate: e.target.value } }))}
          className={TEXT_INPUT_CLASS}
        />
      </div>
    </div>
  )
}

const STEP_COMPONENTS = [EssenceStep, ScreensStep, FeaturesStep, EntitiesStep, IntegrationsStep, PlanStep]

export function Wizard({ onClose }: { onClose: () => void }) {
  const addProject = useCockpitStore((s) => s.addProject)
  const projects = useCockpitStore((s) => s.projects)

  const [stepIndex, setStepIndex] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [answers, setAnswers] = useState<WizardAnswers>(emptyAnswers)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)

  // Черновик, найденный при открытии мастера (до любых изменений в этой сессии) —
  // если непуст, показываем плашку «Продолжить / Начать заново» вместо молчаливой перезаписи.
  const [resumeDraft, setResumeDraft] = useState<WizardDraftRecord | null>(() => {
    const draft = loadWizardDraft()
    if (draft && (draft.projectName.trim().length > 0 || draft.stepIndex > 0)) return draft
    return null
  })

  const isFirstAutosave = useRef(true)

  function persistDraft() {
    const result = safeWrite(WIZARD_DRAFT_KEY, {
      projectName,
      answers,
      stepIndex,
      updatedAt: new Date().toISOString(),
    } satisfies WizardDraftRecord)
    setSaveWarning(result.ok ? null : (result.warning ?? null))
  }

  // Автосейв в localStorage: debounce 500ms на изменение answers/projectName.
  // Пропущен, пока плашка «Продолжить/Начать заново» не разрешена — иначе черновик из
  // предыдущей сессии был бы затёрт пустым состоянием мастера ещё до выбора пользователя.
  useEffect(() => {
    if (resumeDraft) return
    if (isFirstAutosave.current) {
      isFirstAutosave.current = false
      return
    }
    const id = window.setTimeout(persistDraft, AUTOSAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName, answers, resumeDraft])

  // Немедленный автосейв на смену шага (не ждать 500ms дебаунса).
  useEffect(() => {
    if (resumeDraft) return
    if (isFirstAutosave.current) return
    persistDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex])

  function handleResumeDraft() {
    if (!resumeDraft) return
    setProjectName(resumeDraft.projectName)
    setAnswers(resumeDraft.answers)
    setStepIndex(resumeDraft.stepIndex)
    setResumeDraft(null)
  }

  function handleRestartDraft() {
    safeRemove(WIZARD_DRAFT_KEY)
    setResumeDraft(null)
  }

  // Esc должен закрыть мастер и НЕ долетать до глобального up() в LensRail
  // (тот слушает keydown на window в bubble-фазе). Capture-фаза перехватывает
  // событие раньше независимо от порядка монтирования, stopPropagation
  // останавливает его до bubble-обработчиков.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [onClose])

  const step = WIZARD_STEPS[stepIndex]
  const StepComponent = STEP_COMPONENTS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === WIZARD_STEPS.length - 1
  const canAdvance = isStepValid(stepIndex, answers) && (stepIndex > 0 || projectName.trim().length > 0)

  function handleFillDemo() {
    setProjectName(DEMO_PROJECT.name)
    setAnswers(demoAnswers())
  }

  function handleFinish() {
    const slugBase = slugify(projectName)
    let id = slugBase
    let i = 2
    while (projects.some((p) => p.id === id)) {
      id = `${slugBase}-${i}`
      i += 1
    }
    const doc = buildDraftDoc(projectName.trim(), answers)
    addProject(id, doc)
    safeRemove(WIZARD_DRAFT_KEY)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="flex h-full w-full flex-col overflow-hidden border border-line bg-surface md:h-auto md:max-h-[85vh] md:w-full md:max-w-2xl md:rounded-[12px]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div>
            <span className="font-mono text-[11px] text-ink-faint">
              Шаг {stepIndex + 1} из {WIZARD_STEPS.length}
            </span>
            <h1 className="mt-0.5 text-[16px] font-medium tracking-tight text-ink">{step.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {stepIndex === 0 ? (
              <button
                type="button"
                onClick={handleFillDemo}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
              >
                <Sparkle size={14} weight="regular" />
                Заполнить примером
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть мастер"
              title="Закрыть мастер"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98]"
            >
              <X size={16} weight="regular" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {WIZARD_STEPS.map((s, i) => (
            <span
              key={s.id}
              aria-hidden="true"
              className={`h-[6px] w-[6px] shrink-0 rounded-full ${i === stepIndex ? 'bg-accent' : 'bg-line-strong'}`}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {resumeDraft ? (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-line p-3">
              <span className="text-[13px] text-ink-dim">
                Есть незаконченный черновик от {formatDraftDate(resumeDraft.updatedAt)}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="rounded-lg border border-accent-dim bg-accent/12 px-3 py-1 text-[13px] text-accent transition-colors hover:bg-accent/20 active:scale-[0.98]"
                >
                  Продолжить
                </button>
                <button
                  type="button"
                  onClick={handleRestartDraft}
                  className="rounded-lg px-3 py-1 text-[13px] text-ink-dim transition-colors hover:text-ink active:scale-[0.98]"
                >
                  Начать заново
                </button>
              </div>
            </div>
          ) : null}
          {saveWarning ? (
            <p className="mb-5 rounded-lg border border-risk/50 p-3 text-[13px] text-risk">{saveWarning}</p>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <p className="mb-5 text-[13px] leading-relaxed text-ink-dim">{step.hint}</p>
              <StepComponent
                answers={answers}
                setAnswers={setAnswers}
                projectName={projectName}
                setProjectName={setProjectName}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="rounded-lg px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Назад
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canAdvance}
              className="rounded-lg border border-accent-dim bg-accent/12 px-4 py-1.5 text-[13px] text-accent transition-colors hover:bg-accent/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Создать карту проекта
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(WIZARD_STEPS.length - 1, i + 1))}
              disabled={!canAdvance}
              className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Далее
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
