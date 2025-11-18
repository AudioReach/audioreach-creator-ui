// Normalized ReactFlow types for UseCaseVisualizer
import type {Edge, Node} from "@xyflow/react"

import type {ControlPortIntentDto, PortIOType, PortType} from "./api-types"

export const NODE_KIND = {
  CONTAINER: "CONTAINER",
  MODULE: "MODULE",
  SUBGRAPH: "SUBGRAPH",
  SUBSYSTEM: "SUBSYSTEM",
} as const

export type NodeKind = (typeof NODE_KIND)[keyof typeof NODE_KIND]

export const EDGE_KIND = {
  CONTROL: "CONTROL",
  DATA: "DATA",
} as const

export type EdgeKind = (typeof EDGE_KIND)[keyof typeof EDGE_KIND]

// Base node data
export interface RFNodeBaseData {
  [key: string]: unknown
  kind: NodeKind
  label?: string
}

// Subsystem node (outer boundary)
export interface RFSubsystemNodeData extends RFNodeBaseData {
  kind: typeof NODE_KIND.SUBSYSTEM
  name?: string
}

// Subgraph node (inner boundary per subgraph)
export interface RFSubgraphNodeData extends RFNodeBaseData {
  kind: typeof NODE_KIND.SUBGRAPH
  name?: string
}

// Container segment (per containerId:subgraphId)
export interface RFContainerNodeData extends RFNodeBaseData {
  containerId: number
  kind: typeof NODE_KIND.CONTAINER
  name?: string
  subgraphId: number
}

// Port data for modules
export interface DataPort {
  id: number
  name?: string
  portIoType: PortIOType // 'Input' | 'Output'
  portType: PortType
}

export interface ControlPort {
  id: number
  intents?: ControlPortIntentDto[]
  name?: string
  portType: PortType
}

// Module node with ports
export interface RFModuleNodeData extends RFNodeBaseData {
  alias?: string
  containerId: number
  controlPorts: ControlPort[]
  dataPorts: DataPort[]
  kind: typeof NODE_KIND.MODULE
  name?: string
  parentId?: number // subsystem id
  showPortLabels?: boolean // default false
  subgraphId: number
}

export type RFNodeData =
  | RFSubsystemNodeData
  | RFSubgraphNodeData
  | RFContainerNodeData
  | RFModuleNodeData

export type RFNode = Node<RFNodeData>

// Edge data
export interface RFEdgeData {
  [key: string]: unknown
  kind: EdgeKind
  label?: string
}

export type RFEdge = Edge<RFEdgeData>

// Graph view model
export interface GraphView {
  edges: RFEdge[]
  nodes: RFNode[]
}

// Handle ID convention: 'Data:<portId>' or 'Control:<portId>'
export const makeHandleId = (
  kind: "Data" | "Control",
  portId: number,
): string => `${kind}:${portId}`

// Graph specification (for fetching components)
export interface GraphSpec {
  componentSpec?: {id: number; type: "Subsystem" | "Unknown"}
  includeUsecases: Array<{id: number; type: string}>
  simplifySubsystems?: boolean
  subgraphDisplayMode?: {
    excludedSubgraphIds: number[]
    isSubgraphExpanded: boolean
  }
}
