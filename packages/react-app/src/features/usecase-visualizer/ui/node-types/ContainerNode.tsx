// ContainerNode (segment per containerId:subgraphId)
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFContainerNodeData} from "~features/usecase-visualizer/model/types"

export const ContainerNode: FC<NodeProps> = ({data}) => {
  const containerData = data as RFContainerNodeData

  return (
    <div
      className="rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 shadow-sm"
      style={{height: "100%", position: "relative", width: "100%"}}
    >
      <div className="absolute left-2 top-1 rounded bg-blue-50 px-1 text-xs font-semibold text-blue-700">
        {containerData.label}
      </div>
    </div>
  )
}
