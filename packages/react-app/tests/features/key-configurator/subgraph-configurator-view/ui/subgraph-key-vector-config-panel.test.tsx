/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Integration-style coverage for the subgraph KV panel. The suite treats the
 * Editor and Selection Panel as two synchronized views of one local candidate,
 * then verifies filters, copy, session-local deletion, Add eligibility, and
 * View/Edit mode boundaries from the user's perspective.
 */
import {fireEvent, render, screen, within} from '@testing-library/react';

import type {KvSelection} from '~entities/subgraph-definitions';
import {
  INITIAL_SUBGRAPH_KV_FILTER_STATE,
  SubgraphKeyVectorConfigPanel,
} from '~features/key-configurator/subgraph-configurator-view';

import {createKeyDefinitionDtos} from '../../../../entities/key-definitions/model/key-definition.fixture';

jest.mock('~shared/lib/logger');

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({
    'aria-label': ariaLabel,
    children,
    disabled,
    emphasis,
    onClick,
    variant,
  }: any) => (
    <button
      aria-label={ariaLabel}
      data-emphasis={emphasis}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  IconButton: ({'aria-label': ariaLabel, onClick}: any) => (
    <button aria-label={ariaLabel} onClick={onClick} />
  ),
}));

jest.mock('@qualcomm-ui/react/text-area', () => ({
  TextArea: ({inputProps, onValueChange, placeholder, value}: any) => (
    <textarea
      {...inputProps}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    disabled,
    onCheckedChange,
  }: {
    'aria-label': string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange(event.target.checked)}
      type="checkbox"
    />
  ),
}));

jest.mock('@qualcomm-ui/react/radio', () => {
  const React = require('react');
  const RadioGroupContext = React.createContext({
    onValueChange: () => undefined,
    value: '',
  });
  return {
    Radio: ({'aria-label': ariaLabel, value}: any) => {
      const {onValueChange, value: selectedValue} =
        React.useContext(RadioGroupContext);
      return (
        <input
          aria-label={ariaLabel}
          checked={selectedValue === value}
          onChange={() => onValueChange(value)}
          type="radio"
        />
      );
    },
    RadioGroup: ({children, onValueChange, value}: any) => (
      <RadioGroupContext.Provider value={{onValueChange, value}}>
        {children}
      </RadioGroupContext.Provider>
    ),
  };
});

jest.mock('@qualcomm-ui/react/dialog', () => ({
  Dialog: {
    Body: ({children}: any) => <div>{children}</div>,
    CloseTrigger: ({children}: any) => <>{children}</>,
    Description: ({children}: any) => <div>{children}</div>,
    FloatingPortal: ({children}: any) => <div>{children}</div>,
    Footer: ({children}: any) => <div>{children}</div>,
    Heading: ({children}: any) => <h2>{children}</h2>,
    IndicatorIcon: () => null,
    Root: ({children}: any) => <div>{children}</div>,
    Trigger: ({children}: any) => <>{children}</>,
  },
}));

jest.mock('@qualcomm-ui/react/tooltip', () => ({
  Tooltip: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>,
}));

jest.mock('~shared/controls/arc-search-bar', () => ({
  __esModule: true,
  default: ({onSearchChange, searchTerm}: any) => (
    <input
      aria-label="Search KV vectors"
      onChange={(event) => onSearchChange(event.target.value)}
      value={searchTerm}
    />
  ),
}));

const vectors: KvSelection[] = [
  {
    isEc: false,
    isSessionAdded: true,
    keyValuePairs: [
      {
        keyInfo: {keyLabel: 'DeviceTX'},
        valueInfo: {valueLabel: 'A2B_Mic'},
      },
    ] as never,
    selected: true,
    systemId: 'sgkv-1',
  },
  {
    isEc: true,
    keyValuePairs: [
      {
        keyInfo: {keyLabel: 'StreamTX'},
        valueInfo: {valueLabel: 'PCM_Record'},
      },
    ] as never,
    selected: false,
    systemId: 'sgkv-2',
  },
];

const duplicateDefinitions = createKeyDefinitionDtos([
  {
    name: 'DeviceTX',
    naturalId: 1,
    systemId: 'key-device',
    values: [{name: 'A2B_Mic', naturalId: 11, systemId: 'value-a2b'}],
  },
]);

const duplicateVectors: KvSelection[] = [
  {
    isEc: false,
    keyValuePairs: [
      {
        keyInfo: {
          keyId: 1,
          keyLabel: 'DeviceTX',
          keySystemId: 'persisted-key-device',
        },
        valueInfo: {
          valueId: 11,
          valueLabel: 'A2B_Mic',
          valueSystemId: 'persisted-value-a2b',
        },
      },
    ],
    selected: true,
    systemId: 'persisted-vector',
  },
];

const editorDefinitions = createKeyDefinitionDtos([
  {
    name: 'DeviceTX',
    naturalId: 1,
    systemId: 'key-device',
    values: [{name: 'A2B_Mic', naturalId: 11, systemId: 'value-a2b'}],
  },
]);

const repeatedValueDefinitions = createKeyDefinitionDtos([
  {
    name: 'Key1',
    naturalId: 1,
    systemId: 'key-1',
    values: [{name: 'LL', naturalId: 11, systemId: 'value-1-ll'}],
  },
  {
    name: 'Key2',
    naturalId: 2,
    systemId: 'key-2',
    values: [{name: 'LL', naturalId: 21, systemId: 'value-2-ll'}],
  },
]);

const keyValueSuggestionDefinitions = createKeyDefinitionDtos([
  {
    name: 'StreamRX',
    naturalId: 1,
    systemId: 'key-stream-rx',
    values: [
      {
        name: 'PCM_Deep_Buffer',
        naturalId: 11,
        systemId: 'value-pcm-deep-buffer',
      },
    ],
  },
  {
    name: 'StreamTX',
    naturalId: 2,
    systemId: 'key-stream-tx',
    values: [
      {name: 'ACD', naturalId: 21, systemId: 'value-acd'},
      {name: 'ACD_QC', naturalId: 22, systemId: 'value-acd-qc'},
    ],
  },
]);

const orderedDefinitions = createKeyDefinitionDtos([
  {
    name: 'DeviceTX',
    naturalId: 1,
    systemId: 'key-device',
    values: [{name: 'A2B_Mic', naturalId: 11, systemId: 'value-a2b'}],
  },
  {
    name: 'StreamTX',
    naturalId: 2,
    systemId: 'key-stream',
    values: [{name: 'PCM_Record', naturalId: 22, systemId: 'value-pcm'}],
  },
]);

const formattingDefinitions = createKeyDefinitionDtos([
  {
    name: 'DeviceRX',
    naturalId: 1,
    systemId: 'key-device-rx',
    values: [{name: 'Handset', naturalId: 11, systemId: 'value-handset'}],
  },
  {
    name: 'DeviceTX',
    naturalId: 2,
    systemId: 'key-device-tx',
    values: [{name: 'BT_Tx', naturalId: 22, systemId: 'value-bt-tx'}],
  },
  {
    name: 'StreamTX',
    naturalId: 3,
    systemId: 'key-stream-tx',
    values: [
      {name: 'Voice_Call_Tx', naturalId: 33, systemId: 'value-voice-call-tx'},
    ],
  },
]);

/**
 * Renders the complete panel with production defaults and targeted overrides.
 * Tests use it to isolate one behavior without obscuring the normal panel
 * contract behind a different fixture for every scenario.
 */
function renderPanel(
  overrides: Partial<
    React.ComponentProps<typeof SubgraphKeyVectorConfigPanel>
  > = {},
) {
  const props = {
    availableGraphKeys: null,
    displayMode: 'key-value' as const,
    filters: {
      ...INITIAL_SUBGRAPH_KV_FILTER_STATE,
      selected: true,
      unselected: true,
    },
    isEditable: false,
    onDelete: jest.fn(),
    onFiltersChange: jest.fn(),
    onSelectionChange: jest.fn(),
    subgraphSystemId: 'subgraph-1',
    vectors,
    ...overrides,
  };

  return {props, ...render(<SubgraphKeyVectorConfigPanel {...props} />)};
}

describe('SubgraphKeyVectorConfigPanel', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {writeText: jest.fn().mockResolvedValue(undefined)},
    });
  });

  it('uses the requested display format for vector rows and Copy', () => {
    renderPanel({displayMode: 'value-only'});

    expect(screen.getByText('A2B_Mic')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Copy A2B_Mic'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('A2B_Mic');
  });

  it('shows neutral feedback while selected and EC metadata is loading', () => {
    renderPanel({isMetadataPending: true});

    expect(
      screen.getByText('Loading...'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Select [DeviceTX:A2B_Mic]')).toBeNull();
  });

  it('shows edit-only selection and session-added Delete controls', () => {
    const onSelectionChange = jest.fn();
    renderPanel({isEditable: true, onSelectionChange});

    fireEvent.click(screen.getByLabelText('Select [DeviceTX:A2B_Mic]'));
    expect(onSelectionChange).toHaveBeenCalledWith('sgkv-1', false);
    expect(
      screen.getByLabelText('Delete [DeviceTX:A2B_Mic]'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Delete [StreamTX:PCM_Record]'),
    ).not.toBeInTheDocument();
  });

  it('deletes a session-added vector only after confirmation', () => {
    const onDelete = jest.fn();
    renderPanel({isEditable: true, onDelete});

    expect(screen.getByText('Delete KV vector?')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this KV vector?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
    expect(onDelete).toHaveBeenCalledWith('sgkv-1');
  });

  it('keeps selected vector state visible but read-only outside Edit mode', () => {
    renderPanel({
      filters: {
        ...INITIAL_SUBGRAPH_KV_FILTER_STATE,
        selected: true,
        unselected: true,
      },
    });

    const selectedCheckbox = screen.getByLabelText('Select [DeviceTX:A2B_Mic]');

    expect(selectedCheckbox).toBeChecked();
    expect(selectedCheckbox).toBeDisabled();
  });

  it('uses a purple EC row treatment instead of an EC text label', () => {
    renderPanel({
      filters: {
        ...INITIAL_SUBGRAPH_KV_FILTER_STATE,
        ec: true,
        regular: false,
        selected: true,
        unselected: true,
      },
    });

    const vectorText = screen.getByText('[StreamTX:PCM_Record]');

    const vectorRow = vectorText.parentElement?.parentElement;

    expect(vectorRow).toHaveStyle({
      backgroundColor:
        'color-mix(in oklch, var(--color-category-purple-subtle) 35%, transparent)',
    });
    expect(vectorRow).not.toHaveTextContent('EC');
  });

  it('reports filter changes without mutating the canonical vectors', () => {
    const onFiltersChange = jest.fn();
    renderPanel({onFiltersChange});

    fireEvent.change(screen.getByLabelText('Search KV vectors'), {
      target: {value: 'device'},
    });
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({searchText: 'device'}),
    );
    expect(vectors).toHaveLength(2);
  });

  it('toggles selection and type filters independently', () => {
    const onFiltersChange = jest.fn();
    const {props, rerender} = renderPanel({onFiltersChange});

    expect(screen.getByText('Selection')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Both'}),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Regular'})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Selected'}));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({selected: false}),
    );

    rerender(
      <SubgraphKeyVectorConfigPanel
        {...props}
        filters={{...props.filters, selected: false, unselected: false}}
      />,
    );
    fireEvent.click(screen.getByRole('button', {name: 'Unselected'}));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({unselected: true}),
    );

    fireEvent.click(screen.getByRole('button', {name: 'Regular'}));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ec: false, regular: false}),
    );

    rerender(
      <SubgraphKeyVectorConfigPanel
        {...props}
        filters={{
          ...props.filters,
          ec: true,
          regular: true,
          selected: false,
          unselected: true,
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', {name: 'EC'}));
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ec: false, regular: true}),
    );
  });

  it('places the primary Add action beside the vector-list search', () => {
    renderPanel({availableGraphKeys: [], isEditable: true});

    const addButton = screen.getByRole('button', {name: 'Add KV Vector'});
    expect(addButton).toHaveAttribute('data-emphasis', 'primary');
    expect(addButton).toHaveAttribute('data-variant', 'fill');
    expect(
      screen
        .getByLabelText('Search KV vectors')
        .closest('.flex.items-center.gap-2'),
    ).toContainElement(addButton);
  });

  it('opens an unavailable-definitions message from Add', () => {
    const onAdd = jest.fn(() => true);
    renderPanel({availableGraphKeys: null, isEditable: true, onAdd});

    const addButton = screen.getByRole('button', {name: 'Add KV Vector'});
    expect(addButton).toBeEnabled();

    fireEvent.click(addButton);

    expect(
      screen.getByText(
        'No key and value definitions are currently available to create a KV vector.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Add KV Vector Editor'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Cancel adding KV vector'}),
    ).toBeInTheDocument();
    expect(screen.getByText('[DeviceTX:A2B_Mic]')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows the unavailable-definitions message when no graph keys exist', () => {
    renderPanel({availableGraphKeys: [], isEditable: true});

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));

    expect(
      screen.getByText(
        'No key and value definitions are currently available to create a KV vector.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Add KV Vector Editor'),
    ).not.toBeInTheDocument();
  });

  it('shows Add controls above the vector list and closes them with Cancel', () => {
    renderPanel({availableGraphKeys: editorDefinitions, isEditable: true});

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));

    const editor = screen.getByLabelText('Add KV Vector Editor');
    const search = screen.getByLabelText('Search KV vectors');
    const firstVector = screen.getByText('[DeviceTX:A2B_Mic]');
    expect(
      editor.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      editor.compareDocumentPosition(firstVector) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);

    const cancelButton = screen.getByRole('button', {
      name: 'Cancel adding KV vector',
    });
    expect(cancelButton).toHaveAttribute('data-emphasis', 'neutral');
    expect(cancelButton).toHaveAttribute('data-variant', 'fill');

    fireEvent.click(cancelButton);
    expect(
      screen.queryByLabelText('Add KV Vector Editor'),
    ).not.toBeInTheDocument();
  });

  it('uses the Add editor as the single selection search control', () => {
    renderPanel({availableGraphKeys: editorDefinitions, isEditable: true});

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));

    expect(screen.getByLabelText('Expand all')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse all')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Filter keys and values'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add KV Vector Editor')).toHaveAttribute(
      'placeholder',
      'Search keys or values to build a KV vector',
    );
  });

  it('reformats a valid Add-editor candidate when display mode changes', () => {
    const {props, rerender} = renderPanel({
      availableGraphKeys: editorDefinitions,
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {target: {value: '[DeviceTX:A2B_Mic]'}});

    rerender(
      <SubgraphKeyVectorConfigPanel {...props} displayMode="value-only" />,
    );

    expect(editor).toHaveValue('A2B_Mic');
  });

  it('requires a suggestion commit before a bare value becomes a Key Value pair', () => {
    renderPanel({
      availableGraphKeys: keyValueSuggestionDefinitions,
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {
      target: {value: '[StreamRX:PCM_Deep_Buffer] ACD'},
    });

    expect(editor).toHaveValue('[StreamRX:PCM_Deep_Buffer] ACD');
    expect(screen.getByText('ACD_QC')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('ACD_QC'));

    expect(editor).toHaveValue('[StreamRX:PCM_Deep_Buffer] [StreamTX:ACD_QC]');
    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();
  });

  it('waits for a Value Only suggestion when the typed value has a longer match', () => {
    renderPanel({
      availableGraphKeys: keyValueSuggestionDefinitions,
      displayMode: 'value-only',
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {target: {value: 'ACD'}});

    expect(editor).toHaveValue('ACD');
    const suggestions = within(screen.getByRole('listbox'));
    expect(suggestions.getByText('ACD')).toBeInTheDocument();
    expect(suggestions.getByText('ACD_QC')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('ACD_QC'));

    expect(editor).toHaveValue('ACD_QC+');
    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();
  });

  it('preserves the key of an explicitly selected Value Only suggestion', () => {
    renderPanel({
      availableGraphKeys: repeatedValueDefinitions,
      displayMode: 'value-only',
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {target: {value: 'LL'}});

    fireEvent.click(screen.getByRole('button', {name: 'LL Key: Key2'}));

    expect(editor).toHaveValue('LL+');
    expect(screen.getByLabelText('Select Key1')).not.toBeChecked();
    expect(screen.getByLabelText('Select Key2')).toBeChecked();
    expect(
      screen.queryByText(/Automatically selected/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();

    fireEvent.change(editor, {target: {value: 'LL+L'}});

    expect(
      within(screen.getByRole('listbox')).queryByRole('button', {
        name: 'LL Key: Key2',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('listbox')).getByRole('button', {
        name: 'LL Key: Key1',
      }),
    ).toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'LL+LL'}});

    expect(screen.getByLabelText('Select Key1')).toBeChecked();
    expect(screen.getByLabelText('Select Key2')).toBeChecked();
    expect(
      screen.getByText(/Values are shared by multiple keys\./),
    ).toBeInTheDocument();
  });

  it('warns while keeping a repeated Value Only candidate addable', () => {
    renderPanel({
      availableGraphKeys: repeatedValueDefinitions,
      displayMode: 'value-only',
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    fireEvent.change(screen.getByLabelText('Add KV Vector Editor'), {
      target: {value: 'LL+LL'},
    });

    const warning = screen.getByText(
      /Values are shared by multiple keys\. Matching keys were selected automatically by key ID\./,
    );

    expect(warning).toHaveClass('text-icon-support-warning');
    expect(warning).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();
  });

  it('keeps explicitly selected duplicate values free of an automatic warning', () => {
    renderPanel({
      availableGraphKeys: repeatedValueDefinitions,
      displayMode: 'value-only',
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    fireEvent.click(screen.getByLabelText('Expand Key1'));
    fireEvent.click(screen.getAllByLabelText('Select LL')[0]);
    fireEvent.click(screen.getByLabelText('Expand Key2'));
    fireEvent.click(screen.getAllByLabelText('Select LL')[1]);

    expect(screen.getByLabelText('Add KV Vector Editor')).toHaveValue('LL+LL');
    expect(
      screen.queryByText(/Automatically selected/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();
  });

  it('blocks a Value Only candidate that cannot use distinct keys', () => {
    renderPanel({
      availableGraphKeys: repeatedValueDefinitions,
      displayMode: 'value-only',
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    fireEvent.change(screen.getByLabelText('Add KV Vector Editor'), {
      target: {value: 'LL+LL+LL'},
    });

    const error = screen.getByText(/appears 3 times but only 2 distinct keys/);

    expect(error).toHaveClass('text-support-danger');
    expect(error).toHaveAttribute('role', 'alert');
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();
  });

  it('shows incomplete input as guidance and clears the prior candidate', () => {
    const onAdd = jest.fn(() => true);
    renderPanel({
      availableGraphKeys: editorDefinitions,
      isEditable: true,
      onAdd,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {target: {value: '[DeviceTX:A2B_Mic]'}});

    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();

    fireEvent.change(editor, {target: {value: '[DeviceTX:A2B_Mic'}});

    const hint = screen.getByText('Complete "[DeviceTX:A2B_Mic" with ].');

    expect(hint).toHaveClass('text-neutral-secondary');
    expect(hint).toHaveAttribute('role', 'status');
    expect(editor).toHaveAttribute('aria-describedby', hint.id);
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();
    expect(screen.getByLabelText('Select DeviceTX')).not.toBeChecked();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows exact invalid input as an error and clears Selection Panel state', () => {
    renderPanel({
      availableGraphKeys: editorDefinitions,
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {target: {value: '[DeviceTX:A2B_Mic]'}});
    expect(screen.getByLabelText('Select DeviceTX')).toBeChecked();

    fireEvent.change(editor, {target: {value: '[DevceTX:A2B_Mic]'}});

    const error = screen.getByText('Key "DevceTX" was not found.');
    expect(error).toHaveClass('text-support-danger');
    expect(error).toHaveAttribute('role', 'alert');
    expect(editor).toHaveAttribute('aria-describedby', error.id);
    expect(screen.getByLabelText('Select DeviceTX')).not.toBeChecked();
    expect(screen.queryByRole('button', {name: 'Add'})).not.toBeInTheDocument();
  });

  it('normalizes valid formatting whitespace and synchronizes the selection', () => {
    renderPanel({
      availableGraphKeys: editorDefinitions,
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {
      target: {value: ' [ DeviceTX : A2B_Mic ]\n '},
    });

    expect(editor).toHaveValue('[DeviceTX:A2B_Mic]');
    expect(screen.getByLabelText('Select DeviceTX')).toBeChecked();
    expect(screen.getByRole('button', {name: 'Add'})).toBeEnabled();
  });

  it('does not open suggestions for spaces added to a complete KV vector', () => {
    renderPanel({
      availableGraphKeys: formattingDefinitions,
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {
      target: {
        value: '[DeviceRX:Handset] [DeviceTX:BT_Tx] [StreamTX:Voice_Call_Tx]',
      },
    });
    fireEvent.change(editor, {
      target: {
        value:
          '[DeviceRX:Handset] [DeviceTX:BT_Tx]       [StreamTX:Voice_Call_Tx]',
      },
    });

    expect(editor).toHaveValue(
      '[DeviceRX:Handset] [DeviceTX:BT_Tx] [StreamTX:Voice_Call_Tx]',
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not impose a fixed vector-list height', () => {
    renderPanel();

    expect(
      screen.getByText('[DeviceTX:A2B_Mic]').closest('.max-h-72'),
    ).not.toBeInTheDocument();
  });

  it('keeps editor input order until Add stores the definition-ordered vector', () => {
    const onAdd = jest.fn(() => true);
    renderPanel({
      availableGraphKeys: orderedDefinitions,
      isEditable: true,
      onAdd,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    const editor = screen.getByLabelText('Add KV Vector Editor');
    fireEvent.change(editor, {
      target: {value: '[StreamTX:PCM_Record][DeviceTX:A2B_Mic]'},
    });

    expect(editor).toHaveValue('[StreamTX:PCM_Record] [DeviceTX:A2B_Mic]');

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    expect(onAdd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          keyInfo: expect.objectContaining({keySystemId: 'key-device'}),
        }),
        expect.objectContaining({
          keyInfo: expect.objectContaining({keySystemId: 'key-stream'}),
        }),
      ]),
    );
    expect(
      onAdd.mock.calls[0][0].map(
        (pair: KvSelection['keyValuePairs'][number]) =>
          pair.keyInfo.keySystemId,
      ),
    ).toEqual(['key-device', 'key-stream']);
  });

  it('keeps Selection Panel choice order until Add stores the definition-ordered vector', () => {
    const onAdd = jest.fn(() => true);
    renderPanel({
      availableGraphKeys: orderedDefinitions,
      isEditable: true,
      onAdd,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    fireEvent.click(screen.getByLabelText('Expand StreamTX'));
    fireEvent.click(screen.getByLabelText('Select PCM_Record'));
    fireEvent.click(screen.getByLabelText('Expand DeviceTX'));
    fireEvent.click(screen.getByLabelText('Select A2B_Mic'));

    expect(screen.getByLabelText('Add KV Vector Editor')).toHaveValue(
      '[StreamTX:PCM_Record] [DeviceTX:A2B_Mic]',
    );

    fireEvent.click(screen.getByRole('button', {name: 'Add'}));
    expect(
      onAdd.mock.calls[0][0].map(
        (pair: KvSelection['keyValuePairs'][number]) =>
          pair.keyInfo.keySystemId,
      ),
    ).toEqual(['key-device', 'key-stream']);
  });

  it('keeps Add visible and explains why a duplicate candidate is unavailable', () => {
    renderPanel({
      availableGraphKeys: duplicateDefinitions,
      isEditable: true,
      vectors: duplicateVectors,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    fireEvent.change(screen.getByLabelText('Add KV Vector Editor'), {
      target: {value: '[DeviceTX:A2B_Mic]'},
    });

    const duplicateMessage = screen.getByText('This KV vector already exists.');
    const addButton = screen.getByRole('button', {name: 'Add'});

    expect(duplicateMessage).toHaveClass('text-support-danger');
    expect(addButton).toBeDisabled();
    expect(addButton.parentElement).toHaveClass('ml-auto');
  });

  it.each([{key: 'Delete'}, {ctrlKey: true, key: 'x'}])(
    'resynchronizes Selection Panel state after a Ctrl+A then $key clear',
    (keyEvent) => {
      renderPanel({
        availableGraphKeys: editorDefinitions,
        isEditable: true,
      });

      fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
      const editor = screen.getByLabelText('Add KV Vector Editor');
      fireEvent.change(editor, {target: {value: '[DeviceTX:A2B_Mic]'}});

      const keyCheckbox = screen.getByLabelText('Select DeviceTX');
      expect(keyCheckbox).toBeChecked();

      fireEvent.keyDown(editor, {ctrlKey: true, key: 'a'});
      editor.value = '';
      fireEvent.keyUp(editor, keyEvent);

      expect(keyCheckbox).not.toBeChecked();
    },
  );

  it('clears Selection Panel state from the editor clear action', () => {
    renderPanel({
      availableGraphKeys: editorDefinitions,
      isEditable: true,
    });

    fireEvent.click(screen.getByRole('button', {name: 'Add KV Vector'}));
    fireEvent.change(screen.getByLabelText('Add KV Vector Editor'), {
      target: {value: '[DeviceTX:A2B_Mic]'},
    });

    const keyCheckbox = screen.getByLabelText('Select DeviceTX');
    expect(keyCheckbox).toBeChecked();

    fireEvent.click(
      screen.getByRole('button', {name: 'Clear KV vector editor'}),
    );

    expect(screen.getByLabelText('Add KV Vector Editor')).toHaveValue('');
    expect(keyCheckbox).not.toBeChecked();
  });
});
