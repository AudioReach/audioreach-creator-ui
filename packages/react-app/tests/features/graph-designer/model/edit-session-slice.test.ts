/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockReleaseExclusiveMode = jest.fn();
const mockSetActiveExclusiveMode = jest.fn(() => true);

jest.mock('~shared/store/project-store-registry', () => ({
  projectStoreRegistry: {
    get: jest.fn(() => ({
      getState: () => ({
        releaseExclusiveMode: mockReleaseExclusiveMode,
        setActiveExclusiveMode: mockSetActiveExclusiveMode,
      }),
    })),
  },
}));

import {createStore} from 'zustand';

import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';

function createTestStore(projectId = 'proj-1') {
  return createStore<EditSessionSlice>((set) =>
    createEditSessionSlice(set, projectId),
  );
}

describe('EditSessionSlice', () => {
  beforeEach(() => {
    mockReleaseExclusiveMode.mockClear();
    mockSetActiveExclusiveMode.mockClear();
  });

  it('clears session-local maps when exiting edit mode', () => {
    const store = createTestStore();

    store.setState({
      excludedLinks: [
        {
          connectionId: 'c1',
          connectionType: 'data',
          fromModuleId: 'm1',
          fromPortId: 'p1',
          toModuleId: 'm2',
          toPortId: 'p2',
        },
      ],
      kvSelectionsById: {
        sg1: [{keyValuePairs: [], selected: true, systemId: 's1'}],
      },
      pairLinksById: {
        sg1: {
          controlLinks: [],
          dataLinks: [],
          destinationSubgraphSystemId: 'sg2',
          sourceSubgraphSystemId: 'sg1',
        },
      },
      subgraphProvenanceById: {sg1: 'newly-created'},
    });

    store.getState().exitEditMode();

    const state = store.getState();
    expect(state.mode).toBe('view');
    expect(state.kvSelectionsById).toEqual({});
    expect(state.excludedLinks).toEqual([]);
    expect(state.pairLinksById).toEqual({});
    expect(state.subgraphProvenanceById).toEqual({});
  });

  it('does not carry session-local state from a prior session into a new one', () => {
    const store = createTestStore();

    store.getState().enterEditMode();
    store.setState({
      kvSelectionsById: {
        sg1: [{keyValuePairs: [], selected: true, systemId: 's1'}],
      },
    });
    store.getState().exitEditMode();

    store.getState().enterEditMode();

    expect(store.getState().kvSelectionsById).toEqual({});
  });

  it('releases the exclusive lock when exiting edit mode', () => {
    const store = createTestStore();

    store.getState().exitEditMode();

    expect(mockReleaseExclusiveMode).toHaveBeenCalledWith('usecase-edit');
  });
});
