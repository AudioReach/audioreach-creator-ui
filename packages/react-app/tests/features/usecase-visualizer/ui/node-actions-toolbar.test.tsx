/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';
import {Trash2} from 'lucide-react';

import type {ModuleNode} from '~entities/graph';
import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import {NodeActionsToolbar} from '~features/usecase-visualizer/ui/node-actions-toolbar';

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

function makeModule(): ModuleNode {
  return {
    height: 100,
    id: 'module-1',
    label: 'Gain',
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
  };
}

// Renders the toolbar against a store whose context menu offers a Delete action.
function renderToolbar({
  mode = 'edit',
  node = makeModule(),
  selected = true,
}: {
  mode?: 'edit' | 'readonly';
  node?: ModuleNode;
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
      <NodeActionsToolbar node={node} selected={selected} />
    </VisualizerStoreProvider>,
  );

  return {getItems, onAction, store};
}

describe('NodeActionsToolbar', () => {
  // Verifies the Delete button shows and calls onAction with the module target.
  it('renders the configured module action and dispatches it', () => {
    const {onAction} = renderToolbar();

    const deleteButton = screen.getByRole('button', {name: 'Delete'});
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton);

    expect(onAction).toHaveBeenCalledWith('delete', {
      kind: 'module',
      node: makeModule(),
    });
  });

  // Verifies the toolbar is hidden outside edit mode.
  it('does not render in read-only mode', () => {
    renderToolbar({mode: 'readonly'});

    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });

  // Verifies an unselected node neither renders nor requests its actions.
  it('does not resolve actions for an unselected node', () => {
    const {getItems} = renderToolbar({selected: false});

    expect(getItems).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });

  // Verifies a locked node never shows the toolbar.
  it('does not render for a locked node', () => {
    renderToolbar({node: {...makeModule(), locked: true}});

    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });
});
