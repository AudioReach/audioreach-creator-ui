import type {Edge, Node} from "@xyflow/react"

import type {Connection} from "~entities/examples/connection"
import type {ModuleInstance} from "~entities/examples/graph"
import type {Module} from "~entities/examples/module"

export interface ModuleNodeData extends Record<string, unknown> {
  module: Module
  moduleInstance: ModuleInstance
}

export const moduleInstanceToNode = (
  moduleInstance: ModuleInstance,
  module: Module,
): Node<ModuleNodeData> => ({
  data: {module, moduleInstance},
  id: moduleInstance.instanceId,
  position: moduleInstance.position,
  type: "moduleNode",
})

export const connectionToEdge = (connection: Connection): Edge => ({
  id: connection.id,
  source: connection.sourceInstanceId,
  sourceHandle: connection.sourcePortId,
  target: connection.targetInstanceId,
  targetHandle: connection.targetPortId,
})

export const edgeToConnection = (edge: Edge): Connection => ({
  id: edge.id,
  sourceInstanceId: edge.source,
  sourcePortId: edge.sourceHandle || "",
  targetInstanceId: edge.target,
  targetPortId: edge.targetHandle || "",
})
