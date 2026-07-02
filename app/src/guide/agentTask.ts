// Собирает markdown-задачу для Claude Code из узла карты. SPEC.md §4 —
// режим «Диспетчер»: выбранный узел -> markdown-промпт с контекстом,
// связями и критериями приёмки.
import type { MapDoc, MapNode, NodeStatus } from '../types'

const STATUS_LABEL: Record<NodeStatus, string> = {
  ok: 'стабильно',
  warn: 'требует внимания',
  risk: 'недоработка',
  todo: 'задумано, не сделано',
}

function findNode(doc: MapDoc, id: string): MapNode | undefined {
  return doc.nodes.find((n) => n.id === id)
}

function describeLink(doc: MapDoc, otherId: string, direction: 'from' | 'to', label?: string): string {
  const other = findNode(doc, otherId)
  const title = other ? other.title : otherId
  const arrow = direction === 'from' ? '→' : '←'
  const labelSuffix = label ? ` (${label})` : ''
  return `- ${arrow} ${title}${labelSuffix}`
}

export function buildAgentTask(doc: MapDoc, nodeId: string): string {
  const node = findNode(doc, nodeId)
  if (!node) return ''

  const meta = node.meta ?? {}
  const outgoing = doc.links.filter((l) => l.from === nodeId)
  const incoming = doc.links.filter((l) => l.to === nodeId)

  const lines: string[] = []

  lines.push('# Задача из карты Project Cockpit')
  lines.push('')
  lines.push(`## ${node.title}`)
  lines.push('')
  lines.push('### Контекст')
  lines.push(`- Вид: ${node.kind}, уровень L${node.level}`)
  lines.push(`- Статус: ${STATUS_LABEL[node.status]}`)
  if (meta.path) lines.push(`- Путь: \`${meta.path}\``)
  if (meta.symbol) lines.push(`- Символ: \`${meta.symbol}\``)
  if (meta.lines) lines.push(`- Строк: ${meta.lines}`)
  if (node.sub) lines.push(`- Описание: ${node.sub}`)
  if (meta.note) lines.push(`- Заметка: ${meta.note}`)

  if (outgoing.length > 0 || incoming.length > 0) {
    lines.push('')
    lines.push('### Связи')
    for (const link of outgoing) {
      lines.push(describeLink(doc, link.to, 'from', link.label))
    }
    for (const link of incoming) {
      lines.push(describeLink(doc, link.from, 'to', link.label))
    }
  }

  if (node.code) {
    lines.push('')
    lines.push('### Код')
    lines.push('```')
    lines.push(node.code)
    lines.push('```')
  }

  lines.push('')
  lines.push('### Критерии приёмки')
  if (meta.note) {
    lines.push(`- Устранить проблему, описанную в заметке: «${meta.note}»`)
  }
  lines.push('- Покрыть изменение тестом')
  if (outgoing.length > 0 || incoming.length > 0) {
    const neighborTitles = [...outgoing.map((l) => l.to), ...incoming.map((l) => l.from)]
      .map((id) => findNode(doc, id)?.title ?? id)
      .join(', ')
    lines.push(`- Не сломать связи с: ${neighborTitles}`)
  }

  lines.push('')
  lines.push('Выполни задачу выше, учитывая контекст и критерии приёмки.')

  return lines.join('\n')
}
