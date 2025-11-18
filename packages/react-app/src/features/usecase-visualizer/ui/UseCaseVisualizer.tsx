// UseCaseVisualizer - ReactFlow wrapper (view-only)
import type {FC} from "react"

import {Background, Controls, ReactFlow} from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import type {RFEdge, RFNode} from "~features/usecase-visualizer/model/types"

import {ControlLinkEdge} from "./edge-types/ControlLinkEdge"
import {DataLinkEdge} from "./edge-types/DataLinkEdge"
import {ContainerNode} from "./node-types/ContainerNode"
import {ModuleNode} from "./node-types/ModuleNode"
import {SubgraphNode} from "./node-types/SubgraphNode"
import {SubsystemNode} from "./node-types/SubsystemNode"

const nodeTypes = {
  container: ContainerNode,
  module: ModuleNode,
  subgraph: SubgraphNode,
  subsystem: SubsystemNode,
}

const edgeTypes = {
  "control-link": ControlLinkEdge,
  "data-link": DataLinkEdge,
}

export interface UseCaseVisualizerProps {
  edges: RFEdge[]
  nodes: RFNode[]
}

export const UseCaseVisualizer: FC<UseCaseVisualizerProps> = ({
  edges,
  nodes,
}) => {
  return (
    <div className="h-full w-full bg-white">
      <ReactFlow
        edgeTypes={edgeTypes}
        edges={edges}
        elementsSelectable={false}
        fitView
        maxZoom={1.5}
        minZoom={0.1}
        nodeOrigin={[0, 0]}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesConnectable={false}
        // nodesDraggable={false}
        proOptions={{hideAttribution: true}}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
