// Adapter: UsecaseComponentsDto → ReactFlow nodes/edges
import type {
  ControlLinkDto,
  DataLinkDto,
  UsecaseComponentsDto,
} from "~features/usecase-visualizer/model/api-types"
import {
  EDGE_KIND,
  type GraphSpec,
  type GraphView,
  makeHandleId,
  NODE_KIND,
  type RFEdge,
  type RFNode,
} from "~features/usecase-visualizer/model/types"
import {logger} from "~shared/lib/logger"

// Node ID helpers
const nodeId = (kind: string, id: number) => `${kind}-${id}`
const containerSegmentId = (containerId: number, subgraphId: number) =>
  `container-${containerId}:${subgraphId}`
const edgeId = (kind: string, src: string, dst: string, idx = 0) =>
  `e-${kind}-${src}-${dst}-${idx}`

export function buildGraphViewFromUsecase(
  dto: UsecaseComponentsDto,
  _spec: GraphSpec,
): GraphView {
  const nodes: RFNode[] = []
  const edges: RFEdge[] = []

  // Validate input data
  if (!dto || typeof dto !== "object") {
    logger.error("[Adapter] Invalid DTO provided")
    return {edges, nodes}
  }

  const modules = Array.isArray(dto.moduleInstances) ? dto.moduleInstances : []
  const subsystems = Array.isArray(dto.subsystems) ? dto.subsystems : []

  if (modules.length === 0) {
    logger.warn("[Adapter] No modules found in use case")
  }

  // Build sets for endpoint type deduction
  const moduleIdSet = new Set(modules.map((m) => m.id))
  const subsystemIdSet = new Set(subsystems.map((s) => s.id))

  // Infer subgraphs from modules
  const subgraphIds = Array.from(
    new Set(modules.map((m) => m.subgraphId)),
  ).sort()

  // IMPORTANT: Parents must be added before children for ReactFlow nesting to work

  // 1. Subsystem nodes (if present) - TOP LEVEL
  for (const ss of subsystems) {
    nodes.push({
      data: {
        kind: NODE_KIND.SUBSYSTEM,
        label: ss.name || `Subsystem ${ss.id}`,
        name: ss.name,
      },
      id: nodeId("subsystem", ss.id),
      position: {x: 0, y: 0},
      style: {height: 100, width: 100, zIndex: -4}, // Will be resized by layout
      type: "subsystem",
    })
  }

  // 2. Subgraph nodes - CHILDREN OF SUBSYSTEM
  for (const sgId of subgraphIds) {
    // Check if any module in this subgraph has parentId in subsystemIdSet
    const modulesInSg = modules.filter((m) => m.subgraphId === sgId)
    const parentSubsystemId = modulesInSg.find(
      (m) => m.parentId != null && subsystemIdSet.has(m.parentId),
    )?.parentId

    const parent =
      parentSubsystemId != null
        ? nodeId("subsystem", parentSubsystemId)
        : undefined

    nodes.push({
      data: {
        kind: NODE_KIND.SUBGRAPH,
        label: `Subgraph ${sgId}`,
        name: `Subgraph ${sgId}`,
      },
      id: nodeId("subgraph", sgId),
      position: {x: 0, y: 0},
      style: {height: 100, width: 100, zIndex: -3}, // Will be resized by layout
      type: "subgraph",
      ...(parent && {extent: "parent" as const, parentId: parent}),
    } as RFNode)
  }

  // 3. Container segments per (containerId, subgraphId) - CHILDREN OF SUBGRAPHS
  const containerSegments = new Map<
    string,
    {containerId: number; subgraphId: number}
  >()
  for (const m of modules) {
    const key = containerSegmentId(m.containerId, m.subgraphId)
    if (!containerSegments.has(key)) {
      containerSegments.set(key, {
        containerId: m.containerId,
        subgraphId: m.subgraphId,
      })
    }
  }

  for (const [segId, {containerId, subgraphId}] of containerSegments) {
    const parent = nodeId("subgraph", subgraphId)
    nodes.push({
      data: {
        containerId,
        kind: NODE_KIND.CONTAINER,
        label: `Container ${containerId}`,
        name: `Container ${containerId}`,
        subgraphId,
      },
      extent: "parent" as const,
      id: segId,
      parentId: parent,
      position: {x: 0, y: 0},
      style: {height: 100, width: 100, zIndex: -2}, // Will be resized by layout
      type: "container",
    } as RFNode)
  }

  // 4. Module nodes - CHILDREN OF CONTAINERS (must be last)
  for (const m of modules) {
    const parent = containerSegmentId(m.containerId, m.subgraphId)

    nodes.push({
      data: {
        alias: m.alias,
        containerId: m.containerId,
        controlPorts: Array.isArray(m.controlPorts)
          ? m.controlPorts.map((p) => ({
              id: p.id,
              intents: p.intents,
              name: p.controlPortName,
              portType: p.portType,
            }))
          : [],
        dataPorts: Array.isArray(m.dataPorts)
          ? m.dataPorts.map((p) => ({
              id: p.id,
              name: p.dataPortName,
              portIoType: p.portIoType,
              portType: p.portType,
            }))
          : [],
        kind: NODE_KIND.MODULE,
        label: m.alias || m.name,
        name: m.name,
        parentId: m.parentId,
        showPortLabels: false,
        subgraphId: m.subgraphId,
      },
      extent: "parent" as const,
      id: nodeId("module", m.id),
      parentId: parent,
      position: {x: 0, y: 0},
      type: "module",
    } as RFNode)
  }

  // Helper to deduce node id from component id
  const idToNodeId = (componentId: number): string => {
    if (moduleIdSet.has(componentId)) {
      return nodeId("module", componentId)
    }
    // Future: check switchIdSet here
    return nodeId("module", componentId) // fallback
  }

  // Data edges
  const dataLinks = Array.isArray(dto.dataLinks) ? dto.dataLinks : []
  dataLinks.forEach((dl: DataLinkDto, idx) => {
    const src = idToNodeId(dl.sourceId)
    const dst = idToNodeId(dl.destinationId)
    edges.push({
      data: {kind: EDGE_KIND.DATA, label: "Data"},
      id: edgeId("data", src, dst, idx),
      source: src,
      sourceHandle: makeHandleId("Data", dl.sourcePortId),
      target: dst,
      targetHandle: makeHandleId("Data", dl.destinationPortId),
      type: "data-link",
    })
  })

  // Control edges
  const controlLinks = Array.isArray(dto.controlLinks) ? dto.controlLinks : []
  controlLinks.forEach((cl: ControlLinkDto, idx) => {
    const src = idToNodeId(cl.sourceId)
    const dst = idToNodeId(cl.destinationId)
    edges.push({
      data: {kind: EDGE_KIND.CONTROL, label: "Control"},
      id: edgeId("control", src, dst, idx),
      source: src,
      sourceHandle: `${makeHandleId("Control", cl.sourcePortId)}-source`,
      target: dst,
      targetHandle: `${makeHandleId("Control", cl.destinationPortId)}-target`,
      type: "control-link",
    })
  })

  return {edges, nodes}
}
