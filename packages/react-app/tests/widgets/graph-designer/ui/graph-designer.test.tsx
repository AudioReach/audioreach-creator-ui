/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {NODE_KIND, type LevelView} from '~entities/graph';

const mockWorkflowUsecaseData = {isLoading: false, resolvedData: []};
let mockVisualizerProps: MockUsecaseVisualizerProps | null = null;
const mockConnectPorts = jest.fn().mockResolvedValue(true);

interface MockUsecaseVisualizerProps {
  contextMenu?: VisualizerContextMenuConfig;
  eventHandlers?: {
    onEdgeConnected?: (payload: {
      edgeKind: 'control' | 'data';
      linkKind: 'EC' | 'interUsecase' | 'normal';
      sourceNodeId: string;
      sourcePortId: string;
      targetNodeId: string;
      targetPortId: string;
    }) => void;
    onEdgesDeleted?: (payload: {edgeIds: string[]}) => void;
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

jest.mock('~widgets/graph-designer/lib/context-menu-config', () => ({
  buildContextMenuConfig: jest.fn(() => ({
    getItems: jest.fn(() => []),
    onAction: jest.fn(),
  })),
}));

jest.mock('~features/graph-designer/lib/link-operations', () => ({
  createLinkOperations: jest.fn(() => ({connectPorts: mockConnectPorts})),
}));

jest.mock('~features/graph-designer/lib/multi-select-delete', () => ({
  deleteSelection: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('~features/usecase-selection', () => ({
  UsecaseSelectionControl: () => (
    <div data-testid="usecase-selection-control" />
  ),
  useWorkflowUsecaseData: () => mockWorkflowUsecaseData,
}));

let capturedContextMenu: VisualizerContextMenuConfig | undefined;

const mockUsecaseVisualizer = (props: MockUsecaseVisualizerProps) => {
  mockVisualizerProps = props;
  capturedContextMenu = props.contextMenu;
  return <div data-testid="usecase-visualizer" />;
};

jest.mock('~features/usecase-visualizer', () => ({
  NODE_DIMENSIONS: {
    container: {headerHeight: 32, padding: 12},
    subgraph: {headerHeight: 40, padding: 16},
    subgraphProxy: {height: 72, width: 160},
  },
  UsecaseVisualizer: (props: MockUsecaseVisualizerProps) =>
    mockUsecaseVisualizer(props),
  VISUALIZER_MODE: {EDIT: 'edit', READONLY: 'readonly'},
}));

const mockPortConnectionsInfo: {
  close: jest.Mock;
  open: jest.Mock;
  state: {[key: string]: unknown; status: string};
} = {
  close: jest.fn(),
  open: jest.fn(),
  state: {status: 'closed'},
};

let capturedPopupProps: PortConnectionsInfoPopupProps | undefined;

const mockPortConnectionsInfoPopup = (props: PortConnectionsInfoPopupProps) => {
  capturedPopupProps = props;
  return props.open ? <div data-testid="port-connections-info-popup" /> : null;
};

jest.mock('~features/port-connections-info', () => ({
  PortConnectionsInfoPopup: (props: PortConnectionsInfoPopupProps) =>
    mockPortConnectionsInfoPopup(props),
  usePortConnectionsInfo: () => mockPortConnectionsInfo,
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

import type {UsecaseDto} from '~entities/usecases';
import {
  GraphDesignerStoreContext,
  type GraphDesignerStore,
} from '~features/graph-designer';
import {deleteSelection} from '~features/graph-designer/lib/multi-select-delete';
import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import type {PortConnectionsInfoPopupProps} from '~features/port-connections-info';
import type {
  ContextMenuTarget,
  VisualizerContextMenuConfig,
} from '~features/usecase-visualizer';
import {SideNavProvider} from '~shared/controls/side-nav-provider';
import {logger} from '~shared/lib/logger';
import {createProjectStore, ProjectStoreContext} from '~shared/store';
import {buildContextMenuConfig} from '~widgets/graph-designer/lib/context-menu-config';
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

async function renderWithGraphReady() {
  const graphDesignerStore = createGraphDesignerStore('tab-1', PROJECT_ID);
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
    // graphDataStatus: 'ready' makes Effect B build a (mocked, empty)
    // levelView; selectedUsecases non-empty clears the "No usecases
    // selected" branch — together they're what it takes to reach the
    // <UsecaseVisualizer> branch and capture its contextMenu prop.
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
      selectedUsecases: ['usecase-1'],
    });
    // Effect B's layoutLevelView(...).then(setLevelView) settles on a
    // microtask untracked by act(); staying inside this same callback
    // (rather than a later, separate act() call) keeps React's acting
    // flag on while it resolves.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return {graphDesignerStore};
}

function makePortTarget(
  activeLinks: number | undefined,
  totalLinks: number | undefined,
) {
  return {
    kind: 'port' as const,
    nodeId: 'module-1',
    port: {
      activeLinks,
      id: 'port-1',
      portIoType: 'input' as const,
      totalLinks,
    },
  };
}

function makeUsecase(systemId: string, valueLabel: string): UsecaseDto {
  return {
    changeInfo: {changeType: 'NONE'},
    keyValueCollection: [
      {
        keyInfo: {keyId: 1, keyLabel: 'DeviceRX', keySystemId: 'key-1'},
        valueInfo: {valueId: 1, valueLabel, valueSystemId: 'val-1'},
      },
    ],
    systemId,
    usecaseType: 'Regular',
  };
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
      // Effect B's layoutLevelView(...).then(setLevelView) settles on a
      // microtask untracked by act(); staying inside this same callback
      // (rather than a later, separate act() call) keeps React's acting
      // flag on while it resolves.
      await new Promise((resolve) => setTimeout(resolve, 0));
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
      // Effect B's layoutLevelView(...).then(setLevelView) settles on a
      // microtask untracked by act(); staying inside this same callback
      // (rather than a later, separate act() call) keeps React's acting
      // flag on while it resolves.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(syncSpy).not.toHaveBeenCalled();

    // Definitions arrive — effect must now fire.
    await act(async () => {
      graphDesignerStore.setState({moduleListStatus: 'ready'});
    });

    expect(syncSpy).toHaveBeenCalledTimes(1);
  });
});

describe('GraphDesigner - visualizer wiring', () => {
  it('passes a context menu config wrapping buildContextMenuConfig in edit mode', async () => {
    renderGraphDesigner({graphData: makeGraphData()});
    await screen.findByTestId('usecase-visualizer');

    expect(buildContextMenuConfig).toHaveBeenCalledWith(expect.any(Function));
    const baseConfig = jest.mocked(buildContextMenuConfig).mock.results[0]
      .value as VisualizerContextMenuConfig;

    const moduleTarget = {
      kind: 'module',
      node: {},
    } as unknown as ContextMenuTarget;
    mockVisualizerProps?.contextMenu?.getItems(moduleTarget);
    expect(baseConfig.getItems).toHaveBeenCalledWith(moduleTarget);

    mockVisualizerProps?.contextMenu?.onAction('delete', moduleTarget);
    expect(baseConfig.onAction).toHaveBeenCalledWith('delete', moduleTarget);
  });

  it('calls deleteSelection for node delete payloads', async () => {
    const {graphDesignerStore} = renderGraphDesigner({
      graphData: makeGraphData(),
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onNodesDeleted?.({
        nodeIds: ['container-cnt-1:sg-1'],
      });
    });

    expect(deleteSelection).toHaveBeenCalledWith(
      graphDesignerStore.getState,
      ['container-cnt-1:sg-1'],
      [],
    );
  });

  it('calls deleteSelection for edge delete payloads', async () => {
    const {graphDesignerStore} = renderGraphDesigner({
      graphData: makeGraphData(),
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onEdgesDeleted?.({
        edgeIds: ['link-1'],
      });
    });

    expect(deleteSelection).toHaveBeenCalledWith(
      graphDesignerStore.getState,
      [],
      ['link-1'],
    );
  });

  it('forwards link kind from visualizer edge events to link operations', async () => {
    mockConnectPorts.mockClear();
    const {graphDesignerStore} = renderGraphDesigner({
      graphData: makeGraphData(),
    });
    await screen.findByTestId('usecase-visualizer');

    act(() => {
      mockVisualizerProps?.eventHandlers?.onEdgeConnected?.({
        edgeKind: 'data',
        linkKind: 'EC',
        sourceNodeId: 'source',
        sourcePortId: 'out',
        targetNodeId: 'target',
        targetPortId: 'in',
      });
    });

    expect(mockConnectPorts).toHaveBeenCalledWith(
      graphDesignerStore.getState,
      'source',
      'out',
      'target',
      'in',
      'data',
      'EC',
    );
  });
});

describe('GraphDesigner — port connections context-menu gate', () => {
  beforeEach(() => {
    capturedContextMenu = undefined;
    mockPortConnectionsInfo.open.mockClear();
    mockPortConnectionsInfo.close.mockClear();
    mockPortConnectionsInfo.state = {status: 'closed'};
  });

  it('offers "Show all connections" when activeLinks < totalLinks', async () => {
    await renderWithGraphReady();

    expect(capturedContextMenu).toBeDefined();
    expect(capturedContextMenu!.getItems(makePortTarget(1, 3))).toEqual([
      {id: 'show-all-connections', label: 'Show all connections'},
    ]);
  });

  it('returns no items when activeLinks equals totalLinks', async () => {
    await renderWithGraphReady();

    expect(capturedContextMenu!.getItems(makePortTarget(3, 3))).toEqual([]);
  });

  it('returns no items when totalLinks is undefined', async () => {
    await renderWithGraphReady();

    expect(capturedContextMenu!.getItems(makePortTarget(0, undefined))).toEqual(
      [],
    );
  });

  it('returns no items for a non-port target', async () => {
    await renderWithGraphReady();

    const target = {kind: 'module', node: {}} as unknown as ContextMenuTarget;
    expect(capturedContextMenu!.getItems(target)).toEqual([]);
  });

  it('calls open with the target nodeId/port on show-all-connections', async () => {
    await renderWithGraphReady();

    const target = makePortTarget(1, 3);
    capturedContextMenu!.onAction('show-all-connections', target);

    expect(mockPortConnectionsInfo.open).toHaveBeenCalledWith(
      'module-1',
      target.port,
    );
  });
});

describe('GraphDesigner — pre-open loading overlay', () => {
  beforeEach(() => {
    capturedContextMenu = undefined;
    mockPortConnectionsInfo.open.mockClear();
    mockPortConnectionsInfo.close.mockClear();
    mockPortConnectionsInfo.state = {status: 'closed'};
  });

  it('shows the "Loading connections…" overlay while status is loading-links', async () => {
    mockPortConnectionsInfo.state = {
      componentSystemId: 'module-1',
      portSystemId: 'port-1',
      status: 'loading-links',
    };

    await renderWithGraphReady();

    expect(screen.getByText('Loading connections…')).toBeInTheDocument();
  });

  it('does not show the overlay when status is closed', async () => {
    await renderWithGraphReady();

    expect(screen.queryByText('Loading connections…')).not.toBeInTheDocument();
  });
});

describe('GraphDesigner — PortConnectionsInfoPopup wiring', () => {
  beforeEach(() => {
    capturedPopupProps = undefined;
    mockPortConnectionsInfo.open.mockClear();
    mockPortConnectionsInfo.close.mockClear();
    mockPortConnectionsInfo.state = {status: 'closed'};
  });

  it('passes state, onClose, and isReadonly through to the popup', async () => {
    mockPortConnectionsInfo.state = {
      componentSystemId: 'module-1',
      portSystemId: 'port-1',
      rows: [],
      status: 'ready',
    };

    await renderWithGraphReady();

    expect(capturedPopupProps?.open).toBe(true);
    expect(capturedPopupProps?.state).toBe(mockPortConnectionsInfo.state);
    expect(capturedPopupProps?.isReadonly).toBe(true); // editModeState defaults to 'view'

    capturedPopupProps!.onClose();
    expect(mockPortConnectionsInfo.close).toHaveBeenCalledTimes(1);
  });

  it('resolveSubgraphDisplay maps a subgraph systemId to its subgraphId', async () => {
    const {graphDesignerStore} = await renderWithGraphReady();
    act(() => {
      graphDesignerStore.setState({
        subgraphList: [
          {
            category: '',
            description: '',
            subgraphId: 'sg-42',
            subgraphName: 'Playback',
            subgraphType: 'Static',
            systemId: 'sg-system-1',
          },
        ],
      });
    });

    expect(capturedPopupProps!.resolveSubgraphDisplay('sg-system-1')).toBe(
      'sg-42',
    );
    // Falls back to the raw systemId when there's no match (design.md
    // "Error Handling" — a lookup miss is not an error).
    expect(capturedPopupProps!.resolveSubgraphDisplay('unknown-sg')).toBe(
      'unknown-sg',
    );
  });

  it('onAdd merges formatted usecases into the existing selection without duplicates', async () => {
    const {graphDesignerStore} = await renderWithGraphReady();
    // selectedUsecases is an Effect B dependency, so each change below
    // re-triggers layoutLevelView(...).then(setLevelView); flush inside the
    // same act() callback so that untracked update lands before act() exits.
    await act(async () => {
      graphDesignerStore.setState({selectedUsecases: ['BT_Rx']});
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      capturedPopupProps!.onAdd([
        makeUsecase('uc-1', 'BT_Rx'), // already selected — must not duplicate
        makeUsecase('uc-2', 'A2DP'),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(graphDesignerStore.getState().selectedUsecases).toEqual([
      'BT_Rx',
      'A2DP',
    ]);
  });

  it('onNavigate replaces the existing selection entirely', async () => {
    const {graphDesignerStore} = await renderWithGraphReady();
    // selectedUsecases is an Effect B dependency, so each change below
    // re-triggers layoutLevelView(...).then(setLevelView); flush inside the
    // same act() callback so that untracked update lands before act() exits.
    await act(async () => {
      graphDesignerStore.setState({selectedUsecases: ['BT_Rx', 'SCO']});
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      capturedPopupProps!.onNavigate([makeUsecase('uc-3', 'A2DP')]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(graphDesignerStore.getState().selectedUsecases).toEqual(['A2DP']);
  });
});

describe('GraphDesigner — port connections, end to end', () => {
  beforeEach(() => {
    capturedContextMenu = undefined;
    capturedPopupProps = undefined;
    mockPortConnectionsInfo.open.mockClear();
    mockPortConnectionsInfo.close.mockClear();
    mockPortConnectionsInfo.state = {status: 'closed'};
  });

  it('right-click gate opens the fetch, overlay shows, then the popup opens', async () => {
    const {graphDesignerStore} = await renderWithGraphReady();

    // 1. User right-clicks a partially-covered port — the gate offers the item.
    const target = {
      kind: 'port' as const,
      nodeId: 'module-1',
      port: {
        activeLinks: 1,
        id: 'port-1',
        portIoType: 'input' as const,
        totalLinks: 3,
      },
    };
    expect(capturedContextMenu!.getItems(target)).toEqual([
      {id: 'show-all-connections', label: 'Show all connections'},
    ]);

    // 2. Clicking it calls open() — simulate the resulting 'loading-links'
    //    state landing back on the store-backed mock, then re-render.
    capturedContextMenu!.onAction('show-all-connections', target);
    expect(mockPortConnectionsInfo.open).toHaveBeenCalledWith(
      'module-1',
      target.port,
    );

    mockPortConnectionsInfo.state = {
      componentSystemId: 'module-1',
      portSystemId: 'port-1',
      status: 'loading-links',
    };
    // selectedUsecases is an Effect B dependency, so this re-triggers
    // layoutLevelView(...).then(setLevelView); flush inside the same act()
    // callback so that untracked update lands before act() exits.
    await act(async () => {
      graphDesignerStore.setState({
        selectedUsecases: ['usecase-1', 'usecase-2'],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Loading connections…')).toBeInTheDocument();
    expect(
      screen.queryByTestId('port-connections-info-popup'),
    ).not.toBeInTheDocument();

    // 3. Fetch succeeds — overlay disappears, popup opens.
    mockPortConnectionsInfo.state = {
      componentSystemId: 'module-1',
      portSystemId: 'port-1',
      rows: [],
      status: 'ready',
    };
    await act(async () => {
      graphDesignerStore.setState({selectedUsecases: ['usecase-1']});
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText('Loading connections…')).not.toBeInTheDocument();
    expect(capturedPopupProps?.open).toBe(true);
    expect(capturedPopupProps?.state).toBe(mockPortConnectionsInfo.state);
  });
});
