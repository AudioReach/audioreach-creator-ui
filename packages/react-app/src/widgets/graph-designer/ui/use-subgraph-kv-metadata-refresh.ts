/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useRef} from 'react';

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

/**
 * Owns the SGKV metadata lifecycle while Graph Designer is mounted. This hook
 * deliberately lives outside the optional Key Configurator tab so loading or
 * editing a graph cannot depend on the user opening that tab.
 */
interface MetadataSnapshot {
  graphData: UsecaseGraphData;
  mode: 'edit' | 'view';
  subgraphIds: string[];
}

interface MetadataResolutionResult {
  metadata: SubgraphKvMetadataById | null;
  subgraphSystemId: string;
}

/**
 * Refreshes metadata for every graph subgraph to derive their default vectors.
 */
export function useSubgraphKvMetadataRefresh(projectId: string): void {
  const graphDesignerStore = useGraphDesignerStore();
  const {graphData, graphDataStatus, mode} = useGraphDesignerStoreShallow(
    (state) => ({
      graphData: state.graphData,
      graphDataStatus: state.graphDataStatus,
      mode: state.mode,
    }),
  );
  // Metadata writes replace Graph Data references; remember the replacement to
  // avoid launching the same request again from this hook's resulting render.
  const lastMetadataSync = useRef<MetadataSnapshot | null>(null);
  // React effects can rerun before the request completes. Keep this outside
  // Zustand so duplicate lifecycle work does not create duplicate API calls.
  const inFlightSyncKeys = useRef(new WeakMap<UsecaseGraphData, Set<string>>());
  // Only the current graph snapshot may clear the shared loading indicator.
  const metadataRefreshRequestId = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    // Capture one coherent state snapshot before asynchronous backend work.
    const snapshot = graphDesignerStore.getState();
    const graphSnapshot = snapshot.graphData;
    if (!graphSnapshot || snapshot.graphDataStatus !== 'ready') {
      return;
    }
    const subgraphIds = Object.keys(graphSnapshot.subgraphs).toSorted();
    if (subgraphIds.length === 0) {
      metadataRefreshRequestId.current += 1;
      snapshot.setSgKvMetadataRefreshing(false);
      return;
    }
    if (
      lastMetadataSync.current?.graphData === graphSnapshot &&
      lastMetadataSync.current.mode === snapshot.mode &&
      lastMetadataSync.current.subgraphIds.join(',') === subgraphIds.join(',')
    ) {
      return;
    }

    const syncKey = `${snapshot.mode}:${subgraphIds.join(',')}`;
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
      const metadataResults = await Promise.all(
        subgraphIds.map((subgraphSystemId) =>
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
          })
            .catch((error): null => {
              logger.warn(
                `Subgraph KV metadata resolution failed (${subgraphSystemId})`,
                {
                  action: 'resolve_subgraph_kv_metadata',
                  component: 'GraphDesigner',
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                  projectId,
                },
              );
              return null;
            })
            .then(
              (metadata): MetadataResolutionResult => ({
                metadata,
                subgraphSystemId,
              }),
            ),
        ),
      );
      const failedSubgraphIds = metadataResults
        .filter(({metadata}) => metadata === null)
        .map(({subgraphSystemId}) => subgraphSystemId);
      const metadata = Object.assign(
        {},
        ...metadataResults.flatMap(({metadata: resolvedMetadata}) =>
          resolvedMetadata ? [resolvedMetadata] : [],
        ),
      );

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
      if (failedSubgraphIds.length > 0) {
        const subgraphLabel =
          failedSubgraphIds.length === 1 ? 'subgraph' : 'subgraphs';
        showToast(
          `Unable to derive default KV selections for ${failedSubgraphIds.length} ${subgraphLabel}. Select KV values manually.`,
          'warning',
        );
      }
      lastMetadataSync.current = {
        graphData: graphDesignerStore.getState().graphData ?? graphSnapshot,
        mode: snapshot.mode,
        subgraphIds,
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
  }, [graphData, graphDataStatus, mode, refresh, projectId]);
}
