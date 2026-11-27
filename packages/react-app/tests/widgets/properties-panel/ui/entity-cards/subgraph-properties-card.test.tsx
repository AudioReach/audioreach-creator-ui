/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const genericTreeViewMock = jest.fn();

jest.mock('~features/generic-tree-view', () => ({
  GenericTreeView: (props: object) => {
    genericTreeViewMock(props);
    return <div data-testid="generic-tree-view" />;
  },
}));

jest.mock('~entities/subgraphs', () => ({
  fetchSubgraphProperties: jest.fn(),
  patchSubgraph: jest.fn(),
  patchSubgraphProperty: jest.fn(),
  patchSubgraphScenario: jest.fn(),
  patchSubgraphVsid: jest.fn(),
}));

import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {fetchSubgraphProperties} from '~entities/subgraphs';
import {SubgraphPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/subgraph-properties-card';

import {makeGraphData} from './test-graph-data';
import {makeProperty} from './test-properties';

const mockFetchSubgraphProperties = jest.mocked(fetchSubgraphProperties);

describe('SubgraphPropertiesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSubgraphProperties.mockResolvedValue({
      data: [makeProperty('Scenario ID')],
      message: 'ok',
      success: true,
    });
  });

  it('renders editable name, copyable id, and schema tree', async () => {
    render(
      <SubgraphPropertiesCard
        graphData={makeGraphData()}
        isEditing
        onSubgraphNameChange={jest.fn()}
        projectId="proj-1"
        subgraphId="sg-1"
      />,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Copy Subgraph ID'}),
    ).toBeEnabled();

    await waitFor(() =>
      expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument(),
    );
    expect(genericTreeViewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hideToolbar: true,
        readOnly: false,
      }),
    );
  });

  it('displays the subgraph natural ID', async () => {
    const graphData = makeGraphData();
    graphData.subgraphs['sg-1'].naturalId = 0xb000002f;

    render(
      <SubgraphPropertiesCard
        graphData={graphData}
        isEditing
        onSubgraphNameChange={jest.fn()}
        projectId="proj-1"
        subgraphId="sg-1"
      />,
    );

    expect(screen.getByText('0xB000002F')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument(),
    );
  });

  it('does not render the VCPM Config button when Scenario ID is not VoiceCall', async () => {
    render(
      <SubgraphPropertiesCard
        graphData={makeGraphData()}
        isEditing
        onOpenVcpmConfig={jest.fn()}
        onSubgraphNameChange={jest.fn()}
        projectId="proj-1"
        subgraphId="sg-1"
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', {name: 'VCPM Config'}),
    ).not.toBeInTheDocument();
  });

  it('renders the VCPM Config button when Scenario ID is VoiceCall', async () => {
    mockFetchSubgraphProperties.mockResolvedValue({
      data: [makeProperty('Scenario ID', '3')],
      message: 'ok',
      success: true,
    });

    render(
      <SubgraphPropertiesCard
        graphData={makeGraphData()}
        isEditing
        onOpenVcpmConfig={jest.fn()}
        onSubgraphNameChange={jest.fn()}
        projectId="proj-1"
        subgraphId="sg-1"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: 'VCPM Config'}),
      ).toBeInTheDocument(),
    );
  });

  it('calls onOpenVcpmConfig with the subgraph id and name when clicked', async () => {
    mockFetchSubgraphProperties.mockResolvedValue({
      data: [makeProperty('Scenario ID', '3')],
      message: 'ok',
      success: true,
    });
    const onOpenVcpmConfig = jest.fn();
    const user = userEvent.setup();

    render(
      <SubgraphPropertiesCard
        graphData={makeGraphData()}
        isEditing
        onOpenVcpmConfig={onOpenVcpmConfig}
        onSubgraphNameChange={jest.fn()}
        projectId="proj-1"
        subgraphId="sg-1"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: 'VCPM Config'}),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', {name: 'VCPM Config'}));

    expect(onOpenVcpmConfig).toHaveBeenCalledWith('sg-1', 'Main Subgraph');
  });
});
