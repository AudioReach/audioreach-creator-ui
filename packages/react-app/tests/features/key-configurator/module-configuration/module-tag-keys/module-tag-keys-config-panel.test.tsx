/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * ModuleTagKeysConfigPanel is a pure prop consumer (no graph-designer
 * store access) — props are supplied directly with jest.fn() spies standing
 * in for the store actions the widget would normally wire up.
 */
jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import type {ParamDefinitionsSummaryInfo} from '~entities/module-definitions/model/module-definition.dto';
import {ModuleTagKeysConfigPanel} from '~features/key-configurator/module-configurator-view/ui/module-tag-keys/module-tag-keys-config-panel';
import {showToast} from '~shared/controls/global-toaster';
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
  Tag1: {
    id: TAG1_ID,
    keys: {Instance: KEY_INSTANCE},
    name: 'Tag1',
    systemId: 'TAG_SYS_1',
  },
  Tag2: {
    id: TAG2_ID,
    keys: {Volume: KEY_VOLUME},
    name: 'Tag2',
    systemId: 'TAG_SYS_2',
  },
};

const MODULE_TAG_KEYS_MULTI: Record<string, TagGroup> = {
  Tag3: {
    id: TAG3_ID,
    keys: {Instance: KEY_INSTANCE, Volume: KEY_VOLUME},
    name: 'Tag3',
    systemId: 'TAG_SYS_3',
  },
};

const KEY_DUP_LOW_ID: GraphKey = {
  id: 4,
  name: 'KeyDup',
  systemId: 'KEY_SYS_DUP_LOW',
  values: [
    {id: 40, name: 'Shared', systemId: 'VAL_DUP_LOW_SHARED'},
    {id: 41, name: 'Other', systemId: 'VAL_DUP_LOW_OTHER'},
  ],
};

const KEY_DUP_HIGH_ID: GraphKey = {
  id: 5,
  name: 'KeyDup',
  systemId: 'KEY_SYS_DUP_HIGH',
  values: [
    {id: 50, name: 'Shared', systemId: 'VAL_DUP_HIGH_SHARED'},
    {id: 51, name: 'Other', systemId: 'VAL_DUP_HIGH_OTHER'},
  ],
};

const MODULE_TAG_KEYS_AMBIGUOUS: Record<string, TagGroup> = {
  TagDelta: {
    id: 998,
    keys: {KeyDup: KEY_DUP_LOW_ID},
    name: 'TagDelta',
    systemId: 'TAG_SYS_DELTA',
  },
  TagGamma: {
    id: 999,
    keys: {KeyDup: KEY_DUP_HIGH_ID},
    name: 'TagGamma',
    systemId: 'TAG_SYS_GAMMA',
  },
};

const KEY_TOGGLE_ALPHA: GraphKey = {
  id: 80,
  name: 'ToggleAlpha',
  systemId: 'KEY_SYS_TOGGLE_ALPHA',
  values: [
    {id: 800, name: 'Off', systemId: 'VAL_TOGGLE_ALPHA_OFF'},
    {id: 801, name: 'On', systemId: 'VAL_TOGGLE_ALPHA_ON'},
  ],
};

const KEY_TOGGLE_BETA: GraphKey = {
  id: 81,
  name: 'ToggleBeta',
  systemId: 'KEY_SYS_TOGGLE_BETA',
  values: [
    {id: 810, name: 'Off', systemId: 'VAL_TOGGLE_BETA_OFF'},
    {id: 811, name: 'On', systemId: 'VAL_TOGGLE_BETA_ON'},
  ],
};

const TAG_TOGGLE_BETA_ID = 4002;

const MODULE_TAG_KEYS_TOGGLE_AMBIGUOUS: Record<string, TagGroup> = {
  TagToggleAlpha: {
    id: 4001,
    keys: {ToggleAlpha: KEY_TOGGLE_ALPHA},
    name: 'TagToggleAlpha',
    systemId: 'TAG_SYS_TOGGLE_ALPHA',
  },
  TagToggleBeta: {
    id: TAG_TOGGLE_BETA_ID,
    keys: {ToggleBeta: KEY_TOGGLE_BETA},
    name: 'TagToggleBeta',
    systemId: 'TAG_SYS_TOGGLE_BETA',
  },
};

const MODULE_TAG_KEYS_WITH_EMPTY_TAG: Record<string, TagGroup> = {
  Tag1: MODULE_TAG_KEYS.Tag1,
  TagEmpty: {
    id: 5555,
    keys: {},
    name: 'TagEmpty',
    systemId: 'TAG_SYS_EMPTY',
  },
};

// Two different key/value objects that happen to share numeric ids across
// unrelated tag groups — reproduces the collision selectedValues (keyed only
// by modKeyId/valueId, with no tag-group dimension) can hit.
const KEY_MUTE_EPSILON: GraphKey = {
  id: 60,
  name: 'Mute',
  systemId: 'KEY_SYS_MUTE_EPSILON',
  values: [{id: 600, name: 'On', systemId: 'VAL_SYS_MUTE_EPSILON_ON'}],
};

const KEY_MUTE_ZETA: GraphKey = {
  id: 60,
  name: 'MuteAlt',
  systemId: 'KEY_SYS_MUTE_ZETA',
  values: [{id: 600, name: 'OnAlt', systemId: 'VAL_SYS_MUTE_ZETA_ON'}],
};

const MODULE_TAG_KEYS_COLLIDING_IDS: Record<string, TagGroup> = {
  TagEpsilon: {
    id: 501,
    keys: {Mute: KEY_MUTE_EPSILON},
    name: 'TagEpsilon',
    systemId: 'TAG_SYS_EPSILON',
  },
  TagZeta: {
    id: 502,
    keys: {MuteAlt: KEY_MUTE_ZETA},
    name: 'TagZeta',
    systemId: 'TAG_SYS_ZETA',
  },
};

const MODULE_TAG_KEYS_COMPOUND: Record<string, TagGroup> = {
  TagOther: {
    id: 2222,
    keys: {Instance: KEY_INSTANCE},
    name: 'TagOther',
    systemId: 'TAG_SYS_OTHER',
  },
  TagSame: {
    id: 1111,
    keys: {Instance: KEY_INSTANCE, Volume: KEY_VOLUME},
    name: 'TagSame',
    systemId: 'TAG_SYS_SAME',
  },
};

const KEY_MUTE: GraphKey = {
  id: 70,
  name: 'Mute',
  systemId: 'KEY_SYS_MUTE',
  values: [
    {id: 700, name: 'Off', systemId: 'VAL_SYS_MUTE_OFF'},
    {id: 701, name: 'On', systemId: 'VAL_SYS_MUTE_ON'},
  ],
};

const TAG_MUTE_ID = 3333;

const MODULE_TAG_KEYS_MUTE: Record<string, TagGroup> = {
  TagMute: {
    id: TAG_MUTE_ID,
    keys: {Mute: KEY_MUTE},
    name: 'TagMute',
    systemId: 'TAG_SYS_MUTE',
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

function makeProps(
  overrides: Partial<{
    configuredTkvs: ConfiguredTkv[];
    isEditable: boolean;
    moduleTagKeys: Record<string, TagGroup>;
  }> = {},
) {
  return {
    addTkvs: jest.fn().mockResolvedValue(true),
    configuredTkvs: overrides.configuredTkvs ?? [],
    deleteTagGroup: jest.fn().mockResolvedValue(true),
    deleteTkvs: jest.fn().mockResolvedValue(true),
    instanceSystemId: INSTANCE_SYSTEM_ID,
    isEditable: overrides.isEditable ?? true,
    moduleId: MODULE_ID,
    moduleTagKeys: overrides.moduleTagKeys ?? MODULE_TAG_KEYS,
    paramDefinitionsSummaryInfo: [PARAM_1],
    updateTkvParameters: jest.fn().mockResolvedValue(true),
  };
}

function renderPanel(props: ReturnType<typeof makeProps>) {
  return render(<ModuleTagKeysConfigPanel {...props} />);
}

// During an active Add/Edit operation, the toolbar's own (disabled) "Add
// configuration" button and the panel's primary Add/Update action button
// both render with the accessible name "Add" — disambiguate by the `title`
// attribute that only the toolbar button carries.
function getPrimaryActionButton(name: string) {
  const button = screen
    .getAllByRole('button', {name})
    .find((candidate) => !candidate.hasAttribute('title'));
  if (!button) {
    throw new Error(`Primary action button "${name}" not found`);
  }
  return button;
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

    renderPanel(makeProps({configuredTkvs}));

    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText('Tag2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    expect(screen.getByText('[Instance: Instance_1]')).toBeInTheDocument();
    expect(screen.getByText('[Instance: Instance_2]')).toBeInTheDocument();
    expect(screen.queryByText('[Volume: Level_0]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle Tag2 section'));
    expect(screen.getByText('[Volume: Level_0]')).toBeInTheDocument();
  });

  it('formats configured TKV labels as bracketed key:value pairs', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_VOLUME, value: KEY_VOLUME.values[1]}],
        'Tag2',
        TAG2_ID,
      ),
    ];

    renderPanel(makeProps({configuredTkvs}));
    fireEvent.click(screen.getByLabelText('Toggle Tag2 section'));
    expect(screen.getByText('[Volume: Level_1]')).toBeInTheDocument();
  });

  it('adds a new TKV entry via addTkvs with the resolved value combination', async () => {
    const props = makeProps();
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[Instance: Instance_1]'}},
    );
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addTkvs).toHaveBeenCalledTimes(1);
    });
    expect(props.addTkvs).toHaveBeenCalledWith(
      INSTANCE_SYSTEM_ID,
      TAG1_ID,
      [['VAL_SYS_INSTANCE_1']],
      ['PARAM_SYS_MODULE_TAG_1'],
    );
  });

  it('shows a toast and skips addTkvs when Apply is clicked with no tag group selected', async () => {
    const props = makeProps();
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Please select a tag group',
        'warning',
      );
    });
    expect(props.addTkvs).not.toHaveBeenCalled();
  });

  it('shows a toast and skips addTkvs when no PID is checked for a non-empty tag', async () => {
    const props = makeProps();
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[Instance: Instance_1]'}},
    );
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Please select at least one PID',
        'warning',
      );
    });
    expect(props.addTkvs).not.toHaveBeenCalled();
  });

  it('rejects a duplicate entry on Add without calling addTkvs', async () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const props = makeProps({configuredTkvs});
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[Instance: Instance_1]'}},
    );
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'This tag key combination is already configured',
        'warning',
      );
    });
    expect(props.addTkvs).not.toHaveBeenCalled();
  });

  it('generates one addTkvs call carrying all combinations for a multi-key tag group', async () => {
    const props = makeProps({moduleTagKeys: MODULE_TAG_KEYS_MULTI});
    renderPanel(props);

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

    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addTkvs).toHaveBeenCalledTimes(1);
    });
    const [instanceSystemIdArg, tagGroupIdArg, combinationsArg, paramsArg] =
      props.addTkvs.mock.calls[0];
    expect(instanceSystemIdArg).toBe(INSTANCE_SYSTEM_ID);
    expect(tagGroupIdArg).toBe(TAG3_ID);
    expect(paramsArg).toEqual(['PARAM_SYS_MODULE_TAG_1']);
    expect(new Set(combinationsArg.map((c: string[]) => [...c].sort().join('+')))).toEqual(
      new Set([
        ['VAL_SYS_INSTANCE_1', 'VAL_SYS_LEVEL_0'].sort().join('+'),
        ['VAL_SYS_INSTANCE_1', 'VAL_SYS_LEVEL_1'].sort().join('+'),
        ['VAL_SYS_INSTANCE_2', 'VAL_SYS_LEVEL_0'].sort().join('+'),
        ['VAL_SYS_INSTANCE_2', 'VAL_SYS_LEVEL_1'].sort().join('+'),
      ]),
    );
  });

  it('shows the PID section while hiding the available-tags table during Edit', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    renderPanel(makeProps({configuredTkvs}));

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Edit'));

    expect(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search module tag keys or values...'),
    ).not.toBeInTheDocument();
  });

  it('disables Add while an edit is active', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];

    renderPanel(makeProps({configuredTkvs}));

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

    renderPanel(makeProps({configuredTkvs}));

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

  it('shows "Update" as the apply button label in Edit mode', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    renderPanel(makeProps({configuredTkvs}));

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Edit'));

    expect(screen.getByRole('button', {name: 'Update'})).toBeInTheDocument();
  });

  it('disables Update until a parameter checkbox changes from the original pidConfig', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    renderPanel(makeProps({configuredTkvs}));

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Edit'));

    expect(screen.getByRole('button', {name: 'Update'})).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );

    expect(screen.getByRole('button', {name: 'Update'})).not.toBeDisabled();
  });

  it('applies an edit via updateTkvParameters with the checked parameter systemIds', async () => {
    const original = buildTkv(
      [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
      'Tag1',
      TAG1_ID,
      [],
    );
    const props = makeProps({configuredTkvs: [original]});
    renderPanel(props);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Edit'));

    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    fireEvent.click(screen.getByRole('button', {name: 'Update'}));

    await waitFor(() => {
      expect(props.updateTkvParameters).toHaveBeenCalledWith(
        INSTANCE_SYSTEM_ID,
        original.systemId,
        ['PARAM_SYS_MODULE_TAG_1'],
      );
    });
  });

  it('deletes a configured TKV by calling deleteTkvs with its tagGroupId and systemId', async () => {
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
    const props = makeProps({configuredTkvs});
    renderPanel(props);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(props.deleteTkvs).toHaveBeenCalledWith(INSTANCE_SYSTEM_ID, [
        {tagGroupId: TAG1_ID, tkvSystemId: configuredTkvs[1].systemId},
      ]);
    });
  });

  it('shows a module tag (no key-values) as its own row using the tag group name as the label', () => {
    const moduleTag: ConfiguredTkv = {
      keyValuePairs: [],
      pidConfig: [],
      systemId: 'TAG_SYS_1',
      tagGroup: 'Tag1',
      tagGroupId: TAG1_ID,
    };

    renderPanel(makeProps({configuredTkvs: [moduleTag]}));

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    expect(screen.getByText('[Tag1]')).toBeInTheDocument();
  });

  it('does not render an Edit icon for a module tag row (nothing to edit)', () => {
    const moduleTag: ConfiguredTkv = {
      keyValuePairs: [],
      pidConfig: [],
      systemId: 'TAG_SYS_1',
      tagGroup: 'Tag1',
      tagGroupId: TAG1_ID,
    };

    renderPanel(makeProps({configuredTkvs: [moduleTag]}));

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });

  it('deletes a module tag row by calling deleteTagGroup, not deleteTkvs', async () => {
    const moduleTag: ConfiguredTkv = {
      keyValuePairs: [],
      pidConfig: [],
      systemId: 'TAG_SYS_1',
      tagGroup: 'Tag1',
      tagGroupId: TAG1_ID,
    };
    const props = makeProps({configuredTkvs: [moduleTag]});
    renderPanel(props);

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText('Delete'));

    await waitFor(() => {
      expect(props.deleteTagGroup).toHaveBeenCalledWith(
        INSTANCE_SYSTEM_ID,
        TAG1_ID,
      );
    });
    expect(props.deleteTkvs).not.toHaveBeenCalled();
  });

  it('deletes an entire tag group by calling deleteTagGroup with its tagGroupId', async () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];
    const props = makeProps({configuredTkvs});
    renderPanel(props);

    fireEvent.click(screen.getByLabelText('Delete tag group'));

    await waitFor(() => {
      expect(props.deleteTagGroup).toHaveBeenCalledWith(
        INSTANCE_SYSTEM_ID,
        TAG1_ID,
      );
    });
  });

  it('disables Add/Edit/Delete but keeps Copy active when isEditable is false', () => {
    const configuredTkvs = [
      buildTkv(
        [{key: KEY_INSTANCE, value: KEY_INSTANCE.values[0]}],
        'Tag1',
        TAG1_ID,
      ),
    ];

    renderPanel(makeProps({configuredTkvs, isEditable: false}));

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

    renderPanel(makeProps({configuredTkvs}));

    fireEvent.click(screen.getByLabelText('Toggle Tag1 section'));
    fireEvent.click(screen.getByLabelText(/Copy/));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '[Instance: Instance_1]',
    );
  });

  it('shows suggestions matching a key-name prefix', () => {
    renderPanel(makeProps());

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

  it('shows a diagnostic banner when a key name is ambiguous across tag groups', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_AMBIGUOUS}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[KeyDup: Shared]'}},
    );

    expect(screen.getByText(/Shared is ambiguous between/)).toBeInTheDocument();
  });

  it('shows no suggestion list for a non-matching search token', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: 'zzzzz'}},
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps suggesting every ambiguous candidate after the value auto-resolves (regression)', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_AMBIGUOUS}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    const searchBox = screen.getByPlaceholderText(
      'Search module tag keys or values...',
    );
    // A second keystroke on the same resolved text is needed to reproduce
    // the bug: the auto-resolved tag group only pollutes component state
    // (and therefore narrows the next suggestion list) starting on the
    // render that follows the keystroke which produced it.
    fireEvent.change(searchBox, {target: {value: 'Share'}});
    fireEvent.change(searchBox, {target: {value: 'Shared'}});

    // Asserting the exact count (not just a filter for "Shared") is what
    // catches the regression: the bug reported this dropdown showing every
    // in-scope value — including the non-matching "Other" candidates added
    // to this fixture — instead of only the ones matching typed text.
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(
      options.filter((option) => option.textContent?.includes('Shared')),
    ).toHaveLength(2);
  });

  it('shows no suggestion list right after typing a lone "+"', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_AMBIGUOUS}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    const searchBox = screen.getByPlaceholderText(
      'Search module tag keys or values...',
    );
    fireEvent.change(searchBox, {target: {value: 'Shared'}});
    fireEvent.change(searchBox, {target: {value: 'Shared+'}});

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('resumes showing matching suggestions once typing continues after a "+"', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_AMBIGUOUS}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    const searchBox = screen.getByPlaceholderText(
      'Search module tag keys or values...',
    );
    fireEvent.change(searchBox, {target: {value: 'Shared'}});
    fireEvent.change(searchBox, {target: {value: 'Shared+'}});
    fireEvent.change(searchBox, {target: {value: 'Shared+Oth'}});

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(
      options.filter((option) => option.textContent?.includes('Other')),
    ).toHaveLength(2);
  });

  it('treats a lone "+" as a no-op instead of clearing the table to no-match', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '+'}},
    );

    expect(
      screen.queryByText('No module tag keys or values match your search'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Tag1')).toBeInTheDocument();
    expect(screen.getByText('Tag2')).toBeInTheDocument();
  });

  it('selects a key-less module tag by its exact name typed in the search box', async () => {
    const props = makeProps({moduleTagKeys: MODULE_TAG_KEYS_WITH_EMPTY_TAG});
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: 'TagEmpty'}},
    );
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addTkvs).toHaveBeenCalledWith(
        INSTANCE_SYSTEM_ID,
        MODULE_TAG_KEYS_WITH_EMPTY_TAG.TagEmpty.id,
        [],
        [],
      );
    });
  });

  it('does not select a value under a different tag group that shares a colliding key/value id', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_COLLIDING_IDS}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByText('TagEpsilon'));
    fireEvent.click(screen.getByText('Mute'));
    fireEvent.click(screen.getByLabelText('Select On'));

    // MuteAlt shares Mute's modKey id, so expandedModKeys (also keyed by raw
    // id) is already true for it — expanding TagZeta is enough to reveal
    // "Select OnAlt" without a second click that would just collapse it back.
    fireEvent.click(screen.getByText('TagZeta'));

    expect(screen.getByLabelText('Select OnAlt')).not.toBeChecked();
  });

  it('keeps showing every tag group in the table while a "+"-joined search is typed', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_COMPOUND}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: 'Instance+Level'}},
    );

    expect(screen.getByText('TagSame')).toBeInTheDocument();
    expect(screen.getByText('TagOther')).toBeInTheDocument();
  });

  it('resolves a "+" typed after an already-resolved term, selecting both values (regression)', async () => {
    const props = makeProps({moduleTagKeys: MODULE_TAG_KEYS_MUTE});
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    const searchBox = screen.getByPlaceholderText(
      'Search module tag keys or values...',
    );
    fireEvent.change(searchBox, {target: {value: 'Off'}});
    fireEvent.change(searchBox, {target: {value: 'Off+On'}});
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addTkvs).toHaveBeenCalledTimes(1);
    });
    const [, tagGroupIdArg, combinationsArg] = props.addTkvs.mock.calls[0];
    expect(tagGroupIdArg).toBe(TAG_MUTE_ID);
    expect(
      new Set(combinationsArg.map((c: string[]) => [...c].sort().join('+'))),
    ).toEqual(new Set([['VAL_SYS_MUTE_OFF'].join('+'), ['VAL_SYS_MUTE_ON'].join('+')]));
  });

  it('keeps an earlier confirmed value and selects the new one when a "+"-joined suggestion is clicked for a different key (regression)', async () => {
    const props = makeProps({moduleTagKeys: MODULE_TAG_KEYS_TOGGLE_AMBIGUOUS});
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(
      screen.getByLabelText('Select parameter PARAM_ID_MODULE_TAG_1'),
    );
    const searchBox = screen.getByPlaceholderText(
      'Search module tag keys or values...',
    );
    fireEvent.change(searchBox, {target: {value: 'Off'}});
    fireEvent.click(
      screen
        .getAllByRole('option')
        .find((option) => option.textContent?.includes('ToggleBeta'))!,
    );
    expect(searchBox).toHaveValue('[ToggleBeta: Off]');

    fireEvent.change(searchBox, {target: {value: '[ToggleBeta: Off]+On'}});
    fireEvent.click(
      screen
        .getAllByRole('option')
        .find((option) => option.textContent?.includes('ToggleBeta'))!,
    );

    expect(searchBox).toHaveValue('[ToggleBeta: Off] [ToggleBeta: On]');

    fireEvent.click(getPrimaryActionButton('Add'));
    await waitFor(() => {
      expect(props.addTkvs).toHaveBeenCalledTimes(1);
    });
    const [, tagGroupIdArg, combinationsArg] = props.addTkvs.mock.calls[0];
    expect(tagGroupIdArg).toBe(TAG_TOGGLE_BETA_ID);
    expect(
      new Set(combinationsArg.map((c: string[]) => [...c].sort().join('+'))),
    ).toEqual(
      new Set([
        ['VAL_TOGGLE_BETA_OFF'].join('+'),
        ['VAL_TOGGLE_BETA_ON'].join('+'),
      ]),
    );
  });

  it('shows the matching tag groups, not "no match", for an ambiguous "[Key: Value]" paste (regression)', () => {
    renderPanel(makeProps({moduleTagKeys: MODULE_TAG_KEYS_AMBIGUOUS}));

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[KeyDup: Shared]'}},
    );

    expect(screen.getByText(/Shared is ambiguous between/)).toBeInTheDocument();
    expect(
      screen.queryByText('No module tag keys or values match your search'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('TagDelta')).toBeInTheDocument();
  });

  it('shows the matching table, not "no match", when a module tag\'s copied "[TagName]" label is pasted (regression)', async () => {
    const props = makeProps({moduleTagKeys: MODULE_TAG_KEYS_WITH_EMPTY_TAG});
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search module tag keys or values...'),
      {target: {value: '[TagEmpty]'}},
    );

    expect(
      screen.queryByText('No module tag keys or values match your search'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('TagEmpty')).toBeInTheDocument();

    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addTkvs).toHaveBeenCalledWith(
        INSTANCE_SYSTEM_ID,
        MODULE_TAG_KEYS_WITH_EMPTY_TAG.TagEmpty.id,
        [],
        [],
      );
    });
  });
});
