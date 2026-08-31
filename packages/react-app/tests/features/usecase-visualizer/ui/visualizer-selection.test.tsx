/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';

import type {LevelView, ModuleNode, ProxyDataLink} from '~entities/graph';
import type {SelectionChangePayload} from '~features/usecase-visualizer/model/visualizer.types';
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';
import {logger} from '~shared/lib/logger';

import {
  latestReactFlowInstance,
  latestReactFlowProps,
} from '../test-utils/xyflow-mock-factory';

jest.mock('@xyflow/react', () => {
  const base =
    require('../test-utils/xyflow-mock-factory').createXyflowMockFactory();
  return {
    ...base,
    applyNodeChanges: jest.fn((_changes: unknown[], nodes: unknown[]) => nodes),
  };
});

jest.mock('~shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
}));

function makeModule(id: string): ModuleNode {
  return {
    height: 100,
    id,
    label: id,
    meta: {systemId: `sys-${id}`},
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
  };
}

function makeModuleWithoutSystemId(id: string): ModuleNode {
  const {meta: _meta, ...module} = makeModule(id);
  return module;
}

function makeGraph(): LevelView {
  return {levelId: 'root', modules: [makeModule('n1'), makeModule('n2')]};
}

function nodeRef(id: string) {
  return {data: makeModule(id), id, type: 'module'};
}

beforeEach(() => {
  jest.clearAllMocks();
  latestReactFlowInstance.current = null;
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

describe('selection and delta', () => {
  it('passes ReactFlow selection/pan props', () => {
    render(<UsecaseVisualizer graph={makeGraph()} />);
    const props = latestReactFlowProps.current;
    expect(props?.selectionOnDrag).toBe(true);
    expect(props?.selectNodesOnDrag).toBe(false);
    expect(props?.multiSelectionKeyCode).toBe('Control');
    expect(props?.panActivationKeyCode).toBe('Space');
  });

  it('fires onSelectionChange with addedNodes on first node select', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1')],
    });

    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedNodes).toEqual([
      {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
    ]);
    expect(payload.delta.addedNodes).toEqual([
      {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
    ]);
    expect(payload.delta.removedNodes).toEqual([]);
  });

  it('omits selected nodes that are missing systemId metadata', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [
        {data: makeModuleWithoutSystemId('n1'), id: 'n1', type: 'module'},
      ],
    });

    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedNodes).toEqual([]);
    expect(payload.delta.addedNodes).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'UsecaseVisualizer: selected node missing systemId metadata',
      {
        action: 'selection_change',
        component: 'UsecaseVisualizer',
        error: 'nodeId=n1',
      },
    );
  });

  it('omits selected edges that are missing systemId metadata', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [
        {
          data: {
            edgeKind: 'control',
            sourceNodeId: 'n1',
            sourcePortId: 'out-1',
            targetNodeId: 'n2',
            targetPortId: 'in-1',
          },
          id: 'edge-1',
          source: 'n1',
          target: 'n2',
          type: 'control-link',
        },
      ],
      nodes: [],
    });

    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedEdges).toEqual([]);
    expect(payload.delta.addedEdges).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'UsecaseVisualizer: selected edge missing systemId metadata',
      {
        action: 'selection_change',
        component: 'UsecaseVisualizer',
        error: 'edgeId=edge-1',
      },
    );
  });

  it('allows selected proxy edges without systemId metadata', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [
        {
          data: {
            edgeKind: 'proxy-data',
            sourceNodeId: 'n1',
            sourcePortId: 'out-1',
            targetNodeId: 'n2',
            targetPortId: 'in-1',
          },
          id: 'proxy-edge-1',
          source: 'n1',
          target: 'n2',
          type: 'proxy-data-link',
        },
      ],
      nodes: [],
    });

    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedEdges).toEqual([
      {edgeKind: 'proxy-data', id: 'proxy-edge-1'},
    ]);
    expect(payload.delta.addedEdges).toEqual([
      {edgeKind: 'proxy-data', id: 'proxy-edge-1'},
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reports only the newly added node on Ctrl+click of a second node', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1')],
    });
    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1'), nodeRef('n2')],
    });

    const payload = onSelectionChange.mock.calls[1][0];
    expect(payload.selectedNodes).toEqual([
      {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
      {id: 'n2', nodeKind: 'module', systemId: 'sys-n2'},
    ]);
    expect(payload.delta.addedNodes).toEqual([
      {id: 'n2', nodeKind: 'module', systemId: 'sys-n2'},
    ]);
    expect(payload.delta.removedNodes).toEqual([]);
  });

  it('reports removedNodes when a selected node is deselected', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1'), nodeRef('n2')],
    });
    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1')],
    });

    const payload = onSelectionChange.mock.calls[1][0];
    expect(payload.delta.removedNodes).toEqual([
      {id: 'n2', nodeKind: 'module', systemId: 'sys-n2'},
    ]);
    expect(payload.delta.addedNodes).toEqual([]);
  });

  it('reports prior selection in removedNodes when canvas is cleared', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1'), nodeRef('n2')],
    });
    latestReactFlowProps.current?.onSelectionChange?.({edges: [], nodes: []});

    const payload = onSelectionChange.mock.calls[1][0];
    expect(payload.selectedNodes).toEqual([]);
    expect(payload.delta.removedNodes).toEqual([
      {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
      {id: 'n2', nodeKind: 'module', systemId: 'sys-n2'},
    ]);
  });

  it('fires an empty selection payload when graph level changes with a selection', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    const {rerender} = render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1')],
    });
    onSelectionChange.mockClear();

    rerender(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={{...makeGraph(), levelId: 'child'}}
      />,
    );

    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedNodes).toEqual([]);
    expect(payload.selectedEdges).toEqual([]);
    expect(payload.delta.removedNodes).toEqual([
      {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
    ]);
  });

  it('fires an empty selection payload when proxy link count changes with a selection', () => {
    const onSelectionChange = jest.fn<void, [SelectionChangePayload]>();
    const proxyLink: ProxyDataLink = {
      edgeKind: 'proxy-data',
      id: 'proxy-dl-1',
      kind: 'standard',
      realConnectionIds: ['dl-1'],
      sourceNodeId: 'n1',
      sourcePortId: 'out-1',
      targetNodeId: 'n2',
      targetPortId: 'in-1',
    };
    const {rerender} = render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    latestReactFlowProps.current?.onSelectionChange?.({
      edges: [],
      nodes: [nodeRef('n1')],
    });
    onSelectionChange.mockClear();

    rerender(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={{...makeGraph(), proxyDataLinks: [proxyLink]}}
      />,
    );

    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedEdges).toEqual([]);
    expect(payload.selectedNodes).toEqual([]);
    expect(payload.delta.removedNodes).toEqual([
      {id: 'n1', nodeKind: 'module', systemId: 'sys-n1'},
    ]);
  });

  it('focuses the requested node and acknowledges the request', () => {
    const onFocusNodeRequestHandled = jest.fn();

    render(
      <UsecaseVisualizer
        focusNodeRequest={{nodeId: 'n1', requestId: 7}}
        graph={makeGraph()}
        onFocusNodeRequestHandled={onFocusNodeRequestHandled}
      />,
    );

    expect(latestReactFlowInstance.current?.fitView).toHaveBeenCalledWith({
      duration: 250,
      nodes: [{id: 'n1'}],
      padding: 0.2,
    });
    expect(onFocusNodeRequestHandled).toHaveBeenCalledWith(7);
  });
});
