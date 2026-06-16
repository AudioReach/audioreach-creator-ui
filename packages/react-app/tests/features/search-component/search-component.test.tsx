/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * SearchComponent UI tests
 *
 * The TextInput compound component (@qualcomm-ui/react/text-input) is mocked
 * locally here because the global mock in test-setup.ts covers only the flat
 * `TextInput` API, whereas SearchComponent uses the compound-component API
 * (TextInput.Root / InputGroup / Input / ClearTrigger).
 *
 * A React context (_TextInputCtx) is defined at module level so that the
 * Root component can pass onValueChange/value down to Input and ClearTrigger
 * without prop-drilling through the compound component tree.
 *
 * All other @qualcomm-ui mocks (IconButton, InlineIconButton) come from the
 * global test-setup.ts.
 */

import {createContext, useContext} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import {SearchComponent} from '~features/search-component/ui/search-component';

// ---------------------------------------------------------------------------
// Context shared between TextInput compound component mock parts.
// Must be defined before jest.mock so the factory closure can capture it.
// The factory only *defines* component functions (closures); those functions
// are called during rendering — by which time this context is initialised.
// ---------------------------------------------------------------------------
const _TextInputCtx = createContext<{
  onValueChange?: (v: string) => void;
  value?: string;
}>({});

// ---------------------------------------------------------------------------
// Local mock — TextInput compound component
// ---------------------------------------------------------------------------

jest.mock('@qualcomm-ui/react/text-input', () => ({
  TextInput: {
    // ClearTrigger consumes the context to call onValueChange('')
    ClearTrigger: () => {
      const {onValueChange} = useContext(_TextInputCtx);
      return (
        <button
          aria-label="Clear search input"
          data-testid="clear-trigger"
          onClick={() => onValueChange?.('')}
        >
          ×
        </button>
      );
    },

    // Input consumes the context to wire up onChange and value
    Input: ({
      'aria-label': ariaLabel,
      onKeyDown,
      placeholder,
    }: {
      'aria-label'?: string;
      onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
      placeholder?: string;
    }) => {
      const {onValueChange, value} = useContext(_TextInputCtx);
      return (
        <input
          aria-label={ariaLabel}
          data-testid="search-input"
          onChange={(e) => onValueChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          value={value ?? ''}
        />
      );
    },

    InputGroup: ({children}: any) => (
      <div data-testid="text-input-group">{children}</div>
    ),

    // Root provides the context value to all descendants
    Root: ({children, onValueChange, value}: any) => (
      <_TextInputCtx.Provider value={{onValueChange, value}}>
        <div data-testid="text-input-root">{children}</div>
      </_TextInputCtx.Provider>
    ),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default props that satisfy all required SearchComponent props */
const defaultProps = {
  currentMatch: 1,
  focusTrigger: 1,
  history: [] as string[],
  onAddToHistory: jest.fn(),
  onClose: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  onSearch: jest.fn(),
  onSearchTermChange: jest.fn(),
  searchTerm: '',
  totalMatches: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Open / Close
// ---------------------------------------------------------------------------

describe('Open / Close', () => {
  it('Escape key closes the search panel (calls onClose)', () => {
    render(<SearchComponent {...defaultProps} />);

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'Escape', key: 'Escape'});

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('Close button (×) closes the search panel (calls onClose)', () => {
    render(<SearchComponent {...defaultProps} />);

    const closeBtn = screen.getByLabelText('Close search');
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('focusTrigger causes the input to receive focus on mount', () => {
    render(<SearchComponent {...defaultProps} focusTrigger={1} />);

    const input = screen.getByTestId('search-input');
    expect(document.activeElement).toBe(input);
  });

  it('Next and Previous buttons are disabled when totalMatches is 0', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={0} totalMatches={0} />,
    );

    expect(screen.getByLabelText('Previous match')).toBeDisabled();
    expect(screen.getByLabelText('Next match')).toBeDisabled();
  });

  it('Next and Previous buttons are disabled when totalMatches is undefined', () => {
    render(
      <SearchComponent
        {...defaultProps}
        currentMatch={undefined}
        totalMatches={undefined}
      />,
    );

    expect(screen.getByLabelText('Previous match')).toBeDisabled();
    expect(screen.getByLabelText('Next match')).toBeDisabled();
  });

  it('Next and Previous buttons are enabled when totalMatches > 0', () => {
    render(<SearchComponent {...defaultProps} totalMatches={3} />);

    expect(screen.getByLabelText('Previous match')).not.toBeDisabled();
    expect(screen.getByLabelText('Next match')).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Match counter
// ---------------------------------------------------------------------------

describe('Match counter', () => {
  it('displays correct initial count in "N / total" format', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={1} totalMatches={5} />,
    );

    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('displays "0 / 0" when no matches are found', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={0} totalMatches={0} />,
    );

    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });

  it('counter is not rendered when totalMatches is undefined', () => {
    render(
      <SearchComponent
        {...defaultProps}
        currentMatch={undefined}
        totalMatches={undefined}
      />,
    );

    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  it('clicking Next calls onNext (counter increment is controlled by parent)', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={1} totalMatches={5} />,
    );

    fireEvent.click(screen.getByLabelText('Next match'));

    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('clicking Previous calls onPrevious (counter decrement is controlled by parent)', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={3} totalMatches={5} />,
    );

    fireEvent.click(screen.getByLabelText('Previous match'));

    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('counter reflects updated currentMatch prop — increments (1/5 → 2/5)', () => {
    const {rerender} = render(
      <SearchComponent {...defaultProps} currentMatch={1} totalMatches={5} />,
    );
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    rerender(
      <SearchComponent {...defaultProps} currentMatch={2} totalMatches={5} />,
    );
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('counter reflects updated currentMatch prop — decrements (3/5 → 2/5)', () => {
    const {rerender} = render(
      <SearchComponent {...defaultProps} currentMatch={3} totalMatches={5} />,
    );
    expect(screen.getByText('3 / 5')).toBeInTheDocument();

    rerender(
      <SearchComponent {...defaultProps} currentMatch={2} totalMatches={5} />,
    );
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Search input & clear
// ---------------------------------------------------------------------------

describe('Search input & clear', () => {
  it('typing in the input calls onSearch with the new value', () => {
    render(<SearchComponent {...defaultProps} />);

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, {target: {value: 'AudioDecoder'}});

    expect(defaultProps.onSearch).toHaveBeenCalledWith('AudioDecoder');
  });

  it('typing in the input calls onSearchTermChange with the new value', () => {
    render(<SearchComponent {...defaultProps} />);

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, {target: {value: 'AudioDecoder'}});

    expect(defaultProps.onSearchTermChange).toHaveBeenCalledWith(
      'AudioDecoder',
    );
  });

  it('pressing Enter calls onNext', () => {
    render(<SearchComponent {...defaultProps} searchTerm="AudioDecoder" />);

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'Enter', key: 'Enter'});

    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('pressing Enter adds the current term to history', () => {
    render(<SearchComponent {...defaultProps} searchTerm="AudioDecoder" />);

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'Enter', key: 'Enter'});

    expect(defaultProps.onAddToHistory).toHaveBeenCalledWith('AudioDecoder');
  });

  it('pressing Shift+Enter calls onPrevious', () => {
    render(<SearchComponent {...defaultProps} searchTerm="AudioDecoder" />);

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'Enter', key: 'Enter', shiftKey: true});

    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    expect(defaultProps.onNext).not.toHaveBeenCalled();
  });

  it('clear button empties the search input and calls onSearch with empty string', () => {
    render(<SearchComponent {...defaultProps} searchTerm="AudioDecoder" />);

    const clearBtn = screen.getByTestId('clear-trigger');
    fireEvent.click(clearBtn);

    expect(defaultProps.onSearch).toHaveBeenCalledWith('');
  });

  it('clear button renders with the current search term as value', () => {
    render(<SearchComponent {...defaultProps} searchTerm="AudioDecoder" />);

    expect(screen.getByTestId('search-input')).toHaveValue('AudioDecoder');
  });
});

// ---------------------------------------------------------------------------
// History dropdown
// ---------------------------------------------------------------------------

describe('History dropdown', () => {
  it('history dropdown is hidden by default', () => {
    render(<SearchComponent {...defaultProps} />);

    expect(screen.queryByText('No search history')).not.toBeInTheDocument();
  });

  it('clicking the history toggle button shows the dropdown', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));

    expect(screen.getByText('AudioDecoder')).toBeInTheDocument();
  });

  it('shows "No search history" when history is empty', () => {
    render(<SearchComponent {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Show search history'));

    expect(screen.getByText('No search history')).toBeInTheDocument();
  });

  it('clicking a history item populates the input and triggers onSearch', () => {
    render(
      <SearchComponent
        {...defaultProps}
        history={['VideoEncoder', 'AudioDecoder']}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show search history'));
    fireEvent.click(screen.getByText('VideoEncoder'));

    expect(defaultProps.onSearch).toHaveBeenCalledWith('VideoEncoder');
  });

  it('selecting a history item closes the dropdown', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));
    expect(screen.getByText('AudioDecoder')).toBeInTheDocument();

    fireEvent.click(screen.getByText('AudioDecoder'));

    expect(screen.queryByText('No search history')).not.toBeInTheDocument();
  });

  it('multiple history entries are displayed in most-recent-first order', () => {
    render(
      <SearchComponent
        {...defaultProps}
        history={['third', 'second', 'first']}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show search history'));

    const items = screen.getAllByText(/^(first|second|third)$/);
    expect(items[0]).toHaveTextContent('third');
    expect(items[1]).toHaveTextContent('second');
    expect(items[2]).toHaveTextContent('first');
  });
});

// ---------------------------------------------------------------------------
// History dropdown — keyboard navigation
// ---------------------------------------------------------------------------

describe('History dropdown — keyboard navigation', () => {
  it('ArrowDown from input moves focus to the first history item', () => {
    render(
      <SearchComponent
        {...defaultProps}
        history={['VideoEncoder', 'AudioDecoder']}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show search history'));

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'ArrowDown', key: 'ArrowDown'});

    const items = screen.getAllByRole('option');
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowDown from a history item moves focus to the next item', () => {
    render(
      <SearchComponent
        {...defaultProps}
        history={['third', 'second', 'first']}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show search history'));

    const items = screen.getAllByRole('option');

    items[0].focus();
    fireEvent.keyDown(items[0], {code: 'ArrowDown', key: 'ArrowDown'});

    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowUp from the first history item returns focus to the input', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));

    const items = screen.getAllByRole('option');
    items[0].focus();
    fireEvent.keyDown(items[0], {code: 'ArrowUp', key: 'ArrowUp'});

    expect(document.activeElement).toBe(screen.getByTestId('search-input'));
  });

  it('Enter on a focused history item selects it and calls onSearch', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));

    const items = screen.getAllByRole('option');
    items[0].focus();
    fireEvent.keyDown(items[0], {code: 'Enter', key: 'Enter'});

    expect(defaultProps.onSearch).toHaveBeenCalledWith('AudioDecoder');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Escape on a focused history item closes the dropdown', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const items = screen.getAllByRole('option');
    items[0].focus();
    fireEvent.keyDown(items[0], {code: 'Escape', key: 'Escape'});

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Tab from input when history is open closes the dropdown', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'Tab', key: 'Tab'});

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Escape from input when history is open closes the dropdown (not the panel)', () => {
    render(<SearchComponent {...defaultProps} history={['AudioDecoder']} />);

    fireEvent.click(screen.getByLabelText('Show search history'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {code: 'Escape', key: 'Escape'});

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Search syntax tooltip
// ---------------------------------------------------------------------------

describe('Search syntax tooltip', () => {
  it('hovering the info icon reveals the search syntax guide', () => {
    render(<SearchComponent {...defaultProps} />);

    const infoBtn = screen.getByLabelText('Search syntax help');
    fireEvent.mouseOver(infoBtn);

    expect(screen.getByText('PCM or 0xB0000006 or 0x4726')).toBeInTheDocument();
    expect(
      screen.getByText('sg:0xB0000006 or sg:StreamRx'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ss:0xF010002A or ss:Loopback'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('mod:0x0700101A or mod:0x4726 or mod:Volume'),
    ).toBeInTheDocument();
    expect(screen.getByText('cnt:0xE0000023')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Navigation buttons
// ---------------------------------------------------------------------------

describe('Navigation buttons', () => {
  it('clicking Next button calls onNext', () => {
    render(<SearchComponent {...defaultProps} totalMatches={3} />);

    fireEvent.click(screen.getByLabelText('Next match'));

    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('clicking Previous button calls onPrevious', () => {
    render(<SearchComponent {...defaultProps} totalMatches={3} />);

    fireEvent.click(screen.getByLabelText('Previous match'));

    expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('Next button is disabled when totalMatches is 0 (no matches found)', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={0} totalMatches={0} />,
    );

    expect(screen.getByLabelText('Next match')).toBeDisabled();
  });

  it('Previous button is disabled when totalMatches is 0 (no matches found)', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={0} totalMatches={0} />,
    );

    expect(screen.getByLabelText('Previous match')).toBeDisabled();
  });

  it('displays "0 / 0" counter and disables both buttons when no matches found', () => {
    render(
      <SearchComponent {...defaultProps} currentMatch={0} totalMatches={0} />,
    );

    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Next match')).toBeDisabled();
    expect(screen.getByLabelText('Previous match')).toBeDisabled();
  });
});
