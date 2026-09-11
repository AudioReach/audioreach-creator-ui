/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the reusable editor independently of SGKV parsing. It owns keyboard
 * navigation, popup visibility, Clear behavior, focus scrolling, and dynamic
 * textarea sizing, while the feature adapter owns domain-specific decisions.
 */
import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';

import {
  KvVectorEditor,
  type KvVectorEditorSuggestion,
} from '~features/key-configurator/ui/kv-vector-editor';

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
    onMouseDown,
    ...props
  }: {
    'aria-label': string;
    icon: unknown;
    onClick: () => void;
    onMouseDown: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseDown={onMouseDown}
      {...props}
    />
  ),
}));

const suggestions: KvVectorEditorSuggestion<string>[] = [
  {
    id: 'device-tx:a2b-mic',
    primaryText: 'A2B_Mic',
    secondaryText: 'Key: DeviceTX',
    value: 'first',
  },
  {
    id: 'stream-tx:pcm-ull-record',
    primaryText: 'PCM_ULL_Record',
    secondaryText: 'Key: StreamTX',
    value: 'second',
  },
];

/**
 * Renders the generic control with observable callbacks and stable suggestions.
 * The harness makes interaction contracts visible without duplicating parser
 * behavior that belongs in the SGKV adapter tests.
 */
function renderEditor() {
  const onSuggestionCommit = jest.fn();
  const onTextChange = jest.fn();

  render(
    <KvVectorEditor
      ariaLabel="KV Vector Editor"
      onSuggestionCommit={onSuggestionCommit}
      onTextChange={onTextChange}
      placeholder="Search keys or values"
      suggestions={suggestions}
      text=""
    />,
  );

  return {onSuggestionCommit, onTextChange};
}

function CaretEditorHarness({
  onCaretPositionChange,
  onSuggestionCommit,
}: {
  onCaretPositionChange: (caretPosition: number) => void;
  onSuggestionCommit: (value: string) => void;
}) {
  const [text, setText] = useState('');

  return (
    <KvVectorEditor
      ariaLabel="KV Vector Editor"
      onCaretPositionChange={onCaretPositionChange}
      onSuggestionCommit={onSuggestionCommit}
      onTextChange={setText}
      placeholder="Search keys or values"
      suggestions={suggestions}
      text={text}
    />
  );
}

function ClearableEditorHarness({
  onTextChange,
}: {
  onTextChange: (text: string) => void;
}) {
  const [text, setText] = useState('[DeviceTX:A2B_Mic]');

  return (
    <KvVectorEditor
      ariaLabel="KV Vector Editor"
      clearable
      onSuggestionCommit={jest.fn()}
      onTextChange={(nextText) => {
        setText(nextText);
        onTextChange(nextText);
      }}
      placeholder="Search keys or values"
      suggestions={suggestions}
      text={text}
    />
  );
}

describe('KvVectorEditor', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('opens suggestions only after non-whitespace input', () => {
    const {onTextChange} = renderEditor();
    const editor = screen.getByLabelText('KV Vector Editor');

    fireEvent.change(editor, {target: {value: ' '}});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'A'}});

    expect(onTextChange).toHaveBeenLastCalledWith('A');
    expect(
      screen.getByRole('listbox', {name: 'KV vector suggestions'}),
    ).toBeInTheDocument();
  });

  it('associates adapter guidance with the textarea', () => {
    render(
      <KvVectorEditor
        ariaDescribedBy="kv-vector-guidance"
        ariaLabel="KV Vector Editor"
        onSuggestionCommit={jest.fn()}
        onTextChange={jest.fn()}
        placeholder="Search keys or values"
        suggestions={suggestions}
        text=""
      />,
    );

    expect(screen.getByLabelText('KV Vector Editor')).toHaveAttribute(
      'aria-describedby',
      'kv-vector-guidance',
    );
  });

  it('closes suggestions for Escape, Tab, and editor focus loss', () => {
    renderEditor();
    const editor = screen.getByLabelText('KV Vector Editor');

    fireEvent.change(editor, {target: {value: 'A'}});
    fireEvent.keyDown(editor, {key: 'Escape'});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'A'}});
    fireEvent.keyDown(editor, {key: 'Tab'});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.change(editor, {target: {value: 'A'}});
    fireEvent.blur(editor);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates without wrapping and commits only an active suggestion', () => {
    const {onSuggestionCommit} = renderEditor();
    const editor = screen.getByLabelText('KV Vector Editor');

    fireEvent.change(editor, {target: {value: 'A'}});
    fireEvent.keyDown(editor, {key: 'Enter'});
    expect(onSuggestionCommit).not.toHaveBeenCalled();

    fireEvent.change(editor, {target: {value: 'A'}});
    fireEvent.keyDown(editor, {key: 'ArrowDown'});
    fireEvent.keyDown(editor, {key: 'ArrowDown'});
    fireEvent.keyDown(editor, {key: 'ArrowDown'});
    expect(
      screen.getByRole('option', {name: 'PCM_ULL_Record Key: StreamTX'}),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('option', {name: 'PCM_ULL_Record Key: StreamTX'}),
    ).toHaveClass('h-7', 'min-h-0', 'py-0.5');

    fireEvent.keyDown(editor, {key: 'ArrowUp'});
    fireEvent.keyDown(editor, {key: 'ArrowUp'});
    expect(
      screen.getByRole('option', {name: 'A2B_Mic Key: DeviceTX'}),
    ).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(editor, {key: 'Enter'});
    expect(onSuggestionCommit).toHaveBeenCalledWith('first');
  });

  it('scrolls the keyboard-active suggestion into view', () => {
    renderEditor();
    const editor = screen.getByLabelText('KV Vector Editor');

    fireEvent.change(editor, {target: {value: 'A'}});
    fireEvent.keyDown(editor, {key: 'ArrowDown'});

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
    });
  });

  it('expands vertically as editor text grows', () => {
    const onCaretPositionChange = jest.fn();
    const onSuggestionCommit = jest.fn();

    render(
      <CaretEditorHarness
        onCaretPositionChange={onCaretPositionChange}
        onSuggestionCommit={onSuggestionCommit}
      />,
    );
    const editor = screen.getByLabelText('KV Vector Editor');
    Object.defineProperty(editor, 'scrollHeight', {
      configurable: true,
      value: 64,
    });

    fireEvent.change(editor, {target: {value: 'A long KV vector'}});

    expect(editor).toHaveStyle({height: '64px'});
    expect(editor).toHaveAttribute('rows', '1');
    expect(editor).toHaveClass('resize-none', 'overflow-x-hidden', 'text-sm');
    expect(editor).not.toHaveClass('break-all');
  });

  it('resizes immediately when the textarea receives input', () => {
    renderEditor();
    const editor = screen.getByLabelText('KV Vector Editor');
    Object.defineProperty(editor, 'scrollHeight', {
      configurable: true,
      value: 64,
    });

    fireEvent.input(editor, {target: {value: 'A long KV vector'}});

    expect(editor).toHaveStyle({height: '64px'});
  });

  it('remeasures after QUI synchronizes a newly wrapped value', () => {
    renderEditor();
    const editor = screen.getByLabelText('KV Vector Editor');
    const animationFrameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        animationFrameCallbacks.push(callback);
        return animationFrameCallbacks.length;
      });
    let layoutHeight = 36;
    Object.defineProperty(editor, 'scrollHeight', {
      configurable: true,
      get: () => layoutHeight,
    });

    fireEvent.input(editor, {target: {value: 'A newly wrapped KV vector'}});

    const firstFrame = animationFrameCallbacks.shift();
    expect(firstFrame).toBeDefined();
    firstFrame?.(0);

    layoutHeight = 64;
    const secondFrame = animationFrameCallbacks.shift();
    expect(secondFrame).toBeDefined();
    secondFrame?.(0);

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
    expect(editor).toHaveStyle({height: '64px'});
    requestAnimationFrameSpy.mockRestore();
  });

  it('commits a clicked suggestion and reports the input caret', () => {
    const onCaretPositionChange = jest.fn();
    const onSuggestionCommit = jest.fn();

    render(
      <CaretEditorHarness
        onCaretPositionChange={onCaretPositionChange}
        onSuggestionCommit={onSuggestionCommit}
      />,
    );
    const editor = screen.getByLabelText('KV Vector Editor');

    fireEvent.change(editor, {target: {value: '[Dev'}});
    editor.setSelectionRange(2, 2);
    fireEvent.select(editor);

    expect(onCaretPositionChange).toHaveBeenLastCalledWith(2);

    fireEvent.click(
      screen.getByRole('option', {name: 'A2B_Mic Key: DeviceTX'}),
    );
    expect(onSuggestionCommit).toHaveBeenCalledWith('first');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears optional editor text through the standard text-change path', () => {
    const onTextChange = jest.fn();

    render(<ClearableEditorHarness onTextChange={onTextChange} />);

    fireEvent.click(
      screen.getByRole('button', {name: 'Clear KV vector editor'}),
    );

    expect(onTextChange).toHaveBeenCalledWith('');
    expect(screen.getByLabelText('KV Vector Editor')).toHaveValue('');
    expect(
      screen.queryByRole('button', {name: 'Clear KV vector editor'}),
    ).not.toBeInTheDocument();
  });
});
