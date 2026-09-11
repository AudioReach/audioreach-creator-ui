/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Covers the regression that made SGKV metadata depend on opening Key
 * Configurator. The resolver is mocked so this suite isolates the Graph
 * Designer lifecycle and its non-blocking failure behavior.
 */
const mockResolveSubgraphKvMetadata = jest.fn();

jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster');
jest.mock('~features/key-configurator/subgraph-configurator-view', () => ({
  applySubgraphKvMetadata: jest.fn(),
  resolveSubgraphKvMetadata: mockResolveSubgraphKvMetadata,
}));

import {act, renderHook, waitFor} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

import {NODE_KIND} from '~entities/graph';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import type {SubgraphKvMetadataById} from '~features/key-configurator/subgraph-configurator-view';
import {showToast} from '~shared/controls/global-toaster';
import {useSubgraphKvMetadataRefresh} from '~widgets/graph-designer/ui/use-subgraph-kv-metadata-refresh';

const mockShowToast = jest.mocked(showToast);

function makeStore(): StoreApi<GraphDesignerStore> {
  // Keep the store deliberately minimal: the hook only needs a ready snapshot,
  // editable-vector state, View-mode metadata updates, and transient loading.
  const updateSgKvMetadata = jest.fn();
  const setSgKvMetadataRefreshing = jest.fn();
  return createStore(
    () =>
      ({
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {},
          selectedUsecases: ['usecase-1'],
          subgraphs: {
            'subgraph-1': {
              containers: [],
              kvVectors: [],
              naturalId: 42,
              subgraphName: 'Subgraph 1',
              subgraphType: 'shared',
              systemId: 'subgraph-1',
            },
          },
          subsystems: {},
        },
        graphDataStatus: 'ready',
        kvSelectionsById: {},
        mode: 'view',
        selectedNodes: [
          {
            id: 'node-subgraph-1',
            nodeKind: NODE_KIND.SUBGRAPH,
            systemId: 'subgraph-1',
          },
        ],
        setSgKvMetadataRefreshing,
        subgraphProvenanceById: {},
        updateSgKvMetadata,
      }) as unknown as GraphDesignerStore,
  );
}

describe('useSubgraphKvMetadataRefresh', () => {
  it('refreshes only the selected subgraph without rendering Key Configurator', async () => {
    const store = makeStore();
    mockResolveSubgraphKvMetadata.mockResolvedValue({
      'subgraph-1': {},
    });

    renderHook(() => useSubgraphKvMetadataRefresh('project-1'), {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider value={store}>
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    });

    await waitFor(() => {
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledWith({
        palettePlacedSubgraphIds: [],
        projectId: 'project-1',
        selectedUsecaseIds: ['usecase-1'],
        subgraphNaturalId: 42,
        subgraphSystemId: 'subgraph-1',
        vectorsBySubgraphId: {'subgraph-1': []},
      });
    });
    expect(store.getState().updateSgKvMetadata).toHaveBeenCalledWith({
      'subgraph-1': {},
    });
    expect(store.getState().setSgKvMetadataRefreshing).toHaveBeenCalledWith(
      true,
    );
    expect(store.getState().setSgKvMetadataRefreshing).toHaveBeenLastCalledWith(
      false,
    );
  });

  it('shows a warning when metadata loading throws', async () => {
    mockResolveSubgraphKvMetadata.mockRejectedValue(new Error('offline'));

    renderHook(() => useSubgraphKvMetadataRefresh('project-1'), {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider value={makeStore()}>
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Unable to refresh subgraph KV metadata',
        'warning',
      );
    });
  });

  it('does not start a duplicate request while the same refresh is pending', async () => {
    const store = makeStore();
    let resolveMetadata: (value: SubgraphKvMetadataById) => void;
    mockResolveSubgraphKvMetadata.mockReturnValue(
      new Promise((resolve) => {
        resolveMetadata = resolve;
      }),
    );

    renderHook(() => useSubgraphKvMetadataRefresh('project-1'), {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider value={store}>
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    });

    await waitFor(() => {
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(1);
    });
    act(() => {
      store.setState({selectedNodes: [...store.getState().selectedNodes]});
    });
    expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMetadata!({'subgraph-1': {}});
    });
  });
});
