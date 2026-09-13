/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {DragEvent as ReactDragEvent, ReactNode} from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';

import type {
  ContainerNode,
  LevelView,
  ModuleNode,
  Port,
  SubgraphNode,
  SubsystemNode,
} from '~entities/graph';
import {VISUALIZER_MODE} from '~features/usecase-visualizer';
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

jest.mock('@qualcomm-ui/react-core/portal', () => ({
  Portal: ({children}: {children: ReactNode}) => <>{children}</>,
}));

jest.mock('@qualcomm-ui/react/menu', () => {
  const passthrough = ({children}: {children: ReactNode}) => <>{children}</>;
  const Item = ({
    children,
    onSelect,
    value,
  }: {
    children: ReactNode;
    onSelect?: () => void;
    value: string;
  }) => (
    <button data-menu-item={value} onClick={() => onSelect?.()} type="button">
      {children}
    </button>
  );
  return {
    Menu: {
      Content: passthrough,
      Item,
      ItemLabel: passthrough,
      ItemStartIcon: passthrough,
      Positioner: passthrough,
      Root: passthrough,
      Separator: () => null,
      TriggerItem: passthrough,
    },
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
  opts: {
    containerId?: number;
    containerSystemId?: string;
    height?: number;
    parentId?: string;
    subgraphSystemId?: string;
    width?: number;
    x?: number;
    y?: number;
  } = {},
): ContainerNode {
  return {
    containerId: opts.containerId ?? 1,
    height: opts.height ?? 200,
    id,
    label: id,
    meta: {
      containerSystemId:
        opts.containerSystemId ?? String(opts.containerId ?? 1),
      subgraphSystemId: opts.subgraphSystemId ?? '1',
    },
    nodeKind: 'container',
    parentId: opts.parentId,
    width: opts.width ?? 300,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
  };
}

function makeSubgraph(
  id: string,
  opts: {
    height?: number;
    parentId?: string;
    subgraphId?: number;
    subgraphSystemId?: string;
    width?: number;
    x?: number;
    y?: number;
  } = {},
): SubgraphNode {
  return {
    height: opts.height ?? 200,
    id,
    label: id,
    meta: {
      subgraphSystemId: opts.subgraphSystemId ?? String(opts.subgraphId ?? 1),
    },
    nodeKind: 'subgraph',
    parentId: opts.parentId,
    subgraphId: opts.subgraphId ?? 1,
    width: opts.width ?? 300,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
  };
}

function makeBoundary(): SubsystemNode {
  return {
    height: 400,
    id: 'ss-1',
    label: 'Subsystem boundary',
    nodeKind: 'subsystem',
    ports: [
      {id: 'in-1', portIoType: 'input'},
      {id: 'out-1', portIoType: 'output'},
    ],
    subsystemId: 'ss-1',
    width: 600,
    x: 0,
    y: 0,
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

describe('nodesConnectable', () => {
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

describe('connection payloads in edit mode', () => {
  it('keeps direct React Flow connections in source-target order', () => {
    const onEdgeConnected = jest.fn();
    const source = makeModule('m6', [makePort('m6-out', 'output')]);
    const target = makeModule('m7', [makePort('m7-in', 'input')]);
    render(
      <UsecaseVisualizer
        eventHandlers={{onEdgeConnected}}
        graph={makeGraph({modules: [source, target]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );

    act(() => {
      latestReactFlowProps.current?.onConnect?.({
        source: 'm6',
        sourceHandle: 'Data:m6-out',
        target: 'm7',
        targetHandle: 'Data:m7-in',
      });
    });

    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'data',
      edgeMode: 'normal',
      sourceNodeId: 'm6',
      sourcePortId: 'm6-out',
      targetNodeId: 'm7',
      targetPortId: 'm7-in',
    });
  });

  it('matches direct connections when using context-menu actions', () => {
    const onEdgeConnected = jest.fn();
    const boundary = makeBoundary();
    const module = makeModule('m6', [makePort('m6-in', 'input')]);
    const getItems = jest
      .fn()
      .mockReturnValueOnce([{id: 'start-connection', label: 'Start'}])
      .mockReturnValueOnce([{id: 'end-connection', label: 'End'}]);
    const onAction = jest.fn((actionId: string) =>
      actionId === 'start-connection'
        ? {command: 'start' as const, edgeMode: 'normal' as const}
        : {command: 'complete' as const},
    );
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction}}
        eventHandlers={{onEdgeConnected}}
        graph={makeGraph({boundarySubsystem: boundary, modules: [module]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    const boundaryNode = latestReactFlowProps.current?.nodes.find(
      (node) => node.id === boundary.id,
    );
    const boundaryPort = container.querySelector('[data-port-id="in-1"]');
    const modulePort = container.querySelector('[data-port-id="m6-in"]');

    act(() => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        {
          clientX: 0,
          clientY: 0,
          preventDefault: jest.fn(),
          target: boundaryPort,
        },
        boundaryNode as never,
      );
    });
    fireEvent.click(screen.getByText('Start'));
    act(() => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        {
          clientX: 0,
          clientY: 0,
          preventDefault: jest.fn(),
          target: modulePort,
        },
        {data: module, id: module.id, type: 'module'} as never,
      );
    });
    fireEvent.click(screen.getByText('End'));

    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'data',
      edgeMode: 'normal',
      sourceNodeId: 'ss-1',
      sourcePortId: 'in-1',
      targetNodeId: 'm6',
      targetPortId: 'm6-in',
    });
  });
});

describe('subsystem boundary editability', () => {
  it('is selectable but not draggable or deletable in edit mode', () => {
    render(
      <UsecaseVisualizer
        graph={makeGraph({boundarySubsystem: makeBoundary()})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );

    const boundary = latestReactFlowProps.current?.nodes.find(
      (node) => node.id === 'ss-1',
    );
    expect(boundary).toEqual(
      expect.objectContaining({
        deletable: false,
        draggable: false,
        selectable: true,
        type: 'subsystem-boundary',
      }),
    );
    expect(screen.getByTestId('subsystem-boundary-node')).toBeInTheDocument();
  });
});

function fakeDropEvent(
  clientX: number,
  clientY: number,
  data: string,
  types: string[] = ['application/json'],
): ReactDragEvent {
  return {
    clientX,
    clientY,
    dataTransfer: {
      getData: (type: string) => (type === 'application/json' ? data : ''),
      types,
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

describe('palette drop', () => {
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
    const subgraph = makeSubgraph('sg1', {
      height: 300,
      subgraphId: 5,
      width: 400,
      x: 0,
      y: 0,
    });
    const container = makeContainer('c1', {
      containerId: 10,
      height: 200,
      parentId: 'sg1',
      subgraphSystemId: '5',
      width: 300,
      x: 20,
      y: 30,
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph({containers: [container], subgraphs: [subgraph]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(100, 100, '{"type":"GAIN"}'),
      );
    });
    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    const payload = onNodeDropped.mock.calls[0][0];
    expect(payload.position).toEqual({x: 80, y: 70});
    expect(payload.targetContainerId).toBe('10');
    expect(payload.targetSubgraphId).toBe('5');
  });

  it('subgraph drop over container area keeps canvas position', () => {
    const onNodeDropped = jest.fn();
    const subgraph = makeSubgraph('sg1', {
      height: 300,
      subgraphId: 5,
      width: 400,
      x: 0,
      y: 0,
    });
    const container = makeContainer('c1', {
      containerId: 10,
      height: 200,
      parentId: 'sg1',
      subgraphSystemId: '5',
      width: 300,
      x: 20,
      y: 30,
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph({containers: [container], subgraphs: [subgraph]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(
          100,
          100,
          JSON.stringify({kind: 'subgraph', subgraphId: 'sg-2'}),
          ['application/json', 'application/x-audioreach-node-type-subgraph'],
        ),
      );
    });

    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    const payload = onNodeDropped.mock.calls[0][0];
    expect(payload.position).toEqual({x: 100, y: 100});
    expect(payload.targetContainerId).toBe('10');
    expect(payload.targetSubgraphId).toBe('5');
  });

  it('drop over subgraph area (not a container) fires onNodeDropped with targetSubgraphId', () => {
    const onNodeDropped = jest.fn();
    const subgraph = makeSubgraph('sg1', {
      height: 200,
      subgraphId: 5,
      width: 300,
      x: 50,
      y: 70,
    });
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
    const payload = onNodeDropped.mock.calls[0][0];
    expect(payload.position).toEqual({x: 50, y: 30});
    expect(payload.targetSubgraphId).toBe('5');
    expect(payload.targetContainerId).toBeUndefined();
  });

  it('drop over nested container uses absolute bounds and relative position', () => {
    const onNodeDropped = jest.fn();
    const subgraph = makeSubgraph('sg1', {
      height: 300,
      subgraphId: 5,
      width: 400,
      x: 100,
      y: 200,
    });
    const container = makeContainer('c1', {
      containerId: 10,
      height: 200,
      parentId: 'sg1',
      subgraphSystemId: '5',
      width: 300,
      x: 30,
      y: 40,
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph({containers: [container], subgraphs: [subgraph]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(150, 260, '{"type":"GAIN"}'),
      );
    });
    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    const payload = onNodeDropped.mock.calls[0][0];
    expect(payload.position).toEqual({x: 20, y: 20});
    expect(payload.targetContainerId).toBe('10');
    expect(payload.targetSubgraphId).toBe('5');
  });

  it('drop over generated container uses domain ids from node metadata', () => {
    const onNodeDropped = jest.fn();
    const subgraph = makeSubgraph('subgraph-sg-1', {
      height: 300,
      subgraphId: Number.NaN,
      subgraphSystemId: 'sg-1',
      width: 400,
      x: 0,
      y: 0,
    });
    const container = makeContainer('container-cont-new-1:sg-1', {
      containerId: Number.NaN,
      containerSystemId: 'cont-new-1',
      height: 200,
      parentId: 'subgraph-sg-1',
      subgraphSystemId: 'sg-1',
      width: 300,
      x: 20,
      y: 30,
    });
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodeDropped}}
        graph={makeGraph({containers: [container], subgraphs: [subgraph]})}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    act(() => {
      latestReactFlowProps.current?.onDrop?.(
        fakeDropEvent(100, 100, '{"type":"GAIN"}'),
      );
    });
    expect(onNodeDropped).toHaveBeenCalledTimes(1);
    expect(onNodeDropped.mock.calls[0][0].targetContainerId).toBe('cont-new-1');
    expect(onNodeDropped.mock.calls[0][0].targetSubgraphId).toBe('sg-1');
  });

  it('drop over generated subgraph uses the domain id from node metadata', () => {
    const onNodeDropped = jest.fn();
    const subgraph = makeSubgraph('subgraph-sg-new-1', {
      height: 200,
      subgraphId: Number.NaN,
      subgraphSystemId: 'sg-new-1',
      width: 300,
      x: 50,
      y: 70,
    });
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
    expect(onNodeDropped.mock.calls[0][0].targetSubgraphId).toBe('sg-new-1');
  });

  it('dragover with subgraph MIME hint over a subgraph calls preventDefault', () => {
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
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('dragover with subgraph MIME hint over empty canvas calls preventDefault', () => {
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

  it('dragover with subgraph MIME hint and JSON calls preventDefault once', () => {
    render(
      <UsecaseVisualizer graph={makeGraph()} mode={VISUALIZER_MODE.EDIT} />,
    );
    const evt = fakeDragOverEvent(100, 100, [
      'application/x-audioreach-node-type-subgraph',
      'application/json',
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

describe('edge connect', () => {
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
      edgeMode: 'normal',
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
      edgeMode: 'normal',
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
