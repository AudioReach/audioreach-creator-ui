// DataLinkEdge component (solid line)
import type {FC} from "react"

import {BaseEdge, type EdgeProps, getBezierPath} from "@xyflow/react"

export const DataLinkEdge: FC<EdgeProps> = (props) => {
  const [path] = getBezierPath(props)
  return (
    <BaseEdge
      id={props.id}
      markerEnd="url(#reactflow__arrowhead)"
      path={path}
      style={{stroke: "#334155", strokeWidth: 2}}
    />
  )
}
