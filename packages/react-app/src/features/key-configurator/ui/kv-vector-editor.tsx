/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import {Search, X} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
import {TextArea} from '@qualcomm-ui/react/text-area';

/**
 * Reusable controlled text-and-suggestion control for all Key Configurators.
 * It owns generic keyboard, sizing, focus, and popup behavior, while each
 * feature adapter supplies parsing, suggestions, insertion, and validation.
 */
/** Feature-provided suggestion rendered by the generic controlled editor. */
export interface KvVectorEditorSuggestion<T> {
  id: string;
  primaryText: string;
  secondaryText?: string;
  value: T;
}

/** Generic editor callbacks keep parsing and mutations in the feature adapter. */
export interface KvVectorEditorProps<T> {
  ariaDescribedBy?: string;
  ariaLabel: string;
  clearable?: boolean;
  onCaretPositionChange?: (caretPosition: number) => void;
  onSuggestionCommit: (value: T) => void;
  onTextChange: (text: string) => void;
  placeholder: string;
  suggestions: readonly KvVectorEditorSuggestion<T>[];
  text: string;
  trailingControls?: ReactNode;
}

function resizeEditor(editorInput: HTMLTextAreaElement): void {
  if (editorInput.scrollHeight === 0) {
    return;
  }
  editorInput.style.height = 'auto';
  editorInput.style.height = `${editorInput.scrollHeight}px`;
}

/** Reusable text/suggestion control with no KV-domain parsing or store access. */
export function KvVectorEditor<T>({
  ariaDescribedBy,
  ariaLabel,
  clearable = false,
  onCaretPositionChange,
  onSuggestionCommit,
  onTextChange,
  placeholder,
  suggestions,
  text,
  trailingControls,
}: KvVectorEditorProps<T>) {
  const editorInputRef = useRef<HTMLTextAreaElement>(null);
  const editorResizeFrameRef = useRef<number | null>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<
    number | null
  >(null);
  const [isSuggestionPopupOpen, setIsSuggestionPopupOpen] = useState(false);

  const closeSuggestionPopup = (): void => {
    setActiveSuggestionIndex(null);
    setIsSuggestionPopupOpen(false);
  };

  const handleTextChange = (nextText: string): void => {
    setActiveSuggestionIndex(null);
    setIsSuggestionPopupOpen(nextText.trim().length > 0);
    onCaretPositionChange?.(
      editorInputRef.current?.selectionStart ?? nextText.length,
    );
    onTextChange(nextText);
  };

  const scheduleEditorResize = useCallback((): void => {
    const editorInput = editorInputRef.current;
    if (!editorInput) {
      return;
    }
    resizeEditor(editorInput);
    if (editorResizeFrameRef.current !== null) {
      cancelAnimationFrame(editorResizeFrameRef.current);
    }
    // Re-measure after QUI applies the controlled textarea update.
    editorResizeFrameRef.current = requestAnimationFrame(() => {
      if (editorInputRef.current) {
        resizeEditor(editorInputRef.current);
      }
      editorResizeFrameRef.current = requestAnimationFrame(() => {
        if (editorInputRef.current) {
          resizeEditor(editorInputRef.current);
        }
        editorResizeFrameRef.current = null;
      });
    });
  }, []);

  const handleCaretPositionChange = (
    event: SyntheticEvent<HTMLTextAreaElement>,
  ): void => {
    setActiveSuggestionIndex(null);
    onCaretPositionChange?.(
      event.currentTarget.selectionStart ?? event.currentTarget.value.length,
    );
  };

  const handleEditorKeyUp = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    // Cut/Delete can update the native value before React does.
    if (event.currentTarget.value !== text) {
      handleTextChange(event.currentTarget.value);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      setActiveSuggestionIndex(null);
    }
    onCaretPositionChange?.(
      event.currentTarget.selectionStart ?? event.currentTarget.value.length,
    );
  };

  const commitSuggestion = (suggestion: KvVectorEditorSuggestion<T>): void => {
    // Feature adapters own text insertion, parsing, and domain state updates.
    onSuggestionCommit(suggestion.value);
    closeSuggestionPopup();
  };

  const isSuggestionPopupVisible =
    isSuggestionPopupOpen && suggestions.length > 0;
  const canClear = clearable && text.length > 0;

  useLayoutEffect(() => {
    scheduleEditorResize();
  }, [scheduleEditorResize, text]);

  useEffect(
    () => () => {
      if (editorResizeFrameRef.current !== null) {
        cancelAnimationFrame(editorResizeFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeSuggestionIndex === null) {
      return;
    }
    // Keep keyboard focus visible when the active option moves below the viewport.
    suggestionRefs.current[activeSuggestionIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [activeSuggestionIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'ArrowDown' && isSuggestionPopupVisible) {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current === null ? 0 : Math.min(current + 1, suggestions.length - 1),
      );
      return;
    }
    if (event.key === 'ArrowUp' && isSuggestionPopupVisible) {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current === null ? 0 : Math.max(current - 1, 0),
      );
      return;
    }
    const activeSuggestion =
      activeSuggestionIndex === null
        ? null
        : (suggestions[activeSuggestionIndex] ?? null);
    if (event.key === 'Enter' && isSuggestionPopupVisible) {
      // Enter accepts only an explicitly keyboard-highlighted suggestion.
      event.preventDefault();
      if (activeSuggestion) {
        commitSuggestion(activeSuggestion);
      } else {
        closeSuggestionPopup();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSuggestionPopup();
      return;
    }
    if (event.key === 'Tab') {
      closeSuggestionPopup();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <Search className="text-neutral-secondary pointer-events-none absolute top-1/2 left-2 z-10 h-4 w-4 -translate-y-1/2" />
          <TextArea
            inputProps={{
              'aria-describedby': ariaDescribedBy,
              'aria-label': ariaLabel,
              className: `min-h-9 w-full resize-none overflow-x-hidden overflow-y-hidden py-2 pl-8 text-sm${
                canClear ? ' pr-8' : ''
              }`,
              onBlur: closeSuggestionPopup,
              onInput: scheduleEditorResize,
              onKeyDown: handleKeyDown,
              onKeyUp: handleEditorKeyUp,
              onSelect: handleCaretPositionChange,
              ref: editorInputRef,
              rows: 1,
              wrap: 'soft',
            }}
            onValueChange={handleTextChange}
            placeholder={placeholder}
            size="sm"
            value={text}
          />
          {canClear && (
            <IconButton
              aria-label="Clear KV vector editor"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              icon={<X />}
              onClick={() => handleTextChange('')}
              onMouseDown={(event) => event.preventDefault()}
              size="sm"
              title="Clear KV vector"
              variant="ghost"
            />
          )}
        </div>
        {trailingControls}
      </div>
      {isSuggestionPopupVisible && (
        <div
          aria-label="KV vector suggestions"
          className="bg-primary border-support-info max-h-48 overflow-y-auto rounded border shadow-sm"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <Button
              key={suggestion.id}
              ref={(element) => {
                suggestionRefs.current[index] = element;
              }}
              aria-selected={activeSuggestionIndex === index}
              className={`text-neutral-primary hover:bg-support-info-subtle focus-visible:bg-support-info-subtle flex h-7 min-h-0 w-full items-center justify-between rounded-none px-2 py-0.5 text-left text-sm ${
                activeSuggestionIndex === index
                  ? 'bg-support-info-subtle'
                  : 'bg-transparent'
              }`}
              onClick={() => commitSuggestion(suggestion)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              size="sm"
              variant="ghost"
            >
              <span>{suggestion.primaryText}</span>
              {suggestion.secondaryText && (
                <span className="text-neutral-secondary ml-3 shrink-0">
                  {suggestion.secondaryText}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
