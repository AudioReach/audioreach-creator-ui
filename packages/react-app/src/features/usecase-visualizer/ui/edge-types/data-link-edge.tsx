/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// DataLinkEdge component (custom SVG with hover highlighting)
import {type FC, useState} from "react"

import type {EdgeProps} from "@xyflow/react"

export const DataLinkEdge: FC<EdgeProps> = (props) => {
  const [isHovered, setIsHovered] = useState(false)
  const {selected} = props

  // Calculate offset based on connection metadata for visual separation
  const data = props.data as Record<string, unknown>

  // Target-side connection metadata
  const connectionIndex = (data?.connectionIndex as number) ?? 0
  const totalConnections = (data?.totalConnections as number) ?? 1

  // Source-side connection metadata
  const sourceConnectionIndex = (data?.sourceConnectionIndex as number) ?? 0
  const totalSourceConnections = (data?.totalSourceConnections as number) ?? 1

  // Use minimal offsets - just enough to separate visually
  const targetOffset =
    totalConnections > 1
      ? (connectionIndex - Math.floor(totalConnections / 2)) * 6
      : 0

  const sourceOffset =
    totalSourceConnections > 1
      ? (sourceConnectionIndex - Math.floor(totalSourceConnections / 2)) * 6
      : 0

  // Calculate positions
  const sourceX = props.sourceX
  const sourceY = props.sourceY + sourceOffset
  const targetX = props.targetX
  const targetY = props.targetY + targetOffset

  // Create clean right-angle path
  const midX = sourceX + (targetX - sourceX) * 0.5
  const pathData = `M ${sourceX} ${sourceY} 
                   L ${midX} ${sourceY} 
                   L ${midX} ${targetY} 
                   L ${targetX} ${targetY}`

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{cursor: "pointer"}}
    >
      {/* Invisible wider path for easier hover detection */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth="15"
        style={{pointerEvents: "all"}}
      />

      {/* Main visible edge path */}
      <path
        d={pathData}
        fill="none"
        stroke={selected ? "#3b82f6" : isHovered ? "#555555" : "#999999"} // Blue when selected, darker gray on hover
        strokeWidth={selected || isHovered ? 3 : 2}
        style={{
          pointerEvents: "none",
          transition: "stroke 0.2s ease, stroke-width 0.2s ease",
        }}
      />

      {/* Arrow near target (input port) - positioned 8px before target */}
      <polygon
        fill={selected ? "#3b82f6" : isHovered ? "#555555" : "#777777"}
        points={`${targetX - 8},${targetY - 3.5} ${targetX},${targetY} ${targetX - 8},${targetY + 3.5}`}
        stroke="black"
        strokeWidth="1"
        style={{
          pointerEvents: "none",
          transition: "fill 0.2s ease",
        }}
      />

      {/* Hover indicators for endpoints */}
      {isHovered && (
        <>
          {/* Source endpoint indicator (dark gray circle) */}
          {/* <circle
            cx={sourceX}
            cy={sourceY}
            r="5"
            fill="#1f2937"
            stroke="#ffffff"
            strokeWidth="2"
            style={{pointerEvents: "none"}}
          /> */}

          {/* Target endpoint indicator (red circle) */}
          {/* <circle
            cx={targetX}
            cy={targetY}
            r="5"
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="2"
            style={{pointerEvents: "none"}}
          /> */}

          {/* Connection label */}
          {/* <text
            x={(sourceX + targetX) / 2}
            y={(sourceY + targetY) / 2 - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#374151"
            fontWeight="600"
            style={{
              pointerEvents: "none",
              textShadow: "1px 1px 2px rgba(255,255,255,0.9)",
            }}
          >
            Data Flow
          </text> */}
        </>
      )}
    </g>
  )
}
