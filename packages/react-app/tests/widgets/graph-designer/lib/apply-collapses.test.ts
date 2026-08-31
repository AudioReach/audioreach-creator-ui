/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ContainerNode,
  DataLink,
  LevelView,
  ModuleNode,
  SubgraphNode,
} from '~entities/graph';
import {applyCollapses} from '~widgets/graph-designer/lib/apply-collapses';

function subgraph(id: number): SubgraphNode {
  return {
    height: 100,
    id: `subgraph-${id}`,
    label: `SG ${id}`,
    meta: {subgraphSystemId: `sg-${id}`, systemId: `sg-${id}`},
    nodeKind: 'subgraph',
    subgraphId: id,
    width: 100,
    x: 10,
    y: 20,
  };
}

function container(containerId: number, sgId: number): ContainerNode {
  return {
    containerId,
    height: 80,
    id: `container-${containerId}:${sgId}`,
    label: `C ${containerId}`,
    nodeKind: 'container',
    parentId: `subgraph-${sgId}`,
    width: 80,
    x: 0,
    y: 0,
  };
}

function moduleNode(id: number, containerId: number, sgId: number): ModuleNode {
  return {
    height: 80,
    id: `module-${id}`,
    label: `M ${id}`,
    moduleId: id,
    moduleType: 'Mod',
    nodeKind: 'module',
    parentId: `container-${containerId}:${sgId}`,
    ports: [
      {id: 'in', name: 'in', portIoType: 'input'},
      {id: 'out', name: 'out', portIoType: 'output'},
    ],
    width: 160,
    x: 0,
    y: 0,
  };
}

function baseLevel(): LevelView {
  // SG1 { C1 { m1, m2 } }, SG2 { C2 { m3 } }; data link m2(out) -> m3(in)
  return {
    containers: [container(1, 1), container(2, 2)],
    dataLinks: [
      {
        edgeKind: 'data',
        id: 'd-internal',
        sourceNodeId: 'module-1',
        sourcePortId: 'out',
        targetNodeId: 'module-2',
        targetPortId: 'in',
      },
      {
        edgeKind: 'data',
        id: 'd-cross',
        meta: {systemId: 'd-cross'},
        sourceNodeId: 'module-2',
        sourcePortId: 'out',
        targetNodeId: 'module-3',
        targetPortId: 'in',
      },
    ],
    levelId: 'top',
    modules: [moduleNode(1, 1, 1), moduleNode(2, 1, 1), moduleNode(3, 2, 2)],
    subgraphs: [subgraph(1), subgraph(2)],
  };
}

describe('applyCollapses', () => {
  it('returns the same reference when nothing is collapsed', () => {
    const level = baseLevel();
    expect(applyCollapses(level, new Set())).toBe(level);
  });

  it('replaces a collapsed subgraph with a proxy at its position', () => {
    const out = applyCollapses(baseLevel(), new Set([1]));
    expect(out.subgraphs?.map((s) => s.subgraphId)).toEqual([2]);
    const proxy = out.subgraphProxies?.find((p) => p.subgraphId === 1);
    expect(proxy).toBeDefined();
    expect(proxy!.id).toBe('subgraph-proxy-1');
    expect({x: proxy!.x, y: proxy!.y}).toEqual({x: 10, y: 20});
    // descendants removed
    expect(out.modules?.map((m) => m.id)).toEqual(['module-3']);
    expect(out.containers?.map((c) => c.id)).toEqual(['container-2:2']);
  });

  it('drops wholly-internal edges and keeps wholly-external edges', () => {
    const out = applyCollapses(baseLevel(), new Set([1]));
    // d-internal was inside SG1 → dropped; no plain data links remain (d-cross
    // crosses the boundary → becomes a proxy link)
    expect(out.dataLinks).toEqual([]);
  });

  it('remaps a crossing edge onto a derived output proxy port', () => {
    const out = applyCollapses(baseLevel(), new Set([1]));
    expect(out.proxyDataLinks).toHaveLength(1);
    const link = out.proxyDataLinks![0] as DataLink;
    expect(link.edgeKind).toBe('proxy-data');
    expect(link.sourceNodeId).toBe('subgraph-proxy-1');
    expect(link.sourcePortId).toBe('proxy:1:module-2:out');
    expect(link.meta?.systemId).toBe('d-cross');
    expect(link.targetNodeId).toBe('module-3');
    expect(link.targetPortId).toBe('in');
    // proxy exposes that port as an output (edge leaves the subgraph)
    const proxy = out.subgraphProxies!.find((p) => p.subgraphId === 1)!;
    expect(proxy.meta?.systemId).toBe('sg-1');
    expect(proxy.ports).toContainEqual(
      expect.objectContaining({
        id: 'proxy:1:module-2:out',
        portIoType: 'output',
      }),
    );
  });

  it('derives an input proxy port when an edge enters the collapsed subgraph', () => {
    // collapse SG2 instead → m3(in) is the inside endpoint of d-cross
    const out = applyCollapses(baseLevel(), new Set([2]));
    const link = out.proxyDataLinks![0];
    expect(link.targetNodeId).toBe('subgraph-proxy-2');
    expect(link.targetPortId).toBe('proxy:2:module-3:in');
    const proxy = out.subgraphProxies!.find((p) => p.subgraphId === 2)!;
    expect(proxy.ports).toContainEqual(
      expect.objectContaining({id: 'proxy:2:module-3:in', portIoType: 'input'}),
    );
  });

  it('dedupes proxy ports shared by multiple crossing edges', () => {
    const level = baseLevel();
    level.dataLinks!.push({
      edgeKind: 'data',
      id: 'd-cross-2',
      sourceNodeId: 'module-2',
      sourcePortId: 'out',
      targetNodeId: 'module-3',
      targetPortId: 'in',
    });
    const out = applyCollapses(level, new Set([1]));
    const proxy = out.subgraphProxies!.find((p) => p.subgraphId === 1)!;
    const outputPorts = proxy.ports.filter(
      (p) => p.id === 'proxy:1:module-2:out',
    );
    expect(outputPorts).toHaveLength(1);
    expect(out.proxyDataLinks).toHaveLength(2);
  });
});
