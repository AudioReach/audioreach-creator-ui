// ControlLinkEdge component (dashed line)
import type {FC} from "react"

import {BaseEdge, type EdgeProps, getBezierPath} from "@xyflow/react"

export const ControlLinkEdge: FC<EdgeProps> = (props) => {
  const [path] = getBezierPath(props)
  return (
    <BaseEdge
      id={props.id}
      path={path}
      style={{stroke: "#9333ea", strokeDasharray: "5 5", strokeWidth: 2}}
    />
  )
}
