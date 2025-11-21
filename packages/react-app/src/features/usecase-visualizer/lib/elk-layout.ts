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

const PADDING = 25
const MODULE_WIDTH = 100
const MODULE_HEIGHT = 60
const CONTAINER_HEADER = 10
const SUBGRAPH_HEADER = 20
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
        "elk.layered.spacing.nodeNodeBetweenLayers": "50",
        "elk.padding": "[top=25,left=20,bottom=15,right=15]",
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
          height: height + CONTAINER_HEADER * 1.5,
          width: width + PADDING / 2,
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
      xOffset += cWidth + 10
      maxHeight = Math.max(maxHeight, cHeight)
    })

    // Set subgraph size
    const subgraph = subgraphNodes.find((s) => s.id === subgraphId)
    if (subgraph) {
      subgraph.style = {
        ...subgraph.style,
        height: maxHeight + PADDING * 2 + SUBGRAPH_HEADER * 1.5, // Add header height as bottom padding too
        width: xOffset + PADDING - 20,
      }
    }
  })
}

/**
 * Find connected components (pipelines) in the subgraph dependency graph
 * Uses DFS to identify separate data flow pipelines
 */
function findConnectedComponents(
  subgraphIds: string[],
  connections: Map<string, Set<string>>,
): string[][] {
  const visited = new Set<string>()
  const pipelines: string[][] = []

  // Build bidirectional graph for undirected connectivity
  const bidirectionalGraph = new Map<string, Set<string>>()
  subgraphIds.forEach((id) => {
    bidirectionalGraph.set(id, new Set())
  })

  // Add forward edges
  connections.forEach((targets, source) => {
    targets.forEach((target) => {
      bidirectionalGraph.get(source)?.add(target)
      bidirectionalGraph.get(target)?.add(source)
    })
  })

  // DFS to find connected components
  function dfs(nodeId: string, component: string[]) {
    visited.add(nodeId)
    component.push(nodeId)

    const neighbors = bidirectionalGraph.get(nodeId) || new Set()
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component)
      }
    })
  }

  // Find all connected components
  subgraphIds.forEach((id) => {
    if (!visited.has(id)) {
      const component: string[] = []
      dfs(id, component)
      pipelines.push(component)
    }
  })

  return pipelines
}

async function layoutSubgraphsWithELK(
  subgraphNodes: Node<RFSubgraphNodeData>[],
  subsystemNodes: Node<RFSubsystemNodeData>[],
  moduleNodes: Node<RFModuleNodeData>[],
  edges: RFEdge[],
): Promise<void> {
  // Build subgraph dependency graph from data links only (ignore control links)
  const dataEdges = edges.filter((e) => e.type === "data-link")

  const subgraphConnections = new Map<string, Set<string>>()
  const subgraphIdMap = new Map<number, string>() // numeric ID to full ID

  // Build mapping of numeric subgraph IDs to full node IDs
  subgraphNodes.forEach((sg) => {
    const match = sg.id.match(/subgraph-(\d+)/)
    if (match) {
      const numericId = parseInt(match[1], 10)
      subgraphIdMap.set(numericId, sg.id)
    }
  })

  // Map module connections to subgraph connections
  dataEdges.forEach((edge) => {
    const sourceModule = moduleNodes.find((n) => n.id === edge.source)
    const targetModule = moduleNodes.find((n) => n.id === edge.target)

    if (!sourceModule || !targetModule) {
      return
    }

    const sourceSubgraphId = sourceModule.data.subgraphId
    const targetSubgraphId = targetModule.data.subgraphId

    if (
      sourceSubgraphId &&
      targetSubgraphId &&
      sourceSubgraphId !== targetSubgraphId
    ) {
      const sourceFullId = subgraphIdMap.get(sourceSubgraphId)
      const targetFullId = subgraphIdMap.get(targetSubgraphId)

      if (sourceFullId && targetFullId) {
        if (!subgraphConnections.has(sourceFullId)) {
          subgraphConnections.set(sourceFullId, new Set())
        }
        subgraphConnections.get(sourceFullId)!.add(targetFullId)
      }
    }
  })

  logger.debug(
    `[ELK-LAYOUT] Found ${subgraphConnections.size} subgraph connections`,
  )

  // Find connected components (separate pipelines)
  const allSubgraphIds = subgraphNodes.map((sg) => sg.id)
  const pipelines = findConnectedComponents(allSubgraphIds, subgraphConnections)

  logger.debug(`[ELK-LAYOUT] Found ${pipelines.length} separate pipelines`)
  pipelines.forEach((pipeline, idx) => {
    logger.debug(
      `[ELK-LAYOUT] Pipeline ${idx + 1}: ${pipeline.length} subgraphs`,
    )
  })

  // Layout each pipeline independently
  const pipelineLayouts: Array<{
    height: number
    nodes: Map<string, {x: number; y: number}>
    width: number
  }> = []

  for (const pipeline of pipelines) {
    // Get nodes for this pipeline
    const pipelineNodes = subgraphNodes.filter((sg) => pipeline.includes(sg.id))

    // Create ELK nodes
    const elkNodes: ElkNode[] = pipelineNodes.map((sg) => ({
      height: typeof sg.style?.height === "number" ? sg.style.height : 400,
      id: sg.id,
      width: typeof sg.style?.width === "number" ? sg.style.width : 800,
    }))

    // Create ELK edges for this pipeline
    const elkEdges: ElkEdge[] = []
    let edgeIndex = 0
    subgraphConnections.forEach((targets, source) => {
      if (pipeline.includes(source)) {
        targets.forEach((target) => {
          if (pipeline.includes(target)) {
            elkEdges.push({
              id: `edge-${edgeIndex++}`,
              sources: [source],
              targets: [target],
            })
          }
        })
      }
    })

    // Layout this pipeline horizontally
    const elkGraph: ElkGraph = {
      children: elkNodes,
      edges: elkEdges,
      id: `pipeline-${pipelineLayouts.length}`,
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT", // Horizontal flow
        "elk.layered.spacing.nodeNodeBetweenLayers": "40",
        "elk.padding": "[top=25,left=20,bottom=25,right=20]",
        "elk.spacing.nodeNode": "50",
      },
    }

    try {
      const layouted = await elk.layout(elkGraph)

      // Store layout results
      const nodePositions = new Map<string, {x: number; y: number}>()
      if (layouted.children) {
        layouted.children.forEach((elkNode) => {
          nodePositions.set(elkNode.id, {
            x: elkNode.x || 0,
            y: elkNode.y || 0,
          })
        })
      }

      pipelineLayouts.push({
        height: layouted.height || 500,
        nodes: nodePositions,
        width: layouted.width || 1000,
      })
    } catch (error) {
      logger.error(`Failed to layout pipeline: ${String(error)}`)
      // Fallback: simple horizontal layout
      const nodePositions = new Map<string, {x: number; y: number}>()
      pipelineNodes.forEach((sg, i) => {
        nodePositions.set(sg.id, {x: 50 + i * 850, y: 50})
      })
      pipelineLayouts.push({
        height: 500,
        nodes: nodePositions,
        width: pipelineNodes.length * 850 + 100,
      })
    }
  }

  // Stack pipelines vertically
  const VERTICAL_SPACING = 0 // ELK's natural padding provides sufficient spacing
  let currentY = 0

  pipelines.forEach((pipeline, pipelineIdx) => {
    const layout = pipelineLayouts[pipelineIdx]

    // Group nodes by similar Y coordinates for alignment
    const nodePositions = layout.nodes
    const nodes = Array.from(nodePositions.entries())
    const groups: string[][] = []
    const processed = new Set<string>()
    const tolerance = 50

    // Group nodes with similar Y coordinates
    nodes.forEach(([nodeId, position]) => {
      if (processed.has(nodeId)) {
        return
      }

      const group = [nodeId]
      processed.add(nodeId)

      // Find other nodes with similar Y coordinates
      nodes.forEach(([otherId, otherPos]) => {
        if (
          !processed.has(otherId) &&
          Math.abs(position.y - otherPos.y) <= tolerance
        ) {
          group.push(otherId)
          processed.add(otherId)
        }
      })

      groups.push(group)
    })

    // Calculate aligned Y for each group and apply positions
    const groupAlignments = new Map<string, number>()
    groups.forEach((group, groupIdx) => {
      const avgY =
        group.reduce((sum, nodeId) => {
          const pos = nodePositions.get(nodeId)
          return sum + (pos?.y || 0)
        }, 0) / group.length

      logger.debug(
        `[ELK-LAYOUT] Group ${groupIdx + 1}: ${group.length} nodes, avgY: ${avgY}, nodes: [${group.join(", ")}]`,
      )

      group.forEach((nodeId) => {
        groupAlignments.set(nodeId, avgY)
      })
    })

    // Apply aligned positions
    pipeline.forEach((subgraphId) => {
      const subgraph = subgraphNodes.find((sg) => sg.id === subgraphId)
      const position = layout.nodes.get(subgraphId)
      const alignedY = groupAlignments.get(subgraphId)

      if (subgraph && position && alignedY !== undefined) {
        subgraph.position = {
          x: position.x,
          y: alignedY + currentY,
        }
        logger.debug(
          `[ELK-LAYOUT] Aligned ${subgraphId} at (${subgraph.position.x}, ${subgraph.position.y}) [original Y: ${position.y}, aligned Y: ${alignedY}]`,
        )
      }
    })

    // Move to next vertical position
    currentY += layout.height + VERTICAL_SPACING
  })

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
}
