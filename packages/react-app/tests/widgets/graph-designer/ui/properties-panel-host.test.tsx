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
  onNavigateToNode: (nodeId: string) => void;
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

import {act, render, screen} from '@testing-library/react';

import {EDGE_KIND, type LevelView} from '~entities/graph';
import {GraphDesignerStoreContext} from '~features/graph-designer';
import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {PropertiesPanelHost} from '~widgets/graph-designer/ui/properties-panel-host';

const PROJECT_ID = 'proj-1';

function makeGraphData(): UsecaseGraphData {
  return {
    connections: [
      {
        connectionId: 'dl-1',
        connectionType: EDGE_KIND.DATA,
        fromModuleId: 'mod-1',
        fromPortId: 'out-1',
        isDangling: false,
        toModuleId: 'mod-2',
        toPortId: 'in-1',
      },
      {
        connectionId: 'cl-1',
        connectionType: EDGE_KIND.CONTROL,
        fromModuleId: 'mod-1',
        fromPortId: 'ctl-1',
        isDangling: false,
        toModuleId: 'mod-2',
        toPortId: 'ctl-2',
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

  it('requests node focus and excludes represented virtual link rows', () => {
    const store = renderHost();

    act(() => latestPropertiesPanelProps?.onNavigateToNode('mod-1'));
    expect(store.getState().focusNodeRequest).toEqual({
      nodeId: 'mod-1',
      requestId: 1,
    });

    act(() => latestPropertiesPanelProps?.onVirtualDataLinkRowDelete('dl-1'));
    expect(
      store.getState().excludedLinks.map((link) => link.connectionId),
    ).toContain('dl-1');

    act(() =>
      latestPropertiesPanelProps?.onVirtualControlLinkRowDelete('cl-1'),
    );
    expect(
      store.getState().excludedLinks.map((link) => link.connectionId),
    ).toContain('cl-1');
  });
});
