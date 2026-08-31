/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// UsecaseVisualizer feature - public API
export {UsecaseVisualizer} from './ui/usecase-visualizer';
export type {UsecaseVisualizerProps} from './ui/usecase-visualizer';

export {calculateModuleHeight, NODE_DIMENSIONS} from './lib/node-dimensions';

export {VISUALIZER_MODE} from './model/visualizer.types';
export type {
  VisualizerMode,
  // Context menu
  ContextMenuItem,
  ContextMenuTarget,
  // Event payloads
  EdgeConnectPayload,
  NodeDragEndPayload,
  NodeDropPayload,
  SelectedEdgeRef,
  SelectedNodeRef,
  SelectionChangePayload,
  // Viewport / search
  SearchHighlights,
  ViewportState,
  XY,
  // Rendering config
  CoreOverride,
  NodeContentOverride,
  NodeDisplayConfig,
  VisualizerContextMenuConfig,
  VisualizerEventHandlers,
  VisualizerRenderingConfig,
} from './model/visualizer.types';
