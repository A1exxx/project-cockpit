import type { NodeTypes } from '@xyflow/react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import type { CockpitEdge, CockpitNode as CockpitRfNode, RolledUpLink } from '../graph/projection'
import { edgeId, project, rollupLinks } from '../graph/projection'
import { useCockpitStore } from '../store'
import { CanvasOverlay } from './CanvasOverlay'
import { CockpitNode } from './CockpitNode'
import { EmptyLevel } from './EmptyLevel'

const nodeTypes: NodeTypes = { cockpit: CockpitNode }

function rolledToHoverEdge(link: RolledUpLink): CockpitEdge {
  return {
    id: edgeId(link),
    source: link.from,
    target: link.to,
    type: 'straight',
    data: { kind: link.kind, labels: link.labels, count: link.count, active: true },
    style: {
      stroke: 'var(--color-accent-dim)',
      strokeWidth: 1.5,
      strokeDasharray: '6 4',
      opacity: 0.6,
    },
  }
}

export function Canvas() {
  const doc = useCockpitStore((s) => s.doc)
  const path = useCockpitStore((s) => s.path)
  const lens = useCockpitStore((s) => s.lens)
  const selectedId = useCockpitStore((s) => s.selectedId)
  const select = useCockpitStore((s) => s.select)
  const drillInto = useCockpitStore((s) => s.drillInto)

  const { fitView } = useReactFlow()

  // Чисто визуальный hover-стейт канваса — не в глобальном сторе (DESIGN-ONBOARDING §5.1).
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const projected = useMemo(() => project(doc, path, lens), [doc, path, lens])

  // Мемо rollup рёбер видимого уровня — фильтруется по hover/select дёшево,
  // а не пересчитывается на каждый mousemove (DESIGN-ONBOARDING §5.1).
  const visibleRolled = useMemo(() => {
    const visibleIds = new Set(projected.nodes.map((n) => n.id))
    return rollupLinks(doc, visibleIds)
  }, [doc, projected.nodes])

  // Приоритет: hover активнее select (§5.2). Рёбра рисуем для activeId,
  // но dim соседей применяем только когда реально наведено (hoveredId !== null).
  const activeId = hoveredId ?? selectedId

  // Дополнительные hover/select-рёбра поверх текущей линзы (§5.1/5.2) — рёбра
  // это отдельный слой поверх projected.edges, ноды сюда не входят: дим применяем
  // отдельным точечным апдейтом (ниже), не пересобирая массив нод целиком, —
  // иначе React Flow теряет identity ноды в разгар клика (mousedown видит старую
  // ноду, mouseup — уже другую после ремаунта, клик проваливается).
  const decoratedEdges = useMemo(() => {
    if (activeId === null) return projected.edges

    const activeLinks = visibleRolled.filter((l) => l.from === activeId || l.to === activeId)
    const activeIds = new Set(activeLinks.map(edgeId))
    const projectedIds = new Set(projected.edges.map((e) => e.id))

    // Линза links: projected.edges уже содержит эти рёбра — декорируем на месте
    // (тот же id, флаги active/passive), а не дублируем вторым ребром поверх.
    const base: CockpitEdge[] = projected.edges.map((e) => ({
      ...e,
      data: {
        kind: e.data!.kind,
        labels: e.data!.labels,
        count: e.data!.count,
        active: activeIds.has(e.id),
        passive: !activeIds.has(e.id),
      },
    }))
    // Линзы blocks/risk: projected.edges пуст — hover-рёбра аддитивны, но в том же
    // формате id (edgeId), поэтому Set исключает случайные повторы.
    const extra = activeLinks
      .filter((l) => !projectedIds.has(edgeId(l)))
      .map(rolledToHoverEdge)
    return [...base, ...extra]
  }, [projected.edges, visibleRolled, activeId])

  const dimmedIds = useMemo(() => {
    if (activeId === null || hoveredId === null) return null

    const activeLinks = visibleRolled.filter((l) => l.from === activeId || l.to === activeId)
    const neighborIds = new Set<string>([activeId])
    for (const l of activeLinks) {
      neighborIds.add(l.from)
      neighborIds.add(l.to)
    }
    return neighborIds
  }, [visibleRolled, activeId, hoveredId])

  // Управляемое состояние через useNodesState: React Flow применяет
  // dimension-изменения через onNodesChange — без этого ноды остаются
  // visibility:hidden навсегда (reactflow.dev/error#004-смежное поведение).
  const [nodes, setNodes, onNodesChange] = useNodesState<CockpitRfNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CockpitEdge>([])

  // Структурная смена уровня/линзы — полная замена нод (identity меняется намеренно,
  // React Flow ремонтирует и заново измеряет — это ожидаемо при погружении).
  useEffect(() => {
    setNodes(projected.nodes)
  }, [projected, setNodes])

  useEffect(() => {
    setEdges(decoratedEdges)
  }, [decoratedEdges, setEdges])

  // Точечный дим по hover/select: патчим ТОЛЬКО data.dimmed на уже смонтированных
  // нодах через функциональный setNodes — identity остальных полей не меняется,
  // клик в разгаре (mousedown уже случился) не теряет свою цель.
  useEffect(() => {
    setNodes((current) =>
      current.map((n) => {
        const nextDimmed = dimmedIds !== null && !dimmedIds.has(n.id)
        if (Boolean(n.data.dimmed) === nextDimmed) return n
        return { ...n, data: { ...n.data, dimmed: nextDimmed } }
      }),
    )
  }, [dimmedIds, setNodes])

  useEffect(() => {
    // Погружение/смена линзы — "ощущение погружения" (DESIGN.md).
    // Небольшая задержка: даём React Flow измерить свежие ноды перед fitView.
    const id = window.setTimeout(() => {
      fitView({ duration: 500, padding: 0.15, maxZoom: 1.15 })
    }, 60)
    return () => window.clearTimeout(id)
  }, [projected, fitView])

  // Новый уровень/линза — старый hover больше не относится к видимым нодам.
  useEffect(() => {
    setHoveredId(null)
  }, [doc, path, lens])

  if (projected.nodes.length === 0) {
    return <EmptyLevel />
  }

  return (
    <div className="relative h-full w-full">
      <CanvasOverlay lens={lens} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.15 }}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => select(node.id)}
        onNodeDoubleClick={(_, node) => drillInto(node.id)}
        onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
        onNodeMouseLeave={() => setHoveredId(null)}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--color-line)"
          style={{ opacity: 0.4 }}
        />
      </ReactFlow>
    </div>
  )
}
