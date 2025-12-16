// ContainerNode (segment per containerId:subgraphId)
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFContainerNodeData} from "~features/usecase-visualizer/model/types"

export const ContainerNode: FC<NodeProps> = ({data}) => {
  const containerData = data as RFContainerNodeData

  return (
    <div
      className="rounded-md border-2 border-dotted shadow-sm"
      style={{
        backgroundColor: `var(--color-background-neutral-02)`,
        borderColor: `var(--color-background-neutral-07)`,
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div className="text-disabled text-xxs absolute left-2 top-2 rounded font-semibold">
        {containerData.label}
      </div>
    </div>
  )
}
