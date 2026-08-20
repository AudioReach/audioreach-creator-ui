/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

jest.mock('@qualcomm-ui/react/radio', () => ({
  Radio: ({
    label,
    labelProps,
    value,
  }: {
    label: ReactNode;
    labelProps?: {className?: string};
    value: string;
  }) => (
    <label>
      <input
        data-label-class={labelProps?.className}
        type="radio"
        value={value}
      />
      {label}
    </label>
  ),
  RadioGroup: ({
    children,
    itemsProps,
    label,
    onValueChange,
  }: {
    children: ReactNode;
    itemsProps?: {className?: string};
    label: ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <fieldset
      aria-label={typeof label === 'string' ? label : undefined}
      data-items-class={itemsProps?.className}
      onChange={(event) =>
        onValueChange((event.target as HTMLInputElement).value)
      }
    >
      <legend>{label}</legend>
      {children}
    </fieldset>
  ),
}));

jest.mock('@qualcomm-ui/react/divider', () => ({
  Divider: () => <hr data-testid="appearance-divider" />,
}));

jest.mock('~shared/providers/theme-provider', () => ({
  Theme: {Dark: 'dark', Light: 'light'},
  useAppearance: jest.fn(),
}));

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {AppearanceSettings} from '~shared/controls/appearance-settings';
import {useAppearance} from '~shared/providers/theme-provider';

const mockUseAppearance = jest.mocked(useAppearance);

describe('AppearanceSettings', () => {
  const setAppearance = jest.fn();

  beforeEach(() => {
    setAppearance.mockReset();
    mockUseAppearance.mockReturnValue([
      {brand: 'qualcomm', theme: 'light'},
      setAppearance,
    ]);
  });

  it('offers each installed brand and theme mode by accessible label', () => {
    render(<AppearanceSettings />);

    expect(screen.getByLabelText('Arduino')).toBeInTheDocument();
    expect(screen.getByLabelText('Dragonfly')).toBeInTheDocument();
    expect(screen.getByLabelText('Dragonwing')).toBeInTheDocument();
    expect(screen.getByLabelText('Qualcomm')).toBeInTheDocument();
    expect(screen.getByLabelText('Snapdragon')).toBeInTheDocument();
    expect(screen.getByLabelText('Light')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark')).toBeInTheDocument();
  });

  it('lays brand choices out in three even, non-wrapping columns', () => {
    render(<AppearanceSettings />);

    expect(screen.getByLabelText('Brand')).toHaveAttribute(
      'data-items-class',
      'grid grid-cols-3 gap-x-3 gap-y-3',
    );
    expect(screen.getByLabelText('Dragonwing')).toHaveAttribute(
      'data-label-class',
      'whitespace-nowrap',
    );
  });

  it('separates the appearance sections with QUI dividers', () => {
    render(<AppearanceSettings />);

    expect(screen.getAllByTestId('appearance-divider')).toHaveLength(2);
  });

  it('preserves the other preference when a radio option is selected', async () => {
    const user = userEvent.setup();
    render(<AppearanceSettings />);

    await user.click(screen.getByLabelText('Dragonwing'));
    await user.click(screen.getByLabelText('Dark'));

    expect(setAppearance).toHaveBeenNthCalledWith(1, {
      brand: 'dragonwing',
      theme: 'light',
    });
    expect(setAppearance).toHaveBeenNthCalledWith(2, {
      brand: 'qualcomm',
      theme: 'dark',
    });
  });

  it('supports keyboard selection for brand options', async () => {
    const user = userEvent.setup();
    render(<AppearanceSettings />);

    screen.getByLabelText('Dragonfly').focus();
    await user.keyboard('[Space]');

    expect(setAppearance).toHaveBeenCalledWith({
      brand: 'dragonfly',
      theme: 'light',
    });
  });
});
