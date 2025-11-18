// Simplified ELK-based layout that mimics the manual approach
import type {Node} from "@xyflow/react"
import ELK from "elkjs/lib/elk.bundled.js"

import {
  type GraphView,
  NODE_KIND,
  type RFContainerNodeData,
  type RFEdge,
  type RFModuleNodeData,
  type RFNode,
  type RFSubgraphNodeData,
  type RFSubsystemNodeData,
} from "~features/usecase-visualizer/model/types"
import {logger} from "~shared/lib/logger"

const elk = new ELK()

const PADDING = 50
const MODULE_WIDTH = 100
const MODULE_HEIGHT = 60
const CONTAINER_HEADER = 10
const SUBGRAPH_HEADER = 40
// const SUBSYSTEM_HEADER = 45

// ELK-specific type definitions
interface ElkNode {
  height: number
  id: string
  width: number
  x?: number
  y?: number
}

interface ElkEdge {
  id: string
  sources: string[]
  targets: string[]
}

interface ElkGraph {
  children: ElkNode[]
  edges: ElkEdge[]
  height?: number
  id: string
  layoutOptions: Record<string, string>
  width?: number
}

// Type guard functions
function isModuleNode(node: RFNode): node is Node<RFModuleNodeData> {
  return node?.data?.kind === NODE_KIND.MODULE
}

function isContainerNode(node: RFNode): node is Node<RFContainerNodeData> {
  return node?.data?.kind === NODE_KIND.CONTAINER
}

function isSubgraphNode(node: RFNode): node is Node<RFSubgraphNodeData> {
  return node?.data?.kind === NODE_KIND.SUBGRAPH
}

function isSubsystemNode(node: RFNode): node is Node<RFSubsystemNodeData> {
  return node?.data?.kind === NODE_KIND.SUBSYSTEM
}

/**
 * Simplified ELK-based layout that treats subgraphs as the main layout units
 */
export async function layoutWithELK(input: GraphView): Promise<GraphView> {
  const {edges, nodes} = input

  logger.debug("[ELK-LAYOUT] Starting simplified ELK-based layout...")

  // Group nodes by type
  const subsystemNodes = nodes.filter(isSubsystemNode)
  const subgraphNodes = nodes.filter(isSubgraphNode)
  const containerNodes = nodes.filter(isContainerNode)
  const moduleNodes = nodes.filter(isModuleNode)

  // First, layout modules within containers (same as manual approach)
  await layoutModulesInContainers(moduleNodes, containerNodes, edges)

  // Layout containers within subgraphs (same as manual approach)
  layoutContainersInSubgraphs(containerNodes, subgraphNodes)

  // Use ELK to layout ALL subgraphs (treating subsystems as containers)
  await layoutSubgraphsWithELK(
    subgraphNodes,
    subsystemNodes,
    moduleNodes,
    edges,
  )

  logger.debug("[ELK-LAYOUT] Layout complete")
  return {edges, nodes}
}

async function layoutModulesInContainers(
  moduleNodes: Node<RFModuleNodeData>[],
  containerNodes: Node<RFContainerNodeData>[],
  edges: RFEdge[],
): Promise<void> {
  // Group modules by container
  const modulesByContainer = new Map<string, Node<RFModuleNodeData>[]>()
  moduleNodes.forEach((n) => {
    const parent = n.parentId || "none"
    if (!modulesByContainer.has(parent)) {
      modulesByContainer.set(parent, [])
    }
    modulesByContainer.get(parent)!.push(n)
  })

  // Layout modules within each container using elkjs
  for (const [containerId, modules] of modulesByContainer.entries()) {
    const moduleIds = new Set(modules.map((m) => m.id))
    const containerEdges = edges.filter(
      (e) => moduleIds.has(e.source) && moduleIds.has(e.target),
    )

    const elkNodes: ElkNode[] = modules.map((m) => ({
      height: MODULE_HEIGHT,
      id: m.id,
      width: MODULE_WIDTH,
    }))

    const elkEdges: ElkEdge[] = containerEdges.map((e, idx) => ({
      id: `edge-${idx}`,
      sources: [e.source],
      targets: [e.target],
    }))

    const elkGraph: ElkGraph = {
      children: elkNodes,
      edges: elkEdges,
      id: containerId,
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.layered.spacing.nodeNodeBetweenLayers": "40",
        "elk.padding": "[top=45,left=25,bottom=15,right=25]",
        "elk.spacing.nodeNode": "25",
      },
    }

    try {
      const layouted = await elk.layout(elkGraph)

      // Apply positions
      if (layouted.children) {
        layouted.children.forEach((elkNode) => {
          const module = modules.find((m) => m.id === elkNode.id)
          if (module) {
            module.position = {
              x: elkNode.x || 0,
              y: elkNode.y || 0,
            }
          }
        })
      }

      // Calculate container size based on module positions
      const container = containerNodes.find((c) => c.id === containerId)
      if (container) {
        const width = layouted.width || 400
        const height = layouted.height || 150
        container.style = {
          ...container.style,
          height: height + CONTAINER_HEADER,
          width: width + PADDING,
        }
      }
    } catch (error) {
      logger.error(
        `Failed to layout container ${containerId}: ${String(error)}`,
      )
      // Fallback positioning
      modules.forEach((m, i) => {
        m.position = {x: 15 + i * 125, y: 40}
      })
      const container = containerNodes.find((c) => c.id === containerId)
      if (container) {
        container.style = {
          ...container.style,
          height: 120,
          width: modules.length * 125 + 30,
        }
      }
    }
  }
}

function layoutContainersInSubgraphs(
  containerNodes: Node<RFContainerNodeData>[],
  subgraphNodes: Node<RFSubgraphNodeData>[],
): void {
  // Group containers by subgraph
  const containersBySubgraph = new Map<string, Node<RFContainerNodeData>[]>()
  containerNodes.forEach((n) => {
    const parent = n.parentId || "none"
    if (!containersBySubgraph.has(parent)) {
      containersBySubgraph.set(parent, [])
    }
    containersBySubgraph.get(parent)!.push(n)
  })

  // Position containers within subgraphs and calculate subgraph sizes
  containersBySubgraph.forEach((containers, subgraphId) => {
    let xOffset = PADDING
    let maxHeight = 0

    containers.forEach((c) => {
      c.position = {x: xOffset, y: PADDING + SUBGRAPH_HEADER}
      const cWidth = typeof c.style?.width === "number" ? c.style.width : 400
      const cHeight = typeof c.style?.height === "number" ? c.style.height : 150
      xOffset += cWidth + 20
      maxHeight = Math.max(maxHeight, cHeight)
    })

    // Set subgraph size
    const subgraph = subgraphNodes.find((s) => s.id === subgraphId)
    if (subgraph) {
      subgraph.style = {
        ...subgraph.style,
        height: maxHeight + PADDING * 2 + SUBGRAPH_HEADER,
        width: xOffset + PADDING - 20,
      }
    }
  })
}

async function layoutSubgraphsWithELK(
  subgraphNodes: Node<RFSubgraphNodeData>[],
  subsystemNodes: Node<RFSubsystemNodeData>[],
  moduleNodes: Node<RFModuleNodeData>[],
  edges: RFEdge[],
): Promise<void> {
  // Create ELK nodes for ALL subgraphs
  const elkNodes: ElkNode[] = subgraphNodes.map((sg) => ({
    height: typeof sg.style?.height === "number" ? sg.style.height : 400,
    id: sg.id,
    width: typeof sg.style?.width === "number" ? sg.style.width : 800,
  }))

  // Create ELK edges based on cross-subgraph connections
  const crossSubgraphEdges = edges.filter((e) => {
    const sourceModule = moduleNodes.find((n) => n.id === e.source)
    const targetModule = moduleNodes.find((n) => n.id === e.target)
    if (!sourceModule || !targetModule) {
      return false
    }

    const sourceSubgraphId = sourceModule.data.subgraphId
    const targetSubgraphId = targetModule.data.subgraphId

    return (
      sourceSubgraphId &&
      targetSubgraphId &&
      sourceSubgraphId !== targetSubgraphId
    )
  })

  logger.debug(
    `[ELK-LAYOUT] Cross-subgraph edges: ${crossSubgraphEdges.length}`,
  )

  // Map module connections to subgraph connections
  const subgraphConnections = new Map<string, Set<string>>()

  crossSubgraphEdges.forEach((edge) => {
    const sourceModule = moduleNodes.find((n) => n.id === edge.source)
    const targetModule = moduleNodes.find((n) => n.id === edge.target)

    if (!sourceModule || !targetModule) {
      return
    }

    const sourceSubgraphId = sourceModule.data.subgraphId
    const targetSubgraphId = targetModule.data.subgraphId

    const sourceSubgraphFullId = `subgraph-${sourceSubgraphId}`
    const targetSubgraphFullId = `subgraph-${targetSubgraphId}`

    if (
      sourceSubgraphFullId &&
      targetSubgraphFullId &&
      sourceSubgraphFullId !== targetSubgraphFullId
    ) {
      if (!subgraphConnections.has(sourceSubgraphFullId)) {
        subgraphConnections.set(sourceSubgraphFullId, new Set())
      }
      subgraphConnections.get(sourceSubgraphFullId)!.add(targetSubgraphFullId)
    }
  })

  // Convert to ELK edges
  const elkEdges: ElkEdge[] = []
  let edgeIndex = 0
  subgraphConnections.forEach((targets, source) => {
    targets.forEach((target) => {
      elkEdges.push({
        id: `subgraph-edge-${edgeIndex++}`,
        sources: [source],
        targets: [target],
      })
    })
  })

  logger.debug(`[ELK-LAYOUT] Subgraph edges: ${elkEdges.length}`)

  // Create ELK graph for subgraph layout
  const elkGraph: ElkGraph = {
    children: elkNodes,
    edges: elkEdges,
    id: "subgraph-layout",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "150",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      "elk.spacing.nodeNode": "100",
    },
  }

  try {
    const layoutedGraph = await elk.layout(elkGraph)

    // Apply ELK positions to subgraphs
    if (layoutedGraph.children) {
      layoutedGraph.children.forEach((elkNode) => {
        const subgraph = subgraphNodes.find((sg) => sg.id === elkNode.id)
        if (subgraph) {
          subgraph.position = {
            x: elkNode.x || 0,
            y: elkNode.y || 0,
          }
          logger.debug(
            `[ELK-LAYOUT] Positioned subgraph ${subgraph.id} at (${subgraph.position.x}, ${subgraph.position.y})`,
          )
        }
      })
    }

    // Position subsystems based on their child subgraphs
    subsystemNodes.forEach((subsystem) => {
      const childSubgraphs = subgraphNodes.filter(
        (sg) => sg.parentId === subsystem.id,
      )
      if (childSubgraphs.length > 0) {
        // Position subsystem to encompass its children
        const minX = Math.min(...childSubgraphs.map((sg) => sg.position.x)) - 50
        const minY = Math.min(...childSubgraphs.map((sg) => sg.position.y)) - 50
        const maxX = Math.max(
          ...childSubgraphs.map(
            (sg) =>
              sg.position.x +
              (typeof sg.style?.width === "number" ? sg.style.width : 800),
          ),
        )
        const maxY = Math.max(
          ...childSubgraphs.map(
            (sg) =>
              sg.position.y +
              (typeof sg.style?.height === "number" ? sg.style.height : 400),
          ),
        )

        subsystem.position = {x: minX, y: minY}
        subsystem.style = {
          ...subsystem.style,
          height: maxY - minY + 50,
          width: maxX - minX + 50,
        }

        // Adjust child positions to be relative to subsystem
        childSubgraphs.forEach((sg) => {
          sg.position = {
            x: sg.position.x - minX,
            y: sg.position.y - minY,
          }
        })

        logger.debug(
          `[ELK-LAYOUT] Positioned subsystem ${subsystem.id} at (${subsystem.position.x}, ${subsystem.position.y})`,
        )
      }
    })
  } catch (error) {
    logger.error(`Failed to layout subgraphs with ELK: ${String(error)}`)
    // Fallback to simple positioning
    subgraphNodes.forEach((sg, i) => {
      sg.position = {x: 50 + i * 850, y: 50}
    })
  }
}
