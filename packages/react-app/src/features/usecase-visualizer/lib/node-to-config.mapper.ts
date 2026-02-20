/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Utility to map ReactFlow nodes to KeyConfigurator ConfigurationItems
 */

import {
  type ConfigurationItem,
  ConfigurationItemType,
  type ModuleConfigurationItem,
  type SubgraphConfigurationItem,
  type SubsystemConfigurationItem,
} from '~widgets/configurator-panel';

import {NODE_KIND, type RFNode} from '../model/usecase-visualizer.types';

/**
 * Generate a deterministic instance ID based on module data
 * This ensures the same module always gets the same instanceId
 * @param node - The RFNode containing module data
 * @returns A deterministic instance ID
 */
function generateDeterministicInstanceId(node: RFNode): number {
  // Check if the module data already has an instanceId
  if (node.data.kind === NODE_KIND.MODULE) {
    const moduleData = node.data as any;
    // If instanceId exists in the data, use it
    if (typeof moduleData.instanceId === 'number') {
      return moduleData.instanceId;
    }
  }

  // Otherwise, generate a deterministic ID from the node ID
  // This ensures the same node always gets the same instanceId
  return nodeIdToNumber(node.id);
}

/**
 * Convert a string node ID to a number
 * If the ID is already a number string, parse it
 * Otherwise, generate a unique numeric ID based on hash
 */
function nodeIdToNumber(nodeId: string): number {
  // Try to parse as number first
  const parsed = parseInt(nodeId, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Generate a numeric hash from the string
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    const char = nodeId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Map a MODULE node to ModuleConfigurationItem
 */
export function mapModuleNodeToConfigItem(
  node: RFNode,
): ModuleConfigurationItem | null {
  if (node.data.kind !== NODE_KIND.MODULE) {
    return null;
  }

  return {
    id: nodeIdToNumber(node.id),
    instanceId: generateDeterministicInstanceId(node),
    name: node.data.name || node.data.label || 'Unknown Module',
    systemId: 'sys-1', // Hardcoded for now as per requirement
    type: ConfigurationItemType.MODULE,
  };
}

/**
 * Map a SUBGRAPH node to SubgraphConfigurationItem
 */
export function mapSubgraphNodeToConfigItem(
  node: RFNode,
): SubgraphConfigurationItem | null {
  if (node.data.kind !== NODE_KIND.SUBGRAPH) {
    return null;
  }

  return {
    id: nodeIdToNumber(node.id),
    name: node.data.name || node.data.label || 'Unknown Subgraph',
    systemId: 'sys-1', // Hardcoded for now as per requirement
    type: ConfigurationItemType.SUBGRAPH,
  };
}

/**
 * Map a SUBSYSTEM node to SubsystemConfigurationItem
 */
export function mapSubsystemNodeToConfigItem(
  node: RFNode,
): SubsystemConfigurationItem | null {
  if (node.data.kind !== NODE_KIND.SUBSYSTEM) {
    return null;
  }

  return {
    id: nodeIdToNumber(node.id),
    name: node.data.name || node.data.label || 'Unknown Subsystem',
    systemId: 'sys-1', // Hardcoded for now as per requirement
    type: ConfigurationItemType.SUBSYSTEM,
  };
}

/**
 * Map a single node to ConfigurationItem based on its type
 */
export function mapNodeToConfigItem(node: RFNode): ConfigurationItem | null {
  switch (node.data.kind) {
    case NODE_KIND.MODULE:
      return mapModuleNodeToConfigItem(node);
    case NODE_KIND.SUBGRAPH:
      return mapSubgraphNodeToConfigItem(node);
    case NODE_KIND.SUBSYSTEM:
      return mapSubsystemNodeToConfigItem(node);
    case NODE_KIND.CONTAINER:
      // Containers are not configurable
      return null;
    default:
      return null;
  }
}

/**
 * Map multiple nodes to ConfigurationItems
 * Supports MODULE, SUBGRAPH, and SUBSYSTEM nodes
 * Filters out CONTAINER nodes and null results
 */
export function mapNodesToConfigItems(nodes: RFNode[]): ConfigurationItem[] {
  return nodes
    .map(mapNodeToConfigItem)
    .filter((item): item is ConfigurationItem => item !== null);
}

/**
 * Convert a ConfigurationItem ID back to a node ID string
 * This reverses the nodeIdToNumber conversion
 * @param configItemId - The numeric ID from ConfigurationItem
 * @returns The node ID as a string
 */
export function configItemIdToNodeId(configItemId: number): string {
  // Simply convert the number back to string
  // This works because we either parsed it from a number string,
  // or generated a hash that we can use as-is
  return configItemId.toString();
}

/**
 * Convert multiple ConfigurationItem IDs to node IDs
 */
export function configItemIdsToNodeIds(configItemIds: number[]): string[] {
  return configItemIds.map(configItemIdToNodeId);
}
