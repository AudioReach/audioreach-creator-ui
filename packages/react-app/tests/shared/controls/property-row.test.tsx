/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';

import {PropertyRow, type PropertyValue} from '~shared/controls/property-row';

describe('PropertyRow', () => {
  it('renders read-only text with an inline error', () => {
    render(
      <PropertyRow
        error="Save failed"
        isEditing={false}
        label="Alias"
        mode="text"
        onChange={jest.fn()}
        value="Decoder"
      />,
    );

    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Decoder')).toHaveAttribute('readOnly');
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
  });

  it('emits text and number changes through onChange', async () => {
    const onNumberChange = jest.fn();
    const onTextChange = jest.fn();

    function ControlledTextRow() {
      const [value, setValue] = useState('');
      return (
        <PropertyRow
          isEditing
          label="Alias"
          mode="text"
          onChange={(nextValue) => {
            onTextChange(nextValue);
            setValue(String(nextValue));
          }}
          value={value}
        />
      );
    }

    function ControlledNumberRow() {
      const [value, setValue] = useState<PropertyValue>(1);
      return (
        <PropertyRow
          isEditing
          label="Max Control Ports"
          mode="number"
          onChange={(nextValue) => {
            onNumberChange(nextValue);
            setValue(nextValue);
          }}
          value={value}
        />
      );
    }

    const {rerender} = render(<ControlledTextRow />);

    await userEvent.type(screen.getByRole('textbox'), 'A');
    expect(onTextChange).toHaveBeenLastCalledWith('A');

    rerender(<ControlledNumberRow />);

    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '2');
    expect(onNumberChange).toHaveBeenLastCalledWith(2);
  });

  it('renders a single-selection control for select rows', async () => {
    const onChange = jest.fn();

    function ControlledSelectRow() {
      const [value, setValue] = useState<PropertyValue>('olc');
      return (
        <PropertyRow
          isEditing
          label="Container Type"
          mode="select"
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          options={[
            {label: 'OLC', value: 'olc'},
            {label: 'PLC', value: 'plc'},
          ]}
          value={value}
        />
      );
    }

    render(<ControlledSelectRow />);

    const select = screen.getByTestId('q-select');
    await userEvent.clear(select);
    await userEvent.type(select, 'plc');
    expect(onChange).toHaveBeenLastCalledWith('plc');
  });
});
