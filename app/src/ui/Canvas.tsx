import type { NodeTypes } from '@xyflow/react'
import { Background, BackgroundVariant, ReactFlow, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo } from 'react'
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

  const { nodes, edges } = useMemo(() => project(doc, path, lens), [doc, path, lens])

  useEffect(() => {
    // Погружение/смена линзы — "ощущение погружения" (DESIGN.md).
    const id = window.requestAnimationFrame(() => {
      fitView({ duration: 500, padding: 0.15 })
    })
    return () => window.cancelAnimationFrame(id)
  }, [path, lens, fitView])

  if (nodes.length === 0) {
    return <EmptyLevel />
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      zoomOnDoubleClick={false}
      fitView
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
