import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, useInternalNode } from '@xyflow/react'
import type { EdgeProps, InternalNode } from '@xyflow/react'
import type { CockpitEdge } from '../graph/projection'

/** Геометрия одной ноды, достаточная для нахождения точки на её периметре. */
interface NodeRect {
  x: number
  y: number
  width: number
  height: number
}

function toRect(node: InternalNode): NodeRect | null {
  const width = node.measured?.width
  const height = node.measured?.height
  if (width === undefined || height === undefined) return null
  return { x: node.internals.positionAbsolute.x, y: node.internals.positionAbsolute.y, width, height }
}

/**
 * Точка пересечения линии центр(source)→центр(target) с периметром прямоугольника `inner`,
 * плюс сторона (Position), к которой она относится — по доминирующей оси разницы центров.
 * Паттерн — официальный React Flow floating-edges example (utils.ts), портирован 1:1.
 */
function getNodeIntersection(inner: NodeRect, outerCenter: { x: number; y: number }) {
  const w = inner.width / 2
  const h = inner.height / 2
  const x2 = inner.x + w
  const y2 = inner.y + h

  const xx1 = (outerCenter.x - x2) / w
  const yy1 = (outerCenter.y - y2) / h
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1)
  const xx3 = a * xx1
  const yy3 = a * yy1
  const x = x2 + xx3 * w
  const y = y2 + yy3 * h

  let position: Position
  if (Math.abs(xx3) > Math.abs(yy3)) {
    position = xx3 > 0 ? Position.Right : Position.Left
  } else {
    position = yy3 > 0 ? Position.Bottom : Position.Top
  }
  return { x, y, position }
}

interface EdgeParams {
  sx: number
  sy: number
  tx: number
  ty: number
  sourcePos: Position
  targetPos: Position
}

/** Для пары нод — точки на периметре каждой, ближайшие к центру другой (§5.2 DESIGN-V2.md). */
function getEdgeParams(sourceNode: InternalNode, targetNode: InternalNode): EdgeParams | null {
  const sourceRect = toRect(sourceNode)
  const targetRect = toRect(targetNode)
  if (!sourceRect || !targetRect) return null

  const sourceCenter = { x: sourceRect.x + sourceRect.width / 2, y: sourceRect.y + sourceRect.height / 2 }
  const targetCenter = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 }

  const source = getNodeIntersection(sourceRect, targetCenter)
  const target = getNodeIntersection(targetRect, sourceCenter)

  return { sx: source.x, sy: source.y, tx: target.x, ty: target.y, sourcePos: source.position, targetPos: target.position }
}

/**
 * Ребро линзы «Связи»: цепляется к ближайшей точке периметра ноды (не к центру) —
 * не проходит сквозь другие ноды на пути (DESIGN-V2.md §5.2).
 */
export function FloatingEdge({ id, source, target, data, markerEnd }: EdgeProps<CockpitEdge>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  if (!sourceNode || !targetNode) return null
  const params = getEdgeParams(sourceNode, targetNode)
  if (!params) return null

  const [path, labelX, labelY] = getBezierPath({
    sourceX: params.sx,
    sourceY: params.sy,
    sourcePosition: params.sourcePos,
    targetX: params.tx,
    targetY: params.ty,
    targetPosition: params.targetPos,
    curvature: 0.2,
  })

  const active = Boolean(data?.active)
  const passive = Boolean(data?.passive)
  const style = {
    stroke: active ? 'var(--color-accent)' : 'var(--color-accent-dim)',
    strokeWidth: active ? 2 : 1.5,
    strokeDasharray: '6 4',
    opacity: active ? 0.9 : passive ? 0.15 : 0.6,
    transition: 'opacity 150ms, stroke 150ms',
  }

  const count = data?.count ?? 1
  const labelText = count > 1 ? `${data?.labels[0] ?? data?.kind} +${count - 1}` : (data?.labels[0] ?? data?.kind)
  const totalEdgeCount = (data as { levelEdgeCount?: number } | undefined)?.levelEdgeCount ?? 0
  const showLabel = active || totalEdgeCount <= 12

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={20} />
      {showLabel && labelText ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-dim"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
