/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import type {PanelCollapseStore, PanelState} from './panel-collapse.types';

// All panels visible by default when a project is first opened
export const DEFAULT_PANEL_STATE: PanelState = Object.freeze({
  bottom: true,
  left: true,
  right: true,
});

export const usePanelCollapseStore = create<PanelCollapseStore>((set, get) => ({
  panelStates: {},
  savedWeights: {},

  togglePanel: (panel, projectId) => {
    const {panelStates} = get();
    const current = panelStates[projectId] ?? DEFAULT_PANEL_STATE;
    set({
      panelStates: {
        ...panelStates,
        [projectId]: {...current, [panel]: !current[panel]},
      },
    });
  },
}));
