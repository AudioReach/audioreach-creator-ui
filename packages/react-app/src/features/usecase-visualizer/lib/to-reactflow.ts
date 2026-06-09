/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Edge, Node} from '@xyflow/react';

import type {
  AnyEdge,
  AnyNode,
  ContainerNode,
  ControlLink,
  DataLink,
  LevelView,
  ModuleNode,
  ProxyControlLink,
  ProxyDataLink,
  SubgraphNode,
  SubgraphProxyNode,
  SubsystemNode,
} from '../model/visualizer.types';

import {controlHandleId, dataHandleId} from './port-geometry';

/**
 * LevelView → ReactFlow conversion.
 *
 * Both functions are pure. They flatten every typed array on the LevelView
 * into a single ReactFlow node or edge list. The Visualizer's nodeTypes /
 * edgeTypes registry uses the `type` strings produced here.
 *
 * Handle ids come from `dataHandleId` / `controlHandleId` so this conversion
 * stays in lockstep with what node components render.
 *
 * See docs/design/usecase-visualizer/usecase-visualizer-design.md
 *   → Implementation Notes → Handle ID naming convention.
 */

type ReactFlowNode<TData extends AnyNode> = Node<
  TData & Record<string, unknown>
>;

type ReactFlowEdge<TData extends AnyEdge> = Edge<
  TData & Record<string, unknown>
>;

function toNode<TData extends AnyNode>(
  node: TData,
  type: string,
): ReactFlowNode<TData> {
  return {
    data: node as TData & Record<string, unknown>,
    height: node.height,
    id: node.id,
    parentId: node.parentId,
    position: {x: node.x, y: node.y},
    type,
    width: node.width,
  };
}

export function toReactFlowNodes(graph: LevelView): Node[] {
  const out: Node[] = [];
  graph.subsystems?.forEach((n: SubsystemNode) => {
    out.push(toNode(n, 'subsystem'));
  });
  graph.subgraphs?.forEach((n: SubgraphNode) => {
    out.push(toNode(n, 'subgraph'));
  });
  graph.subgraphProxies?.forEach((n: SubgraphProxyNode) => {
    out.push(toNode(n, 'subgraph-proxy'));
  });
  graph.containers?.forEach((n: ContainerNode) => {
    out.push(toNode(n, 'container'));
  });
  graph.modules?.forEach((n: ModuleNode) => {
    out.push(toNode(n, 'module'));
  });
  return out;
}

function toDataEdge<TData extends DataLink | ProxyDataLink>(
  edge: TData,
  type: string,
): ReactFlowEdge<TData> {
  // Domain invariant: each (sourcePortId, targetPortId) pair has at most one
  // DataLink, so Bezier paths cannot overlap — no per-edge offset is needed.
  return {
    data: edge as TData & Record<string, unknown>,
    id: edge.id,
    label: edge.label,
    source: edge.sourceNodeId,
    sourceHandle: dataHandleId(edge.sourcePortId),
    target: edge.targetNodeId,
    targetHandle: dataHandleId(edge.targetPortId),
    type,
  };
}

function toControlEdge<TData extends ControlLink | ProxyControlLink>(
  edge: TData,
  type: string,
): ReactFlowEdge<TData> {
  return {
    data: edge as TData & Record<string, unknown>,
    id: edge.id,
    label: edge.label,
    source: edge.sourceNodeId,
    sourceHandle: controlHandleId(edge.sourcePortId, 'source'),
    target: edge.targetNodeId,
    targetHandle: controlHandleId(edge.targetPortId, 'target'),
    type,
  };
}

export function toReactFlowEdges(graph: LevelView): Edge[] {
  const out: Edge[] = [];
  graph.dataLinks?.forEach((e: DataLink) => {
    out.push(toDataEdge(e, 'data-link'));
  });
  graph.controlLinks?.forEach((e: ControlLink) => {
    out.push(toControlEdge(e, 'control-link'));
  });
  graph.proxyDataLinks?.forEach((e: ProxyDataLink) => {
    out.push(toDataEdge(e, 'proxy-data-link'));
  });
  graph.proxyControlLinks?.forEach((e: ProxyControlLink) => {
    out.push(toControlEdge(e, 'proxy-control-link'));
  });
  return out;
}
