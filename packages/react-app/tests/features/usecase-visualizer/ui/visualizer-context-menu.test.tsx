/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';
import {type LucideIcon, Settings} from 'lucide-react';

import type {
  ContextMenuItem,
  ContextMenuTarget,
  LevelView,
  ModuleNode,
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

jest.mock('@qualcomm-ui/react-core/portal', () => ({
  Portal: ({children}: {children: ReactNode}) => <>{children}</>,
}));

const mockMenuRootProps: {
  current: {
    positioning?: {
      getAnchorRect?: () => {x: number; y: number};
    };
  } | null;
} = {current: null};

jest.mock('@qualcomm-ui/react/menu', () => {
  const Root = ({
    children,
    positioning,
  }: {
    children: ReactNode;
    positioning?: {getAnchorRect?: () => {x: number; y: number}};
  }) => {
    mockMenuRootProps.current = {positioning};
    return <div data-testid="menu-root">{children}</div>;
  };
  const passthrough = ({children}: {children: ReactNode}) => <>{children}</>;
  const Item = ({
    children,
    disabled,
    onSelect,
    title,
    value,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
    title?: string;
    value: string;
  }) => (
    <button
      data-menu-item={value}
      disabled={disabled}
      onClick={() => onSelect?.()}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
  const ItemStartIcon = ({icon: Icon}: {icon: LucideIcon}) => (
    <span
      data-icon={Icon.displayName ?? (Icon as {name?: string}).name}
      data-testid="menu-item-icon"
    />
  );
  const Separator = () => <hr data-testid="menu-separator" />;
  const TriggerItem = ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => <div data-menu-trigger-item={value}>{children}</div>;
  return {
    Menu: {
      Content: passthrough,
      Item,
      ItemLabel: passthrough,
      ItemStartIcon,
      Positioner: passthrough,
      Root,
      Separator,
      TriggerItem,
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

function makeModule(overrides: Partial<ModuleNode> = {}): ModuleNode {
  return {
    height: 100,
    id: 'm-1',
    label: 'Gain',
    moduleId: 42,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [{id: 'p1', portIoType: 'input'}],
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeGraph(modules: ModuleNode[]): LevelView {
  return {levelId: 'root', modules};
}

function fakeEvent(target?: Element) {
  return {
    clientX: 120,
    clientY: 80,
    preventDefault: jest.fn(),
    target: target ?? document.body,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  latestReactFlowProps.current = null;
  mockMenuRootProps.current = null;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('context menu', () => {
  it('calls getItems with {kind:"module", node} on node right-click', async () => {
    const getItems = jest.fn<ContextMenuItem[], [ContextMenuTarget]>(() => []);
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(getItems).toHaveBeenCalledWith({kind: 'module', node});
  });

  it('calls getItems with port target when right-clicking a port handle', async () => {
    const getItems = jest.fn<ContextMenuItem[], [ContextMenuTarget]>(() => []);
    const node = makeModule({ports: [{id: 'p1', portIoType: 'input'}]});
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        graph={makeGraph([node])}
      />,
    );

    const portEl = container.querySelector('[data-port-id="p1"]');
    expect(portEl).not.toBeNull();
    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(portEl as Element),
        {data: node, id: node.id, type: 'module'},
      );
    });

    expect(getItems).toHaveBeenCalledWith({
      connectionInProgress: false,
      kind: 'port',
      nodeId: node.id,
      port: {id: 'p1', portIoType: 'input'},
    });
  });

  it('calls getItems with connectionInProgress true after start action', async () => {
    const getItems = jest.fn<ContextMenuItem[], [ContextMenuTarget]>(() => [
      {id: 'start-connection', label: 'Start connection'},
    ]);
    const node = makeModule({ports: [{id: 'p1', portIoType: 'input'}]});
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        graph={makeGraph([node])}
      />,
    );

    const portEl = container.querySelector('[data-port-id="p1"]');
    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(portEl as Element),
        {data: node, id: node.id, type: 'module'},
      );
    });
    fireEvent.click(screen.getByText('Start connection'));
    getItems.mockClear();

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(portEl as Element),
        {data: node, id: node.id, type: 'module'},
      );
    });

    expect(getItems).toHaveBeenCalledWith({
      connectionInProgress: true,
      kind: 'port',
      nodeId: node.id,
      port: {id: 'p1', portIoType: 'input'},
    });
  });

  it('handles end-connection inside the visualizer', async () => {
    const onAction = jest.fn();
    const onEdgeConnected = jest.fn();
    const getItems = jest
      .fn<ContextMenuItem[], [ContextMenuTarget]>()
      .mockReturnValueOnce([{id: 'start-connection', label: 'Start'}])
      .mockReturnValueOnce([{id: 'end-connection', label: 'End'}]);
    const source = makeModule({
      id: 'source',
      ports: [{id: 'out', portIoType: 'output'}],
    });
    const target = makeModule({
      id: 'target',
      ports: [{id: 'in', portIoType: 'input'}],
    });
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction}}
        eventHandlers={{onEdgeConnected}}
        graph={makeGraph([source, target])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(container.querySelector('[data-port-id="out"]') as Element),
        {data: source, id: source.id, type: 'module'},
      );
    });
    fireEvent.click(screen.getByText('Start'));
    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(container.querySelector('[data-port-id="in"]') as Element),
        {data: target, id: target.id, type: 'module'},
      );
    });
    fireEvent.click(screen.getByText('End'));

    expect(onAction).not.toHaveBeenCalled();
    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'data',
      sourceNodeId: 'source',
      sourcePortId: 'out',
      targetNodeId: 'target',
      targetPortId: 'in',
    });
  });

  it('cancels an active two-click connection on Escape without connecting', async () => {
    const getItems = jest.fn<ContextMenuItem[], [ContextMenuTarget]>(
      (target) =>
        target.kind === 'port' && target.connectionInProgress
          ? [{id: 'end-connection', label: 'End'}]
          : [{id: 'start-connection', label: 'Start'}],
    );
    const onEdgeConnected = jest.fn();
    const source = makeModule({
      id: 'source',
      ports: [{id: 'out', portIoType: 'output'}],
    });
    const target = makeModule({
      id: 'target',
      ports: [{id: 'in', portIoType: 'input'}],
    });
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        eventHandlers={{onEdgeConnected}}
        graph={makeGraph([source, target])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(container.querySelector('[data-port-id="out"]') as Element),
        {data: source, id: source.id, type: 'module'},
      );
    });
    fireEvent.click(screen.getByText('Start'));

    fireEvent.keyDown(container.firstElementChild ?? container, {
      key: 'Escape',
    });

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(container.querySelector('[data-port-id="in"]') as Element),
        {data: target, id: target.id, type: 'module'},
      );
    });

    expect(getItems).toHaveBeenLastCalledWith({
      connectionInProgress: false,
      kind: 'port',
      nodeId: target.id,
      port: {id: 'in', portIoType: 'input'},
    });
    expect(onEdgeConnected).not.toHaveBeenCalled();
  });

  it('marks the source port while a two-click connection is active', async () => {
    const node = makeModule({
      id: 'source',
      ports: [{id: 'out', portIoType: 'output'}],
    });
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [{id: 'start-connection', label: 'Start'}],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    const portEl = container.querySelector('[data-port-id="out"]');
    expect(portEl).not.toHaveAttribute('data-connection-source', 'true');

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(portEl as Element),
        {data: node, id: node.id, type: 'module'},
      );
    });
    fireEvent.click(screen.getByText('Start'));

    const activePortEl = container.querySelector('[data-port-id="out"]');
    expect(activePortEl).toHaveAttribute('data-connection-source', 'true');
    expect(activePortEl?.className).toContain('port-handle-connection-source');
  });

  it('renders returned items and fires onAction + closes on click', async () => {
    const onAction = jest.fn();
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [
            {id: 'configure', label: 'Configure'},
            {id: 'delete', label: 'Delete'},
          ],
          onAction,
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.getByText('Configure')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Configure'));
    expect(onAction).toHaveBeenCalledWith('configure', {
      kind: 'module',
      node,
    });
    expect(screen.queryByTestId('menu-root')).not.toBeInTheDocument();
  });

  it('positions the menu at the right-click coordinates', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [{id: 'delete', label: 'Delete'}],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(mockMenuRootProps.current?.positioning?.getAnchorRect?.()).toEqual({
      x: 120,
      y: 80,
    });
  });

  it('renders a separator before items with dividerBefore', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [
            {id: 'a', label: 'A'},
            {dividerBefore: true, id: 'b', label: 'B'},
          ],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.getByTestId('menu-separator')).toBeInTheDocument();
  });

  it('disables items flagged disabled', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [{disabled: true, id: 'a', label: 'A'}],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.getByText('A').closest('button')).toBeDisabled();
  });

  it('renders no menu when getItems returns []', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{getItems: () => [], onAction: jest.fn()}}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.queryByTestId('menu-root')).not.toBeInTheDocument();
  });

  it('does not open a menu for a locked node', async () => {
    const getItems = jest.fn(() => [{id: 'a', label: 'A'}]);
    const node = makeModule({locked: true});
    render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(getItems).not.toHaveBeenCalled();
    expect(screen.queryByTestId('menu-root')).not.toBeInTheDocument();
  });

  it('does not open a menu for a locked port', async () => {
    const getItems = jest.fn(() => [{id: 'a', label: 'A'}]);
    const node = makeModule({
      ports: [{id: 'p1', locked: true, portIoType: 'input'}],
    });
    const {container} = render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        graph={makeGraph([node])}
      />,
    );

    const portEl = container.querySelector('[data-port-id="p1"]');
    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(
        fakeEvent(portEl as Element),
        {data: node, id: node.id, type: 'module'},
      );
    });

    expect(getItems).not.toHaveBeenCalled();
  });

  it('passes the right-clicked node as target regardless of selection', async () => {
    const getItems = jest.fn<ContextMenuItem[], [ContextMenuTarget]>(() => []);
    const a = makeModule({id: 'm-a'});
    const b = makeModule({id: 'm-b'});
    render(
      <UsecaseVisualizer
        contextMenu={{getItems, onAction: jest.fn()}}
        graph={makeGraph([a, b])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onSelectionChange?.({
        edges: [],
        nodes: [
          {data: a, id: 'm-a', type: 'module'},
          {data: b, id: 'm-b', type: 'module'},
        ],
      });
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: b,
        id: 'm-b',
        type: 'module',
      });
    });

    expect(getItems).toHaveBeenCalledWith({kind: 'module', node: b});
  });

  it('renders an icon when item.icon is set', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [{icon: Settings, id: 'cfg', label: 'Configure'}],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.getByTestId('menu-item-icon')).toBeInTheDocument();
  });

  it('renders tooltip as title attribute on leaf items', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [
            {id: 'cfg', label: 'Configure', tooltip: 'Open settings'},
          ],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.getByText('Configure').closest('button')).toHaveAttribute(
      'title',
      'Open settings',
    );
  });

  it('renders submenu parent as TriggerItem, not a button', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [
            {
              children: [{id: 'child', label: 'Child'}],
              id: 'parent',
              label: 'Parent',
            },
          ],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(
      document.querySelector('[data-menu-trigger-item="parent"]'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-menu-item="parent"]')).toBeNull();
  });

  it('fires onAction with child id when a nested leaf is clicked', async () => {
    const onAction = jest.fn();
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [
            {
              children: [{id: 'child', label: 'Child Action'}],
              id: 'parent',
              label: 'Parent',
            },
          ],
          onAction,
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    fireEvent.click(screen.getByText('Child Action'));
    expect(onAction).toHaveBeenCalledWith('child', {kind: 'module', node});
    expect(screen.queryByTestId('menu-root')).not.toBeInTheDocument();
  });

  it('renders a separator before a submenu parent with dividerBefore', async () => {
    const node = makeModule();
    render(
      <UsecaseVisualizer
        contextMenu={{
          getItems: () => [
            {id: 'a', label: 'A'},
            {
              children: [{id: 'c', label: 'C'}],
              dividerBefore: true,
              id: 'b',
              label: 'B',
            },
          ],
          onAction: jest.fn(),
        }}
        graph={makeGraph([node])}
      />,
    );

    await act(async () => {
      latestReactFlowProps.current?.onNodeContextMenu?.(fakeEvent(), {
        data: node,
        id: node.id,
        type: 'module',
      });
    });

    expect(screen.getByTestId('menu-separator')).toBeInTheDocument();
  });
});
