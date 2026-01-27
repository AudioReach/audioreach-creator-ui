// SubgraphNode component
import type {FC} from "react"

import type {NodeProps} from "@xyflow/react"

import type {RFSubgraphNodeData} from "~features/usecase-visualizer/model/types"

export const SubgraphNode: FC<NodeProps> = ({data, selected}) => {
  const subgraphData = data as RFSubgraphNodeData

  return (
    <div
      className="bg-1 rounded-md border-2 shadow-sm"
      style={{
        backgroundColor: selected
          ? "var(--color-background-support-info-subtle)"
          : undefined,
        borderColor: selected ? "var(--color-border-support-info)" : undefined,
        borderWidth: selected ? "3px" : "2px",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div className="text-secondary absolute left-2 top-1 rounded px-2 py-1 text-xs font-semibold">
        {subgraphData.label}
      </div>
    </div>
  )
}
