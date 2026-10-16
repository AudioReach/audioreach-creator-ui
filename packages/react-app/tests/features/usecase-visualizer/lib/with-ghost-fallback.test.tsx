/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('~features/usecase-visualizer/ui/node-actions-toolbar', () => ({
  NodeActionsToolbar: () => <div data-testid="node-toolbar" />,
  TOOLBAR_NODE_KINDS: new Set(['module']),
}));

import type {ComponentType} from 'react';

import {render, screen} from '@testing-library/react';
import {type Node, type NodeProps, ReactFlowProvider} from '@xyflow/react';

import {withGhostFallback} from '~features/usecase-visualizer/lib/with-ghost-fallback';
import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {ModuleNode} from '~features/usecase-visualizer/model/visualizer.types';

type WrappedComponent = ComponentType<
  NodeProps<Node<ModuleNode & Record<string, unknown>>>
>;

function makeModule(overrides: Partial<ModuleNode> = {}): ModuleNode {
  return {
    height: 100,
    id: 'm-1',
    label: 'Module 1',
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeNodeProps(node: ModuleNode): NodeProps {
  return {
    data: node,
    deletable: true,
    draggable: true,
    dragging: false,
    id: node.id,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selectable: true,
    selected: false,
    type: 'module',
    zIndex: 0,
  };
}

describe('withGhostFallback', () => {
  it('renders the wrapped component when lodZoom >= lodThreshold', () => {
    const Wrapped = jest.fn(() => (
      <div data-testid="wrapped">wrapped</div>
    )) as unknown as WrappedComponent;
    const Composed = withGhostFallback<ModuleNode>(Wrapped);
    const store = createVisualizerStore();
    store.getState().setLodZoom(0.5);
    store.getState().setRenderingConfig({lodThreshold: 0.4});

    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <Composed {...makeNodeProps(makeModule())} />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );

    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
    expect(screen.queryByTestId('ghost-node')).not.toBeInTheDocument();
    expect(Wrapped).toHaveBeenCalled();
  });

  it('renders GhostNode and skips the wrapped component when lodZoom < lodThreshold', () => {
    const Wrapped = jest.fn(() => (
      <div data-testid="wrapped">wrapped</div>
    )) as unknown as WrappedComponent;
    const Composed = withGhostFallback<ModuleNode>(Wrapped);
    const store = createVisualizerStore();
    store.getState().setLodZoom(0.2);
    store.getState().setRenderingConfig({lodThreshold: 0.4});

    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <Composed {...makeNodeProps(makeModule())} />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );

    expect(screen.getByTestId('ghost-node')).toBeInTheDocument();
    expect(screen.queryByTestId('wrapped')).not.toBeInTheDocument();
    expect(Wrapped).not.toHaveBeenCalled();
  });

  // Verifies that low zoom renders GhostNode without mounting the node toolbar.
  it('hides the node toolbar alongside GhostNode', () => {
    const Wrapped = jest.fn(() => (
      <div data-testid="wrapped">wrapped</div>
    )) as unknown as WrappedComponent;
    const Composed = withGhostFallback<ModuleNode>(Wrapped);
    const store = createVisualizerStore();
    store.getState().setLodZoom(0.2);
    store.getState().setRenderingConfig({lodThreshold: 0.4});

    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <Composed {...makeNodeProps(makeModule())} />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );

    expect(screen.queryByTestId('node-toolbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('ghost-node')).toBeInTheDocument();
  });

  it('renders the wrapped component when lodZoom equals lodThreshold (strict less-than)', () => {
    const Wrapped = jest.fn(() => (
      <div data-testid="wrapped">wrapped</div>
    )) as unknown as WrappedComponent;
    const Composed = withGhostFallback<ModuleNode>(Wrapped);
    const store = createVisualizerStore();
    store.getState().setLodZoom(0.4);
    store.getState().setRenderingConfig({lodThreshold: 0.4});

    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <Composed {...makeNodeProps(makeModule())} />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );

    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
    expect(screen.queryByTestId('ghost-node')).not.toBeInTheDocument();
  });
});
