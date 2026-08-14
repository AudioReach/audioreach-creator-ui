/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions';
import type {CalDataDto, CkvDto} from '~entities/spf-module-data';
import {PARAM_ID_MODULE_ENABLE} from '~features/graph-designer/lib/module-enable.constants';
import {selectModuleEnable} from '~features/graph-designer/lib/select-module-enable';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import type {ModuleDataEntry} from '~features/graph-designer/model/module-data-slice';

const ENABLE_PARAM_SYSTEM_ID = 'PARAM_ID_MODULE_ENABLE_SYS_ID';

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

function makeModule(overrides?: Partial<ModuleInstance>): ModuleInstance {
  return {
    containerId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'mod-1',
    moduleInstanceId: 'inst-1',
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
    ...overrides,
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

function makeState(options: {
  headerSelectionsBySubgraphId?: GraphDesignerStore['headerSelectionsBySubgraphId'];
  moduleDataByInstanceId?: Record<string, ModuleDataEntry>;
  moduleDefinitionsById?: Record<string, SpfModuleDefinitionResponseDto>;
  moduleInstances?: Record<string, ModuleInstance>;
}): GraphDesignerStore {
  return {
    graphData: {
      connections: [],
      containers: {},
      moduleInstances: options.moduleInstances ?? {},
      selectedUsecases: [],
      subgraphs: {},
      subsystems: {},
    },
    headerSelectionsBySubgraphId: options.headerSelectionsBySubgraphId ?? {},
    moduleDataByInstanceId: options.moduleDataByInstanceId ?? {},
    moduleDefinitionsById: options.moduleDefinitionsById ?? {},
  } as unknown as GraphDesignerStore;
}

function makeStateWithEnableModule(options: {
  cachedSelectedCalIndex: string;
  enableValue: string;
  resolvedCkvSystemId: string;
}): GraphDesignerStore {
  return makeState({
    headerSelectionsBySubgraphId: {
      'sg-1': {
        keyValues: {'key-device': options.resolvedCkvSystemId},
        subgraphId: 'sg-1',
      },
    },
    moduleDataByInstanceId: {
      'mod-2012': {
        calData: {
          availableCalIndices: [],
          dto: makeCalDataDto({
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
                    value: options.enableValue,
                  },
                ],
                name: 'Enable',
                parameterId: '0x8001026',
                systemId: ENABLE_PARAM_SYSTEM_ID,
              },
            ],
          }),
          loadedScope: 'partial',
          selectedCalIndex: options.cachedSelectedCalIndex,
          status: 'ready',
        },
        moduleName: 'Module',
      },
    },
    moduleDefinitionsById: {
      'mod-1': makeModuleDefinitionDto({
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
      }),
    },
    moduleInstances: {
      'mod-2012': makeModule({
        ckvs: [
          makeCkv('ckv-devicerx-btrx', [['key-device', 'ckv-devicerx-btrx']]),
          makeCkv('ckv-devicerx-headset', [
            ['key-device', 'ckv-devicerx-headset'],
          ]),
        ],
        moduleInstanceId: 'mod-2012',
      }),
    },
  });
}

describe('selectModuleEnable', () => {
  it('returns isPresent: false when the module definition is absent', () => {
    const state = makeState({
      moduleInstances: {'inst-1': makeModule()},
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({isPresent: false});
  });

  it('returns isPresent: false when the definition lacks the enable param', () => {
    const state = makeState({
      moduleDefinitionsById: {
        'mod-1': makeModuleDefinitionDto({paramDefinitionsSummaryInfo: []}),
      },
      moduleInstances: {'inst-1': makeModule()},
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({isPresent: false});
  });

  it('returns isPresent: false when the definition has a param whose systemId looks right but whose paramId does not match', () => {
    const state = makeState({
      moduleDefinitionsById: {
        'mod-1': makeModuleDefinitionDto({
          paramDefinitionsSummaryInfo: [
            {
              deprecated: false,
              description: '',
              isHidden: false,
              isReadOnly: false,
              name: 'Enable',
              paramId: 0x9999999,
              pidType: '',
              systemId: ENABLE_PARAM_SYSTEM_ID,
            },
          ],
        }),
      },
      moduleInstances: {'inst-1': makeModule()},
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({isPresent: false});
  });

  it('returns isCkvResolved: false when the module CKV is unresolved', () => {
    const state = makeState({
      moduleDefinitionsById: {
        'mod-1': makeModuleDefinitionDto({
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
        }),
      },
      moduleInstances: {
        'inst-1': makeModule({ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])]}),
      },
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({
      isCkvResolved: false,
      isPresent: true,
    });
  });

  it('returns isReady: false when the enable item is not yet in calData', () => {
    const state = makeState({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleDataByInstanceId: {
        'inst-1': {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDto({parameters: []}),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: 'Module',
        },
      },
      moduleDefinitionsById: {
        'mod-1': makeModuleDefinitionDto({
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
        }),
      },
      moduleInstances: {
        'inst-1': makeModule({ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])]}),
      },
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({
      isCkvResolved: true,
      isPresent: true,
      isReady: false,
    });
  });

  it('returns isReady: true with the decoded boolean value when the enable item is loaded', () => {
    const state = makeState({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleDataByInstanceId: {
        'inst-1': {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDto({
              parameters: [
                {
                  changeInfo: {changeType: 'NONE'},
                  elements: [
                    {
                      allowedValues: [
                        {name: 'Enable', type: 'NAME_VALUE_PAIR', value: '0x1'},
                        {
                          name: 'Disable',
                          type: 'NAME_VALUE_PAIR',
                          value: '0x0',
                        },
                      ],
                      isReadOnly: false,
                      name: 'Enable',
                      type: 'CONFIG_ELEMENT',
                      value: '0x1',
                    },
                  ],
                  name: 'Enable',
                  parameterId: '0x8001026',
                  systemId: ENABLE_PARAM_SYSTEM_ID,
                },
              ],
            }),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: 'Module',
        },
      },
      moduleDefinitionsById: {
        'mod-1': makeModuleDefinitionDto({
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
        }),
      },
      moduleInstances: {
        'inst-1': makeModule({ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])]}),
      },
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({
      isCkvResolved: true,
      isPresent: true,
      isReady: true,
      value: true,
    });
  });

  it('resolves the enable param by a definition whose systemId differs from the conventional name, as long as its paramId matches', () => {
    const state = makeState({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleDataByInstanceId: {
        'inst-1': {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDto({
              parameters: [
                {
                  changeInfo: {changeType: 'NONE'},
                  elements: [
                    {
                      allowedValues: [
                        {name: 'Enable', type: 'NAME_VALUE_PAIR', value: '0x1'},
                        {
                          name: 'Disable',
                          type: 'NAME_VALUE_PAIR',
                          value: '0x0',
                        },
                      ],
                      isReadOnly: false,
                      name: 'Enable',
                      type: 'CONFIG_ELEMENT',
                      value: '0x1',
                    },
                  ],
                  name: 'Enable',
                  parameterId: '0x8001026',
                  systemId: 'unconventional-enable-sys-id',
                },
              ],
            }),
            loadedScope: 'partial',
            selectedCalIndex: 'ckv-1',
            status: 'ready',
          },
          moduleName: 'Module',
        },
      },
      moduleDefinitionsById: {
        'mod-1': makeModuleDefinitionDto({
          paramDefinitionsSummaryInfo: [
            {
              deprecated: false,
              description: '',
              isHidden: false,
              isReadOnly: false,
              name: 'Enable',
              paramId: PARAM_ID_MODULE_ENABLE,
              pidType: '',
              systemId: 'unconventional-enable-sys-id',
            },
          ],
        }),
      },
      moduleInstances: {
        'inst-1': makeModule({ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])]}),
      },
    });

    expect(selectModuleEnable(state, 'inst-1')).toEqual({
      isCkvResolved: true,
      isPresent: true,
      isReady: true,
      value: true,
    });
  });

  it('is not ready when the cached DTO belongs to a different CKV', () => {
    const state = makeStateWithEnableModule({
      cachedSelectedCalIndex: 'ckv-devicerx-headset', // stale
      enableValue: '0x1',
      resolvedCkvSystemId: 'ckv-devicerx-btrx',
    });

    expect(selectModuleEnable(state, 'mod-2012')).toEqual({
      isCkvResolved: true,
      isPresent: true,
      isReady: false,
    });
  });

  it('is ready when the cached DTO matches the resolved CKV', () => {
    const state = makeStateWithEnableModule({
      cachedSelectedCalIndex: 'ckv-devicerx-btrx',
      enableValue: '0x0',
      resolvedCkvSystemId: 'ckv-devicerx-btrx',
    });

    expect(selectModuleEnable(state, 'mod-2012')).toEqual({
      isCkvResolved: true,
      isPresent: true,
      isReady: true,
      value: false,
    });
  });
});
