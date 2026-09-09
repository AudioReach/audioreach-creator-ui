/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  EDGE_KIND,
  NODE_KIND,
  type ProxyControlLink,
  type ProxyDataLink,
} from '~entities/graph';
import type {
  SelectedEdgeRef,
  SelectedNodeRef,
} from '~features/usecase-visualizer';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

export type PropertyGroupType =
  | 'subgraphs'
  | 'containers'
  | 'modules'
  | 'subsystems'
  | 'dataLinks'
  | 'controlLinks'
  | 'virtualDataLinks'
  | 'virtualControlLinks';

export interface PropertyGroupItem {
  edgeId?: string;
  nodeId?: string;
  proxyControlLink?: ProxyControlLink;
  proxyDataLink?: ProxyDataLink;
  systemId: string;
}

export interface PropertyGroupViewModel {
  items: PropertyGroupItem[];
  label: string;
  type: PropertyGroupType;
}

export interface BuildPropertyGroupsInput {
  graphData: UsecaseGraphData;
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
  virtualControlLinks: ProxyControlLink[];
  virtualDataLinks: ProxyDataLink[];
}

const GROUP_ORDER: Array<Pick<PropertyGroupViewModel, 'label' | 'type'>> = [
  {label: 'Subgraphs', type: 'subgraphs'},
  {label: 'Containers', type: 'containers'},
  {label: 'Modules', type: 'modules'},
  {label: 'Subsystems', type: 'subsystems'},
  {label: 'Data Links', type: 'dataLinks'},
  {label: 'Control Links', type: 'controlLinks'},
  {label: 'Virtual Data Links', type: 'virtualDataLinks'},
  {label: 'Virtual Control Links', type: 'virtualControlLinks'},
];

export function buildPropertyGroups({
  graphData,
  selectedEdges,
  selectedNodes,
  virtualControlLinks,
  virtualDataLinks,
}: BuildPropertyGroupsInput): PropertyGroupViewModel[] {
  const groups: Record<PropertyGroupType, PropertyGroupItem[]> = {
    containers: [],
    controlLinks: [],
    dataLinks: [],
    modules: [],
    subgraphs: [],
    subsystems: [],
    virtualControlLinks: [],
    virtualDataLinks: [],
  };

  for (const selectedNode of selectedNodes) {
    addNodeGroupItem(groups, graphData, selectedNode);
  }

  for (const selectedEdge of selectedEdges) {
    addEdgeGroupItem(
      groups,
      graphData,
      selectedEdge,
      virtualDataLinks,
      virtualControlLinks,
    );
  }

  return GROUP_ORDER.flatMap(({label, type}) => {
    const items = groups[type];
    return items.length > 0 ? [{items, label, type}] : [];
  });
}

function addNodeGroupItem(
  groups: Record<PropertyGroupType, PropertyGroupItem[]>,
  graphData: UsecaseGraphData,
  selectedNode: SelectedNodeRef,
): void {
  const item = {
    nodeId: selectedNode.id,
    systemId: selectedNode.systemId,
  };

  switch (selectedNode.nodeKind) {
    case NODE_KIND.SUBGRAPH:
    case NODE_KIND.SUBGRAPH_PROXY:
      if (graphData.subgraphs[selectedNode.systemId]) {
        groups.subgraphs.push(item);
      }
      return;
    case NODE_KIND.CONTAINER:
      if (graphData.containers[selectedNode.systemId]) {
        groups.containers.push(item);
      }
      return;
    case NODE_KIND.MODULE:
      if (graphData.moduleInstances[selectedNode.systemId]) {
        groups.modules.push(item);
      }
      return;
    case NODE_KIND.SUBSYSTEM:
      if (graphData.subsystems[selectedNode.systemId]) {
        groups.subsystems.push(item);
      }
      return;
  }
}

function addEdgeGroupItem(
  groups: Record<PropertyGroupType, PropertyGroupItem[]>,
  graphData: UsecaseGraphData,
  selectedEdge: SelectedEdgeRef,
  virtualDataLinks: ProxyDataLink[],
  virtualControlLinks: ProxyControlLink[],
): void {
  const connection = graphData.connections.find(
    (item) => item.connectionId === selectedEdge.systemId,
  );

  if (
    selectedEdge.edgeKind === EDGE_KIND.DATA &&
    connection?.connectionType === EDGE_KIND.DATA
  ) {
    groups.dataLinks.push({
      edgeId: selectedEdge.id,
      systemId: selectedEdge.systemId,
    });
    return;
  }

  if (
    selectedEdge.edgeKind === EDGE_KIND.CONTROL &&
    connection?.connectionType === EDGE_KIND.CONTROL
  ) {
    groups.controlLinks.push({
      edgeId: selectedEdge.id,
      systemId: selectedEdge.systemId,
    });
    return;
  }

  if (selectedEdge.edgeKind === EDGE_KIND.PROXY_DATA) {
    const proxyDataLink = virtualDataLinks.find(
      (item) => item.id === selectedEdge.id,
    );
    if (proxyDataLink && proxyDataLink.kind !== 'subsystem') {
      groups.virtualDataLinks.push({
        edgeId: selectedEdge.id,
        proxyDataLink,
        systemId: selectedEdge.systemId,
      });
    }
    return;
  }

  if (selectedEdge.edgeKind === EDGE_KIND.PROXY_CONTROL) {
    const proxyControlLink = virtualControlLinks.find(
      (item) => item.id === selectedEdge.id,
    );
    if ((proxyControlLink?.realConnectionIds?.length ?? 0) > 0) {
      groups.virtualControlLinks.push({
        edgeId: selectedEdge.id,
        proxyControlLink,
        systemId: selectedEdge.systemId,
      });
    }
  }
}
