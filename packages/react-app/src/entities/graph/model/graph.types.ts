/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Pure graph model types — data-only, no React or UI dependencies.

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
  meta?: GraphElementMeta;
  parentId?: string;
  width: number;
  x: number;
  y: number;
}

export interface GraphElementMeta extends Record<string, unknown> {
  systemId: string;
}

export interface ContainerNodeMeta extends GraphElementMeta {
  containerSystemId: string;
  subgraphSystemId: string;
}

export interface SubgraphNodeMeta extends GraphElementMeta {
  subgraphSystemId: string;
}

export interface SubsystemNode extends NodeBase {
  nodeKind: 'subsystem';
  ports: Port[];
  subsystemId: string;
}

export interface SubgraphNode extends NodeBase {
  meta?: SubgraphNodeMeta;
  nodeKind: 'subgraph';
  subgraphId: number;
}

export interface ContainerNode extends NodeBase {
  containerId: number;
  logicalContainerId?: string;
  meta?: ContainerNodeMeta;
  nodeKind: 'container';
}

export interface ModuleNode extends NodeBase {
  alias?: string;
  icon?: string;
  isPpModule?: boolean;
  moduleId: number;
  moduleType: string;
  nodeKind: 'module';
  ports: Port[];
  shape?: ModuleShape;
}

/**
 * Unified port type for all node kinds. portIoType distinguishes direction:
 * 'input' / 'output' for data ports (placed left / right), 'control' for
 * control ports (placed top). Separate rendering arrays on each node interface
 * (ports) filter by portIoType for handle placement.
 */
export interface Port {
  activeLinks?: number;
  id: string;
  /** Prevents new connections and hides context menu for this port. */
  locked?: boolean;
  /** Max edges connectable to this port. Absent means unlimited. */
  maxConnections?: number;
  name?: string;
  portIoType: PortIoType;
  /** Consumer-settable. Absent means no status indicator is shown. */
  portStatus?: PortStatus;
  totalLinks?: number;
}

export interface SubgraphProxyNode extends NodeBase {
  nodeKind: 'subgraph-proxy';
  ports: Port[];
  subgraphId: number;
}

export type AnyNode =
  ContainerNode | ModuleNode | SubgraphNode | SubgraphProxyNode | SubsystemNode;

export type AnyEdge = ControlLink | DataLink | ProxyControlLink | ProxyDataLink;

export interface EdgeBase {
  id: string;
  /** Not used on proxy links, since one merged line can't have a single true/false. */
  isDangling?: boolean;
  label?: string;
  /** Excluded from Delete key and context menu. */
  locked?: boolean;
  meta?: GraphElementMeta;
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

export type VirtualDataLinkKind = 'mdf' | 'standard' | 'subsystem';

export interface ProxyDataLink extends EdgeBase {
  edgeKind: 'proxy-data';
  kind?: VirtualDataLinkKind;
  mdfModuleIds?: string[];
  realConnectionIds?: string[];
}

export interface ProxyControlLink extends EdgeBase {
  edgeKind: 'proxy-control';
  realConnectionIds?: string[];
}

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
