/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create, type StoreApi, type UseBoundStore} from 'zustand';

import type {AnyNode} from '~entities/graph';

import {
  type NodeContentOverride,
  type NodeDisplayConfig,
  type SearchHighlights,
  type SelectedEdgeRef,
  type SelectedNodeRef,
  type ViewportState,
  VISUALIZER_MODE,
  type VisualizerContextMenuConfig,
  type VisualizerEventHandlers,
  type VisualizerMode,
} from './visualizer.types';

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
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
}

export interface RenderingConfigSlice {
  lodThreshold: number;
  nodeDisplayConfig: NodeDisplayConfig | undefined;
  renderNodeContent:
    | ((node: AnyNode) => NodeContentOverride | null)
    | undefined;
}

const DEFAULT_LOD_THRESHOLD = 0.4;

const EMPTY_SELECTION: SelectionState = {
  selectedEdges: [],
  selectedNodes: [],
};

const EMPTY_HOVER: HoverState = {
  hoveredLogicalContainerId: null,
  hoveredNodeId: null,
};

export interface VisualizerInternalStore {
  clearHoverStateIfNode: (nodeId: string) => void;
  clearSelection: () => void;
  containsMatchNodeIds: string[];
  contextMenu: VisualizerContextMenuConfig | undefined;
  eventHandlers: VisualizerEventHandlers | undefined;
  hoverState: HoverState;
  lodThreshold: number;
  lodZoom: number;
  mode: VisualizerMode;
  nodeDisplayConfig: NodeDisplayConfig | undefined;
  renderNodeContent:
    | ((node: AnyNode) => NodeContentOverride | null)
    | undefined;
  searchHighlightById: Record<string, SearchHighlightState>;
  selection: SelectionState;
  setContextMenu: (config: VisualizerContextMenuConfig | undefined) => void;
  setEventHandlers: (handlers: VisualizerEventHandlers | undefined) => void;
  setHoverState: (
    nodeId: string | null,
    logicalContainerId: string | null,
  ) => void;
  setLodZoom: (zoom: number) => void;
  setMode: (mode: VisualizerMode) => void;
  setRenderingConfig: (config: Partial<RenderingConfigSlice>) => void;
  setSelection: (
    selectedNodes: SelectedNodeRef[],
    selectedEdges: SelectedEdgeRef[],
  ) => void;
  setViewportCache: (levelId: string, viewport: ViewportState) => void;
  syncSearchHighlights: (highlights: SearchHighlights | undefined) => void;
  viewportCache: Record<string, ViewportState>;
}

export type CreatedVisualizerStore = UseBoundStore<
  StoreApi<VisualizerInternalStore>
>;

export function createVisualizerStore(): CreatedVisualizerStore {
  return create<VisualizerInternalStore>((set) => ({
    clearHoverStateIfNode: (nodeId) => {
      set((state) =>
        state.hoverState.hoveredNodeId === nodeId
          ? {hoverState: EMPTY_HOVER}
          : state,
      );
    },
    clearSelection: () => {
      set({selection: EMPTY_SELECTION});
    },
    containsMatchNodeIds: [],
    contextMenu: undefined,
    eventHandlers: undefined,
    hoverState: EMPTY_HOVER,
    lodThreshold: DEFAULT_LOD_THRESHOLD,
    lodZoom: 1,
    mode: VISUALIZER_MODE.READONLY,
    nodeDisplayConfig: undefined,
    renderNodeContent: undefined,
    searchHighlightById: {},
    selection: EMPTY_SELECTION,
    setContextMenu: (config) => {
      set({contextMenu: config});
    },
    setEventHandlers: (handlers) => {
      set({eventHandlers: handlers});
    },
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
    setMode: (mode) => {
      set({mode});
    },
    setRenderingConfig: (config) => {
      set((state) => ({
        // lodThreshold is required (number); ?? keeps the stored value
        // when callers omit the field or pass undefined. The optional
        // fields below use 'in' so callers can explicitly clear them.
        lodThreshold: config.lodThreshold ?? state.lodThreshold,
        nodeDisplayConfig:
          'nodeDisplayConfig' in config
            ? config.nodeDisplayConfig
            : state.nodeDisplayConfig,
        renderNodeContent:
          'renderNodeContent' in config
            ? config.renderNodeContent
            : state.renderNodeContent,
      }));
    },
    setSelection: (selectedNodes, selectedEdges) => {
      set({selection: {selectedEdges, selectedNodes}});
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
