/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockGetAllSpfModuleDefinitions = jest.fn();

jest.mock('~entities/module-definitions', () => ({
  getAllSpfModuleDefinitions: (...args: unknown[]) =>
    mockGetAllSpfModuleDefinitions(...args),
}));

import {createStore} from 'zustand';

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions';
import {
  createModuleListSlice,
  type ModuleListSlice,
} from '~features/graph-designer/model/module-list-slice';

const PROJECT_ID = 'proj-1';

function makeStore() {
  return createStore<ModuleListSlice>((set, get) =>
    createModuleListSlice(set, get, PROJECT_ID),
  );
}

function makeModuleDefinitionDto(
  overrides?: Partial<SpfModuleDefinitionResponseDto>,
): SpfModuleDefinitionResponseDto {
  return {
    builtIn: true,
    customModuleData: {
      entryPointTag: '',
      fileName: '',
      interfaceTypeId: 0,
      interfaceVersionId: 0,
      majorTypeId: 0,
    },
    deprecated: false,
    description: '',
    displayName: 'AudioDecoder',
    isCustomModule: false,
    isLoadedAtBootup: true,
    isOffloadable: false,
    modSearchKeys: '',
    moduleDirectionType: 'SOURCE',
    moduleInfo: {
      containerTypeInfo: [],
      dynamicIntents: [],
      inputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'dpi-in'},
      mdfModuleType: '',
      metaData: 0,
      moduleTypeInfo: {
        buildType: '',
        islandFriendly: false,
        majorModuleType: '',
      },
      outputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'dpi-out'},
      pidFramework: 0,
      reserved: 0,
      stackSize: 0,
      staticCtrlPorts: {
        naturalId: 0,
        portIntents: [],
        portName: '',
        systemId: 'ctrl',
      },
    },
    name: 'AudioDecoder',
    naturalId: 200,
    paramDefinitionsSummaryInfo: [],
    processorInfo: {name: 'DSP', processorId: 1, systemId: 'proc-1'},
    systemId: 'def-1',
    vocoderModuleType: '',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createModuleListSlice — loadModuleList', () => {
  it('populates moduleDefinitionsBySystemId keyed by systemId', async () => {
    const dto = makeModuleDefinitionDto({naturalId: 200});
    mockGetAllSpfModuleDefinitions.mockResolvedValueOnce({
      data: [dto],
    });

    const store = makeStore();
    await store.getState().loadModuleList();

    expect(store.getState().moduleDefinitionsBySystemId['def-1']).toEqual(dto);
  });

  it('keeps natural module IDs and processor labels separate from system IDs', async () => {
    const dto = makeModuleDefinitionDto({
      naturalId: 200,
      processorInfo: {name: 'ADSP', processorId: 1, systemId: 'proc-1'},
      systemId: 'mod-def-200',
    });
    mockGetAllSpfModuleDefinitions.mockResolvedValueOnce({
      data: [dto],
    });

    const store = makeStore();
    await store.getState().loadModuleList();

    expect(store.getState().moduleList[0]).toMatchObject({
      dspType: 'ADSP',
      moduleDefinitionSystemId: 'mod-def-200',
      moduleId: '200',
      processorSystemId: 'proc-1',
    });
    expect(store.getState().selectedDspTypes).toEqual(['ADSP']);
  });

  it('leaves moduleDefinitionsBySystemId empty when the API call fails', async () => {
    mockGetAllSpfModuleDefinitions.mockResolvedValueOnce({
      issues: [{code: 'LOAD_FAILED', message: 'boom', severity: 'ERROR'}],
    });

    const store = makeStore();
    await store.getState().loadModuleList();

    expect(store.getState().moduleDefinitionsBySystemId).toEqual({});
    expect(store.getState().moduleListStatus).toBe('error');
  });
});
