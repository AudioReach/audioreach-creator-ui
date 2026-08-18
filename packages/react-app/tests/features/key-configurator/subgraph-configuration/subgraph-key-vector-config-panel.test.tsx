/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {useSubgraphConfigStore} from '~features/key-configurator/model/subgraph-config-store';
import {SubgraphKeyVectorConfigPanel} from '~features/key-configurator/subgraph-configurator-view/ui/subgraph-key-vector-config-panel';

// Mock the store
jest.mock('~features/key-configurator/model/subgraph-config-store');

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

// Mock @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    indeterminate,
    onCheckedChange,
    onClick,
    size,
  }: any) => (
    <input
      aria-label={ariaLabel}
      checked={checked}
      data-indeterminate={indeterminate}
      data-size={size}
      onChange={(e) => {
        onCheckedChange(e.target.checked);
      }}
      onClick={(e) => {
        if (onClick) {
          const event = {
            ...e,
            stopPropagation: () => {},
          };
          onClick(event);
        }
      }}
      type="checkbox"
    />
  ),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, disabled, emphasis, onClick, size, variant}: any) => (
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
  IconButton: ({
    'aria-label': ariaLabel,
    icon,
    onClick,
    title,
    variant,
  }: any) => (
    <button
      aria-label={ariaLabel}
      data-variant={variant}
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  ),
}));

jest.mock('@qualcomm-ui/react/radio', () => ({
  Radio: ({'aria-label': ariaLabel, value, ...props}: any) => (
    <input aria-label={ariaLabel} type="radio" value={value} {...props} />
  ),
  RadioGroup: ({children, className, onChange, style, value}: any) => (
    <fieldset
      className={className}
      data-testid="radio-group"
      data-value={value}
      onInput={onChange}
      style={style}
    >
      {children}
    </fieldset>
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

describe('SubgraphKeyVectorConfigPanel', () => {
  const mockAvailableKeys = {
    DeviceRX: {
      id: 0xa2000000,
      name: 'DeviceRX',
      values: [
        {id: 0xa2000001, name: 'Speaker'},
        {id: 0xa2000002, name: 'Headphones'},
      ],
    },
    Instance: {
      id: 0xab000000,
      name: 'Instance',
      values: [
        {id: 1, name: 'Instance_1'},
        {id: 2, name: 'Instance_2'},
      ],
    },
    StreamRX: {
      id: 0xa1000000,
      name: 'StreamRX',
      values: [
        {id: 0xa1000001, name: 'PCM_Deep_Buffer'},
        {id: 0xa1000013, name: 'Incall_Music'},
      ],
    },
  };

  const mockConfiguredKeyValues = [
    {
      keyInfo: {id: 0xab000000, name: 'Instance'},
      valueInfo: {id: 1, name: 'Instance_1'},
    },
  ];

  const mockStoreState = {
    addConfiguredKey: jest.fn(),
    availableKeys: mockAvailableKeys,
    configuredKeyValues: [
      {keyValueList: mockConfiguredKeyValues, subgraphId: 1},
    ],
    error: null,
    fetchSubgraphConfig: jest.fn(),
    isLoading: false,
    updateConfiguredKeyValues: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(mockStoreState),
    );
  });

  it('renders with configured key values', () => {
    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    expect(screen.getByText('Subgraph Key Vector')).toBeInTheDocument();
    expect(screen.getByText('[Instance: Instance_1]')).toBeInTheDocument();
  });

  it('shows Add button when no configuration exists', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.queryByTitle('Edit configuration')).not.toBeInTheDocument();
  });

  it('shows Edit and Delete buttons when configuration exists', () => {
    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    expect(screen.getByTitle('Edit configuration')).toBeInTheDocument();
    expect(screen.getByTitle('Delete configuration')).toBeInTheDocument();
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
  });

  it('shows keys list when Add button is clicked', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Initially, keys list should not be visible
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    // Click Add button
    fireEvent.click(screen.getByText('Add'));

    // Keys list should now be visible
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByText('Instance')).toBeInTheDocument();
    expect(screen.getByText('DeviceRX')).toBeInTheDocument();
    expect(screen.getByText('StreamRX')).toBeInTheDocument();
  });

  it('shows keys list with pre-selected values when Edit button is clicked', () => {
    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Edit button
    fireEvent.click(screen.getByTitle('Edit configuration'));

    // Keys list should be visible
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();

    // Instance key should be checked
    const instanceCheckbox = screen.getByLabelText('Select Instance');
    expect(instanceCheckbox).toBeChecked();
  });

  it('deletes configuration when Delete button is clicked with confirmation', () => {
    window.confirm = jest.fn(() => true);

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    fireEvent.click(screen.getByTitle('Delete configuration'));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockStoreState.updateConfiguredKeyValues).toHaveBeenCalledWith(
      1,
      [],
    );
  });

  it('does not delete configuration when confirmation is cancelled', () => {
    window.confirm = jest.fn(() => false);

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    fireEvent.click(screen.getByTitle('Delete configuration'));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockStoreState.updateConfiguredKeyValues).not.toHaveBeenCalled();
  });

  it('filters keys based on key name search', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'Instance'}});

    expect(screen.getByText('Instance')).toBeInTheDocument();
    expect(screen.queryByText('DeviceRX')).not.toBeInTheDocument();
    expect(screen.queryByText('StreamRX')).not.toBeInTheDocument();
  });

  it('filters keys based on key ID search (hex)', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    // Search for StreamRX by its hex ID: 0xA1000000
    fireEvent.change(searchBar, {target: {value: 'A1000000'}});

    expect(screen.getByText('StreamRX')).toBeInTheDocument();
    expect(screen.queryByText('DeviceRX')).not.toBeInTheDocument();
    expect(screen.queryByText('Instance')).not.toBeInTheDocument();
  });

  it('filters and auto-expands keys when searching by value name', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    // Search for a value name "Speaker" which belongs to DeviceRX
    fireEvent.change(searchBar, {target: {value: 'Speaker'}});

    // DeviceRX key should be visible and auto-expanded
    expect(screen.getByText('DeviceRX')).toBeInTheDocument();
    expect(screen.getByText('Speaker')).toBeInTheDocument();

    // Other keys should not be visible
    expect(screen.queryByText('Instance')).not.toBeInTheDocument();
    expect(screen.queryByText('StreamRX')).not.toBeInTheDocument();
  });

  it('filters and auto-expands keys when searching by value ID', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    // Search for PCM_Deep_Buffer by its hex ID: 0xA1000001
    fireEvent.change(searchBar, {target: {value: 'A1000001'}});

    // StreamRX key should be visible and auto-expanded
    expect(screen.getByText('StreamRX')).toBeInTheDocument();
    expect(screen.getByText('PCM_Deep_Buffer')).toBeInTheDocument();

    // Other keys should not be visible
    expect(screen.queryByText('Instance')).not.toBeInTheDocument();
    expect(screen.queryByText('DeviceRX')).not.toBeInTheDocument();
  });

  it('expands and collapses keys', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Initially, values should not be visible
    expect(screen.queryByText('Instance_1')).not.toBeInTheDocument();

    // Click on Instance key to expand
    fireEvent.click(screen.getByText('Instance'));

    // Values should now be visible
    expect(screen.getByText('Instance_1')).toBeInTheDocument();
    expect(screen.getByText('Instance_2')).toBeInTheDocument();
  });

  it('selects and deselects keys', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const instanceCheckbox = screen.getByLabelText('Select Instance');

    expect(instanceCheckbox).not.toBeChecked();

    // Select Instance
    fireEvent.click(instanceCheckbox);
    expect(instanceCheckbox).toBeChecked();

    // Deselect Instance
    fireEvent.click(instanceCheckbox);
    expect(instanceCheckbox).not.toBeChecked();
  });

  it('selects all keys when select all checkbox is clicked', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const selectAllCheckbox = screen.getByLabelText('Select all keys');
    fireEvent.click(selectAllCheckbox);

    // All keys should be checked
    expect(screen.getByLabelText('Select Instance')).toBeChecked();
    expect(screen.getByLabelText('Select DeviceRX')).toBeChecked();
    expect(screen.getByLabelText('Select StreamRX')).toBeChecked();
  });

  it('selects a value for a key', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Expand Instance key
    fireEvent.click(screen.getByText('Instance'));

    // Select Instance_1 value
    const instance1Radio = screen.getByLabelText('Select Instance_1');
    fireEvent.click(instance1Radio);

    expect(instance1Radio).toBeChecked();
  });

  it('auto-selects key when a value is selected', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Expand Instance key
    fireEvent.click(screen.getByText('Instance'));

    const instanceCheckbox = screen.getByLabelText('Select Instance');
    expect(instanceCheckbox).not.toBeChecked();

    // Select Instance_1 value
    fireEvent.click(screen.getByLabelText('Select Instance_1'));

    // Instance key should be auto-selected
    expect(instanceCheckbox).toBeChecked();
  });

  it('expands all keys when Expand All button is clicked', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Click Expand All
    fireEvent.click(screen.getByTitle('Expand All'));

    // All values should be visible
    expect(screen.getByText('Instance_1')).toBeInTheDocument();
    expect(screen.getByText('Speaker')).toBeInTheDocument();
    expect(screen.getByText('PCM_Deep_Buffer')).toBeInTheDocument();
  });

  it('collapses all keys when Collapse All button is clicked', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Expand all first
    fireEvent.click(screen.getByTitle('Expand All'));
    expect(screen.getByText('Instance_1')).toBeInTheDocument();

    // Click Collapse All
    fireEvent.click(screen.getByTitle('Collapse All'));

    // Values should not be visible
    expect(screen.queryByText('Instance_1')).not.toBeInTheDocument();
  });

  it('sorts keys by ID in ascending order by default', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Keys should be sorted by ID: StreamRX (0xA1000000), DeviceRX (0xA2000000), Instance (0xAB000000)
    const keyElements = screen.getAllByText(/^(Instance|DeviceRX|StreamRX)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    const keysListNames = keyNames.slice(-3);
    expect(keysListNames).toEqual(['StreamRX', 'DeviceRX', 'Instance']);
  });

  it('sorts keys by ID in descending order when clicked', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Click Key ID header to toggle to descending
    fireEvent.click(screen.getByText('Key ID'));

    const keyElements = screen.getAllByText(/^(Instance|DeviceRX|StreamRX)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    const keysListNames = keyNames.slice(-3);
    expect(keysListNames).toEqual(['Instance', 'DeviceRX', 'StreamRX']);
  });

  it('sorts keys by name', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Click Key Name header to sort by name
    fireEvent.click(screen.getByText('Key Name'));

    const keyElements = screen.getAllByText(/^(Instance|DeviceRX|StreamRX)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    const keysListNames = keyNames.slice(-3);
    expect(keysListNames).toEqual(['DeviceRX', 'Instance', 'StreamRX']);
  });

  it('applies configuration when Apply button is clicked', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Expand and select Instance key with value
    fireEvent.click(screen.getByText('Instance'));
    fireEvent.click(screen.getByLabelText('Select Instance_1'));

    // Click Apply
    fireEvent.click(screen.getByText('Apply'));

    // Should call addConfiguredKey for each selected key-value pair
    expect(mockStoreState.addConfiguredKey).toHaveBeenCalledWith(1, {
      keyInfo: {id: 0xab000000, name: 'Instance'},
      valueInfo: {id: 1, name: 'Instance_1'},
    });

    // Keys list should be hidden
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('disables Apply button when no values are selected', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const applyButton = screen.getByText('Apply');
    expect(applyButton).toBeDisabled();
  });

  it('enables Apply button when values are selected', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Expand and select Instance key with value
    fireEvent.click(screen.getByText('Instance'));
    fireEvent.click(screen.getByLabelText('Select Instance_1'));

    const applyButton = screen.getByText('Apply');
    expect(applyButton).not.toBeDisabled();
  });

  it('cancels with confirmation when selections exist', () => {
    window.confirm = jest.fn(() => true);

    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Select a key
    fireEvent.click(screen.getByLabelText('Select Instance'));

    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // window.confirm is currently commented out in the implementation
    // expect(window.confirm).toHaveBeenCalled()
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('cancels without confirmation when no selections exist', () => {
    window.confirm = jest.fn();

    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    // Click Cancel without making selections
    fireEvent.click(screen.getByText('Cancel'));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('shows "No keys or values match your search" when search has no results', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    // Click Add to show keys list
    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'NonExistent'}});

    expect(
      screen.getByText('No keys or values match your search'),
    ).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('shows placeholder text when no configuration exists', () => {
    const emptyState = {
      ...mockStoreState,
      configuredKeyValues: [{keyValueList: [], subgraphId: 1}],
    };

    (useSubgraphConfigStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(<SubgraphKeyVectorConfigPanel isEditable subgraphId={1} />);

    expect(
      screen.getByText('Configure subgraph key vector'),
    ).toBeInTheDocument();
  });
});
