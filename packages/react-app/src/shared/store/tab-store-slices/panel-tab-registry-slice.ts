/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {PanelTab} from '~shared/store/panel-types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PanelTabRegistrySlice {
  panelTabRegistry: Map<string, PanelTab>;
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
    panelTabRegistry: new Map(),

    registerPanelTab: (tabId, panelTab) => {
      setSlice((state) => {
        const registry = new Map(state.panelTabRegistry);
        registry.set(tabId, panelTab);
        return {panelTabRegistry: registry};
      });
    },

    unregisterPanelTab: (tabId) => {
      setSlice((state) => {
        if (!state.panelTabRegistry.has(tabId)) {
          return state;
        }
        const registry = new Map(state.panelTabRegistry);
        registry.delete(tabId);
        return {panelTabRegistry: registry};
      });
    },
  };
}
