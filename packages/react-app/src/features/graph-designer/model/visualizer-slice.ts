/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Viewport} from '@xyflow/react';
import type {StoreApi} from 'zustand';

import type {LevelView} from '~entities/graph';
import type {
  SelectedEdgeRef,
  SelectedNodeRef,
} from '~features/usecase-visualizer';
import {logger} from '~shared/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphView {
  expandedSubgraphIds: string[];
  subsystemNavigationStack: string[];
}

export interface SearchHighlight {
  activeNodeId: string | null;
  matchNodeIds: string[];
}

export interface NodeFocusRequest {
  nodeId: string;
  requestId: number;
}

export interface VisualizerSlice {
  clearLevelView: () => void;
  clearNodeFocusRequest: (requestId: number) => void;
  clearSearchHighlight: () => void;
  clearSelection: () => void;
  effectiveLevelView: LevelView | null;
  error: string | null;
  focusNodeRequest: NodeFocusRequest | null;
  graphView: GraphView | null;
  isLoading: boolean;
  levelView: LevelView | null;
  requestNodeFocus: (nodeId: string) => void;
  searchHighlight: SearchHighlight | null;
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
  setEffectiveLevelView: (lv: LevelView) => void;
  setGraphView: (graphView: GraphView | null) => void;
  setLevelView: (lv: LevelView) => void;
  setSearchHighlight: (
    matchNodeIds: string[],
    activeNodeId: string | null,
  ) => void;
  setSelection: (nodes: SelectedNodeRef[], edges: SelectedEdgeRef[]) => void;
  setViewport: (viewport: Viewport) => void;
  viewport: Viewport;
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const DEFAULT_VIEWPORT: Viewport = {x: 0, y: 0, zoom: 1};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the visualizer slice for composing into a tab store.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @returns The initial state and actions for the visualizer slice.
 */
export function createVisualizerSlice<S extends VisualizerSlice>(
  set: StoreApi<S>['setState'],
): VisualizerSlice {
  return {
    clearLevelView: () => {
      logger.debug('visualizerSlice: clearLevelView');
      set({effectiveLevelView: null, levelView: null} as Partial<S>);
    },

    clearNodeFocusRequest: (requestId: number) => {
      set((state) => {
        if (state.focusNodeRequest?.requestId !== requestId) {
          return {};
        }
        return {focusNodeRequest: null} as Partial<S>;
      });
    },

    clearSearchHighlight: () => {
      logger.debug('visualizerSlice: clearSearchHighlight');
      set({searchHighlight: null} as Partial<S>);
    },

    clearSelection: () => {
      logger.debug('visualizerSlice: clearSelection');
      set({
        selectedEdges: [] as SelectedEdgeRef[],
        selectedNodes: [] as SelectedNodeRef[],
      } as Partial<S>);
    },

    effectiveLevelView: null,

    error: null,

    focusNodeRequest: null,

    graphView: null,

    isLoading: false,

    levelView: null,

    requestNodeFocus: (nodeId: string) => {
      logger.debug('visualizerSlice: requestNodeFocus', {
        action: 'requestNodeFocus',
        component: 'visualizerSlice',
      });
      set(
        (state) =>
          ({
            focusNodeRequest: {
              nodeId,
              requestId: (state.focusNodeRequest?.requestId ?? 0) + 1,
            },
          }) as Partial<S>,
      );
    },

    searchHighlight: null,

    selectedEdges: [],

    selectedNodes: [],

    setEffectiveLevelView: (lv: LevelView) => {
      logger.debug('visualizerSlice: setEffectiveLevelView', {
        action: 'setEffectiveLevelView',
        component: 'visualizerSlice',
      });
      set({effectiveLevelView: lv} as Partial<S>);
    },

    setGraphView: (graphView: GraphView | null) => {
      logger.debug('visualizerSlice: setGraphView', {
        action: 'setGraphView',
        component: 'visualizerSlice',
      });
      set({graphView} as Partial<S>);
    },

    setLevelView: (lv: LevelView) => {
      logger.debug('visualizerSlice: setLevelView', {
        action: 'setLevelView',
        component: 'visualizerSlice',
      });
      set({levelView: lv} as Partial<S>);
    },

    setSearchHighlight: (
      matchNodeIds: string[],
      activeNodeId: string | null,
    ) => {
      logger.debug('visualizerSlice: setSearchHighlight', {
        action: 'setSearchHighlight',
        component: 'visualizerSlice',
      });
      set({
        searchHighlight: {
          activeNodeId,
          matchNodeIds,
        },
      } as Partial<S>);
    },

    setSelection: (nodes, edges) => {
      logger.debug('visualizerSlice: setSelection', {
        action: 'setSelection',
        component: 'visualizerSlice',
      });
      set({
        selectedEdges: edges,
        selectedNodes: nodes,
      } as Partial<S>);
    },

    setViewport: (viewport: Viewport) => {
      logger.debug('visualizerSlice: setViewport', {
        action: 'setViewport',
        component: 'visualizerSlice',
      });
      set({viewport} as Partial<S>);
    },

    viewport: DEFAULT_VIEWPORT,
  };
}
