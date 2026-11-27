/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/spf-modules', () => ({
  fetchSpfModuleProperties: jest.fn(),
}));

let latestPropertiesPanelProps: MockPropertiesPanelProps | null = null;

interface MockPropertiesPanelProps {
  moduleDefinitionsBySystemId: unknown;
  onNavigateToNode: (nodeId: string) => void;
  onOpenVcpmConfig: (subgraphId: string, subgraphName: string) => void;
  onScenarioIdChanged: (subgraphId: string, isVoiceCall: boolean) => void;
  onVirtualControlLinkRowDelete: (realControlLinkId: string) => void;
  onVirtualDataLinkRowDelete: (realDataLinkId: string) => void;
  virtualControlLinks: unknown[];
  virtualDataLinks: unknown[];
}

jest.mock('~widgets/properties-panel', () => ({
  PropertiesPanel: (props: MockPropertiesPanelProps) => {
    latestPropertiesPanelProps = props;
    return <div data-testid="properties-panel" />;
  },
}));

jest.mock('~widgets/project-layout/project-layout-manager', () => ({
  tabLayoutService: {createProjectTab: jest.fn()},
}));

jest.mock('~widgets/vcpm-data-tab', () => ({
  VcpmDataTab: forwardRef(function VcpmDataTabMock(
    props: {subgraphSystemId: string},
    ref: React.Ref<unknown>,
  ) {
    useImperativeHandle(ref, () => ({confirmClose: async () => true}));
    return <div data-testid={`vcpm-data-tab-${props.subgraphSystemId}`} />;
  }),
}));

import {act, render, screen} from '@testing-library/react';
import {forwardRef, useImperativeHandle} from 'react';

import {EDGE_KIND, type LevelView} from '~entities/graph';
import {GraphDesignerStoreContext} from '~features/graph-designer';
import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {PropertiesPanelHost} from '~widgets/graph-designer/ui/properties-panel-host';
import {useProjectLayoutStore} from '~shared/store';
import {TabType} from '~shared/store/project-layout.types';
import {tabLayoutService} from '~widgets/project-layout/project-layout-manager';

const PROJECT_ID = 'proj-1';

function makeGraphData(): UsecaseGraphData {
  return {
    connections: [
      {
        destinationPortSystemId: 'in-1',
        destinationSystemId: 'mod-2',
        linkKind: EDGE_KIND.DATA,
        linkType: 'NORMAL',
        sourcePortSystemId: 'out-1',
        sourceSystemId: 'mod-1',
        systemId: 'dl-1',
      },
      {
        destinationPortSystemId: 'ctl-2',
        destinationSystemId: 'mod-2',
        linkKind: EDGE_KIND.CONTROL,
        linkType: 'NORMAL',
        sourcePortSystemId: 'ctl-1',
        sourceSystemId: 'mod-1',
        systemId: 'cl-1',
      },
    ],
    containers: {},
    moduleInstances: {},
    selectedUsecases: [],
    subgraphs: {},
    subsystems: {},
  };
}

function renderHost(graph?: LevelView) {
  const store = createGraphDesignerStore('tab-1', PROJECT_ID);
  store.setState({
    graphData: makeGraphData(),
  });

  render(
    <GraphDesignerStoreContext.Provider value={store}>
      <PropertiesPanelHost graph={graph} projectId={PROJECT_ID} />
    </GraphDesignerStoreContext.Provider>,
  );

  return store;
}

function addSubgraph(
  store: ReturnType<typeof createGraphDesignerStore>,
  subgraphId: string,
  naturalId?: number,
) {
  const graphData = store.getState().graphData;
  if (!graphData) {
    return;
  }
  store.setState({
    graphData: {
      ...graphData,
      subgraphs: {
        ...graphData.subgraphs,
        [subgraphId]: {
          containers: [],
          kvVectors: [],
          ...(naturalId === undefined ? {} : {naturalId}),
          subgraphName: 'Subgraph 1',
          subgraphType: 'Standard',
          systemId: subgraphId,
        },
      },
    },
  });
}

describe('PropertiesPanelHost', () => {
  beforeEach(() => {
    latestPropertiesPanelProps = null;
    jest.clearAllMocks();
  });

  it('passes effective proxy links into the properties panel', () => {
    const graph: LevelView = {
      levelId: 'root',
      proxyControlLinks: [
        {
          edgeKind: EDGE_KIND.PROXY_CONTROL,
          id: 'proxy-cl-1',
          realConnectionIds: ['cl-1'],
          sourceNodeId: 'mod-1',
          sourcePortId: 'ctl-1',
          targetNodeId: 'mod-2',
          targetPortId: 'ctl-2',
        },
      ],
      proxyDataLinks: [
        {
          edgeKind: EDGE_KIND.PROXY_DATA,
          id: 'proxy-dl-1',
          kind: 'standard',
          realConnectionIds: ['dl-1'],
          sourceNodeId: 'mod-1',
          sourcePortId: 'out-1',
          targetNodeId: 'mod-2',
          targetPortId: 'in-1',
        },
      ],
    };

    renderHost(graph);

    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    expect(latestPropertiesPanelProps).toEqual(
      expect.objectContaining({
        virtualControlLinks: [expect.objectContaining({id: 'proxy-cl-1'})],
        virtualDataLinks: [expect.objectContaining({id: 'proxy-dl-1'})],
      }),
    );
  });

  it('passes module definitions into the properties panel', () => {
    const store = createGraphDesignerStore('tab-1', PROJECT_ID);
    store.setState({
      graphData: makeGraphData(),
      moduleDefinitionsBySystemId: {
        'mod-def-1': {naturalId: 0x07001017} as never,
      },
    });

    render(
      <GraphDesignerStoreContext.Provider value={store}>
        <PropertiesPanelHost projectId={PROJECT_ID} />
      </GraphDesignerStoreContext.Provider>,
    );

    expect(latestPropertiesPanelProps).toEqual(
      expect.objectContaining({
        moduleDefinitionsBySystemId: {
          'mod-def-1': expect.objectContaining({naturalId: 0x07001017}),
        },
      }),
    );
  });

  it('requests node focus and excludes represented virtual link rows', () => {
    const store = renderHost();

    act(() => latestPropertiesPanelProps?.onNavigateToNode('mod-1'));
    expect(store.getState().focusNodeRequest).toEqual({
      nodeId: 'mod-1',
      requestId: 1,
    });

    act(() => latestPropertiesPanelProps?.onVirtualDataLinkRowDelete('dl-1'));
    expect(
      store.getState().excludedLinks.map((link) => link.systemId),
    ).toContain('dl-1');

    act(() =>
      latestPropertiesPanelProps?.onVirtualControlLinkRowDelete('cl-1'),
    );
    expect(
      store.getState().excludedLinks.map((link) => link.systemId),
    ).toContain('cl-1');
  });

  describe('VCPM config tab', () => {
    beforeEach(() => {
      let tabNumber = 0;
      jest
        .mocked(tabLayoutService.createProjectTab)
        .mockImplementation((title) => ({
          id: `vcpm-tab-${++tabNumber}`,
          tabType: TabType.ProjectTab,
          title,
        }));
    });

    it('opens a new VCPM tab via onOpenVcpmConfig', async () => {
      const store = renderHost();
      act(() => addSubgraph(store, 'sg-1'));
      jest.spyOn(store.getState(), 'queryVcpmData').mockResolvedValue(true);

      await act(async () =>
        latestPropertiesPanelProps?.onOpenVcpmConfig('sg-1', 'Subgraph 1'),
      );

      expect(tabLayoutService.createProjectTab).toHaveBeenCalled();
      expect(store.getState().vcpmOpenTabs['sg-1']).toBe('vcpm-tab-1');
    });

    it('titles the VCPM tab with the subgraph natural ID in hex', async () => {
      const store = renderHost();
      act(() => addSubgraph(store, 'sg-1', 2_952_790_017));
      jest.spyOn(store.getState(), 'queryVcpmData').mockResolvedValue(true);

      await act(async () =>
        latestPropertiesPanelProps?.onOpenVcpmConfig('sg-1', 'Subgraph 1'),
      );

      expect(tabLayoutService.createProjectTab).toHaveBeenCalledWith(
        'VCPM Configuration - Subgraph (0xB0000001)',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('falls back to the subgraph systemId in the title when no natural ID is known', async () => {
      const store = renderHost();
      act(() => addSubgraph(store, 'sg-1'));
      jest.spyOn(store.getState(), 'queryVcpmData').mockResolvedValue(true);

      await act(async () =>
        latestPropertiesPanelProps?.onOpenVcpmConfig('sg-1', 'Subgraph 1'),
      );

      expect(tabLayoutService.createProjectTab).toHaveBeenCalledWith(
        'VCPM Configuration - Subgraph (sg-1)',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('reuses the existing tab on reopen', async () => {
      const store = renderHost();
      act(() => {
        addSubgraph(store, 'sg-1');
        store.setState({vcpmOpenTabs: {'sg-1': 'vcpm-tab-1'}});
      });
      const setActiveProjectTab = jest.spyOn(
        useProjectLayoutStore.getState(),
        'setActiveProjectTab',
      );

      await act(async () =>
        latestPropertiesPanelProps?.onOpenVcpmConfig('sg-1', 'Subgraph 1'),
      );

      expect(setActiveProjectTab).toHaveBeenCalledWith(
        PROJECT_ID,
        'vcpm-tab-1',
      );
      expect(tabLayoutService.createProjectTab).not.toHaveBeenCalled();
    });

    it('force-closes the open VCPM tab when its subgraph is deleted', () => {
      const store = renderHost();
      act(() => {
        addSubgraph(store, 'sg-1');
        store.setState({vcpmOpenTabs: {'sg-1': 'vcpm-tab-1'}});
      });
      const removeProjectTab = jest.spyOn(
        useProjectLayoutStore.getState(),
        'removeProjectTab',
      );

      act(() =>
        store.setState({
          graphData: {...store.getState().graphData!, subgraphs: {}},
        }),
      );

      expect(removeProjectTab).toHaveBeenCalledWith(PROJECT_ID, 'vcpm-tab-1');
      expect(store.getState().vcpmOpenTabs['sg-1']).toBeNull();
    });

    it('does not force-close when the subgraph is merely deselected', () => {
      const store = renderHost();
      act(() => {
        addSubgraph(store, 'sg-1');
        store.setState({vcpmOpenTabs: {'sg-1': 'vcpm-tab-1'}});
      });
      const removeProjectTab = jest.spyOn(
        useProjectLayoutStore.getState(),
        'removeProjectTab',
      );

      act(() => store.setState({selectedEdges: [], selectedNodes: []}));

      expect(removeProjectTab).not.toHaveBeenCalled();
    });

    it('force-closes the VCPM tab when onScenarioIdChanged reports the scenario left VoiceCall', () => {
      const store = renderHost();
      act(() => {
        addSubgraph(store, 'sg-1');
        store.setState({vcpmOpenTabs: {'sg-1': 'vcpm-tab-1'}});
      });
      const removeProjectTab = jest.spyOn(
        useProjectLayoutStore.getState(),
        'removeProjectTab',
      );

      act(() => latestPropertiesPanelProps?.onScenarioIdChanged('sg-1', false));

      expect(removeProjectTab).toHaveBeenCalledWith(PROJECT_ID, 'vcpm-tab-1');
    });
  });
});
