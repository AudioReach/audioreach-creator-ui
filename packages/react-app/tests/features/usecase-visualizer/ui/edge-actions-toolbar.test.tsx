/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';
import {Trash2} from 'lucide-react';

import type {DataLink} from '~entities/graph';
import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import {EdgeActionsToolbar} from '~features/usecase-visualizer/ui/edge-actions-toolbar';

jest.mock('@xyflow/react', () => {
  const base =
    require('../test-utils/xyflow-mock-factory').createXyflowMockFactory();
  return base;
});

jest.mock('@qualcomm-ui/react/button', () => {
  const React = jest.requireActual('react');
  return {
    Button: ({children, ...props}: {children: ReactNode}) =>
      React.createElement('button', props, children),
    IconButton: ({children: _children, ...props}: Record<string, unknown>) =>
      React.createElement('button', props),
  };
});

function makeDataLink(overrides: Partial<DataLink> = {}): DataLink {
  return {
    edgeKind: 'data',
    id: 'edge-1',
    sourceNodeId: 'source',
    sourcePortId: 'out',
    targetNodeId: 'target',
    targetPortId: 'in',
    ...overrides,
  };
}

function renderToolbar({
  edge = makeDataLink(),
  mode = 'edit',
  selected = true,
}: {
  edge?: DataLink;
  mode?: 'edit' | 'readonly';
  selected?: boolean;
} = {}) {
  const store = createVisualizerStore();
  const getItems = jest.fn(() => [
    {icon: Trash2, id: 'delete', label: 'Delete'},
  ]);
  const onAction = jest.fn();
  store.setState({
    contextMenu: {
      getItems,
      onAction,
    },
    mode,
  });

  render(
    <VisualizerStoreProvider store={store}>
      <EdgeActionsToolbar
        edge={edge}
        edgeId={edge.id}
        selected={selected}
        x={50}
        y={50}
      />
    </VisualizerStoreProvider>,
  );

  return {getItems, onAction, store};
}

describe('EdgeActionsToolbar', () => {
  // Verifies that the configured edge action renders and receives the edge target.
  it('renders the configured edge action and dispatches it', () => {
    const {onAction} = renderToolbar();

    const deleteButton = screen.getByRole('button', {name: 'Delete'});
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton);

    expect(onAction).toHaveBeenCalledWith('delete', {
      edge: makeDataLink(),
      kind: 'data-link',
    });
  });

  // Verifies that edge actions are hidden outside edit mode.
  it('does not render in read-only mode', () => {
    renderToolbar({mode: 'readonly'});

    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });

  // Verifies that unselected edges do not request or render toolbar actions.
  it('does not resolve actions for an unselected edge', () => {
    const {getItems} = renderToolbar({selected: false});

    expect(getItems).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });

  // Verifies that locked edges never show the action toolbar.
  it('does not render for a locked edge', () => {
    renderToolbar({edge: makeDataLink({locked: true})});

    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });
});
