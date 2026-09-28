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

jest.mock('~shared/controls/property-row', () => ({
  PropertyRow: ({
    label,
    mode,
    onChange,
    value,
  }: {
    label: string;
    mode: string;
    onChange: (value: string) => void;
    value: number | string;
  }) =>
    mode === 'select' ? (
      <button data-testid="q-select" onClick={() => onChange(String(value))}>
        {label}
      </button>
    ) : (
      <input
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        value={String(value)}
      />
    ),
}));

jest.mock('~entities/containers', () => ({
  fetchContainerProperties: jest.fn(),
  patchContainerProperty: jest.fn(),
  updateContainerId: jest.fn(),
}));

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

import {
  fetchContainerProperties,
  updateContainerId,
} from '~entities/containers';
import {ContainerPropertiesCard} from '~widgets/properties-panel/ui/entity-cards/container-properties-card';

import {makeGraphData} from './test-graph-data';
import {makeProperty} from './test-properties';

const mockFetchContainerProperties = jest.mocked(fetchContainerProperties);
const mockUpdateContainerId = jest.mocked(updateContainerId);

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
    mockUpdateContainerId.mockResolvedValue({
      data: {
        newContainerNaturalId: 20,
        newContainerSystemId: 'cnt-20',
      },
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
        subgraphSystemId="sg-1"
      />,
    );

    await waitFor(() =>
      expect(fetchContainerProperties).toHaveBeenCalledWith('proj-1', 'cnt-1'),
    );
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
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
              moduleInstances: [],
              naturalId: 100,
              subgraphSystemId: 'sg-1',
              systemId: '100',
            },
          },
        }}
        isEditing
        onContainerIdChange={jest.fn()}
        projectId="proj-1"
        subgraphSystemId="sg-1"
      />,
    );

    await waitFor(() =>
      expect(fetchContainerProperties).toHaveBeenCalledWith('proj-1', '100'),
    );
    expect(screen.getByText('0x64')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('updates a container ID through the subgraph endpoint DTO contract', async () => {
    jest.useFakeTimers();
    const onContainerIdChange = jest.fn();

    render(
      <ContainerPropertiesCard
        containerId="10"
        graphData={{
          ...makeGraphData(),
          containers: {
            10: {
              moduleInstances: [],
              naturalId: 10,
              subgraphSystemId: 'sg-1',
              systemId: '10',
            },
          },
        }}
        isEditing
        onContainerIdChange={onContainerIdChange}
        projectId="proj-1"
        subgraphSystemId="sg-1"
      />,
    );

    await waitFor(() =>
      expect(fetchContainerProperties).toHaveBeenCalledWith('proj-1', '10'),
    );

    fireEvent.change(screen.getByLabelText('Container ID'), {
      target: {value: '20'},
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockUpdateContainerId).toHaveBeenCalledWith('proj-1', 'sg-1', {
      newContainerNaturalId: 20,
      oldContainerNaturalId: 10,
    });
    expect(onContainerIdChange).toHaveBeenCalledWith(
      'sg-1',
      '10',
      'cnt-20',
      20,
    );

    jest.useRealTimers();
  });
});
