/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Exercises the real GraphDesignerStore wiring (ModuleTagKeyConfigSlice +
 * selectConfiguredTkvs), not a mocked store — mirrors the pattern in
 * calibration-keys-config-panel.test.tsx, so configuredTkvs and the
 * Add/Remove/Update actions round-trip for real against fixture graphData.
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
import {ModuleTagKeysConfigPanel} from '~features/key-configurator/module-configurator-view/ui/module-tag-keys/module-tag-keys-config-panel';
import type {
  ConfiguredTkv,
  GraphKey,
  TagGroup,
} from '~shared/types/key-configurator-config.types';

// The global mock in tests/test-setup.ts only wires the legacy `onChange`
// prop, not QUI's real `onCheckedChange` — override locally so clicks on
// the real Checkbox consumers in this panel actually fire.
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
// override locally so typing in the search box actually fires.
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

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    onMouseDown,
    role,
    title,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    onMouseDown?: (event: React.MouseEvent) => void;
    role?: string;
    title?: string;
  }) => (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      role={role}
      title={title}
    >
      {children}
    </button>
  ),
  IconButton: ({
    'aria-label': ariaLabel,
    disabled,
    icon,
    onClick,
    title,
  }: {
    'aria-label': string;
    disabled?: boolean;
    icon: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    title?: string;
  }) => (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  ),
}));

const KEY_INSTANCE: GraphKey = {
  id: 0xab000000,
  name: 'Instance',
  systemId: 'KEY_SYS_INSTANCE',
  values: [
    {id: 1, name: 'Instance_1', systemId: 'VAL_SYS_INSTANCE_1'},
    {id: 2, name: 'Instance_2', systemId: 'VAL_SYS_INSTANCE_2'},
  ],
};

const KEY_VOLUME: GraphKey = {
  id: 0xa4000000,
  name: 'Volume',
  systemId: 'KEY_SYS_VOLUME',
  values: [
    {id: 10, name: 'Level_0', systemId: 'VAL_SYS_LEVEL_0'},
    {id: 11, name: 'Level_1', systemId: 'VAL_SYS_LEVEL_1'},
  ],
};

const TAG1_ID = 123456;
const TAG2_ID = 2346;
const TAG3_ID = 7890;

const MODULE_TAG_KEYS: Record<string, TagGroup> = {
  Tag1: {id: TAG1_ID, keys: {Instance: KEY_INSTANCE}, name: 'Tag1'},
  Tag2: {id: TAG2_ID, keys: {Volume: KEY_VOLUME}, name: 'Tag2'},
};

const MODULE_TAG_KEYS_MULTI: Record<string, TagGroup> = {
  Tag3: {
    id: TAG3_ID,
    keys: {Instance: KEY_INSTANCE, Volume: KEY_VOLUME},
    name: 'Tag3',
  },
};

const KEY_LOW_ID: GraphKey = {
  id: 50,
  name: 'KeyLow',
  systemId: 'KEY_SYS_LOW',
  values: [{id: 2, name: 'Shared', systemId: 'VAL_LOW_SHARED'}],
};

const KEY_HIGH_ID: GraphKey = {
  id: 100,
  name: 'KeyHigh',
  systemId: 'KEY_SYS_HIGH',
  values: [{id: 1, name: 'Shared', systemId: 'VAL_HIGH_SHARED'}],
};

const MODULE_TAG_KEYS_AMBIGUOUS: Record<string, TagGroup> = {
  TagAmbiguous: {
    id: 999,
    keys: {KeyHigh: KEY_HIGH_ID, KeyLow: KEY_LOW_ID},
    name: 'TagAmbiguous',
  },
};

const PARAM_1: ParamDefinitionsSummaryInfo = {
  deprecated: false,
  description: '',
  isHidden: false,
  isReadOnly: false,
  name: 'PARAM_ID_MODULE_TAG_1',
  naturalId: 0x8001020,
  pidType: 'static',
  systemId: 'PARAM_SYS_MODULE_TAG_1',
  toolPolicy: 'rw',
};

const MODULE_DEFINITION_SYSTEM_ID = 'MODULE_DEF_SYS_1';
const INSTANCE_SYSTEM_ID = 'instance-1';
const MODULE_ID = 1;

function buildTkv(
  pairs: Array<{key: GraphKey; value: GraphKey['values'][number]}>,
  tagGroupName: string,
  tagGroupId: number,
  pidConfig: number[] = [PARAM_1.naturalId],
): ConfiguredTkv {
  const keyValuePairs = pairs.map(({key, value}) => ({
    key: {id: key.id, name: key.name, systemId: key.systemId},
    value,
  }));
  return {
    keyValuePairs,
    pidConfig,
    systemId: keyValuePairs
      .map((pair) => `${pair.key.systemId}:${pair.value.systemId}`)
      .sort()
      .join('|'),
    tagGroup: tagGroupName,
    tagGroupId,
  };
}

function toTagsDto(configuredTkvs: ConfiguredTkv[]) {
  const tkvsByTagGroupId = new Map<number, ConfiguredTkv[]>();
  configuredTkvs.forEach((tkv) => {
    const existing = tkvsByTagGroupId.get(tkv.tagGroupId);
    if (existing) {
      existing.push(tkv);
    } else {
      tkvsByTagGroupId.set(tkv.tagGroupId, [tkv]);
    }
  });
  return Array.from(tkvsByTagGroupId.entries()).map(([tagGroupId, tkvs]) => ({
    naturalId: tagGroupId,
    systemId: '',
    tagName: tkvs[0].tagGroup,
    tkvs: tkvs.map((tkv) => ({
      keyValuePairs: tkv.keyValuePairs.map((pair) => ({
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
      supportedParameters: tkv.pidConfig.map((pid) => ({
        description: '',
        name: pid === PARAM_1.naturalId ? PARAM_1.name : '',
        naturalId: pid,
        systemId: pid === PARAM_1.naturalId ? PARAM_1.systemId : '',
      })),
      systemId: tkv.systemId,
    })),
  }));
}

interface MakeStoreOptions {
  configuredTkvs?: ConfiguredTkv[];
  moduleTagKeys?: Record<string, TagGroup>;
}

function makeGraphDesignerStore({
  configuredTkvs = [],
  moduleTagKeys = MODULE_TAG_KEYS,
}: MakeStoreOptions = {}): StoreApi<GraphDesignerStore> {
  const store = createStore<GraphDesignerStore>(
    () =>
      ({
        addConfiguredTkv: jest.fn(
          (_instanceSystemId: string, tkv: ConfiguredTkv) => {
            const current =
              store.getState().graphData!.moduleInstances[INSTANCE_SYSTEM_ID]
                .tags ?? [];
            const currentConfiguredTkvs = toConfiguredTkvs(current);
            const nextTags = toTagsDto([...currentConfiguredTkvs, tkv]);
            store.setState((state) => ({
              graphData: {
                ...state.graphData!,
                moduleInstances: {
                  ...state.graphData!.moduleInstances,
                  [INSTANCE_SYSTEM_ID]: {
                    ...state.graphData!.moduleInstances[INSTANCE_SYSTEM_ID],
                    tags: nextTags,
                  },
                },
              },
            }));
          },
        ),
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {
            [INSTANCE_SYSTEM_ID]: {
              containerSystemId: 'container-1',
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
              tags: toTagsDto(configuredTkvs),
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
            paramDefinitionsSummaryInfo: [PARAM_1],
            processorInfo: {name: '', naturalId: 0, systemId: ''},
            systemId: MODULE_DEFINITION_SYSTEM_ID,
          },
        },
        moduleTagKeys,
        removeConfiguredTkv: jest.fn(
          (_instanceSystemId: string, index: number) => {
            const current =
              store.getState().graphData!.moduleInstances[INSTANCE_SYSTEM_ID]
                .tags ?? [];
            const currentConfiguredTkvs = toConfiguredTkvs(current);
            currentConfiguredTkvs.splice(index, 1);
            const nextTags = toTagsDto(currentConfiguredTkvs);
            store.setState((state) => ({
              graphData: {
                ...state.graphData!,
                moduleInstances: {
                  ...state.graphData!.moduleInstances,
                  [INSTANCE_SYSTEM_ID]: {
                    ...state.graphData!.moduleInstances[INSTANCE_SYSTEM_ID],
                    tags: nextTags,
                  },
                },
              },
            }));
          },
        ),
        updateConfiguredTkvs: jest.fn(
          (_instanceSystemId: string, nextConfiguredTkvs: ConfiguredTkv[]) => {
            store.setState((state) => ({
              graphData: {
                ...state.graphData!,
                moduleInstances: {
                  ...state.graphData!.moduleInstances,
                  [INSTANCE_SYSTEM_ID]: {
                    ...state.graphData!.moduleInstances[INSTANCE_SYSTEM_ID],
                    tags: toTagsDto(nextConfiguredTkvs),
                  },
                },
              },
            }));
          },
        ),
      }) as unknown as GraphDesignerStore,
  );

  return store;
}

function toConfiguredTkvs(
  tags: NonNullable<
    GraphDesignerStore['graphData']
  >['moduleInstances'][string]['tags'],
): ConfiguredTkv[] {
  const configuredTkvs: ConfiguredTkv[] = [];
  (tags ?? []).forEach((tag) => {
    (tag.tkvs ?? []).forEach((tkv) => {
      configuredTkvs.push({
        keyValuePairs: tkv.keyValuePairs.map((pair) => ({
          key: {
            id: pair.key.naturalId,
            name: pair.key.name,
            systemId: pair.key.systemId,
          },
          value: {
            id: pair.value.naturalId,
            name: pair.value.name,
            systemId: pair.value.systemId,
          },
        })),
        pidConfig: tkv.supportedParameters.map((param) => param.naturalId),
        systemId: tkv.systemId,
        tagGroup: tag.tagName,
        tagGroupId: tag.naturalId,
      });
    });
  });
  return configuredTkvs;
}

function renderPanel(
  store: StoreApi<GraphDesignerStore>,
  overrideProps: Partial<{
    isEditable: boolean;
    tkvDisplayMode: 'key-value' | 'value-only';
  }> = {},
) {
  return render(
    <GraphDesignerStoreContext.Provider value={store}>
      <ModuleTagKeysConfigPanel
        instanceSystemId={INSTANCE_SYSTEM_ID}
        isEditable={overrideProps.isEditable ?? true}
        moduleId={MODULE_ID}
        tkvDisplayMode={overrideProps.tkvDisplayMode ?? 'key-value'}
      />
    </GraphDesignerStoreContext.Provider>,
  );
}

describe('ModuleTagKeysConfigPanel', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
  });

  it('renders one TagGroupSummary per tag group, grouping entries by tagGroupId', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[1]}],
        'Tag1',
        TAG1_ID,
      ),
      buildTkv(
        [{key: KEY_VOLUME, value: KEY_VOLUME.values[0]}],
        'Tag2',
        TAG2_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store);

    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText('Tag2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    expect(screen.getByText('[Instance: Instance_1]')).toBeInTheDocument();
    expect(screen.getByText('[Instance: Instance_2]')).toBeInTheDocument();
    expect(screen.queryByText('[Volume: Level_0]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle Tag2 section'));
    expect(screen.getByText('[Volume: Level_0]')).toBeInTheDocument();
  });

  it('formats configured TKV labels per displayMode', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_VOLUME, value: KEY_VOLUME.values[1]}],
        'Tag2',
        TAG2_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    const {unmount} = renderPanel(store, {tkvDisplayMode: 'key-value'});
    fireEvent.click(screen.getByLabelText('Toggle Tag2 section'));
    expect(screen.getByText('[Volume: Level_1]')).toBeInTheDocument();
    unmount();

    renderPanel(store, {tkvDisplayMode: 'value-only'});
    fireEvent.click(screen.getByLabelText('Toggle Tag2 section'));
    expect(screen.getByText('Level_1')).toBeInTheDocument();
  });

  it('adds a new TKV entry via addConfiguredTkv with a freshly computed systemId', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[Instance: Instance_1]'}},
    );
    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    const addConfiguredTkv = store.getState().addConfiguredTkv;
    expect(addConfiguredTkv).toHaveBeenCalledTimes(1);
    const [instanceSystemIdArg, tkvArg] = (addConfiguredTkv as jest.Mock).mock
      .calls[0];
    expect(instanceSystemIdArg).toBe(INSTANCE_SYSTEM_ID);
    expect(tkvArg).toEqual({
      keyValuePairs: [
        {
          key: {
            id: KEY_INSTANCE.id,
            name: KEY_INSTANCE.name,
            systemId: KEY_INSTANCE.systemId,
          },
          value: KEY_INSTANCE.values[0],
        },
      ],
      pidConfig: [PARAM_1.naturalId],
      systemId: 'KEY_SYS_INSTANCE:VAL_SYS_INSTANCE_1',
      tagGroup: 'Tag1',
      tagGroupId: TAG1_ID,
    });
  });

  it('rejects a duplicate entry on Add without calling addConfiguredTkv', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[Instance: Instance_1]'}},
    );
    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    expect(store.getState().addConfiguredTkv).not.toHaveBeenCalled();
  });

  it('disables Add while an edit is active', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Edit'));

    expect(screen.getByRole('button', {name: 'Add'})).toBeDisabled();
  });

  it('disables (not hides) Edit and Delete on other rows while an edit is active', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[1]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    const editButtons = screen.getAllByLabelText('Edit');
    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(editButtons[0]);

    const editButtonsWhileEditing = screen.getAllByLabelText('Edit');
    const deleteButtonsWhileEditing = screen.getAllByLabelText('Delete');
    expect(editButtonsWhileEditing).toHaveLength(editButtons.length);
    expect(deleteButtonsWhileEditing).toHaveLength(deleteButtons.length);
    editButtonsWhileEditing.forEach((button) => expect(button).toBeDisabled());
    deleteButtonsWhileEditing.forEach((button) =>
      expect(button).toBeDisabled(),
    );
    expect(screen.getByLabelText('Delete tag group')).toBeDisabled();
  });

  it('applies an edit via updateConfiguredTkvs with the full array, systemId unchanged', () => {
    const original = buildTkv(
      [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
      'Tag1',
      TAG1_ID,
    );
    const store = makeGraphDesignerStore({configuredTkvs: [original]});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Edit'));

    fireEvent.click(screen.getByLabelText('Select Instance_1'));
    fireEvent.click(screen.getByLabelText('Select Instance_2'));

    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    const updateConfiguredTkvs = store.getState().updateConfiguredTkvs;
    expect(updateConfiguredTkvs).toHaveBeenCalledTimes(1);
    const [instanceSystemIdArg, tkvsArg] = (updateConfiguredTkvs as jest.Mock)
      .mock.calls[0];
    expect(instanceSystemIdArg).toBe(INSTANCE_SYSTEM_ID);
    expect(tkvsArg).toHaveLength(1);
    expect(tkvsArg[0].systemId).toBe(original.systemId);
    expect(tkvsArg[0].keyValuePairs).toEqual([
      {
        key: {
          id: KEY_INSTANCE.id,
          name: KEY_INSTANCE.name,
          systemId: KEY_INSTANCE.systemId,
        },
        value: KEY_INSTANCE.values[1],
      },
    ]);
  });

  it('deletes a configured TKV by calling removeConfiguredTkv with its index', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[1]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[1]);

    expect(store.getState().removeConfiguredTkv).toHaveBeenCalledWith(
      INSTANCE_SYSTEM_ID,
      1,
    );
  });

  it('disables Add/Edit/Delete but keeps Copy active when isEditable is false', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store, {isEditable: false});

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));

    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Copy/)).toBeInTheDocument();
  });

  it('copies the formatted entry label to the clipboard', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const store = makeGraphDesignerStore({configuredTkvs});

    renderPanel(store);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText(/Copy/));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '[Instance: Instance_1]',
    );
  });

  it('shows suggestions matching a key-name prefix', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: 'Inst'}},
    );

    const options = screen.getAllByRole('option');
    const optionTexts = options.map((option) => option.textContent);
    expect(optionTexts.some((text) => text?.includes('Instance_1'))).toBe(true);
    expect(optionTexts.some((text) => text?.includes('Instance_2'))).toBe(true);
  });

  it('shows a diagnostic banner for an ambiguous bare value token', () => {
    const store = makeGraphDesignerStore({
      moduleTagKeys: MODULE_TAG_KEYS_AMBIGUOUS,
    });

    renderPanel(store, {tkvDisplayMode: 'value-only'});

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: 'Shared'}},
    );

    expect(screen.getByText(/Shared is ambiguous between/)).toBeInTheDocument();
  });

  it('shows no suggestion list for a non-matching search token', () => {
    const store = makeGraphDesignerStore();

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: 'zzzzz'}},
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('generates one addConfiguredTkv call per combination for a multi-key tag group', () => {
    const store = makeGraphDesignerStore({
      moduleTagKeys: MODULE_TAG_KEYS_MULTI,
    });

    renderPanel(store);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );

    fireEvent.click(screen.getByText('Tag3'));
    fireEvent.click(screen.getByText('Instance'));
    fireEvent.click(screen.getByText('Volume'));

    fireEvent.click(screen.getByLabelText('Select Instance_1'));
    fireEvent.click(screen.getByLabelText('Select Instance_2'));
    fireEvent.click(screen.getByLabelText('Select Level_0'));
    fireEvent.click(screen.getByLabelText('Select Level_1'));

    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));

    const addConfiguredTkv = store.getState().addConfiguredTkv as jest.Mock;
    expect(addConfiguredTkv).toHaveBeenCalledTimes(4);
    const combos = addConfiguredTkv.mock.calls.map(
      ([, config]: [string, ConfiguredTkv]) =>
        config.keyValuePairs.map((pair) => pair.value.name).join('+'),
    );
    expect(new Set(combos)).toEqual(
      new Set([
        'Instance_1+Level_0',
        'Instance_1+Level_1',
        'Instance_2+Level_0',
        'Instance_2+Level_1',
      ]),
    );
  });
});
