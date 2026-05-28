/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create, type StoreApi, type UseBoundStore} from 'zustand';

import type {SearchHighlights, ViewportState} from './visualizer.types';

/**
 * Per-mount Zustand store powering the Visualizer's internal state slices:
 * selection, hover, viewport cache, LOD zoom, and search highlight mirrors.
 *
 * The `createVisualizerStore` factory is invoked once per <UsecaseVisualizer>
 * mount so multiple Visualizers on the same page have fully isolated state.
 *
 * Both this factory and the SearchHighlightState type are internal to the
 * feature and intentionally not re-exported from the public index.
 */

type SearchHighlightState = 'active' | 'match' | 'none';

interface HoverState {
  hoveredLogicalContainerId: string | null;
  hoveredNodeId: string | null;
}

interface SelectionState {
  selectedEdgeIds: string[];
  selectedNodeIds: string[];
}

const EMPTY_SELECTION: SelectionState = {
  selectedEdgeIds: [],
  selectedNodeIds: [],
};

const EMPTY_HOVER: HoverState = {
  hoveredLogicalContainerId: null,
  hoveredNodeId: null,
};

export interface VisualizerInternalStore {
  clearSelection: () => void;
  containsMatchNodeIds: string[];
  hoverState: HoverState;
  lodZoom: number;
  previousSelection: SelectionState;
  searchHighlightById: Record<string, SearchHighlightState>;
  selection: SelectionState;
  setHoverState: (
    nodeId: string | null,
    logicalContainerId: string | null,
  ) => void;
  setLodZoom: (zoom: number) => void;
  setSelection: (selectedNodeIds: string[], selectedEdgeIds: string[]) => void;
  setViewportCache: (levelId: string, viewport: ViewportState) => void;
  syncSearchHighlights: (highlights: SearchHighlights | undefined) => void;
  viewportCache: Record<string, ViewportState>;
}

type CreatedVisualizerStore = UseBoundStore<StoreApi<VisualizerInternalStore>>;

export function createVisualizerStore(): CreatedVisualizerStore {
  return create<VisualizerInternalStore>((set) => ({
    clearSelection: () => {
      set((state) => ({
        previousSelection: state.selection,
        selection: EMPTY_SELECTION,
      }));
    },
    containsMatchNodeIds: [],
    hoverState: EMPTY_HOVER,
    lodZoom: 1,
    previousSelection: EMPTY_SELECTION,
    searchHighlightById: {},
    selection: EMPTY_SELECTION,
    setHoverState: (nodeId, logicalContainerId) => {
      set({
        hoverState: {
          hoveredLogicalContainerId: logicalContainerId,
          hoveredNodeId: nodeId,
        },
      });
    },
    setLodZoom: (zoom) => {
      set({lodZoom: zoom});
    },
    setSelection: (selectedNodeIds, selectedEdgeIds) => {
      set((state) => ({
        previousSelection: state.selection,
        selection: {selectedEdgeIds, selectedNodeIds},
      }));
    },
    setViewportCache: (levelId, viewport) => {
      set((state) => ({
        viewportCache: {...state.viewportCache, [levelId]: viewport},
      }));
    },
    syncSearchHighlights: (highlights) => {
      if (!highlights) {
        set({containsMatchNodeIds: [], searchHighlightById: {}});
        return;
      }
      const byId: Record<string, SearchHighlightState> = {};
      for (const id of highlights.highlightedIds) {
        byId[id] = 'match';
      }
      if (highlights.activeId) {
        byId[highlights.activeId] = 'active';
      }
      set({
        containsMatchNodeIds: highlights.containsMatchNodeIds ?? [],
        searchHighlightById: byId,
      });
    },
    viewportCache: {},
  }));
}
