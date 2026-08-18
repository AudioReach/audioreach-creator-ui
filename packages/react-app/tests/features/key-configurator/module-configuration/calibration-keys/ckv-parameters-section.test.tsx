/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {CkvParametersSection} from '~features/key-configurator/module-configurator-view/ui/calibration-keys/ckv-parameters-section';

// Mock @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    checked,
    disabled,
    indeterminate,
    onCheckedChange,
    size,
    title,
  }: any) => (
    <input
      ref={(input) => {
        if (input) {
          input.indeterminate = indeterminate || false;
        }
      }}
      checked={checked}
      data-indeterminate={indeterminate}
      data-size={size}
      disabled={disabled}
      onChange={(e) => {
        if (!disabled) {
          onCheckedChange(e.target.checked);
        }
      }}
      title={title}
      type="checkbox"
    />
  ),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  IconButton: ({'aria-label': ariaLabel, icon, onClick, variant}: any) => (
    <button aria-label={ariaLabel} data-variant={variant} onClick={onClick}>
      {icon}
    </button>
  ),
}));

// Mock converter utils
jest.mock('~shared/utils/converter-utils', () => ({
  ConvertNumberToHexString: (num: number) =>
    `0x${num.toString(16).toUpperCase()}`,
}));

describe('CKVParametersSection', () => {
  const mockParameters = [
    {checked: true, name: 'PARAM_ID_HW_MF_CFG', pid: 134221847},
    {checked: false, name: 'PARAM_ID_HW_EP_FRAME_SIZE', pid: 134221848},
    {checked: true, name: 'PARAM_ID_I2S_INTF_CFG', pid: 134221849},
  ];

  const mockOnParametersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with parameters', () => {
    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mockParameters}
      />,
    );

    expect(screen.getByText('Configure PIDs for CKVs')).toBeInTheDocument();
    expect(screen.getByText('PARAM_ID_HW_MF_CFG')).toBeInTheDocument();
    expect(screen.getByText('PARAM_ID_HW_EP_FRAME_SIZE')).toBeInTheDocument();
    expect(screen.getByText('PARAM_ID_I2S_INTF_CFG')).toBeInTheDocument();
  });

  it('shows correct checkbox states', () => {
    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mockParameters}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "Select All", then individual parameter checkboxes
    expect(checkboxes[1]).toBeChecked(); // PARAM_ID_HW_MF_CFG
    expect(checkboxes[2]).not.toBeChecked(); // PARAM_ID_HW_EP_FRAME_SIZE
    expect(checkboxes[3]).toBeChecked(); // PARAM_ID_I2S_INTF_CFG
  });

  it('toggles individual parameter checkbox', () => {
    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mockParameters}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const secondParamCheckbox = checkboxes[2]; // PARAM_ID_HW_EP_FRAME_SIZE

    fireEvent.click(secondParamCheckbox);

    expect(mockOnParametersChange).toHaveBeenCalledWith([
      {checked: true, name: 'PARAM_ID_HW_MF_CFG', pid: 134221847},
      {checked: true, name: 'PARAM_ID_HW_EP_FRAME_SIZE', pid: 134221848},
      {checked: true, name: 'PARAM_ID_I2S_INTF_CFG', pid: 134221849},
    ]);
  });

  it('selects all parameters when select all checkbox is clicked', () => {
    const mixedParameters = [
      {checked: true, name: 'Param1', pid: 1},
      {checked: false, name: 'Param2', pid: 2},
      {checked: false, name: 'Param3', pid: 3},
    ];

    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mixedParameters}
      />,
    );

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(mockOnParametersChange).toHaveBeenCalledWith([
      {checked: true, name: 'Param1', pid: 1},
      {checked: true, name: 'Param2', pid: 2},
      {checked: true, name: 'Param3', pid: 3},
    ]);
  });

  it('deselects all parameters when select all checkbox is clicked and all are selected', () => {
    const allSelectedParameters = [
      {checked: true, name: 'Param1', pid: 1},
      {checked: true, name: 'Param2', pid: 2},
      {checked: true, name: 'Param3', pid: 3},
    ];

    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={allSelectedParameters}
      />,
    );

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(mockOnParametersChange).toHaveBeenCalledWith([
      {checked: false, name: 'Param1', pid: 1},
      {checked: false, name: 'Param2', pid: 2},
      {checked: false, name: 'Param3', pid: 3},
    ]);
  });

  it('shows select all checkbox as checked when all parameters are checked', () => {
    const allSelectedParameters = [
      {checked: true, name: 'Param1', pid: 1},
      {checked: true, name: 'Param2', pid: 2},
    ];

    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={allSelectedParameters}
      />,
    );

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    expect(selectAllCheckbox).toBeChecked();
  });

  it('shows select all checkbox as indeterminate when some parameters are checked', () => {
    const mixedParameters = [
      {checked: true, name: 'Param1', pid: 1},
      {checked: false, name: 'Param2', pid: 2},
    ];

    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mixedParameters}
      />,
    );

    const selectAllCheckbox = screen.getAllByRole(
      'checkbox',
    )[0] as HTMLInputElement;
    expect(selectAllCheckbox.indeterminate).toBe(true);
  });

  it('collapses and expands section when toggle button is clicked', () => {
    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mockParameters}
      />,
    );

    // Initially expanded - parameters should be visible
    expect(screen.getByText('PARAM_ID_HW_MF_CFG')).toBeVisible();

    // Click toggle button to collapse
    const toggleButton = screen.getByLabelText('Toggle CKV parameters section');
    fireEvent.click(toggleButton);

    // Parameters should still be in DOM but not visible (max-h-0)
    const table = screen.getByText('PARAM_ID_HW_MF_CFG').closest('div');
    expect(table?.parentElement).toHaveClass('max-h-0');

    // Click toggle button to expand again
    fireEvent.click(toggleButton);
    expect(table?.parentElement).toHaveClass('max-h-[300px]');
  });

  it('handles empty parameters array', () => {
    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={[]}
      />,
    );

    expect(screen.getByText('Configure PIDs for CKVs')).toBeInTheDocument();
    // Should render table headers but no rows
    expect(screen.getByText('Support CKV')).toBeInTheDocument();
    expect(screen.getByText('PID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('calls onParametersChange with updated array when parameter is toggled', () => {
    render(
      <CkvParametersSection
        isEditable
        onParametersChange={mockOnParametersChange}
        parameters={mockParameters}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const firstParamCheckbox = checkboxes[1]; // PARAM_ID_HW_MF_CFG (skip select all)

    // Toggle from checked to unchecked
    fireEvent.click(firstParamCheckbox);

    expect(mockOnParametersChange).toHaveBeenCalledTimes(1);
    expect(mockOnParametersChange).toHaveBeenCalledWith([
      {checked: false, name: 'PARAM_ID_HW_MF_CFG', pid: 134221847},
      {checked: false, name: 'PARAM_ID_HW_EP_FRAME_SIZE', pid: 134221848},
      {checked: true, name: 'PARAM_ID_I2S_INTF_CFG', pid: 134221849},
    ]);
  });

  describe('when isEditable is false', () => {
    it('disables all checkboxes including select all', () => {
      render(
        <CkvParametersSection
          isEditable={false}
          onParametersChange={mockOnParametersChange}
          parameters={mockParameters}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // All checkboxes should be disabled
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('does not call onParametersChange when checkboxes are clicked', () => {
      render(
        <CkvParametersSection
          isEditable={false}
          onParametersChange={mockOnParametersChange}
          parameters={mockParameters}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // Try to click select all checkbox
      fireEvent.click(checkboxes[0]);

      // Try to click individual parameter checkbox
      fireEvent.click(checkboxes[1]);

      // onParametersChange should not have been called
      expect(mockOnParametersChange).not.toHaveBeenCalled();
    });

    it('still renders all parameters with correct states', () => {
      render(
        <CkvParametersSection
          isEditable={false}
          onParametersChange={mockOnParametersChange}
          parameters={mockParameters}
        />,
      );

      // All parameters should still be visible
      expect(screen.getByText('PARAM_ID_HW_MF_CFG')).toBeInTheDocument();
      expect(screen.getByText('PARAM_ID_HW_EP_FRAME_SIZE')).toBeInTheDocument();
      expect(screen.getByText('PARAM_ID_I2S_INTF_CFG')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      // Checkboxes should maintain their checked states
      expect(checkboxes[1]).toBeChecked(); // PARAM_ID_HW_MF_CFG
      expect(checkboxes[2]).not.toBeChecked(); // PARAM_ID_HW_EP_FRAME_SIZE
      expect(checkboxes[3]).toBeChecked(); // PARAM_ID_I2S_INTF_CFG
    });

    it('allows collapsing and expanding even when not editable', () => {
      render(
        <CkvParametersSection
          isEditable={false}
          onParametersChange={mockOnParametersChange}
          parameters={mockParameters}
        />,
      );

      // Initially expanded
      expect(screen.getByText('PARAM_ID_HW_MF_CFG')).toBeVisible();

      // Click toggle button to collapse
      const toggleButton = screen.getByLabelText(
        'Toggle CKV parameters section',
      );
      fireEvent.click(toggleButton);

      // Parameters should be collapsed
      const table = screen.getByText('PARAM_ID_HW_MF_CFG').closest('div');
      expect(table?.parentElement).toHaveClass('max-h-0');

      // Click toggle button to expand again
      fireEvent.click(toggleButton);
      expect(table?.parentElement).toHaveClass('max-h-[300px]');
    });
  });
});
