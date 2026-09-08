/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {SelectedEdgeRef, SelectedNodeRef} from '~shared/types';

import type {SearchHighlight} from './visualizer-slice';

export interface GraphNavigationSlice {
  /** Subsystem id whose scoped contents the canvas should show.
   *  null means show the normal full usecase view. */
  activeSubsystemId: string | null;
  clearActiveSubsystem: () => void;
  navigateToSubsystem: (subsystemId: string | null) => void;
  subsystemNavigationRequestId: number;
}

interface NavigationResetState {
  searchHighlight: SearchHighlight | null;
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
}

export function createGraphNavigationSlice<
  S extends GraphNavigationSlice & NavigationResetState,
>(set: StoreApi<S>['setState']): GraphNavigationSlice {
  return {
    activeSubsystemId: null,

    clearActiveSubsystem: () => {
      set({activeSubsystemId: null} as Partial<S>);
    },

    navigateToSubsystem: (subsystemId: string | null) => {
      set(
        (state) =>
          ({
            activeSubsystemId: subsystemId,
            searchHighlight: null,
            selectedEdges: [] as SelectedEdgeRef[],
            selectedNodes: [] as SelectedNodeRef[],
            subsystemNavigationRequestId:
              state.subsystemNavigationRequestId + 1,
          }) as Partial<S>,
      );
    },

    subsystemNavigationRequestId: 0,
  };
}
