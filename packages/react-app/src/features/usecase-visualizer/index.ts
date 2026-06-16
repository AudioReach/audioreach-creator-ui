/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// UsecaseVisualizer feature - public API
export {UsecaseVisualizer} from './ui/usecase-visualizer';
export type {UsecaseVisualizerProps} from './ui/usecase-visualizer';

export {calculateModuleHeight, NODE_DIMENSIONS} from './lib/node-dimensions';

export {
  EDGE_KIND,
  MODULE_SHAPE,
  NODE_KIND,
  PORT_IO_TYPE,
  PORT_STATUS,
  VISUALIZER_MODE,
} from './model/visualizer.types';
export type {
  // Discriminant types
  EdgeKind,
  ModuleShape,
  NodeKind,
  PortIoType,
  PortStatus,
  VisualizerMode,
  // Port type
  Port,
  // Node types
  AnyNode,
  ContainerNode,
  ModuleNode,
  NodeBase,
  SubgraphNode,
  SubgraphProxyNode,
  SubsystemNode,
  // Edge types
  AnyEdge,
  ControlLink,
  DataLink,
  ProxyControlLink,
  ProxyDataLink,
  // Graph model
  LevelView,
  // Context menu
  ContextMenuItem,
  ContextMenuTarget,
  // Event payloads
  EdgeConnectPayload,
  NodeDragEndPayload,
  NodeDropPayload,
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
