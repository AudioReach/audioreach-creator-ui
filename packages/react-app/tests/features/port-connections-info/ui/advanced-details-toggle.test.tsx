/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {AdvancedDetailsToggle} from '~features/port-connections-info/ui/advanced-details-toggle';

describe('AdvancedDetailsToggle', () => {
  it('renders unchecked', () => {
    render(<AdvancedDetailsToggle checked={false} onChange={jest.fn()} />);
    expect(
      screen.getByRole('checkbox', {name: 'Advanced details'}),
    ).not.toBeChecked();
  });

  it('renders checked', () => {
    render(<AdvancedDetailsToggle checked onChange={jest.fn()} />);
    expect(
      screen.getByRole('checkbox', {name: 'Advanced details'}),
    ).toBeChecked();
  });

  it('calls onChange with the new state when toggled', () => {
    const onChange = jest.fn();
    render(<AdvancedDetailsToggle checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', {name: 'Advanced details'}));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
