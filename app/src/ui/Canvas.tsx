import type { EdgeTypes, NodeTypes } from '@xyflow/react'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { STATUS_HEX } from '../graph/docStats'
import type { CockpitEdge, CockpitNode as CockpitRfNode, RolledUpLink } from '../graph/projection'
import { edgeId, project, rollupLinks } from '../graph/projection'
import { clearPositions, loadPositions, savePosition } from '../persistence/positions'
import { useCockpitStore } from '../store'
import { CanvasOverlay } from './CanvasOverlay'
import { CockpitNode } from './CockpitNode'
import { EmptyLevel } from './EmptyLevel'
import { FloatingEdge } from './FloatingEdge'

const nodeTypes: NodeTypes = { cockpit: CockpitNode }
const edgeTypes: EdgeTypes = { floating: FloatingEdge }

/** Порог видимых нод уровня, начиная с которого показываем миникарту (DESIGN-V2.md §7). */
const MINIMAP_NODE_THRESHOLD = 12

function rolledToHoverEdge(link: RolledUpLink, levelEdgeCount: number): CockpitEdge {
  return {
    id: edgeId(link),
    source: link.from,
    target: link.to,
    type: 'floating',
    data: { kind: link.kind, labels: link.labels, count: link.count, active: true, levelEdgeCount },
  }
}

export function Canvas() {
  const doc = useCockpitStore((s) => s.doc)
  const path = useCockpitStore((s) => s.path)
  const lens = useCockpitStore((s) => s.lens)
  const selectedId = useCockpitStore((s) => s.selectedId)
  const select = useCockpitStore((s) => s.select)
  const drillInto = useCockpitStore((s) => s.drillInto)
  const activeProjectId = useCockpitStore((s) => s.activeProjectId)

  const { fitView } = useReactFlow()

  // Чисто визуальный hover-стейт канваса — не в глобальном сторе (DESIGN-ONBOARDING §5.1).
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const focusId = path.length > 0 ? path[path.length - 1] : null

  // Снапшот оверрайдов позиций читается из localStorage один раз на вход в уровень
  // (deps: тройка проект/фокус/линза + layoutNonce) — НЕ реактивен к записям dragStop,
  // иначе каждый drag-stop пересобрал бы projected целиком (DESIGN-V2.md §6).
  const [layoutNonce, setLayoutNonce] = useState(0)
  const overrides = useMemo(
    () => loadPositions(activeProjectId, focusId, lens),
    [activeProjectId, focusId, lens, layoutNonce],
  )
  const hasOverrides = Object.keys(overrides).length > 0

  const projected = useMemo(() => project(doc, path, lens, overrides), [doc, path, lens, overrides])

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
    const levelEdgeCount = projected.edges.length

    // Линза links: projected.edges уже содержит эти рёбра — декорируем на месте
    // (тот же id, флаги active/passive), а не дублируем вторым ребром поверх.
    const base: CockpitEdge[] = projected.edges.map((e) => ({
      ...e,
      data: {
        kind: e.data!.kind,
        labels: e.data!.labels,
        count: e.data!.count,
        levelEdgeCount,
        active: activeIds.has(e.id),
        passive: !activeIds.has(e.id),
      },
    }))
    // Линзы blocks/risk: projected.edges пуст — hover-рёбра аддитивны, но в том же
    // формате id (edgeId), поэтому Set исключает случайные повторы.
    const extra = activeLinks
      .filter((l) => !projectedIds.has(edgeId(l)))
      .map((l) => rolledToHoverEdge(l, levelEdgeCount))
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

  // «Разложить заново»: стирает сохранённые оверрайды текущей тройки и триггерит
  // перечитывание оверрайдов (пустых) → авто-layout. fitView срабатывает сам через
  // существующий эффект (projected меняется). Стаггер входа при этом — ожидаемое
  // «пересобрал уровень», не путать с драг-стопом (там ремаунта нет).
  const handleRelayout = () => {
    clearPositions(activeProjectId, focusId, lens)
    setLayoutNonce((n) => n + 1)
  }

  if (projected.nodes.length === 0) {
    return <EmptyLevel />
  }

  return (
    <div className="relative h-full w-full">
      <CanvasOverlay lens={lens} hasOverrides={hasOverrides} onRelayout={handleRelayout} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable={false}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.15 }}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => select(node.id)}
        onNodeDoubleClick={(_, node) => drillInto(node.id)}
        onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
        onNodeMouseLeave={() => setHoveredId(null)}
        onNodeDragStop={(_, node) => savePosition(activeProjectId, focusId, lens, node.id, node.position)}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--color-line)"
          style={{ opacity: 0.4 }}
        />
        {projected.nodes.length > MINIMAP_NODE_THRESHOLD ? (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(n) => STATUS_HEX[(n as CockpitRfNode).data.mapNode.status]}
            maskColor="rgba(11,14,20,0.8)"
            bgColor="var(--color-surface)"
            style={{ border: '1px solid var(--color-line)', borderRadius: 10 }}
          />
        ) : null}
      </ReactFlow>
    </div>
  )
}
