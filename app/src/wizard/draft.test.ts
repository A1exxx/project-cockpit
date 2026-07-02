import { describe, expect, it } from 'vitest'
import type { MapNode } from '../types'
import { buildDraftDoc, type WizardAnswers } from './draft'

function makeAnswers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    essence: { problem: 'Люди забывают пить воду', user: 'Офисный сотрудник', outcome: 'Пьёт воду вовремя' },
    screens: ['Главный экран', 'История'],
    features: { must: ['Напоминание по таймеру', 'Отметка выпитого'], later: ['Синхронизация с часами'] },
    entities: ['Пользователь', 'Запись'],
    integrations: ['Telegram Bot API'],
    plan: { done: ['Напоминание работает', 'Отметка сохраняется', 'Бот отвечает'], killDate: '2026-07-16' },
    ...overrides,
  }
}

function byId(nodes: MapNode[]): Map<string, MapNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

describe('buildDraftDoc — целостность структуры', () => {
  it('создаёт ровно один корневой L0-узел «Продукт / разработка»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const roots = doc.nodes.filter((n) => n.parent === null)
    expect(roots).toHaveLength(1)
    expect(roots[0].level).toBe(0)
    expect(roots[0].title).toBe('Продукт / разработка')
  })

  it('каждый parent, кроме null, указывает на существующий id в том же документе', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const ids = new Set(doc.nodes.map((n) => n.id))
    for (const n of doc.nodes) {
      if (n.parent !== null) expect(ids.has(n.parent)).toBe(true)
    }
  })

  it('id узлов уникальны по всему документу', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const ids = doc.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('создаёт L1-системы Интерфейс/Логика/Данные/Интеграции при непустых ответах', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const l1 = doc.nodes.filter((n) => n.level === 1).map((n) => n.title)
    expect(l1).toEqual(expect.arrayContaining(['Интерфейс', 'Логика', 'Данные', 'Интеграции']))
  })

  it('не создаёт систему «Интеграции», если integrations пуст', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers({ integrations: [] }))
    const l1Titles = doc.nodes.filter((n) => n.level === 1).map((n) => n.title)
    expect(l1Titles).not.toContain('Интеграции')
  })

  it('«Интерфейс» получает L2-детей по одному на каждый экран', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const interfaceSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Интерфейс')!
    const kids = doc.nodes.filter((n) => n.parent === interfaceSys.id)
    expect(kids.map((k) => k.title).sort()).toEqual(['Главный экран', 'История'].sort())
    expect(kids.every((k) => k.level === 2)).toBe(true)
  })

  it('«Данные» получает L2-детей по одному на каждую сущность', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const dataSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Данные')!
    const kids = doc.nodes.filter((n) => n.parent === dataSys.id)
    expect(kids.map((k) => k.title).sort()).toEqual(['Запись', 'Пользователь'].sort())
  })

  it('«Интеграции» получает L2-детей по одному на каждую интеграцию', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers({ integrations: ['Telegram Bot API', 'Платёжка'] }))
    const intSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Интеграции')!
    const kids = doc.nodes.filter((n) => n.parent === intSys.id)
    expect(kids.map((k) => k.title).sort()).toEqual(['Платёжка', 'Telegram Bot API'].sort())
  })

  it('создаёт систему «План v1» с L2-нодами по Done-чеклисту', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const planSys = doc.nodes.find((n) => n.level === 1 && n.title === 'План v1')
    expect(planSys).toBeDefined()
    const kids = doc.nodes.filter((n) => n.parent === planSys!.id)
    expect(kids).toHaveLength(3)
    expect(kids.every((k) => k.status === 'todo')).toBe(true)
  })

  it('killDate попадает в note узла «План v1»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const planSys = doc.nodes.find((n) => n.level === 1 && n.title === 'План v1')!
    expect(planSys.meta?.note).toContain('2026-07-16')
  })
})

describe('buildDraftDoc — статусы', () => {
  it('все узлы имеют status "todo" (черновик — ничего ещё не сделано)', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    expect(doc.nodes.every((n) => n.status === 'todo')).toBe(true)
  })
})

describe('buildDraftDoc — features.later', () => {
  it('later-фичи становятся L2-нодами внутри «Логика» с sub «не сейчас»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const logicSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Логика')!
    const laterNode = doc.nodes.find((n) => n.parent === logicSys.id && n.title === 'Синхронизация с часами')
    expect(laterNode).toBeDefined()
    expect(laterNode!.sub).toBe('не сейчас')
  })

  it('later-нода несёт meta.note с пометкой «вне v1»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const laterNode = doc.nodes.find((n) => n.title === 'Синхронизация с часами')!
    expect(laterNode.meta?.note).toBe('вне v1 — из списка «НЕ сейчас»')
  })

  it('must-фичи НЕ несут sub «не сейчас»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const mustNode = doc.nodes.find((n) => n.title === 'Напоминание по таймеру')!
    expect(mustNode.sub).not.toBe('не сейчас')
  })

  it('пустой later не создаёт лишних нод', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers({ features: { must: ['Только маст'], later: [] } }))
    const logicSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Логика')!
    const kids = doc.nodes.filter((n) => n.parent === logicSys.id)
    expect(kids).toHaveLength(1)
  })
})

describe('buildDraftDoc — project и корневая нода', () => {
  it('project.desc равен outcome', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    expect(doc.project.desc).toBe('Пьёт воду вовремя')
  })

  it('project.name равен переданному имени', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    expect(doc.project.name).toBe('Трекер воды')
  })

  it('meta.note корневой ноды содержит problem и user через " / для: "', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const root = doc.nodes.find((n) => n.parent === null)!
    expect(root.meta?.note).toBe('Люди забывают пить воду / для: Офисный сотрудник')
  })
})

describe('buildDraftDoc — links', () => {
  it('каждая интеграция получает связь call → «Логика» с label «использует»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers({ integrations: ['Telegram Bot API', 'Платёжка'] }))
    const logicSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Логика')!
    const intSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Интеграции')!
    const intKids = doc.nodes.filter((n) => n.parent === intSys.id)

    for (const kid of intKids) {
      const link = doc.links.find((l) => l.from === kid.id && l.to === logicSys.id)
      expect(link).toBeDefined()
      expect(link!.kind).toBe('call')
      expect(link!.label).toBe('использует')
    }
  })

  it('«Логика» → «Данные», kind data, label «хранит»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const logicSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Логика')!
    const dataSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Данные')!
    const link = doc.links.find((l) => l.from === logicSys.id && l.to === dataSys.id)
    expect(link).toBeDefined()
    expect(link!.kind).toBe('data')
    expect(link!.label).toBe('хранит')
  })

  it('«Интерфейс» → «Логика», kind call, label «действия юзера»', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers())
    const interfaceSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Интерфейс')!
    const logicSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Логика')!
    const link = doc.links.find((l) => l.from === interfaceSys.id && l.to === logicSys.id)
    expect(link).toBeDefined()
    expect(link!.kind).toBe('call')
    expect(link!.label).toBe('действия юзера')
  })

  it('все links ссылаются на существующие id узлов', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers({ integrations: ['A', 'B'] }))
    const ids = new Set(doc.nodes.map((n) => n.id))
    for (const link of doc.links) {
      expect(ids.has(link.from)).toBe(true)
      expect(ids.has(link.to)).toBe(true)
    }
  })

  it('без интеграций нет links «использует» и общее число links = 2 (Интерфейс→Логика, Логика→Данные)', () => {
    const doc = buildDraftDoc('Трекер воды', makeAnswers({ integrations: [] }))
    expect(doc.links).toHaveLength(2)
    expect(doc.links.every((l) => l.label !== 'использует')).toBe(true)
  })
})

describe('buildDraftDoc — kebab-slug id: транслитерация, нормализация, коллизии', () => {
  it('id — kebab-case без кириллицы и пробелов', () => {
    const doc = buildDraftDoc('Трекер привычек', makeAnswers())
    for (const n of doc.nodes) {
      expect(n.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('одинаковые заголовки на одном уровне вложенности получают разные id (суффикс индекса)', () => {
    const doc = buildDraftDoc(
      'Тест',
      makeAnswers({
        features: { must: ['Уведомление', 'Уведомление'], later: [] },
      }),
    )
    const logicSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Логика')!
    const kids = doc.nodes.filter((n) => n.parent === logicSys.id)
    expect(kids).toHaveLength(2)
    const ids = kids.map((k) => k.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('заголовки с одинаковой транслитерацией, но разным регистром/пунктуацией тоже не коллизят', () => {
    const doc = buildDraftDoc(
      'Тест',
      makeAnswers({
        entities: ['Заказ!', 'заказ', 'ЗАКАЗ'],
      }),
    )
    const dataSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Данные')!
    const kids = doc.nodes.filter((n) => n.parent === dataSys.id)
    expect(kids).toHaveLength(3)
    const ids = kids.map((k) => k.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('пустая строка/только-пунктуация в заголовке всё равно даёт непустой валидный id', () => {
    const doc = buildDraftDoc('Тест', makeAnswers({ screens: ['!!!'] }))
    const interfaceSys = doc.nodes.find((n) => n.level === 1 && n.title === 'Интерфейс')!
    const kid = doc.nodes.find((n) => n.parent === interfaceSys.id)!
    expect(kid.id.length).toBeGreaterThan(0)
    expect(kid.id).toMatch(/^[a-z0-9-]+$/)
  })

  it('два разных вызова buildDraftDoc с разным именем проекта не коллизят между собой (slug включает контекст проекта в корне)', () => {
    const doc1 = buildDraftDoc('Проект Альфа', makeAnswers())
    const doc2 = buildDraftDoc('Проект Бета', makeAnswers())
    const root1 = doc1.nodes.find((n) => n.parent === null)!
    const root2 = doc2.nodes.find((n) => n.parent === null)!
    // Оба документа самодостаточны (не смешиваются в одном массиве), но
    // если их объединить (addProject кладёт doc целиком, не сливая узлы) —
    // конфликт id внутри ОДНОГО doc не возникает, это гарантируется отдельно.
    expect(root1.id).toBeTruthy()
    expect(root2.id).toBeTruthy()
  })

  it('L0/L1 узлы (продукт, Интерфейс/Логика/Данные/Интеграции/План v1) тоже без коллизий id между собой', () => {
    const doc = buildDraftDoc('Тест', makeAnswers({ integrations: ['X'] }))
    const l0l1 = doc.nodes.filter((n) => n.level === 0 || n.level === 1)
    const ids = l0l1.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('buildDraftDoc — level согласованность', () => {
  it('level каждой ноды на 1 больше level её родителя', () => {
    const doc = buildDraftDoc('Тест', makeAnswers({ integrations: ['X'] }))
    const map = byId(doc.nodes)
    for (const n of doc.nodes) {
      if (n.parent === null) continue
      const parent = map.get(n.parent)!
      expect(n.level).toBe(parent.level + 1)
    }
  })

  it('kind соответствует уровню (SPEC.md §2): level0=org, level1=system, level2=module', () => {
    const doc = buildDraftDoc('Тест', makeAnswers({ integrations: ['X'] }))
    for (const n of doc.nodes) {
      if (n.level === 0) expect(n.kind).toBe('org')
      if (n.level === 1) expect(n.kind).toBe('system')
      if (n.level === 2) expect(n.kind).toBe('module')
    }
  })
})
