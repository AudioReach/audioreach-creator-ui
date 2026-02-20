/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {useSubsystemConfigStore} from '~features/key-configurator/model/subsystem-config-store';
import {SubsystemConfigPanel} from '~features/key-configurator/subsystem-configurator-view/ui/subsystem-config-panel';

// Mock the store
jest.mock('~features/key-configurator/model/subsystem-config-store');

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

// Mock ConfigSummaryView
jest.mock('~features/key-configurator/config-summary-view', () => ({
  ConfigSummaryView: ({items, onAddClick, onDeleteItem, title}: any) => (
    <div data-testid="config-summary">
      <h2>{title}</h2>
      <button onClick={onAddClick}>Add</button>
      {items.map((item: any) => (
        <div key={item.id}>
          <span>{item.label}</span>
          <button onClick={() => onDeleteItem(item.id)}>
            Delete {item.id}
          </button>
        </div>
      ))}
    </div>
  ),
}));

// Mock @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    indeterminate,
    onChange,
    size,
  }: any) => (
    <input
      aria-label={ariaLabel}
      checked={checked}
      data-indeterminate={indeterminate}
      data-size={size}
      onChange={(e) => onChange({target: {checked: e.target.checked}})}
      type="checkbox"
    />
  ),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({
    children,
    disabled,
    emphasis,
    onClick,
    size,
    startIcon: _startIcon,
    variant,
  }: any) => (
    <button
      data-emphasis={emphasis}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
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

describe('SubsystemConfigPanel', () => {
  const mockAvailableKeys = [
    {id: 0xa1000000, name: 'StreamRx'},
    {id: 0xb1000000, name: 'StreamTx'},
    {id: 0xa2000000, name: 'DeviceRx'},
  ];

  const mockConfiguredKeys = [{id: 0xa1000000, name: 'StreamRx'}];

  const mockStoreState = {
    addConfiguredKey: jest.fn(),
    availableKeys: mockAvailableKeys,
    configuredKeys: [{keys: mockConfiguredKeys, subsystemId: 1}],
    error: null,
    fetchSubsystemConfig: jest.fn(),
    isLoading: false,
    removeConfiguredKey: jest.fn(),
    updateConfiguredKeys: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSubsystemConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(mockStoreState),
    );
  });

  it('renders ConfigSummaryView with configured keys', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    expect(screen.getByTestId('config-summary')).toBeInTheDocument();
    expect(screen.getByText('Configured Keys')).toBeInTheDocument();
    expect(screen.getByText('[StreamRx]')).toBeInTheDocument();
  });

  it('fetches subsystem config on mount', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    expect(mockStoreState.fetchSubsystemConfig).toHaveBeenCalledWith(1);
  });

  it('shows keys list when Add button is clicked', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Initially, keys list should not be visible
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    // Click Add button
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // Keys list should now be visible
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByText('StreamRx')).toBeInTheDocument();
    expect(screen.getByText('StreamTx')).toBeInTheDocument();
    expect(screen.getByText('DeviceRx')).toBeInTheDocument();
  });

  it('filters keys based on key name search', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'StreamRx'}});

    expect(screen.getByText('StreamRx')).toBeInTheDocument();
    expect(screen.queryByText('StreamTx')).not.toBeInTheDocument();
    expect(screen.queryByText('DeviceRx')).not.toBeInTheDocument();
  });

  it('filters keys based on key ID search (hex)', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    // Search for StreamRx by its hex ID: 0xA1000000
    fireEvent.change(searchBar, {target: {value: 'A1000000'}});

    expect(screen.getByText('StreamRx')).toBeInTheDocument();
    expect(screen.queryByText('StreamTx')).not.toBeInTheDocument();
    expect(screen.queryByText('DeviceRx')).not.toBeInTheDocument();
  });

  it('filters keys with partial name match', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    // Search for "Stream" - should match both StreamRx and StreamTx
    fireEvent.change(searchBar, {target: {value: 'Stream'}});

    expect(screen.getByText('StreamRx')).toBeInTheDocument();
    expect(screen.getByText('StreamTx')).toBeInTheDocument();
    expect(screen.queryByText('DeviceRx')).not.toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    // Search with lowercase
    fireEvent.change(searchBar, {target: {value: 'streamrx'}});

    expect(screen.getByText('StreamRx')).toBeInTheDocument();
    expect(screen.queryByText('StreamTx')).not.toBeInTheDocument();
    expect(screen.queryByText('DeviceRx')).not.toBeInTheDocument();
  });

  it('selects and deselects keys', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Find checkbox for StreamTx
    const checkboxes = screen.getAllByRole('checkbox');
    const streamTxCheckbox = checkboxes.find(
      (cb) => cb.getAttribute('aria-label') === 'Select StreamTx',
    );

    expect(streamTxCheckbox).not.toBeChecked();

    // Select StreamTx
    fireEvent.click(streamTxCheckbox!);
    expect(streamTxCheckbox).toBeChecked();

    // Deselect StreamTx
    fireEvent.click(streamTxCheckbox!);
    expect(streamTxCheckbox).not.toBeChecked();
  });

  it('selects all keys when select all checkbox is clicked', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const selectAllCheckbox = screen.getByLabelText('Select all keys');
    fireEvent.click(selectAllCheckbox);

    // All individual checkboxes should be checked
    const streamRxCheckbox = screen.getByLabelText('Select StreamRx');
    const streamTxCheckbox = screen.getByLabelText('Select StreamTx');
    const deviceRxCheckbox = screen.getByLabelText('Select DeviceRx');

    expect(streamRxCheckbox).toBeChecked();
    expect(streamTxCheckbox).toBeChecked();
    expect(deviceRxCheckbox).toBeChecked();
  });

  it('applies selected keys when Apply button is clicked', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Select StreamTx
    const streamTxCheckbox = screen.getByLabelText('Select StreamTx');
    fireEvent.click(streamTxCheckbox);

    // Click Apply
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    // Should call addConfiguredKey for StreamTx
    expect(mockStoreState.addConfiguredKey).toHaveBeenCalledWith(1, {
      id: 0xb1000000,
      name: 'StreamTx',
    });

    // Keys list should be hidden
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('does not add duplicate keys', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Try to select StreamRx (already configured)
    const streamRxCheckbox = screen.getByLabelText('Select StreamRx');
    fireEvent.click(streamRxCheckbox);

    // Click Apply
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    // Should not call addConfiguredKey for StreamRx since it's already configured
    expect(mockStoreState.addConfiguredKey).not.toHaveBeenCalledWith(1, {
      id: 0xa1000000,
      name: 'StreamRx',
    });
  });

  it('cancels key selection when Cancel button is clicked', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Select a key
    const streamTxCheckbox = screen.getByLabelText('Select StreamTx');
    fireEvent.click(streamTxCheckbox);

    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true);

    // Click Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // window.confirm is currently commented out in the implementation
    // expect(window.confirm).toHaveBeenCalled()

    // Keys list should be hidden
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('sorts keys by ID in ascending order', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Keys should be sorted by ID in ascending order by default
    // StreamRx: 0xa1000000, DeviceRx: 0xa2000000, StreamTx: 0xb1000000
    // Get only the key names from the keys list (not from ConfigSummaryView)
    const keyElements = screen.getAllByText(/^(StreamRx|StreamTx|DeviceRx)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    // Filter out the one from ConfigSummaryView by checking we have exactly 3
    const keysListNames = keyNames.slice(-3); // Get last 3 which are from the keys list
    expect(keysListNames).toEqual(['StreamRx', 'DeviceRx', 'StreamTx']);
  });

  it('sorts keys by ID in descending order', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Click on Key ID header to toggle to descending
    const keyIdHeader = screen.getByText('Key ID');
    fireEvent.click(keyIdHeader);

    // Keys should be sorted by ID in descending order
    // StreamTx: 0xb1000000, DeviceRx: 0xa2000000, StreamRx: 0xa1000000
    const keyElements = screen.getAllByText(/^(StreamRx|StreamTx|DeviceRx)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    const keysListNames = keyNames.slice(-3); // Get last 3 which are from the keys list
    expect(keysListNames).toEqual(['StreamTx', 'DeviceRx', 'StreamRx']);
  });

  it('sorts keys by name', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Click on Key Name header to sort by name
    const keyNameHeader = screen.getByText('Key Name');
    fireEvent.click(keyNameHeader);

    // Keys should be sorted by name alphabetically
    const keyElements = screen.getAllByText(/^(StreamRx|StreamTx|DeviceRx)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    const keysListNames = keyNames.slice(-3); // Get last 3 which are from the keys list
    expect(keysListNames).toEqual(['DeviceRx', 'StreamRx', 'StreamTx']);
  });

  it('removes configured key when delete is clicked', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click delete button for StreamRx
    const deleteButton = screen.getByText(`Delete ${0xa1000000}`);
    fireEvent.click(deleteButton);

    expect(mockStoreState.removeConfiguredKey).toHaveBeenCalledWith(
      1,
      0xa1000000,
    );
  });

  it('disables Apply button when no keys are selected', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const applyButton = screen.getByText('Apply');
    expect(applyButton).toBeDisabled();
  });

  it('enables Apply button when keys are selected', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Select a key
    const streamTxCheckbox = screen.getByLabelText('Select StreamTx');
    fireEvent.click(streamTxCheckbox);

    const applyButton = screen.getByText('Apply');
    expect(applyButton).not.toBeDisabled();
  });

  it('shows "No keys match your search" when search has no results', () => {
    render(<SubsystemConfigPanel isEditable subsystemId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'NonExistent'}});

    expect(screen.getByText('No keys match your search')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });
});
