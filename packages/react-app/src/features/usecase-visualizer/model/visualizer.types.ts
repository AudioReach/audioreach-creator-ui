/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Domain types for the UsecaseVisualizer feature.
 * These replace the legacy GraphView/GraphSpec types as part of the revamp.
 * See: docs/design/usecase-visualizer/usecase-visualizer-design.md
 */

import type {ReactNode} from 'react';

// ── Kind / shape constants ────────────────────────────────────────────────────

export const NODE_KIND = {
  CONTAINER: 'container',
  MODULE: 'module',
  SUBGRAPH: 'subgraph',
  SUBGRAPH_PROXY: 'subgraph-proxy',
  SUBSYSTEM: 'subsystem',
} as const;
export type NodeKind = (typeof NODE_KIND)[keyof typeof NODE_KIND];

export const EDGE_KIND = {
  CONTROL: 'control',
  DATA: 'data',
  PROXY_CONTROL: 'proxy-control',
  PROXY_DATA: 'proxy-data',
} as const;
export type EdgeKind = (typeof EDGE_KIND)[keyof typeof EDGE_KIND];

export const PORT_IO_TYPE = {
  CONTROL: 'control',
  INPUT: 'input',
  OUTPUT: 'output',
} as const;
export type PortIoType = (typeof PORT_IO_TYPE)[keyof typeof PORT_IO_TYPE];

export const PORT_STATUS = {
  PARTIAL: 'partial',
  UNUSED: 'unused',
  USED: 'used',
} as const;
export type PortStatus = (typeof PORT_STATUS)[keyof typeof PORT_STATUS];

export const MODULE_SHAPE = {
  CIRCLE: 'circle',
  RECT: 'rect',
  TRAPEZOID_SINK: 'trapezoid-sink',
  TRAPEZOID_SOURCE: 'trapezoid-source',
  TRIANGLE: 'triangle',
} as const;
export type ModuleShape = (typeof MODULE_SHAPE)[keyof typeof MODULE_SHAPE];

export const VISUALIZER_MODE = {
  EDIT: 'edit',
  READONLY: 'readonly',
} as const;
export type VisualizerMode =
  (typeof VISUALIZER_MODE)[keyof typeof VISUALIZER_MODE];

// ── Shared base ───────────────────────────────────────────────────────────────

export interface NodeBase {
  /**
   * Consumer-declared via ELK. Visualizer manages both height and width
   * dynamically during drag; final values reported in onNodeDragEnd.
   */
  height: number;
  /**
   * Consumer-generated ReactFlow handle. Format is adapter-specific.
   * Passed back unchanged in all event callbacks. Domain IDs (moduleId,
   * subgraphId, etc.) on child interfaces are used for default header/footer
   * labels.
   */
  id: string;
  label: string;
  /** Excluded from Delete key and edit affordances. Still draggable. */
  locked?: boolean;
  meta?: Record<string, unknown>;
  parentId?: string;
  width: number;
  x: number;
  y: number;
}

// ── Node kinds ────────────────────────────────────────────────────────────────

export interface SubsystemNode extends NodeBase {
  nodeKind: 'subsystem';
  ports: Port[];
  subsystemId: string;
}

export interface SubgraphNode extends NodeBase {
  nodeKind: 'subgraph';
  subgraphId: number;
}

export interface ContainerNode extends NodeBase {
  containerId: number;
  logicalContainerId?: string;
  nodeKind: 'container';
}

export interface ModuleNode extends NodeBase {
  alias?: string;
  icon?: string;
  moduleId: number;
  moduleType: string;
  nodeKind: 'module';
  ports: Port[];
  shape?: ModuleShape;
}

// ── Port type ─────────────────────────────────────────────────────────────────

/**
 * Unified port type for all node kinds. portIoType distinguishes direction:
 * 'input' / 'output' for data ports (placed left / right), 'control' for
 * control ports (placed top). Separate rendering arrays on each node interface
 * (ports) filter by portIoType for handle placement.
 */
export interface Port {
  id: string;
  /** Prevents new connections and hides context menu for this port. */
  locked?: boolean;
  /** Max edges connectable to this port. Absent means unlimited. */
  maxConnections?: number;
  name?: string;
  portIoType: PortIoType;
  /** Consumer-settable. Absent means no status indicator is shown. */
  portStatus?: PortStatus;
}

// ── Subgraph proxy (collapsed subgraph placeholder) ──────────────────────────

export interface SubgraphProxyNode extends NodeBase {
  nodeKind: 'subgraph-proxy';
  ports: Port[];
  subgraphId: number;
}

export type AnyNode =
  | ContainerNode
  | ModuleNode
  | SubgraphNode
  | SubgraphProxyNode
  | SubsystemNode;

export type AnyEdge = ControlLink | DataLink | ProxyControlLink | ProxyDataLink;

// ── Edge types ────────────────────────────────────────────────────────────────

export interface EdgeBase {
  id: string;
  label?: string;
  /** Excluded from Delete key and context menu. */
  locked?: boolean;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface DataLink extends EdgeBase {
  edgeKind: 'data';
}

export interface ControlLink extends EdgeBase {
  edgeKind: 'control';
}

export interface ProxyDataLink extends EdgeBase {
  edgeKind: 'proxy-data';
}

export interface ProxyControlLink extends EdgeBase {
  edgeKind: 'proxy-control';
}

// ── LevelView — canonical Visualizer input ────────────────────────────────────

export interface LevelView {
  containers?: ContainerNode[];
  controlLinks?: ControlLink[];
  dataLinks?: DataLink[];
  levelId: string;
  modules?: ModuleNode[];
  proxyControlLinks?: ProxyControlLink[];
  proxyDataLinks?: ProxyDataLink[];
  subgraphProxies?: SubgraphProxyNode[];
  subgraphs?: SubgraphNode[];
  subsystems?: SubsystemNode[];
}

// ── Context menu ──────────────────────────────────────────────────────────────

export type ContextMenuTarget =
  | {kind: 'module'; node: ModuleNode}
  | {kind: 'subgraph'; node: SubgraphNode}
  | {kind: 'subgraph-proxy'; node: SubgraphProxyNode}
  | {kind: 'container'; node: ContainerNode}
  | {kind: 'subsystem'; node: SubsystemNode}
  | {kind: 'port'; nodeId: string; port: Port}
  | {edge: DataLink; kind: 'data-link'}
  | {edge: ControlLink; kind: 'control-link'}
  | {edge: ProxyDataLink; kind: 'proxy-data-link'}
  | {edge: ProxyControlLink; kind: 'proxy-control-link'};

export interface ContextMenuItem {
  children?: ContextMenuItem[];
  disabled?: boolean;
  dividerBefore?: boolean;
  icon?: string;
  id: string;
  label: string;
  tooltip?: string;
}

// ── Event payloads ────────────────────────────────────────────────────────────

export interface SelectionChangePayload {
  delta: {
    addedEdgeIds: string[];
    addedNodeIds: string[];
    removedEdgeIds: string[];
    removedNodeIds: string[];
  };
  selectedEdgeIds: string[];
  selectedNodeIds: string[];
}

export interface NodeDragEndPayload {
  nodeId: string;
  position: XY;
  /** Parent nodes whose dimensions changed during the drag, keyed by nodeId. */
  resizedParents?: Record<string, {height: number; width: number}>;
}

export interface NodeDropPayload {
  /** Raw string from dataTransfer — consumer parses. */
  dropData: string;
  position: XY;
  targetContainerId?: string;
  targetSubgraphId?: string;
}

export interface EdgeConnectPayload {
  edgeKind: EdgeKind;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

// ── Viewport ──────────────────────────────────────────────────────────────────

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface XY {
  x: number;
  y: number;
}

// ── Search highlights ─────────────────────────────────────────────────────────

export interface SearchHighlights {
  activeId?: string;
  highlightedIds: string[];
}

// ── Rendering config ──────────────────────────────────────────────────────────

export interface NodeDisplayConfig {
  /** default: true */
  showContainerId?: boolean;
  /** default: true */
  showModuleInstanceId?: boolean;
  /** default: true */
  showSubgraphId?: boolean;
}

export interface CoreOverride {
  content: ReactNode;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export interface NodeContentOverride {
  /** Positioned content inside the node shape (e.g. enable/disable checkbox). */
  coreOverrides?: CoreOverride[];
  footer?: ReactNode;
  /** Content between the default ID label and the collapse/expand toggle. */
  header?: ReactNode;
}

export interface VisualizerRenderingConfig {
  nodeDisplayConfig?: NodeDisplayConfig;
  renderNodeContent?: (node: AnyNode) => NodeContentOverride | null;
}

// ── Context menu config ───────────────────────────────────────────────────────

export interface VisualizerContextMenuConfig {
  getItems: (target: ContextMenuTarget) => ContextMenuItem[];
  onAction: (actionId: string, target: ContextMenuTarget) => void;
}

// ── Event handlers ────────────────────────────────────────────────────────────

export interface VisualizerEventHandlers {
  // group: readonly
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeDragEnd?: (payload: NodeDragEndPayload) => void;
  onSelectionChange?: (payload: SelectionChangePayload) => void;
  onSubgraphCollapse?: (subgraphId: string) => void;
  onSubgraphExpand?: (subgraphId: string) => void;
  onViewportChange?: (viewport: ViewportState) => void;
  // group: authoring — only active when mode === VISUALIZER_MODE.EDIT
  onEdgeConnected?: (payload: EdgeConnectPayload) => void;
  onEdgesDeleted?: (payload: {edgeIds: string[]}) => void;
  onNodeDropped?: (payload: NodeDropPayload) => void;
  onNodesDeleted?: (payload: {nodeIds: string[]}) => void;
}

// ── Top-level component props ─────────────────────────────────────────────────

export interface UsecaseVisualizerProps {
  contextMenu?: VisualizerContextMenuConfig;
  eventHandlers?: VisualizerEventHandlers;
  graph: LevelView;
  /** Viewport to restore on mount instead of calling fitView. */
  initialViewport?: ViewportState;
  lodThreshold?: number;
  mode?: VisualizerMode;
  rendering?: VisualizerRenderingConfig;
  searchHighlights?: SearchHighlights;
}
