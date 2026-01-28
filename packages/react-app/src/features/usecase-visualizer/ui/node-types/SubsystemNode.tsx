// SubsystemNode component
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFSubsystemNodeData} from "~features/usecase-visualizer/model/types"

export const SubsystemNode: FC<NodeProps> = ({data, selected}) => {
  const subsystemData = data as RFSubsystemNodeData

  return (
    <div
      className="rounded-md shadow-sm"
      style={{
        backgroundColor: selected
          ? "var(--color-background-support-info-subtle)"
          : undefined,
        borderColor: selected ? "var(--color-border-support-info)" : undefined,
        borderStyle: "solid",
        borderWidth: selected ? "3px" : "2px",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div className="bg-yellow-50 text-yellow-700 absolute left-2 top-1 rounded px-2 py-1 text-sm font-semibold">
        {subsystemData.label}
      </div>
    </div>
  )
}
