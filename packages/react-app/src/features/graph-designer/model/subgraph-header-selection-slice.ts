/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {ModuleDataSlice} from './module-data-slice';

export interface SubgraphHeaderSelection {
  keyValues: Record<string, string>;
  subgraphId: string;
}

export interface SubgraphHeaderSelectionSlice {
  headerSelectionsBySubgraphId: Record<string, SubgraphHeaderSelection>;
  initializeHeaderSelection: (
    subgraphId: string,
    defaults: Record<string, string>,
  ) => void;
  setHeaderKeyValue: (
    subgraphId: string,
    keySystemId: string,
    valueSystemId: string,
  ) => void;
}

/**
 * Creates the subgraph-header-selection slice for composing into the
 * GraphDesignerStore.
 *
 * @remarks The store type `S` must also compose `ModuleDataSlice` —
 * `initializeHeaderSelection` and `setHeaderKeyValue` both call
 * `syncEnableOverlays` to keep canvas enable-switch overlays in sync with the
 * newly-resolved header selection.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 */
export function createSubgraphHeaderSelectionSlice<
  S extends SubgraphHeaderSelectionSlice &
    Pick<ModuleDataSlice, 'syncEnableOverlays'>,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
): SubgraphHeaderSelectionSlice {
  return {
    headerSelectionsBySubgraphId: {},

    initializeHeaderSelection: (
      subgraphId: string,
      defaults: Record<string, string>,
    ): void => {
      if (get().headerSelectionsBySubgraphId[subgraphId]) {
        return;
      }
      logger.debug('subgraphHeaderSelectionSlice: initializeHeaderSelection', {
        action: 'initializeHeaderSelection',
        component: 'subgraphHeaderSelectionSlice',
      });
      set({
        headerSelectionsBySubgraphId: {
          ...get().headerSelectionsBySubgraphId,
          [subgraphId]: {keyValues: defaults, subgraphId},
        },
      } as Partial<S>);
      get().syncEnableOverlays(subgraphId);
    },

    setHeaderKeyValue: (
      subgraphId: string,
      keySystemId: string,
      valueSystemId: string,
    ): void => {
      logger.debug('subgraphHeaderSelectionSlice: setHeaderKeyValue', {
        action: 'setHeaderKeyValue',
        component: 'subgraphHeaderSelectionSlice',
      });
      const existing = get().headerSelectionsBySubgraphId[subgraphId];
      set({
        headerSelectionsBySubgraphId: {
          ...get().headerSelectionsBySubgraphId,
          [subgraphId]: {
            keyValues: {...existing?.keyValues, [keySystemId]: valueSystemId},
            subgraphId,
          },
        },
      } as Partial<S>);
      get().syncEnableOverlays(subgraphId);
    },
  };
}
