// SubgraphNode component
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFSubgraphNodeData} from "~features/usecase-visualizer/model/types"

export const SubgraphNode: FC<NodeProps> = ({data}) => {
  const subgraphData = data as RFSubgraphNodeData

  return (
    <div
      className="rounded-md border-2 border-red-400 bg-red-50/30 shadow-sm"
      style={{height: "100%", position: "relative", width: "100%"}}
    >
      <div className="absolute left-2 top-1 rounded bg-red-50 px-2 py-1 text-sm font-semibold text-red-700">
        {subgraphData.label}
      </div>
    </div>
  )
}
