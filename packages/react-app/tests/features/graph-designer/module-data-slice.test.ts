/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockGetCalData = jest.fn();
const mockPutCalData = jest.fn();
const mockGetTagData = jest.fn();
const mockPutTagData = jest.fn();
const mockQueryModuleIndices = jest.fn();

jest.mock('~entities/spf-module-data', () => ({
  getCalData: (...args: unknown[]) => mockGetCalData(...args),
  getTagData: (...args: unknown[]) => mockGetTagData(...args),
  putCalData: (...args: unknown[]) => mockPutCalData(...args),
  putTagData: (...args: unknown[]) => mockPutTagData(...args),
  queryModuleIndices: (...args: unknown[]) => mockQueryModuleIndices(...args),
}));

const mockShowToast = jest.fn();
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

import {createStore} from 'zustand';

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions';
import type {
  CalDataDto,
  CkvDto,
  ParameterDetailDto,
  SpfModuleDto,
  TagDataDto,
  TagInfoDto,
} from '~entities/spf-module-data';
import {PARAM_ID_MODULE_ENABLE} from '~features/graph-designer/lib/module-enable.constants';
import type {
  GraphDataSlice,
  ModuleInstance,
} from '~features/graph-designer/model/graph-data-slice';
import {
  createModuleDataSlice,
  type ModuleDataSlice,
} from '~features/graph-designer/model/module-data-slice';
import type {ModuleListSlice} from '~features/graph-designer/model/module-list-slice';
import {
  createSubgraphHeaderSelectionSlice,
  type SubgraphHeaderSelectionSlice,
} from '~features/graph-designer/model/subgraph-header-selection-slice';

const PROJECT_ID = 'proj-1';
const MODULE_ID = 'mod-1';
const MODULE_NAME = 'AudioDecoder';
const ENABLE_PARAM_SYSTEM_ID = 'PARAM_ID_MODULE_ENABLE_SYS_ID';
const MODULE_DEFINITION_ID = 'mod-def-1';

function makeStore() {
  return createStore<ModuleDataSlice>((set, get) =>
    createModuleDataSlice(set, get, PROJECT_ID),
  );
}

type TestStore = ModuleDataSlice &
  GraphDataSlice &
  ModuleListSlice &
  SubgraphHeaderSelectionSlice;

function makeWidenedStore(options: {
  headerSelectionsBySubgraphId?: SubgraphHeaderSelectionSlice['headerSelectionsBySubgraphId'];
  moduleDefinitionsById?: ModuleListSlice['moduleDefinitionsById'];
  moduleInstances?: Record<string, ModuleInstance>;
  withEnableDefinition?: boolean;
}) {
  const store = createStore<TestStore>((set, get) => ({
    ...createModuleDataSlice(set, get, PROJECT_ID),
    ...createSubgraphHeaderSelectionSlice(set, get),
    clearGraphData: () => {},
    graphData: {
      connections: [],
      containers: {},
      moduleInstances: options.moduleInstances ?? {},
      selectedUsecases: [],
      subgraphs: {},
      subsystems: {},
    },
    graphDataError: null,
    graphDataStatus: 'ready',
    initializeEmptyGraphData: () => {},
    isDirty: false,
    loadGraphData: async () => {},
    loadModuleList: async () => {},
    markClean: () => {},
    markDirty: () => {},
    moduleDefinitionsById: options.moduleDefinitionsById ?? {},
    moduleList: [],
    moduleListSearchQuery: '',
    moduleListStatus: 'ready',
    selectedDspTypes: [],
    selectedModuleTypes: [],
    setModuleListSearchQuery: () => {},
    setSelectedDspTypes: () => {},
    setSelectedModuleTypes: () => {},
  }));
  if (options.headerSelectionsBySubgraphId) {
    store.setState({
      headerSelectionsBySubgraphId: options.headerSelectionsBySubgraphId,
    });
  }
  if (
    !options.moduleDefinitionsById &&
    (options.withEnableDefinition ?? true)
  ) {
    store.setState({
      moduleDefinitionsById: {
        [MODULE_DEFINITION_ID]: makeModuleDefinitionDtoWithEnable(),
      },
    });
  }
  return store;
}

function makeModuleDefinitionDtoWithEnable(): SpfModuleDefinitionResponseDto {
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
    displayName: MODULE_NAME,
    isOffloadable: false,
    modSearchKeys: '',
    moduleDirectionType: 'SOURCE',
    moduleId: 1,
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
    name: MODULE_NAME,
    paramDefinitionsSummaryInfo: [
      {
        deprecated: false,
        description: '',
        isHidden: false,
        isReadOnly: false,
        name: 'Enable',
        paramId: PARAM_ID_MODULE_ENABLE,
        pidType: '',
        systemId: ENABLE_PARAM_SYSTEM_ID,
      },
    ],
    processorInfo: {name: 'DSP', processorId: 1, systemId: 'proc-1'},
    systemId: MODULE_DEFINITION_ID,
    vocoderModuleType: '',
  };
}

function makeModuleInstance(
  overrides?: Partial<ModuleInstance>,
): ModuleInstance {
  return {
    containerId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: MODULE_DEFINITION_ID,
    moduleInstanceId: MODULE_ID,
    moduleName: MODULE_NAME,
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
    ...overrides,
  };
}

function makeCkv(systemId: string, keyValues: [string, string][]): CkvDto {
  return {
    keyValueCollection: keyValues.map(([keySystemId, valueSystemId]) => ({
      keyInfo: {keyId: 0, keyLabel: keySystemId, keySystemId},
      valueInfo: {valueId: 0, valueLabel: valueSystemId, valueSystemId},
    })),
    supportedParameters: [],
    systemId,
  };
}

function makeCalDataDto(overrides?: Partial<CalDataDto>): CalDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    Ckv: [],
    parameters: [],
    systemId: 'ckv-1',
    ...overrides,
  };
}

function makeTagDataDto(overrides?: Partial<TagDataDto>): TagDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    parameters: [],
    systemId: 'tkv-1',
    Tkv: [],
    ...overrides,
  };
}

function makeCkvDto(systemId: string): CkvDto {
  return {keyValueCollection: [], supportedParameters: [], systemId};
}

function makeTagInfoDto(systemId: string, tkvSystemIds: string[]): TagInfoDto {
  return {
    systemId,
    tagId: 1,
    tagName: 'tag',
    tkvs: tkvSystemIds.map((tkvSystemId) => ({
      keyValueCollection: [],
      supportedParameters: [],
      systemId: tkvSystemId,
    })),
  };
}

function makeParam(
  parameterId: string,
  overrides?: Partial<ParameterDetailDto>,
): ParameterDetailDto {
  return {
    changeInfo: {changeType: 'NONE'},
    elements: [],
    name: parameterId,
    parameterId,
    systemId: parameterId,
    ...overrides,
  };
}

function makeModuleDefinitionWithEnable(
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
    displayName: 'Splitter',
    isOffloadable: false,
    modSearchKeys: '',
    moduleDirectionType: 'SOURCE',
    moduleId: 2012,
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
    name: 'Splitter',
    paramDefinitionsSummaryInfo: [
      {
        deprecated: false,
        description: '',
        isHidden: false,
        isReadOnly: false,
        name: 'Enable',
        paramId: 0x8001026,
        pidType: '',
        systemId: ENABLE_PARAM_SYSTEM_ID,
        toolPolicy: '',
      },
    ],
    processorInfo: {name: 'DSP', processorId: 1, systemId: 'proc-1'},
    systemId: 'def-2012',
    vocoderModuleType: '',
    ...overrides,
  };
}

function enableDtoFixture(value: string): CalDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    Ckv: [],
    parameters: [
      {
        changeInfo: {changeType: 'NONE'},
        elements: [
          {
            allowedValues: [
              {name: 'Enable', type: 'NAME_VALUE_PAIR', value: '0x1'},
              {name: 'Disable', type: 'NAME_VALUE_PAIR', value: '0x0'},
            ],
            isReadOnly: false,
            name: 'Enable',
            type: 'CONFIG_ELEMENT',
            value,
          },
        ],
        name: 'Enable',
        parameterId: '0x8001026',
        systemId: ENABLE_PARAM_SYSTEM_ID,
      },
    ],
    systemId: 'ckv-devicerx-btrx',
  };
}

const ENABLE_MODULE_ID = 'mod-2012';

function makeStoreWithEnableModule() {
  return makeWidenedStore({
    headerSelectionsBySubgraphId: {
      'sg-502': {keyValues: {'key-device': 'v-btrx'}, subgraphId: 'sg-502'},
    },
    moduleDefinitionsById: {
      'mod-def-2012': makeModuleDefinitionWithEnable(),
    },
    moduleInstances: {
      [ENABLE_MODULE_ID]: makeModuleInstance({
        ckvs: [
          makeCkv('ckv-devicerx-btrx', [['key-device', 'v-btrx']]),
          makeCkv('ckv-devicerx-headset', [['key-device', 'v-headset']]),
        ],
        moduleId: 'mod-def-2012',
        moduleInstanceId: ENABLE_MODULE_ID,
        subgraphId: 'sg-502',
      }),
    },
  });
}

function makeStoreWithUnresolvedHeader() {
  return makeWidenedStore({
    headerSelectionsBySubgraphId: {
      'sg-502': {keyValues: {'key-device': 'NA'}, subgraphId: 'sg-502'},
    },
    moduleDefinitionsById: {
      'mod-def-2012': makeModuleDefinitionWithEnable(),
    },
    moduleInstances: {
      [ENABLE_MODULE_ID]: makeModuleInstance({
        ckvs: [
          makeCkv('ckv-devicerx-btrx', [['key-device', 'v-btrx']]),
          makeCkv('ckv-devicerx-headset', [['key-device', 'v-headset']]),
        ],
        moduleId: 'mod-def-2012',
        moduleInstanceId: ENABLE_MODULE_ID,
        subgraphId: 'sg-502',
      }),
    },
  });
}

function makeStoreWithTwoSubgraphs() {
  return makeWidenedStore({
    headerSelectionsBySubgraphId: {
      '502': {keyValues: {'key-device': 'v-a'}, subgraphId: '502'},
      '503': {keyValues: {'key-device': 'v-btrx'}, subgraphId: '503'},
    },
    moduleDefinitionsById: {
      'mod-def-2011': makeModuleDefinitionWithEnable({
        moduleId: 2011,
        systemId: 'def-2011',
      }),
      'mod-def-2012': makeModuleDefinitionWithEnable(),
    },
    moduleInstances: {
      [ENABLE_MODULE_ID]: makeModuleInstance({
        ckvs: [makeCkv('ckv-devicerx-btrx', [['key-device', 'v-btrx']])],
        moduleId: 'mod-def-2012',
        moduleInstanceId: ENABLE_MODULE_ID,
        subgraphId: '503',
      }),
      'mod-2011': makeModuleInstance({
        ckvs: [makeCkv('ckv-a', [['key-device', 'v-a']])],
        moduleId: 'mod-def-2011',
        moduleInstanceId: 'mod-2011',
        subgraphId: '502',
      }),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createModuleDataSlice — queryModuleData', () => {
  it('resolves the active CKV from the header selection, not simply the first available one, and still fetches the first tag/tkv', async () => {
    const module: SpfModuleDto = {
      changeInfo: {changeType: 'NONE'},
      ckvs: [makeCkvDto('ckv-1'), makeCkvDto('ckv-2')],
      id: 1,
      systemId: MODULE_ID,
      tags: [makeTagInfoDto('tag-1', ['tkv-1'])],
    };
    mockQueryModuleIndices.mockResolvedValueOnce({
      data: [module],
      message: undefined,
      success: true,
    });
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v2'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-2', [['key-1', 'v2']])],
        }),
      },
    });
    const result = await store
      .getState()
      .queryModuleData(MODULE_ID, MODULE_NAME);

    expect(result).toBe(true);
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.availableCalIndices).toHaveLength(2);
    expect(entry.tagData?.availableTagIndices).toHaveLength(1);
    expect(mockGetCalData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-2',
      undefined,
    );
    expect(mockGetTagData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'tag-1',
      'tkv-1',
    );
  });

  it('does not fetch cal data and leaves selectedCalIndex unset when the CKV is unresolved, but still fetches the first tag/tkv', async () => {
    const module: SpfModuleDto = {
      changeInfo: {changeType: 'NONE'},
      ckvs: [makeCkvDto('ckv-1')],
      id: 1,
      systemId: MODULE_ID,
      tags: [makeTagInfoDto('tag-1', ['tkv-1'])],
    };
    mockQueryModuleIndices.mockResolvedValueOnce({
      data: [module],
      message: undefined,
      success: true,
    });
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'NA'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    const result = await store
      .getState()
      .queryModuleData(MODULE_ID, MODULE_NAME);

    expect(result).toBe(true);
    expect(mockGetCalData).not.toHaveBeenCalled();
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.selectedCalIndex).toBeUndefined();
    expect(mockGetTagData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'tag-1',
      'tkv-1',
    );
  });

  it('re-resolves the CKV from the current header state on reopen, not a stale cached value', async () => {
    const module: SpfModuleDto = {
      changeInfo: {changeType: 'NONE'},
      ckvs: [makeCkvDto('ckv-1'), makeCkvDto('ckv-2')],
      id: 1,
      systemId: MODULE_ID,
      tags: [],
    };
    mockQueryModuleIndices.mockResolvedValue({
      data: [module],
      message: undefined,
      success: true,
    });
    mockGetCalData.mockResolvedValue({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [
            makeCkv('ckv-1', [['key-1', 'v1']]),
            makeCkv('ckv-2', [['key-1', 'v2']]),
          ],
        }),
      },
    });

    await store.getState().queryModuleData(MODULE_ID, MODULE_NAME);
    expect(mockGetCalData).toHaveBeenLastCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-1',
      undefined,
    );

    store.getState().clearModuleData(MODULE_ID);
    store.getState().setHeaderKeyValue('sg-1', 'key-1', 'v2');

    await store.getState().queryModuleData(MODULE_ID, MODULE_NAME);
    expect(mockGetCalData).toHaveBeenLastCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-2',
      undefined,
    );
  });

  it('does not clear the cached dto/selectedCalIndex while reopening, so the canvas overlay does not flash to not-ready', async () => {
    const module: SpfModuleDto = {
      changeInfo: {changeType: 'NONE'},
      ckvs: [makeCkvDto('ckv-1')],
      id: 1,
      systemId: MODULE_ID,
      tags: [],
    };
    mockQueryModuleIndices.mockResolvedValue({
      data: [module],
      message: undefined,
      success: true,
    });
    mockGetCalData.mockResolvedValue({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    const existingDto = makeCalDataDto();
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: existingDto,
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    const promise = store.getState().queryModuleData(MODULE_ID, MODULE_NAME);
    const midFlightEntry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(midFlightEntry.calData?.dto).toBe(existingDto);
    expect(midFlightEntry.calData?.selectedCalIndex).toBe('ckv-1');

    await promise;
  });

  it('toasts and returns false when the API call fails', async () => {
    mockQueryModuleIndices.mockResolvedValueOnce({
      data: undefined,
      message: 'boom',
      success: false,
    });

    const store = makeStore();
    const result = await store
      .getState()
      .queryModuleData(MODULE_ID, MODULE_NAME);

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'danger');
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.status).toBe('error');
    expect(entry.tagData?.status).toBe('error');
  });

  it('treats a successful empty response as ready, not an error', async () => {
    mockQueryModuleIndices.mockResolvedValueOnce({
      data: [],
      message: undefined,
      success: true,
    });

    const store = makeStore();
    const result = await store
      .getState()
      .queryModuleData(MODULE_ID, MODULE_NAME);

    expect(result).toBe(true);
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'warning');
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.status).toBe('ready');
    expect(entry.calData?.error).toBeUndefined();
    expect(entry.tagData?.status).toBe('ready');
    expect(entry.tagData?.error).toBeUndefined();
    expect(mockGetCalData).not.toHaveBeenCalled();
    expect(mockGetTagData).not.toHaveBeenCalled();
  });
});

describe('createModuleDataSlice — fetchCalData', () => {
  it('sets loadedScope to full on a full fetch', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.status).toBe('ready');
    expect(entry.calData?.lastMutation).toBe('get');
  });

  it('sets loadedScope to partial on a partial fetch', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('partial');
    expect(mockGetCalData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-1',
      ['param-1'],
    );
  });
  it('does not replace a full DTO with a partial response for the same CKV', async () => {
    const fullDto = makeCalDataDto({
      parameters: [makeParam('param-1'), makeParam('param-2')],
    });

    const store = makeStore();
    // Seed a full DTO already in place for ckv-1.
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: fullDto,
            loadedScope: 'full',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    // Partial fetch for the same CKV arrives — full DTO must be preserved.
    await store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    expect(mockGetCalData).not.toHaveBeenCalled();
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.dto).toBe(fullDto);
  });

  it('does not replace a full DTO with a partial success for a different CKV', async () => {
    const fullDto = makeCalDataDto({systemId: 'ckv-2'});

    const store = makeStore();
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: fullDto,
            loadedScope: 'full',
            selectedCalIndex: 'ckv-2',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    // Stale partial fetch for CKV A resolves after full CKV B is loaded.
    await store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    expect(mockGetCalData).not.toHaveBeenCalled();
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.dto).toBe(fullDto);
    expect(entry.calData?.selectedCalIndex).toBe('ckv-2');
  });

  it('does not mark a full DTO as errored when a partial failure arrives for a different CKV', async () => {
    const fullDto = makeCalDataDto({systemId: 'ckv-2'});

    const store = makeStore();
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: fullDto,
            loadedScope: 'full',
            selectedCalIndex: 'ckv-2',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    // Partial fetch for CKV A fails — must not clobber the full CKV B entry.
    const result = await store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    expect(result).toBe(false);
    expect(mockGetCalData).not.toHaveBeenCalled();
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.status).toBe('ready');
    expect(entry.calData?.dto).toBe(fullDto);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not mark a full DTO as errored when a partial same-CKV failure arrives', async () => {
    const fullDto = makeCalDataDto();

    const store = makeStore();
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: fullDto,
            loadedScope: 'full',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    // Partial failure for the same CKV — must not clobber the full DTO.
    const result = await store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    expect(result).toBe(false);
    expect(mockGetCalData).not.toHaveBeenCalled();
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.status).toBe('ready');
    expect(entry.calData?.dto).toBe(fullDto);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not overwrite a full DTO that arrived in-flight while a partial request was already in progress', async () => {
    let resolveGet!: (value: {
      data: CalDataDto;
      message: undefined;
      success: true;
    }) => void;
    mockGetCalData.mockImplementationOnce(
      () =>
        new Promise<{data: CalDataDto; message: undefined; success: true}>(
          (resolve) => {
            resolveGet = resolve;
          },
        ),
    );

    const store = makeStore();
    // Start a partial fetch — this sets status: 'loading'.
    const fetchPromise = store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    // While the partial is in flight, the tab opens and seeds a full DTO.
    const fullDto = makeCalDataDto({
      parameters: [makeParam('param-1'), makeParam('param-2')],
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: fullDto,
            loadedScope: 'full',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    // Partial response arrives — in-flight guard must discard it.
    resolveGet({
      data: makeCalDataDto({parameters: [makeParam('param-1')]}),
      message: undefined,
      success: true,
    });
    await fetchPromise;

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.dto).toBe(fullDto);
  });
});

describe('createModuleDataSlice — setCalUiState / setGroupedCalUiState / setTagUiState', () => {
  it('merges a uiState patch into an existing calData entry', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    store.getState().setCalUiState(MODULE_ID, {searchText: 'gain'});

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.uiState?.searchText).toBe('gain');
  });

  it('is a no-op when no calData entry exists yet', () => {
    const store = makeStore();
    store.getState().setCalUiState(MODULE_ID, {searchText: 'gain'});

    expect(store.getState().moduleDataByInstanceId[MODULE_ID]).toBeUndefined();
  });
});

describe('createModuleDataSlice — setModuleOpenTab', () => {
  it('does not call clearModuleData when switching tabs', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    store.getState().setModuleOpenTab(MODULE_ID, 'cal-tab');

    expect(store.getState().moduleOpenTabs[MODULE_ID]).toBe('cal-tab');
    expect(store.getState().moduleDataByInstanceId[MODULE_ID]).toBeDefined();
  });
});

describe('createModuleDataSlice — updateCalData', () => {
  it('replaces only the returned parameters by id, preserving the rest, and flags lastMutation as set', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto({
        parameters: [makeParam('param-1'), makeParam('param-2')],
      }),
      message: undefined,
      success: true,
    });
    mockPutCalData.mockResolvedValueOnce({
      data: makeCalDataDto({
        parameters: [
          makeParam('param-1', {
            elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
          }),
        ],
      }),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    await store.getState().updateCalData(MODULE_ID, {data: []});

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.dto?.parameters).toEqual([
      makeParam('param-1', {
        elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
      }),
      makeParam('param-2'),
    ]);
    expect(entry.calData?.lastMutation).toBe('set');
  });

  it('toasts and returns void when no calData is loaded', async () => {
    const store = makeStore();
    const result = await store.getState().updateCalData(MODULE_ID, {data: []});

    expect(result).toBeUndefined();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'danger');
    expect(mockPutCalData).not.toHaveBeenCalled();
  });

  it('ignores a second Set while the first is still in flight', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });
    let resolvePut: (value: {
      data: CalDataDto;
      message: undefined;
      success: true;
    }) => void = () => {};
    mockPutCalData.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePut = resolve;
        }),
    );

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');

    const firstSet = store.getState().updateCalData(MODULE_ID, {data: []});
    const secondResult = await store
      .getState()
      .updateCalData(MODULE_ID, {data: []});

    expect(secondResult).toBeUndefined();
    expect(mockPutCalData).toHaveBeenCalledTimes(1);

    resolvePut({data: makeCalDataDto(), message: undefined, success: true});
    await firstSet;
  });
});

describe('createModuleDataSlice — setModuleEnable', () => {
  const ENABLE_ELEMENT = {
    allowedValues: [
      {name: 'Enable', type: 'NAME_VALUE_PAIR' as const, value: '0x1'},
      {name: 'Disable', type: 'NAME_VALUE_PAIR' as const, value: '0x0'},
    ],
    isReadOnly: false,
    name: 'Enable',
    type: 'CONFIG_ELEMENT' as const,
    value: '0x0',
  };
  const OTHER_ELEMENT = {
    isReadOnly: false,
    name: 'Gain',
    type: 'CONFIG_ELEMENT' as const,
    value: '10',
  };

  function makeCalDataDtoWithEnable(): CalDataDto {
    return makeCalDataDto({
      parameters: [
        {
          changeInfo: {changeType: 'NONE'},
          elements: [ENABLE_ELEMENT],
          name: 'Enable',
          parameterId: '0x8001026',
          systemId: ENABLE_PARAM_SYSTEM_ID,
        },
        {
          changeInfo: {changeType: 'NONE'},
          elements: [OTHER_ELEMENT],
          name: 'Gain',
          parameterId: '0x8001099',
          systemId: 'PARAM_ID_GAIN_SYS_ID',
        },
      ],
    });
  }

  it('PUTs a single-item payload filtered to the enable param and merges the response by parameterId, flagging lastMutation as set', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDtoWithEnable(),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });
    mockPutCalData.mockResolvedValueOnce({
      data: makeCalDataDto({
        changeInfo: {changeType: 'UPDATE'},
        parameters: [
          {
            changeInfo: {changeType: 'UPDATE'},
            elements: [{...ENABLE_ELEMENT, value: '0x1'}],
            name: 'Enable',
            parameterId: '0x8001026',
            systemId: ENABLE_PARAM_SYSTEM_ID,
          },
        ],
      }),
      message: undefined,
      success: true,
    });

    await store.getState().setModuleEnable(MODULE_ID, true);

    expect(mockPutCalData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-1',
      {
        data: [
          expect.objectContaining({
            elements: [{...ENABLE_ELEMENT, value: '0x1'}],
            parameterId: '0x8001026',
          }),
        ],
      },
      [ENABLE_PARAM_SYSTEM_ID],
    );
    expect(mockPutCalData.mock.calls[0][3].data).toHaveLength(1);

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    const parameters = entry.calData?.dto?.parameters ?? [];
    expect(parameters).toHaveLength(2);
    expect(
      parameters.find((p) => p.parameterId === '0x8001026')?.elements[0],
    ).toEqual({...ENABLE_ELEMENT, value: '0x1'});
    expect(parameters.find((p) => p.parameterId === '0x8001099')).toEqual(
      expect.objectContaining({elements: [OTHER_ELEMENT], name: 'Gain'}),
    );
    expect(entry.calData?.lastMutation).toBe('set');
    expect(entry.calData?.status).toBe('ready');
  });

  it('resolves the enable systemId from the module definition by paramId, not by a hardcoded systemId string', async () => {
    const unconventionalSystemId = 'unconventional-enable-sys-id';
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
      withEnableDefinition: false,
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDto({
              parameters: [
                {
                  changeInfo: {changeType: 'NONE'},
                  elements: [ENABLE_ELEMENT],
                  name: 'Enable',
                  parameterId: '0x8001026',
                  systemId: unconventionalSystemId,
                },
              ],
            }),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
      moduleDefinitionsById: {
        [MODULE_DEFINITION_ID]: {
          ...makeModuleDefinitionDtoWithEnable(),
          paramDefinitionsSummaryInfo: [
            {
              deprecated: false,
              description: '',
              isHidden: false,
              isReadOnly: false,
              name: 'Enable',
              paramId: PARAM_ID_MODULE_ENABLE,
              pidType: '',
              systemId: unconventionalSystemId,
            },
          ],
        },
      },
    });
    mockPutCalData.mockResolvedValueOnce({
      data: makeCalDataDto({
        parameters: [
          {
            changeInfo: {changeType: 'UPDATE'},
            elements: [{...ENABLE_ELEMENT, value: '0x1'}],
            name: 'Enable',
            parameterId: '0x8001026',
            systemId: unconventionalSystemId,
          },
        ],
      }),
      message: undefined,
      success: true,
    });

    await store.getState().setModuleEnable(MODULE_ID, true);

    expect(mockPutCalData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-1',
      expect.anything(),
      [unconventionalSystemId],
    );
  });

  it('aborts before calling putCalData when the module definition has no enable param', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
      withEnableDefinition: false,
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDtoWithEnable(),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    await store.getState().setModuleEnable(MODULE_ID, true);

    expect(mockPutCalData).not.toHaveBeenCalled();
  });

  it('aborts before calling putCalData when the active CKV is unresolved', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'NA'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDtoWithEnable(),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    await store.getState().setModuleEnable(MODULE_ID, true);

    expect(mockPutCalData).not.toHaveBeenCalled();
  });

  it('shows a toast and leaves dto untouched when the PUT fails', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    const originalDto = makeCalDataDtoWithEnable();
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: originalDto,
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });
    mockPutCalData.mockResolvedValueOnce({
      data: undefined,
      message: 'boom',
      success: false,
    });

    await store.getState().setModuleEnable(MODULE_ID, true);

    expect(mockShowToast).toHaveBeenCalledWith('boom', 'danger');
    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.calData?.dto).toBe(originalDto);
  });

  it('does not write when the cached DTO belongs to a different CKV', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDtoWithEnable(),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-stale', // resolved CKV is 'ckv-1'
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });

    await store.getState().setModuleEnable(MODULE_ID, true);

    expect(mockPutCalData).not.toHaveBeenCalled();
  });

  it('ignores a second toggle while a save is already in flight', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDtoWithEnable(),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });
    mockPutCalData.mockImplementation(() => new Promise(() => {})); // never resolves

    void store.getState().setModuleEnable(MODULE_ID, true);
    await store.getState().setModuleEnable(MODULE_ID, false);

    expect(mockPutCalData).toHaveBeenCalledTimes(1);
  });

  it('applies the later call intent when two saves resolve out of order', async () => {
    const store = makeWidenedStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleInstances: {
        [MODULE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    store.setState({
      moduleDataByInstanceId: {
        [MODULE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDtoWithEnable(),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: MODULE_NAME,
        },
      },
    });
    let resolveFirst: (value: {
      data?: CalDataDto;
      message?: string;
      success: boolean;
    }) => void = () => {};
    let resolveSecond: typeof resolveFirst = () => {};
    mockPutCalData
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const first = store.getState().setModuleEnable(MODULE_ID, true);
    // Let the first call's isSaving flip true and clear it manually before
    // starting the second, mirroring a save that completes before the next
    // one begins — this isolates the race test from the in-flight guard
    // tested above.
    await Promise.resolve();
    store.setState((s) => ({
      moduleDataByInstanceId: {
        ...s.moduleDataByInstanceId,
        [MODULE_ID]: {
          ...s.moduleDataByInstanceId[MODULE_ID],
          calData: {
            ...s.moduleDataByInstanceId[MODULE_ID].calData!,
            isSaving: false,
          },
        },
      },
    }));
    const second = store.getState().setModuleEnable(MODULE_ID, false);

    resolveSecond({
      data: makeCalDataDto({
        parameters: [
          {
            changeInfo: {changeType: 'UPDATE'},
            elements: [{...ENABLE_ELEMENT, value: '0x0'}],
            name: 'Enable',
            parameterId: '0x8001026',
            systemId: ENABLE_PARAM_SYSTEM_ID,
          },
        ],
      }),
      success: true,
    });
    await second;
    resolveFirst({
      data: makeCalDataDto({
        parameters: [
          {
            changeInfo: {changeType: 'UPDATE'},
            elements: [{...ENABLE_ELEMENT, value: '0x1'}],
            name: 'Enable',
            parameterId: '0x8001026',
            systemId: ENABLE_PARAM_SYSTEM_ID,
          },
        ],
      }),
      success: true,
    });
    await first;

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    const enableElement = entry.calData?.dto?.parameters.find(
      (p) => p.parameterId === '0x8001026',
    )?.elements[0];
    expect(enableElement).toEqual({...ENABLE_ELEMENT, value: '0x0'}); // second call's intent wins
  });
});

describe('createModuleDataSlice — syncEnableOverlays', () => {
  beforeEach(() => {
    // fetchCalData is the real implementation (only spied on, not replaced),
    // so its underlying GET must resolve to avoid an unhandled rejection.
    mockGetCalData.mockResolvedValue({
      data: enableDtoFixture('0x1'),
      message: undefined,
      success: true,
    });
  });

  it('dispatches a partial enable-scoped fetch for each resolved enable module', () => {
    const store = makeStoreWithEnableModule();
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays();

    expect(fetchSpy).toHaveBeenCalledWith(
      'mod-2012',
      'ckv-devicerx-btrx',
      'partial',
      [ENABLE_PARAM_SYSTEM_ID],
    );
  });

  it('skips modules whose active CKV is unresolved', () => {
    const store = makeStoreWithUnresolvedHeader();
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips a module whose cached DTO already matches the resolved CKV', () => {
    const store = makeStoreWithEnableModule();
    // Seed a ready DTO already on the resolved CKV.
    store.setState((s) => ({
      moduleDataByInstanceId: {
        ...s.moduleDataByInstanceId,
        'mod-2012': {
          calData: {
            availableCalIndices: [],
            dto: enableDtoFixture('0x1'),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-devicerx-btrx',
            status: 'ready',
          },
          moduleName: 'Splitter',
        },
      },
    }));
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refetches when the cached DTO belongs to a different CKV', () => {
    const store = makeStoreWithEnableModule();
    store.setState((s) => ({
      moduleDataByInstanceId: {
        ...s.moduleDataByInstanceId,
        'mod-2012': {
          calData: {
            availableCalIndices: [],
            dto: enableDtoFixture('0x1'),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-devicerx-headset', // stale CKV
            status: 'ready',
          },
          moduleName: 'Splitter',
        },
      },
    }));
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays();

    expect(fetchSpy).toHaveBeenCalledWith(
      'mod-2012',
      'ckv-devicerx-btrx',
      'partial',
      [ENABLE_PARAM_SYSTEM_ID],
    );
  });

  it('scopes to a single subgraph when subgraphId is passed', () => {
    const store = makeStoreWithTwoSubgraphs(); // 502 and 503 each with an enable module
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays('503');

    const calledModuleIds = fetchSpy.mock.calls.map((c) => c[0]);
    expect(calledModuleIds).toEqual(['mod-2012']); // only subgraph 503's module
  });

  it('skips a module that has a full DTO loaded, even when the header CKV differs from the loaded one', () => {
    const store = makeStoreWithEnableModule();
    // Seed a full DTO for a different CKV than the active header selection —
    // the tab opened on headset, but the header now resolves to btrx.
    store.setState((s) => ({
      moduleDataByInstanceId: {
        ...s.moduleDataByInstanceId,
        'mod-2012': {
          calData: {
            availableCalIndices: [],
            dto: enableDtoFixture('0x1'),
            loadedScope: 'full',
            selectedCalIndex: 'ckv-devicerx-headset',
            status: 'ready',
          },
          moduleName: 'Splitter',
        },
      },
    }));
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips a module that has a fetch in flight, even when the header CKV differs', () => {
    const store = makeStoreWithEnableModule();
    // Simulate a fetch already in progress for a different CKV.
    store.setState((s) => ({
      moduleDataByInstanceId: {
        ...s.moduleDataByInstanceId,
        'mod-2012': {
          calData: {
            availableCalIndices: [],
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-devicerx-headset',
            status: 'loading',
          },
          moduleName: 'Splitter',
        },
      },
    }));
    const fetchSpy = jest.spyOn(store.getState(), 'fetchCalData');

    store.getState().syncEnableOverlays();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('createModuleDataSlice — updateTagData', () => {
  it('resolves tagSystemId from the entry directly, not by searching availableTagIndices', async () => {
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto(),
      message: undefined,
      success: true,
    });
    mockPutTagData.mockResolvedValueOnce({
      data: makeTagDataDto({systemId: 'tkv-1-updated'}),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchTagData(MODULE_ID, 'tag-1', 'tkv-1');
    await store.getState().updateTagData(MODULE_ID, {data: []});

    expect(mockPutTagData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'tag-1',
      'tkv-1',
      {data: []},
    );
  });

  it('replaces only the returned parameters by id, preserving the rest, and flags lastMutation as set', async () => {
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto({
        parameters: [makeParam('param-1'), makeParam('param-2')],
      }),
      message: undefined,
      success: true,
    });
    mockPutTagData.mockResolvedValueOnce({
      data: makeTagDataDto({
        parameters: [
          makeParam('param-2', {
            elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
          }),
        ],
      }),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchTagData(MODULE_ID, 'tag-1', 'tkv-1');
    await store.getState().updateTagData(MODULE_ID, {data: []});

    const entry = store.getState().moduleDataByInstanceId[MODULE_ID];
    expect(entry.tagData?.dto?.parameters).toEqual([
      makeParam('param-1'),
      makeParam('param-2', {
        elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
      }),
    ]);
    expect(entry.tagData?.lastMutation).toBe('set');
  });

  it('toasts and returns void when no tagData is loaded', async () => {
    const store = makeStore();
    const result = await store.getState().updateTagData(MODULE_ID, {data: []});

    expect(result).toBeUndefined();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'danger');
    expect(mockPutTagData).not.toHaveBeenCalled();
  });
});

describe('createModuleDataSlice — clearModuleData', () => {
  it('removes the entry for the given moduleInstanceId', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    store.getState().clearModuleData(MODULE_ID);

    expect(store.getState().moduleDataByInstanceId[MODULE_ID]).toBeUndefined();
  });
});
