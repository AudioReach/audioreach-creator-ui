/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Pure collapse transform. Given a LevelView and the set of collapsed subgraph
 * ids, replaces each collapsed SubgraphNode (and its descendant containers and
 * modules) with a single SubgraphProxyNode, and remaps every edge crossing the
 * subgraph boundary onto derived proxy ports as a proxy-data / proxy-control
 * link. The Visualizer is a pure renderer for collapse state; this is the
 * consumer-side computation it expects (see usecase-visualizer-design.md →
 * Collapse). No layout runs — the proxy inherits the subgraph's position and
 * the Visualizer fits the view when subgraphProxies.length changes.
 */

import type {
  ControlLink,
  DataLink,
  LevelView,
  Port,
  ProxyControlLink,
  ProxyDataLink,
  SubgraphProxyNode,
} from '~entities/graph';
import {NODE_DIMENSIONS} from '~features/usecase-visualizer';

import {subgraphProxyNodeId} from './node-id';

interface CollapseContext {
  /** node id → collapsed subgraphId that contains it (proxy target). */
  insideNodeToSubgraph: Map<string, number>;
}

interface RemappedEndpoints {
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

/** Resolve, per collapsed subgraph, the set of descendant node ids. */
function buildCollapseContext(
  level: LevelView,
  collapsed: Set<number>,
): CollapseContext {
  const insideNodeToSubgraph = new Map<string, number>();

  const subgraphNodeIdToSubgraphId = new Map(
    (level.subgraphs ?? [])
      .filter((subgraph) => collapsed.has(subgraph.subgraphId))
      .map((subgraph) => [subgraph.id, subgraph.subgraphId]),
  );
  const containerToSubgraph = new Map<string, number>();
  for (const c of level.containers ?? []) {
    const sgId = c.parentId
      ? subgraphNodeIdToSubgraphId.get(c.parentId)
      : undefined;
    if (sgId !== undefined) {
      containerToSubgraph.set(c.id, sgId);
      insideNodeToSubgraph.set(c.id, sgId);
    }
  }
  for (const m of level.modules ?? []) {
    const sgId = m.parentId ? containerToSubgraph.get(m.parentId) : undefined;
    if (sgId !== undefined) {
      insideNodeToSubgraph.set(m.id, sgId);
    }
  }
  return {insideNodeToSubgraph};
}

type AnyDataLink = DataLink | ProxyDataLink;
type AnyControlLink = ControlLink | ProxyControlLink;

/** A derived proxy port, keyed for dedup across edges sharing an endpoint. */
function proxyPortId(
  sgId: number,
  internalNodeId: string,
  internalPortId: string,
): string {
  return `proxy:${sgId}:${internalNodeId}:${internalPortId}`;
}

export function applyCollapses(
  level: LevelView,
  collapsed: Set<number>,
): LevelView {
  const hasProxies = (level.subgraphProxies?.length ?? 0) > 0;
  if (collapsed.size === 0 && !hasProxies) {
    return level;
  }

  const {insideNodeToSubgraph} = buildCollapseContext(level, collapsed);

  // Pre-build port name lookup to avoid repeated linear scans over edges.
  const portNameIndex = new Map(
    [...(level.modules ?? []), ...(level.subgraphProxies ?? [])].map((node) => [
      node.id,
      new Map(node.ports.map((p) => [p.id, p.name])),
    ]),
  );
  const lookupPortName = (nodeId: string, portId: string): string | undefined =>
    portNameIndex.get(nodeId)?.get(portId);

  // Per-proxy accumulated ports, deduped by port id.
  const proxyPorts = new Map<number, Map<string, Port>>();
  const ensureProxyPort = (
    sgId: number,
    internalNodeId: string,
    internalPortId: string,
    portIoType: Port['portIoType'],
    name: string | undefined,
  ): string => {
    if (!proxyPorts.has(sgId)) {
      proxyPorts.set(sgId, new Map());
    }
    const ports = proxyPorts.get(sgId)!;
    const id = proxyPortId(sgId, internalNodeId, internalPortId);
    if (!ports.has(id)) {
      ports.set(id, {id, locked: true, name, portIoType});
    }
    return id;
  };

  const keptDataLinks: DataLink[] = [];
  const keptControlLinks: ControlLink[] = [];
  const proxyDataLinks: ProxyDataLink[] = [];
  const proxyControlLinks: ProxyControlLink[] = [];

  // direction: for the inside endpoint, an edge ENTERING the subgraph (inside is
  // the target) exposes an 'input' proxy port; an edge LEAVING (inside is the
  // source) exposes an 'output' proxy port. Control links expose 'control'.
  const remapDataEndpoints = (
    e: AnyDataLink,
  ): RemappedEndpoints | null | undefined => {
    const srcSg = insideNodeToSubgraph.get(e.sourceNodeId);
    const dstSg = insideNodeToSubgraph.get(e.targetNodeId);
    if (srcSg === undefined && dstSg === undefined) {
      return undefined;
    }
    if (srcSg !== undefined && dstSg !== undefined && srcSg === dstSg) {
      return null;
    }
    let sourceNodeId = e.sourceNodeId;
    let sourcePortId = e.sourcePortId;
    let targetNodeId = e.targetNodeId;
    let targetPortId = e.targetPortId;
    if (srcSg !== undefined) {
      sourcePortId = ensureProxyPort(
        srcSg,
        e.sourceNodeId,
        e.sourcePortId,
        'output',
        lookupPortName(e.sourceNodeId, e.sourcePortId),
      );
      sourceNodeId = subgraphProxyNodeId(srcSg);
    }
    if (dstSg !== undefined) {
      targetPortId = ensureProxyPort(
        dstSg,
        e.targetNodeId,
        e.targetPortId,
        'input',
        lookupPortName(e.targetNodeId, e.targetPortId),
      );
      targetNodeId = subgraphProxyNodeId(dstSg);
    }
    return {sourceNodeId, sourcePortId, targetNodeId, targetPortId};
  };

  const remapDataLink = (e: DataLink): void => {
    const remapped = remapDataEndpoints(e);
    if (remapped === undefined) {
      keptDataLinks.push(e);
      return;
    }
    if (remapped === null) {
      return;
    }
    proxyDataLinks.push({
      edgeKind: 'proxy-data',
      id: `proxy-${e.id}`,
      isEcLink: e.isEcLink,
      isInterUsecase: e.isInterUsecase,
      kind: 'standard',
      label: e.label,
      locked: true,
      meta: e.meta,
      realConnectionIds: [e.id],
      ...remapped,
    });
  };

  const remapProxyDataLink = (e: ProxyDataLink): void => {
    const remapped = remapDataEndpoints(e);
    if (remapped === undefined) {
      proxyDataLinks.push(e);
      return;
    }
    if (remapped === null) {
      return;
    }
    proxyDataLinks.push({...e, ...remapped});
  };

  const remapControlEndpoints = (
    e: AnyControlLink,
  ): RemappedEndpoints | null | undefined => {
    const srcSg = insideNodeToSubgraph.get(e.sourceNodeId);
    const dstSg = insideNodeToSubgraph.get(e.targetNodeId);
    if (srcSg === undefined && dstSg === undefined) {
      return undefined;
    }
    if (srcSg !== undefined && dstSg !== undefined && srcSg === dstSg) {
      return null;
    }
    let sourceNodeId = e.sourceNodeId;
    let sourcePortId = e.sourcePortId;
    let targetNodeId = e.targetNodeId;
    let targetPortId = e.targetPortId;
    if (srcSg !== undefined) {
      sourcePortId = ensureProxyPort(
        srcSg,
        e.sourceNodeId,
        e.sourcePortId,
        'control',
        lookupPortName(e.sourceNodeId, e.sourcePortId),
      );
      sourceNodeId = subgraphProxyNodeId(srcSg);
    }
    if (dstSg !== undefined) {
      targetPortId = ensureProxyPort(
        dstSg,
        e.targetNodeId,
        e.targetPortId,
        'control',
        lookupPortName(e.targetNodeId, e.targetPortId),
      );
      targetNodeId = subgraphProxyNodeId(dstSg);
    }
    return {sourceNodeId, sourcePortId, targetNodeId, targetPortId};
  };

  const remapControlLink = (e: ControlLink): void => {
    const remapped = remapControlEndpoints(e);
    if (remapped === undefined) {
      keptControlLinks.push(e);
      return;
    }
    if (remapped === null) {
      return;
    }
    proxyControlLinks.push({
      edgeKind: 'proxy-control',
      id: `proxy-${e.id}`,
      isInterUsecase: e.isInterUsecase,
      label: e.label,
      locked: true,
      meta: e.meta,
      realConnectionIds: [e.id],
      ...remapped,
    });
  };

  const remapProxyControlLink = (e: ProxyControlLink): void => {
    const remapped = remapControlEndpoints(e);
    if (remapped === undefined) {
      proxyControlLinks.push(e);
      return;
    }
    if (remapped === null) {
      return;
    }
    proxyControlLinks.push({...e, ...remapped});
  };

  (level.dataLinks ?? []).forEach(remapDataLink);
  (level.controlLinks ?? []).forEach(remapControlLink);
  (level.proxyDataLinks ?? []).forEach(remapProxyDataLink);
  (level.proxyControlLinks ?? []).forEach(remapProxyControlLink);

  // Build proxy nodes from collapsed subgraphs, inheriting their position.
  const collapsedSubgraphs = (level.subgraphs ?? []).filter((sg) =>
    collapsed.has(sg.subgraphId),
  );
  const newProxies: SubgraphProxyNode[] = collapsedSubgraphs.map((sg) => ({
    height: NODE_DIMENSIONS.subgraphProxy.height,
    id: subgraphProxyNodeId(sg.subgraphId),
    label: sg.label,
    meta: sg.meta,
    nodeKind: 'subgraph-proxy',
    parentId: sg.parentId,
    ports: Array.from(proxyPorts.get(sg.subgraphId)?.values() ?? []),
    subgraphId: sg.subgraphId,
    width: NODE_DIMENSIONS.subgraphProxy.width,
    x: sg.x,
    y: sg.y,
  }));

  const insideNodeIds = new Set(Array.from(insideNodeToSubgraph.keys()));

  return {
    ...level,
    containers: (level.containers ?? []).filter(
      (c) => !insideNodeIds.has(c.id),
    ),
    controlLinks: keptControlLinks,
    dataLinks: keptDataLinks,
    modules: (level.modules ?? []).filter((m) => !insideNodeIds.has(m.id)),
    proxyControlLinks,
    proxyDataLinks,
    subgraphProxies: [...(level.subgraphProxies ?? []), ...newProxies],
    subgraphs: (level.subgraphs ?? []).filter(
      (sg) => !collapsed.has(sg.subgraphId),
    ),
  };
}
