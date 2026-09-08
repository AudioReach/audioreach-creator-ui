/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {createStore} from 'zustand';

import {
  createGraphNavigationSlice,
  type GraphNavigationSlice,
} from '~features/graph-designer/model/graph-navigation-slice';
import type {SearchHighlight} from '~features/graph-designer/model/visualizer-slice';
import type {SelectedEdgeRef, SelectedNodeRef} from '~shared/types';

interface TestStore extends GraphNavigationSlice {
  searchHighlight: SearchHighlight | null;
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
}

function createTestStore() {
  return createStore<TestStore>()((set) => ({
    ...createGraphNavigationSlice(set),
    searchHighlight: {
      activeNodeId: 'module-1',
      matchNodeIds: ['module-1'],
    },
    selectedEdges: [
      {
        edgeKind: 'data',
        id: 'edge-1',
        systemId: 'edge-1',
      },
    ],
    selectedNodes: [
      {
        id: 'module-1',
        nodeKind: 'module',
        systemId: 'module-1',
      },
    ],
  }));
}

describe('createGraphNavigationSlice', () => {
  it('initializes subsystem navigation state', () => {
    const store = createTestStore();

    expect(store.getState().activeSubsystemId).toBeNull();
    expect(store.getState().subsystemNavigationRequestId).toBe(0);
  });

  it('navigates to a subsystem and clears transient graph state', () => {
    const store = createTestStore();

    store.getState().navigateToSubsystem('subsystem-1');

    expect(store.getState().activeSubsystemId).toBe('subsystem-1');
    expect(store.getState().searchHighlight).toBeNull();
    expect(store.getState().selectedEdges).toEqual([]);
    expect(store.getState().selectedNodes).toEqual([]);
    expect(store.getState().subsystemNavigationRequestId).toBe(1);
  });

  it('clears the active subsystem without emitting a navigation request', () => {
    const store = createTestStore();

    store.getState().navigateToSubsystem('subsystem-1');
    store.getState().clearActiveSubsystem();

    expect(store.getState().activeSubsystemId).toBeNull();
    expect(store.getState().subsystemNavigationRequestId).toBe(1);
  });
});
