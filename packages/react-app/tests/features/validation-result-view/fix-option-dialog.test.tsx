/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {FixOptionDialog} from '~features/validation-result-view/fix-option-dialog';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, disabled, onClick}: React.ComponentProps<'button'>) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

jest.mock('@qualcomm-ui/react/dialog', () => ({
  Dialog: {
    Body: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    FloatingPortal: ({children}: {children: React.ReactNode}) => (
      <div>{children}</div>
    ),
    Footer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Heading: ({children}: {children: React.ReactNode}) => <h2>{children}</h2>,
    Root: ({children, open}: {children: React.ReactNode; open: boolean}) =>
      open ? <div>{children}</div> : null,
  },
}));

jest.mock('@qualcomm-ui/react/radio', () => {
  const React = jest.requireActual('react');
  const RadioContext = React.createContext<{
    onValueChange: (value: string) => void;
    value: string | null;
  }>({
    onValueChange: () => undefined,
    value: null,
  });

  return {
    Radio: ({
      disabled,
      label,
      value,
    }: {
      disabled?: boolean;
      label: string;
      value: string;
    }) => {
      const context = React.useContext(RadioContext);
      return (
        <label>
          <input
            aria-label={label}
            checked={context.value === value}
            disabled={disabled}
            onChange={() => context.onValueChange(value)}
            type="radio"
            value={value}
          />
          {label}
        </label>
      );
    },
    RadioGroup: {
      Items: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
      Root: ({
        children,
        onValueChange,
        value,
      }: {
        children: React.ReactNode;
        onValueChange: (value: string) => void;
        value: string | null;
      }) => (
        <RadioContext.Provider value={{onValueChange, value}}>
          {children}
        </RadioContext.Provider>
      ),
    },
  };
});

function makeResult(
  fixOptions: ValidationResult['fixOptions'],
): ValidationResult {
  return {
    errorCode: 'ARC-001',
    fixOptions,
    id: 'row-1',
    message: 'Choose a routing option',
    severity: 'error',
  };
}

describe('FixOptionDialog', () => {
  it('auto-selects a single executable option and confirms it', () => {
    const option = {
      commandPayload: {mode: 'KEEP_EXISTING'},
      commandType: 'ResolveSameGkvCollisionCommand',
      description: 'Keep existing usecase',
      id: 'collision-1-KEEP_EXISTING',
      requiredClientInputs: [],
    };
    const onConfirm = jest.fn();

    render(
      <FixOptionDialog
        isSubmitting={false}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
        open
        result={makeResult([option])}
      />,
    );

    expect(screen.getByRole('radio', {name: option.description})).toBeChecked();

    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    expect(onConfirm).toHaveBeenCalledWith(option);
  });

  it('requires selection when multiple executable options exist', () => {
    const firstOption = {
      commandPayload: {mode: 'KEEP_EXISTING'},
      commandType: 'ResolveSameGkvCollisionCommand',
      description: 'Keep existing usecase',
      id: 'collision-1-KEEP_EXISTING',
      requiredClientInputs: [],
    };
    const secondOption = {
      commandPayload: {mode: 'USE_IMPORTED'},
      commandType: 'ResolveSameGkvCollisionCommand',
      description: 'Use imported usecase',
      id: 'collision-1-USE_IMPORTED',
      requiredClientInputs: [],
    };
    const onConfirm = jest.fn();

    render(
      <FixOptionDialog
        isSubmitting={false}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
        open
        result={makeResult([firstOption, secondOption])}
      />,
    );

    expect(screen.getByRole('button', {name: 'Confirm'})).toBeDisabled();

    fireEvent.click(
      screen.getByRole('radio', {name: secondOption.description}),
    );
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    expect(onConfirm).toHaveBeenCalledWith(secondOption);
  });

  it('disables options that require client input', () => {
    const option = {
      commandPayload: {mode: 'CUSTOM'},
      commandType: 'ResolveSameGkvCollisionCommand',
      description: 'Choose custom usecase',
      id: 'collision-1-CUSTOM',
      requiredClientInputs: [
        {field: 'usecaseId', label: 'Usecase', type: 'STRING' as const},
      ],
    };

    render(
      <FixOptionDialog
        isSubmitting={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        open
        result={makeResult([option])}
      />,
    );

    expect(
      screen.getByRole('radio', {name: option.description}),
    ).toBeDisabled();
    expect(screen.getByText('Requires additional input.')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();

    render(
      <FixOptionDialog
        isSubmitting={false}
        onCancel={onCancel}
        onConfirm={jest.fn()}
        open
        result={makeResult([])}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(onCancel).toHaveBeenCalled();
  });
});
