/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {act, render} from '@testing-library/react';

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
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';

import {latestReactFlowProps} from '../test-utils/xyflow-mock-factory';

jest.mock('@xyflow/react', () =>
  require('../test-utils/xyflow-mock-factory').createXyflowMockFactory(),
);

const subsystem: SubsystemNode = {
  height: 200,
  id: 'ss-1',
  label: 'SS1',
  nodeKind: 'subsystem',
  ports: [],
  subsystemId: 'ss-1',
  width: 240,
  x: 0,
  y: 0,
};

const subgraph: SubgraphNode = {
  height: 180,
  id: 'sg-1',
  label: 'SG1',
  nodeKind: 'subgraph',
  subgraphId: 1,
  width: 220,
  x: 0,
  y: 220,
};

const subgraphProxy: SubgraphProxyNode = {
  height: 60,
  id: 'sgp-1',
  label: 'Proxy',
  nodeKind: 'subgraph-proxy',
  ports: [],
  subgraphId: 2,
  width: 160,
  x: 260,
  y: 220,
};

const container: ContainerNode = {
  containerId: 1,
  height: 100,
  id: 'cnt-1',
  label: 'C1',
  nodeKind: 'container',
  width: 200,
  x: 0,
  y: 420,
};

const moduleA: ModuleNode = {
  height: 100,
  id: 'm-a',
  label: 'A',
  moduleId: 1,
  moduleType: 'GAIN',
  nodeKind: 'module',
  ports: [
    {id: 'in1', portIoType: 'input'},
    {id: 'out1', portIoType: 'output'},
    {id: 'c1', portIoType: 'control'},
  ],
  width: 160,
  x: 0,
  y: 540,
};

const moduleB: ModuleNode = {
  height: 100,
  id: 'm-b',
  label: 'B',
  moduleId: 2,
  moduleType: 'GAIN',
  nodeKind: 'module',
  ports: [
    {id: 'in1', portIoType: 'input'},
    {id: 'out1', portIoType: 'output'},
    {id: 'c1', portIoType: 'control'},
  ],
  width: 160,
  x: 200,
  y: 540,
};

const dataLink: DataLink = {
  edgeKind: 'data',
  id: 'd1',
  sourceNodeId: 'm-a',
  sourcePortId: 'out1',
  targetNodeId: 'm-b',
  targetPortId: 'in1',
};

const controlLink: ControlLink = {
  edgeKind: 'control',
  id: 'c1',
  sourceNodeId: 'm-a',
  sourcePortId: 'c1',
  targetNodeId: 'm-b',
  targetPortId: 'c1',
};

const proxyDataLink: ProxyDataLink = {
  edgeKind: 'proxy-data',
  id: 'pd1',
  sourceNodeId: 'm-a',
  sourcePortId: 'out1',
  targetNodeId: 'sgp-1',
  targetPortId: 'in1',
};

const proxyControlLink: ProxyControlLink = {
  edgeKind: 'proxy-control',
  id: 'pc1',
  sourceNodeId: 'm-a',
  sourcePortId: 'c1',
  targetNodeId: 'sgp-1',
  targetPortId: 'c1',
};

const fixture: LevelView = {
  containers: [container],
  controlLinks: [controlLink],
  dataLinks: [dataLink],
  levelId: 'root',
  modules: [moduleA, moduleB],
  proxyControlLinks: [proxyControlLink],
  proxyDataLinks: [proxyDataLink],
  subgraphProxies: [subgraphProxy],
  subgraphs: [subgraph],
  subsystems: [subsystem],
};

describe('UsecaseVisualizer — smoke', () => {
  it('renders all five node kinds and all four edge kinds from a fixture', () => {
    const {container: dom} = render(<UsecaseVisualizer graph={fixture} />);

    expect(dom.querySelector('[data-testid="subsystem-node"]')).not.toBeNull();
    expect(dom.querySelector('[data-testid="subgraph-node"]')).not.toBeNull();
    expect(
      dom.querySelector('[data-testid="subgraph-proxy-node"]'),
    ).not.toBeNull();
    expect(dom.querySelector('[data-testid="container-node"]')).not.toBeNull();
    expect(dom.querySelector('[data-testid="module-node"]')).not.toBeNull();

    expect(dom.querySelector('[data-edge-id="d1"]')).not.toBeNull();
    expect(dom.querySelector('[data-edge-id="c1"]')).not.toBeNull();
    expect(dom.querySelector('[data-edge-id="pd1"]')).not.toBeNull();
    expect(dom.querySelector('[data-edge-id="pc1"]')).not.toBeNull();
  });

  it('onNodeDragStop fires onNodeDragEnd with nodeId and position', async () => {
    const onNodeDragEnd = jest.fn();
    render(
      <UsecaseVisualizer eventHandlers={{onNodeDragEnd}} graph={fixture} />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeDragStop?.(
        {},
        {
          id: 'm-a',
          position: {x: 10, y: 20},
        },
      );
    });

    expect(onNodeDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({nodeId: 'm-a', position: {x: 10, y: 20}}),
    );
  });
});
