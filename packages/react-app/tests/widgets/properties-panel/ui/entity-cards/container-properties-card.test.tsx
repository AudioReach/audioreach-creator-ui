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

jest.mock('~entities/containers', () => ({
  fetchContainerProperties: jest.fn(),
  patchContainer: jest.fn(),
  patchContainerProperties: jest.fn(),
}));

import {render, screen, waitFor} from '@testing-library/react';

import {fetchContainerProperties} from '~entities/containers';
import {ContainerPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/container-properties-card';

import {makeGraphData} from './test-graph-data';
import {makeProperty} from './test-properties';

const mockFetchContainerProperties = jest.mocked(fetchContainerProperties);

describe('ContainerPropertiesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchContainerProperties.mockResolvedValue({
      data: [
        makeProperty('Container Type', 'olc', [
          {name: 'OLC', value: 'olc'},
          {name: 'PLC', value: 'plc'},
        ]),
      ],
      message: 'ok',
      success: true,
    });
  });

  it('renders container static rows and schema-derived type selector', async () => {
    render(
      <ContainerPropertiesCard
        containerId="cnt-1"
        graphData={makeGraphData()}
        isEditing
        onContainerIdChange={jest.fn()}
        projectId="proj-1"
      />,
    );

    await waitFor(() =>
      expect(fetchContainerProperties).toHaveBeenCalledWith('proj-1', 'cnt-1'),
    );
    expect(screen.getByDisplayValue('cnt-1')).toBeInTheDocument();
    expect(screen.getAllByText('Container Type')).not.toHaveLength(0);
    expect(screen.getByTestId('q-select')).toBeInTheDocument();
  });

  it('formats numeric container ids as hex for display', async () => {
    render(
      <ContainerPropertiesCard
        containerId="100"
        graphData={{
          ...makeGraphData(),
          containers: {
            100: {
              containerId: '100',
              heapId: 'heap-1',
              modules: [],
              name: 'Container 100',
            },
          },
        }}
        isEditing
        onContainerIdChange={jest.fn()}
        projectId="proj-1"
      />,
    );

    await waitFor(() =>
      expect(fetchContainerProperties).toHaveBeenCalledWith('proj-1', '100'),
    );
    expect(screen.getByText('0x64')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0x64')).toBeInTheDocument();
  });
});
