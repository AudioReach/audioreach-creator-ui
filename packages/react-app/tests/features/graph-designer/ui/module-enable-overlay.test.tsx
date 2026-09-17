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
  moduleDataByInstanceId: Record<string, ModuleDataEntry>;
  moduleDefinitionsBySystemId: Record<string, SpfModuleDefinitionResponseDto>;
  setModuleEnable: jest.Mock;
}

function makeCkv(systemId: string, keyValues: [string, string][]): CkvDto {
  return {
    keyValuePairs: keyValues.map(([keySystemId, valueSystemId]) => ({
      key: {name: keySystemId, naturalId: 0, systemId: keySystemId},
      value: {name: valueSystemId, naturalId: 0, systemId: valueSystemId},
    })),
    supportedParameters: [],
    systemId,
  };
}

function makeModuleInstance(
  overrides?: Partial<ModuleInstance>,
): ModuleInstance {
  return {
    containerSystemId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleDefinitionSystemId: 'mod-def-1',
    moduleName: 'Module',
    moduleType: '',
    naturalId: 1,
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphSystemId: 'sg-1',
    systemId: MODULE_INSTANCE_ID,
    ...overrides,
  };
}

function makeModuleDefinitionDto(
  overrides?: Partial<SpfModuleDefinitionResponseDto>,
): SpfModuleDefinitionResponseDto {
  return {
    builtIn: true,
    customModuleData: undefined,
    deprecated: false,
    description: '',
    displayName: 'AudioDecoder',
    isOffloadable: false,
    modSearchKeys: '',
    moduleDirectionType: 'SOURCE',
    moduleInfo: {
      containerTypeInfo: [],
      dynamicIntents: [],
      inputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'dpi-in'},
      outputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'dpi-out'},
      pidFramework: 0,
      stackSize: 0,
      staticCtrlPorts: [
        {
          naturalId: 0,
          portIntents: [],
          portName: '',
          systemId: 'ctrl',
        },
      ],
    },
    name: 'AudioDecoder',
    paramDefinitionsSummaryInfo: [],
    processorInfo: {name: 'DSP', naturalId: 1, systemId: 'proc-1'},
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
      naturalId: PARAM_ID_MODULE_ENABLE,
      pidType: '',
      systemId: ENABLE_PARAM_SYSTEM_ID,
    },
  ];
}

function makeStore(options: {
  headerSelectionsBySubgraphId?: GraphDesignerStore['headerSelectionsBySubgraphId'];
  moduleDataByInstanceId?: Record<string, ModuleDataEntry>;
  moduleDefinitionsBySystemId?: Record<string, SpfModuleDefinitionResponseDto>;
  moduleInstances?: Record<string, ModuleInstance>;
}): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>(() => ({
    graphData: {moduleInstances: options.moduleInstances ?? {}},
    headerSelectionsBySubgraphId: options.headerSelectionsBySubgraphId ?? {},
    moduleDataByInstanceId: options.moduleDataByInstanceId ?? {},
    moduleDefinitionsBySystemId: options.moduleDefinitionsBySystemId ?? {},
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
      moduleDefinitionsBySystemId: {
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
      moduleDefinitionsBySystemId: {
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
      moduleDataByInstanceId: {
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
      moduleDefinitionsBySystemId: {
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
      moduleDataByInstanceId: {
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
                        {name: 'Enable', value: '0x1'},
                        {
                          name: 'Disable',
                          value: '0x0',
                        },
                      ],
                      isReadOnly: false,
                      name: 'Enable',
                      type: 'ConfigElement',
                      value: enabled ? '0x1' : '0x0',
                    },
                  ],
                  name: 'Enable',
                  naturalId: '0x8001026',
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
      moduleDefinitionsBySystemId: {
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

  it('marks the ready-state wrapper as nodrag/nopan so canvas drag does not swallow the toggle', () => {
    const store = makeReadyStore(false);
    renderOverlay(store);

    const wrapper = screen.getByTestId('module-enable-overlay-ready');
    expect(wrapper.className).toContain('nodrag');
    expect(wrapper.className).toContain('nopan');
  });
});
