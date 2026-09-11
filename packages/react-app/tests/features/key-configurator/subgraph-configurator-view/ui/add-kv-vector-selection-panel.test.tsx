/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the Add Selection Panel as a controlled projection of one candidate.
 * A key cannot be selected alone; each key has at most one chosen value, and
 * sorting/expansion only change presentation rather than candidate identity.
 */
import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';

import {AddKvVectorSelectionPanel} from '~features/key-configurator/subgraph-configurator-view/ui/add-kv-vector-selection-panel';

import {createKeyDefinitionDtos} from '../../../../entities/key-definitions/model/key-definition.fixture';

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  IconButton: ({
    'aria-label': ariaLabel,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button aria-label={ariaLabel} onClick={onClick} />
  ),
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    disabled,
    onCheckedChange,
    onClick,
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
      onClick={onClick}
      type="checkbox"
    />
  ),
}));

jest.mock('@qualcomm-ui/react/radio', () => {
  const React = jest.requireActual('react');
  const RadioGroupContext = React.createContext<(value: string) => void>(
    () => undefined,
  );

  return {
    Radio: ({
      'aria-label': ariaLabel,
      value,
    }: {
      'aria-label': string;
      value: string;
    }) => {
      const onValueChange = React.useContext(RadioGroupContext);
      return (
        <input
          aria-label={ariaLabel}
          onChange={() => onValueChange(value)}
          type="radio"
          value={value}
        />
      );
    },
    RadioGroup: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
    }) => (
      <RadioGroupContext.Provider value={onValueChange ?? (() => undefined)}>
        <div>{children}</div>
      </RadioGroupContext.Provider>
    ),
  };
});

jest.mock('~shared/controls/arc-search-bar', () => ({
  __esModule: true,
  default: ({
    onSearchChange,
    searchTerm,
  }: {
    onSearchChange: (value: string) => void;
    searchTerm: string;
  }) => (
    <input
      aria-label="Filter keys and values"
      onChange={(event) => onSearchChange(event.target.value)}
      value={searchTerm}
    />
  ),
}));

const definitions = createKeyDefinitionDtos([
  {
    name: 'StreamTX',
    naturalId: 2,
    systemId: 'key-stream',
    values: [{name: 'PCM_Record', naturalId: 22, systemId: 'value-pcm'}],
  },
  {
    name: 'DeviceTX',
    naturalId: 1,
    systemId: 'key-device',
    values: [{name: 'A2B_Mic', naturalId: 11, systemId: 'value-a2b'}],
  },
]);

function SelectionPanelHarness() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['key-device']);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({
    'key-device': 'value-a2b',
  });

  return (
    <AddKvVectorSelectionPanel
      definitions={definitions}
      onSelectionChange={(nextKeys, nextValues) => {
        setSelectedKeys(nextKeys);
        setSelectedValues(nextValues);
      }}
      selectedKeySystemIds={selectedKeys}
      selectedValueSystemIdsByKey={selectedValues}
    />
  );
}

describe('AddKvVectorSelectionPanel', () => {
  it('uses checked key checkboxes only to remove selected values', () => {
    render(<SelectionPanelHarness />);

    const selectedKey = screen.getByLabelText('Select DeviceTX');
    const unselectedKey = screen.getByLabelText('Select StreamTX');

    expect(selectedKey).toBeChecked();
    expect(unselectedKey).toBeDisabled();

    fireEvent.click(selectedKey);

    expect(selectedKey).not.toBeChecked();
  });

  it('omits its local filter and expand controls', () => {
    render(<SelectionPanelHarness />);

    expect(
      screen.queryByLabelText('Filter keys and values'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Expand all')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Collapse all')).not.toBeInTheDocument();
    expect(screen.queryByText('Select filtered')).not.toBeInTheDocument();
    expect(screen.queryByText('Deselect filtered')).not.toBeInTheDocument();
  });

  it('uses a taller, compact list for key and value selection', () => {
    render(<SelectionPanelHarness />);

    expect(screen.getByText('Key ID').closest('.max-h-80')).toBeInTheDocument();
  });

  it('places expand and collapse controls in the aligned panel header', () => {
    const onCollapseAll = jest.fn();
    const onExpandAll = jest.fn();

    render(
      <AddKvVectorSelectionPanel
        definitions={definitions}
        onCollapseAll={onCollapseAll}
        onExpandAll={onExpandAll}
        onSelectionChange={jest.fn()}
        selectedKeySystemIds={[]}
        selectedValueSystemIdsByKey={{}}
      />,
    );

    const header = screen.getByText('Key Name').closest('.sticky');
    expect(header).toHaveClass('gap-1');
    expect(screen.getByRole('button', {name: 'Key Name'})).toHaveClass(
      'justify-start',
      'px-0',
      'w-full',
    );

    fireEvent.click(screen.getByRole('button', {name: 'Expand all'}));
    fireEvent.click(screen.getByRole('button', {name: 'Collapse all'}));

    expect(onExpandAll).toHaveBeenCalledTimes(1);
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });

  it('checks a key when the user selects one of its values', () => {
    render(<SelectionPanelHarness />);

    fireEvent.click(screen.getByLabelText('Expand StreamTX'));
    fireEvent.click(screen.getByLabelText('Select PCM_Record'));

    expect(screen.getByLabelText('Select StreamTX')).toBeChecked();
  });

  it('allows a value to be selected again after its key is cleared', () => {
    render(<SelectionPanelHarness />);

    fireEvent.click(screen.getByLabelText('Expand DeviceTX'));
    fireEvent.click(screen.getByLabelText('Select DeviceTX'));
    fireEvent.click(screen.getByLabelText('Select A2B_Mic'));

    expect(screen.getByLabelText('Select DeviceTX')).toBeChecked();
  });

  it('sorts through the Key ID and Key Name headers', () => {
    render(<SelectionPanelHarness />);

    fireEvent.click(screen.getByRole('button', {name: 'Key Name'}));

    const names = screen
      .getAllByText(/^(DeviceTX|StreamTX)$/)
      .map((element) => element.textContent);
    expect(names).toEqual(['DeviceTX', 'StreamTX']);
  });
});
