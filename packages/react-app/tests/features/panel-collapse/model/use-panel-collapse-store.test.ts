/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('flexlayout-react', () => ({
  Actions: {
    addNode: jest.fn(),
    deleteTab: jest.fn(),
    updateNodeAttributes: jest.fn(),
  },
  DockLocation: {BOTTOM: 'bottom', LEFT: 'left', RIGHT: 'right'},
}));

import {
  DEFAULT_PANEL_STATE,
  usePanelCollapseStore,
} from '~features/panel-collapse';

describe('usePanelCollapseStore — togglePanel', () => {
  beforeEach(() => {
    usePanelCollapseStore.setState({
      panelStates: {},
      savedWeights: {},
    });
  });

  // Clicking toggle on a visible panel should hide it
  it('collapses a visible panel — left goes from true to false', () => {
    usePanelCollapseStore.getState().togglePanel('left', 'project-1');

    const state = usePanelCollapseStore.getState().panelStates['project-1'];

    expect(state.left).toBe(false);
    expect(state.right).toBe(DEFAULT_PANEL_STATE.right);
    expect(state.bottom).toBe(DEFAULT_PANEL_STATE.bottom);
  });

  // Clicking toggle twice should restore the panel to visible
  it('expands a collapsed panel — second toggle restores left to true', () => {
    usePanelCollapseStore.getState().togglePanel('left', 'project-1');
    usePanelCollapseStore.getState().togglePanel('left', 'project-1');

    const state = usePanelCollapseStore.getState().panelStates['project-1'];

    expect(state.left).toBe(true);
  });

  // Odd number of toggles should end in collapsed state
  it('tracks state correctly after multiple toggles — 3 toggles ends collapsed', () => {
    usePanelCollapseStore.getState().togglePanel('left', 'project-1');
    usePanelCollapseStore.getState().togglePanel('left', 'project-1');
    usePanelCollapseStore.getState().togglePanel('left', 'project-1');

    const state = usePanelCollapseStore.getState().panelStates['project-1'];

    expect(state.left).toBe(false);
  });

  // Collapsing bottom should leave left and right unchanged
  it('toggling one panel does not affect other panels', () => {
    usePanelCollapseStore.getState().togglePanel('bottom', 'project-1');

    const state = usePanelCollapseStore.getState().panelStates['project-1'];

    expect(state.bottom).toBe(false);
    expect(state.left).toBe(DEFAULT_PANEL_STATE.left);
    expect(state.right).toBe(DEFAULT_PANEL_STATE.right);
  });

  // Each project has its own independent panel state
  it('toggling one project does not affect another project', () => {
    usePanelCollapseStore.getState().togglePanel('left', 'project-A');

    const stateA = usePanelCollapseStore.getState().panelStates['project-A'];
    const stateB = usePanelCollapseStore.getState().panelStates['project-B'];

    expect(stateA.left).toBe(false);
    // project-B has no entry yet — should be undefined (not affected)
    expect(stateB).toBeUndefined();
  });
});
