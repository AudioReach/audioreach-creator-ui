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

jest.mock('~entities/usecases', () => ({
  getModulesBySystemIds: jest.fn(),
}));

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {fetchSpfModuleProperties, patchSpfModule} from '~entities/spf-modules';
import {getModulesBySystemIds} from '~entities/usecases';
import {ModulePropertiesCard} from '~widgets/properties-panel/ui/entity-cards/module-properties-card';

import {makeGraphData} from './test-graph-data';
import {makeProperty} from './test-properties';

const mockFetchSpfModuleProperties = jest.mocked(fetchSpfModuleProperties);
const mockGetModulesBySystemIds = jest.mocked(getModulesBySystemIds);
const mockPatchSpfModule = jest.mocked(patchSpfModule);

describe('ModulePropertiesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSpfModuleProperties.mockResolvedValue({
      data: [makeProperty('Module Schema')],
      message: 'ok',
      success: true,
    });
    mockGetModulesBySystemIds.mockResolvedValue({
      data: [],
      message: 'ok',
      success: true,
    });
  });

  it('renders static fields, dynamic port editability, and schema data', async () => {
    const graphData = makeGraphData();
    graphData.moduleInstances['mod-1'].containerSystemId = '1';
    graphData.moduleInstances['mod-1'].maxInputPorts = 0xffffffff;

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
    expect(screen.getByDisplayValue('1')).not.toHaveAttribute('readOnly');
    expect(screen.queryByDisplayValue('4294967295')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', ['mod-1']),
    );
    expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument();
  });

  it('makes control port count read-only when control ports are static', async () => {
    const graphData = makeGraphData();
    graphData.moduleInstances['mod-1'].inputPorts = graphData.moduleInstances[
      'mod-1'
    ].inputPorts.map((port) =>
      port.portType === 'control' ? {...port, isStatic: true} : port,
    );

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

    expect(screen.getByDisplayValue('1')).toHaveAttribute('readOnly');
    await waitFor(() =>
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', ['mod-1']),
    );
  });

  it('makes port-count fields read-only while a graph mutation is active', async () => {
    render(
      <ModulePropertiesCard
        graphData={makeGraphData()}
        isEditing
        isMutating
        moduleId="mod-1"
        onModuleAliasChange={jest.fn()}
        onModuleContainerChange={jest.fn()}
        onModulePortCountChange={jest.fn()}
        projectId="proj-1"
      />,
    );

    expect(screen.getByDisplayValue('4')).toHaveAttribute('readOnly');
    expect(screen.getByDisplayValue('1')).toHaveAttribute('readOnly');
    await waitFor(() =>
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', ['mod-1']),
    );
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
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', ['mod-1']),
    );
  });

  it('passes returned port-count module data to the local graph update', async () => {
    const onModulePortCountChange = jest.fn();
    const runMutation = jest.fn((action: () => Promise<unknown>) => action());
    const patchedModule = {
      alias: 'Source Module',
      containerSystemId: 'cnt-1',
      controlPorts: [],
      dataPorts: [],
      maxControlPortsSupported: 1,
      maxInputPortsSupported: 3,
      maxOutputPortsSupported: 2,
      moduleDefinitionSystemId: '100',
      name: 'Source Module',
      naturalId: 100,
      relatedEndPointLinks: [],
      subgraphSystemId: 'sg-1',
      systemId: 'mod-1',
    };
    const refreshedModule = {
      ...patchedModule,
      dataPorts: [
        {
          name: 'Output A',
          naturalId: 1,
          portIoType: 'Output' as const,
          portType: 'Dynamic' as const,
          systemId: 'out-1',
          totalLinksAtPort: 0,
        },
        {
          name: 'Output B',
          naturalId: 2,
          portIoType: 'Output' as const,
          portType: 'Dynamic' as const,
          systemId: 'out-2',
          totalLinksAtPort: 0,
        },
      ],
    };
    mockPatchSpfModule.mockResolvedValue({
      data: patchedModule,
      message: 'ok',
      success: true,
    });
    mockGetModulesBySystemIds.mockResolvedValue({
      data: [refreshedModule],
      message: 'ok',
      success: true,
    });

    render(
      <ModulePropertiesCard
        graphData={makeGraphData()}
        isEditing
        moduleId="mod-1"
        onModuleAliasChange={jest.fn()}
        onModuleContainerChange={jest.fn()}
        onModulePortCountChange={onModulePortCountChange}
        projectId="proj-1"
        runMutation={runMutation}
      />,
    );
    await waitFor(() =>
      expect(fetchSpfModuleProperties).toHaveBeenCalledWith('proj-1', ['mod-1']),
    );

    const outputPortsInput = screen.getByDisplayValue('4');
    fireEvent.change(outputPortsInput, {
      target: {value: '2'},
    });
    expect(patchSpfModule).not.toHaveBeenCalled();
    expect(onModulePortCountChange).not.toHaveBeenCalled();

    fireEvent.blur(outputPortsInput);

    await waitFor(() =>
      expect(onModulePortCountChange).toHaveBeenLastCalledWith(
        'mod-1',
        'maxOutputPorts',
        2,
        refreshedModule,
      ),
    );
    expect(getModulesBySystemIds).toHaveBeenCalledWith('proj-1', ['mod-1']);
    expect(runMutation).toHaveBeenCalledTimes(1);
  });
});
