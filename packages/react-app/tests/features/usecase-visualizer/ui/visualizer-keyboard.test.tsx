/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {
  type ControlLink,
  type LevelView,
  type ModuleNode,
  VISUALIZER_MODE,
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

function makeModule(id: string, locked = false): ModuleNode {
  return {
    height: 100,
    id,
    label: id,
    locked,
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
  };
}

function makeEdge(id: string, locked = false): ControlLink {
  return {
    edgeKind: 'control',
    id,
    locked,
    sourceNodeId: 'n1',
    sourcePortId: 'p',
    targetNodeId: 'n2',
    targetPortId: 'p',
  };
}

function makeGraph(): LevelView {
  return {
    controlLinks: [makeEdge('e1'), makeEdge('e2', true)],
    levelId: 'root',
    modules: [makeModule('n1'), makeModule('n2', true)],
  };
}

function getContainer(): HTMLElement {
  const fake = screen.getByTestId('fake-react-flow');
  return fake.parentElement as HTMLElement;
}

function selectNodes(ids: string[]) {
  latestReactFlowProps.current?.onSelectionChange?.({
    edges: [],
    nodes: ids.map((id) => ({data: makeModule(id), id, type: 'module'})),
  });
}

function selectEdges(ids: string[]) {
  latestReactFlowProps.current?.onSelectionChange?.({
    edges: ids.map((id) => ({
      data: makeEdge(id),
      id,
      source: 'n1',
      target: 'n2',
      type: 'control-link',
    })),
    nodes: [],
  });
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

describe('keyboard: Escape', () => {
  it('clears selection and fires onSelectionChange with prior selection removed', () => {
    const onSelectionChange = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    selectNodes(['n1']);
    onSelectionChange.mockClear();
    fireEvent.keyDown(getContainer(), {key: 'Escape'});

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const payload = onSelectionChange.mock.calls[0][0];
    expect(payload.selectedNodeIds).toEqual([]);
    expect(payload.delta.removedNodeIds).toEqual(['n1']);
  });

  it('does nothing when selection is empty', () => {
    const onSelectionChange = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onSelectionChange}}
        graph={makeGraph()}
      />,
    );

    fireEvent.keyDown(getContainer(), {key: 'Escape'});
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('keyboard: Delete', () => {
  it('fires onNodesDeleted for non-locked selected nodes in edit mode', () => {
    const onNodesDeleted = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodesDeleted}}
        graph={makeGraph()}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );

    selectNodes(['n1', 'n2']);
    fireEvent.keyDown(getContainer(), {key: 'Delete'});

    expect(onNodesDeleted).toHaveBeenCalledWith({nodeIds: ['n1']});
  });

  it('fires onEdgesDeleted for non-locked selected edges in edit mode', () => {
    const onEdgesDeleted = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgesDeleted}}
        graph={makeGraph()}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );

    selectEdges(['e1', 'e2']);
    fireEvent.keyDown(getContainer(), {key: 'Delete'});

    expect(onEdgesDeleted).toHaveBeenCalledWith({edgeIds: ['e1']});
  });

  it('does nothing on Delete in readonly mode', () => {
    const onNodesDeleted = jest.fn();
    const onEdgesDeleted = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgesDeleted, onNodesDeleted}}
        graph={makeGraph()}
        mode={VISUALIZER_MODE.READONLY}
      />,
    );

    selectNodes(['n1']);
    fireEvent.keyDown(getContainer(), {key: 'Delete'});

    expect(onNodesDeleted).not.toHaveBeenCalled();
    expect(onEdgesDeleted).not.toHaveBeenCalled();
  });
});
