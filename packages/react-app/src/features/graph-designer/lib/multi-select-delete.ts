/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {NODE_KIND, type AnyNode} from '~entities/graph';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';

import {withMutationLock} from '../model/edit-session-slice';
import type {UsecaseGraphData} from '../model/graph-data-slice';
import type {GraphDesignerStore} from '../model/graph-designer-store';

import {DELETE_HANDLERS_INNER} from './delete-handlers';

export function resolveNodeKind(
  graphData: UsecaseGraphData,
  nodeId: string,
): AnyNode['nodeKind'] {
  if (nodeId in graphData.moduleInstances) {
    return NODE_KIND.MODULE;
  }
  if (nodeId in graphData.containers) {
    return NODE_KIND.CONTAINER;
  }
  if (nodeId in graphData.subgraphs) {
    return NODE_KIND.SUBGRAPH;
  }
  if (nodeId in graphData.subsystems) {
    return NODE_KIND.SUBSYSTEM;
  }
  throw new Error(`Unknown graph node id: ${nodeId}`);
}

function parentOf(graphData: UsecaseGraphData, nodeId: string): string | null {
  const moduleInstance = graphData.moduleInstances[nodeId];
  if (moduleInstance) {
    return moduleInstance.containerId;
  }
  const container = graphData.containers[nodeId];
  if (container) {
    return container.subgraphId;
  }
  for (const subsystem of Object.values(graphData.subsystems)) {
    if (subsystem.subgraphs.includes(nodeId)) {
      return subsystem.subsystemId;
    }
    if (subsystem.childSubsystemIds.includes(nodeId)) {
      return subsystem.subsystemId;
    }
  }
  return null;
}

export function isAncestorOf(
  graphData: UsecaseGraphData,
  ancestorId: string,
  nodeId: string,
): boolean {
  let current = parentOf(graphData, nodeId);
  while (current) {
    if (current === ancestorId) {
      return true;
    }
    current = parentOf(graphData, current);
  }
  return false;
}

export function filterCascadeRoots(
  graphData: UsecaseGraphData,
  selectedNodeIds: string[],
): string[] {
  const selected = new Set(selectedNodeIds);
  return selectedNodeIds.filter(
    (nodeId) =>
      ![...selected].some(
        (candidate) =>
          candidate !== nodeId && isAncestorOf(graphData, candidate, nodeId),
      ),
  );
}

function endpointCovered(
  graphData: UsecaseGraphData,
  rootIds: string[],
  nodeId: string,
): boolean {
  return rootIds.some(
    (rootId) => rootId === nodeId || isAncestorOf(graphData, rootId, nodeId),
  );
}

export function filterEdgesCoveredByCascade(
  graphData: UsecaseGraphData,
  survivingRootIds: string[],
  selectedEdgeIds: string[],
): string[] {
  return selectedEdgeIds.filter((edgeId) => {
    const edge = graphData.connections.find((c) => c.connectionId === edgeId);
    if (!edge) {
      return true;
    }
    return !(
      endpointCovered(graphData, survivingRootIds, edge.fromModuleId) ||
      endpointCovered(graphData, survivingRootIds, edge.toModuleId)
    );
  });
}

export async function deleteSelection(
  get: () => GraphDesignerStore,
  selectedNodeIds: string[],
  selectedEdgeIds: string[],
): Promise<void> {
  const state = get();
  if (state.mode !== 'edit' || !state.graphData) {
    return;
  }

  const graphData = state.graphData;
  const survivingRoots = filterCascadeRoots(graphData, selectedNodeIds);
  const survivingEdges = filterEdgesCoveredByCascade(
    graphData,
    survivingRoots,
    selectedEdgeIds,
  );
  const total = survivingRoots.length + survivingEdges.length;
  if (total === 0) {
    return;
  }

  const results = await withMutationLock(get, () =>
    Promise.allSettled([
      ...survivingRoots.map((nodeId) =>
        DELETE_HANDLERS_INNER[resolveNodeKind(graphData, nodeId)](get, nodeId, {
          suppressToast: true,
        }),
      ),
      ...survivingEdges.map((connectionId) => {
        const connection = graphData.connections.find(
          (candidate) => candidate.connectionId === connectionId,
        );
        if (!connection) {
          return Promise.resolve(false);
        }
        return get().deleteLinkInner(
          get,
          connectionId,
          connection.connectionType,
          {suppressToast: true},
        );
      }),
    ]),
  );

  const succeeded = results.filter(
    (result) => result.status === 'fulfilled' && result.value,
  ).length;
  const failed = total - succeeded;
  if (failed > 0) {
    logger.warn('multiSelectDelete: one or more deletes failed', {
      action: 'delete_selection',
      component: 'multiSelectDelete',
      tag: `failed=${failed};total=${total}`,
    });
  }
  if (succeeded === total) {
    showToast('Deleted selected items', 'success');
  } else if (succeeded === 0) {
    showToast('Failed to delete selected items', 'danger');
  } else {
    showToast(`${succeeded} of ${total} deletions succeeded`, 'warning');
  }
}
