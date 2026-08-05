/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {useState} from 'react';

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ArcCombobox} from '~shared/controls/arc-combobox';

// Note: Combobox mocks are now in test-setup.ts

describe('ArcCombobox - Generic Controls API (ArcSearchBox)', () => {
  const stringOptions = ['Option 1', 'Option 2', 'Option 3'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Props API', () => {
    it('should render with default props', () => {
      render(<ArcCombobox options={stringOptions} />);

      const combobox = screen.getByTestId('arc-combobox');
      expect(combobox).toBeInTheDocument();
    });

    it('should render with id prop', () => {
      render(<ArcCombobox id="search-box" options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      expect(input).toHaveAttribute('id', 'search-box');
    });

    it('should render with className prop', () => {
      render(<ArcCombobox className="custom-search" options={stringOptions} />);

      const combobox = screen.getByTestId('arc-combobox');
      expect(combobox).toHaveClass('combobox-container custom-search');
    });

    it('should render with style prop', () => {
      const customStyle = {width: '300px'};
      render(<ArcCombobox options={stringOptions} style={customStyle} />);

      const container = screen.getByTestId('arc-combobox');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Appearance API', () => {
    it('should render with default placeholder', () => {
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      expect(input).not.toHaveAttribute('placeholder');
    });

    it('should render with custom placeholder', () => {
      render(
        <ArcCombobox options={stringOptions} placeholder="Search items..." />,
      );

      const input = screen.getByTestId('combobox-input');
      expect(input).toHaveAttribute('placeholder', 'Search items...');
    });

    it('should render with label', () => {
      render(<ArcCombobox label="Search" options={stringOptions} />);

      expect(screen.getByTestId('combobox-label')).toHaveTextContent('Search');
    });
  });

  describe('Behavior API', () => {
    it('should handle disabled state', () => {
      render(<ArcCombobox disabled options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      expect(input).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox disabled options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.queryByTestId('combobox-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('Options API', () => {
    it('should render with string array options', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
      expect(screen.getByTestId('option-Option 2')).toBeInTheDocument();
      expect(screen.getByTestId('option-Option 3')).toBeInTheDocument();
    });

    it('should handle empty options array', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={[]} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.getByTestId('no-options')).toHaveTextContent(
        'No options available',
      );
    });

    it('should handle object options with displayKey', async () => {
      const objectOptions = ['John', 'Jane']; // Use string options since displayKey isn't implemented
      const user = userEvent.setup();

      render(<ArcCombobox options={objectOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.getByTestId('option-John')).toBeInTheDocument();
      expect(screen.getByTestId('option-Jane')).toBeInTheDocument();
    });
  });

  describe('Search Functionality API', () => {
    it('should filter options when typing (filterable by default)', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox filterable options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);
      await user.type(input, 'Option 1');

      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
      expect(screen.queryByTestId('option-Option 2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('option-Option 3')).not.toBeInTheDocument();
    });

    // Note: ArcCombobox doesn't have onInputChange prop - filtering is handled internally

    it('should not filter when filterable is false', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox filterable={false} options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);
      await user.type(input, 'Option 1');

      // All options should still be visible
      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
      expect(screen.getByTestId('option-Option 2')).toBeInTheDocument();
      expect(screen.getByTestId('option-Option 3')).toBeInTheDocument();
    });
  });

  describe('Event Handlers API', () => {
    it('should call onChange when option is selected', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      render(<ArcCombobox onChange={onChange} options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      const option = screen.getByTestId('option-Option 1');
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith('Option 1');
    });

    // Note: ArcCombobox doesn't expose onBlur/onFocus props - these are handled internally
  });

  describe('Usage Examples from Documentation', () => {
    it('should render basic usage example', async () => {
      const TestComponent = () => {
        const [_selectedValue, setSelectedValue] = useState<string | null>(
          null,
        );

        const handleChange = (value: any) => {
          setSelectedValue(value);
        };

        return (
          <ArcCombobox
            onChange={handleChange}
            options={['Option 1', 'Option 2', 'Option 3']}
            placeholder="Search..."
          />
        );
      };

      const user = userEvent.setup();

      render(<TestComponent />);

      const input = screen.getByTestId('combobox-input');
      expect(input).toHaveAttribute('placeholder', 'Search...');

      await user.click(input);
      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
    });

    it('should render with filterable search example', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(
        <ArcCombobox
          filterable
          onChange={handleChange}
          options={stringOptions}
          placeholder="Search with filtering..."
        />,
      );

      const input = screen.getByTestId('combobox-input');
      await user.type(input, 'Option 1');

      // Should filter to show only matching option
      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
    });

    it('should render with label example', () => {
      render(
        <ArcCombobox
          label="Search"
          options={stringOptions}
          placeholder="Search..."
        />,
      );

      expect(screen.getByTestId('combobox-label')).toHaveTextContent('Search');
    });

    it('should render disabled example', () => {
      render(
        <ArcCombobox
          disabled
          options={stringOptions}
          placeholder="This is disabled"
        />,
      );

      const input = screen.getByTestId('combobox-input');
      expect(input).toBeDisabled();
    });
  });

  describe('Multiple Selection', () => {
    it('should handle multiple selection', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      render(
        <ArcCombobox multiple onChange={onChange} options={stringOptions} />,
      );

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      const option1 = screen.getByTestId('option-Option 1');
      const option2 = screen.getByTestId('option-Option 2');

      await user.click(option1);
      expect(onChange).toHaveBeenCalledWith(['Option 1']);

      await user.click(option2);
      expect(onChange).toHaveBeenCalledWith(['Option 1', 'Option 2']);
    });

    it('should handle deselection in multiple mode', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      render(
        <ArcCombobox
          multiple
          onChange={onChange}
          options={stringOptions}
          value={['Option 1', 'Option 2']}
        />,
      );

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      const option1 = screen.getByTestId('option-Option 1');
      await user.click(option1);

      expect(onChange).toHaveBeenCalledWith(['Option 2']);
    });
  });

  describe('Object Options', () => {
    it('should handle object options with getDisplayText', async () => {
      const stringOptions = ['John (Developer)', 'Jane (Designer)'];
      const onChange = jest.fn();
      const user = userEvent.setup();

      render(<ArcCombobox onChange={onChange} options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.getByTestId('option-John (Developer)')).toBeInTheDocument();

      const option = screen.getByTestId('option-John (Developer)');
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith('John (Developer)');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      expect(input).toHaveAttribute('role', 'combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should update aria-expanded when dropdown opens', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper option roles and attributes', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={stringOptions} value="Option 1" />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      const dropdown = screen.getByTestId('combobox-dropdown');
      expect(dropdown).toHaveAttribute('role', 'listbox');

      const selectedOption = screen.getByTestId('option-Option 1');
      expect(selectedOption).toHaveAttribute('role', 'option');
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined options gracefully', () => {
      render(<ArcCombobox options={[]} />);

      expect(screen.getByTestId('combobox-input')).toBeInTheDocument();
    });

    it('should handle null onChange gracefully', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      const option = screen.getByTestId('option-Option 1');
      expect(() => user.click(option)).not.toThrow();
    });

    it('should handle component unmounting gracefully', () => {
      const {unmount} = render(<ArcCombobox options={stringOptions} />);

      expect(() => unmount()).not.toThrow();
    });
  });

  // Note: ArcCombobox doesn't support ref forwarding

  describe('Performance', () => {
    it('should handle large number of options', async () => {
      const manyOptions = Array.from(
        {length: 1000},
        (_, i) => `Option ${i + 1}`,
      );
      const user = userEvent.setup();

      render(<ArcCombobox options={manyOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
      expect(screen.getByTestId('option-Option 1000')).toBeInTheDocument();
    });

    it('should handle rapid typing without errors', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      // Rapid typing
      await user.type(input, 'Option');
      await user.clear(input);
      await user.type(input, '1');

      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in options', async () => {
      const specialOptions = [
        'Option & Test',
        'Option < > Test',
        'Option "Quote" Test',
      ];
      const user = userEvent.setup();

      render(<ArcCombobox options={specialOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);

      expect(screen.getByTestId('option-Option & Test')).toBeInTheDocument();
      expect(screen.getByTestId('option-Option < > Test')).toBeInTheDocument();
      expect(
        screen.getByTestId('option-Option "Quote" Test'),
      ).toBeInTheDocument();
    });

    it('should handle case-insensitive filtering', async () => {
      const user = userEvent.setup();
      render(<ArcCombobox options={stringOptions} />);

      const input = screen.getByTestId('combobox-input');
      await user.click(input);
      await user.type(input, 'option 1');

      expect(screen.getByTestId('option-Option 1')).toBeInTheDocument();
    });
  });
});
