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

import type {LucideIcon} from 'lucide-react';

import type {
  AnyNode,
  ContainerNode,
  ControlLink,
  DataLink,
  EdgeKind,
  LevelView,
  ModuleNode,
  NodeKind,
  Port,
  ProxyControlLink,
  ProxyDataLink,
  SubgraphNode,
  SubgraphProxyNode,
  SubsystemNode,
} from '~entities/graph';

export const VISUALIZER_MODE = {
  EDIT: 'edit',
  READONLY: 'readonly',
} as const;
export type VisualizerMode =
  (typeof VISUALIZER_MODE)[keyof typeof VISUALIZER_MODE];

// ── Context menu ──────────────────────────────────────────────────────────────

export type ContextMenuTarget =
  | {kind: 'module'; node: ModuleNode}
  | {kind: 'subgraph'; node: SubgraphNode}
  | {kind: 'subgraph-proxy'; node: SubgraphProxyNode}
  | {kind: 'container'; node: ContainerNode}
  | {kind: 'subsystem'; node: SubsystemNode}
  | {connectionInProgress: boolean; kind: 'port'; nodeId: string; port: Port}
  | {edge: DataLink; kind: 'data-link'}
  | {edge: ControlLink; kind: 'control-link'}
  | {edge: ProxyDataLink; kind: 'proxy-data-link'}
  | {edge: ProxyControlLink; kind: 'proxy-control-link'};

export interface ContextMenuItem {
  children?: ContextMenuItem[];
  disabled?: boolean;
  dividerBefore?: boolean;
  icon?: LucideIcon;
  id: string;
  label: string;
  tooltip?: string;
}

// ── Event payloads ────────────────────────────────────────────────────────────

export interface SelectionChangePayload {
  delta: {
    addedEdges: SelectedEdgeRef[];
    addedNodes: SelectedNodeRef[];
    removedEdges: SelectedEdgeRef[];
    removedNodes: SelectedNodeRef[];
  };
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
}

export interface SelectedNodeRef {
  id: string;
  nodeKind: NodeKind;
  systemId: string;
}

interface SelectedBackendEdgeRef {
  edgeKind: Extract<EdgeKind, 'control' | 'data'>;
  id: string;
  systemId: string;
}

interface SelectedProxyEdgeRef {
  edgeKind: Extract<EdgeKind, 'proxy-control' | 'proxy-data'>;
  id: string;
  systemId?: string;
}

export type SelectedEdgeRef = SelectedBackendEdgeRef | SelectedProxyEdgeRef;

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

export interface NodeFocusRequest {
  nodeId: string;
  requestId: number;
}

export interface XY {
  x: number;
  y: number;
}

// ── Search highlights ─────────────────────────────────────────────────────────

export interface SearchHighlights {
  activeId?: string;
  /**
   * Currently-rendered node ids whose subtree (at deeper levels or behind a
   * collapsed proxy) contains a match. Typically SubsystemNode ids
   * (drill-in affordance) or SubgraphProxyNode ids (expand affordance).
   * Consumer-supplied — the Visualizer only sees the current LevelView and
   * cannot compute this. Visualizer applies a contains-match CSS class to
   * each node in this list, regardless of node kind.
   */
  containsMatchNodeIds?: string[];
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
  onNodeDoubleClick?: (
    nodeId: string,
    nodeKind: NodeKind,
    label: string,
  ) => void;
  onNodeDragEnd?: (payload: NodeDragEndPayload) => void;
  onSelectionChange?: (payload: SelectionChangePayload) => void;
  onSubgraphCollapse?: (subgraphId: number) => void;
  onSubgraphExpand?: (subgraphId: number) => void;
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
  focusNodeRequest?: NodeFocusRequest | null;
  graph: LevelView;
  /** Viewport to restore on mount instead of calling fitView. */
  initialViewport?: ViewportState;
  lodThreshold?: number;
  mode?: VisualizerMode;
  onFocusNodeRequestHandled?: (requestId: number) => void;
  /**
   * Receives an imperative capture function once the canvas is mounted.
   * Consumer stores it and calls it on demand to capture a PNG data URL of
   * the current canvas. Resolves to null if capture fails or no nodes exist.
   */
  onScreenshotApiReady?: (capture: () => Promise<string | null>) => void;
  rendering?: VisualizerRenderingConfig;
  searchHighlights?: SearchHighlights;
}
