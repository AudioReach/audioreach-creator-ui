/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type FC, type KeyboardEvent, useEffect, useRef, useState} from 'react';

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Search,
  X,
} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {useSearchComponentStore} from '../model/use-search-component-store';

export interface SearchComponentProps {
  /** Current match index (1-based). Displayed as "N / total". */
  currentMatch?: number;
  /**
   * Handles all open scenarios
   * Increment this counter to focus the search input.
   */
  focusTrigger?: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSearch: (term: string) => void;
  placeholder?: string;
  projectId: string;
  totalMatches?: number;
}

/**
 * SearchComponent
 *
 * A toolbar-style search bar with:
 * - Text input with clear trigger and keyboard handling
 * - History toggle button with collapsible dropdown
 * - Match counter ("N / total")
 * - Previous / Next / Close navigation buttons
 */
export const SearchComponent: FC<SearchComponentProps> = ({
  currentMatch,
  focusTrigger,
  onClose,
  onNext,
  onPrevious,
  onSearch,
  placeholder = 'Search components...',
  projectId,
  totalMatches,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Tracks which history item currently has keyboard focus (-1 = input focused)
  const [focusedHistoryIndex, setFocusedHistoryIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  const historyItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Always track the latest onSearch callback to avoid stale closures in effects.
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const addToHistory = useSearchComponentStore((s) => s.addToHistory);
  const setSearchTerm = useSearchComponentStore((s) => s.setSearchTerm);

  const {history, searchTerm} = useSearchComponentStore((state) =>
    state.getProjectState(projectId),
  );

  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  // Focus the input whenever focusTrigger changes.
  useEffect(() => {
    const input = containerRef.current?.querySelector('input');
    input?.focus();

    // Re-apply stored search term when panel is reopened.
    if (searchTermRef.current.trim()) {
      onSearchRef.current(searchTermRef.current);
    }
  }, [focusTrigger]);

  // Close history dropdown when the user clicks outside the component
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsHistoryOpen(false);
        setFocusedHistoryIndex(-1);
      }
    };

    // Use capture:true so this fires before ReactFlow (or any other layer)
    document.addEventListener('mousedown', handlePointerDown, {capture: true});
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, {
        capture: true,
      });
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Return focus to the text input and reset the focused history index. */
  const returnFocusToInput = () => {
    const input = containerRef.current?.querySelector('input');
    input?.focus();
    setFocusedHistoryIndex(-1);
  };

  /** Close the history dropdown and return focus to the input. */
  const closeHistory = () => {
    setIsHistoryOpen(false);
    setFocusedHistoryIndex(-1);
    returnFocusToInput();
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchTerm(projectId, value);
    onSearch(value);
    if (!value) {
      setIsHistoryOpen(false);
      setFocusedHistoryIndex(-1);
    }
  };

  const handleHistorySelect = (term: string) => {
    setSearchTerm(projectId, term);
    onSearch(term);
    setIsHistoryOpen(false);
    setFocusedHistoryIndex(-1);
    const input = containerRef.current?.querySelector('input');
    input?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (searchTerm.trim()) {
        addToHistory(projectId, searchTerm);
      }
      if (event.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    } else if (event.key === 'Escape') {
      if (isHistoryOpen) {
        closeHistory();
      } else {
        onClose();
      }
    } else if (
      event.key === 'ArrowDown' &&
      isHistoryOpen &&
      history.length > 0
    ) {
      // Move focus into the first history item
      event.preventDefault();
      setFocusedHistoryIndex(0);
      historyItemRefs.current[0]?.focus();
    } else if (event.key === 'Tab' && isHistoryOpen) {
      // Close the dropdown so it doesn't stay open when focus leaves
      setIsHistoryOpen(false);
      setFocusedHistoryIndex(-1);
    }
  };

  const handleHistoryItemKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
    term: string,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (index + 1) % history.length;
      setFocusedHistoryIndex(nextIndex);
      historyItemRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) {
        returnFocusToInput();
      } else {
        const prevIndex = index - 1;
        setFocusedHistoryIndex(prevIndex);
        historyItemRefs.current[prevIndex]?.focus();
      }
    } else if (event.key === 'Enter') {
      handleHistorySelect(term);
    } else if (event.key === 'Escape') {
      closeHistory();
    } else if (event.key === 'Tab') {
      setIsHistoryOpen(false); // Close dropdown;
      setFocusedHistoryIndex(-1);
    }
  };

  const handleNext = () => {
    if (searchTerm.trim()) {
      addToHistory(projectId, searchTerm);
    }
    onNext();
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const hasMatches = totalMatches !== undefined && totalMatches > 0;
  const showCounter = totalMatches !== undefined;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex items-center rounded border px-1"
      style={{
        backgroundColor: 'var(--color-surface-secondary)',
        borderColor: 'var(--color-border-neutral-02)',
      }}
    >
      {/* ── Search input with history toggle inside ── */}
      <div className="relative flex-1">
        <TextInput.Root
          onValueChange={handleSearchChange}
          size="sm"
          startIcon={Search}
          value={searchTerm}
        >
          <TextInput.InputGroup>
            <TextInput.Input
              aria-label={placeholder}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
            />
            <TextInput.ClearTrigger />
            {/* Info icon — shows search syntax guide on hover */}
            <Tooltip
              arrowTipProps={{
                className:
                  '!bg-[var(--color-background-support-neutral-subtle)]',
              }}
              contentProps={{
                className:
                  'bg-[var(--color-background-support-neutral-subtle)]',
              }}
              positioning={{placement: 'bottom'}}
              trigger={
                <span style={{display: 'inline-flex'}}>
                  <InlineIconButton
                    aria-label="Search syntax help"
                    icon={Info}
                    size="sm"
                    style={{backgroundColor: 'transparent'}}
                  />
                </span>
              }
            >
              <div className="text-xs">
                {[
                  {
                    example: 'PCM or 0xB0000006 or 0x4726',
                    label: 'Search all components',
                  },
                  {
                    example: 'sg:0xB0000006 or sg:StreamRx',
                    label: 'Search subgraphs',
                  },
                  {
                    example: 'ss:0xF010002A or ss:Loopback',
                    label: 'Search subsystems',
                  },
                  {
                    example: 'mod:0x0700101A or mod:0x4726 or mod:Volume',
                    label: 'Search modules',
                  },
                  {example: 'cnt:0xE0000023', label: 'Search containers'},
                ].map(({example, label}) => (
                  <div
                    key={label}
                    className="mb-2 text-[var(--color-text-neutral-primary)]"
                  >
                    <div className="mb-1">{label}</div>
                    <code className="block rounded bg-[var(--color-background-neutral-03)] px-1.5 py-0.5 text-[var(--color-text-neutral-primary)]">
                      {example}
                    </code>
                  </div>
                ))}
              </div>
            </Tooltip>
            {/* History toggle rendered inside the input box */}
            <InlineIconButton
              aria-expanded={isHistoryOpen}
              aria-label={
                isHistoryOpen ? 'Hide search history' : 'Show search history'
              }
              icon={isHistoryOpen ? ChevronUp : ChevronDown}
              onClick={() => {
                setIsHistoryOpen((prev) => !prev);
                setFocusedHistoryIndex(-1);
              }}
              size="sm"
              style={{
                backgroundColor: 'transparent',
              }}
            />
          </TextInput.InputGroup>
        </TextInput.Root>

        {/* ── History dropdown ── */}
        {isHistoryOpen && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+1px)] z-[200] max-h-60 overflow-y-auto border border-[var(--color-border-neutral-02)] bg-[var(--color-surface-secondary)]"
            role="listbox"
          >
            {history.length > 0 ? (
              history.map((term: string, index: number) => (
                <div
                  key={term}
                  ref={(el) => {
                    historyItemRefs.current[index] = el;
                  }}
                  aria-selected={focusedHistoryIndex === index}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-neutral-primary)] hover:bg-[var(--color-background-neutral-03)] focus:bg-[var(--color-background-neutral-03)] focus:outline-none"
                  onClick={() => handleHistorySelect(term)}
                  onKeyDown={(e) => handleHistoryItemKeyDown(e, index, term)}
                  role="option"
                  tabIndex={0}
                >
                  <History
                    size={14}
                    style={{
                      color: 'var(--color-text-neutral-primary)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {term}
                  </span>
                </div>
              ))
            ) : (
              <div className="select-none p-3 text-center text-sm text-[var(--color-text-neutral-primary)]">
                No search history
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Match counter ── */}
      {showCounter && (
        <span className="min-w-[52px] select-none whitespace-nowrap px-1 text-center text-xs text-[var(--color-text-neutral-primary)]">
          {`${hasMatches ? (currentMatch ?? 0) : 0} / ${totalMatches ?? 0}`}
        </span>
      )}

      {/* ── Navigation & close buttons ── */}
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <IconButton
          aria-label="Previous match"
          className="-mr-[15px]"
          disabled={!hasMatches}
          emphasis="neutral"
          icon={ArrowUp}
          onClick={onPrevious}
          variant="ghost"
        />
        <IconButton
          aria-label="Next match"
          className="-mr-[15px]"
          disabled={!hasMatches}
          emphasis="neutral"
          icon={ArrowDown}
          onClick={handleNext}
          variant="ghost"
        />
        <IconButton
          aria-label="Close search"
          emphasis="neutral"
          icon={X}
          onClick={onClose}
          variant="ghost"
        />
      </div>
    </div>
  );
};
