/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertiesViewSlice {
  closePropertiesPanel: () => void;
  isPropertiesPanelOpen: boolean;
  openPropertiesPanel: () => void;
}

type SetState<T> = StoreApi<T>['setState'];

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/** Only used in GraphDesignerStore (not DiffMergeStore). */
export function createPropertiesViewSlice<S extends PropertiesViewSlice>(
  set: SetState<S>,
): PropertiesViewSlice {
  const setSlice = set as SetState<PropertiesViewSlice>;

  return {
    closePropertiesPanel: () => {
      logger.debug('propertiesViewSlice: closePropertiesPanel', {
        action: 'close_properties_panel',
        component: 'propertiesViewSlice',
      });
      setSlice({isPropertiesPanelOpen: false});
    },

    isPropertiesPanelOpen: false,

    openPropertiesPanel: () => {
      logger.debug('propertiesViewSlice: openPropertiesPanel', {
        action: 'open_properties_panel',
        component: 'propertiesViewSlice',
      });
      setSlice({isPropertiesPanelOpen: true});
    },
  };
}
