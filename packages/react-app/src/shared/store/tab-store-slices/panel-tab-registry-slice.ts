/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {PanelTab} from '~shared/store/panel-types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PanelTabRegistrySlice {
  panelTabRegistry: Record<string, PanelTab>;
  registerPanelTab: (tabId: string, panelTab: PanelTab) => void;
  unregisterPanelTab: (tabId: string) => void;
}

type SetState<T> = StoreApi<T>['setState'];

// ── Slice creator ──────────────────────────────────────────────────────────

export function createPanelTabRegistrySlice<S extends PanelTabRegistrySlice>(
  set: SetState<S>,
): PanelTabRegistrySlice {
  const setSlice = set as SetState<PanelTabRegistrySlice>;

  return {
    panelTabRegistry: {},

    registerPanelTab: (tabId, panelTab) => {
      setSlice((state) => ({
        panelTabRegistry: {...state.panelTabRegistry, [tabId]: panelTab},
      }));
    },

    unregisterPanelTab: (tabId) => {
      setSlice((state) => {
        if (!(tabId in state.panelTabRegistry)) {
          return state;
        }
        const {[tabId]: _, ...rest} = state.panelTabRegistry;
        return {panelTabRegistry: rest};
      });
    },
  };
}
