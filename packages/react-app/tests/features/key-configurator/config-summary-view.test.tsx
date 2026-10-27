/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {ConfigSummaryView} from '~features/key-configurator/config-summary-view';

// Mock @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({
    children,
    className,
    disabled,
    emphasis,
    onClick,
    onMouseEnter,
    onMouseLeave,
    size,
    startIcon: _startIcon,
    title,
    variant,
  }: any) => (
    <button
      className={className}
      data-emphasis={emphasis}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
    onMouseEnter,
    onMouseLeave,
    style,
    title,
    variant,
  }: any) => (
    <button
      aria-label={ariaLabel}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
      title={title}
    >
      {icon}
    </button>
  ),
}));

// Mock ArcSearchBar
jest.mock('~shared/controls/arc-search-bar', () => ({
  __esModule: true,
  default: ({onSearchChange, placeholder, searchTerm}: any) => (
    <input
      data-testid="search-bar"
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={placeholder}
      value={searchTerm}
    />
  ),
}));

// Mock converter utils
jest.mock('~shared/utils/converter-utils', () => ({
  ConvertNumberToHexString: (num: number) =>
    `0x${num.toString(16).toUpperCase()}`,
  ConvertStringToNumber: (str: string) => {
    const num = parseInt(str, 16);
    return isNaN(num) ? null : num;
  },
}));

describe('ConfigSummaryView', () => {
  const mockItems = [
    {id: 1, label: '[StreamRx]'},
    {id: 2, label: '[VSID]'},
    {id: 3, label: '[Instance]'},
  ];

  const baseProps = {
    isEditable: true,
    items: mockItems,
    title: 'Configured Keys',
  };

  it('renders a copy icon per row when onCopyEntry is provided', () => {
    const onCopyEntry = jest.fn();
    render(<ConfigSummaryView {...baseProps} onCopyEntry={onCopyEntry} />);

    fireEvent.click(screen.getAllByRole('button', {name: /copy/i})[0]);

    expect(onCopyEntry).toHaveBeenCalledWith(0);
  });

  it('applies a highlight class to the highlighted row only', () => {
    render(<ConfigSummaryView {...baseProps} highlightedEntryIndex={1} />);

    const rows = screen.getAllByTestId('config-summary-row');

    expect(rows[1]).toHaveClass('bg-[var(--color-background-neutral-02)]');
    expect(rows[0]).not.toHaveClass('bg-[var(--color-background-neutral-02)]');
  });

  it('renders unchanged when neither prop is passed (Subsystem panel usage)', () => {
    render(<ConfigSummaryView {...baseProps} />);

    expect(
      screen.queryByRole('button', {name: /copy/i}),
    ).not.toBeInTheDocument();
  });

  it('disables rather than hides the Add button when isActionsDisabled is true', () => {
    const onAddClick = jest.fn();
    render(
      <ConfigSummaryView
        {...baseProps}
        isActionsDisabled
        onAddClick={onAddClick}
      />,
    );

    const addButton = screen.getByRole('button', {name: 'Add'});
    expect(addButton).toBeDisabled();
  });

  it('disables rather than hides Edit/Delete icons when isActionsDisabled is true', () => {
    render(
      <ConfigSummaryView
        {...baseProps}
        isActionsDisabled
        onDeleteItem={jest.fn()}
        onEditItem={jest.fn()}
        showEditIcon
      />,
    );

    expect(screen.getAllByLabelText('Edit')[0]).toBeDisabled();
    expect(screen.getAllByLabelText('Delete')[0]).toBeDisabled();
  });

  it('renders the Copy icon after the label so it sits at the row end', () => {
    render(<ConfigSummaryView {...baseProps} onCopyEntry={jest.fn()} />);

    const row = screen.getAllByTestId('config-summary-row')[0];
    const label = screen.getByText('[StreamRx]');
    const copyButton = screen.getAllByRole('button', {name: /copy/i})[0];
    const children = Array.from(row.children);

    expect(children.indexOf(label)).toBeLessThan(children.indexOf(copyButton));
  });
});
