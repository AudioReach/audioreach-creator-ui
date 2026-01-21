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
    <div
      className="mb-3 mt-3 rounded border px-0.5 py-0.5"
      style={{borderColor: `var(--color-background-neutral-10)`}}
    >
      <div
        className="relative flex min-h-[60px] w-[100px] items-center justify-center rounded border shadow-sm"
        style={{backgroundColor: `var(--color-background-neutral-05)`}}
      >
        {/* <div className="text-primary text-xs font-semibold">Module</div> */}
        <div className="text-primary text-xxs break-words text-center">
          {moduleData.label}
        </div>

        {/* Control handles on top - both source and target for flexibility */}
        {controlPorts.map((p, i) => (
          <div key={`Control:${p.id}`}>
            <Handle
              className="absolute -top-1 h-2 w-2 rounded-full"
              id={`Control:${p.id}-source`}
              position={Position.Top}
              style={{
                ...getTopHandleStyle(i, controlPorts.length),
                backgroundColor: "var(--color-background-neutral-06)",
                border: "1px solid var(--color-border-neutral-10)",
              }}
              type="source"
            />
            <Handle
              className="absolute -top-1 h-2 w-2 rounded-full"
              id={`Control:${p.id}-target`}
              position={Position.Top}
              style={{
                ...getTopHandleStyle(i, controlPorts.length),
                backgroundColor: "var(--color-background-neutral-06)",
                border: "1px solid var(--color-border-neutral-10)",
              }}
              type="target"
            />
          </div>
        ))}

        {/* Data handles: inputs left, outputs right */}
        {dataPorts.map((p) => (
          <Handle
            key={`Data:${p.id}`}
            className="h-2 w-2 rounded-full"
            id={`Data:${p.id}`}
            position={ioToPosition(p.portIoType)}
            style={{
              backgroundColor: "var(--color-background-neutral-06)",
              border: "1px solid var(--color-border-neutral-10)",
            }}
            type={p.portIoType === "Input" ? "target" : "source"}
          />
        ))}
      </div>
    </div>
  )
}
