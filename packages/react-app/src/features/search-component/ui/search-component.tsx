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
  Search,
  X,
} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {TextInput} from '@qualcomm-ui/react/text-input';

import {useSearchComponentStore} from '../model/use-search-component-store';

export interface SearchComponentProps {
  /** Current match index (1-based). Displayed as "N / total". */
  currentMatch?: number;
  /**
   * Increment this counter to focus the search input.
   * Handles all open scenarios:
   *   - First open: SearchComponent mounts with focusTrigger=1 → fires
   *   - Close + reopen: remounts with new focusTrigger value → fires
   *   - Panel already visible, Ctrl+F again: value increments → fires
   */
  focusTrigger?: number;
  /** Called when the user closes the search bar. */
  onClose: () => void;
  /** Called when the user requests the next match (Enter key or ↓ button). */
  onNext: () => void;
  /** Called when the user requests the previous match (↑ button). */
  onPrevious: () => void;
  /** Called on every search-term change. */
  onSearch: (term: string) => void;
  /** Placeholder text shown inside the input. */
  placeholder?: string;
  /** Project ID used to isolate search state per project. */
  projectId: string;
  /** Total number of matches found by the consumer. */
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
 *
 * Per-project state (searchTerm, history) is managed by `useSearchComponentStore`.
 * Match navigation and result counts are delegated to the consumer via props.
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Select only the actions we need — stable function references, no re-render on data change
  const addToHistory = useSearchComponentStore((s) => s.addToHistory);
  const setSearchTerm = useSearchComponentStore((s) => s.setSearchTerm);

  // Derive per-project state reactively via getProjectState.
  const {history, searchTerm} = useSearchComponentStore((state) =>
    state.getProjectState(projectId),
  );

  // Focus the input whenever focusTrigger changes.
  // Also re-applies the stored search term so results are shown immediately on reopen.
  useEffect(() => {
    const input = containerRef.current?.querySelector('input');
    input?.focus();

    // Re-apply stored search term when panel is reopened
    if (searchTerm.trim()) {
      onSearch(searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTrigger]);

  // Close history dropdown when the user clicks outside the component
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsHistoryOpen(false);
      }
    };

    // Use capture:true so this fires before ReactFlow (or any other layer)
    // can call stopPropagation() and swallow the event.
    document.addEventListener('mousedown', handlePointerDown, {capture: true});
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, {
        capture: true,
      });
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchTerm(projectId, value);
    onSearch(value);
    if (!value) {
      setIsHistoryOpen(false);
    }
  };

  const handleHistorySelect = (term: string) => {
    setSearchTerm(projectId, term);
    onSearch(term);
    setIsHistoryOpen(false);
    const input = containerRef.current?.querySelector('input');
    input?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (searchTerm.trim()) {
        addToHistory(projectId, searchTerm);
      }
      onNext();
    } else if (event.key === 'Escape') {
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNext = () => {
    if (searchTerm.trim()) {
      addToHistory(projectId, searchTerm);
    }
    onNext();
  };

  const handlePrevious = () => {
    if (searchTerm.trim()) {
      addToHistory(projectId, searchTerm);
    }
    onPrevious();
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
            {/* History toggle rendered inside the input box */}
            <InlineIconButton
              aria-label={
                isHistoryOpen ? 'Hide search history' : 'Show search history'
              }
              icon={isHistoryOpen ? ChevronUp : ChevronDown}
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              size="sm"
              style={{
                backgroundColor: 'transparent',
              }}
            />
          </TextInput.InputGroup>
        </TextInput.Root>

        {/* ── History dropdown ── */}
        {isHistoryOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+1px)] z-[200] max-h-60 overflow-y-auto border border-[var(--color-border-neutral-02)] bg-[var(--color-surface-secondary)]">
            {history.length > 0 ? (
              history.map((term: string) => (
                <div
                  key={term}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-neutral-primary)]"
                  onClick={() => handleHistorySelect(term)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor =
                      'var(--color-background-neutral-03)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor =
                      'transparent';
                  }}
                >
                  <History
                    size={14}
                    style={{
                      color: 'var(color-text-neutral-primary)',
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
          // alignItems: 'center',
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <IconButton
          aria-label="Previous match"
          disabled={!hasMatches}
          emphasis="neutral"
          icon={ArrowUp}
          onClick={handlePrevious}
          style={{marginRight: '-15px'}}
          variant="ghost"
        />
        <IconButton
          aria-label="Next match"
          disabled={!hasMatches}
          emphasis="neutral"
          icon={ArrowDown}
          onClick={handleNext}
          style={{marginRight: '-15px'}}
          variant="ghost"
        />
        <IconButton
          aria-label="Close search"
          emphasis="neutral"
          icon={X}
          onClick={handleClose}
          variant="ghost"
        />
      </div>
    </div>
  );
};
