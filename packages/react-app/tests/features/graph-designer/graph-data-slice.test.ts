/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/usecases/api/usecases-api');

import {createStore} from 'zustand';

import {getUsecaseComponents} from '~entities/usecases/api/usecases-api';
import {
  createGraphDataSlice,
  type GraphDataSlice,
} from '~features/graph-designer/model/graph-data-slice';
import {
  createModuleListSlice,
  type ModuleDefinition,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';

const mockGetUsecaseComponents = jest.mocked(getUsecaseComponents);

type TestStore = GraphDataSlice & ModuleListSlice;

function makeStore(moduleList: ModuleDefinition[] = []) {
  const store = createStore<TestStore>((set, get) => ({
    ...createGraphDataSlice(set, get, 'proj-1'),
    ...createModuleListSlice(set, get, 'proj-1'),
  }));
  if (moduleList.length > 0) {
    store.setState({moduleList});
  }
  return store;
}

const minimalDto = {
  controlLinks: [],
  dataLinks: [],
  spfModules: [
    {
      alias: '',
      containerId: 10,
      controlPorts: [],
      dataPorts: [],
      id: 1,
      moduleId: 200,
      name: 'AudioDecoder',
      subgraphId: 1,
      systemId: 'sys-mod-1',
    },
  ],
  subsystems: [],
};

describe('createGraphDataSlice — moduleType resolution', () => {
  it('resolves moduleType from moduleList moduleType when a matching definition exists', async () => {
    const store = makeStore([
      {
        builtIn: false,
        category: 'WR_SHARED_MEM_EP',
        description: '',
        dspType: 'ADSP',
        inputPorts: [],
        moduleId: '200',
        moduleName: 'AudioDecoder',
        moduleType: 'SOURCE',
        outputPorts: [],
      },
    ]);

    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.moduleType).toBe('SOURCE');
  });

  it('falls back to empty string when no matching module definition exists', async () => {
    const store = makeStore([]);

    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.moduleType).toBe('');
  });

  it('uses empty string moduleType for instances whose definition is absent from moduleList', async () => {
    const store = makeStore([
      {
        builtIn: false,
        category: 'SINK_MODULE',
        description: '',
        dspType: 'ADSP',
        inputPorts: [],
        moduleId: '999', // different moduleId — won't match
        moduleName: 'SomeSink',
        moduleType: 'SINK',
        outputPorts: [],
      },
    ]);

    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: minimalDto as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const instance = store.getState().graphData?.moduleInstances['sys-mod-1'];
    expect(instance?.moduleType).toBe('');
  });
});

describe('createGraphDataSlice — Subsystem.subgraphs population (B5)', () => {
  const dtoWithSubsystem = {
    controlLinks: [],
    dataLinks: [],
    spfModules: [
      {
        alias: '',
        containerId: 10,
        controlPorts: [],
        dataPorts: [],
        id: 1,
        moduleId: 200,
        name: 'AudioDecoder',
        // parentId links the module's subgraph to subsystem id=20
        parentId: 20,
        subgraphId: 5,
        systemId: 'sys-mod-1',
      },
    ],
    subsystems: [
      {
        controlPorts: [],
        dataPorts: [],
        id: 20,
        name: 'AudioSubsystem',
        systemId: 'sys-ss-20',
      },
    ],
  };

  it('populates Subsystem.subgraphs with the subgraph IDs whose modules have parentId matching the subsystem', async () => {
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoWithSubsystem as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subsystem = store.getState().graphData?.subsystems['sys-ss-20'];
    expect(subsystem?.subgraphs).toContain('5');
  });

  it('leaves Subsystem.subgraphs empty when no module has a parentId linking it to that subsystem', async () => {
    const dtoNoParentId = {
      ...dtoWithSubsystem,
      spfModules: [{...dtoWithSubsystem.spfModules[0], parentId: undefined}],
    };
    const store = makeStore([]);
    mockGetUsecaseComponents.mockResolvedValueOnce({
      data: dtoNoParentId as never,
      message: undefined,
      success: true,
    });

    await store.getState().loadGraphData(['uc-1']);

    const subsystem = store.getState().graphData?.subsystems['sys-ss-20'];
    expect(subsystem?.subgraphs).toHaveLength(0);
  });
});
