/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ChevronRight, Link, Trash2} from 'lucide-react';

import {EDGE_KIND, PORT_IO_TYPE, type PortIoType} from '~entities/graph';
import {
  DELETE_HANDLERS,
  resolveGraphDesignerNodeId,
  type GraphDesignerStore,
  type UsecaseGraphData,
} from '~features/graph-designer';
import type {
  ConnectionCommand,
  ContextMenuItem,
  ContextMenuTarget,
  EdgeMode,
  VisualizerContextMenuConfig,
} from '~features/usecase-visualizer';

const LINK_MENU_ACTIONS = {
  completeDanglingControlLink: 'complete-dangling-control-link',
  completeDanglingDataLink: 'complete-dangling-data-link',
  completeEcLink: 'complete-ec-link',
  endConnection: 'end-connection',
  startConnection: 'start-connection',
  startDanglingControlLink: 'start-dangling-control-link',
  startDanglingDataLink: 'start-dangling-data-link',
  startEcLink: 'start-ec-link',
} as const;

const START_EDGE_MODES = {
  [LINK_MENU_ACTIONS.startConnection]: 'normal',
  [LINK_MENU_ACTIONS.startDanglingControlLink]: 'dangling',
  [LINK_MENU_ACTIONS.startDanglingDataLink]: 'dangling',
  [LINK_MENU_ACTIONS.startEcLink]: 'EC',
} as const satisfies Record<string, EdgeMode>;

const COMPLETE_LINK_ACTIONS: ReadonlySet<string> = new Set([
  LINK_MENU_ACTIONS.completeEcLink,
  LINK_MENU_ACTIONS.completeDanglingControlLink,
  LINK_MENU_ACTIONS.completeDanglingDataLink,
  LINK_MENU_ACTIONS.endConnection,
]);

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

function buildPortItems(
  connectionInProgress: {edgeMode: EdgeMode} | null,
  portIoType: PortIoType,
): ContextMenuItem[] {
  if (connectionInProgress) {
    const completeItems = {
      dangling: {
        id:
          portIoType === PORT_IO_TYPE.CONTROL
            ? LINK_MENU_ACTIONS.completeDanglingControlLink
            : LINK_MENU_ACTIONS.completeDanglingDataLink,
        label:
          portIoType === PORT_IO_TYPE.CONTROL
            ? 'Complete Dangling Control Link'
            : 'Complete Dangling Data Link',
      },
      EC: {id: LINK_MENU_ACTIONS.completeEcLink, label: 'Complete EC Link'},
      normal: {id: LINK_MENU_ACTIONS.endConnection, label: 'End connection'},
    } satisfies Record<EdgeMode, ContextMenuItem>;
    return [completeItems[connectionInProgress.edgeMode]];
  }
  const startConnection = {
    icon: Link,
    id: LINK_MENU_ACTIONS.startConnection,
    label: 'Start connection',
  };
  if (portIoType === PORT_IO_TYPE.CONTROL) {
    return [
      startConnection,
      {
        id: LINK_MENU_ACTIONS.startDanglingControlLink,
        label: 'Start Dangling Control Link',
      },
    ];
  }
  if (portIoType === PORT_IO_TYPE.INPUT || portIoType === PORT_IO_TYPE.OUTPUT) {
    return [
      startConnection,
      {id: LINK_MENU_ACTIONS.startEcLink, label: 'Start EC Link'},
      {
        id: LINK_MENU_ACTIONS.startDanglingDataLink,
        label: 'Start Dangling Data Link',
      },
    ];
  }
  return [];
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
          return buildPortItems(
            target.connectionInProgress,
            target.port.portIoType,
          );
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
    onAction: (actionId, target): ConnectionCommand | void => {
      const store = get();
      if (target.kind === 'port') {
        const edgeMode =
          START_EDGE_MODES[actionId as keyof typeof START_EDGE_MODES];
        if (edgeMode) {
          return {command: 'start', edgeMode};
        }
        if (COMPLETE_LINK_ACTIONS.has(actionId)) {
          return {command: 'complete'};
        }
        return;
      }
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
      if (actionId === 'delete') {
        void store.deleteLink(get, target.edge.id, resolveEdgeLinkType(target));
      }
      if (actionId === 'exclude-link') {
        store.excludeLink(get, target.edge.id);
      }
    },
  };
}
