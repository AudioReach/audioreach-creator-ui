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

  const defaultProps = {
    isEditable: true,
    items: mockItems,
    title: 'Configured Keys',
  };

  it('renders with title and items', () => {
    render(<ConfigSummaryView {...defaultProps} />);

    expect(screen.getByText('Configured Keys')).toBeInTheDocument();
    expect(screen.getByText('[StreamRx]')).toBeInTheDocument();
    expect(screen.getByText('[VSID]')).toBeInTheDocument();
    expect(screen.getByText('[Instance]')).toBeInTheDocument();
  });

  it('shows "No keys configured" when items array is empty', () => {
    render(<ConfigSummaryView {...defaultProps} items={[]} />);

    expect(screen.getByText('No keys configured')).toBeInTheDocument();
  });

  it('toggles collapse/expand when chevron button is clicked', () => {
    render(<ConfigSummaryView {...defaultProps} />);

    const toggleButton = screen.getByLabelText(
      'Toggle Configured Keys section',
    );

    // Initially expanded - items should be visible
    expect(screen.getByText('[StreamRx]')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);

    // Items should still be in DOM but hidden via CSS
    const listContainer = screen.getByText('[StreamRx]').closest('div');
    expect(listContainer?.parentElement).toHaveClass('max-h-0');
  });

  it('calls onAddClick when Add button is clicked', () => {
    const onAddClick = jest.fn();
    render(<ConfigSummaryView {...defaultProps} onAddClick={onAddClick} />);

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    expect(onAddClick).toHaveBeenCalledTimes(1);
  });

  it('calls onDeleteItem when delete button is clicked', () => {
    const onDeleteItem = jest.fn();
    render(<ConfigSummaryView {...defaultProps} onDeleteItem={onDeleteItem} />);

    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(onDeleteItem).toHaveBeenCalledWith(1);
  });

  it('calls onEditItem when edit button is clicked and showEditIcon is true', () => {
    const onEditItem = jest.fn();
    render(
      <ConfigSummaryView
        {...defaultProps}
        onEditItem={onEditItem}
        showEditIcon
      />,
    );

    const editButtons = screen.getAllByLabelText('Edit');
    fireEvent.click(editButtons[0]);

    expect(onEditItem).toHaveBeenCalledWith(1);
  });

  it('does not show edit buttons when showEditIcon is false', () => {
    const onEditItem = jest.fn();
    render(
      <ConfigSummaryView
        {...defaultProps}
        onEditItem={onEditItem}
        showEditIcon={false}
      />,
    );

    const editButtons = screen.queryAllByLabelText('Edit');
    expect(editButtons).toHaveLength(0);
  });

  it('shows search bar only when there are items', () => {
    const {rerender} = render(
      <ConfigSummaryView {...defaultProps} items={[]} />,
    );

    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    rerender(<ConfigSummaryView {...defaultProps} items={mockItems} />);

    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('filters items based on search term', () => {
    render(<ConfigSummaryView {...defaultProps} />);

    const searchBar = screen.getByTestId('search-bar');

    // Search for "VSID"
    fireEvent.change(searchBar, {target: {value: 'VSID'}});

    expect(screen.getByText('[VSID]')).toBeInTheDocument();
    expect(screen.queryByText('[StreamRx]')).not.toBeInTheDocument();
    expect(screen.queryByText('[Instance]')).not.toBeInTheDocument();
  });

  it('shows "No keys match your search" when search has no results', () => {
    render(<ConfigSummaryView {...defaultProps} />);

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'NonExistent'}});

    expect(screen.getByText('No keys match your search')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('shows Delete filtered button when search has results', () => {
    const onDeleteItem = jest.fn();
    render(<ConfigSummaryView {...defaultProps} onDeleteItem={onDeleteItem} />);

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'VSID'}});

    const deleteFilteredButton = screen.getByText(/Delete \(1\)/);
    expect(deleteFilteredButton).toBeInTheDocument();

    fireEvent.click(deleteFilteredButton);
    expect(onDeleteItem).toHaveBeenCalledWith(2); // VSID has id 2
  });

  it('clears search term when Add button is clicked', () => {
    const onAddClick = jest.fn();
    render(<ConfigSummaryView {...defaultProps} onAddClick={onAddClick} />);

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'test'}});

    expect(searchBar).toHaveValue('test');

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    expect(searchBar).toHaveValue('');
  });

  it('filters by ID when search term is a hex number', () => {
    const items = [
      {id: 0xa1000000, label: '[StreamRx]'},
      {id: 0xb3000000, label: '[VSID]'},
    ];

    render(<ConfigSummaryView {...defaultProps} items={items} />);

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'A1000000'}});

    expect(screen.getByText('[StreamRx]')).toBeInTheDocument();
    expect(screen.queryByText('[VSID]')).not.toBeInTheDocument();
  });
});
