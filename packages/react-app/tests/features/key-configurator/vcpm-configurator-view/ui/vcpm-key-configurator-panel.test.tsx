/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * VcpmKeyConfiguratorPanel is a pure prop consumer (no graph-designer store
 * access) — props are supplied directly with jest.fn() spies standing in
 * for the store actions the widget would normally wire up.
 */
jest.mock('~shared/lib/logger');

// The global mock in tests/test-setup.ts only wires the legacy `onChange`
// prop, not QUI's real `onCheckedChange` — override locally so clicks on
// the real Checkbox consumers in this panel actually fire, mirroring
// calibration-keys-config-panel.test.tsx.
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
// calibration-keys-config-panel.test.tsx.
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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {VcpmKeyConfiguratorPanel} from '~features/key-configurator/vcpm-configurator-view/ui/vcpm-key-configurator-panel';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';

const KEY_VOLUME: GraphKey = {
  id: 1,
  name: 'Volume',
  systemId: 'KEY_SYS_VOLUME',
  values: [
    {id: 10, name: 'Level_0', systemId: 'VAL_SYS_LEVEL_0'},
    {id: 11, name: 'Level_1', systemId: 'VAL_SYS_LEVEL_1'},
    {id: 12, name: 'Level_2', systemId: 'VAL_SYS_LEVEL_2'},
  ],
};

const KEY_GAIN: GraphKey = {
  id: 2,
  name: 'Gain',
  systemId: 'KEY_SYS_GAIN',
  values: [
    {id: 20, name: 'Gain_0', systemId: 'VAL_SYS_GAIN_0'},
    {id: 21, name: 'Gain_1', systemId: 'VAL_SYS_GAIN_1'},
  ],
};

const voiceKeys: Record<string, GraphKey> = {
  Gain: KEY_GAIN,
  Volume: KEY_VOLUME,
};

const CONFIGURED_CKV: ConfiguredCkv = {
  keyValuePairs: [{key: KEY_VOLUME, value: KEY_VOLUME.values[1]}],
  pidConfig: [],
  systemId: 'KEY_SYS_VOLUME:VAL_SYS_LEVEL_1',
};

function makeProps(
  overrides: Partial<{
    configuredCkvs: ConfiguredCkv[];
    isEditable: boolean;
  }> = {},
) {
  return {
    addVcpmCkvs: jest.fn().mockResolvedValue(true),
    configuredCkvs: overrides.configuredCkvs ?? [],
    deleteVcpmCkv: jest.fn().mockResolvedValue(true),
    isEditable: overrides.isEditable ?? true,
    voiceKeys,
  };
}

function renderPanel(props: ReturnType<typeof makeProps>) {
  return render(<VcpmKeyConfiguratorPanel {...props} />);
}

// Once the picker is open, ConfigSummaryView's own (disabled) "Add
// configuration" button and the panel's primary Add action button both
// render with the accessible name "Add" — disambiguate by the `title`
// attribute that only ConfigSummaryView's button carries.
function getPrimaryActionButton(name: string) {
  const button = screen
    .getAllByRole('button', {name})
    .find((candidate) => !candidate.hasAttribute('title'));
  if (!button) {
    throw new Error(`Primary action button "${name}" not found`);
  }
  return button;
}

describe('VcpmKeyConfiguratorPanel', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
  });

  it('renders "No keys configured" when configuredCkvs is empty', () => {
    renderPanel(makeProps());

    expect(screen.getByText('No keys configured')).toBeInTheDocument();
  });

  it('renders existing configured CKVs using formatCkvEntry', () => {
    renderPanel(makeProps({configuredCkvs: [CONFIGURED_CKV]}));

    expect(screen.getByText('[Volume: Level_1]')).toBeInTheDocument();
  });

  it('shows every voice key in the Available Keys table before any search text is typed', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));

    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('Gain')).toBeInTheDocument();
  });

  it('adds a new CKV entry via addVcpmCkvs with the resolved value combination', async () => {
    const props = makeProps();
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Expand Volume'}));
    fireEvent.click(screen.getByLabelText('Select Level_2'));
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addVcpmCkvs).toHaveBeenCalledTimes(1);
    });
    expect(props.addVcpmCkvs).toHaveBeenCalledWith([['VAL_SYS_LEVEL_2']]);
  });

  it('generates every combination when multiple values are selected across keys', async () => {
    const props = makeProps();
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Expand Volume'}));
    fireEvent.click(screen.getByLabelText('Select Level_0'));
    fireEvent.click(screen.getByLabelText('Select Level_1'));
    fireEvent.click(screen.getByRole('button', {name: 'Expand Gain'}));
    fireEvent.click(screen.getByLabelText('Select Gain_0'));
    fireEvent.click(getPrimaryActionButton('Add'));

    await waitFor(() => {
      expect(props.addVcpmCkvs).toHaveBeenCalledTimes(1);
    });
    expect(props.addVcpmCkvs).toHaveBeenCalledWith([
      ['VAL_SYS_LEVEL_0', 'VAL_SYS_GAIN_0'],
      ['VAL_SYS_LEVEL_1', 'VAL_SYS_GAIN_0'],
    ]);
  });

  it('disables the Add button when nothing is selected', () => {
    const props = makeProps();
    renderPanel(props);

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));

    expect(getPrimaryActionButton('Add')).toBeDisabled();
    expect(props.addVcpmCkvs).not.toHaveBeenCalled();
  });

  it('selecting a key checkbox selects all of its values, and unchecking it clears them', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Expand Volume'}));
    fireEvent.click(screen.getByLabelText('Select Volume'));

    expect(screen.getByLabelText('Select Level_0')).toBeChecked();
    expect(screen.getByLabelText('Select Level_1')).toBeChecked();
    expect(screen.getByLabelText('Select Level_2')).toBeChecked();

    fireEvent.click(screen.getByLabelText('Select Volume'));

    expect(screen.getByLabelText('Select Level_0')).not.toBeChecked();
    expect(screen.getByLabelText('Select Level_1')).not.toBeChecked();
    expect(screen.getByLabelText('Select Level_2')).not.toBeChecked();
  });

  it('expands and collapses every key via the Expand All / Collapse All controls', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Expand All'}));

    expect(screen.getByLabelText('Select Level_0')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Gain_0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Collapse All'}));

    expect(screen.queryByLabelText('Select Level_0')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select Gain_0')).not.toBeInTheDocument();
  });

  it('filters the Available Keys table by the token typed after a confirmed selection', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Expand Volume'}));
    fireEvent.click(screen.getByLabelText('Select Level_1'));

    fireEvent.change(
      screen.getByPlaceholderText('Search voice keys or values...'),
      {target: {value: '[Volume: Level_1] Gai'}},
    );

    expect(screen.getByText('Gain')).toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
  });

  it('shows an empty-state message when no voice keys match the token typed after a confirmed selection', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.click(screen.getByRole('button', {name: 'Expand Volume'}));
    fireEvent.click(screen.getByLabelText('Select Level_1'));

    fireEvent.change(
      screen.getByPlaceholderText('Search voice keys or values...'),
      {target: {value: '[Volume: Level_1] nonexistent'}},
    );

    expect(
      screen.getByText('No voice keys or values match your search'),
    ).toBeInTheDocument();
  });

  it('shows a diagnostic message for an unknown search token', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    fireEvent.change(
      screen.getByPlaceholderText('Search voice keys or values...'),
      {target: {value: 'nonexistent-token'}},
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Value "nonexistent-token" was not found for any key.',
    );
  });

  it('shows suggestions matching a value-name prefix and selects one by clicking it', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    const searchInput = screen.getByPlaceholderText(
      'Search voice keys or values...',
    );
    fireEvent.change(searchInput, {target: {value: 'Level'}});

    const option = screen
      .getAllByRole('option')
      .find((element) => element.textContent?.includes('Level_2'));
    expect(option).toBeDefined();
    fireEvent.click(option!);

    expect(searchInput).toHaveValue('[Volume: Level_2]');
  });

  it('sorts the Available Keys table by Key ID when the Key ID header is clicked', () => {
    renderPanel(makeProps());

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));

    const getKeyRowExpandLabels = () =>
      screen
        .getAllByRole('button', {name: /^Expand /})
        .map((button) => button.getAttribute('aria-label'))
        .filter((label) => label !== 'Expand All');

    expect(getKeyRowExpandLabels()).toEqual(['Expand Gain', 'Expand Volume']);

    fireEvent.click(screen.getByText('Key ID').closest('button')!);

    expect(getKeyRowExpandLabels()).toEqual(['Expand Volume', 'Expand Gain']);
  });

  it('deletes a configured CKV by calling deleteVcpmCkv with its systemId', async () => {
    const props = makeProps({configuredCkvs: [CONFIGURED_CKV]});
    renderPanel(props);

    fireEvent.click(screen.getByLabelText('Delete'));

    await waitFor(() => {
      expect(props.deleteVcpmCkv).toHaveBeenCalledWith(CONFIGURED_CKV.systemId);
    });
  });

  it('copies the row formatted entry text to the clipboard', () => {
    renderPanel(makeProps({configuredCkvs: [CONFIGURED_CKV]}));

    fireEvent.click(screen.getByLabelText(/Copy/));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '[Volume: Level_1]',
    );
  });

  it('disables Add/Delete but still renders the list when isEditable is false', () => {
    renderPanel(
      makeProps({configuredCkvs: [CONFIGURED_CKV], isEditable: false}),
    );

    expect(screen.getByText('[Volume: Level_1]')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
  });
});
