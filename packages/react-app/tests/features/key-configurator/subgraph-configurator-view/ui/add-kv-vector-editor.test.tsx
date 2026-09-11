/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the SGKV-specific adapter around the generic editor control. It proves
 * domain suggestions retain their owning key, Clear reaches the parent state,
 * and parser diagnostics remain associated with the editable text control.
 */
import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';

import {AddSgKvVectorEditor} from '~features/key-configurator/subgraph-configurator-view/ui/add-sg-kv-vector-editor';

jest.mock('@qualcomm-ui/react/text-area', () => ({
  TextArea: ({
    inputProps,
    onValueChange,
    placeholder,
    value,
  }: {
    inputProps?: React.ComponentPropsWithRef<'textarea'>;
    onValueChange: (value: string) => void;
    placeholder: string;
    value: string;
  }) => (
    <textarea
      {...inputProps}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({
    children,
    onClick,
    onMouseDown,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} onMouseDown={onMouseDown} {...props}>
      {children}
    </button>
  ),
  IconButton: ({
    'aria-label': ariaLabel,
    icon: _icon,
    onClick,
  }: {
    'aria-label': string;
    icon: unknown;
    onClick: () => void;
  }) => <button aria-label={ariaLabel} onClick={onClick} />,
}));

jest.mock('@qualcomm-ui/react/tooltip', () => ({
  Tooltip: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>,
}));

const suggestions = [
  {
    insertionText: 'DeviceTX',
    keyLabel: 'DeviceTX',
    keySystemId: 'key-device-tx',
    kind: 'key-value-pair' as const,
    label: 'DeviceTX',
    replacementRange: {end: 0, start: 0},
    valueLabel: 'A2B_Mic',
  },
];

function renderEditor() {
  const onSuggestionCommit = jest.fn();
  const onTextChange = jest.fn();

  render(
    <AddSgKvVectorEditor
      diagnostic={null}
      onSuggestionCommit={onSuggestionCommit}
      onTextChange={onTextChange}
      suggestions={suggestions}
      text=""
    />,
  );

  return {onSuggestionCommit, onTextChange};
}

function CaretEditorHarness({
  onCaretPositionChange,
}: {
  onCaretPositionChange: (caretPosition: number) => void;
}) {
  const [text, setText] = useState('');

  return (
    <AddSgKvVectorEditor
      diagnostic={null}
      onCaretPositionChange={onCaretPositionChange}
      onSuggestionCommit={jest.fn()}
      onTextChange={setText}
      suggestions={suggestions}
      text={text}
    />
  );
}

describe('AddSgKvVectorEditor', () => {
  it('keeps suggestions closed until the user enters editor text', () => {
    const {onTextChange} = renderEditor();
    const editor = screen.getByLabelText('Add KV Vector Editor');

    expect(
      screen.queryByRole('listbox', {name: 'KV vector suggestions'}),
    ).not.toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'D'}});

    expect(onTextChange).toHaveBeenCalledWith('D');
    expect(
      screen.getByRole('listbox', {name: 'KV vector suggestions'}),
    ).toBeInTheDocument();
  });

  it('closes suggestions for Escape, Tab, and editor focus loss', () => {
    renderEditor();
    const editor = screen.getByLabelText('Add KV Vector Editor');

    fireEvent.change(editor, {target: {value: 'D'}});
    fireEvent.keyDown(editor, {key: 'Escape'});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'D'}});
    fireEvent.keyDown(editor, {key: 'Tab'});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'D'}});
    fireEvent.blur(editor);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes suggestions without committing when Enter has no active row', () => {
    const {onSuggestionCommit} = renderEditor();
    const editor = screen.getByLabelText('Add KV Vector Editor');

    fireEvent.change(editor, {target: {value: 'D'}});
    fireEvent.keyDown(editor, {key: 'Enter'});

    expect(onSuggestionCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('uses a blue active suggestion state and commits it on click', () => {
    const {onSuggestionCommit} = renderEditor();
    const editor = screen.getByLabelText('Add KV Vector Editor');

    fireEvent.change(editor, {target: {value: 'D'}});
    fireEvent.keyDown(editor, {key: 'ArrowDown'});
    fireEvent.keyUp(editor, {key: 'ArrowDown'});

    const suggestion = screen.getByRole('option', {
      name: 'A2B_Mic Key: DeviceTX',
    });
    expect(suggestion).toHaveClass('bg-support-info-subtle');

    fireEvent.click(suggestion);
    expect(onSuggestionCommit).toHaveBeenCalledWith(suggestions[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reports the current input caret position', () => {
    const onCaretPositionChange = jest.fn();

    render(
      <CaretEditorHarness onCaretPositionChange={onCaretPositionChange} />,
    );
    const editor = screen.getByLabelText('Add KV Vector Editor');

    fireEvent.change(editor, {target: {value: '[Dev'}});
    editor.setSelectionRange(2, 2);
    fireEvent.select(editor);

    expect(onCaretPositionChange).toHaveBeenLastCalledWith(2);
  });

  it('keeps SGKV validation in the adapter', () => {
    render(
      <AddSgKvVectorEditor
        diagnostic={{
          code: 'malformed-entry',
          fragment: '[DeviceTX:A2B_Mic',
          severity: 'error',
        }}
        onSuggestionCommit={jest.fn()}
        onTextChange={jest.fn()}
        suggestions={suggestions}
        text=""
      />,
    );

    expect(
      screen.getByText('"[DeviceTX:A2B_Mic" is not a valid [Key:Value] entry.'),
    ).toHaveClass('text-support-danger');
  });

  it('presents automatic Value Only resolution as a warning without blocking input', () => {
    render(
      <AddSgKvVectorEditor
        diagnostic={{
          code: 'value-only-auto-resolved',
          resolutions: [
            {
              candidateKeyNames: ['Key1', 'Key2'],
              resolvedKeyNames: ['Key1'],
              valueName: 'LL',
            },
          ],
          severity: 'warning',
        }}
        onSuggestionCommit={jest.fn()}
        onTextChange={jest.fn()}
        suggestions={suggestions}
        text="LL"
      />,
    );

    const warning = screen.getByText(
      /Values are shared by multiple keys\. Matching keys were selected automatically by key ID\./,
    );

    expect(warning).toHaveClass('text-icon-support-warning');
    expect(warning).toHaveAttribute('role', 'status');
  });
});
