/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: {
    getState: jest.fn(() => ({
      selectedUsecaseIds: [],
    })),
  },
}));

import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';

describe('GraphDesignerStore — EditSessionSlice composition', () => {
  it('composes EditSessionSlice with correct initial state and methods', () => {
    const store = createGraphDesignerStore('tab-1', 'proj-1');
    const state = store.getState();

    // Initial state assertions
    expect(state.mode).toBe('view');
    expect(state.isMutating).toBe(false);
    expect(state.usesSubsystemVariant).toBe(false);
    expect(state.kvSelectionsById).toEqual({});
    expect(state.excludedLinks).toEqual([]);
    expect(state.pairLinksById).toEqual({});
    expect(state.subgraphProvenanceById).toEqual({});

    // Method assertions
    expect(typeof state.beginMutation).toBe('function');
    expect(typeof state.endMutation).toBe('function');
    expect(typeof state.enterEditMode).toBe('function');
    expect(typeof state.exitEditMode).toBe('function');
    expect(typeof state.resetSessionLocalMaps).toBe('function');
  });
});
