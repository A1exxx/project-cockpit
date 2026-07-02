import { useEffect, useState } from 'react'
import type { MapNode } from '../types'

type HighlightState =
  | { status: 'loading' }
  | { status: 'ready'; html: string }
  | { status: 'error' }

const SKELETON_LINE_WIDTHS = ['w-5/6', 'w-2/3', 'w-full', 'w-1/2', 'w-3/4', 'w-1/3']

/** Заголовок meta.path · meta.symbol · meta.lines строк, mono 11px ink-faint. */
function CodeMetaLine({ node }: { node: MapNode }) {
  const parts = [node.meta?.path, node.meta?.symbol, node.meta?.lines != null ? `${node.meta.lines} строк` : null]
    .filter(Boolean)

  if (parts.length === 0) return null

  return (
    <div className="border-b border-line px-3 py-2 font-mono text-[11px] text-ink-faint">
      {parts.join(' · ')}
    </div>
  )
}

function CodeSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-hidden="true">
      {SKELETON_LINE_WIDTHS.map((w, i) => (
        <div key={i} className={`h-3 animate-pulse rounded bg-line ${w}`} />
      ))}
    </div>
  )
}

/**
 * Рендер code-сниппета узла (только L4) через shiki, lazy-загружаемый
 * динамическим import()'ом. Ошибка подсветки → фолбэк на обычный <pre>,
 * не роняет панель.
 */
export function CodeView({ node }: { node: MapNode }) {
  const code = node.code ?? ''
  const [state, setState] = useState<HighlightState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    import('shiki')
      .then(({ createHighlighter }) =>
        createHighlighter({ themes: ['github-dark-default'], langs: ['python'] }),
      )
      .then((highlighter) => {
        if (cancelled) return
        const html = highlighter.codeToHtml(code, { lang: 'python', theme: 'github-dark-default' })
        setState({ status: 'ready', html })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
      <CodeMetaLine node={node} />
      <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
        {state.status === 'loading' ? <CodeSkeleton /> : null}
        {state.status === 'ready' ? (
          <div
            className="[&_pre]:!bg-transparent [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[12px] [&_pre]:leading-relaxed"
            // shiki генерирует статичную безопасную разметку из исходного кода узла (не пользовательский ввод).
            dangerouslySetInnerHTML={{ __html: state.html }}
          />
        ) : null}
        {state.status === 'error' ? (
          <pre className="p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink-dim">
            {code}
          </pre>
        ) : null}
      </div>
    </div>
  )
}
