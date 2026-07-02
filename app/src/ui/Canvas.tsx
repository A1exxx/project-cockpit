import type { NodeTypes } from '@xyflow/react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useEffect, useMemo } from 'react'
import type { CockpitEdge, CockpitNode as CockpitRfNode } from '../graph/projection'
import { project } from '../graph/projection'
import { useCockpitStore } from '../store'
import { CockpitNode } from './CockpitNode'
import { EmptyLevel } from './EmptyLevel'

const nodeTypes: NodeTypes = { cockpit: CockpitNode }

export function Canvas() {
  const doc = useCockpitStore((s) => s.doc)
  const path = useCockpitStore((s) => s.path)
  const lens = useCockpitStore((s) => s.lens)
  const select = useCockpitStore((s) => s.select)
  const drillInto = useCockpitStore((s) => s.drillInto)

  const { fitView } = useReactFlow()

  const projected = useMemo(() => project(doc, path, lens), [doc, path, lens])

  // Управляемое состояние через useNodesState: React Flow применяет
  // dimension-изменения через onNodesChange — без этого ноды остаются
  // visibility:hidden навсегда (reactflow.dev/error#004-смежное поведение).
  const [nodes, setNodes, onNodesChange] = useNodesState<CockpitRfNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CockpitEdge>([])

  useEffect(() => {
    setNodes(projected.nodes)
    setEdges(projected.edges)
  }, [projected, setNodes, setEdges])

  useEffect(() => {
    // Погружение/смена линзы — "ощущение погружения" (DESIGN.md).
    // Небольшая задержка: даём React Flow измерить свежие ноды перед fitView.
    const id = window.setTimeout(() => {
      fitView({ duration: 500, padding: 0.15, maxZoom: 1.15 })
    }, 60)
    return () => window.clearTimeout(id)
  }, [projected, fitView])

  if (projected.nodes.length === 0) {
    return <EmptyLevel />
  }

  return (
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
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="var(--color-line)"
        style={{ opacity: 0.4 }}
      />
    </ReactFlow>
  )
}
