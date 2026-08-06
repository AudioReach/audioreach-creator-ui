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
  withMutationLock,
} from '~features/graph-designer/model/edit-session-slice';

function makeStore(projectId = 'proj-wml-1') {
  return createStore<EditSessionSlice>((set) =>
    createEditSessionSlice(set, projectId),
  );
}

describe('withMutationLock', () => {
  beforeEach(() => {
    mockReleaseExclusiveMode.mockClear();
    mockSetActiveExclusiveMode.mockClear();
  });

  it('throws and never invokes the action when mode is not edit', async () => {
    const store = makeStore();
    const action = jest.fn().mockResolvedValue('unused');

    await expect(withMutationLock(store.getState, action)).rejects.toThrow(
      'withMutationLock called outside Edit mode',
    );

    expect(action).not.toHaveBeenCalled();
    expect(store.getState().isMutating).toBe(false);
  });

  it('runs the action under the mutation lock when mode is edit', async () => {
    const store = makeStore();
    store.getState().enterEditMode();
    let isMutatingDuringAction = false;

    const result = await withMutationLock(store.getState, async () => {
      isMutatingDuringAction = store.getState().isMutating;
      return 'done';
    });

    expect(result).toBe('done');
    expect(isMutatingDuringAction).toBe(true);
    expect(store.getState().isMutating).toBe(false);
  });

  it('still calls endMutation (finally guarantee) when the action throws', async () => {
    const store = makeStore();
    store.getState().enterEditMode();

    await expect(
      withMutationLock(store.getState, async () => {
        throw new Error('backend call failed');
      }),
    ).rejects.toThrow('backend call failed');

    expect(store.getState().isMutating).toBe(false);
  });
});
