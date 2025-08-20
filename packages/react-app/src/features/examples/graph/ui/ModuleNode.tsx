import type {ReactNode} from "react"

import {Handle, Position} from "@xyflow/react"
import {AudioLines, GitBranch, HardDrive, Settings, Zap} from "lucide-react"

import {QCard} from "@qui/react"

import type {Module} from "~entities/examples/module"

import type {ModuleNodeData} from "../lib"

interface ModuleNodeProps {
  data: ModuleNodeData
  selected?: boolean
}

// Smart icon selection based on module type
function getModuleIcon(module: Module) {
  const name = module.name.toLowerCase()

  if (name.includes("dma")) {
    return HardDrive
  }
  if (name.includes("mbdrc")) {
    return Settings
  }
  if (name.includes("mfc")) {
    return Zap
  }
  if (name.includes("splitter")) {
    return GitBranch
  }
  if (name.includes("protection")) {
    return Settings
  }

  return AudioLines // default
}

export function ModuleNode({data, selected}: ModuleNodeProps): ReactNode {
  const {module} = data
  const IconComponent = getModuleIcon(module)

  return (
    <div className="flex flex-col items-center">
      {/* Main Node Rectangle */}
      <QCard
        background={2}
        className={`relative flex h-20 w-32 items-center justify-center ${
          selected ? "border-2 border-blue-500" : "border border-gray-700"
        }`}
      >
        {/* Input Ports */}
        {module.inputPorts.map((port, index) => (
          <Handle
            key={port.id}
            className="q-font-metadata-sm-mono"
            id={port.id}
            position={Position.Left}
            style={{
              left: 0,
              top: 40 + index * 15,
            }}
            type="target"
          />
        ))}

        {/* Output Ports */}
        {module.outputPorts.map((port, index) => (
          <Handle
            key={port.id}
            id={port.id}
            position={Position.Right}
            style={{
              right: 0,
              top: 40 + index * 15,
            }}
            type="source"
          />
        ))}

        {/* Icon Section - Large and centered */}
        <div className="flex flex-col items-center justify-center">
          <IconComponent className="text-gray-700" size={32} />
        </div>

        {/* Port Labels - Inside rectangle at bottom */}
        {/* <div className="absolute bottom-1 flex w-full justify-between px-2">
          {module.inputPorts.length > 0 && <span className="q-font-body-xxs">IN</span>}
          {module.outputPorts.length > 0 && <span className="q-font-body-xxs">OUT</span>}
        </div> */}
      </QCard>

      {/* Text Labels - Outside and below rectangle */}
      <div className="mt-2 flex flex-col items-center text-center">
        <div className="q-font-body-sm-strong max-w-50">
          {module.displayName}
        </div>
        <div className="q-font-body-xs max-w-32">
          <strong>ID:</strong> {module.id}
        </div>
      </div>
    </div>
  )
}
