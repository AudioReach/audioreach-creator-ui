/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {DragEvent as ReactDragEvent} from 'react';

import {act, render} from '@testing-library/react';

import {
  type ContainerNode,
  type LevelView,
  type ModuleNode,
  type Port,
  type SubgraphNode,
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

function makePort(
  id: string,
  portIoType: Port['portIoType'],
  locked = false,
): Port {
  return {id, locked, portIoType};
}

function makeModule(
  id: string,
  ports: Port[] = [],
  opts: {height?: number; width?: number; x?: number; y?: number} = {},
): ModuleNode {
  return {
    height: opts.height ?? 100,
    id,
    label: id,
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports,
    width: opts.width ?? 160,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
  };
}

function makeContainer(
  id: string,
  opts: {height?: number; width?: number; x?: number; y?: number} = {},
): ContainerNode {
  return {
    containerId: 1,
    height: opts.height ?? 200,
    id,
    label: id,
    nodeKind: 'container',
    width: opts.width ?? 300,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
  };
}

function makeSubgraph(
  id: string,
  opts: {height?: number; width?: number; x?: number; y?: number} = {},
): SubgraphNode {
  return {
    height: opts.height ?? 200,
    id,
    label: id,
    nodeKind: 'subgraph',
    subgraphId: 1,
    width: opts.width ?? 300,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
  };
}

function makeGraph(overrides: Partial<LevelView> = {}): LevelView {
  return {
    levelId: 'root',
    modules: [makeModule('n1'), makeModule('n2')],
    ...overrides,
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

describe('8a — nodesConnectable', () => {
  it('readonly: nodesConnectable is falsy', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.READONLY} />,
    );
    expect(latestReactFlowProps.current?.nodesConnectable).toBeFalsy();
  });

  it('edit: nodesConnectable is true', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.EDIT} />,
    );
    expect(latestReactFlowProps.current?.nodesConnectable).toBe(true);
  });

  it('readonly: onDrop is undefined', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.READONLY} />,
    );
    expect(latestReactFlowProps.current?.onDrop).toBeUndefined();
  });

  it('readonly: onDragOver is undefined', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.READONLY} />,
    );
    expect(latestReactFlowProps.current?.onDragOver).toBeUndefined();
  });

  it('edit: onDrop is a function', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.EDIT} />,
    );
    expect(typeof latestReactFlowProps.current?.onDrop).toBe('function');
  });
});

function fakeDropEvent(
  clientX: number,
  clientY: number,
  data: string,
): ReactDragEvent {
  return {
    clientX,
    clientY,
    dataTransfer: {
      getData: (type: string) => (type === 'application/json' ? data : ''),
    } as unknown as DataTransfer,
    preventDefault: jest.fn(),
  } as unknown as ReactDragEvent;
}

function fakeDragOverEvent(
  clientX: number,
  clientY: number,
  types: string[],
): ReactDragEvent & {preventDefault: jest.Mock} {
  const prevent = jest.fn();
  return {
    clientX,
    clientY,
    dataTransfer: {types} as unknown as DataTransfer,
    preventDefault: prevent,
  } as unknown as ReactDragEvent & {preventDefault: jest.Mock};
}

describe('8b — palette drop', () => {
  it('drop over empty canvas fires onNodeDropped without target ids', () => {
    const onNodeDropped = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph()}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(500, 500, '{"type":"GAIN"}'),
      );
    });
    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    const payload = onNodeDropped.mock.calls[0][0];
    expect(payload.dropData).toBe('{"type":"GAIN"}');
    expect(payload.position).toEqual({x: 500, y: 500});
    expect(payload.targetContainerId).toBeUndefined();
    expect(payload.targetSubgraphId).toBeUndefined();
  });

  it('drop over container area fires onNodeDropped with targetContainerId', () => {
    const onNodeDropped = jest.fn();
    const container = makeContainer('c1', {
      height: 200,
      width: 300,
      x: 0,
      y: 0,
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph({containers: [container]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    // screenToFlowPosition stub returns coords as-is: (100,100) is inside container
    // (0,0,300,200)
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(100, 100, '{"type":"GAIN"}'),
      );
    });
    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    expect(onNodeDropped.mock.calls[0][0].targetContainerId).toBe('c1');
    expect(onNodeDropped.mock.calls[0][0].targetSubgraphId).toBeUndefined();
  });

  it('drop over subgraph area (not a container) fires onNodeDropped with targetSubgraphId', () => {
    const onNodeDropped = jest.fn();
    const subgraph = makeSubgraph('sg1', {height: 200, width: 300, x: 0, y: 0});
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph({subgraphs: [subgraph]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(100, 100, '{"type":"GAIN"}'),
      );
    });
    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    expect(onNodeDropped.mock.calls[0][0].targetSubgraphId).toBe('sg1');
    expect(onNodeDropped.mock.calls[0][0].targetContainerId).toBeUndefined();
  });

  it('dragover with subgraph MIME hint over a subgraph: preventDefault NOT called', () => {
    const subgraph = makeSubgraph('sg1', {height: 200, width: 300, x: 0, y: 0});
    render(
      <UsecaseVisualizer
        graph={makeGraph({subgraphs: [subgraph]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    const evt = fakeDragOverEvent(100, 100, [
      'application/x-audioreach-node-type-subgraph',
    ]);
    act(() => {
      latestReactFlowProps.current?.onDragOver?.(evt);
    });
    expect(evt.preventDefault).not.toHaveBeenCalled();
  });

  it('dragover with subgraph MIME hint NOT over a subgraph: preventDefault called', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.EDIT} />,
    );
    const evt = fakeDragOverEvent(999, 999, [
      'application/x-audioreach-node-type-subgraph',
    ]);
    act(() => {
      latestReactFlowProps.current?.onDragOver?.(evt);
    });
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('drop with empty application/json does not call onNodeDropped', () => {
    const onNodeDropped = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph()}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(fakeDropEvent(100, 100, ''));
    });
    expect(onNodeDropped).not.toHaveBeenCalled();
  });

  it('dragover with application/json MIME type calls preventDefault', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.EDIT} />,
    );
    const evt = fakeDragOverEvent(100, 100, ['application/json']);
    act(() => {
      latestReactFlowProps.current?.onDragOver?.(evt);
    });
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
  });
});

describe('8c — edge connect', () => {
  it('valid data connect (output→input) fires onEdgeConnected with edgeKind data', () => {
    const onEdgeConnected = jest.fn();
    const graph = makeGraph({
      modules: [
        makeModule('n1', [makePort('p-out', 'output')]),
        makeModule('n2', [makePort('p-in', 'input')]),
      ],
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgeConnected}}
        graph={graph}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onConnect?.({
        source: 'n1',
        sourceHandle: 'Data:p-out',
        target: 'n2',
        targetHandle: 'Data:p-in',
      });
    });
    expect(onEdgeConnected).toHaveBeenCalledTimes(1);
    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'data',
      sourceNodeId: 'n1',
      sourcePortId: 'p-out',
      targetNodeId: 'n2',
      targetPortId: 'p-in',
    });
  });

  it('valid control connect fires onEdgeConnected with edgeKind control', () => {
    const onEdgeConnected = jest.fn();
    const graph = makeGraph({
      modules: [
        makeModule('n1', [makePort('cp1', 'control')]),
        makeModule('n2', [makePort('cp2', 'control')]),
      ],
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgeConnected}}
        graph={graph}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onConnect?.({
        source: 'n1',
        sourceHandle: 'Control:cp1-source',
        target: 'n2',
        targetHandle: 'Control:cp2-target',
      });
    });
    expect(onEdgeConnected).toHaveBeenCalledTimes(1);
    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'control',
      sourceNodeId: 'n1',
      sourcePortId: 'cp1',
      targetNodeId: 'n2',
      targetPortId: 'cp2',
    });
  });

  it('mismatched portIoType (control → data) does not call onEdgeConnected', () => {
    const onEdgeConnected = jest.fn();
    const graph = makeGraph({
      modules: [
        makeModule('n1', [makePort('cp1', 'control')]),
        makeModule('n2', [makePort('p-in', 'input')]),
      ],
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgeConnected}}
        graph={graph}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onConnect?.({
        source: 'n1',
        sourceHandle: 'Control:cp1-source',
        target: 'n2',
        targetHandle: 'Data:p-in',
      });
    });
    expect(onEdgeConnected).not.toHaveBeenCalled();
  });

  it('connect from locked source port does not call onEdgeConnected', () => {
    const onEdgeConnected = jest.fn();
    const graph = makeGraph({
      modules: [
        makeModule('n1', [makePort('p-out', 'output', true)]),
        makeModule('n2', [makePort('p-in', 'input')]),
      ],
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgeConnected}}
        graph={graph}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onConnect?.({
        source: 'n1',
        sourceHandle: 'Data:p-out',
        target: 'n2',
        targetHandle: 'Data:p-in',
      });
    });
    expect(onEdgeConnected).not.toHaveBeenCalled();
  });

  it('connect to locked target port does not call onEdgeConnected', () => {
    const onEdgeConnected = jest.fn();
    const graph = makeGraph({
      modules: [
        makeModule('n1', [makePort('p-out', 'output')]),
        makeModule('n2', [makePort('p-in', 'input', true)]),
      ],
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgeConnected}}
        graph={graph}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onConnect?.({
        source: 'n1',
        sourceHandle: 'Data:p-out',
        target: 'n2',
        targetHandle: 'Data:p-in',
      });
    });
    expect(onEdgeConnected).not.toHaveBeenCalled();
  });
});
