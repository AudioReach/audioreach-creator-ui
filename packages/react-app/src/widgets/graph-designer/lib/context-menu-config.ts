/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ChevronRight, Link, Trash2} from 'lucide-react';

import {EDGE_KIND} from '~entities/graph';
import {
  DELETE_HANDLERS,
  resolveGraphDesignerNodeId,
  type GraphDesignerStore,
  type UsecaseGraphData,
} from '~features/graph-designer';
import type {
  ContextMenuItem,
  ContextMenuTarget,
  VisualizerContextMenuConfig,
} from '~features/usecase-visualizer';

type EdgeTarget = Extract<
  ContextMenuTarget,
  | {kind: 'control-link'}
  | {kind: 'data-link'}
  | {kind: 'proxy-control-link'}
  | {kind: 'proxy-data-link'}
>;

export function resolveContextMenuNodeId(target: ContextMenuTarget): string {
  if (!('node' in target)) {
    return '';
  }
  return resolveGraphDesignerNodeId(target);
}

export function resolveEdgeLinkType(target: EdgeTarget): 'control' | 'data' {
  return target.kind === 'control-link' || target.kind === 'proxy-control-link'
    ? EDGE_KIND.CONTROL
    : EDGE_KIND.DATA;
}

function hasAnySubsystemChildren(
  store: GraphDesignerStore,
  id: string,
): boolean {
  const subsystem = store.graphData?.subsystems[id];
  return (
    (subsystem?.subgraphs.length ?? 0) > 0 ||
    (subsystem?.childSubsystemIds.length ?? 0) > 0
  );
}

function isPairLink(store: GraphDesignerStore, connectionId: string): boolean {
  return Object.values(store.pairLinksById).some((pair) =>
    [...pair.dataLinks, ...pair.controlLinks].some(
      (link) => link.systemId === connectionId,
    ),
  );
}

function parentSubsystemIdOf(
  graphData: UsecaseGraphData | null,
  nodeId: string,
): string | null {
  if (!graphData) {
    return null;
  }
  const subsystem = graphData.subsystems[nodeId];
  if (subsystem) {
    return subsystem.parentSubsystemId ?? null;
  }
  return (
    Object.values(graphData.subsystems).find((candidate) =>
      candidate.subgraphs.includes(nodeId),
    )?.parentSubsystemId ?? null
  );
}

function buildPortItems(connectionInProgress: boolean): ContextMenuItem[] {
  if (connectionInProgress) {
    return [{id: 'end-connection', label: 'End connection'}];
  }
  return [{icon: Link, id: 'start-connection', label: 'Start connection'}];
}

export function buildContextMenuConfig(
  get: () => GraphDesignerStore,
): VisualizerContextMenuConfig {
  return {
    getItems: (target) => {
      const store = get();
      if (store.mode !== 'edit') {
        return [];
      }
      switch (target.kind) {
        case 'module':
        case 'container':
        case 'subgraph-proxy':
          return [{icon: Trash2, id: 'delete', label: 'Delete'}];
        case 'subgraph':
          return [
            {icon: Trash2, id: 'delete', label: 'Delete'},
            {id: 'move-to-subsystem', label: 'Move to Subsystem'},
            ...(target.node.parentId
              ? [{id: 'remove-from-subsystem', label: 'Remove from Subsystem'}]
              : []),
          ];
        case 'subsystem': {
          const hasChildren = hasAnySubsystemChildren(store, target.node.id);
          return [
            {
              disabled: hasChildren,
              icon: Trash2,
              id: 'delete',
              label: 'Delete',
              tooltip: hasChildren
                ? 'Subsystem must be empty before it can be deleted'
                : undefined,
            },
            {id: 'move-to-subsystem', label: 'Move to Subsystem'},
            ...(target.node.parentId
              ? [{id: 'remove-from-subsystem', label: 'Remove from Subsystem'}]
              : []),
            {icon: ChevronRight, id: 'expand', label: 'Expand'},
          ];
        }
        case 'port':
          return buildPortItems(target.connectionInProgress);
        case 'control-link':
        case 'data-link':
        case 'proxy-control-link':
        case 'proxy-data-link':
          return [
            {icon: Trash2, id: 'delete', label: 'Delete'},
            ...(isPairLink(store, target.edge.id)
              ? [{id: 'exclude-link', label: 'Exclude Link'}]
              : []),
          ];
      }
    },
    onAction: (actionId, target) => {
      const store = get();
      if ('node' in target) {
        const nodeId = resolveContextMenuNodeId(target);
        if (actionId === 'delete') {
          void DELETE_HANDLERS[target.node.nodeKind](get, nodeId);
          return;
        }
        if (actionId === 'move-to-subsystem') {
          void store.moveToSubsystem(get, nodeId, null);
          return;
        }
        if (actionId === 'remove-from-subsystem') {
          void store.moveToSubsystem(
            get,
            nodeId,
            parentSubsystemIdOf(store.graphData, nodeId),
          );
          return;
        }
        if (actionId === 'expand') {
          void store.expandSubsystem(get, nodeId);
        }
        return;
      }
      if (target.kind === 'port') {
        return;
      }
      if (actionId === 'delete') {
        void store.deleteLink(get, target.edge.id, resolveEdgeLinkType(target));
      }
      if (actionId === 'exclude-link') {
        store.excludeLink(get, target.edge.id);
      }
    },
  };
}
