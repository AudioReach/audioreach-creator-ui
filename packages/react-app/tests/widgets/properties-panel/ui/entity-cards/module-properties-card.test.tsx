/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('~entities/spf-modules', () => ({
  patchSpfModule: jest.fn(),
}));

import {render, screen} from '@testing-library/react';

import {ModulePropertiesCard} from '~widgets/properties-panel/ui/entity-cards/module-properties-card';

import {makeGraphData} from './test-graph-data';

describe('ModulePropertiesCard', () => {
  it('renders static fields and dynamic port editability', () => {
    const graphData = makeGraphData();
    graphData.moduleInstances['mod-1'].containerId = '1';

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
  });

  it('supports card-level collapse controls', () => {
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
  });
});
