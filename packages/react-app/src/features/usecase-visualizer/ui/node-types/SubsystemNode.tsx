// SubsystemNode component
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFSubsystemNodeData} from "~features/usecase-visualizer/model/types"

export const SubsystemNode: FC<NodeProps> = ({data}) => {
  const subsystemData = data as RFSubsystemNodeData

  return (
    <div
      className="rounded-md border-2 border-yellow-400 bg-yellow-50/30 shadow-sm"
      style={{height: "100%", position: "relative", width: "100%"}}
    >
      <div className="absolute left-2 top-1 rounded bg-yellow-50 px-2 py-1 text-sm font-semibold text-yellow-700">
        {subsystemData.label}
      </div>
    </div>
  )
}
