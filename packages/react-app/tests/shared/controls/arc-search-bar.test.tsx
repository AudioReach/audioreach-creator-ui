/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the shared controlled-search bridge used by the KV-vector list. QUI can
 * update its native input through Clear without the usual value callback, so
 * both event paths must update the same parent-owned search state exactly once.
 */
import {type FormEvent, useState} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import ArcSearchBar from '~shared/controls/arc-search-bar';

let suppressValueChangeAfterClear = false;

interface MockTextInputProps {
  inputProps?: {onInput?: (event: FormEvent<HTMLInputElement>) => void};
  onValueChange: (value: string) => void;
  value: string;
}

jest.mock('@qualcomm-ui/react/text-input', () => ({
  TextInput: ({inputProps, onValueChange, value}: MockTextInputProps) => (
    <div>
      <input
        aria-label="Search"
        onChange={(event) => {
          if (!suppressValueChangeAfterClear) {
            onValueChange(event.target.value);
          }
        }}
        onInput={inputProps?.onInput}
        value={value}
      />
      <button
        aria-label="Clear input"
        onClick={() => {
          suppressValueChangeAfterClear = true;
          onValueChange('');
        }}
        type="button"
      />
    </div>
  ),
}));

function SearchHarness() {
  const [searchTerm, setSearchTerm] = useState('initial');
  return (
    <>
      <ArcSearchBar onSearchChange={setSearchTerm} searchTerm={searchTerm} />
      <output data-testid="search-term">{searchTerm}</output>
    </>
  );
}

describe('ArcSearchBar', () => {
  beforeEach(() => {
    suppressValueChangeAfterClear = false;
  });

  it('reports text pasted after the input is cleared', () => {
    render(<SearchHarness />);

    fireEvent.click(screen.getByRole('button', {name: 'Clear input'}));
    fireEvent.input(screen.getByRole('textbox'), {
      target: {value: 'DeviceTX'},
    });

    expect(screen.getByTestId('search-term')).toHaveTextContent('DeviceTX');
  });
});
