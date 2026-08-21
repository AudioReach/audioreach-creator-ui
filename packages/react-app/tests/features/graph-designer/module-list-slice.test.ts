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
    customModuleInfo: {
      entryPointTag: '',
      fileName: '',
      interfaceTypeId: 0,
      interfaceVersionId: 0,
      majorTypeId: 0,
    },
    deprecated: false,
    description: '',
    displayName: 'AudioDecoder',
    isOffloadable: false,
    modSearchKeys: '',
    moduleDirectionType: 'SOURCE',
    moduleId: 200,
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
        portId: 0,
        portIntents: [],
        portName: '',
        systemId: 'ctrl',
      },
    },
    name: 'AudioDecoder',
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
  it('populates moduleDefinitionsById keyed by String(moduleId)', async () => {
    const dto = makeModuleDefinitionDto({moduleId: 200});
    mockGetAllSpfModuleDefinitions.mockResolvedValueOnce({
      data: [dto],
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().loadModuleList();

    expect(store.getState().moduleDefinitionsById['200']).toEqual(dto);
  });

  it('keeps natural module IDs and processor labels separate from system IDs', async () => {
    const dto = makeModuleDefinitionDto({
      moduleId: 200,
      processorInfo: {name: 'ADSP', processorId: 1, systemId: 'proc-1'},
      systemId: 'mod-def-200',
    });
    mockGetAllSpfModuleDefinitions.mockResolvedValueOnce({
      data: [dto],
      message: undefined,
      success: true,
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

  it('leaves moduleDefinitionsById empty when the API call fails', async () => {
    mockGetAllSpfModuleDefinitions.mockResolvedValueOnce({
      data: undefined,
      message: 'boom',
      success: false,
    });

    const store = makeStore();
    await store.getState().loadModuleList();

    expect(store.getState().moduleDefinitionsById).toEqual({});
    expect(store.getState().moduleListStatus).toBe('error');
  });
});
