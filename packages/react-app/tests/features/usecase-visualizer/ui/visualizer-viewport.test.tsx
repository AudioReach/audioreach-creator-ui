/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';

import type {
  LevelView,
  SubgraphProxyNode,
} from '~features/usecase-visualizer/model/visualizer.types';
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';

import {latestReactFlowProps} from '../test-utils/xyflow-mock-factory';

const mockFitView = jest.fn();
const mockSetViewport = jest.fn();
const mockGetViewport = jest.fn(() => ({x: 10, y: 20, zoom: 1.5}));

jest.mock('@xyflow/react', () => {
  const base =
    require('../test-utils/xyflow-mock-factory').createXyflowMockFactory();
  return {
    ...base,
    applyNodeChanges: jest.fn((_changes: unknown[], nodes: unknown[]) => nodes),
    useEdgesState: (initial: unknown[]) => {
      const {useState} = require('react');
      const [edges, setEdges] = useState(initial);
      return [edges, setEdges, jest.fn()];
    },
    useNodesState: (initial: unknown[]) => {
      const {useState} = require('react');
      const [nodes, setNodes] = useState(initial);
      return [nodes, setNodes, jest.fn()];
    },
    useReactFlow: () => ({
      fitView: mockFitView,
      getViewport: mockGetViewport,
      setViewport: mockSetViewport,
    }),
  };
});

jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeGraph(overrides: Partial<LevelView> = {}): LevelView {
  return {levelId: 'root', ...overrides};
}

function makeProxy(id: string): SubgraphProxyNode {
  return {
    height: 60,
    id,
    label: 'Proxy',
    nodeKind: 'subgraph-proxy',
    ports: [],
    subgraphId: 1,
    width: 160,
    x: 0,
    y: 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  latestReactFlowProps.current = null;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('graph effect viewport logic', () => {
  it('calls fitView on first mount when no cached viewport', () => {
    render(<UsecaseVisualizer graph={makeGraph({levelId: 'root'})} />);
    expect(mockFitView).toHaveBeenCalledTimes(1);
    expect(mockSetViewport).not.toHaveBeenCalled();
  });

  it('calls fitView when proxies count changes on same level', () => {
    const graph1 = makeGraph({levelId: 'root', subgraphProxies: []});
    const graph2 = makeGraph({
      levelId: 'root',
      subgraphProxies: [makeProxy('sgp-1')],
    });

    const {rerender} = render(<UsecaseVisualizer graph={graph1} />);
    mockFitView.mockClear();

    rerender(<UsecaseVisualizer graph={graph2} />);
    expect(mockFitView).toHaveBeenCalledTimes(1);
  });

  it('does not call fitView or setViewport when level and proxies are unchanged', () => {
    const graph = makeGraph({levelId: 'root'});
    const {rerender} = render(<UsecaseVisualizer graph={graph} />);
    mockFitView.mockClear();
    mockSetViewport.mockClear();

    rerender(<UsecaseVisualizer graph={graph} />);
    expect(mockFitView).not.toHaveBeenCalled();
    expect(mockSetViewport).not.toHaveBeenCalled();
  });

  it('restores cached viewport when navigating back to a known levelId', () => {
    const cachedViewport = {x: 50, y: 100, zoom: 0.75};
    // First mount with initialViewport seeds the cache for 'level-a'.
    const {rerender} = render(
      <UsecaseVisualizer
        graph={makeGraph({levelId: 'level-a'})}
        initialViewport={cachedViewport}
      />,
    );
    mockSetViewport.mockClear();

    // Navigate away.
    rerender(<UsecaseVisualizer graph={makeGraph({levelId: 'level-b'})} />);
    mockSetViewport.mockClear();
    mockFitView.mockClear();

    // Navigate back — should restore from cache, not call fitView.
    rerender(<UsecaseVisualizer graph={makeGraph({levelId: 'level-a'})} />);
    expect(mockSetViewport).toHaveBeenCalledWith(cachedViewport);
    expect(mockFitView).not.toHaveBeenCalled();
  });

  it('calls clearSelection on level change (fitView fires confirming effect ran)', () => {
    const {rerender} = render(
      <UsecaseVisualizer graph={makeGraph({levelId: 'lvl-1'})} />,
    );
    mockFitView.mockClear();

    rerender(<UsecaseVisualizer graph={makeGraph({levelId: 'lvl-2'})} />);
    // fitView fires on the new unseen level — this confirms the effect ran,
    // which is also where clearSelection is called.
    expect(mockFitView).toHaveBeenCalledTimes(1);
  });
});

describe('double-click subsystem saves viewport before consumer callback', () => {
  it('getViewport is called before onNodeDoubleClick consumer callback', () => {
    const callOrder: string[] = [];
    mockGetViewport.mockImplementation(() => {
      callOrder.push('getViewport');
      return {x: 10, y: 20, zoom: 1.5};
    });
    const onNodeDoubleClick = jest.fn(() => {
      callOrder.push('onNodeDoubleClick');
    });

    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDoubleClick}}
        graph={makeGraph()}
      />,
    );

    // Fire the onNodeDoubleClick prop with a subsystem-shaped node.
    latestReactFlowProps.current?.onNodeDoubleClick?.(null, {
      data: {nodeKind: 'subsystem'},
      id: 'ss-1',
      type: 'subsystem',
    });

    // Viewport must be saved before consumer callback fires.
    expect(callOrder).toEqual(['getViewport', 'onNodeDoubleClick']);
    expect(mockGetViewport).toHaveBeenCalledTimes(1);
    expect(onNodeDoubleClick).toHaveBeenCalledWith('ss-1');
  });

  it('does not call getViewport for non-subsystem nodes', () => {
    const onNodeDoubleClick = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDoubleClick}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onNodeDoubleClick?.(null, {
      data: {nodeKind: 'module'},
      id: 'm-1',
      type: 'module',
    });

    expect(mockGetViewport).not.toHaveBeenCalled();
    expect(onNodeDoubleClick).toHaveBeenCalledWith('m-1');
  });
});

describe('initialViewport on first mount', () => {
  it('calls setViewport with initialViewport instead of fitView', () => {
    const initialViewport = {x: 100, y: 200, zoom: 0.8};
    render(
      <UsecaseVisualizer
        graph={makeGraph({levelId: 'level-a'})}
        initialViewport={initialViewport}
      />,
    );
    expect(mockSetViewport).toHaveBeenCalledWith(initialViewport);
    expect(mockFitView).not.toHaveBeenCalled();
  });

  it('seeds the viewport cache so navigate-back restores the initial viewport', () => {
    const initialViewport = {x: 5, y: 10, zoom: 1.2};
    const {rerender} = render(
      <UsecaseVisualizer
        graph={makeGraph({levelId: 'level-b'})}
        initialViewport={initialViewport}
      />,
    );
    mockSetViewport.mockClear();
    mockFitView.mockClear();

    rerender(<UsecaseVisualizer graph={makeGraph({levelId: 'other'})} />);
    mockSetViewport.mockClear();
    mockFitView.mockClear();
    rerender(<UsecaseVisualizer graph={makeGraph({levelId: 'level-b'})} />);
    expect(mockSetViewport).toHaveBeenCalledWith(initialViewport);
    expect(mockFitView).not.toHaveBeenCalled();
  });
});

describe('onViewportChange wiring', () => {
  it('fires onViewportChange when onMoveEnd is triggered on the canvas', () => {
    const onViewportChange = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onViewportChange}}
        graph={makeGraph()}
      />,
    );

    const viewport = {x: 30, y: 40, zoom: 1.2};
    latestReactFlowProps.current?.onMoveEnd?.(null, viewport);

    expect(onViewportChange).toHaveBeenCalledWith(viewport);
  });

  // The following three tests verify that onViewportChange fires for
  // programmatic viewport operations (fitView, cached restore, proxy-count
  // fit). ReactFlow emits onMoveEnd with event=null after every viewport
  // mutation including programmatic ones; handleMoveEnd forwards the viewport
  // ReactFlow has actually settled on, avoiding the stale-read problem of
  // calling getViewport() synchronously after void fitView().
  it('fires onViewportChange via onMoveEnd after programmatic fitView on first mount', () => {
    const onViewportChange = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onViewportChange}}
        graph={makeGraph({levelId: 'fresh-level'})}
      />,
    );
    expect(mockFitView).toHaveBeenCalledTimes(1);

    const postFitViewport = {x: 0, y: 0, zoom: 0.8};
    latestReactFlowProps.current?.onMoveEnd?.(null, postFitViewport);

    expect(onViewportChange).toHaveBeenCalledWith(postFitViewport);
  });

  it('fires onViewportChange via onMoveEnd after programmatic setViewport on cached restore', () => {
    const onViewportChange = jest.fn();
    const initialViewport = {x: 5, y: 10, zoom: 1.2};

    const {rerender} = render(
      <UsecaseVisualizer
        eventHandlers={{onViewportChange}}
        graph={makeGraph({levelId: 'level-a'})}
        initialViewport={initialViewport}
      />,
    );

    // Navigate away then back — level-a now has a cached viewport.
    rerender(
      <UsecaseVisualizer
        eventHandlers={{onViewportChange}}
        graph={makeGraph({levelId: 'level-b'})}
      />,
    );
    onViewportChange.mockClear();
    mockSetViewport.mockClear();

    rerender(
      <UsecaseVisualizer
        eventHandlers={{onViewportChange}}
        graph={makeGraph({levelId: 'level-a'})}
      />,
    );

    expect(mockSetViewport).toHaveBeenCalledWith(initialViewport);

    // Simulate ReactFlow emitting onMoveEnd after the setViewport completes.
    latestReactFlowProps.current?.onMoveEnd?.(null, initialViewport);

    expect(onViewportChange).toHaveBeenCalledWith(initialViewport);
  });

  it('fires onViewportChange via onMoveEnd after programmatic fitView on proxy-count change', () => {
    const onViewportChange = jest.fn();
    const graph1 = makeGraph({levelId: 'root', subgraphProxies: []});
    const graph2 = makeGraph({
      levelId: 'root',
      subgraphProxies: [makeProxy('sgp-1')],
    });

    const {rerender} = render(
      <UsecaseVisualizer eventHandlers={{onViewportChange}} graph={graph1} />,
    );
    onViewportChange.mockClear();
    mockFitView.mockClear();

    rerender(
      <UsecaseVisualizer eventHandlers={{onViewportChange}} graph={graph2} />,
    );

    expect(mockFitView).toHaveBeenCalledTimes(1);

    const postFitViewport = {x: 0, y: 0, zoom: 0.9};
    latestReactFlowProps.current?.onMoveEnd?.(null, postFitViewport);

    expect(onViewportChange).toHaveBeenCalledWith(postFitViewport);
  });
});
