/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Simplified ELK-based layout that mimics the manual approach
import type {Node} from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';

import {
  type GraphView,
  NODE_KIND,
  type RFContainerNodeData,
  type RFEdge,
  type RFModuleNodeData,
  type RFNode,
  type RFSubgraphNodeData,
  type RFSubsystemNodeData,
} from '~features/usecase-visualizer/model/usecase-visualizer.types';
import {logger} from '~shared/lib/logger';

const elk = new ELK();

const PADDING = 25;
const MODULE_WIDTH = 100;
const MODULE_HEIGHT = 60;
const CONTAINER_HEADER = 10;
const SUBGRAPH_HEADER = 20;
// const SUBSYSTEM_HEADER = 45

// ELK-specific type definitions
interface ElkNode {
  height: number;
  id: string;
  width: number;
  x?: number;
  y?: number;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

interface ElkGraph {
  children: ElkNode[];
  edges: ElkEdge[];
  height?: number;
  id: string;
  layoutOptions: Record<string, string>;
  width?: number;
}

// Type guard functions
function isModuleNode(node: RFNode): node is Node<RFModuleNodeData> {
  return node?.data?.kind === NODE_KIND.MODULE;
}

function isContainerNode(node: RFNode): node is Node<RFContainerNodeData> {
  return node?.data?.kind === NODE_KIND.CONTAINER;
}

function isSubgraphNode(node: RFNode): node is Node<RFSubgraphNodeData> {
  return node?.data?.kind === NODE_KIND.SUBGRAPH;
}

function isSubsystemNode(node: RFNode): node is Node<RFSubsystemNodeData> {
  return node?.data?.kind === NODE_KIND.SUBSYSTEM;
}

/**
 * Simplified ELK-based layout that treats subgraphs as the main layout units
 */
export async function layoutWithELK(input: GraphView): Promise<GraphView> {
  const {edges, nodes} = input;

  logger.debug('[ELK-LAYOUT] Starting simplified ELK-based layout...');

  // Group nodes by type
  const subsystemNodes = nodes.filter((node) => isSubsystemNode(node));
  const subgraphNodes = nodes.filter((node) => isSubgraphNode(node));
  const containerNodes = nodes.filter((node) => isContainerNode(node));
  const moduleNodes = nodes.filter((node) => isModuleNode(node));

  // First, layout modules within containers (same as manual approach)
  await layoutModulesInContainers(moduleNodes, containerNodes, edges);

  // Layout containers within subgraphs (same as manual approach)
  layoutContainersInSubgraphs(containerNodes, subgraphNodes);

  // Use ELK to layout ALL subgraphs (treating subsystems as containers)
  await layoutSubgraphsWithELK(
    subgraphNodes,
    subsystemNodes,
    moduleNodes,
    edges,
  );

  logger.debug('[ELK-LAYOUT] Layout complete');
  return {edges, nodes};
}

async function layoutModulesInContainers(
  moduleNodes: Node<RFModuleNodeData>[],
  containerNodes: Node<RFContainerNodeData>[],
  edges: RFEdge[],
): Promise<void> {
  // Group modules by container
  const modulesByContainer = new Map<string, Node<RFModuleNodeData>[]>();
  for (const n of moduleNodes) {
    const parent = n.parentId || 'none';
    if (!modulesByContainer.has(parent)) {
      modulesByContainer.set(parent, []);
    }
    modulesByContainer.get(parent)!.push(n);
  }

  // Layout modules within each container using elkjs
  for (const [containerId, modules] of modulesByContainer.entries()) {
    const moduleIds = new Set(modules.map((m) => m.id));
    const containerEdges = edges.filter(
      (e) => moduleIds.has(e.source) && moduleIds.has(e.target),
    );

    const elkNodes: ElkNode[] = modules.map((m) => ({
      height: MODULE_HEIGHT,
      id: m.id,
      width: MODULE_WIDTH,
    }));

    const elkEdges: ElkEdge[] = [];
    for (const [index, e] of containerEdges.entries()) {
      elkEdges.push({
        id: `edge-${index}`,
        sources: [e.source],
        targets: [e.target],
      });
    }

    const elkGraph: ElkGraph = {
      children: elkNodes,
      edges: elkEdges,
      id: containerId,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.layered.spacing.nodeNodeBetweenLayers': '50',
        'elk.padding': '[top=25,left=20,bottom=15,right=15]',
        'elk.spacing.nodeNode': '25',
      },
    };

    try {
      const layouted = await elk.layout(elkGraph);

      // Apply positions
      if (layouted.children) {
        for (const elkNode of layouted.children) {
          const module = modules.find((m) => m.id === elkNode.id);
          if (module) {
            module.position = {
              x: elkNode.x || 0,
              y: elkNode.y || 0,
            };
          }
        }
      }

      // Calculate container size based on module positions
      const container = containerNodes.find((c) => c.id === containerId);
      if (container) {
        const width = layouted.width || 400;
        const height = layouted.height || 150;
        container.style = {
          ...container.style,
          height: height + CONTAINER_HEADER * 1.5,
          width: width + PADDING / 2,
        };
      }
    } catch (error) {
      logger.error(
        `Failed to layout container ${containerId}: ${String(error)}`,
      );
      // Fallback positioning
      for (const [index, m] of modules.entries()) {
        m.position = {x: 15 + index * 125, y: 40};
      }
      const container = containerNodes.find((c) => c.id === containerId);
      if (container) {
        container.style = {
          ...container.style,
          height: 120,
          width: modules.length * 125 + 30,
        };
      }
    }
  }
}

function layoutContainersInSubgraphs(
  containerNodes: Node<RFContainerNodeData>[],
  subgraphNodes: Node<RFSubgraphNodeData>[],
): void {
  // Group containers by subgraph
  const containersBySubgraph = new Map<string, Node<RFContainerNodeData>[]>();
  for (const n of containerNodes) {
    const parent = n.parentId || 'none';
    if (!containersBySubgraph.has(parent)) {
      containersBySubgraph.set(parent, []);
    }
    containersBySubgraph.get(parent)!.push(n);
  }

  // Position containers within subgraphs and calculate subgraph sizes
  for (const [subgraphId, containers] of containersBySubgraph.entries()) {
    let xOffset = PADDING;
    let maxHeight = 0;

    for (const c of containers) {
      c.position = {x: xOffset, y: PADDING + SUBGRAPH_HEADER};
      const cWidth = typeof c.style?.width === 'number' ? c.style.width : 400;
      const cHeight =
        typeof c.style?.height === 'number' ? c.style.height : 150;
      xOffset += cWidth + 10;
      maxHeight = Math.max(maxHeight, cHeight);
    }

    // Set subgraph size
    const subgraph = subgraphNodes.find((s) => s.id === subgraphId);
    if (subgraph) {
      subgraph.style = {
        ...subgraph.style,
        height: maxHeight + PADDING * 2 + SUBGRAPH_HEADER * 1.5, // Add header height as bottom padding too
        width: xOffset + PADDING - 20,
      };
    }
  }
}

/**
 * Find connected components (pipelines) in the subgraph dependency graph
 * Uses DFS to identify separate data flow pipelines
 */
function findConnectedComponents(
  subgraphIds: string[],
  connections: Map<string, Set<string>>,
): string[][] {
  const visited = new Set<string>();
  const pipelines: string[][] = [];

  // Build bidirectional graph for undirected connectivity
  const bidirectionalGraph = new Map<string, Set<string>>();
  for (const id of subgraphIds) {
    bidirectionalGraph.set(id, new Set());
  }

  // Add forward edges
  for (const [source, targets] of connections.entries()) {
    for (const target of targets) {
      bidirectionalGraph.get(source)?.add(target);
      bidirectionalGraph.get(target)?.add(source);
    }
  }

  // DFS to find connected components
  function dfs(nodeId: string, component: string[]) {
    visited.add(nodeId);
    component.push(nodeId);

    const neighbors = bidirectionalGraph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    }
  }

  // Find all connected components
  for (const id of subgraphIds) {
    if (!visited.has(id)) {
      const component: string[] = [];
      dfs(id, component);
      pipelines.push(component);
    }
  }

  return pipelines;
}

async function layoutSubgraphsWithELK(
  subgraphNodes: Node<RFSubgraphNodeData>[],
  subsystemNodes: Node<RFSubsystemNodeData>[],
  moduleNodes: Node<RFModuleNodeData>[],
  edges: RFEdge[],
): Promise<void> {
  // Build subgraph dependency graph from data links only (ignore control links)
  const dataEdges = edges.filter((e) => e.type === 'data-link');

  const subgraphConnections = new Map<string, Set<string>>();
  const subgraphIdMap = new Map<number, string>(); // numeric ID to full ID

  // Build mapping of numeric subgraph IDs to full node IDs
  for (const sg of subgraphNodes) {
    const match = /subgraph-(\d+)/.exec(sg.id);
    if (match) {
      const numericId = Number.parseInt(match[1], 10);
      subgraphIdMap.set(numericId, sg.id);
    }
  }

  // Map module connections to subgraph connections
  for (const edge of dataEdges) {
    const sourceModule = moduleNodes.find((n) => n.id === edge.source);
    const targetModule = moduleNodes.find((n) => n.id === edge.target);

    if (!sourceModule || !targetModule) {
      continue;
    }

    const sourceSubgraphId = sourceModule.data.subgraphId;
    const targetSubgraphId = targetModule.data.subgraphId;

    if (
      sourceSubgraphId &&
      targetSubgraphId &&
      sourceSubgraphId !== targetSubgraphId
    ) {
      const sourceFullId = subgraphIdMap.get(sourceSubgraphId);
      const targetFullId = subgraphIdMap.get(targetSubgraphId);

      if (sourceFullId && targetFullId) {
        if (!subgraphConnections.has(sourceFullId)) {
          subgraphConnections.set(sourceFullId, new Set());
        }
        subgraphConnections.get(sourceFullId)!.add(targetFullId);
      }
    }
  }

  logger.debug(
    `[ELK-LAYOUT] Found ${subgraphConnections.size} subgraph connections`,
  );

  // Find connected components (separate pipelines)
  const allSubgraphIds = subgraphNodes.map((sg) => sg.id);
  const pipelines = findConnectedComponents(
    allSubgraphIds,
    subgraphConnections,
  );

  logger.debug(`[ELK-LAYOUT] Found ${pipelines.length} separate pipelines`);
  for (const [index, pipeline] of pipelines.entries()) {
    logger.debug(
      `[ELK-LAYOUT] Pipeline ${index + 1}: ${pipeline.length} subgraphs`,
    );
  }

  // Layout each pipeline independently
  const pipelineLayouts: Array<{
    height: number;
    nodes: Map<string, {x: number; y: number}>;
    width: number;
  }> = [];

  for (const pipeline of pipelines) {
    // Get nodes for this pipeline
    const pipelineNodes = subgraphNodes.filter((sg) =>
      pipeline.includes(sg.id),
    );

    // Create ELK nodes
    const elkNodes: ElkNode[] = pipelineNodes.map((sg) => ({
      height: typeof sg.style?.height === 'number' ? sg.style.height : 400,
      id: sg.id,
      width: typeof sg.style?.width === 'number' ? sg.style.width : 800,
    }));

    // Create ELK edges for this pipeline
    const elkEdges: ElkEdge[] = [];
    let edgeIndex = 0;
    for (const [source, targets] of subgraphConnections.entries()) {
      if (pipeline.includes(source)) {
        for (const target of targets) {
          if (pipeline.includes(target)) {
            elkEdges.push({
              id: `edge-${edgeIndex++}`,
              sources: [source],
              targets: [target],
            });
          }
        }
      }
    }

    // Layout this pipeline horizontally
    const elkGraph: ElkGraph = {
      children: elkNodes,
      edges: elkEdges,
      id: `pipeline-${pipelineLayouts.length}`,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT', // Horizontal flow
        'elk.layered.spacing.nodeNodeBetweenLayers': '40',
        'elk.padding': '[top=25,left=20,bottom=25,right=20]',
        'elk.spacing.nodeNode': '50',
      },
    };

    try {
      const layouted = await elk.layout(elkGraph);

      // Store layout results
      const nodePositions = new Map<string, {x: number; y: number}>();
      if (layouted.children) {
        for (const elkNode of layouted.children) {
          nodePositions.set(elkNode.id, {
            x: elkNode.x || 0,
            y: elkNode.y || 0,
          });
        }
      }

      pipelineLayouts.push({
        height: layouted.height || 500,
        nodes: nodePositions,
        width: layouted.width || 1000,
      });
    } catch (error) {
      logger.error(`Failed to layout pipeline: ${String(error)}`);
      // Fallback: simple horizontal layout
      const nodePositions = new Map<string, {x: number; y: number}>();
      for (const [index, sg] of pipelineNodes.entries()) {
        nodePositions.set(sg.id, {x: 50 + index * 850, y: 50});
      }
      pipelineLayouts.push({
        height: 500,
        nodes: nodePositions,
        width: pipelineNodes.length * 850 + 100,
      });
    }
  }

  // Stack pipelines vertically
  const VERTICAL_SPACING = 0; // ELK's natural padding provides sufficient spacing
  let currentY = 0;

  for (const [pipelineIndex, pipeline] of pipelines.entries()) {
    const layout = pipelineLayouts[pipelineIndex];

    // Group nodes by similar Y coordinates for alignment
    const nodePositions = layout.nodes;
    const nodes = [...nodePositions.entries()];
    const groups: string[][] = [];
    const processed = new Set<string>();
    const tolerance = 50;

    // Group nodes with similar Y coordinates
    for (const [nodeId, position] of nodes) {
      if (processed.has(nodeId)) {
        continue;
      }

      const group = [nodeId];
      processed.add(nodeId);

      // Find other nodes with similar Y coordinates
      for (const [otherId, otherPos] of nodes) {
        if (
          !processed.has(otherId) &&
          Math.abs(position.y - otherPos.y) <= tolerance
        ) {
          group.push(otherId);
          processed.add(otherId);
        }
      }

      groups.push(group);
    }

    // Calculate aligned Y for each group and apply positions
    const groupAlignments = new Map<string, number>();
    for (const [groupIndex, group] of groups.entries()) {
      let sum = 0;
      for (const nodeId of group) {
        const pos = nodePositions.get(nodeId);
        sum += pos?.y || 0;
      }
      const avgY = sum / group.length;

      logger.debug(
        `[ELK-LAYOUT] Group ${groupIndex + 1}: ${group.length} nodes, avgY: ${avgY}, nodes: [${group.join(', ')}]`,
      );

      for (const nodeId of group) {
        groupAlignments.set(nodeId, avgY);
      }
    }

    // Apply aligned positions
    for (const subgraphId of pipeline) {
      const subgraph = subgraphNodes.find((sg) => sg.id === subgraphId);
      const position = layout.nodes.get(subgraphId);
      const alignedY = groupAlignments.get(subgraphId);

      if (subgraph && position && alignedY !== undefined) {
        subgraph.position = {
          x: position.x,
          y: alignedY + currentY,
        };
        logger.debug(
          `[ELK-LAYOUT] Aligned ${subgraphId} at (${subgraph.position.x}, ${subgraph.position.y}) [original Y: ${position.y}, aligned Y: ${alignedY}]`,
        );
      }
    }

    // Move to next vertical position
    currentY += layout.height + VERTICAL_SPACING;
  }

  // Position subsystems based on their child subgraphs
  for (const subsystem of subsystemNodes) {
    const childSubgraphs = subgraphNodes.filter(
      (sg) => sg.parentId === subsystem.id,
    );
    if (childSubgraphs.length > 0) {
      // Position subsystem to encompass its children
      const minX = Math.min(...childSubgraphs.map((sg) => sg.position.x)) - 50;
      const minY = Math.min(...childSubgraphs.map((sg) => sg.position.y)) - 50;
      const maxX = Math.max(
        ...childSubgraphs.map(
          (sg) =>
            sg.position.x +
            (typeof sg.style?.width === 'number' ? sg.style.width : 800),
        ),
      );
      const maxY = Math.max(
        ...childSubgraphs.map(
          (sg) =>
            sg.position.y +
            (typeof sg.style?.height === 'number' ? sg.style.height : 400),
        ),
      );

      subsystem.position = {x: minX, y: minY};
      subsystem.style = {
        ...subsystem.style,
        height: maxY - minY + 50,
        width: maxX - minX + 50,
      };

      // Adjust child positions to be relative to subsystem
      for (const sg of childSubgraphs) {
        sg.position = {
          x: sg.position.x - minX,
          y: sg.position.y - minY,
        };
      }

      logger.debug(
        `[ELK-LAYOUT] Positioned subsystem ${subsystem.id} at (${subsystem.position.x}, ${subsystem.position.y})`,
      );
    }
  }
}
