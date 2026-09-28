/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {NODE_KIND} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer';
import {
  type ConfigurationItem,
  ConfigurationItemType,
} from '~features/key-configurator';
import type {SelectedNodeRef} from '~features/usecase-visualizer';

export function mapSelectedNodesToConfigurationItems(
  nodes: SelectedNodeRef[],
  graphData: UsecaseGraphData | null,
): ConfigurationItem[] {
  if (!graphData) {
    return [];
  }

  const items: ConfigurationItem[] = [];

  for (const node of nodes) {
    switch (node.nodeKind) {
      case NODE_KIND.MODULE: {
        const instance = graphData.moduleInstances[node.systemId];
        if (!instance) {
          continue;
        }
        items.push({
          id: instance.naturalId,
          moduleDefinitionSystemId: instance.moduleDefinitionSystemId,
          name: instance.displayName,
          systemId: node.systemId,
          type: ConfigurationItemType.MODULE,
        });
        break;
      }
      case NODE_KIND.SUBGRAPH: {
        const subgraph = graphData.subgraphs[node.systemId];
        if (!subgraph) {
          continue;
        }
        items.push({
          id: Number(subgraph.systemId),
          name: subgraph.subgraphName,
          systemId: node.systemId,
          type: ConfigurationItemType.SUBGRAPH,
        });
        break;
      }
      case NODE_KIND.SUBGRAPH_PROXY: {
        const subgraph = graphData.subgraphs[node.systemId];
        if (!subgraph) {
          continue;
        }
        items.push({
          id: Number(subgraph.systemId),
          name: subgraph.subgraphName,
          systemId: node.systemId,
          type: ConfigurationItemType.SUBGRAPH,
        });
        break;
      }
      case NODE_KIND.SUBSYSTEM: {
        const subsystem = graphData.subsystems[node.systemId];
        if (!subsystem) {
          continue;
        }
        items.push({
          id: Number(subsystem.subsystemId),
          name: subsystem.subsystemName,
          systemId: node.systemId,
          type: ConfigurationItemType.SUBSYSTEM,
        });
        break;
      }
      default:
        // Container nodes are not configurable.
        break;
    }
  }

  return items;
}
