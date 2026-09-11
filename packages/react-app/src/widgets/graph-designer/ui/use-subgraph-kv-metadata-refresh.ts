/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useRef} from 'react';

import {NODE_KIND} from '~entities/graph';
import {
  applySubgraphKvMetadata,
  resolveSubgraphKvMetadata,
  type SubgraphKvMetadataById,
} from '~features/key-configurator/subgraph-configurator-view';
import {
  type UsecaseGraphData,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import type {SelectedNodeRef} from '~shared/types';

/**
 * Owns the SGKV metadata lifecycle while Graph Designer is mounted. This hook
 * deliberately lives outside the optional Key Configurator tab so loading or
 * editing a graph cannot depend on the user opening that tab.
 */
interface MetadataSnapshot {
  graphData: UsecaseGraphData;
  mode: 'edit' | 'view';
  selectedSubgraphIds: string[];
}

function getSelectedSubgraphIds(
  graphData: UsecaseGraphData,
  selectedNodes: SelectedNodeRef[],
): string[] {
  return [
    ...new Set(
      selectedNodes
        .filter(
          (node) =>
            (node.nodeKind === NODE_KIND.SUBGRAPH ||
              node.nodeKind === NODE_KIND.SUBGRAPH_PROXY) &&
            node.systemId in graphData.subgraphs,
        )
        .map((node) => node.systemId),
    ),
  ].toSorted();
}

/**
 * Refreshes metadata only for subgraphs selected on the canvas. Each lookup
 * uses the subgraph natural ID to avoid an all-project catalog scan.
 */
export function useSubgraphKvMetadataRefresh(projectId: string): void {
  const graphDesignerStore = useGraphDesignerStore();
  const {graphData, graphDataStatus, mode, selectedNodes} =
    useGraphDesignerStoreShallow((state) => ({
      graphData: state.graphData,
      graphDataStatus: state.graphDataStatus,
      mode: state.mode,
      selectedNodes: state.selectedNodes,
    }));
  // Metadata writes replace Graph Data references; remember the replacement to
  // avoid launching the same request again from this hook's resulting render.
  const lastMetadataSync = useRef<MetadataSnapshot | null>(null);
  // React effects can rerun before the request completes. Keep this outside
  // Zustand so duplicate lifecycle work does not create duplicate API calls.
  const inFlightSyncKeys = useRef(new WeakMap<UsecaseGraphData, Set<string>>());
  // Only the current selection batch may clear the shared loading indicator.
  const metadataRefreshRequestId = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    // Capture one coherent state snapshot before asynchronous backend work.
    const snapshot = graphDesignerStore.getState();
    const graphSnapshot = snapshot.graphData;
    if (!graphSnapshot || snapshot.graphDataStatus !== 'ready') {
      return;
    }
    const selectedSubgraphIds = getSelectedSubgraphIds(
      graphSnapshot,
      snapshot.selectedNodes,
    );
    if (selectedSubgraphIds.length === 0) {
      metadataRefreshRequestId.current += 1;
      snapshot.setSgKvMetadataRefreshing(false);
      return;
    }
    if (
      lastMetadataSync.current?.graphData === graphSnapshot &&
      lastMetadataSync.current.mode === snapshot.mode &&
      lastMetadataSync.current.selectedSubgraphIds.join(',') ===
        selectedSubgraphIds.join(',')
    ) {
      return;
    }

    const syncKey = `${snapshot.mode}:${selectedSubgraphIds.join(',')}`;
    const graphSyncKeys = inFlightSyncKeys.current.get(graphSnapshot);
    if (graphSyncKeys?.has(syncKey)) {
      return;
    }
    const nextGraphSyncKeys = graphSyncKeys ?? new Set<string>();
    nextGraphSyncKeys.add(syncKey);
    inFlightSyncKeys.current.set(graphSnapshot, nextGraphSyncKeys);

    const refreshRequestId = metadataRefreshRequestId.current + 1;
    metadataRefreshRequestId.current = refreshRequestId;
    snapshot.setSgKvMetadataRefreshing(true);

    const isEditable = snapshot.mode === 'edit';
    // View vectors are read from the backend snapshot; Edit vectors include
    // staged Add/Delete/selection changes and must remain the update target.
    const vectorsBySubgraphId = isEditable
      ? snapshot.kvSelectionsById
      : Object.fromEntries(
          Object.entries(graphSnapshot.subgraphs).map(
            ([subgraphSystemId, subgraph]) => [
              subgraphSystemId,
              subgraph.kvVectors,
            ],
          ),
        );
    const palettePlacedSubgraphIds = isEditable
      ? Object.entries(snapshot.subgraphProvenanceById)
          .filter(([, provenance]) => provenance === 'palette-placed')
          .map(([subgraphSystemId]) => subgraphSystemId)
      : [];
    try {
      const metadataBySelectedSubgraph = await Promise.all(
        selectedSubgraphIds.map((subgraphSystemId) =>
          resolveSubgraphKvMetadata({
            palettePlacedSubgraphIds,
            projectId,
            selectedUsecaseIds: graphSnapshot.selectedUsecases,
            subgraphNaturalId:
              graphSnapshot.subgraphs[subgraphSystemId]?.naturalId,
            subgraphSystemId,
            vectorsBySubgraphId: {
              [subgraphSystemId]: vectorsBySubgraphId[subgraphSystemId] ?? [],
            },
          }),
        ),
      );
      const resolvedMetadata = metadataBySelectedSubgraph.filter(
        (subgraphMetadata): subgraphMetadata is SubgraphKvMetadataById =>
          subgraphMetadata !== null,
      );
      const metadata =
        resolvedMetadata.length === metadataBySelectedSubgraph.length
          ? Object.assign({}, ...resolvedMetadata)
          : null;
      if (!metadata) {
        showToast('Unable to refresh subgraph KV metadata', 'warning');
        return;
      }

      const currentState = graphDesignerStore.getState();
      // A different graph or mode may have arrived while metadata was loading.
      // Discard the stale result instead of applying it to newer state.
      if (
        currentState.graphData !== graphSnapshot ||
        currentState.mode !== snapshot.mode
      ) {
        return;
      }
      if (isEditable) {
        // Preserve session-local vector identity/pairs while overlaying metadata.
        currentState.updateSgKvConfigInfo(
          applySubgraphKvMetadata(vectorsBySubgraphId, metadata),
        );
      } else {
        currentState.updateSgKvMetadata(metadata);
      }
      lastMetadataSync.current = {
        graphData: graphDesignerStore.getState().graphData ?? graphSnapshot,
        mode: snapshot.mode,
        selectedSubgraphIds,
      };
    } catch (error) {
      logger.error('Subgraph KV metadata synchronization failed', {
        action: 'synchronize_subgraph_kv_metadata',
        component: 'GraphDesigner',
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
      });
      showToast('Unable to refresh subgraph KV metadata', 'warning');
      return;
    } finally {
      // Clear after the result is written so the list cannot briefly expose
      // the old classification between loading and metadata updates.
      nextGraphSyncKeys.delete(syncKey);
      if (metadataRefreshRequestId.current === refreshRequestId) {
        graphDesignerStore.getState().setSgKvMetadataRefreshing(false);
      }
    }
  }, [graphDesignerStore, projectId]);

  // Dependencies describe the lifecycle boundaries that invalidate metadata.
  useEffect(() => {
    void refresh();
  }, [graphData, graphDataStatus, mode, refresh, projectId, selectedNodes]);
}
