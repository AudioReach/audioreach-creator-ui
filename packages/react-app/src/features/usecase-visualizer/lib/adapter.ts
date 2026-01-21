// Adapter: UsecaseComponentsDto → ReactFlow nodes/edges
import type {
  ControlLinkDto,
  DataLinkDto,
  UsecaseComponentsDto,
} from "~entities/usecases/model/usecase.component.dto"
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
  dtoArray: UsecaseComponentsDto[],
  _spec: GraphSpec,
): GraphView {
  const nodes: RFNode[] = []
  const edges: RFEdge[] = []

  // Validate input data
  if (!Array.isArray(dtoArray) || dtoArray.length === 0) {
    logger.error("[Adapter] Invalid DTO array provided")
    return {edges, nodes}
  }

  // Merge data from all DTOs
  const modules = dtoArray.flatMap((dto) =>
    Array.isArray(dto.moduleInstances) ? dto.moduleInstances : [],
  )
  const subsystems = dtoArray.flatMap((dto) =>
    Array.isArray(dto.subsystems) ? dto.subsystems : [],
  )

  if (modules.length === 0) {
    logger.warn("[Adapter] No modules found in use case")
  }

  // Build sets for endpoint type deduction
  const subsystemIdSet = new Set(subsystems.map((s) => s.id))

  // Build lookup map from systemId to ReactFlow node ID
  const systemIdToNodeId = new Map<string, string>()
  for (const m of modules) {
    systemIdToNodeId.set(m.systemId, nodeId("module", m.id))
  }
  for (const ss of subsystems) {
    systemIdToNodeId.set(ss.systemId, nodeId("subsystem", ss.id))
  }

  // Build lookup maps for port systemIds (strings) to numeric port IDs
  const dataPortSystemIdToPortId = new Map<string, number>()
  const controlPortSystemIdToPortId = new Map<string, number>()

  for (const m of modules) {
    if (Array.isArray(m.dataPorts)) {
      for (const port of m.dataPorts) {
        // Store mapping: port systemId (string) -> port numeric ID
        dataPortSystemIdToPortId.set(String(port.systemId), port.id)
      }
    }
    if (Array.isArray(m.controlPorts)) {
      for (const port of m.controlPorts) {
        // Store mapping: port systemId (string) -> port numeric ID
        controlPortSystemIdToPortId.set(String(port.systemId), port.id)
      }
    }
  }

  for (const ss of subsystems) {
    if (Array.isArray(ss.dataPorts)) {
      for (const port of ss.dataPorts) {
        dataPortSystemIdToPortId.set(String(port.systemId), port.id)
      }
    }
    if (Array.isArray(ss.controlPorts)) {
      for (const port of ss.controlPorts) {
        controlPortSystemIdToPortId.set(String(port.systemId), port.id)
      }
    }
  }

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
              name: p.name,
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

  // Data edges - merge from all DTOs
  const dataLinks = dtoArray.flatMap((dto) =>
    Array.isArray(dto.dataLinks) ? dto.dataLinks : [],
  )
  dataLinks.forEach((dl: DataLinkDto, idx) => {
    // For data links, we need to find the source and destination using the link's properties
    // The sourceId and destinationId in the DTO are numeric IDs that need to be mapped
    const srcModule = modules.find((m) => m.id === dl.sourceId)
    const dstModule = modules.find((m) => m.id === dl.destinationId)
    const srcSubsystem = subsystems.find((s) => s.id === dl.sourceId)
    const dstSubsystem = subsystems.find((s) => s.id === dl.destinationId)

    const src = srcModule
      ? nodeId("module", srcModule.id)
      : srcSubsystem
        ? nodeId("subsystem", srcSubsystem.id)
        : null
    const dst = dstModule
      ? nodeId("module", dstModule.id)
      : dstSubsystem
        ? nodeId("subsystem", dstSubsystem.id)
        : null

    if (!src || !dst) {
      logger.warn(
        `[Adapter] Data link endpoints not found: source=${dl.sourceId}, dest=${dl.destinationId}`,
      )
      return
    }

    // Look up the actual numeric port IDs from the systemIds
    const sourcePortId = dataPortSystemIdToPortId.get(String(dl.sourcePortId))
    const destinationPortId = dataPortSystemIdToPortId.get(
      String(dl.destinationPortId),
    )

    if (sourcePortId === undefined || destinationPortId === undefined) {
      logger.warn(
        `[Adapter] Data link port IDs not found: sourcePortId=${dl.sourcePortId}, destPortId=${dl.destinationPortId}`,
      )
      return
    }

    edges.push({
      data: {kind: EDGE_KIND.DATA, label: "Data"},
      id: edgeId("data", src, dst, idx),
      source: src,
      sourceHandle: makeHandleId("Data", sourcePortId),
      target: dst,
      targetHandle: makeHandleId("Data", destinationPortId),
      type: "data-link",
    })
  })

  // Control edges - merge from all DTOs
  const controlLinks = dtoArray.flatMap((dto) =>
    Array.isArray(dto.controlLinks) ? dto.controlLinks : [],
  )
  controlLinks.forEach((cl: ControlLinkDto, idx) => {
    // For control links, use the numeric IDs to find the components
    const srcModule = modules.find((m) => m.id === cl.sourceId)
    const dstModule = modules.find((m) => m.id === cl.destinationId)
    const srcSubsystem = subsystems.find((s) => s.id === cl.sourceId)
    const dstSubsystem = subsystems.find((s) => s.id === cl.destinationId)

    const src = srcModule
      ? nodeId("module", srcModule.id)
      : srcSubsystem
        ? nodeId("subsystem", srcSubsystem.id)
        : null
    const dst = dstModule
      ? nodeId("module", dstModule.id)
      : dstSubsystem
        ? nodeId("subsystem", dstSubsystem.id)
        : null

    if (!src || !dst) {
      logger.warn(
        `[Adapter] Control link endpoints not found: source=${cl.sourceId}, dest=${cl.destinationId}`,
      )
      return
    }

    // Look up the actual numeric port IDs from the systemIds
    const sourcePortId = controlPortSystemIdToPortId.get(
      String(cl.sourcePortId),
    )
    const destinationPortId = controlPortSystemIdToPortId.get(
      String(cl.destinationPortId),
    )

    if (sourcePortId === undefined || destinationPortId === undefined) {
      logger.warn(
        `[Adapter] Control link port IDs not found: sourcePortId=${cl.sourcePortId}, destPortId=${cl.destinationPortId}`,
      )
      return
    }

    edges.push({
      data: {kind: EDGE_KIND.CONTROL, label: "Control"},
      id: edgeId("control", src, dst, idx),
      source: src,
      sourceHandle: `${makeHandleId("Control", sourcePortId)}-source`,
      target: dst,
      targetHandle: `${makeHandleId("Control", destinationPortId)}-target`,
      type: "control-link",
    })
  })

  return {edges, nodes}
}
