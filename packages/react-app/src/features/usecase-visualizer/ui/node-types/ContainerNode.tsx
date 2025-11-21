// ContainerNode (segment per containerId:subgraphId)
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFContainerNodeData} from "~features/usecase-visualizer/model/types"

export const ContainerNode: FC<NodeProps> = ({data}) => {
  const containerData = data as RFContainerNodeData

  return (
    <div
      className="bg-2 rounded-md border-2 border-dotted shadow-sm"
      style={{height: "100%", position: "relative", width: "100%"}}
    >
      <div className="text-disabled text-xxs absolute left-2 top-1 rounded px-1 font-semibold">
        {containerData.label}
      </div>
    </div>
  )
}
