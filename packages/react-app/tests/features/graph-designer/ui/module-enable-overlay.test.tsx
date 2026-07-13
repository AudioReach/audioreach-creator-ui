/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

jest.mock('~shared/lib/logger');

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions';
import type {CalDataDto, CkvDto} from '~entities/spf-module-data';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import {PARAM_ID_MODULE_ENABLE} from '~features/graph-designer/lib/module-enable.constants';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';
import type {ModuleDataEntry} from '~features/graph-designer/model/module-data-slice';
import {ModuleEnableOverlay} from '~features/graph-designer/ui/module-enable-overlay/module-enable-overlay';

const MODULE_INSTANCE_ID = 'inst-1';
const ENABLE_PARAM_SYSTEM_ID = 'PARAM_ID_MODULE_ENABLE_SYS_ID';

interface TestStoreShape {
  graphData: {moduleInstances: Record<string, ModuleInstance>};
  headerSelectionsBySubgraphId: GraphDesignerStore['headerSelectionsBySubgraphId'];
  moduleDataByModuleId: Record<string, ModuleDataEntry>;
  moduleDefinitionsById: Record<string, SpfModuleDefinitionResponseDto>;
  setModuleEnable: jest.Mock;
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

function makeModuleInstance(
  overrides?: Partial<ModuleInstance>,
): ModuleInstance {
  return {
    containerId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'mod-def-1',
    moduleInstanceId: MODULE_INSTANCE_ID,
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
    ...overrides,
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

function makeCalDataDto(overrides?: Partial<CalDataDto>): CalDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    Ckv: [],
    parameters: [],
    systemId: 'ckv-1',
    ...overrides,
  };
}

function makeEnableParamDefinitionsSummaryInfo() {
  return [
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
  ];
}

function makeStore(options: {
  headerSelectionsBySubgraphId?: GraphDesignerStore['headerSelectionsBySubgraphId'];
  moduleDataByModuleId?: Record<string, ModuleDataEntry>;
  moduleDefinitionsById?: Record<string, SpfModuleDefinitionResponseDto>;
  moduleInstances?: Record<string, ModuleInstance>;
}): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>(() => ({
    graphData: {moduleInstances: options.moduleInstances ?? {}},
    headerSelectionsBySubgraphId: options.headerSelectionsBySubgraphId ?? {},
    moduleDataByModuleId: options.moduleDataByModuleId ?? {},
    moduleDefinitionsById: options.moduleDefinitionsById ?? {},
    setModuleEnable: jest.fn(),
  }));
}

function renderOverlay(store: StoreApi<TestStoreShape>) {
  return render(
    <GraphDesignerStoreContext.Provider
      value={store as unknown as StoreApi<GraphDesignerStore>}
    >
      <ModuleEnableOverlay moduleInstanceId={MODULE_INSTANCE_ID} />
    </GraphDesignerStoreContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ModuleEnableOverlay — not present', () => {
  it('renders null when the module has no enable parameter', () => {
    const store = makeStore({
      moduleDefinitionsById: {
        'mod-def-1': makeModuleDefinitionDto({paramDefinitionsSummaryInfo: []}),
      },
      moduleInstances: {[MODULE_INSTANCE_ID]: makeModuleInstance()},
    });
    const {container} = renderOverlay(store);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('ModuleEnableOverlay — unresolved CKV (State 3)', () => {
  it('renders dimmed tooltip markup with no Switch', () => {
    const store = makeStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'NA'}, subgraphId: 'sg-1'},
      },
      moduleDefinitionsById: {
        'mod-def-1': makeModuleDefinitionDto({
          paramDefinitionsSummaryInfo: makeEnableParamDefinitionsSummaryInfo(),
        }),
      },
      moduleInstances: {
        [MODULE_INSTANCE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    renderOverlay(store);

    expect(
      screen.getByTestId('module-enable-overlay-unresolved'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('q-switch')).not.toBeInTheDocument();
    expect(screen.getByTestId('q-tooltip')).toHaveTextContent(
      'CKV combination not available for this module',
    );
  });
});

describe('ModuleEnableOverlay — CKV resolved, value not fetched (State 2)', () => {
  it('renders a disabled Switch placeholder with no interaction', () => {
    const store = makeStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleDataByModuleId: {
        [MODULE_INSTANCE_ID]: {
          calData: {
            availableCalIndices: [],
            dto: makeCalDataDto({parameters: []}),
            loadedScope: 'partial',
            status: 'ready',
          },
          moduleName: 'Module',
        },
      },
      moduleDefinitionsById: {
        'mod-def-1': makeModuleDefinitionDto({
          paramDefinitionsSummaryInfo: makeEnableParamDefinitionsSummaryInfo(),
        }),
      },
      moduleInstances: {
        [MODULE_INSTANCE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
    renderOverlay(store);

    const switchInput = screen.getByTestId('q-switch').querySelector('input');
    expect(switchInput).toBeDisabled();
    expect(store.getState().setModuleEnable).not.toHaveBeenCalled();
  });
});

describe('ModuleEnableOverlay — ready (State 1)', () => {
  function makeReadyStore(enabled: boolean): StoreApi<TestStoreShape> {
    return makeStore({
      headerSelectionsBySubgraphId: {
        'sg-1': {keyValues: {'key-1': 'v1'}, subgraphId: 'sg-1'},
      },
      moduleDataByModuleId: {
        [MODULE_INSTANCE_ID]: {
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
                      value: enabled ? '0x1' : '0x0',
                    },
                  ],
                  name: 'Enable',
                  parameterId: '0x8001026',
                  systemId: ENABLE_PARAM_SYSTEM_ID,
                },
              ],
            }),
            loadedScope: 'partial',
            status: 'ready',
          },
          moduleName: 'Module',
        },
      },
      moduleDefinitionsById: {
        'mod-def-1': makeModuleDefinitionDto({
          paramDefinitionsSummaryInfo: makeEnableParamDefinitionsSummaryInfo(),
        }),
      },
      moduleInstances: {
        [MODULE_INSTANCE_ID]: makeModuleInstance({
          ckvs: [makeCkv('ckv-1', [['key-1', 'v1']])],
        }),
      },
    });
  }

  it('renders a Switch reflecting the decoded value', () => {
    const store = makeReadyStore(true);
    renderOverlay(store);

    const switchInput = screen.getByTestId('q-switch').querySelector('input');
    expect(switchInput).toBeChecked();
    expect(switchInput).not.toBeDisabled();
  });

  it('toggling the Switch calls setModuleEnable with the new value', () => {
    const store = makeReadyStore(false);
    renderOverlay(store);

    const switchInput = screen.getByTestId('q-switch').querySelector('input')!;
    fireEvent.click(switchInput);

    expect(store.getState().setModuleEnable).toHaveBeenCalledWith(
      MODULE_INSTANCE_ID,
      true,
    );
  });
});
