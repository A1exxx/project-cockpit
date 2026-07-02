// Чистая генерация карты-черновика из ответов мастера «Новый проект».
// См. SPEC.md §4 (режим «Наставник») и §5 (формат MapDoc).
import type { MapDoc, MapLink, MapNode } from '../types'

export interface WizardAnswers {
  essence: { problem: string; user: string; outcome: string }
  screens: string[]
  features: { must: string[]; later: string[] }
  entities: string[]
  integrations: string[]
  plan: { done: string[]; killDate: string }
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
}

/** kebab-slug: транслитерация кириллицы + нормализация в [a-z0-9-]. Пустой вход даёт 'node'. */
function slugify(text: string): string {
  const slug = transliterate(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'node'
}

/** Фабрика уникальных id: при коллизии добавляет суффикс -2, -3, ... */
function createSlugger() {
  const used = new Set<string>()
  return (text: string): string => {
    const base = slugify(text)
    let candidate = base
    let i = 2
    while (used.has(candidate)) {
      candidate = `${base}-${i}`
      i += 1
    }
    used.add(candidate)
    return candidate
  }
}

export function buildDraftDoc(name: string, a: WizardAnswers): MapDoc {
  const slug = createSlugger()
  const nodes: MapNode[] = []
  const links: MapLink[] = []

  const rootId = slug('product')
  nodes.push({
    id: rootId,
    parent: null,
    level: 0,
    kind: 'org',
    title: 'Продукт / разработка',
    status: 'todo',
    meta: { note: `${a.essence.problem} / для: ${a.essence.user}` },
  })

  function addSystem(title: string): string {
    const id = slug(title)
    nodes.push({ id, parent: rootId, level: 1, kind: 'system', title, status: 'todo' })
    return id
  }

  function addModule(systemId: string, title: string, extra?: Partial<Omit<MapNode, 'title'>>): string {
    const id = slug(title)
    nodes.push({
      id,
      parent: systemId,
      level: 2,
      kind: 'module',
      title,
      status: 'todo',
      ...extra,
    })
    return id
  }

  // Интерфейс — L2 = экраны.
  const interfaceId = addSystem('Интерфейс')
  for (const screen of a.screens) addModule(interfaceId, screen)

  // Логика — L2 = must-фичи + later-фичи (помечены «не сейчас»).
  const logicId = addSystem('Логика')
  for (const feature of a.features.must) addModule(logicId, feature)
  for (const feature of a.features.later) {
    addModule(logicId, feature, {
      sub: 'не сейчас',
      meta: { note: 'вне v1 — из списка «НЕ сейчас»' },
    })
  }

  // Данные — L2 = сущности.
  const dataId = addSystem('Данные')
  for (const entity of a.entities) addModule(dataId, entity)

  // Интеграции — создаём систему только если список непуст.
  let integrationIds: string[] = []
  if (a.integrations.length > 0) {
    const integrationsId = addSystem('Интеграции')
    integrationIds = a.integrations.map((integration) => addModule(integrationsId, integration))
  }

  // План v1 — L2 = пункты Done-чеклиста; killDate в note системы.
  const planId = slug('План v1')
  nodes.push({
    id: planId,
    parent: rootId,
    level: 1,
    kind: 'system',
    title: 'План v1',
    status: 'todo',
    meta: { note: `дата-убийца: ${a.plan.killDate}` },
  })
  for (const item of a.plan.done) {
    addModule(planId, item, { sub: item })
  }

  // Связи (SPEC.md §5 links).
  for (const integrationId of integrationIds) {
    links.push({ from: integrationId, to: logicId, kind: 'call', label: 'использует' })
  }
  links.push({ from: logicId, to: dataId, kind: 'data', label: 'хранит' })
  links.push({ from: interfaceId, to: logicId, kind: 'call', label: 'действия юзера' })

  return {
    version: 1,
    project: { name, desc: a.essence.outcome, stack: [] },
    nodes,
    links,
  }
}
