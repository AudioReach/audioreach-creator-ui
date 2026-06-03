/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Shape of a single node in the FlexLayout JSON snapshot
export interface LayoutNodeJson {
  children?: LayoutNodeJson[];
  id?: string;
  type: string;
  weight?: number;
}

// Shape of the full layout JSON returned by model.toJson()
export interface LayoutJson {
  layout: LayoutNodeJson & {children: LayoutNodeJson[]};
}

/** Tracks whether each of the 3 UI panels is shown or hidden */
export interface PanelState {
  bottom: boolean;
  left: boolean;
  right: boolean;
}

/**
 * @property panelStates - keyed by `mainTab.id` (from `getActiveProjectGroup()?.mainTab.id`)
 * @property savedWeights - keyed by FlexLayout node id
 */
export interface PanelCollapseStore {
  panelStates: Record<string, PanelState>;
  savedWeights: Record<string, number>;
  togglePanel: (panel: keyof PanelState, projectId: string) => void;
}
