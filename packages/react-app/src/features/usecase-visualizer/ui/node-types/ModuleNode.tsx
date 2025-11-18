// ModuleNode component with port handles
import type {FC} from "react"

import {Handle, type NodeProps, Position} from "@xyflow/react"

import type {RFModuleNodeData} from "~features/usecase-visualizer/model/types"

const ioToPosition = (io: "Input" | "Output") =>
  io === "Input" ? Position.Left : Position.Right

export const ModuleNode: FC<NodeProps> = ({data}) => {
  const moduleData = data as RFModuleNodeData
  const dataPorts = moduleData.dataPorts ?? []
  const controlPorts = moduleData.controlPorts ?? []

  // Helper to distribute control handles horizontally along top
  const getTopHandleStyle = (index: number, total: number) => {
    if (total === 0) {
      return {}
    }
    const step = total > 1 ? (100 / (total + 1)) * (index + 1) : 50
    return {left: `${step}%`, transform: "translateX(-50%)"}
  }

  return (
    <div className="relative min-w-[80px] rounded border border-green-300 bg-green-50 px-3 py-2 shadow-sm">
      <div className="text-xs font-semibold text-green-700">Module</div>
      <div className="truncate text-sm">{moduleData.label}</div>

      {/* Control handles on top - both source and target for flexibility */}
      {controlPorts.map((p, i) => (
        <div key={`Control:${p.id}`}>
          <Handle
            className="absolute -top-1 h-2 w-2 rounded-full border border-white bg-purple-500"
            id={`Control:${p.id}-source`}
            position={Position.Top}
            style={getTopHandleStyle(i, controlPorts.length)}
            type="source"
          />
          <Handle
            className="absolute -top-1 h-2 w-2 rounded-full border border-white bg-purple-500"
            id={`Control:${p.id}-target`}
            position={Position.Top}
            style={getTopHandleStyle(i, controlPorts.length)}
            type="target"
          />
        </div>
      ))}

      {/* Data handles: inputs left, outputs right */}
      {dataPorts.map((p) => (
        <Handle
          key={`Data:${p.id}`}
          className="h-2 w-2 rounded-full border border-white bg-green-500"
          id={`Data:${p.id}`}
          position={ioToPosition(p.portIoType)}
          type={p.portIoType === "Input" ? "target" : "source"}
        />
      ))}
    </div>
  )
}
