/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const genericTreeViewMock = jest.fn();

jest.mock('~features/generic-tree-view', () => ({
  GenericTreeView: (props: unknown) => {
    genericTreeViewMock(props);
    return <div data-testid="generic-tree-view" />;
  },
}));

jest.mock('~entities/control-links', () => ({
  fetchControlLinkProperties: jest.fn(),
  patchControlLinkProperties: jest.fn(),
}));

import {render, screen, waitFor} from '@testing-library/react';

import {fetchControlLinkProperties} from '~entities/control-links';
import type {ProxyControlLink, ProxyDataLink} from '~entities/graph';
import {ControlLinkPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/control-link-properties-card';
import {DataLinkPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/data-link-properties-card';
import {VirtualControlLinkPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/virtual-control-link-properties-card';
import {VirtualDataLinkPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/virtual-data-link-properties-card';

import {makeGraphData} from './test-graph-data';
import {makeProperty} from './test-properties';

const mockFetchControlLinkProperties = jest.mocked(fetchControlLinkProperties);

describe('link property cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchControlLinkProperties.mockResolvedValue({
      data: [makeProperty('Allocated Intents')],
      message: 'ok',
      success: true,
    });
  });

  it('renders a direct data link without actions', () => {
    render(
      <DataLinkPropertiesCard graphData={makeGraphData()} linkId="dl-1" />,
    );

    expect(screen.getByText('Source Component Info')).toBeInTheDocument();
    expect(screen.getByText('Destination Component Info')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: /delete/i}),
    ).not.toBeInTheDocument();
  });

  it('renders a direct control link with peer rows and schema properties', async () => {
    render(
      <ControlLinkPropertiesCard
        graphData={makeGraphData()}
        isEditing
        linkId="cl-1"
        projectId="proj-1"
      />,
    );

    expect(screen.getByText('Peer1 Component Info')).toBeInTheDocument();
    expect(screen.getByText('Peer2 Component Info')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: /delete/i}),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument(),
    );
  });

  it('renders standard virtual data link row actions', () => {
    const proxyLink: ProxyDataLink = {
      edgeKind: 'proxy-data',
      id: 'proxy-dl-1',
      kind: 'standard',
      realConnectionIds: ['dl-1'],
      sourceNodeId: 'mod-1',
      sourcePortId: 'out-1',
      targetNodeId: 'mod-2',
      targetPortId: 'in-2',
    };

    render(
      <VirtualDataLinkPropertiesCard
        graphData={makeGraphData()}
        onNavigateToNode={jest.fn()}
        onVirtualDataLinkRowDelete={jest.fn()}
        proxyLink={proxyLink}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Navigate to Source'}),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {name: 'Navigate to Destination'}),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {name: 'Delete Data Link'}),
    ).toBeEnabled();
  });

  it('renders MDF virtual data links without row actions', () => {
    const proxyLink: ProxyDataLink = {
      edgeKind: 'proxy-data',
      id: 'proxy-dl-2',
      kind: 'mdf',
      mdfModuleIds: ['mdf-1'],
      realConnectionIds: ['dl-1'],
      sourceNodeId: 'mod-1',
      sourcePortId: 'out-1',
      targetNodeId: 'mod-2',
      targetPortId: 'in-2',
    };

    render(
      <VirtualDataLinkPropertiesCard
        graphData={makeGraphData()}
        onNavigateToNode={jest.fn()}
        onVirtualDataLinkRowDelete={jest.fn()}
        proxyLink={proxyLink}
      />,
    );

    expect(
      screen.queryByRole('button', {name: /Navigate/}),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: /Delete/}),
    ).not.toBeInTheDocument();
    expect(screen.getByText('MDF Module')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0x3E7')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('999')).not.toBeInTheDocument();
  });

  it('renders virtual control link row actions without wrapper delete', () => {
    const proxyLink: ProxyControlLink = {
      edgeKind: 'proxy-control',
      id: 'proxy-cl-1',
      realConnectionIds: ['cl-1'],
      sourceNodeId: 'mod-1',
      sourcePortId: 'ctl-1',
      targetNodeId: 'mod-2',
      targetPortId: 'ctl-2',
    };

    render(
      <VirtualControlLinkPropertiesCard
        graphData={makeGraphData()}
        onNavigateToNode={jest.fn()}
        onVirtualControlLinkRowDelete={jest.fn()}
        proxyLink={proxyLink}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Navigate to Peer1'}),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {name: 'Navigate to Peer2'}),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {name: 'Delete Control Link'}),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', {name: 'Delete Virtual Control Link'}),
    ).not.toBeInTheDocument();
  });
});
