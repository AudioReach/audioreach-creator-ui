/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  toReactFlowEdges,
  toReactFlowNodes,
} from '~features/usecase-visualizer/lib/to-reactflow';
import type {
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
} from '~features/usecase-visualizer/model/visualizer.types';

const moduleNode: ModuleNode = {
  height: 80,
  id: 'm1',
  label: 'Module 1',
  moduleId: 1,
  moduleType: 'mt',
  nodeKind: 'module',
  parentId: 'c1',
  ports: [],
  width: 160,
  x: 10,
  y: 20,
};

const subgraphNode: SubgraphNode = {
  height: 200,
  id: 'sg1',
  label: 'Subgraph 1',
  nodeKind: 'subgraph',
  parentId: 'sys1',
  subgraphId: 1,
  width: 300,
  x: 30,
  y: 40,
};

const containerNode: ContainerNode = {
  containerId: 1,
  height: 100,
  id: 'c1',
  label: 'Container 1',
  nodeKind: 'container',
  parentId: 'sg1',
  width: 200,
  x: 50,
  y: 60,
};

const subsystemNode: SubsystemNode = {
  height: 200,
  id: 'sys1',
  label: 'Subsystem 1',
  nodeKind: 'subsystem',
  ports: [],
  subsystemId: 'sys-1',
  width: 200,
  x: 70,
  y: 80,
};

const subgraphProxy: SubgraphProxyNode = {
  height: 60,
  id: 'sgp1',
  label: 'Proxy 1',
  nodeKind: 'subgraph-proxy',
  parentId: 'sys1',
  ports: [],
  subgraphId: 1,
  width: 160,
  x: 90,
  y: 100,
};

describe('toReactFlowNodes', () => {
  it('flattens every node array into a single ReactFlow node list', () => {
    const view: LevelView = {
      containers: [containerNode],
      levelId: 'L',
      modules: [moduleNode],
      subgraphProxies: [subgraphProxy],
      subgraphs: [subgraphNode],
      subsystems: [subsystemNode],
    };
    const nodes = toReactFlowNodes(view);
    expect(nodes).toHaveLength(5);
    expect(nodes.map((n) => n.id).sort()).toEqual(
      ['c1', 'm1', 'sg1', 'sgp1', 'sys1'].sort(),
    );
  });

  it('returns empty array for empty LevelView', () => {
    expect(toReactFlowNodes({levelId: 'L'})).toEqual([]);
  });

  it.each([
    ['module', moduleNode, {modules: [moduleNode]}, 'module'],
    ['subgraph', subgraphNode, {subgraphs: [subgraphNode]}, 'subgraph'],
    ['container', containerNode, {containers: [containerNode]}, 'container'],
    ['subsystem', subsystemNode, {subsystems: [subsystemNode]}, 'subsystem'],
    [
      'subgraphProxy',
      subgraphProxy,
      {subgraphProxies: [subgraphProxy]},
      'subgraph-proxy',
    ],
  ] as const)(
    '%s node maps to ReactFlow node with correct fields',
    (_kind, src, payload, expectedType) => {
      const nodes = toReactFlowNodes({levelId: 'L', ...payload});
      expect(nodes).toHaveLength(1);
      const rf = nodes[0];
      expect(rf.id).toBe(src.id);
      expect(rf.type).toBe(expectedType);
      expect(rf.position).toEqual({x: src.x, y: src.y});
      expect(rf.data).toBe(src);
      expect(rf.width).toBe(src.width);
      expect(rf.height).toBe(src.height);
      expect(rf.parentId).toBe(src.parentId);
    },
  );
});

describe('toReactFlowEdges — DataLink', () => {
  const data: DataLink = {
    edgeKind: 'data',
    id: 'd1',
    sourceNodeId: 'm1',
    sourcePortId: '10',
    targetNodeId: 'm2',
    targetPortId: '20',
  };

  it('produces a data-link edge with Data: handle ids', () => {
    const edges = toReactFlowEdges({dataLinks: [data], levelId: 'L'});
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e.type).toBe('data-link');
    expect(e.id).toBe('d1');
    expect(e.source).toBe('m1');
    expect(e.target).toBe('m2');
    expect(e.sourceHandle).toBe('Data:10');
    expect(e.targetHandle).toBe('Data:20');
  });
});

describe('toReactFlowEdges — ControlLink', () => {
  const ctl: ControlLink = {
    edgeKind: 'control',
    id: 'c1',
    sourceNodeId: 'm1',
    sourcePortId: '5',
    targetNodeId: 'm2',
    targetPortId: '6',
  };

  it('produces a control-link edge with -source / -target handle suffixes', () => {
    const edges = toReactFlowEdges({controlLinks: [ctl], levelId: 'L'});
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e.type).toBe('control-link');
    expect(e.sourceHandle).toBe('Control:5-source');
    expect(e.targetHandle).toBe('Control:6-target');
  });
});

describe('toReactFlowEdges — proxy edges', () => {
  it('proxy data link uses Data: handles and proxy-data-link type', () => {
    const pd: ProxyDataLink = {
      edgeKind: 'proxy-data',
      id: 'pd1',
      sourceNodeId: 'a',
      sourcePortId: '1',
      targetNodeId: 'b',
      targetPortId: '2',
    };
    const edges = toReactFlowEdges({levelId: 'L', proxyDataLinks: [pd]});
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e.type).toBe('proxy-data-link');
    expect(e.sourceHandle).toBe('Data:1');
    expect(e.targetHandle).toBe('Data:2');
    expect(
      (e as unknown as {originalEdges?: unknown}).originalEdges,
    ).toBeUndefined();
  });

  it('proxy control link uses Control: handles and proxy-control-link type', () => {
    const pc: ProxyControlLink = {
      edgeKind: 'proxy-control',
      id: 'pc1',
      sourceNodeId: 'a',
      sourcePortId: '7',
      targetNodeId: 'b',
      targetPortId: '8',
    };
    const edges = toReactFlowEdges({levelId: 'L', proxyControlLinks: [pc]});
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e.type).toBe('proxy-control-link');
    expect(e.sourceHandle).toBe('Control:7-source');
    expect(e.targetHandle).toBe('Control:8-target');
    expect(
      (e as unknown as {originalEdges?: unknown}).originalEdges,
    ).toBeUndefined();
  });
});

describe('toReactFlowEdges — flatten', () => {
  it('flattens all edge arrays into one list', () => {
    const view: LevelView = {
      controlLinks: [
        {
          edgeKind: 'control',
          id: 'c1',
          sourceNodeId: 'a',
          sourcePortId: '1',
          targetNodeId: 'b',
          targetPortId: '2',
        },
      ],
      dataLinks: [
        {
          edgeKind: 'data',
          id: 'd1',
          sourceNodeId: 'a',
          sourcePortId: '1',
          targetNodeId: 'b',
          targetPortId: '2',
        },
      ],
      levelId: 'L',
      proxyControlLinks: [
        {
          edgeKind: 'proxy-control',
          id: 'pc1',
          sourceNodeId: 'a',
          sourcePortId: '1',
          targetNodeId: 'b',
          targetPortId: '2',
        },
      ],
      proxyDataLinks: [
        {
          edgeKind: 'proxy-data',
          id: 'pd1',
          sourceNodeId: 'a',
          sourcePortId: '1',
          targetNodeId: 'b',
          targetPortId: '2',
        },
      ],
    };
    const edges = toReactFlowEdges(view);
    expect(edges.map((e) => e.type).sort()).toEqual(
      [
        'control-link',
        'data-link',
        'proxy-control-link',
        'proxy-data-link',
      ].sort(),
    );
  });

  it('returns empty array for empty LevelView', () => {
    expect(toReactFlowEdges({levelId: 'L'})).toEqual([]);
  });
});
