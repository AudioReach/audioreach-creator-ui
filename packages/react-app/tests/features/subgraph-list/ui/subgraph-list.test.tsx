/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('@qualcomm-ui/react/button', () => {
  const React = jest.requireActual('react');
  return {
    Button: ({
      children,
      emphasis: _emphasis,
      size: _size,
      variant: _variant,
      ...props
    }: {
      children: unknown;
      emphasis?: unknown;
      onClick?: () => void;
      size?: unknown;
      variant?: unknown;
    }) => React.createElement('button', props, children),
  };
});

jest.mock('@qualcomm-ui/react/inline-icon-button', () => {
  const React = jest.requireActual('react');
  return {
    InlineIconButton: ({
      'aria-label': ariaLabelAttr,
      ariaLabel,
      className,
      icon: Icon,
      onClick,
      size: _size,
    }: {
      'aria-label'?: string;
      ariaLabel?: string;
      className?: string;
      icon: React.ComponentType<{className?: string}>;
      onClick?: () => void;
      size?: unknown;
    }) =>
      React.createElement(
        'button',
        {
          'aria-label': ariaLabelAttr ?? ariaLabel,
          className,
          onClick,
          type: 'button',
        },
        React.createElement(Icon, {'aria-hidden': true}),
      ),
  };
});

jest.mock('@qualcomm-ui/react/popover', () => {
  const React = jest.requireActual('react');
  return {
    Popover: ({children, trigger}: {children: unknown; trigger: unknown}) =>
      React.createElement(
        React.Fragment,
        {},
        trigger,
        React.createElement('div', {}, children),
      ),
  };
});

jest.mock('@qualcomm-ui/react/text-input', () => {
  const React = jest.requireActual('react');
  return {
    TextInput: ({
      onValueChange,
      startIcon: _startIcon,
      value,
      ...props
    }: {
      onValueChange?: (value: string) => void;
      startIcon?: unknown;
      value?: string;
    }) =>
      React.createElement('input', {
        ...props,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          onValueChange?.(event.target.value),
        value,
      }),
  };
});

jest.mock('@qualcomm-ui/react/tooltip', () => {
  const React = jest.requireActual('react');
  return {
    Tooltip: ({children, trigger}: {children: unknown; trigger: unknown}) =>
      React.createElement(
        React.Fragment,
        {},
        trigger,
        React.createElement('span', {role: 'tooltip'}, children),
      ),
  };
});

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import {GraphDesignerStoreContext} from '~features/graph-designer/model/graph-designer-store-context';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {SubgraphList} from '~features/subgraph-list';
import {
  DEFAULT_USER_PREFERENCES,
  WORKFLOW_LEVELS,
  WORKFLOW_TYPES,
  type WorkflowLevel,
  type WorkflowType,
} from '~shared/config/user-preferences-types';
import {createProjectStore, ProjectStoreContext} from '~shared/store';

const PROJECT_ID = 'proj-1';

function makeGraphDataWithSubgraph(subgraphId: string): UsecaseGraphData {
  return {
    connections: [],
    containers: {},
    moduleInstances: {},
    selectedUsecases: ['uc-1'],
    subgraphs: {
      [subgraphId]: {
        containers: [],
        subgraphId,
        subgraphName: 'Already Present',
        subgraphType: 'stream',
      },
    },
    subsystems: {},
  };
}

function renderSubgraphList(options: {
  editModeState: 'edit' | 'view';
  graphData?: UsecaseGraphData;
  workflowLevel?: WorkflowLevel;
  workflowType?: WorkflowType;
}) {
  const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
  const projectStore = createProjectStore(PROJECT_ID);
  projectStore.setState({
    editModeState: options.editModeState,
    userPreferences: {
      ...DEFAULT_USER_PREFERENCES,
      usecases: {
        ...DEFAULT_USER_PREFERENCES.usecases,
        workflowLevel:
          options.workflowLevel ?? DEFAULT_USER_PREFERENCES.usecases.workflowLevel,
        workflowType:
          options.workflowType ?? DEFAULT_USER_PREFERENCES.usecases.workflowType,
      },
    },
  });
  graphDesignerStore.setState({
    graphData: options.graphData ?? null,
    graphDataStatus: options.graphData ? 'ready' : 'uninitialized',
    selectedSubgraphTypes: ['stream'],
    subgraphList: [
      {
        category: '',
        description: 'Subgraph description',
        subgraphId: 'sg-1',
        subgraphName: 'Stream Subgraph',
        subgraphType: 'stream',
      },
    ],
    subgraphListStatus: 'ready',
  });

  render(
    <ProjectStoreContext.Provider value={projectStore}>
      <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
        <SubgraphList />
      </GraphDesignerStoreContext.Provider>
    </ProjectStoreContext.Provider>,
  );
}

describe('SubgraphList drag source', () => {
  it('marks an available subgraph as draggable in edit mode', () => {
    renderSubgraphList({editModeState: 'edit'});

    const row = screen.getByText('Stream Subgraph').closest('li');
    expect(row).toHaveAttribute('draggable', 'true');
  });

  it('writes the subgraph payload and MIME sentinel on drag start', () => {
    renderSubgraphList({editModeState: 'edit'});
    const row = screen.getByText('Stream Subgraph').closest('li');
    expect(row).not.toBeNull();
    const dataTransfer = {
      effectAllowed: 'none',
      setData: jest.fn(),
    };

    fireEvent.dragStart(row!, {
      dataTransfer,
    });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'application/json',
      JSON.stringify({kind: 'subgraph', subgraphId: 'sg-1'}),
    );
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'application/x-audioreach-node-type-subgraph',
      '',
    );
    expect(dataTransfer.effectAllowed).toBe('copy');
  });

  it('does not make subgraph rows draggable in view mode', () => {
    renderSubgraphList({editModeState: 'view'});

    const row = screen.getByText('Stream Subgraph').closest('li');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Switch to edit mode to drag subgraphs',
    );
  });

  it('disables subgraph rows in subsystem level', () => {
    renderSubgraphList({
      editModeState: 'edit',
      workflowLevel: WORKFLOW_LEVELS.SUBSYSTEM,
    });

    const row = screen.getByText('Stream Subgraph').closest('li');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Subgraphs cannot be dragged in subsystem level',
    );
  });

  it('disables subgraph rows in system workflow', () => {
    renderSubgraphList({
      editModeState: 'edit',
      workflowType: WORKFLOW_TYPES.SYSTEM,
    });

    const row = screen.getByText('Stream Subgraph').closest('li');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Subgraphs cannot be dragged in system workflow',
    );
  });

  it('disables a subgraph already present on the canvas', async () => {
    renderSubgraphList({
      editModeState: 'edit',
      graphData: makeGraphDataWithSubgraph('sg-1'),
    });

    const row = screen.getByText('Stream Subgraph').closest('li');
    expect(row).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Already present on the canvas',
    );
    await waitFor(() => {
      expect(row).toHaveClass('opacity-50');
    });
  });

  it('keeps present-subgraph state isolated across two open projects', () => {
    // Regression test: presentSubgraphIds must be derived per store instance,
    // not from a cache shared across every open GraphDesignerStore — otherwise
    // whichever tab renders last clobbers the "already present" state seen by
    // every other open project's palette.
    const storeA = createGraphDesignerStore('tab-a', 'proj-a');
    const projectStoreA = createProjectStore('proj-a');
    projectStoreA.setState({editModeState: 'edit'});
    storeA.setState({
      graphData: makeGraphDataWithSubgraph('sg-1'),
      graphDataStatus: 'ready',
      selectedSubgraphTypes: ['stream'],
      subgraphList: [
        {
          category: '',
          description: 'Subgraph description',
          subgraphId: 'sg-1',
          subgraphName: 'Stream Subgraph',
          subgraphType: 'stream',
        },
      ],
      subgraphListStatus: 'ready',
    });

    const storeB = createGraphDesignerStore('tab-b', 'proj-b');
    const projectStoreB = createProjectStore('proj-b');
    projectStoreB.setState({editModeState: 'edit'});
    storeB.setState({
      graphData: null,
      graphDataStatus: 'uninitialized',
      selectedSubgraphTypes: ['stream'],
      subgraphList: [
        {
          category: '',
          description: 'Subgraph description',
          subgraphId: 'sg-1',
          subgraphName: 'Stream Subgraph',
          subgraphType: 'stream',
        },
      ],
      subgraphListStatus: 'ready',
    });

    render(
      <>
        <ProjectStoreContext.Provider value={projectStoreA}>
          <GraphDesignerStoreContext.Provider value={storeA}>
            <div data-testid="project-a">
              <SubgraphList />
            </div>
          </GraphDesignerStoreContext.Provider>
        </ProjectStoreContext.Provider>
        <ProjectStoreContext.Provider value={projectStoreB}>
          <GraphDesignerStoreContext.Provider value={storeB}>
            <div data-testid="project-b">
              <SubgraphList />
            </div>
          </GraphDesignerStoreContext.Provider>
        </ProjectStoreContext.Provider>
      </>,
    );

    const rowA = screen
      .getByTestId('project-a')
      .querySelector('li[aria-disabled]');
    const rowB = screen
      .getByTestId('project-b')
      .querySelector('li[aria-disabled]');

    // Project A already has sg-1 on canvas — disabled.
    expect(rowA).toHaveAttribute('aria-disabled', 'true');
    expect(rowA).toHaveAttribute('draggable', 'false');
    // Project B has no graph data yet — sg-1 is not present, so draggable.
    expect(rowB).toHaveAttribute('aria-disabled', 'false');
    expect(rowB).toHaveAttribute('draggable', 'true');
  });
});
