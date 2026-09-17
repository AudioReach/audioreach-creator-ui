/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('~features/generic-tree-view', () => ({
  GenericTreeView: () => <div data-testid="generic-tree-view" />,
}));

jest.mock('~entities/spf-modules', () => ({
  fetchSpfModuleProperties: jest.fn(),
  patchSpfModule: jest.fn(),
}));

import {render, screen, waitFor} from '@testing-library/react';

import {fetchSpfModuleProperties} from '~entities/spf-modules';
import {ModulePropertiesCard} from '~widgets/properties-panel/ui/entity-cards/module-properties-card';

import {makeGraphData} from './test-graph-data';
import {makeProperty} from './test-properties';

const mockFetchSpfModuleProperties = jest.mocked(fetchSpfModuleProperties);

describe('ModulePropertiesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSpfModuleProperties.mockResolvedValue({
      data: [makeProperty('Module Schema')],
      message: 'ok',
      success: true,
    });
  });

  it('renders static fields, dynamic port editability, and schema data', async () => {
    const graphData = makeGraphData();
    graphData.moduleInstances['mod-1'].containerSystemId = '1';

    render(
      <ModulePropertiesCard
        graphData={graphData}
        isEditing
        moduleId="mod-1"
        onModuleAliasChange={jest.fn()}
        onModuleContainerChange={jest.fn()}
        onModulePortCountChange={jest.fn()}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getByText('0x64')).toBeInTheDocument();
    expect(screen.getByText('mod-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0x1')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Copy Module ID'})).toBeEnabled();
    expect(
      screen.getByRole('button', {name: 'Copy Instance ID'}),
    ).toBeEnabled();
    expect(screen.getByDisplayValue('3')).toHaveAttribute('readOnly');
    expect(screen.getByDisplayValue('4')).not.toHaveAttribute('readOnly');
    await waitFor(() =>
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', 'mod-1'),
    );
    expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument();
  });

  it('supports card-level collapse controls', async () => {
    const onToggle = jest.fn();

    render(
      <ModulePropertiesCard
        graphData={makeGraphData()}
        isCollapsed
        isEditing
        moduleId="mod-1"
        onModuleAliasChange={jest.fn()}
        onModuleContainerChange={jest.fn()}
        onModulePortCountChange={jest.fn()}
        onToggle={onToggle}
        projectId="proj-1"
      />,
    );

    screen.getByRole('button', {name: 'Expand Source Module'}).click();

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Alias')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', 'mod-1'),
    );
  });
});
