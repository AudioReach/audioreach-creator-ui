/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Exercises the real GraphDesignerStore wiring (CalibrationKeyConfigSlice +
 * selectConfiguredCkvs), not a mocked store — mirrors the pattern in
 * tests/widgets/key-configurator-panel/ui/key-configurator-panel.test.tsx, so
 * Zero-Config PID Default derivation and store read/write round-trip for
 * real against fixture graphData.
 */
jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));

import {fireEvent, render, screen} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

import type {ParamDefinitionsSummaryInfo} from '~entities/module-definitions/model/module-definition.dto';
import {
  GraphDesignerStoreContext,
  type GraphDesignerStore,
} from '~features/graph-designer';
import {CalibrationKeysConfigPanel} from '~features/key-configurator/module-configurator-view/ui/calibration-keys/calibration-keys-config-panel';
import {showToast} from '~shared/controls/global-toaster';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

// The global mock in tests/test-setup.ts only wires the legacy `onChange`
// prop, not QUI's real `onCheckedChange` — override locally so clicks on
// the real Checkbox consumers in this panel actually fire, mirroring the
// precedent in add-kv-vector-selection-panel.test.tsx.
jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    disabled,
    indeterminate,
    onCheckedChange,
  }: {
    'aria-label': string;
    checked: boolean;
    disabled?: boolean;
    indeterminate?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      ref={(input) => {
        if (input) {
          input.indeterminate = indeterminate ?? false;
        }
      }}
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange(event.target.checked)}
      type="checkbox"
    />
  ),
}));

// The global mock in tests/test-setup.ts stubs TextArea without wiring
// onValueChange/inputProps, which KvVectorEditor depends on entirely —
// override locally so typing in the search box actually fires, mirroring
// module-tag-keys-config-panel.test.tsx.
jest.mock('@qualcomm-ui/react/text-area', () => ({
  TextArea: ({
    inputProps,
    onValueChange,
    placeholder,
    value,
  }: {
    inputProps: Record<string, unknown>;
    onValueChange: (value: string) => void;
    placeholder: string;
    value: string;
  }) => (
    <textarea
      {...inputProps}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

const KEY_VOLUME: GraphKey = {
  id: 0xa4000000,
  name: 'Volume',
  systemId: 'KEY_SYS_VOLUME',
  values: [
    {id: 0, name: 'Level_0', systemId: 'VAL_SYS_LEVEL_0'},
    {id: 1, name: 'Level_1', systemId: 'VAL_SYS_LEVEL_1'},
    {id: 2, name: 'Level_2', systemId: 'VAL_SYS_LEVEL_2'},
  ],
};

const KEY_INSTANCE: GraphKey = {
  id: 0xab000000,
  name: 'Instance',
  systemId: 'KEY_SYS_INSTANCE',
  values: [
    {id: 1, name: 'Instance_1', systemId: 'VAL_SYS_INSTANCE_1'},
    {id: 2, name: 'Instance_2', systemId: 'VAL_SYS_INSTANCE_2'},
  ],
};

const availableCalibrationKeys: Record<string, GraphKey> = {
  Instance: KEY_INSTANCE,
  Volume: KEY_VOLUME,
};

const PARAM_DEFINITIONS: ParamDefinitionsSummaryInfo[] = [
  {
    deprecated: false,
    description: '',
    isHidden: false,
    isReadOnly: false,
    name: 'PARAM_ID_HW_MF_CFG',
    naturalId: 134221847,
    pidType: 'static',
    systemId: 'PARAM_SYS_HW_MF_CFG',
    toolPolicy: 'rw',
  },
  {
    deprecated: false,
    description: '',
    isHidden: false,
    isReadOnly: false,
    name: 'PARAM_ID_HW_EP_FRAME_SIZE',
    naturalId: 134221848,
    pidType: 'static',
    systemId: 'PARAM_SYS_HW_EP_FRAME_SIZE',
    toolPolicy: 'rw',
  },
];

const CONFIGURED_CKV: ConfiguredCkv = {
  keyValuePairs: [
    {key: KEY_VOLUME, value: KEY_VOLUME.values[1]},
    {key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]},
  ],
  pidConfig: [134221847],
  systemId:
    'KEY_SYS_VOLUME:VAL_SYS_LEVEL_1|KEY_SYS_INSTANCE:VAL_SYS_INSTANCE_1',
};

const MODULE_DEFINITION_SYSTEM_ID = 'MODULE_DEF_SYS_1';
const INSTANCE_SYSTEM_ID = 'instance-1';
const MODULE_ID = 1;

interface MakeStoreOptions {
  configuredCkvs?: ConfiguredCkv[];
  hasCkvsOnInstance?: boolean;
}

function makeGraphDesignerStore({
  configuredCkvs = [],
  hasCkvsOnInstance = configuredCkvs.length > 0,
}: MakeStoreOptions = {}): StoreApi<GraphDesignerStore> {
  const keyDefinitionsByNaturalId: Record<number, GraphKey> = {
    [KEY_INSTANCE.id]: KEY_INSTANCE,
    [KEY_VOLUME.id]: KEY_VOLUME,
  };

  const toCkvDto = (ckv: ConfiguredCkv) => ({
    keyValuePairs: ckv.keyValuePairs.map((pair) => ({
      key: {
        name: pair.key.name,
        naturalId: pair.key.id,
        systemId: pair.key.systemId,
      },
      value: {
        name: pair.value.name,
        naturalId: pair.value.id,
        systemId: pair.value.systemId,
      },
    })),
    supportedParameters: ckv.pidConfig.map((pid) => {
      const paramDef = PARAM_DEFINITIONS.find((p) => p.naturalId === pid);
      return {
        description: paramDef?.description ?? '',
        name: paramDef?.name ?? '',
        naturalId: pid,
        systemId: paramDef?.systemId ?? '',
      };
    }),
    systemId: ckv.systemId,
  });

  const store = createStore<GraphDesignerStore>(
    () =>
      ({
        availableCalibrationKeys,
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {
            [INSTANCE_SYSTEM_ID]: {
              containerSystemId: 'container-1',
              ...(hasCkvsOnInstance
                ? {ckvs: configuredCkvs.map(toCkvDto)}
                : {}),
              displayName: 'Module 1',
              inputPorts: [],
              moduleDefinitionSystemId: MODULE_DEFINITION_SYSTEM_ID,
              moduleName: 'Module 1',
              moduleType: 'module',
              naturalId: 1,
              outputPorts: [],
              position: {x: 0, y: 0},
              subgraphSystemId: 'subgraph-1',
              systemId: INSTANCE_SYSTEM_ID,
            },
          },
          selectedUsecases: [],
          subgraphs: {},
          subsystems: {},
        },
        moduleDefinitionsBySystemId: {
          [MODULE_DEFINITION_SYSTEM_ID]: {
            builtIn: true,
            description: '',
            displayName: 'Module 1',
            isCustomModule: false,
            isLoadedAtBootup: false,
            modSearchKeys: '',
            moduleInfo: {
              containerTypeInfo: [],
              dynamicIntents: [],
              inputDataPortInfo: {maxPorts: 0, ports: [], systemId: ''},
              outputDataPortInfo: {maxPorts: 0, ports: [], systemId: ''},
              pidFramework: 0,
              staticCtrlPorts: [],
            },
            name: 'Module 1',
            naturalId: 1,
            paramDefinitionsSummaryInfo: PARAM_DEFINITIONS,
            processorInfo: {name: '', naturalId: 0, systemId: ''},
            systemId: MODULE_DEFINITION_SYSTEM_ID,
          },
        },
        removeConfiguredCkv: jest.fn(
          (_instanceSystemId: string, index: number) => {
            const current = store
              .getState()
              .graphData!.moduleInstances[INSTANCE_SYSTEM_ID].ckvs!.slice();
            current.splice(index, 1);
            store.setState((state) => ({
              graphData: {
                ...state.graphData!,
                moduleInstances: {
                  ...state.graphData!.moduleInstances,
                  [INSTANCE_SYSTEM_ID]: {
                    ...state.graphData!.moduleInstances[INSTANCE_SYSTEM_ID],
                    ckvs: current,
                  },
                },
              },
            }));
          },
        ),
        updateConfiguredCkvs: jest.fn(
          (_instanceSystemId: string, nextCkvs: ConfiguredCkv[]) => {
            store.setState((state) => ({
              graphData: {
                ...state.graphData!,
                moduleInstances: {
                  ...state.graphData!.moduleInstances,
                  [INSTANCE_SYSTEM_ID]: {
                    ...state.graphData!.moduleInstances[INSTANCE_SYSTEM_ID],
                    ckvs: nextCkvs.map(toCkvDto),
                  },
                },
              },
            }));
          },
        ),
      }) as unknown as GraphDesignerStore,
  );

  // Silence unused-var lint on the lookup table used only conceptually above.
  void keyDefinitionsByNaturalId;

  return store;
}

function renderPanel(
  store: StoreApi<GraphDesignerStore>,
  overrideProps: Partial<{
    ckvDisplayMode: 'key-value' | 'value-only';
    isEditable: boolean;
  }> = {},
) {
  return render(
    <GraphDesignerStoreContext.Provider value={store}>
      <CalibrationKeysConfigPanel
        ckvDisplayMode={overrideProps.ckvDisplayMode ?? 'key-value'}
        instanceSystemId={INSTANCE_SYSTEM_ID}
        isEditable={overrideProps.isEditable ?? true}
        moduleId={MODULE_ID}
      />
    </GraphDesignerStoreContext.Provider>,
  );
}

describe('CalibrationKeysConfigPanel', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
  });

  it('renders existing configured CKVs using formatCkvEntry in key-value mode', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store, {ckvDisplayMode: 'key-value'});

    expect(
      screen.getByText('[Volume: Level_1] [Instance: Instance_1]'),
    ).toBeInTheDocument();
  });

  it('renders existing configured CKVs using formatCkvEntry in value-only mode', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store, {ckvDisplayMode: 'value-only'});

    expect(screen.getByText('Level_1+Instance_1')).toBeInTheDocument();
  });

  it('adds a new CKV entry via a single updateConfiguredCkvs call with the full array', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByText('Volume'));
    fireEvent.click(screen.getByLabelText('Select Level_2'));

    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    const updateConfiguredCkvs = store.getState().updateConfiguredCkvs;
    expect(updateConfiguredCkvs).toHaveBeenCalledTimes(1);
    const [instanceSystemIdArg, ckvsArg] = (updateConfiguredCkvs as jest.Mock)
      .mock.calls[0];
    expect(instanceSystemIdArg).toBe(INSTANCE_SYSTEM_ID);
    expect(ckvsArg).toHaveLength(2);
    expect(ckvsArg[0]).toEqual(CONFIGURED_CKV);
    expect(ckvsArg[1].keyValuePairs).toEqual([
      {key: KEY_VOLUME, value: KEY_VOLUME.values[2]},
    ]);
  });

  it('shows a toast and skips updateConfiguredCkvs when Apply is clicked with nothing selected', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    expect(showToast).toHaveBeenCalledWith(
      'Please select key value(s) first',
      'warning',
    );
    expect(store.getState().updateConfiguredCkvs).not.toHaveBeenCalled();
  });

  it('enters edit mode for a row, disabling (not hiding) Add while active', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Edit'));

    expect(screen.getByLabelText('Select Volume')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Level_1')).toBeChecked();
    expect(screen.getByRole('button', {name: 'Add'})).toBeDisabled();
  });

  it('applies an edit by replacing only the edited entry via one updateConfiguredCkvs call', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Edit'));
    fireEvent.click(screen.getByLabelText('Select Level_1'));
    fireEvent.click(screen.getByLabelText('Select Level_0'));

    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    const updateConfiguredCkvs = store.getState().updateConfiguredCkvs;
    expect(updateConfiguredCkvs).toHaveBeenCalledTimes(1);
    const [, ckvsArg] = (updateConfiguredCkvs as jest.Mock).mock.calls[0];
    expect(ckvsArg).toHaveLength(1);
    expect(ckvsArg[0].systemId).toBe(CONFIGURED_CKV.systemId);
    expect(ckvsArg[0].keyValuePairs).toEqual([
      {key: KEY_VOLUME, value: KEY_VOLUME.values[0]},
      {key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]},
    ]);
  });

  it('deletes a configured CKV by calling removeConfiguredCkv with its index', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Delete'));

    expect(store.getState().removeConfiguredCkv).toHaveBeenCalledWith(
      INSTANCE_SYSTEM_ID,
      0,
    );
  });

  it('disables Add/Edit/Delete but still renders the list when isEditable is false', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store, {isEditable: false});

    expect(
      screen.getByText('[Volume: Level_1] [Instance: Instance_1]'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
  });

  it('copies the row formatted entry text to the clipboard', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store, {ckvDisplayMode: 'key-value'});

    fireEvent.click(screen.getByLabelText(/Copy/));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '[Volume: Level_1] [Instance: Instance_1]',
    );
  });

  it('resolves a bare value token typed in the search box and highlights the matching row', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    const searchInput = screen.getByPlaceholderText(
      'Search configured keys...',
    );
    fireEvent.change(searchInput, {target: {value: 'Level_1'}});

    const highlightedRow = screen
      .getByText('[Volume: Level_1] [Instance: Instance_1]')
      .closest('[data-testid="config-summary-row"]');
    expect(highlightedRow).not.toBeNull();
  });

  it('shows a diagnostic message for an ambiguous or unknown search token', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));

    const searchInput = screen.getByPlaceholderText(
      'Search calibration keys or values...',
    );
    fireEvent.change(searchInput, {target: {value: 'nonexistent-token'}});

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Value "nonexistent-token" was not found for any key.',
    );
  });

  it('shows suggestions matching a value-name prefix', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search calibration keys or values...'),
      {target: {value: 'Level'}},
    );

    const options = screen.getAllByRole('option');
    const optionTexts = options.map((option) => option.textContent);
    expect(optionTexts.some((text) => text?.includes('Level_0'))).toBe(true);
    expect(optionTexts.some((text) => text?.includes('Level_1'))).toBe(true);
    expect(optionTexts.some((text) => text?.includes('Level_2'))).toBe(true);
  });

  it('selects a value by clicking a suggestion option', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search calibration keys or values...'),
      {target: {value: 'Level'}},
    );

    const option = screen
      .getAllByRole('option')
      .find((element) => element.textContent?.includes('Level_2'));
    fireEvent.click(option!);

    expect(
      screen.getByPlaceholderText('Search calibration keys or values...'),
    ).toHaveValue('[Volume: Level_2]');
  });

  it('shows no suggestion list for a non-matching search token', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search calibration keys or values...'),
      {target: {value: 'zzzzz'}},
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps suggesting the second token after a "+" once the first value-only token resolves', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store, {ckvDisplayMode: 'value-only'});

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    const searchInput = screen.getByPlaceholderText(
      'Search calibration keys or values...',
    );
    fireEvent.change(searchInput, {target: {value: 'Level_0'}});
    fireEvent.change(searchInput, {target: {value: 'Level_0+'}});
    fireEvent.change(searchInput, {target: {value: 'Level_0+Ins'}});

    const options = screen.getAllByRole('option');
    const optionTexts = options.map((option) => option.textContent);
    expect(optionTexts.some((text) => text?.includes('Instance_1'))).toBe(true);
  });

  it('keeps showing all calibration keys in the table right after typing "+"', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store, {ckvDisplayMode: 'value-only'});

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    const searchInput = screen.getByPlaceholderText(
      'Search calibration keys or values...',
    );
    fireEvent.change(searchInput, {target: {value: 'Level_0'}});
    fireEvent.change(searchInput, {target: {value: 'Level_0+'}});

    expect(
      screen.queryByText('No calibration keys or values match your search'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Instance')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('hides the Configure PIDs section until Add or Edit is clicked', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    expect(
      screen.queryByLabelText('Select parameter PARAM_ID_HW_MF_CFG'),
    ).not.toBeInTheDocument();
  });

  it('defaults every PID to checked when Add is clicked, regardless of other ckvs', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));

    expect(
      screen.getByLabelText('Select parameter PARAM_ID_HW_MF_CFG'),
    ).toBeChecked();
    expect(
      screen.getByLabelText('Select parameter PARAM_ID_HW_EP_FRAME_SIZE'),
    ).toBeChecked();
  });

  it('derives PID checked state from the edited ckv supportedParameters when Edit is clicked', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Edit'));

    expect(
      screen.getByLabelText('Select parameter PARAM_ID_HW_MF_CFG'),
    ).toBeChecked();
    expect(
      screen.getByLabelText('Select parameter PARAM_ID_HW_EP_FRAME_SIZE'),
    ).not.toBeChecked();
  });

  it('highlights the row being edited', () => {
    const store = makeGraphDesignerStore({configuredCkvs: [CONFIGURED_CKV]});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Edit'));

    const editedRow = screen
      .getAllByText('[Volume: Level_1] [Instance: Instance_1]')
      .map((element) => element.closest('[data-testid="config-summary-row"]'))
      .find((row) => row !== null);
    expect(editedRow).toHaveClass('bg-[var(--color-background-neutral-02)]');
  });
});
