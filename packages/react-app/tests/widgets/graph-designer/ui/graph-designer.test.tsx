/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {NODE_KIND, type LevelView} from '~entities/graph';

const mockWorkflowUsecaseData = {isLoading: false, resolvedData: []};
let mockVisualizerProps: MockUsecaseVisualizerProps | null = null;

interface MockUsecaseVisualizerProps {
  eventHandlers?: {
    onNodeDropped?: (payload: {
      dropData: string;
      position: {x: number; y: number};
      targetContainerId?: string;
      targetSubgraphId?: string;
    }) => void;
    onNodesDeleted?: (payload: {nodeIds: string[]}) => void;
  };
  graph?: LevelView;
}

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

jest.mock('@qualcomm-ui/react/dialog', () => {
  const React = jest.requireActual('react');
  return {
    Dialog: {
      Body: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Description: ({children}: {children: unknown}) =>
        React.createElement('p', {}, children),
      FloatingPortal: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Footer: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Heading: ({children}: {children: unknown}) =>
        React.createElement('h2', {}, children),
      IndicatorIcon: () => React.createElement('span', {}),
      Root: ({children, open}: {children: unknown; open: boolean}) =>
        open ? React.createElement('div', {}, children) : null,
    },
  };
});

jest.mock('~features/graph-designer/ui/apply-discard-controls', () => ({
  ApplyDiscardControls: ({projectId}: {projectId: string}) => (
    <div data-testid="apply-discard-controls">{projectId}</div>
  ),
}));

jest.mock('~features/usecase-selection', () => ({
  UsecaseSelectionControl: () => (
    <div data-testid="usecase-selection-control" />
  ),
  useWorkflowUsecaseData: () => mockWorkflowUsecaseData,
}));

jest.mock('~features/usecase-visualizer', () => ({
  NODE_DIMENSIONS: {
    container: {headerHeight: 32, padding: 12},
    subgraph: {headerHeight: 40, padding: 16},
    subgraphProxy: {height: 72, width: 160},
  },
  UsecaseVisualizer: (props: MockUsecaseVisualizerProps) => {
    mockVisualizerProps = props;
    return <div data-testid="usecase-visualizer" />;
  },
  VISUALIZER_MODE: {EDIT: 'edit', READONLY: 'readonly'},
}));

jest.mock('~features/search-component', () => ({
  SearchComponent: () => <div data-testid="search-component" />,
}));

jest.mock('~widgets/graph-designer/lib/level-view-layout', () => ({
  layoutLevelView: jest.fn().mockResolvedValue({
    containers: [],
    levelId: 'uc-1',
    modules: [],
    subgraphs: [],
    subsystems: [],
  }),
}));

jest.mock('~widgets/graph-designer/lib/level-view-adapter', () => ({
  buildLevelViewFromGraphData: jest.fn(() => ({
    containers: [],
    levelId: 'uc-1',
    modules: [],
    subgraphs: [],
    subsystems: [],
  })),
}));

jest.mock('~widgets/module-data-tab', () => ({
  ModuleDataTab: () => <div data-testid="module-data-tab" />,
}));

jest.mock('~widgets/project-layout/project-layout-manager', () => ({
  tabLayoutService: {
    createProjectTab: jest.fn(),
  },
}));

jest.mock('~widgets/graph-designer/ui/display-options-popover', () => ({
  DisplayOptionsPopover: () => <div data-testid="display-options-popover" />,
}));

import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  GraphDesignerStoreContext,
  type GraphDesignerStore,
} from '~features/graph-designer';
import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {SideNavProvider} from '~shared/controls/side-nav-provider';
import {logger} from '~shared/lib/logger';
import {createProjectStore, ProjectStoreContext} from '~shared/store';
import {layoutLevelView} from '~widgets/graph-designer/lib/level-view-layout';
import GraphDesigner from '~widgets/graph-designer/ui/graph-designer';

const PROJECT_ID = 'proj-1';

beforeEach(() => {
  mockVisualizerProps = null;
  jest.clearAllMocks();
});

function makeGraphData(): UsecaseGraphData {
  return {
    connections: [],
    containers: {
      'cnt-1': {
        containerId: 'cnt-1',
        moduleInstances: ['mod-1'],
        subgraphId: 'sg-1',
      },
    },
    moduleInstances: {
      'mod-1': {
        containerId: 'cnt-1',
        displayName: 'Module 1',
        inputPorts: [],
        moduleId: 'module-1',
        moduleInstanceId: 'mod-1',
        moduleName: 'Module 1',
        moduleType: '',
        outputPorts: [],
        position: {x: 0, y: 0},
        subgraphId: 'sg-1',
      },
    },
    selectedUsecases: ['uc-1'],
    subgraphs: {
      'sg-1': {
        containers: ['cnt-1'],
        subgraphId: 'sg-1',
        subgraphName: 'Subgraph 1',
        subgraphType: '',
      },
    },
    subsystems: {},
  };
}

function renderGraphDesigner(options?: {
  addModuleToEmptyCanvas?: GraphDesignerStore['addModuleToEmptyCanvas'];
  deleteContainers?: GraphDesignerStore['deleteContainers'];
  graphData?: UsecaseGraphData;
  placeSubgraphFromPalette?: GraphDesignerStore['placeSubgraphFromPalette'];
  subgraphProvenanceById?: GraphDesignerStore['subgraphProvenanceById'];
}) {
  const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
  const projectStore = createProjectStore(PROJECT_ID);
  projectStore.setState({editModeState: 'edit'});
  graphDesignerStore.setState({
    graphData: options?.graphData,
    graphDataStatus: options?.graphData ? 'ready' : 'uninitialized',
    moduleListStatus: 'ready',
    selectedUsecases: options?.graphData ? ['uc-1'] : [],
    ...(options?.subgraphProvenanceById
      ? {subgraphProvenanceById: options.subgraphProvenanceById}
      : {}),
    ...(options?.deleteContainers
      ? {deleteContainers: options.deleteContainers}
      : {}),
    ...(options?.addModuleToEmptyCanvas
      ? {addModuleToEmptyCanvas: options.addModuleToEmptyCanvas}
      : {}),
    ...(options?.placeSubgraphFromPalette
      ? {placeSubgraphFromPalette: options.placeSubgraphFromPalette}
      : {}),
  });

  const rendered = render(
    <SideNavProvider>
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <GraphDesigner
            projectId={PROJECT_ID}
            screenshotRegistry={new Map()}
            tabId="tab-1"
            usecaseData={[]}
          />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>
    </SideNavProvider>,
  );

  return {graphDesignerStore, projectStore, rendered};
}

describe('GraphDesigner — top bar', () => {
  it('mounts ApplyDiscardControls with the projectId prop', () => {
    renderGraphDesigner();

    const applyDiscardControls = screen.getByTestId('apply-discard-controls');
    expect(applyDiscardControls).toBeInTheDocument();
    expect(applyDiscardControls).toHaveTextContent(PROJECT_ID);
  });
});

describe('GraphDesigner — module drops', () => {
  it('routes module drops to the editable empty canvas when no usecase is selected', async () => {
    const addModuleToEmptyCanvas = jest
      .fn<
        ReturnType<GraphDesignerStore['addModuleToEmptyCanvas']>,
        Parameters<GraphDesignerStore['addModuleToEmptyCanvas']>
      >()
      .mockResolvedValue('mod-1');
    await act(async () => {
      renderGraphDesigner({addModuleToEmptyCanvas});
      await Promise.resolve();
    });

    await screen.findByTestId('usecase-visualizer');
    expect(screen.getByText('No usecases selected')).toBeInTheDocument();

    await act(async () => {
      mockVisualizerProps?.eventHandlers?.onNodeDropped?.({
        dropData: JSON.stringify({
          kind: 'module',
          moduleDefinitionSystemId: 'module-definition-1',
          processorSystemId: 'processor-1',
        }),
        position: {x: 10, y: 20},
      });
      await Promise.resolve();
    });

    expect(addModuleToEmptyCanvas).toHaveBeenCalledWith(
      expect.any(Function),
      'module-definition-1',
      {x: 10, y: 20},
      'processor-1',
    );
  });

  it('rejects container drops without a parent subgraph id', () => {
    const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
    const addToContainerSpy = jest.spyOn(
      graphDesignerStore.getState(),
      'addModuleToContainer',
    );
    const addToEmptyCanvasSpy = jest.spyOn(
      graphDesignerStore.getState(),
      'addModuleToEmptyCanvas',
    );
    graphDesignerStore.setState({
      levelView: {levelId: 'uc-1'},
      selectedUsecases: ['uc-1'],
    });
    const projectStore = createProjectStore(PROJECT_ID);

    render(
      <SideNavProvider>
        <ProjectStoreContext.Provider value={projectStore}>
          <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
            <GraphDesigner
              projectId={PROJECT_ID}
              screenshotRegistry={new Map()}
              tabId="tab-1"
              usecaseData={[]}
            />
          </GraphDesignerStoreContext.Provider>
        </ProjectStoreContext.Provider>
      </SideNavProvider>,
    );

    expect(mockVisualizerProps).not.toBeNull();

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodeDropped?.({
        dropData: JSON.stringify({
          kind: 'module',
          moduleDefinitionSystemId: 'module-definition-1',
          processorSystemId: 'processor-1',
        }),
        position: {x: 10, y: 20},
        targetContainerId: 'container-1',
      });
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'GraphDesigner: module drop on container missing parent subgraph id',
      {
        action: 'drop_module',
        component: 'GraphDesigner',
      },
    );
    expect(addToContainerSpy).not.toHaveBeenCalled();
    expect(addToEmptyCanvasSpy).not.toHaveBeenCalled();
  });
});

describe('GraphDesigner - subgraph drops', () => {
  it('mounts an editable drop canvas when no usecase is selected', async () => {
    const placeSubgraphFromPalette = jest
      .fn<
        ReturnType<GraphDesignerStore['placeSubgraphFromPalette']>,
        Parameters<GraphDesignerStore['placeSubgraphFromPalette']>
      >()
      .mockResolvedValue(true);
    await act(async () => {
      renderGraphDesigner({placeSubgraphFromPalette});
      await Promise.resolve();
    });

    await screen.findByTestId('usecase-visualizer');
    expect(screen.getByText('No usecases selected')).toBeInTheDocument();

    await act(async () => {
      mockVisualizerProps?.eventHandlers?.onNodeDropped?.({
        dropData: JSON.stringify({
          kind: 'subgraph',
          subgraphId: '2',
        }),
        position: {x: 35, y: 45},
      });
      await Promise.resolve();
    });

    expect(placeSubgraphFromPalette).toHaveBeenCalledWith(
      expect.any(Function),
      '2',
      {x: 35, y: 45},
    );
  });

  it('places a subgraph from a subgraph drop payload', async () => {
    jest.mocked(layoutLevelView).mockResolvedValueOnce({
      levelId: 'uc-1',
      subgraphs: [
        {
          height: 120,
          id: 'subgraph-2',
          label: 'Subgraph 2',
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphId: 2,
          width: 240,
          x: 0,
          y: 0,
        },
      ],
    });
    const placeSubgraphFromPalette = jest
      .fn<
        ReturnType<GraphDesignerStore['placeSubgraphFromPalette']>,
        Parameters<GraphDesignerStore['placeSubgraphFromPalette']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      graphData: makeGraphData(),
      placeSubgraphFromPalette,
    });

    await screen.findByTestId('usecase-visualizer');
    expect(mockVisualizerProps).not.toBeNull();

    await act(async () => {
      mockVisualizerProps?.eventHandlers?.onNodeDropped?.({
        dropData: JSON.stringify({
          kind: 'subgraph',
          subgraphId: '2',
        }),
        position: {x: 35, y: 45},
      });
      await Promise.resolve();
    });

    expect(placeSubgraphFromPalette).toHaveBeenCalledWith(
      expect.any(Function),
      '2',
      {x: 35, y: 45},
    );
    await waitFor(() => {
      expect(
        mockVisualizerProps?.graph?.subgraphProxies?.find(
          (subgraph) => subgraph.id === 'subgraph-proxy-2',
        ),
      ).toEqual(expect.objectContaining({x: 35, y: 45}));
    });
  });

  it('ignores malformed subgraph drop payloads', async () => {
    const placeSubgraphFromPalette = jest
      .fn<
        ReturnType<GraphDesignerStore['placeSubgraphFromPalette']>,
        Parameters<GraphDesignerStore['placeSubgraphFromPalette']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      graphData: makeGraphData(),
      placeSubgraphFromPalette,
    });

    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodeDropped?.({
        dropData: JSON.stringify({kind: 'subgraph'}),
        position: {x: 35, y: 45},
      });
    });

    expect(placeSubgraphFromPalette).not.toHaveBeenCalled();
  });
});

describe('GraphDesigner — enable overlay sync', () => {
  it('does not call syncEnableOverlays when graph data is ready but module definitions are not yet loaded', async () => {
    const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
    const syncSpy = jest.spyOn(
      graphDesignerStore.getState(),
      'syncEnableOverlays',
    );

    const projectStore = createProjectStore(PROJECT_ID);
    await act(async () => {
      render(
        <SideNavProvider>
          <ProjectStoreContext.Provider value={projectStore}>
            <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
              <GraphDesigner
                projectId={PROJECT_ID}
                screenshotRegistry={new Map()}
                tabId="tab-1"
                usecaseData={[]}
              />
            </GraphDesignerStoreContext.Provider>
          </ProjectStoreContext.Provider>
        </SideNavProvider>,
      );
      // Seed graph data as ready but leave moduleListStatus at 'uninitialized'.
      graphDesignerStore.setState({
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {},
          selectedUsecases: [],
          subgraphs: {},
          subsystems: {},
        },
        graphDataStatus: 'ready',
      });
    });

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('calls syncEnableOverlays once module definitions become ready after graph data', async () => {
    const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
    const syncSpy = jest.spyOn(
      graphDesignerStore.getState(),
      'syncEnableOverlays',
    );

    const projectStore = createProjectStore(PROJECT_ID);
    await act(async () => {
      render(
        <SideNavProvider>
          <ProjectStoreContext.Provider value={projectStore}>
            <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
              <GraphDesigner
                projectId={PROJECT_ID}
                screenshotRegistry={new Map()}
                tabId="tab-1"
                usecaseData={[]}
              />
            </GraphDesignerStoreContext.Provider>
          </ProjectStoreContext.Provider>
        </SideNavProvider>,
      );
      graphDesignerStore.setState({
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {},
          selectedUsecases: [],
          subgraphs: {},
          subsystems: {},
        },
        graphDataStatus: 'ready',
      });
    });

    expect(syncSpy).not.toHaveBeenCalled();

    // Definitions arrive — effect must now fire.
    await act(async () => {
      graphDesignerStore.setState({moduleListStatus: 'ready'});
    });

    expect(syncSpy).toHaveBeenCalledTimes(1);
  });
});

describe('GraphDesigner - container deletion', () => {
  it('warns before deleting a container from a palette-placed subgraph', async () => {
    const deleteContainers = jest
      .fn<
        ReturnType<GraphDesignerStore['deleteContainers']>,
        Parameters<GraphDesignerStore['deleteContainers']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      deleteContainers,
      graphData: makeGraphData(),
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodesDeleted?.({
        nodeIds: ['container-cnt-1:sg-1'],
      });
    });

    expect(
      screen.getByText('Delete container from subgraph?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This removes the container from the underlying subgraph/,
      ),
    ).toBeInTheDocument();
    expect(deleteContainers).not.toHaveBeenCalled();
  });

  it('does not delete a palette-placed container when the warning is canceled', async () => {
    const user = userEvent.setup();
    const deleteContainers = jest
      .fn<
        ReturnType<GraphDesignerStore['deleteContainers']>,
        Parameters<GraphDesignerStore['deleteContainers']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      deleteContainers,
      graphData: makeGraphData(),
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodesDeleted?.({
        nodeIds: ['container-cnt-1:sg-1'],
      });
    });
    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(deleteContainers).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Delete container from subgraph?'),
    ).not.toBeInTheDocument();
  });

  it('deletes a palette-placed container after the warning is confirmed', async () => {
    const user = userEvent.setup();
    const deleteContainers = jest
      .fn<
        ReturnType<GraphDesignerStore['deleteContainers']>,
        Parameters<GraphDesignerStore['deleteContainers']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      deleteContainers,
      graphData: makeGraphData(),
      subgraphProvenanceById: {'sg-1': 'palette-placed'},
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodesDeleted?.({
        nodeIds: ['container-cnt-1:sg-1'],
      });
    });
    await user.click(screen.getByRole('button', {name: 'Delete container'}));

    await waitFor(() => {
      expect(deleteContainers).toHaveBeenCalledWith(expect.any(Function), [
        'cnt-1',
      ]);
    });
  });

  it('deletes a non-palette container without showing the warning', async () => {
    const deleteContainers = jest
      .fn<
        ReturnType<GraphDesignerStore['deleteContainers']>,
        Parameters<GraphDesignerStore['deleteContainers']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      deleteContainers,
      graphData: makeGraphData(),
      subgraphProvenanceById: {'sg-1': 'pre-loaded'},
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodesDeleted?.({
        nodeIds: ['container-cnt-1:sg-1'],
      });
    });

    await waitFor(() => {
      expect(deleteContainers).toHaveBeenCalledWith(expect.any(Function), [
        'cnt-1',
      ]);
    });
    expect(
      screen.queryByText('Delete container from subgraph?'),
    ).not.toBeInTheDocument();
  });

  it('deletes multiple non-palette containers through one batch call', async () => {
    const graphData = makeGraphData();
    const deleteContainers = jest
      .fn<
        ReturnType<GraphDesignerStore['deleteContainers']>,
        Parameters<GraphDesignerStore['deleteContainers']>
      >()
      .mockResolvedValue(true);
    renderGraphDesigner({
      deleteContainers,
      graphData: {
        ...graphData,
        containers: {
          'cnt-1': {
            containerId: 'cnt-1',
            moduleInstances: ['mod-1'],
            subgraphId: 'sg-1',
          },
          'cnt-2': {
            containerId: 'cnt-2',
            moduleInstances: ['mod-2'],
            subgraphId: 'sg-1',
          },
        },
        moduleInstances: {
          'mod-1': {
            ...graphData.moduleInstances['mod-1'],
            containerId: 'cnt-1',
            moduleInstanceId: 'mod-1',
          },
          'mod-2': {
            ...graphData.moduleInstances['mod-1'],
            containerId: 'cnt-2',
            moduleInstanceId: 'mod-2',
          },
        },
      },
      subgraphProvenanceById: {'sg-1': 'pre-loaded'},
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodesDeleted?.({
        nodeIds: ['container-cnt-1:sg-1', 'container-cnt-2:sg-1'],
      });
    });

    await waitFor(() => {
      expect(deleteContainers).toHaveBeenCalledWith(expect.any(Function), [
        'cnt-1',
        'cnt-2',
      ]);
    });
  });
});
