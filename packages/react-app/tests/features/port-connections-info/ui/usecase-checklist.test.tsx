/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    checked,
    label,
    onCheckedChange,
  }: {
    checked: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <input
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  ),
}));

import {fireEvent, render, screen} from '@testing-library/react';

import type {UsecaseDto} from '~entities/usecases';
import {UsecaseChecklist} from '~features/port-connections-info/ui/usecase-checklist';

const makeUsecase = (systemId: string, name: string): UsecaseDto => ({
  changeInfo: {} as UsecaseDto['changeInfo'],
  keyValueCollection: [],
  systemId,
  usecaseAliasName: name,
  usecaseType: 'Regular',
});

describe('UsecaseChecklist', () => {
  const ucA = makeUsecase('uc-1', 'Usecase A');
  const ucB = makeUsecase('uc-2', 'Usecase B');
  const ucC = makeUsecase('uc-3', 'Usecase C');

  it('renders one checkbox per usecase with correct checked state', () => {
    render(
      <UsecaseChecklist
        checkedUsecases={[ucB]}
        onChange={jest.fn()}
        usecases={[ucA, ucB, ucC]}
      />,
    );

    expect(screen.getByRole('checkbox', {name: /Usecase A/})).not.toBeChecked();
    expect(screen.getByRole('checkbox', {name: /Usecase B/})).toBeChecked();
    expect(screen.getByRole('checkbox', {name: /Usecase C/})).not.toBeChecked();
  });

  it('toggling an unchecked checkbox calls onChange with it added', () => {
    const onChange = jest.fn();
    render(
      <UsecaseChecklist
        checkedUsecases={[ucB]}
        onChange={onChange}
        usecases={[ucA, ucB, ucC]}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', {name: /Usecase A/}));

    expect(onChange).toHaveBeenCalledWith([ucB, ucA]);
  });

  it('toggling a checked checkbox calls onChange with it removed', () => {
    const onChange = jest.fn();
    render(
      <UsecaseChecklist
        checkedUsecases={[ucA, ucB]}
        onChange={onChange}
        usecases={[ucA, ucB, ucC]}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', {name: /Usecase B/}));

    expect(onChange).toHaveBeenCalledWith([ucA]);
  });

  it('Select all calls onChange with every usecase in the list', () => {
    const onChange = jest.fn();
    render(
      <UsecaseChecklist
        checkedUsecases={[ucB]}
        onChange={onChange}
        usecases={[ucA, ucB, ucC]}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: /^select all$/i}));

    expect(onChange).toHaveBeenCalledWith([ucA, ucB, ucC]);
  });

  it('Deselect all calls onChange with an empty array', () => {
    const onChange = jest.fn();
    render(
      <UsecaseChecklist
        checkedUsecases={[ucA, ucB]}
        onChange={onChange}
        usecases={[ucA, ucB, ucC]}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: /deselect all/i}));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('renders nothing when usecases is empty', () => {
    const {container} = render(
      <UsecaseChecklist
        checkedUsecases={[]}
        onChange={jest.fn()}
        usecases={[]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
