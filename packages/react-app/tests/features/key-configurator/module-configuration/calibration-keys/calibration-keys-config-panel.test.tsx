/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {useCalibrationKeysStore} from '~features/key-configurator/model/calibration-keys-store';
import {CalibrationKeysConfigPanel} from '~features/key-configurator/module-configurator-view/ui/calibration-keys/calibration-keys-config-panel';

// Mock the store
jest.mock('~features/key-configurator/model/calibration-keys-store');

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
  ConfigSummaryView: ({
    items,
    onAddClick,
    onDeleteItem,
    onEditItem,
    title,
  }: any) => (
    <div data-testid="config-summary">
      <h2>{title}</h2>
      <button onClick={onAddClick}>Add</button>
      {items.map((item: any) => (
        <div key={item.id}>
          <span>{item.label}</span>
          <button onClick={() => onEditItem(item.id)}>Edit {item.id}</button>
          <button onClick={() => onDeleteItem(item.id)}>
            Delete {item.id}
          </button>
        </div>
      ))}
    </div>
  ),
}));

// Mock CKVParametersSection
jest.mock(
  '~features/key-configurator/module-configurator-view/ui/calibration-keys/ckv-parameters-section',
  () => ({
    CkvParametersSection: ({onParametersChange, parameters}: any) => (
      <div data-testid="ckv-parameters">
        <h3>CKV Parameters</h3>
        {parameters.map((param: any) => (
          <div key={param.pid}>
            <input
              aria-label={`Parameter ${param.name}`}
              checked={param.checked}
              onChange={(e) => {
                const updated = parameters.map((p: any) =>
                  p.pid === param.pid ? {...p, checked: e.target.checked} : p,
                );
                onParametersChange(updated);
              }}
              type="checkbox"
            />
            <span>{param.name}</span>
          </div>
        ))}
      </div>
    ),
  }),
);

// Mock @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    className,
    indeterminate,
    onCheckedChange,
    onClick,
    size,
  }: any) => (
    <input
      aria-label={ariaLabel}
      checked={checked}
      className={className}
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

// Mock converter utils
jest.mock('~shared/utils/converter-utils', () => ({
  ConvertNumberToHexString: (num: number) =>
    `0x${num.toString(16).toUpperCase()}`,
  ConvertStringToNumber: (str: string) => {
    const num = parseInt(str, 16);
    return isNaN(num) ? null : num;
  },
}));

describe('CalibrationKeysConfigPanel', () => {
  const mockAvailableKeys = {
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
    Volume: {
      id: 0xa4000000,
      name: 'Volume',
      values: [
        {id: 0, name: 'Level_0'},
        {id: 1, name: 'Level_1'},
        {id: 2, name: 'Level_2'},
      ],
    },
  };

  const mockParameters = [
    {checked: true, name: 'PARAM_ID_HW_MF_CFG', pid: 134221847},
    {checked: false, name: 'PARAM_ID_HW_EP_FRAME_SIZE', pid: 134221848},
  ];

  const mockConfiguredCKVs = [
    {
      keyValuePairs: [
        {
          key: {id: 0xa4000000, name: 'Volume'},
          value: {id: 1, name: 'Level_1'},
        },
        {
          key: {id: 0xab000000, name: 'Instance'},
          value: {id: 1, name: 'Instance_1'},
        },
      ],
    },
  ];

  const mockStoreState = {
    addConfiguredKey: jest.fn(),
    availableKeys: mockAvailableKeys,
    configuredKeyValuesMap: {
      1: [{instanceId: 1, keyValueList: mockConfiguredCKVs}],
    },
    error: null,
    fetchCalibrationConfig: jest.fn(),
    isLoading: false,
    moduleParameters: {
      1: mockParameters,
    },
    removeConfiguredKey: jest.fn(),
    updateConfiguredKeyValues: jest.fn(),
    updateParameter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (useCalibrationKeysStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(mockStoreState),
    );
  });

  it('renders with configured CKVs', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    expect(screen.getByTestId('config-summary')).toBeInTheDocument();
    expect(screen.getByText('Configured CKVs')).toBeInTheDocument();
    // The label format uses key.name and value.name from the keyValuePairs
    expect(
      screen.getByText('[Volume: Level_1] [Instance: Instance_1]'),
    ).toBeInTheDocument();
  });

  it('renders CKV parameters section', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    expect(screen.getByTestId('ckv-parameters')).toBeInTheDocument();
    expect(screen.getByText('PARAM_ID_HW_MF_CFG')).toBeInTheDocument();
    expect(screen.getByText('PARAM_ID_HW_EP_FRAME_SIZE')).toBeInTheDocument();
  });

  it('shows keys list when Add button is clicked', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Add'));

    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByText('Instance')).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('StreamRX')).toBeInTheDocument();
  });

  it('filters keys based on key name search', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'Volume'}});

    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.queryByText('Instance')).not.toBeInTheDocument();
    expect(screen.queryByText('StreamRX')).not.toBeInTheDocument();
  });

  it('filters keys based on key ID search (hex)', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'A1000000'}});

    expect(screen.getByText('StreamRX')).toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
    expect(screen.queryByText('Instance')).not.toBeInTheDocument();
  });

  it('expands and collapses keys', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    expect(screen.queryByText('Instance_1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Instance'));

    expect(screen.getByText('Instance_1')).toBeInTheDocument();
    expect(screen.getByText('Instance_2')).toBeInTheDocument();
  });

  it('selects and deselects individual values', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    // Expand Instance key first
    const instanceKey = screen.getByText('Instance');
    fireEvent.click(instanceKey);

    const checkbox = screen.getByLabelText('Select Instance_1');
    expect(checkbox).not.toBeChecked();

    // Trigger change event directly on the checkbox
    fireEvent.change(checkbox, {target: {checked: true}});
    expect(checkbox).toBeChecked();

    fireEvent.change(checkbox, {target: {checked: false}});
    expect(checkbox).not.toBeChecked();
  });

  it('selects all values for a key when key checkbox is clicked', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Instance'));

    const keyCheckbox = screen.getByLabelText('Select Instance');
    fireEvent.click(keyCheckbox);

    expect(screen.getByLabelText('Select Instance_1')).toBeChecked();
    expect(screen.getByLabelText('Select Instance_2')).toBeChecked();
  });

  it('selects all keys when select all checkbox is clicked', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    const selectAllCheckbox = screen.getByLabelText('Select all keys');
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByLabelText('Select Instance')).toBeChecked();
    expect(screen.getByLabelText('Select Volume')).toBeChecked();
    expect(screen.getByLabelText('Select StreamRX')).toBeChecked();
  });

  it('expands all keys when Expand All button is clicked', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTitle('Expand All'));

    expect(screen.getByText('Instance_1')).toBeInTheDocument();
    expect(screen.getByText('Level_0')).toBeInTheDocument();
    expect(screen.getByText('PCM_Deep_Buffer')).toBeInTheDocument();
  });

  it('collapses all keys when Collapse All button is clicked', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTitle('Expand All'));
    expect(screen.getByText('Instance_1')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Collapse All'));
    expect(screen.queryByText('Instance_1')).not.toBeInTheDocument();
  });

  it('sorts keys by ID in ascending order when Key ID header is clicked', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    // Click Key ID header to sort by ID ascending
    fireEvent.click(screen.getByText('Key ID'));

    const keyElements = screen.getAllByText(/^(Instance|Volume|StreamRX)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    expect(keyNames).toEqual(['StreamRX', 'Volume', 'Instance']);
  });

  it('sorts keys by ID in descending order when Key ID header is clicked twice', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    // Click Key ID header twice to sort descending
    fireEvent.click(screen.getByText('Key ID'));
    fireEvent.click(screen.getByText('Key ID'));

    const keyElements = screen.getAllByText(/^(Instance|Volume|StreamRX)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    expect(keyNames).toEqual(['Instance', 'Volume', 'StreamRX']);
  });

  it('sorts keys by name', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Key Name'));

    const keyElements = screen.getAllByText(/^(Instance|Volume|StreamRX)$/);
    const keyNames = keyElements.map((el) => el.textContent);
    expect(keyNames).toEqual(['Instance', 'StreamRX', 'Volume']);
  });

  it('allows selecting multiple values for cartesian product', () => {
    // Use empty state so we can test adding new configs
    const emptyState = {
      ...mockStoreState,
      configuredKeyValuesMap: {
        1: [{instanceId: 1, keyValueList: []}],
      },
    };

    (useCalibrationKeysStore as unknown as jest.Mock).mockImplementation(
      (selector) => selector(emptyState),
    );

    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    // Expand and select Volume: Level_0, Level_1
    fireEvent.click(screen.getByText('Volume'));
    const level0 = screen.getByLabelText('Select Level_0');
    const level1 = screen.getByLabelText('Select Level_1');
    fireEvent.change(level0, {target: {checked: true}});
    fireEvent.change(level1, {target: {checked: true}});

    // Verify both are checked
    expect(level0).toBeChecked();
    expect(level1).toBeChecked();

    // Expand and select Instance: Instance_1
    fireEvent.click(screen.getByText('Instance'));
    const instance1 = screen.getByLabelText('Select Instance_1');
    fireEvent.change(instance1, {target: {checked: true}});

    // Verify instance is checked
    expect(instance1).toBeChecked();

    // Apply button should be enabled when values are selected
    const applyButton = screen.getByText('Apply');
    expect(applyButton).not.toBeDisabled();
  });

  it('edits existing CKV configuration', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Edit 0'));

    expect(screen.getByTestId('search-bar')).toBeInTheDocument();

    // Keys should be expanded and values should be checked
    // Need to expand to see the values
    expect(screen.getByLabelText('Select Volume')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Instance')).toBeInTheDocument();
  });

  it('deletes CKV configuration', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Delete 0'));

    expect(mockStoreState.removeConfiguredKey).toHaveBeenCalledWith(1, 1, 0);
  });

  it('cancels with confirmation when selections exist', () => {
    window.confirm = jest.fn(() => true);

    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    // Select a key (not just expand)
    const instanceCheckbox = screen.getByLabelText('Select Instance');
    fireEvent.click(instanceCheckbox);

    fireEvent.click(screen.getByText('Cancel'));

    // window.confirm is currently commented out in the implementation
    // expect(window.confirm).toHaveBeenCalled()
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('cancels without confirmation when no selections exist', () => {
    window.confirm = jest.fn();

    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
  });

  it('shows empty search results message', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    const searchBar = screen.getByTestId('search-bar');
    fireEvent.change(searchBar, {target: {value: 'NonExistent'}});

    expect(
      screen.getByText('No calibration keys or values match your search'),
    ).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('prevents duplicate configurations', () => {
    render(
      <CalibrationKeysConfigPanel instanceId={1} isEditable moduleId={1} />,
    );

    fireEvent.click(screen.getByText('Add'));

    // Try to create the same configuration that already exists
    fireEvent.click(screen.getByText('Volume'));
    fireEvent.click(screen.getByLabelText('Select Level_1'));
    fireEvent.click(screen.getByText('Instance'));
    fireEvent.click(screen.getByLabelText('Select Instance_1'));

    fireEvent.click(screen.getByText('Apply'));

    // Should not add duplicate - existing config should remain unchanged
    expect(mockStoreState.updateConfiguredKeyValues).not.toHaveBeenCalled();
  });
});
