/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {Clock, Info, Search} from 'lucide-react';
import {createPortal} from 'react-dom';

import {Button} from '@qualcomm-ui/react/button';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';
import {Portal} from '@qualcomm-ui/react-core/portal';

import {
  getLeafItems,
  getSystemIdsFromFormattedUsecases,
  type UsecaseCategory,
  type UsecaseItem,
} from '~entities/usecases';
import {deleteUsecases} from '~entities/usecases/api/usecases-api';
import {ArcCombobox} from '~shared/controls/arc-combobox';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';

import {useUsecaseSearch} from '../hooks/use-usecase-search';
import {
  SEARCH_SCOPE_OPTIONS,
  type SearchScopeOption,
  useUsecaseSelectionControlStore,
} from '../model/usecase-selection-control-store';

import {UsecaseListPanel} from './usecase-list-panel';

/** Stable empty array — avoids a new reference on every render when unset. */
const EMPTY_ITEMS: UsecaseItem[] = [];

/** z-index for the autosuggestion popup portal. */
const SUGGESTION_POPUP_Z_INDEX = 9998;

/** Returns all leaf items (no children) from a category. */
const getAllLeafItems = (category: UsecaseCategory): UsecaseItem[] =>
  getLeafItems(category.items);

interface UsecaseSelectionControlProps {
  /** When false, the delete button is hidden in the list panel. Defaults to true. */
  allowDelete?: boolean;
  disabled?: boolean;
  onSelectedUsecasesChange: (usecases: string[]) => void;
  projectId: string;
  selectAll?: boolean;
  selectedUsecases: string[];
  usecaseData: UsecaseCategory[];
}

export const UsecaseSelectionControl: React.FC<
  UsecaseSelectionControlProps
> = ({
  allowDelete = true,
  disabled = false,
  onSelectedUsecasesChange,
  projectId,
  selectAll = false,
  selectedUsecases,
  usecaseData,
}) => {
  // ── Store reads ─────────────────────────────────────────────────────────────
  const projectState = useUsecaseSelectionControlStore(
    (s) => s.stateByProject[projectId],
  );
  const searchTerm = projectState?.searchTerm ?? '';
  const searchScopeOption = projectState?.searchScopeOption ?? 'All';
  const expandedCategories = projectState?.expandedCategories ?? [];
  const recentlySelected = projectState?.recentlySelected ?? EMPTY_ITEMS;
  const searchHistory = projectState?.searchHistory ?? [];

  // ── Store writes ────────────────────────────────────────────────────────────
  const setSearchTerm = useUsecaseSelectionControlStore((s) => s.setSearchTerm);
  const setSearchScopeOption = useUsecaseSelectionControlStore(
    (s) => s.setSearchScopeOption,
  );
  const setExpandedCategories = useUsecaseSelectionControlStore(
    (s) => s.setExpandedCategories,
  );
  const addToRecentlySelected = useUsecaseSelectionControlStore(
    (s) => s.addToRecentlySelected,
  );
  const addToSearchHistory = useUsecaseSelectionControlStore(
    (s) => s.addToSearchHistory,
  );
  const removeFromRecentlySelected = useUsecaseSelectionControlStore(
    (s) => s.removeFromRecentlySelected,
  );

  // ── Local UI/action state ───────────────────────────────────────────────────
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Suggestion popup state
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Popup position — kept in state so it updates on resize/scroll
  const [popupPosition, setPopupPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [localUsecaseData, setLocalUsecaseData] =
    useState<UsecaseCategory[]>(usecaseData);

  useEffect(() => {
    setLocalUsecaseData(usecaseData);
  }, [usecaseData]);

  const localLeafItems = useMemo(
    () => localUsecaseData.flatMap(getAllLeafItems),
    [localUsecaseData],
  );

  // ── Auto-select all when selectAll=true ─────────────────────────────────────
  useEffect(() => {
    if (!selectAll || localLeafItems.length === 0) {
      return;
    }

    onSelectedUsecasesChange([
      ...new Set(localLeafItems.map((item) => item.name)),
    ]);
  }, [selectAll, localLeafItems, onSelectedUsecasesChange]);

  // ── Initialise expanded categories from usecaseData on first load ───────────
  const hasInitializedExpandedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedExpandedRef.current || localUsecaseData.length === 0) {
      return;
    }

    const initial = localUsecaseData
      .filter((cat) => cat.expanded)
      .map((cat) => cat.name);

    if (initial.length > 0) {
      setExpandedCategories(projectId, initial);
    }

    hasInitializedExpandedRef.current = true;
  }, [localUsecaseData, projectId, setExpandedCategories]);

  // ── Recently-selected cache update on close ────────────────────────────────
  const previouslyOpenRef = useRef<boolean>(false);

  useEffect(() => {
    const wasOpen = previouslyOpenRef.current;

    if (wasOpen && !isDropdownOpen && selectedUsecases.length > 0) {
      const selectedItems = localLeafItems.filter((item) =>
        selectedUsecases.includes(item.name),
      );

      if (selectedItems.length > 0) {
        addToRecentlySelected(projectId, selectedItems);
      }
    }

    previouslyOpenRef.current = isDropdownOpen;
  }, [
    isDropdownOpen,
    selectedUsecases,
    localLeafItems,
    projectId,
    addToRecentlySelected,
  ]);

  // ── Click-outside / Escape handling ────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // ── Autosuggestion popup positioning ────────────────────────────────────────
  // Uses ResizeObserver + window resize/scroll listeners so the popup stays
  // anchored to the search input even when the viewport or parent resizes
  useEffect(() => {
    if (!isSuggestionOpen || !searchInputRef.current) {
      setPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = searchInputRef.current?.getBoundingClientRect();
      if (rect) {
        setPopupPosition({
          left: rect.left,
          top: rect.bottom + 4,
          width: rect.width,
        });
      }
    };

    // Compute immediately when popup opens
    updatePosition();

    // Recompute whenever the input element itself resizes
    const observer = new ResizeObserver(updatePosition);
    observer.observe(searchInputRef.current);

    // Recompute on viewport resize (covers Restore/Maximize toggle)
    window.addEventListener('resize', updatePosition);
    // Recompute on scroll (fixed position shifts relative to viewport on scroll)
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isSuggestionOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDeleting) {
        return;
      }

      const target = event.target as Element;

      if (target.closest('[data-scope="dialog"]')) {
        return;
      }

      // clicking a suggestion must not close the dropdown.
      if (target.closest('[data-suggestion-popup]')) {
        return;
      }

      if (
        containerRef.current &&
        containerRef.current.contains(event.target as Node)
      ) {
        return;
      }

      if (target.closest?.('[role="menu"],[role="menuitem"]')) {
        return;
      }

      setIsDropdownOpen(false);
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isDropdownOpen, isDeleting]);

  // ── Backend search ───────────────────────────────────────────────────────────
  const {isSearching, searchData} = useUsecaseSearch(
    projectId,
    searchTerm,
    searchScopeOption,
  );

  // ── Display data ─────────────────────────────────────────────────────────────

  // ── Autosuggestion data ──────────────────────────────────────────────────────
  const currentSegment = searchTerm.split(/[+|]/).at(-1)?.trim() ?? '';

  const suggestions =
    searchHistory.length > 0 && currentSegment.length > 0
      ? searchHistory.filter((term) =>
          term.toLowerCase().startsWith(currentSegment.toLowerCase()),
        )
      : [];

  // When a search is active use the search results; otherwise show the full list.
  // If no search is active and there are recently selected usecases, prepend a
  // virtual "Recently Selected" category at the top of the list.
  const panelUsecaseData: UsecaseCategory[] = useMemo(
    () =>
      searchData !== null
        ? searchData
        : recentlySelected.length > 0
          ? [
              {
                expanded: true,
                items: recentlySelected,
                name: 'Recently Selected',
              },
              ...localUsecaseData,
            ]
          : localUsecaseData,
    [searchData, recentlySelected, localUsecaseData],
  );

  const panelLeafItemsByName = useMemo(
    () =>
      new Map(
        panelUsecaseData
          .flatMap(getAllLeafItems)
          .map((item) => [item.name, item]),
      ),
    [panelUsecaseData],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(
      projectId,
      expandedCategories.includes(categoryName)
        ? expandedCategories.filter((name) => name !== categoryName)
        : [...expandedCategories, categoryName],
    );
  };

  const handleSelectUsecase = useCallback(
    (itemName: string, isSelected: boolean) => {
      if (isSelected) {
        if (!selectedUsecases.includes(itemName)) {
          onSelectedUsecasesChange([...selectedUsecases, itemName]);
        }
      } else {
        onSelectedUsecasesChange(
          selectedUsecases.filter((name) => name !== itemName),
        );
      }

      // Diagnostic logging
      const item = panelLeafItemsByName.get(itemName);

      if (item) {
        logger.info(
          `[UsecaseSelectionControl] ${isSelected ? 'Selected' : 'Deselected'}: "${itemName}" systemId="${item.systemId ?? 'n/a'}"`,
          {
            action: 'select_usecase',
            component: 'UsecaseSelectionControl',
            projectId,
          },
        );
      }
    },
    [
      selectedUsecases,
      onSelectedUsecasesChange,
      panelLeafItemsByName,
      projectId,
    ],
  );

  const handleSelectCategory = useCallback(
    (itemNames: string[], isSelected: boolean) => {
      if (isSelected) {
        const newEntries = itemNames.filter(
          (name) => !selectedUsecases.includes(name),
        );

        if (newEntries.length > 0) {
          onSelectedUsecasesChange([...selectedUsecases, ...newEntries]);
        }
      } else {
        const toRemove = new Set(itemNames);
        onSelectedUsecasesChange(
          selectedUsecases.filter((name) => !toRemove.has(name)),
        );
      }
    },
    [selectedUsecases, onSelectedUsecasesChange],
  );

  const handleExpandAll = () => {
    setExpandedCategories(
      projectId,
      panelUsecaseData.map((cat) => cat.name),
    );
  };

  const handleCollapseAll = () => {
    setExpandedCategories(projectId, []);
  };

  const handleSelectAll = (isSelected: boolean) => {
    // Only operate on the currently filtered usecases so that
    // selections outside the active search results are preserved.
    const filteredUsecaseNames = new Set(panelLeafItemsByName.keys());

    if (isSelected) {
      // Add all visible usecases; keep existing selections outside the filter.
      const existing = selectedUsecases.filter(
        (name) => !filteredUsecaseNames.has(name),
      );
      onSelectedUsecasesChange([
        ...new Set([...existing, ...filteredUsecaseNames]),
      ]);
    } else {
      // Remove only visible usecases; keep selections outside the filter.
      onSelectedUsecasesChange(
        selectedUsecases.filter((name) => !filteredUsecaseNames.has(name)),
      );
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);

    const selectedSet = new Set(selectedUsecases);

    const systemIds = getSystemIdsFromFormattedUsecases(
      [...selectedSet],
      localUsecaseData,
    );

    const filterItems = (items: UsecaseItem[]): UsecaseItem[] =>
      items
        .map((item) => {
          if (item.children?.length) {
            const filteredChildren = filterItems(item.children);
            return {...item, children: filteredChildren};
          }
          return item;
        })
        .filter((item) => {
          if (item.children !== undefined) {
            // Keep group headers only if they still have children after filtering
            return (item.children?.length ?? 0) > 0;
          }
          return !selectedSet.has(item.name);
        });

    const nextData = localUsecaseData
      .map((cat) => ({...cat, items: filterItems(cat.items)}))
      .filter((cat) => cat.items.length > 0);

    try {
      if ((await deleteUsecases(projectId, systemIds)).success) {
        setLocalUsecaseData(nextData);
        onSelectedUsecasesChange([]);
        removeFromRecentlySelected(projectId, [...selectedSet]);
        setIsDropdownOpen(false);
      } else {
        showToast(
          `Failed to delete usecase${systemIds.length > 1 ? 's' : ''}.`,
          'danger',
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(projectId, value);
    setIsSuggestionOpen(value.trim().length > 0);
    setHighlightedIndex(-1);

    const lastChar = value.at(-1);
    if (lastChar === '+' || lastChar === '|') {
      const parts = value.slice(0, -1).split(/[+|]/);
      const completedSegment = parts.at(-1)?.trim();
      if (completedSegment) {
        addToSearchHistory(projectId, completedSegment);
      }
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      setIsSuggestionOpen(false);
      setHighlightedIndex(-1);
    }, 150);

    if (!searchTerm.trim()) {
      return;
    }
    const parts = searchTerm.split(/[+|]/);
    const lastSegment = parts.at(-1)?.trim();
    if (lastSegment) {
      addToSearchHistory(projectId, lastSegment);
    }
  };

  const applySuggestion = (term: string) => {
    const parts = searchTerm.split(/([+|])/);
    parts[parts.length - 1] = term;
    handleSearchChange(parts.join(''));
    setIsSuggestionOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isSuggestionOpen && suggestions.length > 0 && highlightedIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[highlightedIndex]);
      } else {
        const parts = searchTerm.split(/[+|]/);
        const lastSegment = parts.at(-1)?.trim();
        if (lastSegment) {
          addToSearchHistory(projectId, lastSegment);
        }
      }
      return;
    }

    if (!isSuggestionOpen || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setIsSuggestionOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Unique count — avoids double-counting usecases that appear in both base
  // categories and subsystem categories (System Workflow).
  const totalUsecaseCount = new Set(localLeafItems.map((item) => item.name))
    .size;

  // Generate placeholder text for the search box to reflect the categories of
  // the selected use cases.
  const {categoryText} = useMemo(() => {
    const selectedNamesSet = new Set(selectedUsecases);
    const cats = localUsecaseData
      .filter((cat) =>
        getLeafItems(cat.items).some((item) => selectedNamesSet.has(item.name)),
      )
      .map((cat) => cat.name);
    const text =
      cats.length === 1
        ? ` from category: ${cats[0]}`
        : cats.length > 1
          ? ` from categories: ${cats.join(', ')}`
          : '';
    return {categoryText: text};
  }, [selectedUsecases, localUsecaseData]);

  const searchPlaceholder = isDropdownOpen
    ? 'Search for usecases...'
    : selectedUsecases.length > 0
      ? `${selectedUsecases.length} of ${totalUsecaseCount} usecase${totalUsecaseCount === 1 ? '' : 's'} selected${categoryText}`
      : 'No usecases selected';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {isDeleting &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
              backdropFilter: 'blur(2px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="bg-raised rounded-lg p-8 shadow-xl">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div className="text-neutral-primary mb-2 text-lg font-semibold">
                  {`Deleting Usecase${selectedUsecases.length > 1 ? 's' : ''}...`}
                </div>
                <div className="text-neutral-secondary text-sm">
                  Please wait...
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Scope selector + Search bar */}
      <div className="flex items-center">
        <Tooltip
          positioning={{placement: 'top'}}
          trigger={
            <span
              className="relative [&:focus-within]:z-10"
              style={{display: 'inline-flex'}}
            >
              <ArcCombobox
                className="[&_[data-part='control']]:rounded-r-none"
                disabled={disabled}
                onChange={(value) =>
                  setSearchScopeOption(
                    projectId,
                    (value as SearchScopeOption) || 'All',
                  )
                }
                openOnClick
                options={[...SEARCH_SCOPE_OPTIONS]}
                placeholder="Scope"
                value={searchScopeOption}
                width={140}
              />
            </span>
          }
        >
          Search with
        </Tooltip>
        <div
          ref={searchInputRef}
          className="-ml-px flex-1 [&_[data-part='input-group']]:rounded-l-none [&_[data-part='root']]:rounded-l-none [&_input]:rounded-l-none"
        >
          <TextInput.Root
            disabled={disabled}
            onValueChange={handleSearchChange}
            size="md"
            startIcon={isDropdownOpen ? undefined : Search}
            value={isDropdownOpen ? searchTerm : ''}
          >
            <TextInput.InputGroup>
              {/* Info icon — shown only when dropdown is open (replaces Search icon) */}
              {isDropdownOpen && (
                <Tooltip
                  arrowTipProps={{
                    className: '!bg-support-neutral-subtle',
                  }}
                  contentProps={{
                    className: 'bg-support-neutral-subtle',
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
                        example: 'Speaker+HFP_Sink',
                        label: 'Search all usecases',
                      },
                      {
                        example: 'sg:0xB00001C1 or sg:StreamRx',
                        label: 'Search subgraphs',
                      },
                      {example: 'cnt:0xE00001EC', label: 'Search containers'},
                      {
                        example: 'mod:0x4A31 or mod:Volume',
                        label: 'Search modules',
                      },
                      {
                        example: 'ss:0xF010002B or ss:Rx_Devices',
                        label: 'Search subsystems',
                      },
                    ].map(({example, label}) => (
                      <div
                        key={label}
                        className="text-neutral-primary mb-1 flex items-baseline gap-1"
                      >
                        <span className="shrink-0">{label}:</span>
                        <code className="bg-neutral-03 text-neutral-primary rounded px-1 py-0.5">
                          {example}
                        </code>
                      </div>
                    ))}
                  </div>
                </Tooltip>
              )}

              <TextInput.Input
                aria-label="Search for usecases"
                onBlur={handleSearchBlur}
                onFocus={() => {
                  if (!disabled) {
                    setIsDropdownOpen(true);
                    if (searchTerm.trim().length > 0) {
                      setIsSuggestionOpen(true);
                    }
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
              />
              <TextInput.ClearTrigger />
            </TextInput.InputGroup>
          </TextInput.Root>
        </div>
      </div>

      {/* Dropdown Content — suppressed when disabled */}
      {isDropdownOpen && !disabled && (
        <div
          className="bg-raised border-neutral-02 absolute top-full right-0 left-0 z-10 mt-1 flex max-h-96 rounded-md border shadow-lg"
        >
          <UsecaseListPanel
            allowDelete={allowDelete}
            expandedCategories={expandedCategories}
            handleSelectAll={handleSelectAll}
            handleSelectCategory={handleSelectCategory}
            handleSelectUsecase={handleSelectUsecase}
            isSearching={isSearching}
            onClose={() => setIsDropdownOpen(false)}
            onCollapseAll={handleCollapseAll}
            onDeleteSelected={() => void handleDeleteSelected()}
            onExpandAll={handleExpandAll}
            selectedUsecases={selectedUsecases}
            toggleCategoryExpansion={toggleCategoryExpansion}
            usecaseData={panelUsecaseData}
          />
        </div>
      )}

      {/* Autosuggestion popup */}
      {isSuggestionOpen && suggestions.length > 0 && popupPosition && (
        <Portal>
          <div
            className="bg-raised border-neutral-02 fixed max-h-[200px] overflow-y-auto rounded-md border shadow-lg"
            data-suggestion-popup="true"
            style={{
              left: popupPosition.left,
              top: popupPosition.top,
              width: popupPosition.width,
              zIndex: SUGGESTION_POPUP_Z_INDEX,
            }}
          >
            {suggestions.map((term, index) => (
              <Button
                key={term}
                className={`text-neutral-primary flex w-full items-center justify-start gap-2 px-3 py-1.5 text-left text-sm ${index === highlightedIndex ? 'bg-overlay' : 'bg-transparent'}`}
                emphasis="neutral"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(term);
                }}
                variant="ghost"
              >
                <Clock className="text-neutral-secondary shrink-0" size={12} />
                <span>{term}</span>
              </Button>
            ))}
          </div>
        </Portal>
      )}
    </div>
  );
};
