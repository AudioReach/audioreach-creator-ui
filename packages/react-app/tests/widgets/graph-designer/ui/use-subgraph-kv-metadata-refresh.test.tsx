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
  applySubgraphKvMetadata: jest.fn(
    (vectorsBySubgraphId: Record<string, unknown[]>) => vectorsBySubgraphId,
  ),
  resolveSubgraphKvMetadata: mockResolveSubgraphKvMetadata,
}));

import {act, renderHook, waitFor} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

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
            'subgraph-2': {
              containers: [],
              kvVectors: [],
              naturalId: 43,
              subgraphName: 'Subgraph 2',
              subgraphType: 'shared',
              systemId: 'subgraph-2',
            },
          },
          subsystems: {},
        },
        graphDataStatus: 'ready',
        kvSelectionsById: {},
        mode: 'view',
        selectedNodes: [],
        setSgKvMetadataRefreshing,
        subgraphProvenanceById: {},
        updateSgKvMetadata,
      }) as unknown as GraphDesignerStore,
  );
}

describe('useSubgraphKvMetadataRefresh', () => {
  it('refreshes every graph subgraph without rendering Key Configurator', async () => {
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
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(2);
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledWith({
        palettePlacedSubgraphIds: [],
        projectId: 'project-1',
        selectedUsecaseIds: ['usecase-1'],
        subgraphNaturalId: 42,
        subgraphSystemId: 'subgraph-1',
        vectorsBySubgraphId: {'subgraph-1': []},
      });
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledWith({
        palettePlacedSubgraphIds: [],
        projectId: 'project-1',
        selectedUsecaseIds: ['usecase-1'],
        subgraphNaturalId: 43,
        subgraphSystemId: 'subgraph-2',
        vectorsBySubgraphId: {'subgraph-2': []},
      });
    });
    expect(store.getState().updateSgKvMetadata).toHaveBeenCalledWith(
      expect.objectContaining({'subgraph-1': {}}),
    );
    expect(store.getState().setSgKvMetadataRefreshing).toHaveBeenCalledWith(
      true,
    );
    expect(store.getState().setSgKvMetadataRefreshing).toHaveBeenLastCalledWith(
      false,
    );
  });

  it('applies resolved metadata and warns when one subgraph fails', async () => {
    const store = makeStore();
    mockResolveSubgraphKvMetadata
      .mockResolvedValueOnce({'subgraph-1': {}})
      .mockRejectedValueOnce(new Error('offline'));

    renderHook(() => useSubgraphKvMetadataRefresh('project-1'), {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider value={store}>
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    });

    await waitFor(() => {
      expect(store.getState().updateSgKvMetadata).toHaveBeenCalledWith({
        'subgraph-1': {},
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        'Unable to derive default KV selections for 1 subgraph. Select KV values manually.',
        'warning',
      );
    });
    expect(store.getState().setSgKvMetadataRefreshing).toHaveBeenLastCalledWith(
      false,
    );
  });

  it('treats an empty metadata map as a successful resolution', async () => {
    const store = makeStore();
    mockResolveSubgraphKvMetadata.mockResolvedValue({});

    renderHook(() => useSubgraphKvMetadataRefresh('project-1'), {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider value={store}>
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    });

    await waitFor(() => {
      expect(store.getState().updateSgKvMetadata).toHaveBeenCalledWith({});
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not refresh when canvas selection changes', async () => {
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

    await waitFor(() => expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(2));
    act(() => {
      store.setState({selectedNodes: [...store.getState().selectedNodes]});
    });
    expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveMetadata!({'subgraph-1': {}});
    });
  });

  it('reclassifies every subgraph when selected usecases reload the graph', async () => {
    const store = makeStore();
    mockResolveSubgraphKvMetadata.mockResolvedValue({});

    renderHook(() => useSubgraphKvMetadataRefresh('project-1'), {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider value={store}>
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    });

    await waitFor(() =>
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(2),
    );

    const graphData = store.getState().graphData!;
    act(() => {
      store.setState({
        graphData: {...graphData, selectedUsecases: ['usecase-1', 'usecase-2']},
      });
    });

    await waitFor(() =>
      expect(mockResolveSubgraphKvMetadata).toHaveBeenCalledTimes(4),
    );
    expect(mockResolveSubgraphKvMetadata).toHaveBeenLastCalledWith({
      palettePlacedSubgraphIds: [],
      projectId: 'project-1',
      selectedUsecaseIds: ['usecase-1', 'usecase-2'],
      subgraphNaturalId: 43,
      subgraphSystemId: 'subgraph-2',
      vectorsBySubgraphId: {'subgraph-2': []},
    });
  });
});
