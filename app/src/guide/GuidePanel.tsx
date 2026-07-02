import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  Check,
  ChatCircleDots,
  ClipboardText,
  CircleNotch,
  Compass,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useCockpitStore } from '../store'
import { buildAgentTask } from './agentTask'
import { applyStepAction, clampStepIndex, createTour, type GuideApi } from './engine'
import { askGemini, buildMapDigest, clearKey, getKey, setKey, type GeminiErrorKind } from './gemini'

type GuideMode = 'tour' | 'ask' | 'task'

const MODE_TABS: Array<{ id: GuideMode; label: string; Icon: typeof Compass }> = [
  { id: 'tour', label: 'Экскурсия', Icon: Compass },
  { id: 'ask', label: 'Спросить', Icon: ChatCircleDots },
  { id: 'task', label: 'Задача', Icon: ClipboardText },
]

const SUGGESTED_QUESTIONS = [
  'Где самые рискованные места?',
  'Что не доделано?',
  'Как устроена обработка сообщения?',
]

const ERROR_MESSAGE: Record<GeminiErrorKind, string> = {
  'bad-key': 'Ключ не подошёл.',
  'rate-limit': 'Слишком много запросов — Gemini временно ограничил лимит.',
  network: 'Не получилось связаться с Gemini.',
}

/** Панель-переключатель режимов гида: Экскурсия / Спросить / Задача. */
export function GuidePanel() {
  const [mode, setMode] = useState<GuideMode>('tour')

  return (
    <div className="flex h-full flex-col">
      <div
        role="tablist"
        aria-label="Режим гида"
        className="flex h-9 shrink-0 items-center gap-1 border-b border-line px-2"
      >
        {MODE_TABS.map(({ id, label }) => {
          const active = mode === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(id)}
              className={[
                'rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors active:scale-[0.98]',
                active ? 'bg-surface-2 text-accent' : 'text-ink-faint hover:text-ink-dim',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === 'tour' ? <TourMode /> : mode === 'ask' ? <AskMode /> : <TaskMode />}
      </div>
    </div>
  )
}

function TourMode() {
  const steps = useMemo(() => createTour(), [])
  const [stepIndex, setStepIndex] = useState(0)

  const jumpTo = useCockpitStore((s) => s.jumpTo)
  const drillInto = useCockpitStore((s) => s.drillInto)
  const setLens = useCockpitStore((s) => s.setLens)
  const select = useCockpitStore((s) => s.select)

  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  function goTo(nextIndex: number) {
    setStepIndex(clampStepIndex(nextIndex, steps.length))
  }

  function handleApply() {
    const api: GuideApi = {
      setLens,
      setPath: (ids) => {
        jumpTo(-1)
        for (const id of ids) drillInto(id)
      },
      select,
    }
    applyStepAction(step, api)
  }

  return (
    <div className="flex h-full flex-col divide-y divide-line">
      <div className="p-4">
        <div className="flex items-center justify-between font-mono text-[11px] text-ink-faint">
          <span>
            Шаг {stepIndex + 1} / {steps.length}
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              aria-hidden="true"
              className={`h-[6px] w-[6px] shrink-0 rounded-full ${i === stepIndex ? 'bg-accent' : 'bg-line-strong'}`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <h2 className="text-[14px] font-medium text-ink">{step.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">{step.body}</p>

            {step.action ? (
              <button
                type="button"
                onClick={handleApply}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface-2 active:scale-[0.98]"
              >
                {step.action.label}
                <ArrowRight size={14} weight="regular" />
              </button>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => goTo(stepIndex - 1)}
          disabled={isFirst}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CaretLeft size={14} weight="regular" />
          Назад
        </button>
        <button
          type="button"
          onClick={() => goTo(stepIndex + 1)}
          disabled={isLast}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Далее
          <CaretRight size={14} weight="regular" />
        </button>
      </div>
    </div>
  )
}

function AskMode() {
  const doc = useCockpitStore((s) => s.doc)
  const [key, setLocalKey] = useState(() => getKey())
  const [keyInput, setKeyInput] = useState('')
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<GeminiErrorKind | null>(null)
  const [loading, setLoading] = useState(false)

  function handleSaveKey() {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setKey(trimmed)
    setLocalKey(trimmed)
    setKeyInput('')
  }

  function handleReplaceKey() {
    clearKey()
    setLocalKey(null)
    setAnswer(null)
    setError(null)
  }

  async function handleAsk(questionText: string) {
    if (!key || !questionText.trim() || loading) return
    setLastQuestion(questionText)
    setLoading(true)
    setError(null)
    setAnswer(null)
    const digest = buildMapDigest(doc)
    const result = await askGemini(key, digest, questionText)
    setLoading(false)
    if (result.ok) {
      setAnswer(result.text)
    } else {
      setError(result.error)
    }
  }

  if (!key) {
    return (
      <div className="p-5">
        <p className="text-[13px] leading-relaxed text-ink-dim">
          Вставь свой Gemini API ключ — он останется только в этом браузере (localStorage).
        </p>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="AIza…"
          className="mt-3 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSaveKey}
          disabled={!keyInput.trim()}
          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Сохранить
        </button>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-[12px] text-accent hover:underline"
        >
          aistudio.google.com/apikey
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-5">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Спроси про архитектуру, риски, связи…"
        rows={3}
        className="w-full resize-none rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
      />

      <button
        type="button"
        onClick={() => void handleAsk(question)}
        disabled={loading || !question.trim()}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? <CircleNotch size={14} weight="regular" className="animate-spin" /> : null}
        Спросить гида
      </button>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setQuestion(q)
              void handleAsk(q)
            }}
            disabled={loading}
            className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {answer ? <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{answer}</p> : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-risk/50 bg-risk/12 p-3 text-[13px] text-ink">
          <p>{ERROR_MESSAGE[error]}</p>
          <button
            type="button"
            onClick={error === 'bad-key' ? handleReplaceKey : () => void handleAsk(lastQuestion)}
            className="mt-2 text-[13px] text-accent hover:underline"
          >
            {error === 'bad-key' ? 'Заменить ключ' : 'Повторить'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function TaskMode() {
  const doc = useCockpitStore((s) => s.doc)
  const selectedId = useCockpitStore((s) => s.selectedId)
  const [copied, setCopied] = useState(false)

  const task = selectedId ? buildAgentTask(doc, selectedId) : ''

  async function handleCopy() {
    if (!task) return
    try {
      await navigator.clipboard.writeText(task)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Буфер обмена недоступен (нет разрешения/контекст небезопасен) —
      // текст уже виден в <pre>, пользователь скопирует вручную.
    }
  }

  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-ink-dim">
        <ClipboardText size={24} weight="regular" className="text-ink-faint" />
        <p className="text-[13px]">Выбери узел на карте — соберу из него задачу для Claude Code.</p>
      </div>
    )
  }

  return (
    <div className="p-5">
      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 font-mono text-[11px] text-ink-dim">
        {task}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-surface-2 active:scale-[0.98]"
      >
        {copied ? <Check size={14} weight="regular" className="text-ok" /> : <ClipboardText size={14} weight="regular" />}
        {copied ? 'Скопировано' : 'Скопировать задачу'}
      </button>
    </div>
  )
}
