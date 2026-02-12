/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// ControlLinkEdge component (dashed line with hover highlighting)
import {type FC, useState} from "react"

import {type EdgeProps, getSmoothStepPath} from "@xyflow/react"

export const ControlLinkEdge: FC<EdgeProps> = (props) => {
  const [isHovered, setIsHovered] = useState(false)
  const {selected} = props

  // Generate the curved path with vertical offset
  const [pathData] = getSmoothStepPath({
    ...props,
    borderRadius: 20,
    offset: 60, // Vertical offset to create arc above/below modules
  })

  return (
    <g>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={pathData}
        fill="none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        stroke="transparent"
        strokeWidth="15"
        style={{cursor: "pointer"}}
      />

      {/* Main visible control edge path */}
      <path
        d={pathData}
        fill="none"
        stroke={selected ? "#3b82f6" : isHovered ? "#777777" : "#cccccc"} // Blue when selected, darker on hover
        strokeDasharray="5 5"
        strokeWidth={selected || isHovered ? 3 : 2}
        style={{
          pointerEvents: "none",
          transition: "stroke 0.2s ease, stroke-width 0.2s ease",
        }}
      />

      {/* Hover indicators for endpoints */}
      {isHovered && (
        <>
          {/* Source endpoint indicator (purple circle) */}
          {/* <circle
            cx={props.sourceX}
            cy={props.sourceY}
            r="5"
            fill="#7c2d12"
            stroke="#ffffff"
            strokeWidth="2"
            style={{pointerEvents: "none"}}
          /> */}

          {/* Target endpoint indicator (orange circle) */}
          {/* <circle
            cx={props.targetX}
            cy={props.targetY}
            r="5"
            fill="#ea580c"
            stroke="#ffffff"
            strokeWidth="2"
            style={{pointerEvents: "none"}}
          /> */}

          {/* Connection label */}
          {/* <text
            x={(props.sourceX + props.targetX) / 2}
            y={(props.sourceY + props.targetY) / 2 - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#374151"
            fontWeight="600"
            style={{
              pointerEvents: "none",
              textShadow: "1px 1px 2px rgba(255,255,255,0.9)",
            }}
          >
            Control Flow
          </text> */}
        </>
      )}
    </g>
  )
}
