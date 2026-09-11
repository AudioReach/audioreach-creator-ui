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

jest.mock('~entities/subgraphs', () => ({
  fetchSubgraphProperties: jest.fn(),
  patchSubgraph: jest.fn(),
  patchSubgraphProperties: jest.fn(),
}));

import {render, screen, waitFor} from '@testing-library/react';

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
});
