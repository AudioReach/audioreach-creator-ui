/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PanelLayoutSlice {
  panelLayoutJson: string | null;
  savePanelLayout: (json: string) => void;
}

type SetState<T> = StoreApi<T>['setState'];

// ── Slice creator ──────────────────────────────────────────────────────────

export function createPanelLayoutSlice<S extends PanelLayoutSlice>(
  set: SetState<S>,
): PanelLayoutSlice {
  const setSlice = set as SetState<PanelLayoutSlice>;

  return {
    panelLayoutJson: null,

    savePanelLayout: (json: string): void => {
      setSlice({panelLayoutJson: json});
    },
  };
}
