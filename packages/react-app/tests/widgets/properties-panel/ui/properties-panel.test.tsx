/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/subgraph-properties-card',
  () => ({
    SubgraphPropertiesCard: ({
      isCollapsed,
      onToggle,
      subgraphId,
    }: {
      isCollapsed?: boolean;
      onToggle?: () => void;
      subgraphId: string;
    }) => (
      <div>
        <button onClick={onToggle} type="button">
          {isCollapsed
            ? `expand subgraph ${subgraphId}`
            : `collapse subgraph ${subgraphId}`}
        </button>
        {isCollapsed ? null : <div>subgraph-card:{subgraphId}</div>}
      </div>
    ),
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/container-properties-card',
  () => ({
    ContainerPropertiesCard: ({
      containerId,
      isCollapsed,
      onToggle,
    }: {
      containerId: string;
      isCollapsed?: boolean;
      onToggle?: () => void;
    }) => (
      <div>
        <button onClick={onToggle} type="button">
          {isCollapsed
            ? `expand container ${containerId}`
            : `collapse container ${containerId}`}
        </button>
        {isCollapsed ? null : <div>container-card:{containerId}</div>}
      </div>
    ),
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/module-properties-card',
  () => ({
    ModulePropertiesCard: ({
      isCollapsed,
      moduleId,
      onToggle,
    }: {
      isCollapsed?: boolean;
      moduleId: string;
      onToggle?: () => void;
    }) => (
      <div>
        <button onClick={onToggle} type="button">
          {isCollapsed
            ? `expand module ${moduleId}`
            : `collapse module ${moduleId}`}
        </button>
        {isCollapsed ? null : <div>module-card:{moduleId}</div>}
      </div>
    ),
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/subsystem-properties-card',
  () => ({
    SubsystemPropertiesCard: ({
      isCollapsed,
      onToggle,
      subsystemId,
    }: {
      isCollapsed?: boolean;
      onToggle?: () => void;
      subsystemId: string;
    }) => (
      <div>
        <button onClick={onToggle} type="button">
          {isCollapsed
            ? `expand subsystem ${subsystemId}`
            : `collapse subsystem ${subsystemId}`}
        </button>
        {isCollapsed ? null : <div>subsystem-card:{subsystemId}</div>}
      </div>
    ),
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/data-link-properties-card',
  () => ({
    DataLinkPropertiesCard: ({
      isCollapsed,
      linkId,
      onToggle,
    }: {
      isCollapsed?: boolean;
      linkId: string;
      onToggle?: () => void;
    }) => (
      <div>
        <button onClick={onToggle} type="button">
          {isCollapsed
            ? `expand data link ${linkId}`
            : `collapse data link ${linkId}`}
        </button>
        {isCollapsed ? null : <div>data-link-card:{linkId}</div>}
      </div>
    ),
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/control-link-properties-card',
  () => ({
    ControlLinkPropertiesCard: ({
      isCollapsed,
      linkId,
      onToggle,
    }: {
      isCollapsed?: boolean;
      linkId: string;
      onToggle?: () => void;
    }) => (
      <div>
        <button onClick={onToggle} type="button">
          {isCollapsed
            ? `expand control link ${linkId}`
            : `collapse control link ${linkId}`}
        </button>
        {isCollapsed ? null : <div>control-link-card:{linkId}</div>}
      </div>
    ),
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/virtual-data-link-properties-card',
  () => ({
    VirtualDataLinkPropertiesCard: ({
      isCollapsed,
      onToggle,
      proxyLink,
    }: {
      isCollapsed?: boolean;
      onToggle?: () => void;
      proxyLink: {id: string};
    }) => {
      const {id} = proxyLink;
      return (
        <div>
          <button onClick={onToggle} type="button">
            {isCollapsed
              ? `expand virtual data link ${id}`
              : `collapse virtual data link ${id}`}
          </button>
          {isCollapsed ? null : <div>virtual-data-link-card:{id}</div>}
        </div>
      );
    },
  }),
);

jest.mock(
  '~widgets/properties-panel/ui/entity-cards/virtual-control-link-properties-card',
  () => ({
    VirtualControlLinkPropertiesCard: ({
      isCollapsed,
      onToggle,
      proxyLink,
    }: {
      isCollapsed?: boolean;
      onToggle?: () => void;
      proxyLink: {id: string};
    }) => {
      const {id} = proxyLink;
      return (
        <div>
          <button onClick={onToggle} type="button">
            {isCollapsed
              ? `expand virtual control link ${id}`
              : `collapse virtual control link ${id}`}
          </button>
          {isCollapsed ? null : <div>virtual-control-link-card:{id}</div>}
        </div>
      );
    },
  }),
);

import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  EDGE_KIND,
  NODE_KIND,
  type ProxyControlLink,
  type ProxyDataLink,
} from '~entities/graph';
import {PropertiesPanel} from '~widgets/properties-panel';

import {makeGraphData} from './entity-cards/test-graph-data';

const callbacks = {
  onContainerIdChange: jest.fn(),
  onModuleAliasChange: jest.fn(),
  onModuleContainerChange: jest.fn(),
  onModulePortCountChange: jest.fn(),
  onNavigateToNode: jest.fn(),
  onSubgraphNameChange: jest.fn(),
  onSubsystemNameChange: jest.fn(),
  onVirtualControlLinkRowDelete: jest.fn(),
  onVirtualDataLinkRowDelete: jest.fn(),
};

const proxyDataLink: ProxyDataLink = {
  edgeKind: EDGE_KIND.PROXY_DATA,
  id: 'proxy-dl-1',
  kind: 'standard',
  realConnectionIds: ['dl-1'],
  sourceNodeId: 'mod-1',
  sourcePortId: 'out-1',
  targetNodeId: 'mod-2',
  targetPortId: 'in-2',
};

const proxyControlLink: ProxyControlLink = {
  edgeKind: EDGE_KIND.PROXY_CONTROL,
  id: 'proxy-cl-1',
  realConnectionIds: ['cl-1'],
  sourceNodeId: 'mod-1',
  sourcePortId: 'ctl-1',
  targetNodeId: 'mod-2',
  targetPortId: 'ctl-2',
};

describe('PropertiesPanel', () => {
  it('renders the empty state when no property groups resolve', () => {
    render(
      <PropertiesPanel
        {...callbacks}
        graphData={makeGraphData()}
        isEditing={false}
        projectId="proj-1"
        selectedEdges={[]}
        selectedNodes={[]}
      />,
    );

    expect(
      screen.getByText('Select a node or edge to view properties'),
    ).toBeInTheDocument();
  });

  it('renders grouped cards in descriptor order', () => {
    render(
      <PropertiesPanel
        {...callbacks}
        graphData={makeGraphData()}
        isEditing
        projectId="proj-1"
        selectedEdges={[
          {edgeKind: EDGE_KIND.CONTROL, id: 'cl-1', systemId: 'cl-1'},
          {edgeKind: EDGE_KIND.PROXY_DATA, id: 'proxy-dl-1', systemId: 'dl-1'},
          {
            edgeKind: EDGE_KIND.PROXY_CONTROL,
            id: 'proxy-cl-1',
            systemId: 'cl-1',
          },
        ]}
        selectedNodes={[
          {id: 'sg-1', nodeKind: NODE_KIND.SUBGRAPH, systemId: 'sg-1'},
          {id: 'cnt-1', nodeKind: NODE_KIND.CONTAINER, systemId: 'cnt-1'},
          {id: 'mod-2', nodeKind: NODE_KIND.MODULE, systemId: 'mod-2'},
          {id: 'mod-1', nodeKind: NODE_KIND.MODULE, systemId: 'mod-1'},
        ]}
        virtualControlLinks={[proxyControlLink]}
        virtualDataLinks={[proxyDataLink]}
      />,
    );

    expect(screen.getByText('Subgraphs (1 selected)')).toBeInTheDocument();
    expect(screen.getByText('Containers (1 selected)')).toBeInTheDocument();
    expect(screen.getByText('Modules (2 selected)')).toBeInTheDocument();
    expect(screen.getByText('Control Links (1 selected)')).toBeInTheDocument();
    expect(
      screen.getByText('Virtual Data Links (1 selected)'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Subgraphs')).not.toBeInTheDocument();
    expect(screen.getByText('module-card:mod-2')).toBeInTheDocument();
    expect(screen.getByText('module-card:mod-1')).toBeInTheDocument();
  });

  it('collapses an entire selected group', async () => {
    const user = userEvent.setup();

    render(
      <PropertiesPanel
        {...callbacks}
        graphData={makeGraphData()}
        isEditing
        projectId="proj-1"
        selectedEdges={[]}
        selectedNodes={[
          {id: 'mod-1', nodeKind: NODE_KIND.MODULE, systemId: 'mod-1'},
          {id: 'mod-2', nodeKind: NODE_KIND.MODULE, systemId: 'mod-2'},
        ]}
      />,
    );

    await user.click(
      screen.getByRole('button', {name: 'Collapse Modules (2 selected)'}),
    );

    expect(screen.queryByText('module-card:mod-1')).not.toBeInTheDocument();
    expect(screen.queryByText('module-card:mod-2')).not.toBeInTheDocument();
  });

  it('collapses individual selected cards inside a group', async () => {
    const user = userEvent.setup();

    render(
      <PropertiesPanel
        {...callbacks}
        graphData={makeGraphData()}
        isEditing
        projectId="proj-1"
        selectedEdges={[]}
        selectedNodes={[
          {id: 'mod-1', nodeKind: NODE_KIND.MODULE, systemId: 'mod-1'},
          {id: 'mod-2', nodeKind: NODE_KIND.MODULE, systemId: 'mod-2'},
        ]}
      />,
    );

    await user.click(
      screen.getByRole('button', {name: 'collapse module mod-1'}),
    );

    expect(screen.queryByText('module-card:mod-1')).not.toBeInTheDocument();
    expect(screen.getByText('module-card:mod-2')).toBeInTheDocument();
  });

  it('does not import host stores', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src',
        'widgets',
        'properties-panel',
        'ui',
        'properties-panel.tsx',
      ),
      'utf8',
    );

    expect(source).not.toContain('useGraphDesignerStore');
    expect(source).not.toContain('useProjectStoreShallow');
  });
});
