/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Edge, Node, Viewport} from '@xyflow/react';
import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphView {
  expandedSubgraphIds: Set<string>;
  subsystemNavigationStack: string[];
}

/** Re-export for consumers that compose this slice. */
export type RFNode = Node;
export type RFEdge = Edge;

export interface VisualizerSlice {
  clearSelection: () => void;
  error: string | null;
  graphView: GraphView | null;
  isLoading: boolean;
  selectedEdges: RFEdge[];
  selectedNodes: RFNode[];
  setGraphView: (graphView: GraphView | null) => void;
  setSelection: (nodes: RFNode[], edges: RFEdge[]) => void;
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
    clearSelection: () => {
      logger.debug('visualizerSlice: clearSelection');
      set({
        selectedEdges: [] as RFEdge[],
        selectedNodes: [] as RFNode[],
      } as Partial<S>);
    },

    error: null,

    graphView: null,

    isLoading: false,

    selectedEdges: [],

    selectedNodes: [],

    setGraphView: (graphView: GraphView | null) => {
      logger.debug('visualizerSlice: setGraphView', {
        action: 'setGraphView',
        component: 'visualizerSlice',
      });
      set({graphView} as Partial<S>);
    },

    setSelection: (nodes: RFNode[], edges: RFEdge[]) => {
      logger.debug('visualizerSlice: setSelection', {
        action: 'setSelection',
        component: 'visualizerSlice',
      });
      set({selectedEdges: edges, selectedNodes: nodes} as Partial<S>);
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
