/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';

import type {
  LevelView,
  ModuleNode,
  SelectionChangePayload,
} from '~features/usecase-visualizer/model/visualizer.types';
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';

import {latestReactFlowProps} from '../test-utils/xyflow-mock-factory';

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
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
  };
}

function makeGraph(): LevelView {
  return {levelId: 'root', modules: [makeModule('n1'), makeModule('n2')]};
}

function nodeRef(id: string) {
  return {data: makeModule(id), id, type: 'module'};
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

describe('selection and delta', () => {
  it('passes ReactFlow selection/pan props', () => {
    render(<UsecaseVisualizer graph={makeGraph()} />);
    const props = latestReactFlowProps.current;
    expect(props?.selectionOnDrag).toBe(true);
    expect(props?.selectNodesOnDrag).toBe(false);
    expect(props?.multiSelectionKeyCode).toBe('Control');
    expect(props?.panActivationKeyCode).toBe('Space');
  });

  it('fires onSelectionChange with addedNodeIds on first node select', () => {
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
    expect(payload.selectedNodeIds).toEqual(['n1']);
    expect(payload.delta.addedNodeIds).toEqual(['n1']);
    expect(payload.delta.removedNodeIds).toEqual([]);
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
    expect(payload.selectedNodeIds).toEqual(['n1', 'n2']);
    expect(payload.delta.addedNodeIds).toEqual(['n2']);
    expect(payload.delta.removedNodeIds).toEqual([]);
  });

  it('reports removedNodeIds when a selected node is deselected', () => {
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
    expect(payload.delta.removedNodeIds).toEqual(['n2']);
    expect(payload.delta.addedNodeIds).toEqual([]);
  });

  it('reports prior selection in removedNodeIds when canvas is cleared', () => {
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
    expect(payload.selectedNodeIds).toEqual([]);
    expect(payload.delta.removedNodeIds).toEqual(['n1', 'n2']);
  });
});
