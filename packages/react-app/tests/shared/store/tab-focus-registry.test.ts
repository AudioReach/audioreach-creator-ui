/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {TabFocusRegistry} from '~shared/store/tab-focus-registry';
import {VALIDATION_RESULTS_TAB_NODE_ID} from '~shared/store/tab-node-ids';

describe('TabFocusRegistry', () => {
  it('calls the registered handler focusTab with the given nodeId', () => {
    const registry = new TabFocusRegistry();
    const mockFocusTab = jest.fn();
    registry.register({focusTab: mockFocusTab});

    registry.focusTab('some-node-id');

    expect(mockFocusTab).toHaveBeenCalledWith('some-node-id');
  });

  it('is a safe no-op when no handler is registered', () => {
    const registry = new TabFocusRegistry();

    expect(() => registry.focusTab('some-node-id')).not.toThrow();
  });
});

describe('VALIDATION_RESULTS_TAB_NODE_ID', () => {
  it('is exported and equals "validation-results"', () => {
    expect(VALIDATION_RESULTS_TAB_NODE_ID).toBe('validation-results');
  });
});
