/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {NODE_KIND, type AnyNode} from '~entities/graph';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {DeleteSelectionResult} from '~shared/types';

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
    return moduleInstance.containerSystemId;
  }
  const container = graphData.containers[nodeId];
  if (container) {
    return container.subgraphSystemId;
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
    const edge = graphData.connections.find((c) => c.systemId === edgeId);
    if (!edge) {
      return true;
    }
    return !(
      endpointCovered(graphData, survivingRootIds, edge.sourceSystemId) ||
      endpointCovered(graphData, survivingRootIds, edge.destinationSystemId)
    );
  });
}

export async function deleteSelection(
  get: () => GraphDesignerStore,
  selectedNodeIds: string[],
  selectedEdgeIds: string[],
): Promise<DeleteSelectionResult> {
  const state = get();
  if (state.mode !== 'edit' || !state.graphData) {
    return {deletedEdgeIds: [], deletedNodeIds: []};
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
    return {deletedEdgeIds: [], deletedNodeIds: []};
  }

  const results = await withMutationLock(get, () =>
    Promise.allSettled([
      ...survivingRoots.map(async (nodeId) => ({
        id: nodeId,
        kind: 'node' as const,
        succeeded: await DELETE_HANDLERS_INNER[
          resolveNodeKind(graphData, nodeId)
        ](get, nodeId, {suppressToast: true}),
      })),
      ...survivingEdges.map(async (connectionId) => {
        const connection = graphData.connections.find(
          (candidate) => candidate.systemId === connectionId,
        );
        if (!connection) {
          return {id: connectionId, kind: 'edge' as const, succeeded: false};
        }
        return {
          id: connectionId,
          kind: 'edge' as const,
          succeeded: await get().deleteLinkInner(
            get,
            connectionId,
            connection.linkKind,
            {suppressToast: true},
          ),
        };
      }),
    ]),
  );

  const successfulRoots = results.flatMap((result) =>
    result.status === 'fulfilled' && result.value.succeeded &&
    result.value.kind === 'node'
      ? [result.value.id]
      : [],
  );
  const successfulEdges = results.flatMap((result) =>
    result.status === 'fulfilled' && result.value.succeeded &&
    result.value.kind === 'edge'
      ? [result.value.id]
      : [],
  );
  const succeeded = successfulRoots.length + successfulEdges.length;
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

  return {
    deletedEdgeIds: selectedEdgeIds.filter((edgeId) => {
      if (successfulEdges.includes(edgeId)) {
        return true;
      }
      const edge = graphData.connections.find(
        (connection) => connection.systemId === edgeId,
      );
      return (
        edge !== undefined &&
        (endpointCovered(graphData, successfulRoots, edge.sourceSystemId) ||
          endpointCovered(graphData, successfulRoots, edge.destinationSystemId))
      );
    }),
    deletedNodeIds: selectedNodeIds.filter((nodeId) =>
      endpointCovered(graphData, successfulRoots, nodeId),
    ),
  };
}
