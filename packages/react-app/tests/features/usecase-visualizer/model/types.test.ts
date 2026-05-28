/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type AnyEdge,
  type AnyNode,
  type ContainerNode,
  type ControlLink,
  type DataLink,
  EDGE_KIND,
  type LevelView,
  MODULE_SHAPE,
  type ModuleNode,
  NODE_KIND,
  type NodeBase,
  type NodeContentOverride,
  type Port,
  PORT_IO_TYPE,
  PORT_STATUS,
  type PortIoType,
  type ProxyControlLink,
  type ProxyDataLink,
  type SubgraphNode,
  type SubgraphProxyNode,
  type SubsystemNode,
  VISUALIZER_MODE,
  type VisualizerRenderingConfig,
} from '~features/usecase-visualizer/model/visualizer.types';

describe('visualizer.types — const objects', () => {
  it('NODE_KIND.MODULE === module', () => {
    expect(NODE_KIND.MODULE).toBe('module');
  });

  it('EDGE_KIND.DATA === data', () => {
    expect(EDGE_KIND.DATA).toBe('data');
  });

  it('PORT_IO_TYPE.CONTROL === control', () => {
    expect(PORT_IO_TYPE.CONTROL).toBe('control');
  });

  it('MODULE_SHAPE.RECT === rect', () => {
    expect(MODULE_SHAPE.RECT).toBe('rect');
  });

  it('PORT_STATUS.USED === used', () => {
    expect(PORT_STATUS.USED).toBe('used');
  });

  it('VISUALIZER_MODE.EDIT === edit', () => {
    expect(VISUALIZER_MODE.EDIT).toBe('edit');
  });
});

describe('visualizer.types — LevelView shape', () => {
  it('accepts an instance with only levelId set', () => {
    const v: LevelView = {levelId: 'test'};
    expect(v.levelId).toBe('test');
  });

  it('accepts a LevelView populated with every node and edge array', () => {
    const subsystem: SubsystemNode = {
      height: 200,
      id: 's1',
      label: 'Sys',
      nodeKind: 'subsystem',
      ports: [],
      subsystemId: 'sys-1',
      width: 200,
      x: 0,
      y: 0,
    };
    const subgraph: SubgraphNode = {
      height: 100,
      id: 'sg1',
      label: 'SG',
      nodeKind: 'subgraph',
      subgraphId: 1,
      width: 100,
      x: 0,
      y: 0,
    };
    const proxy: SubgraphProxyNode = {
      height: 60,
      id: 'sgp1',
      label: 'SGP',
      nodeKind: 'subgraph-proxy',
      ports: [],
      subgraphId: 1,
      width: 160,
      x: 0,
      y: 0,
    };
    const container: ContainerNode = {
      containerId: 1,
      height: 100,
      id: 'c1',
      label: 'C',
      nodeKind: 'container',
      width: 100,
      x: 0,
      y: 0,
    };
    const moduleNode: ModuleNode = {
      height: 80,
      id: 'm1',
      label: 'M',
      moduleId: 1,
      moduleType: 'mt',
      nodeKind: 'module',
      ports: [],
      width: 160,
      x: 0,
      y: 0,
    };
    const view: LevelView = {
      containers: [container],
      controlLinks: [],
      dataLinks: [],
      levelId: 'L',
      modules: [moduleNode],
      proxyControlLinks: [],
      proxyDataLinks: [],
      subgraphProxies: [proxy],
      subgraphs: [subgraph],
      subsystems: [subsystem],
    };
    expect(view.modules).toHaveLength(1);
  });
});

describe('visualizer.types — node port shape', () => {
  it('ModuleNode and SubsystemNode use the unified Port[] type', () => {
    const port: Port = {id: 'p1', portIoType: 'input'};
    const m: ModuleNode = {
      height: 80,
      id: 'm',
      label: 'M',
      moduleId: 1,
      moduleType: 'mt',
      nodeKind: 'module',
      ports: [port],
      width: 160,
      x: 0,
      y: 0,
    };
    const s: SubsystemNode = {
      height: 100,
      id: 's',
      label: 'S',
      nodeKind: 'subsystem',
      ports: [port],
      subsystemId: 's-1',
      width: 200,
      x: 0,
      y: 0,
    };
    expect(m.ports[0]).toBe(port);
    expect(s.ports[0]).toBe(port);
  });

  it('SubgraphProxyNode satisfies NodeBase (no extra base fields)', () => {
    const proxy: SubgraphProxyNode = {
      height: 60,
      id: 'sgp',
      label: 'SGP',
      nodeKind: 'subgraph-proxy',
      ports: [],
      subgraphId: 1,
      width: 160,
      x: 0,
      y: 0,
    };
    const base: NodeBase = proxy;
    expect(base.id).toBe('sgp');
    expect(base.x).toBe(0);
  });
});

describe('visualizer.types — Port narrowing', () => {
  it('portIoType narrows to its three string literals', () => {
    const inOut: PortIoType = 'input';
    const fn = (t: PortIoType): 'l' | 'r' | 't' => {
      switch (t) {
        case 'input':
          return 'l';
        case 'output':
          return 'r';
        case 'control':
          return 't';
      }
    };
    expect(fn(inOut)).toBe('l');
    expect(fn('output')).toBe('r');
    expect(fn('control')).toBe('t');
  });

  it('locked, maxConnections, portStatus are optional', () => {
    const minimal: Port = {id: 'p1', portIoType: 'input'};
    expect(minimal.locked).toBeUndefined();
    expect(minimal.maxConnections).toBeUndefined();
    expect(minimal.portStatus).toBeUndefined();
  });
});

describe('visualizer.types — edge discriminants', () => {
  it('AnyEdge narrows on edgeKind in a switch statement', () => {
    const data: DataLink = {
      edgeKind: 'data',
      id: 'e1',
      sourceNodeId: 'a',
      sourcePortId: '1',
      targetNodeId: 'b',
      targetPortId: '2',
    };
    const fn = (e: AnyEdge): string => {
      switch (e.edgeKind) {
        case 'data':
          return `data:${e.sourcePortId}`;
        case 'control':
          return 'control';
        case 'proxy-data':
          return 'proxy-data';
        case 'proxy-control':
          return 'proxy-control';
      }
    };
    expect(fn(data)).toBe('data:1');
  });

  it('ControlLink, ProxyDataLink, ProxyControlLink use only EdgeBase fields', () => {
    const control: ControlLink = {
      edgeKind: 'control',
      id: 'c',
      sourceNodeId: 'a',
      sourcePortId: '1',
      targetNodeId: 'b',
      targetPortId: '2',
    };
    const proxyData: ProxyDataLink = {
      edgeKind: 'proxy-data',
      id: 'pd',
      sourceNodeId: 'a',
      sourcePortId: '1',
      targetNodeId: 'b',
      targetPortId: '2',
    };
    const proxyControl: ProxyControlLink = {
      edgeKind: 'proxy-control',
      id: 'pc',
      sourceNodeId: 'a',
      sourcePortId: '1',
      targetNodeId: 'b',
      targetPortId: '2',
    };
    // No `originalEdges` field exists on proxy edges.
    // @ts-expect-error proxy edges have no originalEdges field
    const _pdExtra: unknown = proxyData.originalEdges;
    // @ts-expect-error proxy edges have no originalEdges field
    const _pcExtra: unknown = proxyControl.originalEdges;
    expect(_pdExtra).toBeUndefined();
    expect(_pcExtra).toBeUndefined();
    expect(control.edgeKind).toBe('control');
    expect(proxyData.edgeKind).toBe('proxy-data');
    expect(proxyControl.edgeKind).toBe('proxy-control');
  });
});

describe('visualizer.types — renderNodeContent callback', () => {
  it('accepts AnyNode and returns NodeContentOverride | null', () => {
    const config: VisualizerRenderingConfig = {
      renderNodeContent: (node: AnyNode): NodeContentOverride | null => {
        if (node.nodeKind === 'module') {
          return {footer: null};
        }
        return null;
      },
    };
    expect(config.renderNodeContent).toBeDefined();
  });
});
