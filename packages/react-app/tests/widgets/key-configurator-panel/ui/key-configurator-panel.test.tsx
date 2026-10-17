/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the Key Configurator host's rendering bridge. SGKV metadata lifecycle
 * is owned by the always-mounted Graph Designer widget, not this optional tab.
 */
const mockUseKeyConfiguratorSelectionStore = jest.fn();

jest.mock('~shared/lib/logger');
jest.mock('~shared/config/hooks', () => ({
  useUserPreferences: () => ({
    preferences: {usecases: {namePreference: 'keyvalues'}},
  }),
}));
jest.mock('~features/key-configurator/model', () => ({
  ConfigurationItemType: {
    MODULE: 'module',
    SUBGRAPH: 'subgraph',
    SUBSYSTEM: 'subsystem',
  },
  useKeyConfiguratorSelectionStore: mockUseKeyConfiguratorSelectionStore,
}));
jest.mock('~widgets/configurator-panel', () => ({
  ConfiguratorPanel: ({
    isEditable,
    renderConfigurationView,
    selectedItems,
  }: {
    isEditable?: boolean;
    renderConfigurationView?: (
      item: {name: string; systemId: string; type: string},
      isEditableParam: boolean,
    ) => React.ReactNode;
    selectedItems: Array<{name: string; systemId: string; type: string}>;
  }) => (
    <div>
      {selectedItems.map((item) => (
        <div key={item.systemId}>
          <span>{item.name}</span>
          {item.type === 'module' &&
            renderConfigurationView?.(item, Boolean(isEditable))}
        </div>
      ))}
    </div>
  ),
  ConfiguratorUtils: {},
}));
jest.mock('~features/key-configurator/module-configurator-view/ui', () => ({
  ModuleConfigurationPanel: (props: Record<string, unknown>) => {
    const {displayMode, instanceSystemId} = props as {
      displayMode: string;
      instanceSystemId: string;
    };
    return (
      <div data-testid="module-configuration-panel">
        {`${instanceSystemId}:${displayMode}`}
      </div>
    );
  },
}));
import {render, screen} from '@testing-library/react';
import {create, createStore, type StoreApi} from 'zustand';

import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import {createProjectStore, ProjectStoreContext} from '~shared/store';
import {KeyConfiguratorPanel} from '~widgets/key-configurator-panel';

const PROJECT_ID = 'project-1';

interface TestConfigurationItem {
  id: number;
  name: string;
  systemId: string;
  type: string;
}

/** Provides the minimal Graph Designer state required to render a subgraph. */
function makeGraphStore(): StoreApi<GraphDesignerStore> {
  const keyValuePair = {
    keyInfo: {keyId: 1, keyLabel: 'Key 1', keySystemId: 'key-1'},
    valueInfo: {valueId: 11, valueLabel: 'Value 11', valueSystemId: 'value-11'},
  };
  const updateSgKvMetadata = jest.fn();
  const updateSgKvConfigInfo = jest.fn();

  return createStore(
    () =>
      ({
        addSgKvVector: jest.fn(),
        availableGraphKeys: null,
        deleteSgKvVector: jest.fn(),
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {
            'module-5': {},
          },
          selectedUsecases: ['usecase-1'],
          subgraphs: {
            'subgraph-1': {
              containers: [],
              kvVectors: [
                {
                  isEc: false,
                  keyValuePairs: [keyValuePair],
                  selected: false,
                  systemId: 'vector-1',
                },
              ],
              subgraphName: 'Subgraph 1',
              subgraphType: 'shared',
              systemId: 'subgraph-1',
            },
          },
          subsystems: {},
        },
        graphDataStatus: 'ready',
        initializeConfiguration: jest.fn(),
        kvSelectionsById: {},
        mode: 'view',
        selectedNodes: [],
        setSgKvVectorSelected: jest.fn(),
        subgraphProvenanceById: {},
        updateSgKvConfigInfo,
        updateSgKvMetadata,
      }) as unknown as GraphDesignerStore,
  );
}

/**
 * Provides Key Configurator host selection without unrelated CKV/TKV state.
 * SGKV configuration itself is intentionally supplied through Graph Designer.
 */
function makeConfiguratorStore(selectedItems: TestConfigurationItem[] = []) {
  return create((set) => ({
    initializeConfiguration: jest.fn(),
    projectId: PROJECT_ID,
    selectedItems,
    setSelectedItems: (nextSelectedItems: TestConfigurationItem[]) =>
      set({selectedItems: nextSelectedItems}),
  }));
}

describe('KeyConfiguratorPanel', () => {
  beforeEach(() => {
    mockUseKeyConfiguratorSelectionStore.mockReturnValue(
      makeConfiguratorStore(),
    );
  });

  it('renders the subgraph section selected by the Graph Designer bridge', () => {
    mockUseKeyConfiguratorSelectionStore.mockReturnValue(
      makeConfiguratorStore([
        {
          id: 1,
          name: 'Subgraph 1',
          systemId: 'subgraph-1',
          type: 'subgraph',
        },
      ]),
    );
    const graphDesignerStore = makeGraphStore();
    const projectStore = createProjectStore(PROJECT_ID);

    render(
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <KeyConfiguratorPanel />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>,
    );

    expect(screen.getByText('Subgraph 1')).toBeInTheDocument();
  });

  it('shows a loading state instead of stale configuration during graph refresh', () => {
    mockUseKeyConfiguratorSelectionStore.mockReturnValue(
      makeConfiguratorStore([
        {
          id: 1,
          name: 'Subgraph 1',
          systemId: 'subgraph-1',
          type: 'subgraph',
        },
      ]),
    );
    const graphDesignerStore = makeGraphStore();
    graphDesignerStore.setState({graphDataStatus: 'loading'});
    const projectStore = createProjectStore(PROJECT_ID);

    render(
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <KeyConfiguratorPanel />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>,
    );

    expect(
      screen.getByText('Loading graph configuration...'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Subgraph 1')).not.toBeInTheDocument();
  });

  it('routes MODULE items through the GraphDesignerStore, not the key configurator store', () => {
    const configuratorStore = makeConfiguratorStore([
      {
        id: 5,
        name: 'Module 5',
        systemId: 'module-5',
        type: 'module',
      },
    ]);
    mockUseKeyConfiguratorSelectionStore.mockReturnValue(configuratorStore);
    const graphDesignerStore = makeGraphStore();
    const projectStore = createProjectStore(PROJECT_ID);

    render(
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <KeyConfiguratorPanel />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>,
    );

    expect(
      graphDesignerStore.getState().initializeConfiguration,
    ).toHaveBeenCalledWith({
      itemId: 'module-5',
      itemType: 'module',
      projectId: PROJECT_ID,
    });
    expect(
      configuratorStore.getState().initializeConfiguration,
    ).not.toHaveBeenCalled();
  });

  it('passes instanceSystemId and displayMode through to ModuleConfigurationPanel', () => {
    mockUseKeyConfiguratorSelectionStore.mockReturnValue(
      makeConfiguratorStore([
        {
          id: 5,
          name: 'Module 5',
          systemId: 'module-5',
          type: 'module',
        },
      ]),
    );
    const graphDesignerStore = makeGraphStore();
    const projectStore = createProjectStore(PROJECT_ID);

    render(
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <KeyConfiguratorPanel />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>,
    );

    expect(screen.getByTestId('module-configuration-panel')).toHaveTextContent(
      'module-5:key-value',
    );
  });

  it('still routes SUBSYSTEM items through the key configurator store', () => {
    const configuratorStore = makeConfiguratorStore([
      {
        id: 9,
        name: 'Subsystem 9',
        systemId: 'subsystem-9',
        type: 'subsystem',
      },
    ]);
    mockUseKeyConfiguratorSelectionStore.mockReturnValue(configuratorStore);
    const graphDesignerStore = makeGraphStore();
    const projectStore = createProjectStore(PROJECT_ID);

    render(
      <ProjectStoreContext.Provider value={projectStore}>
        <GraphDesignerStoreContext.Provider value={graphDesignerStore}>
          <KeyConfiguratorPanel />
        </GraphDesignerStoreContext.Provider>
      </ProjectStoreContext.Provider>,
    );

    expect(
      configuratorStore.getState().initializeConfiguration,
    ).toHaveBeenCalledWith({
      entityId: 9,
      entityType: 'subsystem',
      systemId: 'subsystem-9',
    });
    expect(
      graphDesignerStore.getState().initializeConfiguration,
    ).not.toHaveBeenCalled();
  });
});
